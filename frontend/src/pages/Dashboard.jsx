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
        color: '#7f9b78',
      },
      {
        label: 'Karbonhidrat',
        current: carb,
        target: toNumber(dashboardData.macroTargets?.carb),
        color: '#c59a42',
      },
      {
        label: 'Yağ',
        current: fat,
        target: toNumber(dashboardData.macroTargets?.fat),
        color: '#a86b13',
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
                      <stop offset="0%" stopColor="#f1c16b" />
                      <stop offset="52%" stopColor="#d99a2b" />
                      <stop offset="100%" stopColor="#7f9b78" />
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
                <span className="empty-meals-mark">
                  <Leaf size={26} />
                </span>
                <strong>Öğünlerini ekleyerek güne başla!</strong>
                <small>Öğünlerini kaydet, makrolarını takip et ve hedefine ulaş.</small>
                <button type="button" onClick={() => navigate('/weekly-logs')}>
                  + Öğün Ekle
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-home {
          display: grid;
          gap: 1.35rem;
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
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(2.1rem, 3.6vw, 3rem);
          font-style: italic;
          font-weight: 700;
          letter-spacing: 0;
          line-height: 1.05;
        }

        .dashboard-home-header p {
          margin-top: 0.45rem;
          color: var(--text-secondary);
          font-size: 1rem;
        }

        .dashboard-theme-button {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          border: 1px solid var(--border-strong);
          background: color-mix(in srgb, var(--background-elevated) 78%, transparent);
          color: var(--primary-color);
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          box-shadow: var(--shadow-sm);
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
          border-radius: 22px;
          background:
            linear-gradient(90deg, rgba(0, 17, 14, 0.98) 0%, rgba(2, 31, 26, 0.94) 52%, rgba(3, 27, 23, 0.88) 100%),
            radial-gradient(ellipse at 82% 50%, rgba(217, 154, 43, 0.14), transparent 34%),
            repeating-linear-gradient(135deg, rgba(241, 193, 107, 0.028) 0 1px, transparent 1px 9px);
          color: #f8eedc;
          overflow: hidden;
          border: 1px solid var(--border-strong);
          text-align: left;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          position: relative;
          box-shadow: var(--shadow-md);
        }

        .dashboard-recipe-hero::before {
          content: "";
          position: absolute;
          right: clamp(1rem, 4vw, 3rem);
          top: 8%;
          width: min(34vw, 360px);
          height: 82%;
          opacity: 0.3;
          background:
            radial-gradient(ellipse at 72% 58%, rgba(241, 193, 107, 0.22), transparent 18%),
            linear-gradient(42deg, transparent 42%, rgba(241, 193, 107, 0.38) 43% 44%, transparent 45%),
            linear-gradient(118deg, transparent 46%, rgba(127, 155, 120, 0.38) 47% 48%, transparent 49%);
          filter: blur(0.1px);
        }

        .dashboard-recipe-hero::after {
          content: "";
          position: absolute;
          right: 6%;
          bottom: 8%;
          width: 280px;
          height: 160px;
          opacity: 0.22;
          border-radius: 50%;
          border: 1px solid rgba(241, 193, 107, 0.55);
          transform: rotate(-12deg);
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
          background: rgba(241, 193, 107, 0.12);
          border: 1px solid rgba(241, 193, 107, 0.38);
          color: #f1c16b;
          font-size: 0.76rem;
          font-weight: 900;
        }

        .dashboard-recipe-hero h2 {
          max-width: 13ch;
          margin: 0 0 0.85rem;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(2rem, 4vw, 3rem);
          font-style: italic;
          line-height: 1.02;
          font-weight: 700;
          letter-spacing: 0;
        }

        .dashboard-recipe-hero p {
          max-width: 46ch;
          margin: 0 0 1.5rem;
          color: rgba(248, 238, 220, 0.84);
          font-size: 1rem;
          line-height: 1.55;
        }

        .recipe-card-action {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.95rem 1.35rem;
          border-radius: 14px;
          border: 1px solid var(--border-strong);
          background: rgba(8, 35, 29, 0.7);
          color: #f1c16b;
          font-size: 1rem;
          font-weight: 900;
          box-shadow: 0 0 24px rgba(217, 154, 43, 0.12);
        }

        .dashboard-recipe-hero small {
          margin-top: auto;
          padding-top: 1rem;
          color: #f1c16b;
          font-size: 0.86rem;
          font-weight: 800;
        }

        .dashboard-status-card {
          min-height: 360px;
          display: grid;
          align-content: center;
          gap: 1rem;
          padding: 1.5rem;
          border-radius: 22px;
          border-color: var(--border-strong);
          background:
            linear-gradient(145deg, color-mix(in srgb, var(--background-elevated) 96%, transparent), color-mix(in srgb, var(--background-muted) 88%, transparent)),
            repeating-linear-gradient(135deg, rgba(217, 154, 43, 0.026) 0 1px, transparent 1px 9px);
          box-shadow: var(--shadow-sm);
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
          stroke: rgba(197, 154, 66, 0.18);
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
          color: var(--primary-color);
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
          border-top: 1px solid var(--border-strong);
        }

        .macro-mini-title {
          color: var(--primary-color);
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
          background: rgba(197, 154, 66, 0.18);
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
          border-radius: 18px;
          border-color: var(--border-strong);
          text-align: left;
          box-shadow: var(--shadow-sm);
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
          background: rgba(127, 155, 120, 0.18);
          color: #7f9b78;
        }

        .quick-icon.favorite {
          background: rgba(241, 193, 107, 0.18);
          color: #f1c16b;
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
          padding: 1.35rem 1.55rem;
          border-radius: 18px;
          border-color: var(--border-strong);
          box-shadow: var(--shadow-sm);
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
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.65rem;
          font-style: italic;
          font-weight: 700;
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
          background: rgba(217, 154, 43, 0.1);
        }

        .meal-icon.breakfast {
          color: #d99a2b;
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
          min-height: 142px;
          margin-top: 0.75rem;
          padding: 1.15rem;
          border: 1px dashed color-mix(in srgb, var(--primary-color) 55%, transparent);
          border-radius: 16px;
          color: var(--text-secondary);
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 0.4rem;
          text-align: center;
          background: color-mix(in srgb, var(--background-muted) 44%, transparent);
        }

        .empty-meals-mark {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          color: var(--primary-color);
          background: rgba(217, 154, 43, 0.12);
        }

        .empty-meals strong {
          color: var(--primary-color);
          font-size: 1rem;
          font-weight: 900;
        }

        .empty-meals small {
          color: var(--text-secondary);
          font-size: 0.86rem;
          font-weight: 700;
        }

        .empty-meals button {
          margin-top: 0.3rem;
          padding: 0.58rem 0.9rem;
          border-radius: 12px;
          border: 1px solid var(--border-strong);
          background: rgba(217, 154, 43, 0.12);
          color: var(--primary-color);
          font-weight: 900;
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
