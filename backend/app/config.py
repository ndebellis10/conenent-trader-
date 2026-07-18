"""Environment config — mirrors the Node backend's env contract."""
import os

IS_PROD = os.environ.get("NODE_ENV") == "production"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_CONFIGURED = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)

# MUST match the Node backend's CSRF_SECRET so tokens interoperate across runtimes.
CSRF_SECRET = os.environ.get("CSRF_SECRET", "dev-csrf-secret-change-in-prod")

APP_URL = os.environ.get("APP_URL", "https://faith-trader.vercel.app")
TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY", "")
