import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, ChefHat, ShieldCheck, Sparkles } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const parseResponse = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm) {
      setError('Şifreler uyuşmuyor.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await parseResponse(response);

      if (response.ok) {
        setSuccess(data.message || 'Onay kodu e-posta adresinize gönderildi.');
        setTimeout(() => navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`), 1800);
      } else {
        setError(data.detail || data.message || 'Kayıt başarısız.');
      }
    } catch {
      setError('Sunucu ile bağlantı kurulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell register-shell">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />

      <div className="register-layout">
        <section className="register-showcase">
          <div className="showcase-badge">
            <Sparkles size={16} />
            <span>ReciMatch</span>
          </div>

          <h1>Damak tadına ve hedeflerine uyan tarifleri birlikte bulalım.</h1>
          <p>
            Kayıt olduktan sonra malzemelerine, hedef kalorine ve tercih ettiğin yemek stiline göre
            sana özel bir deneyim hazırlanır.
          </p>

          <div className="showcase-grid">
            <div className="showcase-card">
              <ChefHat size={20} />
              <div>
                <strong>Akıllı öneriler</strong>
                <span>Seçilen malzemeler ve profil bilgilerinle tarifleri sırala.</span>
              </div>
            </div>
            <div className="showcase-card">
              <ShieldCheck size={20} />
              <div>
                <strong>Güvenli kayıt</strong>
                <span>E-posta onayı ile hesabın birkaç adımda oluşur.</span>
              </div>
            </div>
            <div className="showcase-card">
              <BadgeCheck size={20} />
              <div>
                <strong>Takip edilebilir düzen</strong>
                <span>Favorilerini ve haftalık yemek geçmişini tek yerde tut.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="register-panel card">
          <div className="register-panel-head">
            <p className="panel-kicker">Hesap Oluştur</p>
            <h2>Yeni başlangıç</h2>
            <p className="panel-copy">Dakikalar içinde kaydol, sonra onay kodunla devam et.</p>
          </div>

          <form onSubmit={handleRegister} className="register-form">
            {success && <div className="auth-message success">{success}</div>}
            {error && <div className="auth-message error">{error}</div>}

            <div className="form-split">
              <div>
                <label>Ad Soyad</label>
                <input
                  type="text"
                  placeholder="Örnek: Yavuz Orhan"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label>E-posta</label>
                <input
                  type="email"
                  placeholder="ornek@mail.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-split">
              <div>
                <label>Şifre</label>
                <input
                  type="password"
                  placeholder="En az 6 karakter"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <label>Şifre Tekrar</label>
                <input
                  type="password"
                  placeholder="Şifrenizi tekrar girin"
                  required
                  minLength={6}
                  value={formData.confirm}
                  onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="primary-btn register-submit" disabled={loading}>
              <span>{loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol ve Başla'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="register-footer">
            Zaten hesabın var mı? <Link to="/login">Giriş Yap</Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default Register;
