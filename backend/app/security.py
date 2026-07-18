"""
CSRF + cookies + client-IP — a faithful port of backend/endpoints/_lib/{security,cookies}.js.

CSRF tokens are HMAC-SHA256(nonce, CSRF_SECRET) as `nonce.mac`, identical to the
Node implementation, so a token minted by either runtime validates in the other.
Cookies use the same names/flags (__Host- prefix + Secure in prod).
"""
import hashlib
import hmac
import secrets

from fastapi import Request, Response, HTTPException

from . import config

COOKIE_PREFIX = "__Host-" if config.IS_PROD else ""
ACCESS_COOKIE = f"{COOKIE_PREFIX}ft_access"
REFRESH_COOKIE = f"{COOKIE_PREFIX}ft_refresh"
CSRF_COOKIE = f"{COOKIE_PREFIX}ft_csrf"
CSRF_HEADER = "x-csrf-token"

ACCESS_MAX_AGE = 15 * 60
REFRESH_MAX_AGE = 7 * 24 * 60 * 60


# ── CSRF (stateless HMAC, double-submit) ──────────────────────────
def make_csrf() -> str:
    nonce = secrets.token_hex(32)
    mac = hmac.new(config.CSRF_SECRET.encode(), nonce.encode(), hashlib.sha256).hexdigest()
    return f"{nonce}.{mac}"


def verify_csrf(token: str) -> bool:
    if not token or "." not in token:
        return False
    dot = token.rfind(".")
    nonce, mac = token[:dot], token[dot + 1:]
    if not nonce or not mac:
        return False
    expected = hmac.new(config.CSRF_SECRET.encode(), nonce.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(mac, expected)


def validate_csrf(request: Request) -> None:
    """Raises 403 on a bad/missing CSRF token for mutating methods."""
    if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
        return
    header = request.headers.get(CSRF_HEADER)
    cookie = request.cookies.get(CSRF_COOKIE)
    if not header or not cookie:
        raise HTTPException(status_code=403, detail="CSRF token missing")
    if header != cookie or not verify_csrf(header):
        raise HTTPException(status_code=403, detail="CSRF token invalid")


# ── Cookies ───────────────────────────────────────────────────────
def _set(resp: Response, name: str, value: str, max_age: int, http_only: bool = True) -> None:
    resp.set_cookie(
        key=name, value=value, max_age=max_age, path="/",
        secure=config.IS_PROD, httponly=http_only, samesite="strict",
    )


def set_auth_cookies_with_csrf(resp: Response, access_token: str, refresh_token: str, csrf: str) -> None:
    _set(resp, ACCESS_COOKIE, access_token, ACCESS_MAX_AGE)
    _set(resp, REFRESH_COOKIE, refresh_token, REFRESH_MAX_AGE)
    _set(resp, CSRF_COOKIE, csrf, REFRESH_MAX_AGE, http_only=False)


def clear_auth_cookies(resp: Response) -> None:
    _set(resp, ACCESS_COOKIE, "", 0)
    _set(resp, REFRESH_COOKIE, "", 0)
    _set(resp, CSRF_COOKIE, "", 0, http_only=False)


# ── Client IP (Cloudflare / proxy aware) ─────────────────────────
def client_ip(request: Request) -> str:
    h = request.headers
    xff = h.get("x-forwarded-for")
    return (
        h.get("cf-connecting-ip")
        or h.get("x-real-ip")
        or (xff.split(",")[0].strip() if xff else None)
        or (request.client.host if request.client else None)
        or "unknown"
    )
