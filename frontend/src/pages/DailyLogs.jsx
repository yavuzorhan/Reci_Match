import React from 'react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import { Calendar, Clock, Utensils, Trash2 } from 'lucide-react';

const DailyLogs = () => {
  const { dailyLogs, removeDailyLog } = useApp();

  const removeLog = async (id) => {
    try {
      await removeDailyLog(id);
    } catch (err) {
      alert(err.message || 'Kayıt silinemedi.');
    }
  };

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Layout>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>Günlük Kayıtlarım</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Daha önce pişirdiğiniz tariflerin geçmişini buradan takip edebilirsiniz.</p>
      </div>

      <div className="card" style={{ padding: '0 2rem' }}>
        {dailyLogs.length > 0 ? (
          <div>
            {[...dailyLogs].sort((a, b) => new Date(b.eatenAt) - new Date(a.eatenAt)).map((log, index) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.5rem 0',
                  borderBottom: index === dailyLogs.length - 1 ? 'none' : '1px solid #F5F6FA',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      background: 'rgba(85, 239, 196, 0.1)',
                      color: 'var(--secondary-color)',
                      borderRadius: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Utensils size={28} />
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{log.name}</h3>
                    <div style={{ display: 'flex', gap: '15px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={14} /> {formatDate(log.eatenAt)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={14} /> {formatTime(log.eatenAt)}
                      </div>
                      <div style={{ padding: '2px 8px', background: '#F1F2F6', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                        {log.mealType}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => removeLog(log.id)}
                  style={{ color: '#FF4757', background: 'transparent', padding: '10px', borderRadius: '10px' }}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <Calendar size={64} color="#EEE" style={{ marginBottom: '20px' }} />
            <h3>Henüz bir kayıt bulunmuyor.</h3>
            <p>Tarif detay sayfasındaki "Bugün Bunu Pişirdim!" butonuna basarak ekleyebilirsiniz.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DailyLogs;
