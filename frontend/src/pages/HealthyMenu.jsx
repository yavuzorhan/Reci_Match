import React, { useEffect, useMemo, useState } from 'react';
import './HealthyMenu.css';
import { useNavigate } from 'react-router-dom';
import {
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
import { getHealthMeta, normalizeCookingType } from '../utils/recipeInsights';

const fallbackSelectedIngredients = ['Tavuk Göğsü', 'Avokado', 'Ispanak', 'Kinoa'];

const filterGroups = [
  {
    title: 'Kategoriler',
    items: ['Düşük Kalori', 'Yüksek Karbonhidrat', '30 Dk Altında'],
    active: [],
  },
  {
    title: 'Sağlık Puanı',
    items: ['A Kalite', 'Yüksek Protein', 'Dengeli Makro'],
    active: ['A Kalite'],
  },
  {
    title: 'Pişirme Yöntemi',
    items: ['Tavada', 'Fırında', 'Tencerede'],
    active: [],
  },
];

const toNumber = (value) => Number(value) || 0;

const formatNumber = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '-';
  const number = Number(value);
  return number % 1 === 0 ? number.toString() : number.toFixed(1);
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
  healthMeta: getHealthMeta(recipe),
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
  carbValue: toNumber(recipe.carbohydrate),
  timeValue: toNumber(recipe.preparation_time || recipe.cooking_time || recipe.total_time_minutes || 0),
});

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
        <span style={{ background: recipe.healthMeta.tone.chip }}>
          {recipe.healthMeta.label}
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
      </div>
      <div className="healthy-card-nutrition">
        <div className="healthy-nutrition-item">
          <Flame size={14} />
          <span>{recipe.calories}</span>
          <small>kcal</small>
        </div>
        <div className="healthy-nutrition-item">
          <Zap size={14} />
          <span>{recipe.protein}</span>
          <small>protein</small>
        </div>
        {recipe.carbValue > 0 && (
          <div className="healthy-nutrition-item">
            <span>{Math.round(recipe.carbValue)}g</span>
            <small>karb</small>
          </div>
        )}
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
  const { favorites, toggleFavorite, fetchHealthyRecipes, pantryIngredients } = useApp();
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

      if (activeFilters.includes('A Kalite') && recipe.healthMeta.grade !== 'A') return false;
      if (activeFilters.includes('Yüksek Protein') && recipe.proteinValue < 20) return false;
      if (activeFilters.includes('Düşük Kalori') && recipe.caloriesValue > 450) return false;
      if (activeFilters.includes('Dengeli Makro') && !recipe.tags.some((tag) => String(tag).toLocaleLowerCase('tr-TR').includes('makro'))) return false;
      if (activeFilters.includes('Yüksek Karbonhidrat') && recipe.carbValue < 40) return false;
      if (activeFilters.includes('30 Dk Altında') && (recipe.timeValue <= 0 || recipe.timeValue >= 30)) return false;

      const cookingFilterMap = {
        Tavada: 'tava',
        Fırında: 'firin',
        Tencerede: 'tencere',
      };
      const activeCookingFilters = Object.entries(cookingFilterMap)
        .filter(([label]) => activeFilters.includes(label))
        .map(([, value]) => value);

      if (activeCookingFilters.length && !activeCookingFilters.some((value) => recipe.cookingType.includes(value))) {
        return false;
      }

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

    </Layout>
  );
};

export default HealthyMenu;
