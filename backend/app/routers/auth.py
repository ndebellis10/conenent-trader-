"""
/api/auth — Python (FastAPI) port of backend/endpoints/auth.js.

Routes: csrf · me · login · register · logout · reset-password · mfa-setup ·
mfa-verify, with the exact cookie + CSRF contract. Brute-force protection
(per-IP rate limiting + account lockout on repeated failures) is implemented
against the rate_limits / login_attempts tables and fails open on DB errors.
"""
import asyncio
import hashlib
import time
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

from .. import config, security
from ..models import LoginIn, MfaVerifyIn, RegisterIn, ResetPasswordIn
from ..supabase_client import supabase_admin, user_client

router = APIRouter(prefix="/api/auth")


def _err(status: int, message: str, **extra) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message, **extra})


# ── Brute-force protection — uses the rate_limits + login_attempts tables and
#    the check_and_increment_rate_limit function that already exist in the DB.
#    All checks fail OPEN: if the DB hiccups, auth still works rather than
#    locking everyone out. ──
def _rate_limited(key: str, limit: int, window_minutes: int) -> dict:
    try:
        r = supabase_admin.rpc("check_and_increment_rate_limit", {
            "p_key": key, "p_limit": limit, "p_window_minutes": window_minutes,
        }).execute()
        return r.data or {"allowed": True}
    except Exception as e:
        print(f"[rate-limit] {e}", flush=True)
        return {"allowed": True}


def _record_attempt(email: str, ip: str, ua: str, success: bool) -> None:
    try:
        supabase_admin.table("login_attempts").insert({
            "email": email, "ip_address": ip, "user_agent": ua, "success": success,
        }).execute()
    except Exception:
        pass


def _is_account_locked(email: str, ip: str) -> bool:
    """Locked after 5 failed attempts (by email OR IP) in the last 15 minutes."""
    try:
        since = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
        r = (supabase_admin.table("login_attempts")
             .select("id", count="exact")
             .eq("success", False)
             .gte("created_at", since)
             .or_(f"email.eq.{email},ip_address.eq.{ip}")
             .execute())
        return (r.count or 0) >= 5
    except Exception:
        return False


# ── CAPTCHA (Cloudflare Turnstile) — mirrors JS: skip when unconfigured ──
async def verify_captcha(token: str | None) -> bool:
    if not config.TURNSTILE_SECRET_KEY:
        return True
    if not token:
        return False
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={"secret": config.TURNSTILE_SECRET_KEY, "response": token},
            )
        return r.json().get("success") is True
    except Exception:
        return False


# ── HaveIBeenPwned k-anonymity breach check (fail-open) ──
async def is_password_breached(password: str) -> bool:
    try:
        h = hashlib.sha1(password.encode()).hexdigest().upper()
        prefix, suffix = h[:5], h[5:]
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                f"https://api.pwnedpasswords.com/range/{prefix}",
                headers={"Add-Padding": "true", "User-Agent": "FaithTrader-SecurityCheck/1.0"},
            )
        if r.status_code != 200:
            return False
        return any(line.split(":")[0].strip() == suffix for line in r.text.splitlines())
    except Exception:
        return False


async def require_auth(request: Request, response: Response):
    """Validate session from cookies; auto-rotate on expiry. Returns user or None."""
    access = request.cookies.get(security.ACCESS_COOKIE)
    refresh = request.cookies.get(security.REFRESH_COOKIE)
    if not access and not refresh:
        return None

    if access:
        try:
            res = supabase_admin.auth.get_user(access)
            if res and res.user:
                return res.user
        except Exception:
            pass

    if refresh:
        try:
            res = supabase_admin.auth.refresh_session(refresh)
            if res and res.session and res.user:
                csrf = security.make_csrf()
                security.set_auth_cookies_with_csrf(
                    response, res.session.access_token, res.session.refresh_token, csrf
                )
                response.headers["X-New-CSRF-Token"] = csrf
                return res.user
        except Exception:
            pass

    security.clear_auth_cookies(response)
    return None


def _profile(user_id: str) -> dict:
    try:
        r = (
            supabase_admin.table("profiles")
            .select("display_name, starting_balance, currency, risk_per_trade, preferences, created_at")
            .eq("id", user_id).single().execute()
        )
        return r.data or {}
    except Exception:
        return {}


# ════════════════════════════════════════════════════════════════
@router.get("/csrf")
async def csrf(response: Response):
    token = security.make_csrf()
    security._set(response, security.CSRF_COOKIE, token, security.REFRESH_MAX_AGE, http_only=False)
    return {"token": token}


@router.get("/me")
async def me(request: Request, response: Response):
    if not config.SUPABASE_CONFIGURED:
        return _err(503, "Authentication service not configured.", code="SUPABASE_NOT_CONFIGURED")
    user = await require_auth(request, response)
    if not user:
        security.clear_auth_cookies(response)
        return _err(401, "Authentication required")
    profile = _profile(user.id)
    factors = getattr(user, "factors", None) or []
    return {"id": user.id, "email": user.email, **profile, "mfa_enabled": len(factors) > 0}


@router.post("/login")
async def login(request: Request, response: Response, body: LoginIn):
    if not config.SUPABASE_CONFIGURED:
        return _err(503, "Authentication service not configured.", code="SUPABASE_NOT_CONFIGURED")

    t0 = time.monotonic()

    async def respond(status: int, payload):
        elapsed = time.monotonic() - t0  # timing-attack floor: min 600ms
        if elapsed < 0.6:
            await asyncio.sleep(0.6 - elapsed)
        if isinstance(payload, JSONResponse):
            return payload
        return JSONResponse(status_code=status, content=payload, headers=dict(response.headers))

    ip = security.client_ip(request)
    ua = request.headers.get("user-agent", "")

    # Rate limit per IP so the endpoint can't be hammered (100 / 15 min)
    if not _rate_limited(f"{ip}:auth:login", 100, 15).get("allowed", True):
        return await respond(429, {"error": "Too many attempts. Please wait a few minutes and try again."})

    if not await verify_captcha(body.captchaToken):
        return await respond(400, {"error": "CAPTCHA verification failed"})

    # Lock the account after repeated failures (by email or IP)
    if _is_account_locked(body.email, ip):
        _record_attempt(body.email, ip, ua, False)
        return await respond(429, {"error": "Account temporarily locked after multiple failed attempts. Try again in 15 minutes."})

    try:
        auth = supabase_admin.auth.sign_in_with_password({"email": body.email, "password": body.password})
    except Exception:
        auth = None

    if not auth or not auth.session:
        _record_attempt(body.email, ip, ua, False)
        return await respond(401, {"error": "Invalid email or password"})

    _record_attempt(body.email, ip, ua, True)
    csrf = security.make_csrf()
    security.set_auth_cookies_with_csrf(response, auth.session.access_token, auth.session.refresh_token, csrf)
    profile = _profile(auth.user.id)
    return await respond(200, JSONResponse(
        status_code=200,
        content={"user": {"id": auth.user.id, "email": auth.user.email, **profile}, "csrf": csrf},
        headers=dict(response.headers),
    ))


@router.post("/register")
async def register(request: Request, response: Response, body: RegisterIn):
    if not config.SUPABASE_CONFIGURED:
        return _err(503, "Authentication service not configured.", code="SUPABASE_NOT_CONFIGURED")

    # Rate limit sign-ups per IP (50 / 15 min) so the endpoint can't be abused
    if not _rate_limited(f"{security.client_ip(request)}:auth:register", 50, 15).get("allowed", True):
        return _err(429, "Too many attempts. Please wait a few minutes and try again.")

    if not await verify_captcha(body.captchaToken):
        return _err(400, "CAPTCHA verification failed")

    # Breach check intentionally NOT enforced — a password appearing in a public
    # breach corpus does not block signup. Requirements are 8+ chars and one
    # special character (validated on the model).

    try:
        created = supabase_admin.auth.admin.create_user({
            "email": body.email, "password": body.password, "email_confirm": True,
            "user_metadata": {"display_name": body.displayName},
        })
    except Exception as e:
        raw = str(e)
        low = raw.lower()

        # 1) Duplicate — expected user error, not an outage
        if "already" in low or "registered" in low or "duplicate" in low:
            return _err(409, "An account with this email already exists")

        # 2) Bad service-role key / permission — a CONFIG outage, not the user's
        #    fault. This exact failure once took digging through Supabase logs to
        #    find. Log it loudly and return a distinct 503 so it can't hide as a
        #    generic 409 and monitoring can tell config from user error.
        if ("service_role" in low or "not authorized" in low or "unauthorized" in low
                or "403" in low or "401" in low or "role" in low):
            print(f"[auth/register] MISCONFIG — create_user rejected, likely a bad "
                  f"SUPABASE_SERVICE_ROLE_KEY: {raw}", flush=True)
            return _err(503, "Sign-up is temporarily unavailable. Please try again shortly.",
                        code="AUTH_SERVICE_MISCONFIGURED")

        # 3) Password rejected by Supabase's own policy — say why
        if "password" in low:
            return _err(400, raw or "Password does not meet the requirements.")

        # 4) Anything else — log the real cause, return a real server error
        print(f"[auth/register] create_user failed: {raw}", flush=True)
        return _err(500, "Registration failed. Please try again.")

    try:
        session = supabase_admin.auth.sign_in_with_password({"email": body.email, "password": body.password})
    except Exception:
        session = None
    if not session or not session.session:
        return JSONResponse(status_code=201, content={"message": "Account created. Please log in."})

    csrf = security.make_csrf()
    security.set_auth_cookies_with_csrf(response, session.session.access_token, session.session.refresh_token, csrf)
    return JSONResponse(
        status_code=201,
        headers=dict(response.headers),
        content={"user": {"id": session.user.id, "email": session.user.email,
                          "display_name": body.displayName}, "csrf": csrf},
    )


@router.post("/logout")
async def logout(request: Request, response: Response):
    security.validate_csrf(request)  # raises 403 on failure
    user = await require_auth(request, response)
    if user:
        access = request.cookies.get(security.ACCESS_COOKIE)
        try:  # best-effort global sign-out (mirrors JS .catch)
            if access:
                supabase_admin.auth.admin.sign_out(access, "global")
        except Exception:
            pass
    security.clear_auth_cookies(response)
    return JSONResponse(status_code=200, headers=dict(response.headers),
                        content={"message": "Logged out successfully"})


@router.post("/reset-password")
async def reset_password(request: Request, body: ResetPasswordIn):
    """Send a password-reset email via Supabase. Always returns ok — never
    reveal whether an email is registered (prevents account enumeration).
    The email link lands on {origin}/reset-password, where the user sets a
    new password (that page must be allow-listed in Supabase Auth settings)."""
    if not config.SUPABASE_CONFIGURED:
        return _err(503, "Authentication service not configured.", code="SUPABASE_NOT_CONFIGURED")

    # Rate limit so this can't be used to spam someone's inbox (5 / 15 min per IP)
    if not _rate_limited(f"{security.client_ip(request)}:auth:reset", 5, 15).get("allowed", True):
        return _err(429, "Too many requests. Please wait a few minutes and try again.")

    # Redirect back to this app's own origin, so it works on any deployment
    origin = request.headers.get("origin") or config.APP_URL
    redirect_to = f"{origin.rstrip('/')}/reset-password"

    try:
        auth = supabase_admin.auth
        # Method name has varied across supabase-py versions — use whichever exists
        send = getattr(auth, "reset_password_for_email", None) or getattr(auth, "reset_password_email", None)
        if send is None:
            raise RuntimeError("no reset-password method on supabase client")
        try:
            send(body.email, {"redirect_to": redirect_to})
        except TypeError:
            # Some versions take an options= keyword instead of a positional dict
            send(body.email, options={"redirect_to": redirect_to})
    except Exception as e:
        # Log the real cause but still return ok, so failures are diagnosable
        # in Vercel logs without leaking anything to the caller.
        print(f"[auth/reset-password] send failed for a request: {e}", flush=True)

    return {"ok": True}


# ── MFA — user-scoped (supabase-py exposes enroll/challenge/verify on the
#    user session, not on auth.admin). Uses the caller's own tokens. ──
@router.post("/mfa-setup")
async def mfa_setup(request: Request, response: Response):
    security.validate_csrf(request)
    user = await require_auth(request, response)
    if not user:
        return _err(401, "Authentication required")
    access = request.cookies.get(security.ACCESS_COOKIE)
    refresh = request.cookies.get(security.REFRESH_COOKIE)
    try:
        uc = user_client(access, refresh)
        enrolled = uc.auth.mfa.enroll({"factor_type": "totp", "issuer": "Covenant Trader"})
    except Exception:
        return _err(500, "Failed to set up MFA. Please try again.")
    totp = getattr(enrolled, "totp", None)
    return {
        "factor_id": enrolled.id,
        "qr_code": getattr(totp, "qr_code", None),
        "secret": getattr(totp, "secret", None),
    }


@router.post("/mfa-verify")
async def mfa_verify(request: Request, response: Response, body: MfaVerifyIn):
    security.validate_csrf(request)
    user = await require_auth(request, response)
    if not user:
        return _err(401, "Authentication required")
    access = request.cookies.get(security.ACCESS_COOKIE)
    refresh = request.cookies.get(security.REFRESH_COOKIE)
    try:
        uc = user_client(access, refresh)
        challenge_id = body.challenge_id
        if not challenge_id:
            ch = uc.auth.mfa.challenge({"factor_id": body.factor_id})
            challenge_id = ch.id
        uc.auth.mfa.verify({"factor_id": body.factor_id, "challenge_id": challenge_id, "code": body.code})
    except Exception:
        return _err(400, "Invalid or expired code. Please try again.")
    return {"verified": True}
