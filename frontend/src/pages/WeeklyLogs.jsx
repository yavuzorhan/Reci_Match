import React, { useCallback, useState, useMemo } from 'react';
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
  History,
  Flame,
  LineChart,
  CheckCircle2
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

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getLogMultiplier = (log) => {
  const multiplier = toNumber(log?.servingMultiplier ?? log?.serving_multiplier);
  return multiplier > 0 ? multiplier : 1;
};

const getLogMacroValue = (log, recipe, logKey, recipeKey) => {
  const logValue = log?.[logKey];
  if (logValue !== null && logValue !== undefined && logValue !== '') {
    return toNumber(logValue);
  }

  return toNumber(recipe?.[recipeKey]) * getLogMultiplier(log);
};

const getLogNutrition = (log, recipe) => ({
  calories: getLogMacroValue(log, recipe, 'calorieIntake', 'calorie'),
  protein: getLogMacroValue(log, recipe, 'protein', 'protein'),
  carb: getLogMacroValue(log, recipe, 'carbohydrate', 'carbohydrate'),
  fat: getLogMacroValue(log, recipe, 'fat', 'fat'),
});

const days = [
  { name: 'Pzt', fullName: 'Pazartesi', index: 1 },
  { name: 'Sal', fullName: 'Salı', index: 2 },
  { name: 'Çar', fullName: 'Çarşamba', index: 3 },
  { name: 'Per', fullName: 'Perşembe', index: 4 },
  { name: 'Cum', fullName: 'Cuma', index: 5 },
  { name: 'Cmt', fullName: 'Cumartesi', index: 6 },
  { name: 'Paz', fullName: 'Pazar', index: 0 },
];

const WeeklyLogs = () => {
  const { dailyLogs, removeDailyLog, fetchAllRecipes, recipeCache, addDailyLog, profile } = useApp();
  const activeDayIndex = new Date().getDay();
  const [viewDate, setViewDate] = useState(new Date());
  const [editingId, setEditingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetDateISO, setTargetDateISO] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(activeDayIndex);

  const calorieTarget = toNumber(profile?.daily_calorie) || 2000;
  const macroTargets = useMemo(() => ({
    protein: Math.round((calorieTarget * 0.25) / 4),
    carb: Math.round((calorieTarget * 0.45) / 4),
    fat: Math.round((calorieTarget * 0.30) / 9),
  }), [calorieTarget]);

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

  const getDayTotals = useCallback((dayIndex) => {
    const logs = groupedLogs[dayIndex] || [];
    return logs.reduce((acc, log) => {
      const recipe = recipeCache[log.recipeId];
      const nutrition = getLogNutrition(log, recipe);
      return {
        calories: acc.calories + nutrition.calories,
        protein: acc.protein + nutrition.protein,
        carb: acc.carb + nutrition.carb,
        fat: acc.fat + nutrition.fat
      };
    }, { calories: 0, protein: 0, carb: 0, fat: 0 });
  }, [groupedLogs, recipeCache]);

  const selectedDayTotals = useMemo(
    () => getDayTotals(selectedDayIndex),
    [getDayTotals, selectedDayIndex]
  );

  const weekStats = useMemo(() => {
    let total = 0;
    let daysWithLogs = 0;
    let goalMetCount = 0;

    days.forEach(d => {
      const dayTotal = getDayTotals(d.index).calories;
      if (dayTotal > 0) {
        total += dayTotal;
        daysWithLogs++;
        if (dayTotal <= calorieTarget + 100 && dayTotal >= calorieTarget - 200) {
          goalMetCount++;
        }
      }
    });

    return {
      total: Math.round(total),
      average: daysWithLogs > 0 ? Math.round(total / daysWithLogs) : 0,
      goalPercentage: daysWithLogs > 0 ? Math.round((goalMetCount / daysWithLogs) * 100) : 0
    };
  }, [getDayTotals, calorieTarget]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Layout>
      <div className="noct-weekly-logs">
        {/* Header Section */}
        <header className="noct-header">
          <div className="noct-header-left">
            <div className="noct-badge">
              <span className="noct-badge-dot"></span>
              BU HAFTA
            </div>
            <h1 className="noct-title">Haftalık Kayıt</h1>
            <p className="noct-subtitle">Günlük öğünlerinizi, kalori hedefinizi ve haftalık beslenme ilerlemenizi takip edin.</p>
          </div>

          <div className="noct-header-right">
            <div className="noct-week-picker">
              <button onClick={() => changeWeek(-1)} className="noct-picker-btn"><ChevronLeft size={18} /></button>
              <span className="noct-picker-label">{formatDate(weekRange.monday)} - {formatDate(weekRange.sunday)}</span>
              <button onClick={() => changeWeek(1)} className="noct-picker-btn"><ChevronRight size={18} /></button>
            </div>
            <button className="noct-add-meal-btn" onClick={() => openAddModal(new Date().toISOString().split('T')[0])}>
              <Plus size={20} />
              Öğün Ekle
            </button>
          </div>
        </header>

        {/* Weekly Summary Row */}
        <div className="noct-summary-row glass-panel">
          <div className="noct-summary-item">
            <div className="noct-summary-label">
              <Flame size={14} />
              <span>Haftalık Toplam Kalori</span>
            </div>
            <div className="noct-summary-value">{weekStats.total.toLocaleString()} <i>kcal</i></div>
          </div>
          <div className="noct-summary-divider"></div>
          <div className="noct-summary-item">
            <div className="noct-summary-label">
              <LineChart size={14} />
              <span>Günlük Ortalama</span>
            </div>
            <div className="noct-summary-value">{weekStats.average.toLocaleString()} <i>kcal</i></div>
          </div>
          <div className="noct-summary-divider"></div>
          <div className="noct-summary-item">
            <div className="noct-summary-label">
              <CheckCircle2 size={14} />
              <span>Hedefe Uyum</span>
            </div>
            <div className="noct-summary-value noct-text-primary">%{weekStats.goalPercentage}</div>
          </div>
        </div>

        {/* Daily Progress Grid */}
        <div className="noct-progress-card glass-panel">
          <h2 className="noct-card-title">Günlük İlerleme</h2>
          <div className="noct-progress-grid">
            {days.map((day) => {
              const totals = getDayTotals(day.index);
              const dateObj = new Date(weekRange.monday.getTime() + (day.index === 0 ? 6 : day.index - 1) * 86400000);
              const dateISO = dateObj.toISOString().split('T')[0];
              const isToday = todayStr === dateISO;
              const percent = Math.min(100, (totals.calories / calorieTarget) * 100);
              const isOver = totals.calories > calorieTarget + 50;
              const isEmpty = totals.calories === 0;

              return (
                <div
                  key={day.name}
                  className={`noct-day-pill ${isToday ? 'is-today' : ''} ${isEmpty ? 'is-empty' : ''} ${selectedDayIndex === day.index ? 'is-selected' : ''}`}
                  onClick={() => setSelectedDayIndex(day.index)}
                  style={{ cursor: 'pointer' }}
                >
                  {isToday && <div className="noct-today-indicator"></div>}
                  <div className="noct-day-name">{day.name.toUpperCase()}</div>
                  <div className="noct-day-cal">
                    <strong>{totals.calories > 0 ? Math.round(totals.calories) : '-'}</strong>
                    <span>/ {Math.round(calorieTarget)}</span>
                  </div>
                  <div className="noct-progress-bar-bg">
                    <div 
                      className={`noct-progress-bar-fill ${isOver ? 'is-over' : ''}`} 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <div className="noct-day-status">
                    {isEmpty ? '-' : (isOver ? <span className="noct-status-over">{Math.round(totals.calories - calorieTarget)} aşıldı</span> : <span className="noct-status-ok">{Math.round(calorieTarget - totals.calories)} kaldı</span>)}
                    {!isEmpty && (
                      <span className={`noct-status-badge ${isOver ? 'is-over' : 'is-ok'}`}>
                        {isOver ? 'Aştı' : 'Hedefte'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Meals Section */}
        <div className="noct-meals-card glass-panel">
          <div className="noct-meals-header">
            <div className="noct-meals-title-group">
              <h2 className="noct-card-title">
                {selectedDayIndex === activeDayIndex ? 'Bugünkü Öğünler' : 'Seçili Günün Öğünleri'}
              </h2>
              <p className="noct-card-subtitle">
                {(() => {
                  const mondayTime = weekRange.monday.getTime();
                  const offset = selectedDayIndex === 0 ? 6 : selectedDayIndex - 1;
                  const selectedDate = new Date(mondayTime + offset * 86400000);
                  return selectedDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
                })()}
              </p>
            </div>

            <div className="noct-macros-mini">
              {['Protein', 'Karb.', 'Yağ'].map((macro, i) => {
                const consumed = [selectedDayTotals.protein, selectedDayTotals.carb, selectedDayTotals.fat][i];
                const target = [macroTargets.protein, macroTargets.carb, macroTargets.fat][i];
                const p = Math.min(100, (consumed / target) * 100);
                const colors = ['#3cddc7', '#4edea3', '#ffb3af'];
                return (
                  <div key={macro} className="noct-macro-pill">
                    <div className="noct-macro-info">
                      <span>{macro}</span>
                      <small>{Math.round(consumed)}/{target}g</small>
                    </div>
                    <div className="noct-macro-bar">
                      <div className="noct-macro-fill" style={{ width: `${p}%`, backgroundColor: colors[i] }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="noct-calories-summary">
              <div className="noct-cal-main">{Math.round(selectedDayTotals.calories)} <span>/ {Math.round(calorieTarget)} kcal</span></div>
              <div className="noct-cal-remain">{Math.round(calorieTarget - selectedDayTotals.calories)} kcal kaldı</div>
            </div>
          </div>

          <div className="noct-meals-list">
            {(groupedLogs[selectedDayIndex] || []).length > 0 ? (
              groupedLogs[selectedDayIndex].map((log) => {
                const recipe = recipeCache[log.recipeId];
                const nutrition = getLogNutrition(log, recipe);
                const isEditing = editingId === log.id;

                return (
                  <div key={log.id} className={`noct-meal-item ${isEditing ? 'is-editing' : ''}`}>
                    <div className="noct-meal-left">
                      <div className="noct-meal-icon">
                        <MealIcon type={log.mealType} size={20} />
                      </div>
                      <div className="noct-meal-info">
                        <div className="noct-meal-top-row">
                          <h4 className="noct-meal-name">{log.mealType}</h4>
                          <span className="noct-meal-time">{log.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="noct-meal-desc">{log.name || recipe?.name}</p>
                      </div>
                    </div>

                    <div className="noct-meal-right">
                      <div className="noct-meal-macros">
                        <span title="Protein"><i>P:</i> {Math.round(nutrition.protein)}g</span>
                        <span title="Karbonhidrat"><i>C:</i> {Math.round(nutrition.carb)}g</span>
                        <span title="Yağ"><i>F:</i> {Math.round(nutrition.fat)}g</span>
                      </div>
                      <div className="noct-meal-energy">
                        {Math.round(nutrition.calories)} <span>kcal</span>
                      </div>
                      <div className="noct-meal-actions">
                        <button onClick={() => startEdit(log)} className="noct-action-btn"><Edit2 size={16} /></button>
                        <button onClick={() => removeLog(log.id)} className="noct-action-btn remove"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="noct-empty-state">Bugün için henüz bir öğün kaydı bulunmuyor.</div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="noct-modal-overlay">
          <div className="noct-modal-content glass-panel">
            <div className="noct-modal-header">
              <h3>Öğün Ekle</h3>
              <button onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <div className="noct-modal-body">
              <div className="noct-search-box">
                <Search size={18} className="noct-search-icon" />
                <input 
                  type="text" 
                  placeholder="Yemek ara..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch}>Ara</button>
              </div>

              <div className="noct-search-results">
                {searching ? <div className="noct-search-loading">Aranıyor...</div> : (
                  searchResults.map(result => (
                    <div key={result.id} className="noct-result-item">
                      <div className="noct-result-info">
                        <span className="noct-result-name">{result.name}</span>
                        <span className="noct-result-cal">{result.calorie} kcal</span>
                      </div>
                      <button className="noct-result-add" onClick={() => handleAddLog(result.id)}>Ekle</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .layout-content:has(.noct-weekly-logs) {
          background-color: #0c0814 !important;
          background-image:
            radial-gradient(circle at 10% 20%, rgba(100, 31, 224, 0.12) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(68, 226, 205, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(147, 0, 10, 0.03) 0%, transparent 60%) !important;
          color: #d4e4fa;
          padding: 0;
        }

        .noct-weekly-logs {
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 32px 32px 60px;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .glass-panel {
          background-color: rgba(28, 43, 60, 0.10);
          backdrop-filter: blur(48px);
          -webkit-backdrop-filter: blur(48px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          border-radius: 24px;
        }

        .noct-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 8px;
        }

        .noct-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 8px;
          color: #10b981;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }

        .noct-badge-dot {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10b981;
        }

        .noct-title {
          font-size: 40px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #d4e4fa;
          margin: 0;
        }

        .noct-subtitle {
          color: #bbcabf;
          font-size: 16px;
          margin-top: 8px;
          max-width: 600px;
        }

        .noct-header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .noct-week-picker {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 4px;
          border-radius: 12px;
        }

        .noct-picker-btn {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          background: transparent;
          border: none;
          color: #bbcabf;
          cursor: pointer;
          border-radius: 8px;
          transition: 0.2s;
        }

        .noct-picker-btn:hover {
          background: rgba(255,255,255,0.05);
          color: #d4e4fa;
        }

        .noct-picker-label {
          padding: 0 16px;
          font-size: 14px;
          font-weight: 600;
          color: #d4e4fa;
        }

        .noct-add-meal-btn {
          background: #10b981;
          color: #003824;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: 0.2s;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
        }

        .noct-add-meal-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
        }

        .noct-summary-row {
          display: flex;
          padding: 24px;
          justify-content: space-around;
        }

        .noct-summary-item {
          text-align: center;
          flex: 1;
        }

        .noct-summary-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #bbcabf;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .noct-summary-value {
          font-size: 28px;
          font-weight: 700;
          color: #d4e4fa;
        }

        .noct-summary-value i {
          font-style: normal;
          font-size: 14px;
          font-weight: 400;
          color: #bbcabf;
        }

        .noct-summary-divider {
          width: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 8px 0;
        }

        .noct-progress-card {
          padding: 24px;
        }

        .noct-card-title {
          font-size: 24px;
          font-weight: 600;
          color: #d4e4fa;
          margin: 0 0 20px 0;
        }

        .noct-progress-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
          overflow-x: auto;
        }

        .noct-day-pill {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 16px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: 0.2s;
          position: relative;
        }

        .noct-day-pill:hover {
          background: rgba(255, 255, 255, 0.06);
          cursor: pointer;
        }

        .noct-day-pill.is-selected {
          background: rgba(68, 226, 205, 0.08);
          border-color: rgba(68, 226, 205, 0.35);
          box-shadow: 0 0 0 2px rgba(68, 226, 205, 0.15);
        }

        .noct-day-pill.is-today {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .noct-today-indicator {
          position: absolute;
          top: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 8px #10b981;
        }

        .noct-day-name {
          font-size: 12px;
          font-weight: 800;
          color: #bbcabf;
          letter-spacing: 0.05em;
        }

        .noct-day-cal {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .noct-day-cal strong {
          font-size: 18px;
          color: #d4e4fa;
        }

        .noct-day-cal span {
          font-size: 12px;
          color: #86948a;
        }

        .noct-progress-bar-bg {
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          overflow: hidden;
        }

        .noct-progress-bar-fill {
          height: 100%;
          background: #10b981;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
        }

        .noct-progress-bar-fill.is-over {
          background: #ffb3af;
          box-shadow: 0 0 10px rgba(255, 179, 175, 0.4);
        }

        .noct-day-status {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .noct-status-ok { color: #bbcabf; font-size: 11px; }
        .noct-status-over { color: #ffb3af; font-size: 11px; }

        .noct-status-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          width: fit-content;
        }

        .noct-status-badge.is-ok { background: rgba(16, 185, 129, 0.15); color: #10b981; }
        .noct-status-badge.is-over { background: rgba(255, 179, 175, 0.15); color: #ffb3af; }

        .noct-meals-card {
          padding: 24px;
        }

        .noct-meals-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 24px;
        }

        .noct-card-subtitle {
          color: #bbcabf;
          font-size: 14px;
          margin-top: 4px;
        }

        .noct-macros-mini {
          display: flex;
          gap: 20px;
        }

        .noct-macro-pill {
          width: 100px;
        }

        .noct-macro-info {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin-bottom: 4px;
        }

        .noct-macro-info span { color: #d4e4fa; }
        .noct-macro-info small { color: #bbcabf; }

        .noct-macro-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          overflow: hidden;
        }

        .noct-macro-fill {
          height: 100%;
          border-radius: 10px;
        }

        .noct-calories-summary {
          text-align: right;
        }

        .noct-cal-main {
          font-size: 24px;
          font-weight: 700;
          color: #10b981;
        }

        .noct-cal-main span {
          font-size: 14px;
          color: #bbcabf;
          font-weight: 400;
        }

        .noct-cal-remain {
          font-size: 12px;
          color: #bbcabf;
        }

        .noct-meals-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .noct-meal-item {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 16px 20px;
          border-radius: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: 0.2s;
        }

        .noct-meal-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .noct-meal-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .noct-meal-icon {
          width: 44px;
          height: 44px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: #10b981;
        }

        .noct-meal-top-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .noct-meal-name {
          font-size: 16px;
          font-weight: 600;
          color: #d4e4fa;
          margin: 0;
        }

        .noct-meal-time {
          font-size: 11px;
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 6px;
          border-radius: 4px;
          color: #bbcabf;
        }

        .noct-meal-desc {
          font-size: 14px;
          color: #bbcabf;
          margin: 4px 0 0 0;
        }

        .noct-meal-right {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .noct-meal-macros {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #bbcabf;
        }

        .noct-meal-macros i {
          font-style: normal;
          color: #10b981;
          margin-right: 2px;
        }

        .noct-meal-energy {
          font-size: 18px;
          font-weight: 700;
          color: #d4e4fa;
          width: 80px;
          text-align: right;
        }

        .noct-meal-energy span {
          font-size: 11px;
          color: #bbcabf;
          font-weight: 400;
        }

        .noct-meal-actions {
          display: flex;
          gap: 4px;
        }

        .noct-action-btn {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          background: transparent;
          border: none;
          color: #86948a;
          cursor: pointer;
          border-radius: 8px;
          transition: 0.2s;
        }

        .noct-action-btn:hover {
          background: rgba(255,255,255,0.05);
          color: #d4e4fa;
        }

        .noct-action-btn.remove:hover {
          color: #ffb3af;
        }

        .noct-empty-state {
          padding: 40px;
          text-align: center;
          color: #bbcabf;
          background: rgba(0,0,0,0.1);
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
        }

        /* Modal Styles */
        .noct-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(5, 1, 16, 0.8);
          backdrop-filter: blur(12px);
          z-index: 2000;
          display: grid;
          place-items: center;
          padding: 24px;
        }

        .noct-modal-content {
          width: 100%;
          max-width: 500px;
          overflow: hidden;
        }

        .noct-modal-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .noct-modal-header h3 {
          margin: 0;
          font-size: 20px;
          color: #d4e4fa;
        }

        .noct-modal-header button {
          background: transparent;
          border: none;
          color: #bbcabf;
          cursor: pointer;
        }

        .noct-modal-body {
          padding: 24px;
        }

        .noct-search-box {
          display: flex;
          gap: 12px;
          position: relative;
          margin-bottom: 24px;
        }

        .noct-search-icon {
          position: absolute;
          left: 16px;
          top: 14px;
          color: #86948a;
        }

        .noct-search-box input {
          flex: 1;
          padding: 12px 16px 12px 48px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #d4e4fa;
          outline: none;
        }

        .noct-search-box button {
          background: #10b981;
          color: #003824;
          border: none;
          padding: 0 20px;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .noct-result-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
          margin-bottom: 8px;
        }

        .noct-result-info {
          display: flex;
          flex-direction: column;
        }

        .noct-result-name {
          font-weight: 600;
          color: #d4e4fa;
        }

        .noct-result-cal {
          font-size: 12px;
          color: #bbcabf;
        }

        .noct-result-add {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 6px 16px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        .noct-result-add:hover {
          background: #10b981;
          color: #003824;
        }

        .noct-text-primary {
          color: #10b981;
        }

        @media (max-width: 1024px) {
          .noct-progress-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 768px) {
          .noct-progress-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .noct-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }
          .noct-header-right {
            width: 100%;
            justify-content: space-between;
          }
          .noct-summary-row {
            flex-direction: column;
            gap: 24px;
          }
          .noct-summary-divider {
            width: 100%;
            height: 1px;
          }
          .noct-meals-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }
          .noct-macros-mini {
            width: 100%;
            justify-content: space-between;
          }
          .noct-meal-right {
            flex-direction: column;
            align-items: flex-end;
            gap: 12px;
          }
        }
      `}} />
    </Layout>
  );
};

export default WeeklyLogs;
