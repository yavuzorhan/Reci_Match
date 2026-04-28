"""
Kimlik doğrulama (Auth) router'ı — register, verify, login, şifre sıfırlama.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    VerifyRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UpdateEmailRequest,
    RequestOTPRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/api", tags=["Auth"])


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register_user(req.name, req.email, req.password, db)


@router.post("/verify")
def verify_email(req: VerifyRequest, db: Session = Depends(get_db)):
    return auth_service.verify_email(req.email, req.code, db)


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login_user(req.email, req.password, db)


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return auth_service.forgot_password(req.email, db)


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    return auth_service.reset_password(req.email, req.code, req.new_password, db)


# ─── Güvenlik Güncelleme Endpointleri ────────────────────────────────────────

@router.post("/users/{user_id}/request-otp")
def request_otp_for_update(user_id: int, req: RequestOTPRequest, db: Session = Depends(get_db)):
    return auth_service.request_otp_for_update(user_id, req.email, db)


@router.post("/users/{user_id}/update-password")
def security_update_password(user_id: int, req: ResetPasswordRequest, db: Session = Depends(get_db)):
    return auth_service.security_update_password(user_id, req.code, req.new_password, db)


@router.post("/users/{user_id}/update-email")
def security_update_email(user_id: int, req: UpdateEmailRequest, db: Session = Depends(get_db)):
    return auth_service.security_update_email(user_id, req.code, req.new_email, db)
