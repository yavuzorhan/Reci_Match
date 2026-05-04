import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Bot,
  Clock3,
  Flame,
  Heart,
  Leaf,
  PackageOpen,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import { getHealthGrade, normalizeCookingType } from '../utils/recipeInsights';

const fallbackSelectedIngredients = ['Tavuk Göğsü', 'Avokado', 'Ispanak', 'Kinoa'];

const filterGroups = [
  {
    title: 'Kategoriler',
    items: ['Sebzeler', 'Protein', 'Tahıllar', 'Süt Ürünleri', 'Baklagiller'],
    active: ['Protein'],
  },
  {
    title: 'Sağlık Puanı',
    items: ['A Kalite', 'Yüksek Protein', 'Düşük Kalori', 'Dengeli Makro'],
    active: ['A Kalite'],
  },
  {
    title: 'Pişirme Yöntemi',
    items: ['Tavada', 'Fırında', 'Tencerede', 'Airfryer', 'Çiğ / Salata'],
    active: [],
  },
];

const toNumber = (value) => Number(value) || 0;

const formatNumber = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '-';
  const number = Number(value);
  return number % 1 === 0 ? number.toString() : number.toFixed(1);
};

const titleCaseGrade = (value, score) => {
  const raw = value || getHealthGrade(score || 0);
  const grade = String(raw).split(' ')[0].toUpperCase();
  return `${grade} Kalite`;
};

const getRecipeTime = (recipe) => (
  recipe.total_time_minutes
    || recipe.preparation_time
    || recipe.cooking_time
    || recipe.ready_in_minutes
    || 20
);

const getRecipeTags = (recipe) => {
  const tags = [...(recipe.health_flags || [])];
  const protein = toNumber(recipe.protein);
  const calories = toNumber(recipe.calorie);

  if (protein >= 25) tags.push('Yüksek Protein');
  if (calories > 0 && calories <= 450) tags.push('Düşük Kalori');
  if (recipe.recipe_category) tags.push(recipe.recipe_category);
  if (recipe.cooking_type) tags.push(recipe.cooking_type);

  return [...new Set(tags)].filter(Boolean).slice(0, 3);
};

const getRecipeMatch = (recipe) => Math.round(recipe.score || recipe.match_score || recipe.health_score || 85);

const normalizeRecipe = (recipe) => ({
  id: recipe.id,
  source: recipe,
  title: recipe.name || 'Sağlıklı Tarif',
  grade: titleCaseGrade(recipe.health_grade, recipe.health_score),
  match: getRecipeMatch(recipe),
  time: `${getRecipeTime(recipe)} dk`,
  calories: `${formatNumber(recipe.calorie)} kcal`,
  protein: `${formatNumber(recipe.protein)}g Protein`,
  tags: getRecipeTags(recipe),
  image: recipe.image_url,
  category: recipe.recipe_category || '',
  cookingType: normalizeCookingType(recipe.cooking_type),
  caloriesValue: toNumber(recipe.calorie),
  proteinValue: toNumber(recipe.protein),
});

const TopBar = ({ userName }) => (
  <header className="healthy-topbar">
    <div className="healthy-topbar-title">
      <span>
        <Leaf size={20} />
      </span>
      <strong>Sağlıklı Tarifler</strong>
    </div>

    <div className="healthy-topbar-actions">
      <button type="button" className="healthy-assistant-button">
        <Bot size={18} />
        AI Assistant
      </button>
      <button type="button" className="healthy-icon-button" aria-label="Bildirimler">
        <Bell size={18} />
      </button>
      <button type="button" className="healthy-avatar" aria-label="Profil">
        {(userName?.[0] || 'R').toLocaleUpperCase('tr-TR')}
      </button>
    </div>
  </header>
);

const FilterPanel = ({ searchTerm, onSearchChange, activeFilters, onToggleFilter, selectedIngredients }) => (
  <aside className="healthy-filter-panel">
    <div className="healthy-panel-heading">
      <ShieldCheck size={22} />
      <h2>Sağlıklı Filtreler</h2>
    </div>

    <label className="healthy-search">
      <input
        type="text"
        placeholder="Malzeme ara..."
        value={searchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <Search size={18} />
    </label>

    <section className="healthy-filter-section">
      <h3>Seçilen Malzemeler</h3>
      <div className="healthy-chip-list">
        {selectedIngredients.map((ingredient) => (
          <span className="healthy-chip selected" key={ingredient}>
            {ingredient}
            <X size={13} />
          </span>
        ))}
      </div>
    </section>

    {filterGroups.map((group) => (
      <section className="healthy-filter-section" key={group.title}>
        <h3>{group.title}</h3>
        <div className="healthy-chip-list">
          {group.items.map((item) => {
            const isActive = activeFilters.includes(item);
            return (
              <button
                type="button"
                className={`healthy-chip filter ${isActive ? 'active' : ''}`}
                key={item}
                onClick={() => onToggleFilter(item)}
              >
                {item}
              </button>
            );
          })}
        </div>
      </section>
    ))}
  </aside>
);

const RecipeCard = ({ recipe, isFavorite, onFavorite, onInspect }) => (
  <article className="healthy-recipe-card">
    <div className="healthy-card-media">
      {recipe.image ? (
        <img src={recipe.image} alt={recipe.title} />
      ) : (
        <div className="healthy-card-fallback">
          <Leaf size={54} />
        </div>
      )}
      <div className="healthy-card-overlay" />
      <div className="healthy-card-badges">
        <span className={recipe.grade.startsWith('A') ? 'grade-a' : 'grade-b'}>
          {recipe.grade}
        </span>
        <span>%{recipe.match} Eşleşme</span>
      </div>
      <button
        type="button"
        className={`healthy-heart ${isFavorite ? 'active' : ''}`}
        onClick={(event) => onFavorite(event, recipe.id)}
        aria-label="Favorilere ekle"
      >
        <Heart size={19} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>

    <div className="healthy-card-body">
      <h3>{recipe.title}</h3>

      <div className="healthy-card-meta">
        <span><Clock3 size={15} /> {recipe.time}</span>
        <span><Flame size={15} /> {recipe.calories}</span>
        <span><Zap size={15} /> {recipe.protein}</span>
      </div>

      <div className="healthy-card-tags">
        {recipe.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>

      <button type="button" className="healthy-inspect-button" onClick={() => onInspect(recipe)}>
        Tarifi İncele
      </button>
    </div>
  </article>
);

const HealthyMenu = () => {
  const { user, favorites, toggleFavorite, fetchHealthyRecipes, pantryIngredients } = useApp();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchHealthyRecipes();
        if (!cancelled) setRecipes(data || []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Sağlıklı tarifler yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [fetchHealthyRecipes]);

  const selectedIngredientNames = useMemo(() => {
    const pantryNames = (pantryIngredients || [])
      .map((ingredient) => ingredient.name || ingredient.ingredient_name)
      .filter(Boolean)
      .slice(0, 4);

    return pantryNames.length ? pantryNames : fallbackSelectedIngredients;
  }, [pantryIngredients]);

  const displayRecipes = useMemo(() => {
    const normalized = (recipes || []).map(normalizeRecipe);
    const query = searchTerm.trim().toLocaleLowerCase('tr-TR');

    return normalized.filter((recipe) => {
      if (query) {
        const haystack = [
          recipe.title,
          recipe.category,
          recipe.source.description,
          ...(recipe.tags || []),
          ...((recipe.source.ingredients || []).map((ingredient) => ingredient.name || ingredient.ingredient_name || '')),
        ].join(' ').toLocaleLowerCase('tr-TR');

        if (!haystack.includes(query)) return false;
      }

      if (activeFilters.includes('A Kalite') && !recipe.grade.startsWith('A')) return false;
      if (activeFilters.includes('Yüksek Protein') && recipe.proteinValue < 20) return false;
      if (activeFilters.includes('Düşük Kalori') && recipe.caloriesValue > 450) return false;
      if (activeFilters.includes('Dengeli Makro') && !recipe.tags.some((tag) => String(tag).toLocaleLowerCase('tr-TR').includes('makro'))) return false;

      const cookingFilterMap = {
        Tavada: 'tava',
        Fırında: 'firin',
        Tencerede: 'tencere',
        Airfryer: 'airfryer',
        'Çiğ / Salata': 'salata',
      };
      const activeCookingFilters = Object.entries(cookingFilterMap)
        .filter(([label]) => activeFilters.includes(label))
        .map(([, value]) => value);

      if (activeCookingFilters.length && !activeCookingFilters.some((value) => recipe.cookingType.includes(value))) {
        return false;
      }

      if (activeFilters.includes('Protein') && recipe.proteinValue < 12) return false;
      if (activeFilters.includes('Sebzeler') && !recipe.category.toLocaleLowerCase('tr-TR').includes('sebze')) return false;
      if (activeFilters.includes('Tahıllar') && !recipe.tags.join(' ').toLocaleLowerCase('tr-TR').includes('tah')) return false;
      if (activeFilters.includes('Süt Ürünleri') && !recipe.tags.join(' ').toLocaleLowerCase('tr-TR').includes('süt')) return false;
      if (activeFilters.includes('Baklagiller') && !recipe.title.toLocaleLowerCase('tr-TR').includes('mercimek')) return false;

      return true;
    });
  }, [activeFilters, recipes, searchTerm]);

  const favoriteIds = useMemo(() => new Set((favorites || []).map(Number)), [favorites]);

  const toggleFilter = (filter) => {
    setActiveFilters((current) => (
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter]
    ));
  };

  const handleFavorite = async (event, recipeId) => {
    event.stopPropagation();
    if (!toggleFavorite) return;
    try {
      await toggleFavorite(Number(recipeId));
    } catch (err) {
      alert(err.message || 'Favori güncellenemedi.');
    }
  };

  const handleInspect = (recipe) => {
    navigate(`/recipe/${recipe.id}`, { state: { matchScore: recipe.match } });
  };

  const renderRecipes = () => {
    if (loading) {
      return (
        <div className="healthy-state-card">
          <Sparkles size={42} className="healthy-spin" />
          <strong>Sağlıklı tarifler yükleniyor...</strong>
        </div>
      );
    }

    if (error) {
      return (
        <div className="healthy-state-card error">
          <PackageOpen size={42} />
          <strong>{error}</strong>
        </div>
      );
    }

    if (!displayRecipes.length) {
      return (
        <div className="healthy-state-card">
          <PackageOpen size={42} />
          <strong>Uygun sağlıklı tarif bulunamadı</strong>
          <span>Aramayı veya aktif filtreleri gevşetebilirsin.</span>
        </div>
      );
    }

    return (
      <div className="healthy-recipe-grid">
        {displayRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            isFavorite={favoriteIds.has(Number(recipe.id))}
            onFavorite={handleFavorite}
            onInspect={handleInspect}
          />
        ))}
      </div>
    );
  };

  return (
    <Layout variant="healthy">
      <div className="healthy-page">
        <TopBar userName={user?.name} />

        <main className="healthy-main">
          <FilterPanel
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            activeFilters={activeFilters}
            onToggleFilter={toggleFilter}
            selectedIngredients={selectedIngredientNames}
          />

          <section className="healthy-recipes-area">
            <div className="healthy-recipes-heading">
              <div>
                <span>
                  <Sparkles size={16} />
                  Sağlıklı keşif
                </span>
                <h1>Sağlıklı Tarifler</h1>
              </div>
              {!loading && !error && (
                <small>{displayRecipes.length} tarif gösteriliyor</small>
              )}
            </div>

            {renderRecipes()}
          </section>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .layout-content:has(.healthy-page) {
          padding: 0;
          background:
            radial-gradient(circle at 14% 6%, rgba(16,185,129,0.09), transparent 34%),
            radial-gradient(circle at 92% 18%, rgba(78,222,163,0.07), transparent 30%),
            #050b14 !important;
          color: #cfe8dc;
        }

        .layout-shell:has(.healthy-page) .sidebar {
          background: rgba(7, 16, 27, 0.94);
          border-right: 1px solid rgba(16,185,129,0.12);
          backdrop-filter: blur(30px);
          box-shadow: none;
        }

        .layout-shell:has(.healthy-page) .brand-wordmark-reci,
        .layout-shell:has(.healthy-page) .brand-wordmark-match {
          color: #10b981;
          text-shadow: none;
        }

        .layout-shell:has(.healthy-page) .brand-wordmark p::before {
          content: "Premium Nutrition";
          color: rgba(207,232,220,0.46);
        }

        .layout-shell:has(.healthy-page) .brand-wordmark p {
          font-size: 0;
        }

        .layout-shell:has(.healthy-page) .brand-wordmark p span {
          display: none;
        }

        .layout-shell:has(.healthy-page) .nav-active-pill {
          border-radius: 12px;
          background: rgba(16,185,129,0.10);
          box-shadow: inset 3px 0 0 #10b981;
        }

        .layout-shell:has(.healthy-page) .nav-item,
        .layout-shell:has(.healthy-page) .sidebar-action-button {
          color: rgba(207,232,220,0.56) !important;
        }

        .layout-shell:has(.healthy-page) .nav-item:hover,
        .layout-shell:has(.healthy-page) .sidebar-action-button:hover {
          color: #cfe8dc !important;
          background: rgba(16,185,129,0.06);
        }

        .layout-shell:has(.healthy-page) .nav-item.active {
          color: #10b981 !important;
        }

        .healthy-page {
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', Inter, system-ui, sans-serif;
          color: #cfe8dc;
        }

        .healthy-topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 0 32px;
          border-bottom: 1px solid rgba(16,185,129,0.12);
          background: rgba(5, 17, 15, 0.72);
          backdrop-filter: blur(20px);
        }

        .healthy-topbar-title,
        .healthy-topbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .healthy-topbar-title span {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          border: 1px solid rgba(16,185,129,0.22);
          background: rgba(16,185,129,0.10);
          color: #10b981;
        }

        .healthy-topbar-title strong {
          color: #cfe8dc;
          font-size: 20px;
          font-weight: 850;
        }

        .healthy-assistant-button,
        .healthy-icon-button,
        .healthy-avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(13,31,26,0.70);
          color: rgba(207,232,220,0.78);
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .healthy-assistant-button {
          min-height: 40px;
          gap: 8px;
          padding: 0 16px;
          border-radius: 999px;
          background: #10b981;
          color: #003824;
          font-weight: 900;
          box-shadow: 0 14px 28px rgba(16,185,129,0.16);
        }

        .healthy-icon-button,
        .healthy-avatar {
          width: 40px;
          height: 40px;
          border-radius: 999px;
        }

        .healthy-icon-button:hover {
          color: #10b981;
          border-color: rgba(16,185,129,0.26);
          background: rgba(16,185,129,0.08);
        }

        .healthy-avatar {
          border-color: rgba(16,185,129,0.24);
          background: linear-gradient(135deg, rgba(16,185,129,0.18), rgba(78,222,163,0.08));
          color: #cfe8dc;
          font-weight: 950;
        }

        .healthy-main {
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr);
          gap: 24px;
          width: min(100%, 1440px);
          margin: 0 auto;
          padding: 32px;
        }

        .healthy-filter-panel,
        .healthy-recipe-card {
          border: 1px solid rgba(16,185,129,0.13);
          background: rgba(13,31,26,0.82);
          box-shadow: 0 20px 52px rgba(0,0,0,0.30);
          backdrop-filter: blur(24px);
        }

        .healthy-filter-panel {
          position: sticky;
          top: 100px;
          align-self: start;
          border-radius: 20px;
          padding: 22px;
        }

        .healthy-panel-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          color: #10b981;
        }

        .healthy-panel-heading h2 {
          margin: 0;
          font-size: 21px;
          line-height: 1.25;
          font-weight: 850;
        }

        .healthy-search {
          position: relative;
          display: block;
          margin-bottom: 22px;
        }

        .healthy-search input {
          width: 100%;
          min-height: 48px;
          padding: 0 42px 0 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: #091f18;
          color: #cfe8dc;
          font-size: 15px;
          outline: none;
        }

        .healthy-search input::placeholder {
          color: rgba(207,232,220,0.38);
        }

        .healthy-search input:focus {
          border-color: rgba(16,185,129,0.45);
          box-shadow: 0 0 0 3px rgba(16,185,129,0.10);
        }

        .healthy-search svg {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(207,232,220,0.44);
        }

        .healthy-filter-section {
          padding-top: 18px;
          margin-top: 18px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .healthy-filter-section h3 {
          margin: 0 0 11px;
          color: rgba(207,232,220,0.56);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .healthy-chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .healthy-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 30px;
          padding: 0 11px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(9,31,24,0.78);
          color: rgba(207,232,220,0.76);
          font-size: 12px;
          font-weight: 800;
        }

        .healthy-chip.filter {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .healthy-chip.selected,
        .healthy-chip.active {
          border-color: rgba(16,185,129,0.28);
          background: rgba(16,185,129,0.12);
          color: #4edea3;
        }

        .healthy-chip.filter:hover {
          border-color: rgba(16,185,129,0.28);
          color: #cfe8dc;
        }

        .healthy-recipes-area {
          min-width: 0;
        }

        .healthy-recipes-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .healthy-recipes-heading span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
          color: #4edea3;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .healthy-recipes-heading h1 {
          margin: 0;
          color: #10b981;
          font-size: clamp(2rem, 3vw, 2.7rem);
          line-height: 1.15;
          font-weight: 900;
          letter-spacing: 0;
        }

        .healthy-recipes-heading small {
          color: rgba(207,232,220,0.58);
          font-size: 13px;
          font-weight: 850;
        }

        .healthy-recipe-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
        }

        .healthy-recipe-card {
          overflow: hidden;
          border-radius: 22px;
          transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
        }

        .healthy-recipe-card:hover {
          transform: translateY(-4px) scale(1.01);
          border-color: rgba(16,185,129,0.26);
          box-shadow: 0 24px 60px rgba(0,0,0,0.34), 0 0 24px rgba(16,185,129,0.08);
        }

        .healthy-card-media {
          position: relative;
          height: 230px;
          overflow: hidden;
        }

        .healthy-card-media img,
        .healthy-card-fallback {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.6s ease;
        }

        .healthy-card-fallback {
          display: grid;
          place-items: center;
          color: rgba(78,222,163,0.35);
          background:
            radial-gradient(circle at 30% 20%, rgba(16,185,129,0.18), transparent 32%),
            linear-gradient(145deg, #10231d, #050b14);
        }

        .healthy-recipe-card:hover .healthy-card-media img {
          transform: scale(1.06);
        }

        .healthy-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(5,11,20,0.22), transparent 44%, rgba(5,11,20,0.32));
        }

        .healthy-card-badges {
          position: absolute;
          top: 14px;
          left: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .healthy-card-badges span {
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(5,11,20,0.70);
          color: white;
          font-size: 12px;
          font-weight: 900;
          backdrop-filter: blur(12px);
        }

        .healthy-card-badges .grade-a {
          border-color: rgba(16,185,129,0.30);
          background: #10b981;
          color: #003824;
        }

        .healthy-card-badges .grade-b {
          border-color: rgba(78,222,163,0.32);
          background: #4edea3;
          color: #003824;
        }

        .healthy-heart {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(5,11,20,0.52);
          color: white;
          backdrop-filter: blur(14px);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .healthy-heart:hover,
        .healthy-heart.active {
          background: rgba(16,185,129,0.92);
          border-color: rgba(16,185,129,0.92);
          color: #003824;
        }

        .healthy-card-body {
          padding: 22px;
        }

        .healthy-card-body h3 {
          margin: 0 0 12px;
          color: #cfe8dc;
          font-size: 23px;
          line-height: 1.25;
          font-weight: 850;
          letter-spacing: 0;
        }

        .healthy-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          color: rgba(207,232,220,0.56);
          font-size: 12px;
          font-weight: 800;
        }

        .healthy-card-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .healthy-card-meta svg {
          color: #4edea3;
        }

        .healthy-card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 16px 0 18px;
        }

        .healthy-card-tags span {
          padding: 5px 8px;
          border-radius: 8px;
          border: 1px solid rgba(78,222,163,0.18);
          background: rgba(78,222,163,0.08);
          color: #4edea3;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .healthy-inspect-button {
          width: 100%;
          min-height: 46px;
          border: 0;
          border-radius: 14px;
          background: #10b981;
          color: #003824;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 16px 30px rgba(16,185,129,0.16);
          transition: all 0.2s ease;
        }

        .healthy-inspect-button:hover {
          background: #4edea3;
          transform: translateY(-1px);
        }

        .healthy-state-card {
          min-height: 360px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 12px;
          text-align: center;
          border: 1px solid rgba(16,185,129,0.13);
          border-radius: 22px;
          background: rgba(13,31,26,0.72);
          color: rgba(207,232,220,0.70);
        }

        .healthy-state-card svg {
          color: #10b981;
        }

        .healthy-state-card strong {
          color: #cfe8dc;
          font-size: 18px;
        }

        .healthy-state-card span {
          color: rgba(207,232,220,0.52);
          font-size: 14px;
        }

        .healthy-state-card.error {
          border-color: rgba(255,138,138,0.22);
          color: #ffb4ab;
        }

        .healthy-spin {
          animation: healthySpin 3.5s linear infinite;
        }

        @keyframes healthySpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1180px) {
          .healthy-main {
            grid-template-columns: 1fr;
          }

          .healthy-filter-panel {
            position: static;
          }
        }

        @media (max-width: 860px) {
          .healthy-topbar {
            padding: 0 16px;
          }

          .healthy-assistant-button {
            display: none;
          }

          .healthy-main {
            padding: 24px 16px;
          }

          .healthy-recipe-grid {
            grid-template-columns: 1fr;
          }
        }
      ` }} />
    </Layout>
  );
};

export default HealthyMenu;
