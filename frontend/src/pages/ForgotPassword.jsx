import React, { useState } from 'react';
import './Login.css';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, ShieldCheck, Undo2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../config';
import reciMatchLogo from '../assets/recimatch-logo.png';

const ForgotPassword = () => {
  const { isDarkMode } = useApp();
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
    <div className="auth-shell" data-theme={isDarkMode ? 'dark' : 'light'}>
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />

      <div className="register-layout">
        <section className="register-showcase">
          <div className="brand-hero">
            <img src={reciMatchLogo} alt="ReciMatch Logo" className="hero-logo" />
            <h2 className="hero-title">ReciMatch</h2>
          </div>

          <h1>Hesabına güvenli şekilde yeniden eriş.</h1>
          <p>
            E-posta adresini gir, şifre sıfırlama kodunu gönderelim. Birkaç adım sonra yeniden
            hesabına dönebilirsin.
          </p>

          <div className="showcase-grid">
            <div className="showcase-card">
              <Mail size={20} />
              <div>
                <strong>Hızlı kod gönderimi</strong>
                <span>E-posta adresine doğrulama kodu yönlendirilir.</span>
              </div>
            </div>
            <div className="showcase-card">
              <ShieldCheck size={20} />
              <div>
                <strong>Güvenli sıfırlama</strong>
                <span>Kod doğrulaması olmadan şifre değişimi yapılmaz.</span>
              </div>
            </div>
            <div className="showcase-card">
              <Undo2 size={20} />
              <div>
                <strong>Kolay geri dönüş</strong>
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
            <div className="auth-input-group">
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
              <span>{loading ? 'Gönderiliyor...' : 'Kod Gönder'}</span>
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
