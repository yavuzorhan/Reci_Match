/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import { User, Settings, Lock, Mail, Key, ShieldCheck, Activity, Target, Save, Fingerprint, Bell, Trash2, Heart, Scale, Ruler } from 'lucide-react';
import IngredientPicker from '../components/IngredientPicker';

const ProfileEdit = () => {
  const { profile, setProfile, user, setUser, dislikedIngredients, setDislikedIngredients } = useApp();
  const [activeTab, setActiveTab] = useState('profile');
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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: parseInt(formData.age),
          gender: formData.gender,
          height_cm: parseInt(formData.height),
          weight_kg: parseFloat(formData.weight),
          objective: formData.objective,
          meals: parseInt(formData.meals) || 3,
          activity: formData.activity
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({ ...formData, daily_calorie: data.daily_calorie });
        setUser({ ...user, name: formData.name });
        alert('Profil bilgileriniz güncellendi!');
      }
    } catch {
      alert('Hata oluştu.');
    }
  };

  const handleRequestEmailOTP = async () => {
    setEmailLoading(true);
    setEmailMessage('');
    try {
      const resp = await fetch(`http://127.0.0.1:8000/api/users/${user.id}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      if (resp.ok) {
        setEmailOtpSent(true);
        setEmailMessage('✅ Güvenlik kodu mevcut e-postanıza gönderildi.');
      } else {
        const data = await resp.json();
        setEmailMessage(`❌ ${data.detail || 'OTP gönderilemedi.'}`);
      }
    } catch {
      setEmailMessage('❌ Sunucu ile bağlantı kurulamadı.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!emailData.newEmail.trim()) { setEmailMessage('❌ Yeni e-posta adresi giriniz.'); return; }
    if (!emailData.otp.trim()) { setEmailMessage('❌ Doğrulama kodunu giriniz.'); return; }
    setEmailLoading(true);
    setEmailMessage('');
    try {
      const resp = await fetch(`http://127.0.0.1:8000/api/users/${user.id}/update-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_email: emailData.newEmail, code: emailData.otp })
      });
      const data = await resp.json();
      if (resp.ok) {
        setUser({ ...user, email: data.new_email });
        setEmailMessage('✅ E-posta adresiniz güncellendi.');
        setEmailOtpSent(false);
        setEmailData({ newEmail: '', otp: '' });
      } else {
        setEmailMessage(`❌ ${data.detail || 'Güncelleme başarısız.'}`);
      }
    } catch {
      setEmailMessage('❌ Sunucu ile bağlantı kurulamadı.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleRequestPasswordOTP = async () => {
    setPasswordLoading(true);
    setPasswordMessage('');
    try {
      const resp = await fetch(`http://127.0.0.1:8000/api/users/${user.id}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      if (resp.ok) {
        setPasswordOtpSent(true);
        setPasswordMessage('✅ Güvenlik kodu e-postanıza gönderildi.');
      } else {
        const data = await resp.json();
        setPasswordMessage(`❌ ${data.detail || 'OTP gönderilemedi.'}`);
      }
    } catch {
      setPasswordMessage('❌ Sunucu ile bağlantı kurulamadı.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordData.newPassword.trim() || passwordData.newPassword.length < 6) {
      setPasswordMessage('❌ Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (!passwordData.otp.trim()) { setPasswordMessage('❌ Doğrulama kodunu giriniz.'); return; }
    setPasswordLoading(true);
    setPasswordMessage('');
    try {
      const resp = await fetch(`http://127.0.0.1:8000/api/users/${user.id}/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, code: passwordData.otp, new_password: passwordData.newPassword })
      });
      const data = await resp.json();
      if (resp.ok) {
        setPasswordMessage('✅ Şifreniz başarıyla güncellendi.');
        setPasswordOtpSent(false);
        setPasswordData({ newPassword: '', otp: '' });
      } else {
        setPasswordMessage(`❌ ${data.detail || 'Güncelleme başarısız.'}`);
      }
    } catch {
      setPasswordMessage('❌ Sunucu ile bağlantı kurulamadı.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const syncDisliked = async (newIds) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/users/${user.id}/disliked-ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient_ids: newIds })
      });
      setDislikedIngredients(newIds);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <Layout>
      {/* PREMIUM HEADER */}
      <header style={{ marginBottom: '3rem', animation: 'fadeInDown 0.6s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ background: 'rgba(217, 154, 43, 0.1)', color: 'var(--primary-color)', padding: '8px 16px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} fill="currentColor" />
            HESAP YÖNETİMİ
          </div>
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: '950', color: 'var(--text-primary)', letterSpacing: '-0.04em', marginBottom: '12px' }}>
          Profilini <br />Kişiselleştir
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: '1.6' }}>
          Hedeflerinize ulaşmanız için gerekli verileri güncelleyin ve tercihlerini yönetin.
        </p>
      </header>

      <div className="profile-layout-grid" style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: '3rem', alignItems: 'start' }}>

        {/* SIDEBAR NAVIGATION */}
        <aside style={{ display: 'grid', gap: '2rem', position: 'sticky', top: '2rem' }}>
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', borderRadius: '32px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 20px' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '35px', background: 'linear-gradient(135deg, var(--primary-color) 0%, #a29bfe 100%)', display: 'grid', placeItems: 'center', color: 'white', transform: 'rotate(-5deg)' }}>
                <User size={50} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '5px' }}>{user?.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>{user?.email}</p>
          </div>

          <nav style={{ display: 'grid', gap: '10px', background: 'var(--background-elevated)', padding: '10px', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
            {[
              { id: 'profile', label: 'Profil Bilgileri', icon: <Settings size={18} /> },
              { id: 'security', label: 'Hesap Güvenliği', icon: <Lock size={18} /> },
              { id: 'preferences', label: 'Sevilmeyen Malzemeler', icon: <Heart size={18} /> }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`profile-nav-btn ${activeTab === item.id ? 'active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderRadius: '18px', border: 'none', cursor: 'pointer', transition: 'all 0.3s', fontWeight: '800', fontSize: '1rem',
                  background: activeTab === item.id ? 'var(--primary-color)' : 'transparent',
                  color: activeTab === item.id ? 'white' : 'var(--text-secondary)',
                  boxShadow: activeTab === item.id ? '0 10px 20px rgba(217, 154, 43, 0.2)' : 'none'
                }}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="card" style={{ padding: '2.5rem', borderRadius: '36px', border: '1px solid var(--border-color)', animation: 'fadeIn 0.5s ease-out' }}>
          {activeTab === 'profile' ? (
            <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ padding: '10px', background: 'rgba(217, 154, 43, 0.1)', color: 'var(--primary-color)', borderRadius: '12px' }}>
                  <Fingerprint size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '900' }}>Kişisel Bilgiler</h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Günlük kalori ihtiyacını belirleyen temel bilgiler.</p>
                </div>
              </div>

              <div className="profile-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="input-group-premium">
                  <label>Ad Soyad</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="input-group-premium">
                  <label>Yaş</label>
                  <input type="number" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} required />
                </div>
                <div className="input-group-premium">
                  <label>Cinsiyet</label>
                  <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                    <option value="Erkek">Erkek</option>
                    <option value="Kadın">Kadın</option>
                  </select>
                </div>
                <div className="input-group-premium">
                  <label>Öğün Sayısı</label>
                  <input type="number" value={formData.meals} onChange={e => setFormData({ ...formData, meals: e.target.value })} required />
                </div>
              </div>

              <div className="profile-form-grid stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '2rem', background: 'var(--background-elevated)', borderRadius: '24px' }}>
                <div className="input-group-premium">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Ruler size={16} /> Boy (cm)</label>
                  <input type="number" value={formData.height ?? ''} onChange={e => setFormData({ ...formData, height: e.target.value })} required />
                </div>
                <div className="input-group-premium">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Scale size={16} /> Kilo (kg)</label>
                  <input type="number" value={formData.weight ?? ''} onChange={e => setFormData({ ...formData, weight: e.target.value })} required />
                </div>
              </div>

              <div className="profile-form-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                <div className="input-group-premium">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={16} /> Aktivite Seviyesi</label>
                  <select value={formData.activity} onChange={e => setFormData({ ...formData, activity: e.target.value })}>
                    <option value="Hareketsiz">Hareketsiz (Hiç egzersiz)</option>
                    <option value="Az Hareketli">Az Hareketli (1-2 gün)</option>
                    <option value="Orta Hareketli">Orta Hareketli (3-4 gün)</option>
                    <option value="Çok Hareketli">Çok Hareketli (5-6 gün)</option>
                  </select>
                </div>
                <div className="input-group-premium">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Target size={16} /> Ana Hedef</label>
                  <select value={formData.objective} onChange={e => setFormData({ ...formData, objective: e.target.value })}>
                    <option value="Kilo Vermek">Kilo Vermek</option>
                    <option value="Kilo Almak">Kilo Almak</option>
                    <option value="Kilo Koruma">Kilo Koruma</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="primary-btn" style={{ padding: '18px 40px', borderRadius: '18px', fontWeight: '900', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', width: 'fit-content', alignSelf: 'flex-end', boxShadow: '0 15px 25px rgba(217, 154, 43, 0.2)' }}>
                <Save size={20} /> Güncelleme Yap
              </button>
            </form>
          ) : activeTab === 'security' ? (
            <div style={{ display: 'grid', gap: '3rem' }}>
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2rem' }}>
                  <div style={{ padding: '10px', background: 'rgba(217, 154, 43, 0.1)', color: 'var(--primary-color)', borderRadius: '12px' }}>
                    <Mail size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '900' }}>E-posta Adresi</h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Hesap doğrulama ve bildirim tercihleri.</p>
                  </div>
                </div>

                <div className="input-group-premium" style={{ maxWidth: '500px' }}>
                  <label>Yeni E-posta</label>
                  <input
                    type="email"
                    placeholder="ornek@yeniemail.com"
                    value={emailData.newEmail}
                    onChange={e => setEmailData({ ...emailData, newEmail: e.target.value })}
                  />
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  {!emailOtpSent ? (
                    <button className="secondary-btn" onClick={handleRequestEmailOTP} disabled={emailLoading || !emailData.newEmail.trim()} style={{ padding: '12px 25px', borderRadius: '14px', fontWeight: '800', border: '1px solid var(--border-color)' }}>
                      <Bell size={18} /> {emailLoading ? 'Kod Gönderiliyor...' : 'Onay Kodu İste'}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input
                        type="text"
                        placeholder="..."
                        className="otp-input"
                        maxLength={6}
                        value={emailData.otp}
                        onChange={e => setEmailData({ ...emailData, otp: e.target.value })}
                        style={{ width: '120px', textAlign: 'center', fontWeight: '900', fontSize: '1.4rem', padding: '12px', borderRadius: '14px', border: '2px solid var(--primary-color)' }}
                      />
                      <button className="primary-btn" onClick={handleUpdateEmail} disabled={emailLoading} style={{ padding: '12px 25px', borderRadius: '14px' }}>
                        Adresi Onayla
                      </button>
                    </div>
                  )}
                </div>
                {emailMessage && <p className="auth-status-msg" style={{ marginTop: '1rem', fontWeight: '600', color: emailMessage.startsWith('✅') ? '#00b894' : '#ff7675' }}>{emailMessage}</p>}
              </section>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2rem' }}>
                  <div style={{ padding: '10px', background: 'rgba(217, 154, 43, 0.1)', color: 'var(--primary-color)', borderRadius: '12px' }}>
                    <Key size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '900' }}>Şifre Değiştir</h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Hesap güvenliğini artırmak için yeni şifre belirleyin.</p>
                  </div>
                </div>

                <div className="input-group-premium" style={{ maxWidth: '500px' }}>
                  <label>Yeni Şifre</label>
                  <input
                    type="password"
                    placeholder="Minimum 6 karakter"
                    value={passwordData.newPassword}
                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  {!passwordOtpSent ? (
                    <button className="secondary-btn" onClick={handleRequestPasswordOTP} disabled={passwordLoading || !passwordData.newPassword.trim()} style={{ padding: '12px 25px', borderRadius: '14px', fontWeight: '800', border: '1px solid var(--border-color)' }}>
                      Onay Kodu İste
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input
                        type="text"
                        className="otp-input"
                        placeholder="..."
                        maxLength={6}
                        value={passwordData.otp}
                        onChange={e => setPasswordData({ ...passwordData, otp: e.target.value })}
                        style={{ width: '120px', textAlign: 'center', fontWeight: '900', fontSize: '1.4rem', padding: '12px', borderRadius: '14px', border: '2px solid var(--primary-color)' }}
                      />
                      <button className="primary-btn" onClick={handleUpdatePassword} disabled={passwordLoading} style={{ padding: '12px 25px', borderRadius: '14px' }}>
                        Şifreyi Güncelle
                      </button>
                    </div>
                  )}
                </div>
                {passwordMessage && <p className="auth-status-msg" style={{ marginTop: '1rem', fontWeight: '600', color: passwordMessage.startsWith('✅') ? '#00b894' : '#ff7675' }}>{passwordMessage}</p>}
              </section>
            </div>
          ) : (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2.5rem' }}>
                <div style={{ padding: '10px', background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757', borderRadius: '12px' }}>
                  <Heart size={24} fill="currentColor" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '900' }}>Sevilmeyen Malzemeler </h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Sevmediğiniz malzemeleri belirleyerek önerileri filtreleyin.</p>
                </div>
              </div>

              <div className="disliked-picker-premium" style={{ background: 'var(--background-elevated)', padding: '2rem', borderRadius: '28px', border: '1px dashed var(--border-color)' }}>
                <IngredientPicker
                  userId={user?.id}
                  initialSelection={dislikedIngredients}
                  onSelectionChange={syncDisliked}
                />
              </div>
            </section>
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .input-group-premium { display: flex; flex-direction: column; gap: 8px; }
        .input-group-premium label { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); opacity: 0.8; }
        .input-group-premium input, .input-group-premium select {
            padding: 14px 18px; border-radius: 14px; border: 1px solid var(--border-color); background: var(--card-bg);
            color: var(--text-primary); font-weight: 600; font-size: 1rem; transition: all 0.3s; width: 100%;
        }
        .input-group-premium input:focus, .input-group-premium select:focus {
            border-color: var(--primary-color); outline: none; box-shadow: 0 0 0 4px rgba(217, 154, 43, 0.1);
        }
        .profile-nav-btn:hover:not(.active) { background: rgba(217, 154, 43, 0.05) !important; color: var(--primary-color) !important; }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      ` }} />
    </Layout>
  );
};

export default ProfileEdit;
