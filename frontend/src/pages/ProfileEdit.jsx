import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Camera,
  Check,
  Lock,
  Mail,
  Plus,
  Save,
  ShieldCheck,
  Target,
  Trash2,
  User,
  X,
} from 'lucide-react';

import Layout from '../components/Layout';
import IngredientPicker from '../components/IngredientPicker';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../config';

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const macroTargetsFromCalories = (calories) => ({
  protein: Math.round((calories * 0.25) / 4),
  carbs: Math.round((calories * 0.45) / 4),
  fat: Math.round((calories * 0.30) / 9),
});

const GlassCard = ({ children, className = '' }) => (
  <section className={`profile-glass-card ${className}`}>{children}</section>
);

const Field = ({ label, children }) => (
  <label className="profile-field">
    <span>{label}</span>
    {children}
  </label>
);

const PreferenceTag = ({ label, dashed = false, danger = false, onClick }) => (
  <button
    type="button"
    className={`profile-tag ${dashed ? 'dashed' : ''} ${danger ? 'danger' : ''}`}
    onClick={onClick}
  >
    {dashed && <Plus size={15} />}
    {label}
  </button>
);

const SecurityAction = ({ icon, title, description, buttonText, danger = false, onClick }) => (
  <div className={`profile-security-row ${danger ? 'danger' : ''}`}>
    <div className="profile-security-copy">
      <span>{icon}</span>
      <div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
    </div>
    <button type="button" onClick={onClick}>
      {buttonText}
    </button>
  </div>
);

const ProfileEdit = () => {
  const { profile, setProfile, user, setUser, dislikedIngredients, setDislikedIngredients } = useApp();
  const [formData, setFormData] = useState({ ...profile, name: user?.name || '' });
  const [emailData, setEmailData] = useState({ newEmail: '', otp: '' });
  const [passwordData, setPasswordData] = useState({ newPassword: '', otp: '' });
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    setFormData({ ...profile, name: user?.name || '' });
  }, [profile, user]);

  const calorieTarget = toNumber(formData.daily_calorie ?? profile?.daily_calorie, 2200) || 2200;
  const macros = useMemo(() => macroTargetsFromCalories(calorieTarget), [calorieTarget]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!user) return;

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
          meals: parseInt(formData.meals, 10) || 3,
          activity: formData.activity,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({ ...formData, daily_calorie: data.daily_calorie });
        setUser({ ...user, name: formData.name });
        alert('Profil bilgileriniz güncellendi!');
      } else {
        alert('Profil güncellenemedi.');
      }
    } catch {
      alert('Hata oluştu.');
    }
  };

  const handleRequestEmailOTP = async () => {
    setEmailLoading(true);
    setEmailMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/users/${user.id}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      if (response.ok) {
        setEmailOtpSent(true);
        setEmailMessage('Güvenlik kodu mevcut e-postanıza gönderildi.');
      } else {
        const data = await response.json();
        setEmailMessage(data.detail || 'OTP gönderilemedi.');
      }
    } catch {
      setEmailMessage('Sunucu ile bağlantı kurulamadı.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!emailData.newEmail.trim()) {
      setEmailMessage('Yeni e-posta adresi giriniz.');
      return;
    }
    if (!emailData.otp.trim()) {
      setEmailMessage('Doğrulama kodunu giriniz.');
      return;
    }
    setEmailLoading(true);
    setEmailMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/users/${user.id}/update-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_email: emailData.newEmail, code: emailData.otp }),
      });
      const data = await response.json();
      if (response.ok) {
        setUser({ ...user, email: data.new_email });
        setEmailMessage('E-posta adresiniz güncellendi.');
        setEmailOtpSent(false);
        setEmailData({ newEmail: '', otp: '' });
      } else {
        setEmailMessage(data.detail || 'Güncelleme başarısız.');
      }
    } catch {
      setEmailMessage('Sunucu ile bağlantı kurulamadı.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleRequestPasswordOTP = async () => {
    setPasswordLoading(true);
    setPasswordMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/users/${user.id}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      if (response.ok) {
        setPasswordOtpSent(true);
        setPasswordMessage('Güvenlik kodu e-postanıza gönderildi.');
      } else {
        const data = await response.json();
        setPasswordMessage(data.detail || 'OTP gönderilemedi.');
      }
    } catch {
      setPasswordMessage('Sunucu ile bağlantı kurulamadı.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordData.newPassword.trim() || passwordData.newPassword.length < 6) {
      setPasswordMessage('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (!passwordData.otp.trim()) {
      setPasswordMessage('Doğrulama kodunu giriniz.');
      return;
    }
    setPasswordLoading(true);
    setPasswordMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/users/${user.id}/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, code: passwordData.otp, new_password: passwordData.newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setPasswordMessage('Şifreniz başarıyla güncellendi.');
        setPasswordOtpSent(false);
        setPasswordData({ newPassword: '', otp: '' });
      } else {
        setPasswordMessage(data.detail || 'Güncelleme başarısız.');
      }
    } catch {
      setPasswordMessage('Sunucu ile bağlantı kurulamadı.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const syncDisliked = async (newIds) => {
    try {
      await fetch(`${API_BASE}/api/users/${user.id}/disliked-ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient_ids: newIds }),
      });
      setDislikedIngredients(newIds);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <Layout>
      <form className="profile-page" onSubmit={handleSaveProfile}>
        <header className="profile-topbar">
          <div>
            <h1>Profil</h1>
            <p>Hesap bilgilerini, beslenme hedeflerini ve tarif tercihlerini yönet.</p>
          </div>
          <div className="profile-top-actions">
            <button type="button" className="profile-notification" aria-label="Bildirimler">
              <Bell size={18} />
              <span />
            </button>
            <button type="submit" className="profile-save-button">
              <Save size={18} />
              Değişiklikleri Kaydet
            </button>
          </div>
        </header>

        <main className="profile-content">
          <div className="profile-left-column">
            <GlassCard className="profile-identity-card">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar">
                  {(formData.name || user?.name || 'Y')[0].toLocaleUpperCase('tr-TR')}
                </div>
                <span><Camera size={20} /></span>
              </div>
              <div>
                <h2>{formData.name || user?.name || 'Yavuz'}</h2>
                <p>{user?.email || 'yavuz@example.com'}</p>
                <button type="button">
                  <User size={15} />
                  Profili Düzenle
                </button>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="profile-card-title">
                <User size={21} />
                <h3>Kişisel Bilgiler</h3>
              </div>

              <div className="profile-field-grid two">
                <Field label="İsim">
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  />
                </Field>
                <Field label="Yaş">
                  <input
                    type="number"
                    value={formData.age || ''}
                    onChange={(event) => setFormData({ ...formData, age: event.target.value })}
                  />
                </Field>
              </div>

              <div className="profile-field-grid two">
                <Field label="Boy (cm)">
                  <input
                    type="number"
                    value={formData.height ?? ''}
                    onChange={(event) => setFormData({ ...formData, height: event.target.value })}
                  />
                </Field>
                <Field label="Kilo (kg)">
                  <input
                    type="number"
                    value={formData.weight ?? ''}
                    onChange={(event) => setFormData({ ...formData, weight: event.target.value })}
                  />
                </Field>
              </div>

              <Field label="Cinsiyet">
                <select
                  value={formData.gender || 'Erkek'}
                  onChange={(event) => setFormData({ ...formData, gender: event.target.value })}
                >
                  <option value="Erkek">Erkek</option>
                  <option value="Kadın">Kadın</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </Field>

              <Field label="Aktivite Seviyesi">
                <select
                  value={formData.activity || 'Orta Hareketli'}
                  onChange={(event) => setFormData({ ...formData, activity: event.target.value })}
                >
                  <option value="Hareketsiz">Sedanter (Hareketsiz)</option>
                  <option value="Az Hareketli">Hafif Aktif</option>
                  <option value="Orta Hareketli">Haftada 3-5 gün spor</option>
                  <option value="Çok Hareketli">Çok Aktif</option>
                </select>
              </Field>

              <div className="profile-field-grid two">
                <Field label="Ana Hedef">
                  <select
                    value={formData.objective || 'Kilo Koruma'}
                    onChange={(event) => setFormData({ ...formData, objective: event.target.value })}
                  >
                    <option value="Kilo Vermek">Kilo Vermek</option>
                    <option value="Kilo Almak">Kilo Almak</option>
                    <option value="Kilo Koruma">Kilo Koruma</option>
                  </select>
                </Field>
                <Field label="Öğün Sayısı">
                  <input
                    type="number"
                    value={formData.meals || 3}
                    onChange={(event) => setFormData({ ...formData, meals: event.target.value })}
                  />
                </Field>
              </div>
            </GlassCard>
          </div>

          <div className="profile-right-column">
            <GlassCard>
              <div className="profile-goal-head">
                <div className="profile-card-title compact">
                  <Target size={21} />
                  <h3>Beslenme Hedefleri</h3>
                </div>
                <div>
                  <strong>{Math.round(calorieTarget)}</strong>
                  <span>kcal / gün</span>
                </div>
              </div>

              <div className="profile-macro-grid">
                {[
                  { label: 'Protein', value: macros.protein, width: 65, color: '#10b981' },
                  { label: 'Karbonhidrat', value: macros.carbs, width: 80, color: '#006b5f' },
                  { label: 'Yağ', value: macros.fat, width: 45, color: '#ba1a1a' },
                ].map((macro) => (
                  <div className="profile-macro" key={macro.label}>
                    <div>
                      <span>{macro.label}</span>
                      <strong>{macro.value}g</strong>
                    </div>
                    <i><b style={{ width: `${macro.width}%`, backgroundColor: macro.color, boxShadow: `0 0 10px ${macro.color}55` }} /></i>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="profile-card-title danger-title">
                <X size={21} />
                <h3>Sevilmeyen Malzemeler</h3>
              </div>

              <div className="profile-tag-row disliked-preview">
                {['Mantar', 'Soğan', 'Kereviz'].map((item) => (
                  <span key={item}>
                    {item}
                    <X size={15} />
                  </span>
                ))}
                <PreferenceTag label="Malzeme Engelle" dashed danger />
              </div>

              <details className="profile-disliked-details">
                <summary>Malzeme listesini yönet</summary>
                <div>
                  <IngredientPicker
                    userId={user?.id}
                    initialSelection={dislikedIngredients}
                    onSelectionChange={syncDisliked}
                  />
                </div>
              </details>
            </GlassCard>

            <GlassCard>
              <div className="profile-card-title">
                <ShieldCheck size={21} />
                <h3>Güvenlik</h3>
              </div>
              <p className="profile-security-intro">
                Hesap giriş bilgilerinizi ve iletişim e-postanızı yönetin.
              </p>

              <div className="profile-security-list">
                <SecurityAction
                  icon={<Lock size={21} />}
                  title="Şifre Değiştir"
                  description="Hesabınızın güvenliği için şifrenizi güncelleyin."
                  buttonText={passwordLoading ? 'İşleniyor...' : passwordOtpSent ? 'Onayla' : 'Değiştir'}
                  onClick={passwordOtpSent ? handleUpdatePassword : handleRequestPasswordOTP}
                />
                {passwordOtpSent && (
                  <div className="profile-inline-auth">
                    <input
                      type="password"
                      placeholder="Yeni şifre"
                      value={passwordData.newPassword}
                      onChange={(event) => setPasswordData({ ...passwordData, newPassword: event.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Kod"
                      value={passwordData.otp}
                      onChange={(event) => setPasswordData({ ...passwordData, otp: event.target.value })}
                    />
                  </div>
                )}
                {passwordMessage && <p className="profile-message">{passwordMessage}</p>}

                <SecurityAction
                  icon={<Mail size={21} />}
                  title="E-posta Değiştir"
                  description="Hesabınıza bağlı e-posta adresini güncelleyin."
                  buttonText={emailLoading ? 'İşleniyor...' : emailOtpSent ? 'Onayla' : 'Güncelle'}
                  onClick={emailOtpSent ? handleUpdateEmail : handleRequestEmailOTP}
                />
                {emailOtpSent && (
                  <div className="profile-inline-auth">
                    <input
                      type="email"
                      placeholder="Yeni e-posta"
                      value={emailData.newEmail}
                      onChange={(event) => setEmailData({ ...emailData, newEmail: event.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Kod"
                      value={emailData.otp}
                      onChange={(event) => setEmailData({ ...emailData, otp: event.target.value })}
                    />
                  </div>
                )}
                {emailMessage && <p className="profile-message">{emailMessage}</p>}

                <SecurityAction
                  icon={<Trash2 size={21} />}
                  title="Hesabı Sil"
                  description="Hesabınızı ve tüm verilerinizi kalıcı olarak silin."
                  buttonText="Hesabı Sil"
                  danger
                  onClick={() => alert('Hesap silme işlemi için backend aksiyonu henüz bağlanmadı.')}
                />
              </div>
            </GlassCard>
          </div>

          <footer className="profile-footer">
            <div>
              <a href="#notifications">Bildirim Tercihleri</a>
              <a href="#privacy">Gizlilik Politikası</a>
            </div>
            <p>ReciMatch © 2024 • Professional Nutrition & Culinary Platform</p>
          </footer>
        </main>
      </form>

      <style dangerouslySetInnerHTML={{ __html: `
        /* --- FRESH LIGHT THEME (DEFAULT) --- */
        .layout-shell[data-theme="light"] .layout-content:has(.profile-page) {
          padding: 0;
          background-color: #f4fbf4 !important;
          background-image:
            radial-gradient(circle at 10% 18%, rgba(111, 251, 190, 0.28) 0%, transparent 38%),
            radial-gradient(circle at 90% 78%, rgba(109, 245, 225, 0.20) 0%, transparent 40%),
            linear-gradient(180deg, #f4fbf4 0%, #eef6ee 100%) !important;
          color: #161d19;
        }

        .layout-shell[data-theme="light"]:has(.profile-page) .sidebar {
          background: rgba(255, 255, 255, 0.74);
          border-right: 1px solid rgba(187,202,191,0.55);
          box-shadow: 0 12px 34px rgba(0,108,73,0.08);
          backdrop-filter: blur(24px);
        }

        .layout-shell[data-theme="light"]:has(.profile-page) .brand-wordmark-reci,
        .layout-shell[data-theme="light"]:has(.profile-page) .brand-wordmark-match {
          color: #006c49;
        }

        .layout-shell[data-theme="light"] .profile-topbar {
          border-bottom: 1px solid rgba(187,202,191,0.55);
          background: rgba(255, 255, 255, 0.70);
          box-shadow: 0 8px 24px rgba(0,108,73,0.05);
        }

        .layout-shell[data-theme="light"] .profile-topbar h1 { color: #002114; }
        .layout-shell[data-theme="light"] .profile-topbar p { color: #3f4943; }
        .layout-shell[data-theme="light"] .profile-notification { border: 1px solid #bbcabf; background: rgba(255, 255, 255, 0.82); color: #3f4943; }
        .layout-shell[data-theme="light"] .profile-save-button { background: #006c49; color: white; box-shadow: 0 12px 28px rgba(0,108,73,0.18); }
        .layout-shell[data-theme="light"] .profile-glass-card { border: 1px solid rgba(187,202,191,0.55); background: rgba(255, 255, 255, 0.72); box-shadow: 0 14px 34px rgba(0,108,73,0.08); }
        .layout-shell[data-theme="light"] .profile-avatar { background: linear-gradient(135deg, #006c49, #4edea3); color: white; }
        .layout-shell[data-theme="light"] .profile-field input, .layout-shell[data-theme="light"] .profile-field select { border: 1px solid #bbcabf; background: rgba(255,255,255,0.82); color: #161d19; }
        .layout-shell[data-theme="light"] .profile-tag, .layout-shell[data-theme="light"] .disliked-preview span { border: 1px solid #bbcabf; background: #f4fbf4; color: #3f4943; }
        .layout-shell[data-theme="light"] .profile-security-row { border: 1px solid #bbcabf; background: white; }

        /* --- NOCTURNAL DARK THEME (COPY FROM DASHBOARD) --- */
        .layout-shell[data-theme="dark"] .layout-content:has(.profile-page) {
          padding: 0;
          background-color: #0c0814 !important;
          background-image:
            radial-gradient(circle at 10% 20%, rgba(100, 31, 224, 0.12) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(68, 226, 205, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(147, 0, 10, 0.03) 0%, transparent 60%) !important;
          color: #d4e4fa;
        }

        .layout-shell[data-theme="dark"]:has(.profile-page) .sidebar {
          background: rgba(12, 8, 20, 0.60);
          border-right: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(48px);
          box-shadow: none;
        }

        .layout-shell[data-theme="dark"]:has(.profile-page) .brand-wordmark-reci,
        .layout-shell[data-theme="dark"]:has(.profile-page) .brand-wordmark-match {
          color: #4edea3;
        }

        .layout-shell[data-theme="dark"] .profile-topbar {
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(12, 8, 20, 0.28);
          box-shadow: none;
        }

        .layout-shell[data-theme="dark"] .profile-topbar h1 { color: #d4e4fa; }
        .layout-shell[data-theme="dark"] .profile-topbar p { color: #bbcabf; }
        .layout-shell[data-theme="dark"] .profile-notification { border: 1px solid rgba(255,255,255,0.05); background: rgba(18, 33, 49, 0.30); color: #bbcabf; }
        .layout-shell[data-theme="dark"] .profile-save-button { background: #4edea3; color: #003824; box-shadow: 0 12px 28px rgba(78,222,163,0.20); }
        .layout-shell[data-theme="dark"] .profile-glass-card { border: 0.5px solid rgba(255, 255, 255, 0.05); background-color: rgba(28, 43, 60, 0.10); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25); }
        .layout-shell[data-theme="dark"] .profile-avatar { background: linear-gradient(135deg, rgba(78,222,163,0.25), rgba(68,226,205,0.10)); color: #d4e4fa; border: 1px solid rgba(255,255,255,0.10); }
        .layout-shell[data-theme="dark"] .profile-field input, .layout-shell[data-theme="dark"] .profile-field select, .layout-shell[data-theme="dark"] .profile-inline-auth input { border: 1px solid #3c4a42; background: #122131; color: #d4e4fa; }
        .layout-shell[data-theme="dark"] .profile-tag, .layout-shell[data-theme="dark"] .disliked-preview span { background: rgba(18, 33, 49, 0.42); color: #bbcabf; border: 1px solid rgba(255,255,255,0.10); }
        .layout-shell[data-theme="dark"] .profile-security-row { border: 1px solid rgba(255,255,255,0.05); background: rgba(18,33,49,0.22); }
        .layout-shell[data-theme="dark"] .profile-macro i { background: #1a1a24; }
        .layout-shell[data-theme="dark"] .profile-footer { border-top-color: rgba(255,255,255,0.08); }
        .layout-shell[data-theme="dark"] .profile-footer a { color: #4edea3; }
        .layout-shell[data-theme="dark"] .profile-footer p { color: #bbcabf; }

        /* --- BASE LAYOUT (SHARED) --- */
        .profile-page {
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', Inter, system-ui, sans-serif;
        }

        .profile-topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 0 32px;
          backdrop-filter: blur(18px);
        }

        .profile-topbar h1 { margin: 0; font-size: 25px; line-height: 1.2; font-weight: 850; }
        .profile-topbar p { margin: 4px 0 0; font-size: 14px; }
        .profile-top-actions { display: flex; align-items: center; gap: 12px; }

        .profile-notification {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 0 13px;
          border-radius: 999px;
          cursor: pointer;
          position: relative;
        }

        .profile-notification span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #ba1a1a;
          box-shadow: 0 0 12px rgba(186,26,26,0.34);
        }

        .profile-save-button {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 20px;
          border: 0;
          border-radius: 14px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .profile-save-button:hover { transform: translateY(-1px); }

        .profile-content {
          width: min(100%, 1440px);
          margin: 0 auto;
          padding: 32px 32px 40px;
          display: grid;
          grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.35fr);
          gap: 24px;
        }

        .profile-left-column, .profile-right-column { display: flex; flex-direction: column; gap: 24px; min-width: 0; }

        .profile-glass-card { border-radius: 24px; padding: 24px; backdrop-filter: blur(48px); }

        .profile-identity-card { display: flex; align-items: center; gap: 24px; }
        .profile-avatar-wrap { position: relative; }
        .profile-avatar { width: 96px; height: 96px; display: grid; place-items: center; border-radius: 24px; font-size: 38px; font-weight: 950; }

        .profile-avatar-wrap span {
          position: absolute;
          bottom: -6px;
          right: -6px;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          border: 3px solid white;
          background: #cfe8dc;
          color: #006c49;
          cursor: pointer;
        }

        .profile-identity-card h2 { margin: 0; font-size: 23px; font-weight: 850; }
        .profile-identity-card p { margin: 4px 0 12px; font-size: 14px; }

        .profile-identity-card button {
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 12px;
          border-radius: 8px;
          border: 1.5px solid #006c49;
          background: transparent;
          color: #006c49;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
        }

        .profile-card-title { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; color: #006c49; }
        .profile-card-title h3 { margin: 0; font-size: 18px; font-weight: 850; }
        .profile-card-title.compact { margin-bottom: 0; }
        .profile-card-title.danger-title { color: #ba1a1a; }

        .profile-field-grid { display: grid; gap: 16px; margin-bottom: 16px; }
        .profile-field-grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }

        .profile-field { display: grid; gap: 8px; margin-bottom: 16px; }
        .profile-field > span { font-size: 11px; font-weight: 950; letter-spacing: 0.09em; text-transform: uppercase; padding-left: 4px; }

        .profile-field input, .profile-field select {
          width: 100%;
          min-height: 46px;
          padding: 0 14px;
          border-radius: 13px;
          outline: none;
          font-weight: 750;
          transition: all 0.2s ease;
        }

        .profile-goal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .profile-goal-head > div:last-child { text-align: right; }
        .profile-goal-head strong { display: block; font-size: 28px; font-weight: 950; line-height: 1; }
        .profile-goal-head span { font-size: 12px; font-weight: 850; text-transform: uppercase; letter-spacing: 0.05em; }

        .profile-macro-grid { display: grid; gap: 18px; }
        .profile-macro > div { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 850; }
        .profile-macro i { display: block; height: 7px; border-radius: 10px; overflow: hidden; }
        .profile-macro b { display: block; height: 100%; border-radius: inherit; }

        .profile-tag-row { display: flex; flex-wrap: wrap; gap: 10px; }
        .profile-tag, .disliked-preview span { min-height: 38px; display: inline-flex; align-items: center; gap: 7px; padding: 0 14px; border-radius: 11px; font-size: 13px; font-weight: 850; cursor: pointer; transition: all 0.2s ease; }
        .profile-tag:hover { transform: translateY(-1px); }
        .profile-tag.dashed { border-style: dashed; background: transparent; }
        .profile-tag.danger { border-color: #ba1a1a; color: #ba1a1a; }
        .disliked-preview span svg { color: #ba1a1a; cursor: pointer; }

        .profile-disliked-details { margin-top: 16px; border-radius: 16px; overflow: hidden; border: 1px solid #bbcabf; }
        .profile-disliked-details summary { padding: 12px 16px; font-size: 13px; font-weight: 850; color: #006c49; cursor: pointer; outline: none; }
        .profile-disliked-details[open] summary { border-bottom: 1px solid #bbcabf; }
        .profile-disliked-details > div { padding: 16px; }

        .profile-security-intro { margin: 0 0 20px; font-size: 14px; line-height: 1.5; }
        .profile-security-list { display: grid; gap: 12px; }
        .profile-security-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; border-radius: 16px; transition: all 0.2s ease; }
        .profile-security-copy { display: flex; align-items: flex-start; gap: 14px; }
        .profile-security-copy span { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 12px; flex-shrink: 0; }
        .profile-security-copy h4 { margin: 0; font-size: 15px; font-weight: 850; }
        .profile-security-copy p { margin: 4px 0 0; font-size: 13px; line-height: 1.45; }

        .profile-security-row button { min-height: 36px; padding: 0 16px; border-radius: 10px; border: 1.5px solid #006c49; background: transparent; color: #006c49; font-size: 13px; font-weight: 850; cursor: pointer; white-space: nowrap; }
        .profile-security-row.danger button { border-color: #ba1a1a; color: #ba1a1a; }

        .profile-inline-auth { display: grid; grid-template-columns: 1fr 80px; gap: 10px; margin-top: -4px; padding: 0 12px 12px; border-top: 0; border-radius: 0 0 16px 16px; }
        .profile-inline-auth input { min-height: 38px; border-radius: 8px; padding: 0 12px; font-size: 13px; border: 1px solid #bbcabf; outline: none; }

        .profile-message { margin: 8px 0; padding: 8px 12px; border-radius: 8px; background: #fff8f6; color: #ba1a1a; font-size: 13px; font-weight: 750; }

        .profile-footer { grid-column: 1 / -1; margin-top: 16px; padding: 28px 0 10px; text-align: center; border-top: 1px solid rgba(187,202,191,0.55); }
        .profile-footer div { display: flex; justify-content: center; gap: 28px; flex-wrap: wrap; }
        .profile-footer a { font-size: 14px; font-weight: 750; text-decoration: none; }
        .profile-footer p { margin: 22px 0 0; font-size: 11px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; }

        @media (max-width: 1180px) { .profile-content { grid-template-columns: 1fr; } }
        @media (max-width: 760px) {
          .profile-topbar { height: auto; min-height: 80px; align-items: flex-start; flex-direction: column; padding: 18px 16px; }
          .profile-content { padding: 24px 16px; }
          .profile-identity-card { flex-direction: column; text-align: center; }
          .profile-field-grid.two { grid-template-columns: 1fr; }
          .profile-security-row { flex-direction: column; align-items: flex-start; }
          .profile-security-row button { width: 100%; }
        }
      ` }} />
    </Layout>
  );
};

export default ProfileEdit;
