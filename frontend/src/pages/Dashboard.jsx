import React, { useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom';
import {
  ChefHat,
  Clock3,
  Flame,
  Heart,
  Leaf,
  Moon,
  MoreHorizontal,
  NotebookText,
  Plus,
  Sparkles,
  Sun,
  Utensils,
} from 'lucide-react';

import Layout from '../components/Layout';
import RecipeCard from '../components/RecipeCard';
import { useApp } from '../context/AppContext';
import reciMatchLogo from '../assets/recimatch-logo.png';

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

const Dashboard = () => {
  const {
    dashboardData,
    user,
    pantryIngredients,
    dailyLogs,
    recipeCache,
    favorites,
    fetchRecommendedRecipes,
    isDarkMode,
    toggleDarkMode,
    toggleFavorite,
  } = useApp();
  const navigate = useNavigate();
  const [pantryMatches, setPantryMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState('');

  const pantryIds = useMemo(() => (
    (pantryIngredients || []).map((ingredient) => ingredient.id).filter(Boolean)
  ), [pantryIngredients]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!pantryIds.length) {
        setPantryMatches([]);
        setMatchesError('');
        return;
      }

      setMatchesLoading(true);
      setMatchesError('');
      try {
        const data = await fetchRecommendedRecipes({
          selected_ingredient_ids: pantryIds,
          pantry_ingredient_ids: pantryIds,
          exclude_disliked: true,
        });
        if (!cancelled) setPantryMatches((data || []).slice(0, 3));
      } catch {
        if (!cancelled) {
          setPantryMatches([]);
          setMatchesError('Dolabındaki malzemelerle tarifler alınamadı.');
        }
      } finally {
        if (!cancelled) setMatchesLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [fetchRecommendedRecipes, pantryIds]);

  const calorieTarget = toNumber(user?.daily_calorie || dashboardData.dailyCalorieTarget || 2200);
  const consumedCalories = toNumber(dashboardData.consumedCalories);
  const caloriePercent = calorieTarget ? clamp((consumedCalories / calorieTarget) * 100) : 0;
  const circleRadius = 48;
  const circleLength = 2 * Math.PI * circleRadius;
  const circleOffset = circleLength - (circleLength * caloriePercent) / 100;
  const calorieRingColor = (() => {
    if (caloriePercent >= 100) return '#ef4444';
    if (caloriePercent >= 90) return '#ff7043';
    return '#4edea3';
  })();
  const macros = useMemo(() => {
    const protein = toNumber(dashboardData.macros?.protein);
    const carb = toNumber(dashboardData.macros?.carb);
    const fat = toNumber(dashboardData.macros?.fat);

    return [
      { label: 'Protein', current: protein, target: toNumber(dashboardData.macroTargets?.protein), color: '#ffb3af' },
      { label: 'Karbonhidrat', current: carb, target: toNumber(dashboardData.macroTargets?.carb), color: '#44e2cd' },
      { label: 'Yağ', current: fat, target: toNumber(dashboardData.macroTargets?.fat), color: '#4edea3' },
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

  const topMatches = useMemo(() => (
    (pantryMatches || []).map((recipe) => ({
      ...recipe,
      health_grade: recipe.health_grade || 'B',
      tags: [
        recipe.cooking_type || 'Dolabımdan',
        recipe.recipe_category || 'Eşleşme',
      ],
    }))
  ), [pantryMatches]);

  const firstName = user?.name?.split(' ')[0] || 'Alex';

  return (
    <Layout>
      <div className="noct-dashboard">
        <header className="noct-topbar">
          <div className="noct-topbar-brand">
            <img src={reciMatchLogo} alt="Logo" className="topbar-logo" />
            <span>ReciMatch</span>
          </div>
          <div className="noct-topbar-actions">
            <button
              type="button"
              className="noct-icon-button"
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? 'Açık temaya geç' : 'Koyu temaya geç'}
              title={isDarkMode ? 'Açık tema' : 'Koyu tema'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="noct-separator" />
            <button type="button" className="noct-profile-button" onClick={() => navigate('/profile-edit')}>
              <span className="noct-avatar">{(firstName[0] || 'A').toUpperCase()}</span>
              <span>Profil</span>
            </button>
          </div>
        </header>

        <main className="noct-main">
          <div className="noct-content-grid">
            <div className="noct-left-column">
              <section className="glass-panel noct-hero">
                <div className="hero-glow" />
                <div className="noct-hero-content">
                  <span className="noct-live-badge">
                    <span />
                    {pantryIds.length ? `${topMatches.length} dolap eşleşmesi` : 'Dolabın hazır değil'}
                  </span>
                  <h1>Bugün dolabında ne var, {firstName}?</h1>
                  <p>
                    Dolabındaki gerçek malzemelere göre tarif eşleşmelerini gör ve günlük hedeflerini tek ekranda takip et.
                  </p>

                  <div className="noct-search-box" onClick={() => navigate('/select-ingredients')}>
                    <ChefHat size={24} />
                    <span>
                      {pantryIds.length
                        ? `${pantryIds.length} dolap malzemesiyle öneriler hazır`
                        : 'Gerçek eşleşmeler için önce dolabına malzeme ekle'}
                    </span>
                    <button type="button">
                      <Sparkles size={18} />
                      Tarif Al
                    </button>
                  </div>

                </div>

                <aside className="noct-insight">
                  <div className="insight-dot">
                    <Sparkles size={16} />
                  </div>
                  <span>AI Insight</span>
                  <p>
                    {pantryIds.length
                      ? 'Öneriler dolabındaki kayıtlı malzemeler üzerinden canlı olarak hesaplanıyor.'
                      : 'Dolabına malzeme eklediğinde burada gerçek eşleşme içgörüsü görünecek.'}
                  </p>
                  <div className="insight-meter">
                    <i />
                    <small>{pantryIds.length ? 'Active' : 'Waiting'}</small>
                  </div>
                </aside>
              </section>

              <section className="noct-section">
                <div className="noct-section-head">
                  <h2>
                    <Sparkles size={20} />
                    Dolabımdan Eşleşen Tarifler
                  </h2>
                  <button type="button" onClick={() => navigate('/recommendations')}>Tümünü gör</button>
                </div>

                {matchesLoading ? (
                  <div className="glass-panel noct-match-state">Dolabındaki malzemelerle eşleşmeler hazırlanıyor...</div>
                ) : matchesError ? (
                  <div className="glass-panel noct-match-state error">{matchesError}</div>
                ) : !pantryIds.length ? (
                  <div className="glass-panel noct-match-state">
                    Dolabında kayıtlı malzeme yok. Gerçek eşleşmeler için önce dolabını doldur.
                    <button type="button" onClick={() => navigate('/pantry')}>Dolabıma Git</button>
                  </div>
                ) : !topMatches.length ? (
                  <div className="glass-panel noct-match-state">
                    Dolabındaki malzemelerle uygun tarif bulunamadı.
                    <button type="button" onClick={() => navigate('/pantry')}>Dolabı Güncelle</button>
                  </div>
                ) : (
                  <div className="noct-match-grid">
                    {topMatches.map((recipe) => (
                      <RecipeCard
                        key={recipe.id || recipe.name}
                        recipe={recipe}
                        isFavorite={favorites?.includes?.(Number(recipe.id))}
                        onFavorite={(event, id) => {
                          event.stopPropagation();
                          if (toggleFavorite) toggleFavorite(id);
                        }}
                        onClick={(recipe) => recipe.id && navigate(`/recipe/${recipe.id}`, { state: { matchScore: recipe.score } })}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="noct-right-column">
              <section className="glass-panel noct-overview">
                <div className="noct-panel-head">
                  <h2>Günlük Özet</h2>
                  <MoreHorizontal size={20} />
                </div>

                <div className="noct-ring-wrap" style={{ '--calorie-ring-color': calorieRingColor }}>
                  <svg viewBox="0 0 100 100" className="noct-ring">
                    <circle cx="50" cy="50" r={circleRadius} />
                    <circle
                      className="ring-progress"
                      cx="50"
                      cy="50"
                      r={circleRadius}
                      strokeDasharray={circleLength}
                      strokeDashoffset={circleOffset}
                      style={{ stroke: calorieRingColor, transition: 'stroke 0.4s ease, stroke-dashoffset 0.35s' }}
                    />
                  </svg>
                  <div>
                    <strong>{Math.round(consumedCalories).toLocaleString('tr-TR')}</strong>
                    <span>/ {Math.round(calorieTarget).toLocaleString('tr-TR')} KCAL</span>
                  </div>
                </div>

                <div className="noct-macro-list">
                  {macros.map((macro) => (
                    <div key={macro.label}>
                      <div>
                        <span>{macro.label}</span>
                        <span>{Math.round(macro.current)}g / {Math.round(macro.target)}g</span>
                      </div>
                      <i>
                        <b style={{ width: `${macro.percent}%`, backgroundColor: macro.color, boxShadow: `0 0 8px ${macro.color}66` }} />
                      </i>
                    </div>
                  ))}
                </div>
              </section>

              <section className="glass-panel noct-log">
                <div className="noct-panel-head">
                  <h2>
                    <NotebookText size={20} />
                    Günlük Kayıt
                  </h2>
                  <button type="button" onClick={() => navigate('/weekly-logs')}>
                    <Plus size={18} />
                    Öğün Ekle
                  </button>
                </div>

                <div className="noct-log-list">
                  {todayLogs.length ? (
                    todayLogs.map((log) => {
                      const recipe = recipeCache?.[log.recipeId];
                      const calories = toNumber(log.calorieIntake || recipe?.calorie);
                      return (
                        <div className="noct-log-row" key={log.id || `${log.recipeId}-${log.loggedAt || log.eatenAt}`}>
                          <span><Utensils size={20} /></span>
                          <div>
                            <strong>{recipe?.name || log.recipeName || 'Öğün'}</strong>
                            <small>{formatMealTime(log)}</small>
                          </div>
                          <b>{Math.round(calories)}<small>kcal</small></b>
                        </div>
                      );
                    })
                  ) : (
                    <div className="noct-empty-log">
                      <Leaf size={30} />
                      <strong>Bugün için kayıt yok</strong>
                      <span>Öğün ekleyerek günlük takibi başlat.</span>
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>

    </Layout>
  );
};

export default Dashboard;
