import os
import smtplib
import secrets
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from ..config.settings import settings

def generate_otp():
    """6 haneli güvenli, rastgele bir sayı üretir."""
    return str(secrets.randbelow(900000) + 100000)

def _write_email_log(content):
    """Log e-posta bilgisini konsola yazar. Dosya yazma hataları sessizce geçilir."""
    try:
        print(content, flush=True)
    except Exception:
        pass
    try:
        log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "emails.txt")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(content + "\n")
    except Exception:
        pass  # Dosya yazılamazsa sunucu çökmemeli

def send_email(subject: str, recipient: str, body: str):
    """
    SMTP üzerinden e-posta gönderir. Eğer SMTP ayarları eksikse sadece log yazar.
    """
    _write_email_log(f"\n📧 E-POSTA HAZIRLANIYOR -> {recipient}\nKonu: {subject}\nİçerik: {body}\n")

    if not all([settings.SMTP_SERVER, settings.SMTP_USERNAME, settings.SMTP_PASSWORD]):
        print("⚠️ SMTP ayarları eksik. E-posta gerçek olarak gönderilmedi, sadece loglara yazıldı.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = f"ReciMatch <{settings.FROM_EMAIL}>"
        msg['To'] = recipient
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'html', 'utf-8'))

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
            
        print(f"✅ E-posta başarıyla gönderildi: {recipient}")
        return True
    except Exception as e:
        print(f"❌ E-posta gönderilirken hata oluştu: {str(e)}")
        return False

def send_verification_email(email: str, code: str):
    subject = "Mail Doğrulama Kodu - ReciMatch"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #10b981;">Hoş Geldiniz!</h2>
            <p>ReciMatch'e kayıt olduğunuz için teşekkürler.</p>
            <p>Hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
            <div style="padding: 15px; background-color: #f4f4f4; border-radius: 5px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #10b981; border: 1px solid #ddd;">
                {code}
            </div>
            <p>Bu kod <b>10 dakika</b> boyunca geçerlidir.</p>
            <p>Eğer bu hesabı siz oluşturmadıysanız bu e-postayı dikkate almayın.</p>
        </body>
    </html>
    """
    return send_email(subject, email, body)

def send_password_reset_email(email: str, code: str):
    subject = "Şifre Sıfırlama Kodu - ReciMatch"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #10b981;">Şifre Sıfırlama</h2>
            <p>Hesabınız için şifre sıfırlama isteği aldık.</p>
            <p>Aşağıdaki kodu kullanarak yeni şifrenizi belirleyebilirsiniz:</p>
            <div style="padding: 15px; background-color: #f4f4f4; border-radius: 5px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #10b981; border: 1px solid #ddd;">
                {code}
            </div>
            <p>Bu kod <b>10 dakika</b> boyunca geçerlidir.</p>
            <p>Eğer bu isteği siz yapmadıysanız lütfen bu e-postayı dikkate almayın.</p>
        </body>
    </html>
    """
    return send_email(subject, email, body)

