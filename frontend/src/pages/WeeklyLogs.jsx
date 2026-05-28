import React, { useCallback, useState, useMemo } from 'react';
import './WeeklyLogs.css';
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

const toLocalDateISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

  const todayStr = toLocalDateISO(new Date());

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
            <button className="noct-add-meal-btn" onClick={() => openAddModal(toLocalDateISO(new Date()))}>
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
              const dateISO = toLocalDateISO(dateObj);
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

    </Layout>
  );
};

export default WeeklyLogs;
