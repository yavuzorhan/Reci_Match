import bcrypt
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.db.models import User, EmailVerificationCode
from app.utils.mailer import send_verification_email, send_password_reset_email, generate_otp



def _create_otp_record(
    db: Session,
    purpose: str,
    email: str,
    user_id: int | None = None,
    temp_name: str | None = None,
    temp_password: str | None = None,
) -> str:
    code = generate_otp()
    record = EmailVerificationCode(
        email=email,
        code=code,
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
        user_id=user_id,
        temp_name=temp_name,
        temp_password=temp_password,
    )
    db.add(record)
    db.commit()
    return code


def _validate_otp(db: Session, user_id: int, code: str, purpose: str) -> EmailVerificationCode:
    record = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.user_id == user_id,
            EmailVerificationCode.code == code,
            EmailVerificationCode.purpose == purpose,
        )
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )
    if not record or record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş kod.")
    return record



def register_user(name: str, email: str, password: str, db: Session) -> dict:
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı.")

    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    code = _create_otp_record(db, purpose="register", email=email, temp_name=name, temp_password=hashed_pw)
    send_verification_email(email, code)
    return {
        "message": "Doğrulama kodu mail adresinize gönderildi. Hesabınız ancak kodu doğruladıktan sonra oluşturulacaktır."
    }



def verify_email(email: str, code: str, db: Session) -> dict:
    record = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.email == email,
            EmailVerificationCode.code == code,
            EmailVerificationCode.purpose == "register",
        )
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=400, detail="Geçersiz doğrulama kodu.")

    if record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Kodun süresi dolmuş. Lütfen yeni bir kod isteyin.")

    new_user = User(
        name_surname=record.temp_name,
        email=record.email,
        password_hash=record.temp_password,
        is_verified=True,
    )
    db.add(new_user)
    db.delete(record)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Hesabınız başarıyla oluşturuldu ve doğrulandı.",
        "user": {
            "id": new_user.user_id,
            "name": new_user.name_surname,
            "email": new_user.email,
        },
        "profile": {
            "age": "",
            "gender": "Erkek",
            "height": "",
            "weight": "",
            "objective": "Kilo Vermek",
            "meals": "3",
            "activity": "Hareketsiz (Az veya hiç egzersiz)",
            "daily_calorie": None,
        },
    }



def login_user(email: str, password: str, db: Session) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz e-posta veya şifre.",
        )

    is_valid_password = False
    if user.password_hash.startswith("$2b$"):
        try:
            is_valid_password = bcrypt.checkpw(
                password.encode("utf-8"), user.password_hash.encode("utf-8")
            )
        except Exception:
            pass
    else:
        is_valid_password = user.password_hash == password

    if not is_valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz e-posta veya şifre.",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Lütfen önce e-posta adresinizi doğrulayın.",
        )

    return {
        "message": "Giriş başarılı!",
        "user": {
            "id": user.user_id,
            "name": user.name_surname,
            "email": user.email,
        },
        "profile": {
            "age": user.age or "",
            "gender": user.gender or "Erkek",
            "height": user.height_cm or "",
            "weight": float(user.weight_kg) if user.weight_kg else "",
            "objective": user.objective or "Kilo Vermek",
            "meals": user.meals or "3",
            "activity": user.activity or "Hareketsiz (Az veya hiç egzersiz)",
            "daily_calorie": user.daily_calorie,
        },
    }



def forgot_password(email: str, db: Session) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Güvenlik için kullanıcı yoksa bile "gönderildi" mesajı veriyoruz
        return {"message": "Eğer bu e-posta adresi sistemde kayıtlıysa, şifre sıfırlama kodu gönderildi."}

    code = _create_otp_record(db, purpose="reset_password", email=user.email, user_id=user.user_id)
    send_password_reset_email(user.email, code)
    return {"message": "Şifre sıfırlama kodu e-postanıza gönderildi."}


def reset_password(email: str, code: str, new_password: str, db: Session) -> dict:
    record = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.email == email,
            EmailVerificationCode.code == code,
            EmailVerificationCode.purpose == "reset_password",
        )
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş sıfırlama kodu.")

    if record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Kodun süresi dolmuş.")

    user = db.query(User).filter(User.user_id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    user.password_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    db.delete(record)
    db.commit()
    return {"message": "Şifreniz başarıyla güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz."}



def request_otp_for_update(user_id: int, email: str, db: Session) -> dict:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    code = _create_otp_record(db, purpose="security_update", email=user.email, user_id=user.user_id)
    send_verification_email(user.email, code)
    return {"message": "Güvenlik kodu e-posta adresinize gönderildi."}


def security_update_password(user_id: int, code: str, new_password: str, db: Session) -> dict:
    record = _validate_otp(db, user_id, code, "security_update")
    user = db.query(User).filter(User.user_id == user_id).first()
    user.password_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    db.delete(record)
    db.commit()
    return {"message": "Şifreniz başarıyla güncellendi."}


def security_update_email(user_id: int, code: str, new_email: str, db: Session) -> dict:
    record = _validate_otp(db, user_id, code, "security_update")

    if db.query(User).filter(User.email == new_email).first():
        raise HTTPException(status_code=400, detail="Bu email adresi başka bir hesap tarafından kullanılıyor.")

    user = db.query(User).filter(User.user_id == user_id).first()
    user.email = new_email
    db.delete(record)
    db.commit()
    return {"message": "E-posta adresiniz başarıyla güncellendi.", "new_email": new_email}
