"""FastAPI app — Python backend spike (auth only for now)."""
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config, security
from .routers import auth

app = FastAPI(title="Covenant Trader API (Python spike)", docs_url=None, redoc_url=None)

_origins = [config.APP_URL] + (
    [] if config.IS_PROD else ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", security.CSRF_HEADER],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    resp.headers.setdefault("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
    return resp


# Match the Node backend's error envelope ({"error": ...}), not FastAPI's default {"detail": ...},
# because the frontend (src/lib/api.js) reads `data.error`.
@app.exception_handler(HTTPException)
async def _http_exc(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail},
                        headers=getattr(exc, "headers", None))


@app.exception_handler(RequestValidationError)
async def _validation_exc(request: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", []) if p not in ("body",))
    return JSONResponse(status_code=400, content={
        "error": "Validation failed",
        "details": f"{field}: {first.get('msg', 'invalid')}" if field else first.get("msg", "invalid"),
    })


app.include_router(auth.router)


@app.get("/api/health")
async def health():
    # Actually exercise the service-role key so a broken/rotated key shows up
    # here BEFORE a real user hits it at sign-up. Point an uptime monitor at
    # this endpoint. Returns no secrets.
    registration = "unknown"
    if config.SUPABASE_CONFIGURED:
        try:
            from .supabase_client import supabase_admin
            supabase_admin.auth.admin.list_users()  # exercises the service-role key
            registration = "ok"
        except Exception as e:
            print(f"[health] service-role check failed: {e}", flush=True)
            registration = "down"
    else:
        registration = "not_configured"

    ok = registration == "ok"
    return JSONResponse(
        status_code=200 if ok else 503,
        content={"ok": ok, "runtime": "python",
                 "supabase_configured": config.SUPABASE_CONFIGURED,
                 "registration": registration},
    )
