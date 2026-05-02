import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, ArrowRight, Target, UserRound, Utensils } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../config';

const ProfileSetup = () => {
  const [formData, setFormData] = useState({
    age: '',
    gender: 'Erkek',
    height: '',
    weight: '',
    objective: 'Kilo Vermek',
    meals: '3',
    activity: 'Hareketsiz (Az veya hiç egzersiz)',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, setProfile } = useApp();
  const navigate = useNavigate();

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (Number(formData.age) < 1 || Number(formData.age) > 120) {
      setError('Lütfen geçerli bir yaş girin (1-120).');
      return;
    }
    if (Number(formData.height) < 50 || Number(formData.height) > 250) {
      setError('Lütfen geçerli bir boy girin (50-250 cm).');
      return;
    }
    if (Number(formData.weight) < 20 || Number(formData.weight) > 300) {
      setError('Lütfen geçerli bir kilo girin (20-300 kg).');
      return;
    }
    if (!user) {
      setError('Lütfen önce giriş yapın.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: parseInt(formData.age, 10),
          gender: formData.gender,
          height_cm: parseInt(formData.height, 10),
          weight_kg: parseFloat(formData.weight),
          objective: formData.objective,
          meals: parseInt(formData.meals, 10),
          activity: formData.activity,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({ ...formData, daily_calorie: data.daily_calorie });
        navigate('/disliked');
      } else {
        setError('Profil kaydedilemedi, lütfen tekrar deneyin.');
      }
    } catch {
      setError('Sunucuya bağlanılamadı.');
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
            <UserRound size={16} />
            <span>ReciMatch Profili</span>
          </div>

          <h1>Sana uygun kalori hedefini ve tarif deneyimini birlikte şekillendirelim.</h1>
          <p>
            Boy, kilo, hareket düzeni ve hedef bilgilerini ekle. ReciMatch önerileri ve günlük
            planları bu bilgilerle daha doğru hale gelsin.
          </p>

          <div className="showcase-grid">
            <div className="showcase-card">
              <Target size={20} />
              <div>
                <strong>Hedefe göre yönlen</strong>
                <span>Kilo verme, koruma ya da artış sürecini plana bağla.</span>
              </div>
            </div>
            <div className="showcase-card">
              <Activity size={20} />
              <div>
                <strong>Daha isabetli hesaplama</strong>
                <span>Hareket seviyen günlük ihtiyacı ve önerileri etkiler.</span>
              </div>
            </div>
            <div className="showcase-card">
              <Utensils size={20} />
              <div>
                <strong>Öğüne uygun akış</strong>
                <span>Günlük öğün sayına uygun deneyim ve takip ekranı oluştur.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="register-panel card">
          <div className="register-panel-head">
            <p className="panel-kicker">Kullanıcı Özellikleri</p>
            <h2>Profilini tamamla</h2>
            <p className="panel-copy">
              Birkaç temel bilgiyle sana daha uygun tarifler ve kalori hedefi hazırlayalım.
            </p>
          </div>

          <form onSubmit={handleSave} className="register-form">
            {error && <div className="auth-message error">{error}</div>}

            <div className="form-split">
              <div>
                <label>Yaş</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="Örnek: 24"
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
              <div>
                <label>Cinsiyet</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="Erkek">Erkek</option>
                  <option value="Kadin">Kadın</option>
                </select>
              </div>
            </div>

            <div className="form-split">
              <div>
                <label>Boy</label>
                <input
                  type="number"
                  min="50"
                  max="250"
                  placeholder="cm"
                  required
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                />
              </div>
              <div>
                <label>Kilo</label>
                <input
                  type="number"
                  min="20"
                  max="300"
                  placeholder="kg"
                  required
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label>Haftalık Hareket Seviyesi</label>
              <select
                value={formData.activity}
                onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
              >
                <option value="Hareketsiz (Az veya hiç egzersiz)">Hareketsiz (Az veya hiç egzersiz)</option>
                <option value="Az Hareketli (Haftada 1-3 gün)">Az Hareketli (Haftada 1-3 gün)</option>
                <option value="Orta Hareketli (Haftada 3-5 gün)">Orta Hareketli (Haftada 3-5 gün)</option>
                <option value="Çok Hareketli (Haftada 6-7 gün)">Çok Hareketli (Haftada 6-7 gün)</option>
                <option value="Ekstra Hareketli (Aşırı egzersiz)">Ekstra Hareketli (Aşırı egzersiz)</option>
              </select>
            </div>

            <div className="form-split">
              <div>
                <label>Hedefin</label>
                <select
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                >
                  <option value="Kilo Vermek">Kilo Vermek</option>
                  <option value="Kilo Almak">Kilo Almak</option>
                  <option value="Kilo Koruma">Kilo Koruma</option>
                </select>
              </div>
              <div>
                <label>Günlük Öğün Sayısı</label>
                <select
                  value={formData.meals}
                  onChange={(e) => setFormData({ ...formData, meals: e.target.value })}
                >
                  <option value="2">2 Öğün</option>
                  <option value="3">3 Öğün</option>
                  <option value="4">4 Öğün</option>
                  <option value="5">5+ Öğün</option>
                </select>
              </div>
            </div>

            <div className="form-split">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                <ArrowLeft size={18} />
                <span>Geri Dön</span>
              </button>
              <button type="submit" className="primary-btn register-submit" disabled={loading}>
                <span>{loading ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ProfileSetup;
