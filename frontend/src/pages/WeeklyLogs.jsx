import React, { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import { 
  Clock, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Utensils, 
  Edit2,
  Check,
  X,
  Plus,
  Search,
  Coffee,
  Sun,
  Moon,
  Apple,
  Cake,
  Calendar,
  History
} from 'lucide-react';

const MealIcon = ({ type, size = 16, className = "" }) => {
  const t = type?.toLowerCase() || "";
  if (t.includes('kahvaltı')) return <Coffee size={size} className={className} />;
  if (t.includes('öğle')) return <Sun size={size} className={className} />;
  if (t.includes('akşam')) return <Moon size={size} className={className} />;
  if (t.includes('ara')) return <Apple size={size} className={className} />;
  if (t.includes('tatlı')) return <Cake size={size} className={className} />;
  return <Utensils size={size} className={className} />;
};

const WeeklyLogs = () => {
  const { dailyLogs, removeDailyLog, updateDailyLog, fetchAllRecipes, recipeCache, addDailyLog } = useApp();
  const [viewDate, setViewDate] = useState(new Date());
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetDateISO, setTargetDateISO] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const weekRange = useMemo(() => {
    const start = new Date(viewDate);
    const day = start.getDay();
    const diff = start.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(start.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  }, [viewDate]);

  const changeWeek = (offset) => {
    const next = new Date(viewDate);
    next.setDate(next.getDate() + offset * 7);
    setViewDate(next);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  };

  const removeLog = async (id) => {
    if (window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
      try {
        await removeDailyLog(id);
      } catch (err) {
        alert(err.message || 'Kayıt silinemedi.');
      }
    }
  };

  const startEdit = (log) => {
    setEditingId(log.id);
    setEditData({
      meal_type: log.mealType,
      serving_count: log.servingCount
    });
  };

  const saveEdit = async (id) => {
    try {
      await updateDailyLog(id, editData);
      setEditingId(null);
    } catch (err) {
      alert(err.message || 'Güncelleme başarısız.');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const all = await fetchAllRecipes();
      const filtered = all.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);
      setSearchResults(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const openAddModal = (dateISO) => {
    setTargetDateISO(dateISO);
    setShowAddModal(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddLog = async (recipeId) => {
    try {
      await addDailyLog({ 
        recipeId, 
        mealType: 'Akşam Yemeği',
        logDate: targetDateISO,
        entrySource: 'weekly'
      }); 
      setShowAddModal(false);
    } catch (err) {
      alert(err.message || 'Eklenemedi.');
    }
  };

  const days = [
    { name: 'Pazartesi', index: 1 },
    { name: 'Salı', index: 2 },
    { name: 'Çarşamba', index: 3 },
    { name: 'Perşembe', index: 4 },
    { name: 'Cuma', index: 5 },
    { name: 'Cumartesi', index: 6 },
    { name: 'Pazar', index: 0 },
  ];

  const groupedLogs = useMemo(() => {
    const grouped = {};
    (dailyLogs || []).forEach((log) => {
      const logDate = new Date(log.loggedAt || log.logDate || log.eatenAt);
      if (logDate >= weekRange.monday && logDate <= weekRange.sunday) {
        const dayIndex = logDate.getDay();
        if (!grouped[dayIndex]) grouped[dayIndex] = [];
        grouped[dayIndex].push({
          ...log,
          timestamp: logDate
        });
      }
    });

    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.timestamp - b.timestamp);
    });

    return grouped;
  }, [dailyLogs, weekRange]);

  const getDayTotalCalories = (dayIndex) => {
    const logs = groupedLogs[dayIndex] || [];
    return logs.reduce((acc, log) => {
      const calorie = log.calorieIntake || recipeCache[log.recipeId]?.calorie || 0;
      return acc + calorie;
    }, 0);
  };

  return (
    <Layout>
      <div className="weekly-logs-page">
        <header className="page-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '20px' }}>
          <div className="header-info">
            <div className="history-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '99px', background: 'rgba(217, 154, 43, 0.1)', color: 'var(--primary-color)', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <History size={16} />
              <span>Beslenme Geçmişi</span>
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, lineHeight: 1.1 }}>Haftalık Kayıtlar</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: '6px' }}>Beslenme düzeninizi buradan takip edebilir ve düzenleyebilirsiniz.</p>
          </div>

          <div className="week-nav-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--card-bg)', padding: '8px', borderRadius: '20px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
            <button onClick={() => changeWeek(-1)} className="nav-btn-circle"><ChevronLeft size={20} /></button>
            <div className="nav-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 15px', color: 'var(--text-primary)' }}>
                <strong>{formatDate(weekRange.monday)} - {formatDate(weekRange.sunday)}</strong>
            </div>
            <button onClick={() => changeWeek(1)} className="nav-btn-circle"><ChevronRight size={20} /></button>
          </div>
        </header>

        <main className="days-grid-vertical" style={{ display: 'grid', gap: '1.5rem' }}>
          {days.map((day) => {
            const logs = groupedLogs[day.index] || [];
            const totalCal = getDayTotalCalories(day.index);
            const dateObj = new Date(weekRange.monday.getTime() + (day.index === 0 ? 6 : day.index - 1) * 86400000);
            const dateISO = dateObj.toISOString().split('T')[0];

            return (
              <div key={day.name} className="day-card-compact" style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div className="day-card-content" style={{ padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.01)' }}>
                  <div className="day-info-section" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="day-index-box" style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-color)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '1.1rem', fontWeight: '800' }}>{day.name[0]}</div>
                    <div className="day-titles">
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{day.name}</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</span>
                    </div>
                  </div>
                  
                  <div className="day-actions-section" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    {totalCal > 0 && (
                      <div className="daily-calorie-summary" style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block' }}>TOPLAM</span>
                        <span style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--text-primary)' }}>{totalCal.toLocaleString()} <i style={{ fontStyle: 'normal', fontSize: '0.8rem', opacity: 0.5 }}>kcal</i></span>
                      </div>
                    )}
                    <button 
                      onClick={() => openAddModal(dateISO)}
                      className="add-inline-btn"
                      style={{ width: '38px', height: '38px', borderRadius: '10px', border: '2px dashed var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className="day-logs-list" style={{ padding: '1rem 1.5rem' }}>
                  {logs.length > 0 ? (
                    logs.map((log) => {
                      const recipe = recipeCache[log.recipeId];
                      const calories = log.calorieIntake || recipe?.calorie || 0;
                      const isEditing = editingId === log.id;

                      return (
                        <div key={log.id} className={`log-row ${isEditing ? 'is-editing' : ''}`} style={{ display: 'flex', background: 'var(--background-elevated)', borderRadius: '14px', marginBottom: '8px', border: '1px solid transparent' }}>
                          <div className="log-row-main" style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0.75rem 1.25rem', gap: '1rem' }}>
                            <div className="log-type-icon" style={{ color: 'var(--primary-color)', opacity: 0.8 }}>
                              <MealIcon type={log.mealType} size={18} />
                            </div>

                            <div className="log-details-main" style={{ flex: 1 }}>
                              <div className="log-primary-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontWeight: '700', fontSize: '1rem' }}>{log.name || recipe?.name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={12} /> {log.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              
                              {isEditing ? (
                                <div className="edit-form-compact" style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                                  <select 
                                    value={editData.meal_type} 
                                    onChange={(e) => setEditData({...editData, meal_type: e.target.value})}
                                    className="edit-field"
                                    style={{ padding: '3px 6px', borderRadius: '6px', fontSize: '0.75rem' }}
                                  >
                                    <option>Kahvaltı</option>
                                    <option>Öğle Yemeği</option>
                                    <option>Akşam Yemeği</option>
                                    <option>Ara Öğün</option>
                                    <option>Tatlı</option>
                                  </select>
                                  <input 
                                    type="number" 
                                    value={editData.serving_count} 
                                    onChange={(e) => setEditData({...editData, serving_count: Number(e.target.value)})}
                                    className="edit-field"
                                    style={{ width: '45px', padding: '3px 6px', borderRadius: '6px', fontSize: '0.75rem' }}
                                  />
                                </div>
                              ) : (
                                <div className="log-metadata-tags" style={{ display: 'flex', gap: '6px' }}>
                                  <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary-color)' }}>{log.mealType}</span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>• {log.servingCount} Porsiyon</span>
                                </div>
                              )}

                              <div className="log-macros-inline" style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', opacity: 0.8 }}>
                                  <span>P: {Math.round(log.protein || 0)}g</span>
                                  <span>K: {Math.round(log.carbohydrate || 0)}g</span>
                                  <span>Y: {Math.round(log.fat || 0)}g</span>
                              </div>
                            </div>

                            <div className="log-energy-badge" style={{ textAlign: 'right', fontWeight: '800', color: 'var(--primary-color)' }}>
                              +{Math.round(calories)} <small style={{ fontSize: '0.6rem', opacity: 0.6 }}>kcal</small>
                            </div>
                          </div>

                          <div className="log-row-actions" style={{ display: 'flex', borderLeft: '1px solid var(--border-color)' }}>
                            {isEditing ? (
                              <>
                                <button onClick={() => saveEdit(log.id)} className="btn-action success" style={{ color: '#10b981' }}><Check size={16} /></button>
                                <button onClick={() => setEditingId(null)} className="btn-action cancel" style={{ color: '#ef4444' }}><X size={16} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(log)} className="btn-action edit" style={{ color: 'var(--primary-color)' }}><Edit2 size={16} /></button>
                                <button onClick={() => removeLog(log.id)} className="btn-action remove" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Henüz kayıt yok.</div>
                  )}
                </div>
              </div>
            );
          })}
        </main>
      </div>

      {showAddModal && (
        <div className="simple-modal-overlay">
          <div className="simple-modal-content">
            <div className="modal-top">
              <h3>Öğün Ekle</h3>
              <button onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-inner">
              <div className="modal-search-wrapper">
                <Search size={18} className="search-symbol" />
                <input 
                  type="text" 
                  placeholder="Yemek ara..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch}>Ara</button>
              </div>

              <div className="search-results-box">
                {searching ? <p style={{ textAlign: 'center' }}>Aranıyor...</p> : (
                  searchResults.map(result => (
                    <div key={result.id} className="search-item-card">
                      <div className="item-details">
                        <span className="item-name">{result.name}</span>
                        <span className="item-cal">{result.calorie} kcal</span>
                      </div>
                      <button className="item-add-btn" onClick={() => handleAddLog(result.id)}>Ekle</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .nav-btn-circle { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border-color); background: var(--background-elevated); color: var(--text-primary); cursor: pointer; display: grid; place-items: center; }
        .nav-btn-circle:hover { background: var(--primary-color); color: white; }
        .btn-action { width: 40px; border: none; background: transparent; cursor: pointer; display: grid; place-items: center; transition: all 0.2s; }
        .btn-action:hover { background: var(--background-color); }
        .edit-field { background: var(--background-color); color: var(--text-primary); border: 1px solid var(--border-color); outline: none; }
        
        .simple-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 2000; display: grid; place-items: center; padding: 20px; }
        .simple-modal-content { background: var(--card-bg); border-radius: 24px; min-width: 320px; width: 100%; max-width: 450px; overflow: hidden; border: 1px solid var(--border-color); }
        .modal-top { padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); }
        .modal-top h3 { margin: 0; font-size: 1.1rem; }
        .modal-top button { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; }
        .modal-inner { padding: 1.5rem; }
        .modal-search-wrapper { display: flex; gap: 8px; position: relative; margin-bottom: 1rem; }
        .modal-search-wrapper input { flex: 1; padding: 10px 10px 10px 35px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--background-color); color: var(--text-primary); outline: none; }
        .search-symbol { position: absolute; left: 10px; top: 12px; color: var(--text-secondary); }
        .modal-search-wrapper button { padding: 0 15px; border-radius: 10px; border: none; background: var(--primary-color); color: white; fontWeight: 700; cursor: pointer; }
        .search-results-box { max-height: 250px; overflow-y: auto; }
        .search-item-card { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-radius: 12px; background: var(--background-color); margin-bottom: 6px; }
        .item-details { display: flex; flexDirection: column; }
        .item-name { font-weight: 700; font-size: 0.9rem; }
        .item-cal { font-size: 0.75rem; color: var(--text-secondary); }
        .item-add-btn { background: #10b981; color: white; padding: 5px 12px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; }
      `}} />
    </Layout>
  );
};

export default WeeklyLogs;
