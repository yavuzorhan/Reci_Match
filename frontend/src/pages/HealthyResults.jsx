import React, { useEffect, useMemo, useState } from 'react';
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
import { RECIPE_FILTER_OPTIONS, applyRecipeFilters, getHealthGrade, getHealthTone } from '../utils/recipeInsights';

const HealthyResults = () => {
  const { fetchHealthyRecipes, fetchRecommendedRecipes } = useApp();
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
              background: selectedMenuRecipeId === null ? '#10b981' : 'var(--card-bg)',
              color: selectedMenuRecipeId === null ? 'white' : 'var(--text-secondary)',
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
                background: selectedMenuRecipeId === recipe.id ? 'var(--primary-color)' : 'var(--card-bg)',
                color: selectedMenuRecipeId === recipe.id ? 'white' : 'var(--text-secondary)',
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
              background: activeFilters.includes(option.value) ? '#10b981' : 'var(--card-bg)',
              color: activeFilters.includes(option.value) ? 'white' : 'var(--text-secondary)',
              borderColor: activeFilters.includes(option.value) ? 'transparent' : 'var(--border-color)',
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
            {visibleRecipes.map((recipe) => {
              const tone = getHealthTone(recipe.health_score);
              const grade = getHealthGrade(recipe.health_score);

              return (
                <article
                  key={recipe.id}
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                  className="premium-recipe-card"
                  style={{
                    cursor: 'pointer',
                    background: 'var(--card-bg)',
                    borderRadius: '30px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ height: '240px', position: 'relative', overflow: 'hidden' }}>
                    {recipe.image_url ? (
                      <img src={recipe.image_url} alt={recipe.name} className="card-thumb" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', display: 'grid', placeItems: 'center' }}>
                        <Leaf size={56} color="#10b981" style={{ opacity: 0.22 }} />
                      </div>
                    )}

                    <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: '900', color: '#065f46' }}>
                        {recipe.cooking_type || 'Fit Tarif'}
                      </div>
                    </div>

                    <div style={{ position: 'absolute', bottom: '16px', right: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {recipe.score !== undefined && (
                        <div style={{ background: 'var(--primary-color)', color: 'white', padding: '10px 16px', borderRadius: '16px', fontSize: '0.95rem', fontWeight: '950' }}>
                          %{recipe.score} Uyum
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '1.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '1.45rem', fontWeight: '950', marginBottom: '10px', color: 'var(--text-primary)', lineHeight: '1.2' }}>
                      {recipe.name}
                    </h3>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', lineHeight: '1.55', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {recipe.explanation || 'Saglik odakli bir tarif onerisi.'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.4rem', marginTop: 'auto' }}>
                      <Metric label="Kalori" value={Math.round(recipe.calorie || 0)} color="#ef4444" />
                      <Metric label="Protein" value={`${Math.round(recipe.protein || 0)}g`} color="#2563eb" />
                      <Metric label="Sure" value={`${recipe.total_time_minutes || 0}'`} color="var(--text-primary)" />
                      <Metric label="Kalite" value={grade.split(' ')[0]} color={tone.chip} />
                    </div>

                    {!!recipe.matched_ingredients?.length && (
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1rem' }}>
                        <p style={{ color: '#059669', fontSize: '0.88rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={16} />
                          {recipe.matched_ingredients.map((item) => item.name).slice(0, 4).join(', ')}
                        </p>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ color: '#059669', fontSize: '0.88rem', fontWeight: '900' }}>
                        Tarife Git
                      </div>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--background-elevated)', display: 'grid', placeItems: 'center', border: '1px solid var(--border-color)' }}>
                        <ArrowRight size={18} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
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

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .premium-recipe-card:hover {
              transform: translateY(-10px);
              border-color: #10b981 !important;
              box-shadow: 0 24px 48px rgba(0, 0, 0, 0.08);
            }
            .premium-recipe-card:hover .card-thumb {
              transform: scale(1.08);
            }
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .spin-slow {
              animation: spin 4s linear infinite;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `,
        }}
      />
    </Layout>
  );
};

const Metric = ({ label, value, color }) => (
  <div style={{ textAlign: 'center', padding: '11px', background: 'var(--background-elevated)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
    <div style={{ fontSize: '0.64rem', fontWeight: '800', opacity: 0.5 }}>{label.toUpperCase()}</div>
    <div style={{ fontSize: '0.95rem', fontWeight: '900', color }}>{value}</div>
  </div>
);

export default HealthyResults;
