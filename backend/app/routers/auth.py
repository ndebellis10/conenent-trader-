"""
/api/auth — Python (FastAPI) port of backend/endpoints/auth.js.

Spike scope: csrf · me · login · register · logout · mfa-setup · mfa-verify,
with the exact cookie + CSRF contract. Security extras that are mechanical DB
work (rate-limit, account lockout, audit log, login-attempt tracking) are marked
TODO for the full port — they're straightforward supabase inserts.
"""
import asyncio
import hashlib
import time

import httpx
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

from .. import config, security
from ..models import LoginIn, MfaVerifyIn, RegisterIn
from ..supabase_client import supabase_admin, user_client

router = APIRouter(prefix="/api/auth")


def _err(status: int, message: str, **extra) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message, **extra})


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

    # TODO(full port): rate-limit + account-lockout (login_attempts) checks here.
    if not await verify_captcha(body.captchaToken):
        return await respond(400, {"error": "CAPTCHA verification failed"})

    try:
        auth = supabase_admin.auth.sign_in_with_password({"email": body.email, "password": body.password})
    except Exception:
        auth = None

    if not auth or not auth.session:
        # TODO(full port): recordAttempt(email, ip, ua, success=False)
        return await respond(401, {"error": "Invalid email or password"})

    csrf = security.make_csrf()
    security.set_auth_cookies_with_csrf(response, auth.session.access_token, auth.session.refresh_token, csrf)
    profile = _profile(auth.user.id)
    # TODO(full port): recordAttempt(success=True) + audit('LOGIN')
    return await respond(200, JSONResponse(
        status_code=200,
        content={"user": {"id": auth.user.id, "email": auth.user.email, **profile}, "csrf": csrf},
        headers=dict(response.headers),
    ))


@router.post("/register")
async def register(request: Request, response: Response, body: RegisterIn):
    if not config.SUPABASE_CONFIGURED:
        return _err(503, "Authentication service not configured.", code="SUPABASE_NOT_CONFIGURED")

    if not await verify_captcha(body.captchaToken):
        return _err(400, "CAPTCHA verification failed")
    if await is_password_breached(body.password):
        return _err(422, "This password was found in a data breach. Please choose a different password.",
                    code="PASSWORD_BREACHED")

    try:
        created = supabase_admin.auth.admin.create_user({
            "email": body.email, "password": body.password, "email_confirm": True,
            "user_metadata": {"display_name": body.displayName},
        })
    except Exception as e:
        msg = ("An account with this email already exists"
               if "already" in str(e).lower() else "Registration failed. Please try again.")
        return _err(409, msg)

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
