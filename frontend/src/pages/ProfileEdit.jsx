import React, { useEffect, useMemo, useState } from 'react';
import './ProfileEdit.css';
import {
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
              <a href="#privacy">Gizlilik Politikası</a>
            </div>
            <p>ReciMatch © 2024 • Professional Nutrition & Culinary Platform</p>
          </footer>
        </main>
      </form>

    </Layout>
  );
};

export default ProfileEdit;
