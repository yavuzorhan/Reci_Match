"""
Kimlik doğrulama (Auth) ile ilgili Pydantic şemaları.
"""
from pydantic import BaseModel


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class VerifyRequest(BaseModel):
    email: str
    code: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


class UpdateEmailRequest(BaseModel):
    new_email: str
    code: str


class RequestOTPRequest(BaseModel):
    email: str
