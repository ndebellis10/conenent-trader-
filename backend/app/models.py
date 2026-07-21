"""Pydantic request models — the Python equivalent of the zod schemas."""
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)
    captchaToken: Optional[str] = None


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    displayName: Optional[str] = ""
    captchaToken: Optional[str] = None


class ResetPasswordIn(BaseModel):
    email: EmailStr


class MfaVerifyIn(BaseModel):
    factor_id: str = Field(min_length=1)
    code: str = Field(pattern=r"^\d{6}$")
    challenge_id: Optional[str] = None
