import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, MailCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../config';
import reciMatchLogo from '../assets/recimatch-logo.png';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const { setUser, setProfile } = useApp();

  const parseResponse = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await parseResponse(response);

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Dogrulama basarili.');
        setUser(data.user);
        setProfile(data.profile);
        setTimeout(() => navigate('/setup'), 1800);
      } else {
        setStatus('error');
        setMessage(data.detail || data.message || 'Dogrulama basarisiz.');
      }
    } catch {
      setStatus('error');
      setMessage('Sunucu bağlantı hatası.');
    }
  };

  return (
    <div className="auth-shell register-shell">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />

      <div className="register-layout">
        <section className="register-showcase">
          <div className="showcase-badge">
            <img src={reciMatchLogo} alt="" className="badge-icon" />
            <span>ReciMatch</span>
          </div>

          <h1>E-posta doğrulamanı tamamla, hesabını güvenle aktifleştir.</h1>
          <p>
            E-posta adresine gonderilen 6 haneli kodu gir. Dogrulama tamamlaninca profil
            ayarlarina gecip deneyimini kisisellestirebilirsin.
          </p>

          <div className="showcase-grid">
            <div className="showcase-card">
              <MailCheck size={20} />
              <div>
                <strong>Hizli aktivasyon</strong>
                <span>Tek kod ile hesabin dakikalar icinde kullanima hazir olur.</span>
              </div>
            </div>
            <div className="showcase-card">
              <ShieldCheck size={20} />
              <div>
                <strong>Guvenli erisim</strong>
                <span>Dogru e-posta ile hesap sahipligini koruyan bir adimdir.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="register-panel card">
          <div className="register-panel-head">
            <p className="panel-kicker">Mail Dogrulama</p>
            <h2>Kodunu gir</h2>
            <p className="panel-copy">
              Gonderilen onay kodunu yaz, sonra profil ayarlarini tamamlayalim.
            </p>
          </div>

          <form onSubmit={handleVerify} className="register-form">
            {message && (
              <div className={`auth-message ${status === 'success' ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            <div>
              <label>E-posta</label>
              <input
                type="email"
                placeholder="ornek@mail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label>6 Haneli Kod</label>
              <input
                type="text"
                placeholder="123456"
                value={code}
                onChange={e => setCode(e.target.value)}
                maxLength={6}
                required
                style={{ textAlign: 'center', letterSpacing: '0.35em', fontSize: '1.1rem' }}
              />
            </div>

            <button type="submit" className="primary-btn register-submit" disabled={status === 'loading'}>
              <span>{status === 'loading' ? 'Dogrulaniyor...' : 'Maili Dogrula'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default VerifyEmail;
