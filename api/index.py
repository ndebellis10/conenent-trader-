# Vercel Python entrypoint (functions must live in root /api).
# Exposes the FastAPI ASGI `app`; real implementation lives in backend/app/.
# vercel.json's `includeFiles` bundles backend/app/** into this function.
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app  # noqa: E402  (path set above)
