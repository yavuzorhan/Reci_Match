import React, { useState } from 'react';
import './Login.css';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../config';
import reciMatchLogo from '../assets/recimatch-logo.png';

const ResetPassword = () => {
  const { isDarkMode } = useApp();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const navigate = useNavigate();

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, new_password: newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.detail || 'İşlem başarısız.');
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

          <h1>Yeni şifreni belirleyip tekrar devam et.</h1>
          <p>
            E-postana gelen 6 haneli kodu kullan, yeni şifreni tanımla ve hesabına yeniden
            güvenli şekilde giriş yap.
          </p>

          <div className="showcase-grid">
            <div className="showcase-card">
              <ShieldCheck size={20} />
              <div>
                <strong>Kod ile doğrulama</strong>
                <span>Doğru kod olmadan şifre değişikliği tamamlanmaz.</span>
              </div>
            </div>
            <div className="showcase-card">
              <KeyRound size={20} />
              <div>
                <strong>Yeni şifre oluşturma</strong>
                <span>Eski şifren yerine güçlü bir şifre belirleyebilirsin.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="register-panel card">
          <div className="register-panel-head">
            <p className="panel-kicker">Yeni Şifre</p>
            <h2>Şifreni güncelle</h2>
            <p className="panel-copy">Kodunu ve yeni şifreni gir, hesabını yeniden etkinleştir.</p>
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

            <div className="auth-input-group">
              <label>6 Haneli Kod</label>
              <input
                type="text"
                placeholder="123456"
                required
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value)}
                style={{ textAlign: 'center', letterSpacing: '5px', fontSize: '1.2rem' }}
              />
            </div>

            <div className="auth-input-group">
              <label>Yeni Şifre</label>
              <input
                type="password"
                placeholder="En az 6 karakter"
                required
                minLength={6}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="primary-btn register-submit" disabled={loading}>
              <span>{loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="register-footer">
            <Link to="/login">İptal</Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default ResetPassword;
