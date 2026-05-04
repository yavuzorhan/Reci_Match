import React, { useEffect, useMemo, useState } from 'react';
import './HealthyResults.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChefHat,
  Filter,
  Leaf,
  PackageOpen,
  Sparkles,
} from 'lucide-react';

import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import {
  RECIPE_FILTER_OPTIONS,
  applyRecipeFilters,
  buildRecipeShortSummary,
} from '../utils/recipeInsights';
import RecipeCard from '../components/RecipeCard';

const HealthyResults = () => {
  const { fetchHealthyRecipes, fetchRecommendedRecipes, favorites, toggleFavorite } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedIngredientIds = useMemo(() => {
    const raw = searchParams.get('ingredients') || '';
    return raw
      .split(',')
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
  }, [searchParams]);

  const [healthyRecipes, setHealthyRecipes] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedMenuRecipeId, setSelectedMenuRecipeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');

      try {
        const allHealthy = await fetchHealthyRecipes();
        setHealthyRecipes(allHealthy);

        if (!selectedIngredientIds.length) {
          setRecipes(allHealthy);
        } else {
          const data = await fetchRecommendedRecipes({
            selected_ingredient_ids: selectedIngredientIds,
            pantry_ingredient_ids: [],
            healthy_only: true,
            exclude_disliked: activeFilters.includes('excludeDisliked'),
          });
          setRecipes(data);
        }
      } catch (err) {
        setError(err.message || 'Fit tarifler yuklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [activeFilters, fetchHealthyRecipes, fetchRecommendedRecipes, selectedIngredientIds]);

  const toggleFilter = (value) => {
    setActiveFilters((prev) => (
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    ));
  };

  const recipeMenuItems = useMemo(
    () => [...healthyRecipes].sort((left, right) => left.name.localeCompare(right.name, 'tr')),
    [healthyRecipes]
  );

  const visibleRecipes = useMemo(() => {
    const withoutExclude = activeFilters.filter((item) => item !== 'excludeDisliked');
    const filtered = applyRecipeFilters(recipes, withoutExclude);
    return filtered.filter((recipe) => !selectedMenuRecipeId || recipe.id === selectedMenuRecipeId);
  }, [activeFilters, recipes, selectedMenuRecipeId]);

  return (
    <Layout variant="healthy">
      <div className="healthy-results-wrapper">
      <header style={{ marginBottom: '2.5rem', animation: 'fadeInDown 0.6s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                padding: '8px 16px',
                borderRadius: '999px',
                fontSize: '0.85rem',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <Leaf size={16} fill="currentColor" />
              FIT TARIF SONUCLARI
            </div>

            <h1 style={{ fontSize: '2.7rem', fontWeight: '950', color: 'var(--text-primary)', letterSpacing: '-0.04em', marginBottom: '12px' }}>
              Saglikli Tarifler
              <br />
              Filtrelerle Hazir
            </h1>

            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '720px', lineHeight: '1.6' }}>
              {selectedIngredientIds.length
                ? `${selectedIngredientIds.length} secili malzemeye gore fit tarifler listeleniyor.`
                : 'Tum fit tarifler listeleniyor. Istersen geri donup malzeme secimini guncelleyebilirsin.'}
            </p>
          </div>

          <button
            onClick={() => navigate('/healthy-menu')}
            style={{
              padding: '14px 24px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: '800',
            }}
          >
            <ArrowLeft size={18} />
            Malzeme Secimine Don
          </button>
        </div>
      </header>

      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <ChefHat size={18} color="#10b981" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-primary)' }}>
            Tum Fit Tarifler
          </h2>
        </div>

        <div className="no-scrollbar" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
          <button
            onClick={() => setSelectedMenuRecipeId(null)}
            style={{
              padding: '10px 18px',
              borderRadius: '999px',
              border: '1px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: '800',
              background: selectedMenuRecipeId === null ? '#4edea3' : 'rgba(28, 43, 60, 0.10)',
              color: selectedMenuRecipeId === null ? '#003824' : '#bbcabf',
              boxShadow: selectedMenuRecipeId === null ? '0 8px 16px rgba(78, 222, 163, 0.2)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Tum Tarifler
          </button>

          {recipeMenuItems.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => setSelectedMenuRecipeId(recipe.id)}
              style={{
                padding: '10px 18px',
                borderRadius: '999px',
                border: '1px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: '700',
                background: selectedMenuRecipeId === recipe.id ? '#4edea3' : 'rgba(28, 43, 60, 0.10)',
                color: selectedMenuRecipeId === recipe.id ? '#003824' : '#bbcabf',
                boxShadow: selectedMenuRecipeId === recipe.id ? '0 8px 16px rgba(78, 222, 163, 0.2)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {recipe.name}
            </button>
          ))}
        </div>
      </section>

      <section className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '2rem' }}>
        <div style={{ padding: '9px 14px', background: 'var(--background-elevated)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.8rem' }}>
          <Filter size={15} /> Filtrele
        </div>

        {RECIPE_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => toggleFilter(option.value)}
            style={{
              padding: '9px 16px',
              borderRadius: '12px',
              border: '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontWeight: '750',
              fontSize: '0.88rem',
              whiteSpace: 'nowrap',
              background: activeFilters.includes(option.value) ? '#4edea3' : 'rgba(28, 43, 60, 0.10)',
              color: activeFilters.includes(option.value) ? '#003824' : '#bbcabf',
              borderColor: activeFilters.includes(option.value) ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
              boxShadow: activeFilters.includes(option.value) ? '0 8px 16px rgba(78, 222, 163, 0.2)' : 'none',
            }}
          >
            {option.label}
          </button>
        ))}
      </section>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
          <Sparkles size={48} className="spin-slow" color="#10b981" />
          <h3 style={{ fontWeight: '800', opacity: 0.65 }}>Fit tarifler hazirlaniyor...</h3>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px', color: '#dc2626' }}>{error}</div>
      ) : (
        <>
          <div style={{ marginBottom: '1.25rem', fontSize: '1rem', fontWeight: '800', color: 'var(--text-secondary)' }}>
            {visibleRecipes.length} tarif gosteriliyor
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
            {visibleRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isFavorite={favorites?.includes?.(Number(recipe.id))}
                onFavorite={async (event, id) => {
                  event.stopPropagation();
                  if (toggleFavorite) {
                    try {
                      await toggleFavorite(id);
                    } catch (err) {
                      alert(err.message || 'Favori güncellenemedi.');
                    }
                  }
                }}
                onClick={(recipe) => navigate(`/recipe/${recipe.id}`, { state: { matchScore: recipe.score } })}
              />
            ))}
          </div>

          {!visibleRecipes.length && (
            <div style={{ textAlign: 'center', padding: '90px 0', opacity: 0.65 }}>
              <PackageOpen size={58} style={{ marginBottom: '16px' }} />
              <h2>Fit tarif bulunamadi</h2>
              <p>Filtreleri gevsetebilir veya malzeme secimini degistirebilirsin.</p>
            </div>
          )}
        </>
      )}
      </div>

    </Layout>
  );
};

export default HealthyResults;
