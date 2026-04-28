import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';

const ResetPassword = () => {
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
      const response = await fetch('http://127.0.0.1:8000/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, new_password: newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setTimeout(() => navigate('/login'), 3000);
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

          <h1>Yeni sifreni belirleyip tekrar devam et.</h1>
          <p>
            E-postana gelen 6 haneli kodu kullan, yeni sifreni tanimla ve hesabina yeniden
            guvenli sekilde giris yap.
          </p>

          <div className="showcase-grid">
            <div className="showcase-card">
              <ShieldCheck size={20} />
              <div>
                <strong>Kod ile doğrulama</strong>
                <span>Dogru kod olmadan sifre degisikligi tamamlanmaz.</span>
              </div>
            </div>
            <div className="showcase-card">
              <KeyRound size={20} />
              <div>
                <strong>Yeni sifre olusturma</strong>
                <span>Eski sifren yerine guclu bir sifre belirleyebilirsin.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="register-panel card">
          <div className="register-panel-head">
            <p className="panel-kicker">Yeni Şifre</p>
            <h2>Şifreni güncelle</h2>
            <p className="panel-copy">Kodunu ve yeni sifreni gir, hesabini yeniden etkinlestir.</p>
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

            <div>
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

            <div>
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
            <Link to="/login">Iptal</Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default ResetPassword;
