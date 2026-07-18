"""Supabase clients — a service-role admin client, plus a per-user client factory."""
from supabase import Client, create_client

from . import config

_PLACEHOLDER_URL = "https://placeholder.supabase.co"
_PLACEHOLDER_KEY = "placeholder-key"

# Module-level service-role client (bypasses RLS). Uses placeholders when env is
# unset so imports never crash — routes gate on config.SUPABASE_CONFIGURED first.
supabase_admin: Client = create_client(
    config.SUPABASE_URL or _PLACEHOLDER_URL,
    config.SUPABASE_SERVICE_ROLE_KEY or _PLACEHOLDER_KEY,
)


def user_client(access_token: str, refresh_token: str) -> Client:
    """
    A client authenticated AS the end user — required for user-scoped MFA
    (auth.mfa.enroll/challenge/verify), since supabase-py exposes MFA enroll/verify
    only on the user session, not on auth.admin.
    """
    c = create_client(
        config.SUPABASE_URL or _PLACEHOLDER_URL,
        config.SUPABASE_SERVICE_ROLE_KEY or _PLACEHOLDER_KEY,
    )
    c.auth.set_session(access_token, refresh_token)
    return c
