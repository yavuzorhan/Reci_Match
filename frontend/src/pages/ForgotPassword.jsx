import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, ShieldCheck, Sparkles, Undo2 } from 'lucide-react';
import { API_BASE } from '../config';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setTimeout(() => navigate(`/reset-password?email=${encodeURIComponent(email)}`), 2000);
      } else {
        setError(data.detail || 'Islem basarisiz.');
      }
    } catch {
      setError('Sunucu ile bağlantı kurulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />

      <div className="register-layout">
        <section className="register-showcase">
          <div className="showcase-badge">
            <Sparkles size={16} />
            <span>ReciMatch</span>
          </div>

          <h1>Hesabina guvenli sekilde yeniden eris.</h1>
          <p>
            E-posta adresini gir, sifre sifirlama kodunu gonderelim. Birkac adim sonra yeniden
            hesabina donebilirsin.
          </p>

          <div className="showcase-grid">
            <div className="showcase-card">
              <Mail size={20} />
              <div>
                <strong>Hizli kod gonderimi</strong>
                <span>E-posta adresine doğrulama kodu yönlendirilir.</span>
              </div>
            </div>
            <div className="showcase-card">
              <ShieldCheck size={20} />
              <div>
                <strong>Guvenli sifirlama</strong>
                <span>Kod doğrulaması olmadan şifre değişimi yapılmaz.</span>
              </div>
            </div>
            <div className="showcase-card">
              <Undo2 size={20} />
              <div>
                <strong>Kolay geri donus</strong>
                <span>Yeni şifreyle doğrudan giriş ekranına dönersin.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="register-panel card">
          <div className="register-panel-head">
            <p className="panel-kicker">Şifre Sıfırlama</p>
            <h2>Şifremi unuttum</h2>
            <p className="panel-copy">Kayıtlı e-posta adresini gir, sana doğrulama kodu gönderelim.</p>
          </div>

          {message && <div className="auth-message success">{message}</div>}
          {error && <div className="auth-message error">{error}</div>}

          <form onSubmit={handleSubmit} className="register-form">
            <div>
              <label>E-posta</label>
              <input
                type="email"
                placeholder="ornek@mail.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" className="primary-btn register-submit" disabled={loading}>
              <span>{loading ? 'Gonderiliyor...' : 'Kod Gonder'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="register-footer">
            <Link to="/login">Giriş Sayfasına Dön</Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default ForgotPassword;
