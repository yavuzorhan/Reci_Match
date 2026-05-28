import React, { useState } from 'react';
import './Login.css';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../config';
import reciMatchLogo from '../assets/recimatch-logo.png';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { setUser, setProfile, isDarkMode } = useApp();
  const navigate = useNavigate();

  const parseResponse = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await parseResponse(response);

      if (response.ok) {
        setUser({ id: data.user.id, name: data.user.name, email: data.user.email });
        if (data.profile) setProfile(data.profile);

        if (!data.profile || !data.profile.age || !data.profile.height) {
          navigate('/setup');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(data.detail || data.message || 'Giriş başarısız.');
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

          <h1>Tarif akışını kaldığın yerden devam ettir.</h1>
          <p>
            Favorilerin, haftalık kayıtların ve sana özel tarif önerin hazır. Giriş yap ve
            mutfak akışını kaldığın yerden sürdür.
          </p>

          <div className="showcase-grid">
            <div className="showcase-card">
              <Sparkles size={24} />
              <div>
                <strong>Akıcı deneyim</strong>
                <span>Seçilen malzemeler, favoriler ve hedeflerin tek hesapta toplanır.</span>
              </div>
            </div>
            <div className="showcase-card">
              <ShieldCheck size={24} />
              <div>
                <strong>Güvenli erişim</strong>
                <span>Onaylı hesabına hızlı ve güvenli şekilde geri dönersin.</span>
              </div>
            </div>
            <div className="showcase-card">
              <LockKeyhole size={24} />
              <div>
                <strong>Kişisel alan</strong>
                <span>Tarif geçmişin ve beslenme düzenin sana özel olarak saklanır.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="register-panel card">
          <div className="register-panel-head">
            <p className="panel-kicker">Giriş Yap</p>
            <h2>Tekrar hoş geldin</h2>
            <p className="panel-copy">Bilgilerini gir, uygulama seni doğrudan tarif alanına taşıyacak.</p>
          </div>

          <form onSubmit={handleLogin} className="register-form">
            {error && <div className="auth-message error">{error}</div>}

            <div className="auth-input-group">
              <label>E-posta</label>
              <input
                type="email"
                placeholder="ornek@mail.com"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="auth-input-group">
              <label>Şifre</label>
              <input
                type="password"
                placeholder="Şifrenizi girin"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button type="submit" className="primary-btn register-submit" disabled={loading}>
              <span>{loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}</span>
              <ArrowRight size={20} />
            </button>
          </form>

          <p className="register-footer" style={{ marginTop: '1.5rem' }}>
            <Link to="/forgot-password">Şifremi Unuttum</Link>
          </p>

          <p className="register-footer">
            Hesabın yok mu? <Link to="/register">Kayıt Ol</Link>
          </p>
        </section>
      </div>

    </div>
  );
};

export default Login;
