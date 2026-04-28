import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock3,
  Heart,
  Leaf,
  Moon,
  Navigation,
  Search,
  Sparkles,
  Sun,
  Timer,
  Utensils,
} from 'lucide-react';

import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';

const clamp = (value, min = 0, max = 100) => Math.min(Math.max(value, min), max);
const toNumber = (value) => Math.max(0, Number(value) || 0);

const getLogDate = (log) => {
  const rawDate = log?.loggedAt || log?.logDate || log?.eatenAt || log?.createdAt;
  const date = rawDate ? new Date(rawDate) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const formatMealTime = (log) => (
  getLogDate(log).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
);

const isTodayLog = (log) => {
  if ((log?.entrySource || 'daily') === 'weekly') return false;
  return getLogDate(log).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
};

const getMealSlot = (log) => {
  const hour = getLogDate(log).getHours();

  if (hour >= 5 && hour < 12) {
    return { name: 'Kahvaltı', className: 'breakfast', icon: <Clock3 size={18} /> };
  }

  if (hour >= 12 && hour < 17) {
    return { name: 'Öğle yemeği', className: 'lunch', icon: <Navigation size={18} /> };
  }

  return { name: 'Akşam yemeği', className: 'dinner', icon: <Utensils size={18} /> };
};

const Dashboard = () => {
  const {
    dashboardData,
    user,
    selectedIngredients,
    dailyLogs,
    recipeCache,
    isDarkMode,
    toggleDarkMode,
  } = useApp();
  const navigate = useNavigate();

  const calorieTarget = toNumber(user?.daily_calorie || dashboardData.dailyCalorieTarget || 2000);
  const consumedCalories = toNumber(dashboardData.consumedCalories);
  const caloriePercent = calorieTarget ? clamp((consumedCalories / calorieTarget) * 100) : 0;
  const caloriesLeft = Math.max(0, calorieTarget - consumedCalories);
  const circleRadius = 66;
  const circleLength = 2 * Math.PI * circleRadius;
  const circleOffset = circleLength - (circleLength * caloriePercent) / 100;
  const goalMessage = caloriePercent < 70
    ? 'Gün içinde rahat bir alanın var.'
    : caloriePercent <= 100
      ? 'Hedefine sakin sakin yaklaşıyorsun.'
      : 'Bugün hedefin biraz aşıldı.';

  const macros = useMemo(() => {
    const protein = toNumber(dashboardData.macros?.protein);
    const carb = toNumber(dashboardData.macros?.carb);
    const fat = toNumber(dashboardData.macros?.fat);

    return [
      {
        label: 'Protein',
        current: protein,
        target: toNumber(dashboardData.macroTargets?.protein),
        color: '#85B7EB',
      },
      {
        label: 'Karbonhidrat',
        current: carb,
        target: toNumber(dashboardData.macroTargets?.carb),
        color: '#ED93B1',
      },
      {
        label: 'Yağ',
        current: fat,
        target: toNumber(dashboardData.macroTargets?.fat),
        color: '#EF9F27',
      },
    ].map((macro) => ({
      ...macro,
      percent: macro.target ? clamp((macro.current / macro.target) * 100) : 0,
    }));
  }, [dashboardData]);

  const todayLogs = useMemo(() => {
    return (dailyLogs || [])
      .filter(isTodayLog)
      .sort((a, b) => getLogDate(a) - getLogDate(b));
  }, [dailyLogs]);

  return (
    <Layout>
      <div className="dashboard-home">
        <header className="dashboard-home-header">
          <div>
            <h1>Merhaba, {user?.name?.split(' ')[0] || 'Gurme'}</h1>
            <p>Malzemelerini seç, gününü sakin bir akışla takip et.</p>
          </div>

          <button
            type="button"
            className="dashboard-theme-button"
            onClick={toggleDarkMode}
            aria-label="Temayı değiştir"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <section className="dashboard-hero-grid">
          <button
            type="button"
            className="dashboard-recipe-hero"
            onClick={() => navigate('/select-ingredients')}
          >
            <span className="recipe-card-badge">
              <Sparkles size={14} />
              TARİF AL
            </span>
            <h2>Tarif almak için buraya dokun.</h2>
            <p>Malzeme seçimine geç, elindekileri işaretle ve tarifleri uyumluluk skoruna göre listele.</p>
            <span className="recipe-card-action">
              <Search size={18} />
              Malzeme Seçimine Git
            </span>
            <small>Şu an seçili malzeme: {selectedIngredients.length}</small>
          </button>

          <article className="card dashboard-status-card">
            <div className="status-ring-row">
              <div className="calorie-ring-wrap">
                <svg viewBox="0 0 180 180" className="calorie-ring" aria-label="Kalori takip halkası">
                  <circle className="ring-track" cx="90" cy="90" r={circleRadius} />
                  <defs>
                    <linearGradient id="calorieRingGradient" x1="28" y1="28" x2="152" y2="152" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#6ea8ff" />
                      <stop offset="48%" stopColor="#7f74ff" />
                      <stop offset="100%" stopColor="#9a6cff" />
                    </linearGradient>
                  </defs>
                  <circle
                    className="ring-progress"
                    cx="90"
                    cy="90"
                    r={circleRadius}
                    strokeDasharray={circleLength}
                    strokeDashoffset={circleOffset}
                  />
                </svg>
                <div className="calorie-ring-center">
                  <strong>{Math.round(consumedCalories).toLocaleString('tr-TR')}</strong>
                  <span>kcal alındı</span>
                  <em>%{Math.round(caloriePercent)}</em>
                </div>
              </div>

              <div className="daily-goal">
                <span>Günlük hedef</span>
                <strong>{Math.round(caloriesLeft).toLocaleString('tr-TR')} kcal kaldı</strong>
                <p>{goalMessage}</p>
              </div>
            </div>

            <div className="macro-mini">
              <div className="macro-mini-title">Makro besinler</div>
              {macros.map((macro) => (
                <div className="macro-mini-row" key={macro.label}>
                  <div className="macro-mini-head">
                    <span>
                      <i style={{ backgroundColor: macro.color }} />
                      {macro.label}
                    </span>
                    <strong>{Math.round(macro.current)}/{Math.round(macro.target)}g</strong>
                  </div>
                  <div className="macro-mini-track">
                    <span style={{ width: `${macro.percent}%`, backgroundColor: macro.color }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="dashboard-quick-grid">
          <button className="card dashboard-quick-card" type="button" onClick={() => navigate('/healthy-menu')}>
            <span className="quick-icon healthy">
              <Leaf size={19} />
            </span>
            <span>
              <strong>Sağlıklı Tarifler</strong>
              <small>Sağlıklı tarif akışına geç.</small>
            </span>
          </button>

          <button className="card dashboard-quick-card" type="button" onClick={() => navigate('/favorites')}>
            <span className="quick-icon favorite">
              <Heart size={19} fill="currentColor" />
            </span>
            <span>
              <strong>Favoriler</strong>
              <small>Kaydettiğin tariflere hızlı dönüş.</small>
            </span>
          </button>
        </section>

        <section className="card meals-card">
          <div className="meals-card-head">
            <h2>Bugünkü öğünler</h2>
            <button type="button" onClick={() => navigate('/weekly-logs')}>Tümünü gör</button>
          </div>

          <div className="meal-list">
            {todayLogs.length ? (
              todayLogs.map((log) => {
                const meal = getMealSlot(log);
                const recipe = recipeCache?.[log.recipeId];
                const calories = toNumber(log.calorieIntake || recipe?.calorie);
                const details = recipe?.name || recipe?.title || log.recipeName || 'Öğün detayı eklenmedi';

                return (
                  <div className="meal-row" key={log.id || `${log.recipeId}-${log.loggedAt || log.eatenAt}`}>
                    <div className="meal-info">
                      <span className={`meal-icon ${meal.className}`}>{meal.icon || <Timer size={18} />}</span>
                      <span>
                        <strong>{meal.name}</strong>
                        <small>{formatMealTime(log)}</small>
                      </span>
                    </div>
                    <div className="meal-calories">
                      <strong>{Math.round(calories)} kcal</strong>
                      <span>{details}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-meals">
                Bugün henüz öğün eklenmedi.
              </div>
            )}
          </div>
        </section>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-home {
          display: grid;
          gap: 1.25rem;
        }

        .dashboard-home-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .dashboard-home-header h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: clamp(1.55rem, 2.4vw, 2rem);
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1;
        }

        .dashboard-home-header p {
          margin-top: 0.45rem;
          color: var(--text-secondary);
          font-size: 0.98rem;
        }

        .dashboard-theme-button {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          border: 1px solid var(--border-color);
          background: var(--background-elevated);
          color: var(--text-primary);
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .dashboard-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.95fr);
          gap: 1.25rem;
          align-items: stretch;
        }

        .dashboard-recipe-hero {
          min-height: 360px;
          padding: clamp(1.7rem, 3vw, 2.4rem);
          border-radius: 32px;
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
          color: white;
          overflow: hidden;
          border: 1px solid rgba(196, 181, 253, 0.12);
          text-align: left;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          position: relative;
          box-shadow: none;
        }

        .dashboard-recipe-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.08;
          background: radial-gradient(circle at 2px 2px, white 1px, transparent 0);
          background-size: 26px 26px;
        }

        .dashboard-recipe-hero > * {
          position: relative;
          z-index: 1;
        }

        .recipe-card-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 1rem;
          padding: 0.5rem 0.85rem;
          border-radius: 999px;
          background: rgba(255,255,255,0.15);
          font-size: 0.76rem;
          font-weight: 900;
        }

        .dashboard-recipe-hero h2 {
          max-width: 13ch;
          margin: 0 0 0.85rem;
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1.02;
          font-weight: 950;
          letter-spacing: 0;
        }

        .dashboard-recipe-hero p {
          max-width: 46ch;
          margin: 0 0 1.5rem;
          color: rgba(255,255,255,0.86);
          font-size: 1rem;
          line-height: 1.55;
        }

        .recipe-card-action {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.95rem 1.35rem;
          border-radius: 16px;
          background: white;
          color: #4f46e5;
          font-size: 1rem;
          font-weight: 900;
        }

        .dashboard-recipe-hero small {
          margin-top: auto;
          padding-top: 1rem;
          color: rgba(255,255,255,0.92);
          font-size: 0.86rem;
          font-weight: 800;
        }

        .dashboard-status-card {
          min-height: 360px;
          display: grid;
          align-content: center;
          gap: 1rem;
          padding: 1.5rem;
          border-radius: 32px;
          box-shadow: none;
        }

        .status-ring-row {
          display: grid;
          justify-items: center;
          gap: 0.6rem;
        }

        .calorie-ring-wrap {
          position: relative;
          width: 218px;
          height: 218px;
          display: grid;
          place-items: center;
        }

        .calorie-ring {
          width: 218px;
          height: 218px;
          transform: rotate(-90deg);
          overflow: visible;
        }

        .ring-track,
        .ring-progress {
          fill: none;
          stroke-width: 8.5;
          stroke-linecap: round;
        }

        .ring-track {
          stroke: rgba(145, 136, 191, 0.14);
        }

        .ring-progress {
          stroke: url(#calorieRingGradient);
          transition: stroke-dashoffset 0.35s ease;
        }

        .calorie-ring-center {
          position: absolute;
          inset: 0;
          display: grid;
          place-content: center;
          justify-items: center;
          text-align: center;
        }

        .calorie-ring-center strong {
          color: var(--text-primary);
          font-size: 2rem;
          font-weight: 650;
          letter-spacing: 0;
          line-height: 1;
        }

        .calorie-ring-center span {
          margin-top: 0.34rem;
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-weight: 550;
          line-height: 1.1;
        }

        .calorie-ring-center em {
          margin-top: 0.12rem;
          color: #a99cff;
          font-size: 0.9rem;
          font-style: normal;
          font-weight: 650;
          line-height: 1.1;
        }

        .daily-goal {
          display: grid;
          gap: 0.18rem;
          justify-items: center;
          text-align: center;
          min-width: 0;
        }

        .daily-goal span {
          color: var(--primary-color);
          font-size: 0.74rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .daily-goal strong {
          color: var(--text-primary);
          font-size: 1.05rem;
          line-height: 1.12;
        }

        .daily-goal p {
          color: var(--text-secondary);
          font-size: 0.82rem;
          line-height: 1.4;
        }

        .macro-mini {
          display: grid;
          gap: 0.72rem;
          padding-top: 0.85rem;
          border-top: 1px solid var(--border-color);
        }

        .macro-mini-title {
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-weight: 900;
        }

        .macro-mini-row {
          display: grid;
          gap: 0.35rem;
        }

        .macro-mini-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          color: var(--text-secondary);
          font-size: 0.82rem;
          font-weight: 800;
        }

        .macro-mini-head span {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
        }

        .macro-mini-head i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .macro-mini-head strong {
          color: var(--text-primary);
          font-size: 0.82rem;
          white-space: nowrap;
        }

        .macro-mini-track {
          height: 7px;
          border-radius: 999px;
          background: rgba(196, 181, 253, 0.14);
          overflow: hidden;
        }

        .macro-mini-track span {
          display: block;
          height: 100%;
          max-width: 100%;
          border-radius: inherit;
        }

        .dashboard-quick-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.25rem;
        }

        .dashboard-quick-card {
          min-height: 92px;
          display: flex;
          align-items: center;
          gap: 0.9rem;
          padding: 1.1rem 1.25rem;
          border-radius: 22px;
          text-align: left;
          box-shadow: none;
        }

        .quick-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .quick-icon.healthy {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .quick-icon.favorite {
          background: rgba(244, 63, 94, 0.1);
          color: #f43f5e;
        }

        .dashboard-quick-card strong {
          display: block;
          margin-bottom: 0.12rem;
          color: var(--text-primary);
          font-size: 1rem;
          font-weight: 900;
        }

        .dashboard-quick-card small {
          color: var(--text-secondary);
          font-size: 0.82rem;
          line-height: 1.3;
        }

        .meals-card {
          padding: 1.1rem 1.25rem;
          border-radius: 22px;
          box-shadow: none;
        }

        .meals-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.55rem;
        }

        .meals-card-head h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.05rem;
          font-weight: 900;
        }

        .meals-card-head button {
          background: transparent;
          color: var(--primary-color);
          font-size: 0.86rem;
          font-weight: 900;
          padding: 0.2rem 0;
        }

        .meal-list {
          display: grid;
        }

        .meal-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.58rem 0;
          border-bottom: 1px solid var(--border-color);
        }

        .meal-row:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .meal-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
        }

        .meal-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          background: rgba(124, 58, 237, 0.1);
        }

        .meal-icon.breakfast {
          color: #8b7cf6;
        }

        .meal-icon.lunch {
          color: #10b981;
        }

        .meal-icon.dinner {
          color: #f59e0b;
        }

        .meal-info strong {
          display: block;
          color: var(--text-primary);
          font-size: 0.94rem;
          font-weight: 900;
          line-height: 1.15;
        }

        .meal-info small {
          display: block;
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 800;
        }

        .meal-calories {
          text-align: right;
          min-width: 150px;
        }

        .meal-calories strong {
          display: block;
          color: var(--text-primary);
          font-size: 0.94rem;
          font-weight: 900;
          line-height: 1.15;
        }

        .meal-calories span {
          display: block;
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 520px;
        }

        .empty-meals {
          padding: 0.65rem 0;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 700;
        }

        .dashboard-recipe-hero:hover,
        .dashboard-quick-card:hover {
          transform: translateY(-4px);
        }

        @media (max-width: 1120px) {
          .dashboard-hero-grid,
          .dashboard-quick-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .dashboard-home-header,
          .status-ring-row,
          .meal-row {
            align-items: flex-start;
          }

          .dashboard-home-header,
          .status-ring-row,
          .meal-row {
            display: flex;
            flex-direction: column;
          }

          .dashboard-theme-button {
            align-self: flex-end;
          }

          .meal-calories {
            min-width: 0;
            text-align: left;
            padding-left: 53px;
          }

          .meal-calories span {
            max-width: 100%;
          }
        }
      ` }} />
    </Layout>
  );
};

export default Dashboard;
