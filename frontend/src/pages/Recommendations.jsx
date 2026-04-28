import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  MoveRight,
  PackageOpen,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';

import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import { RECIPE_FILTER_OPTIONS, applyRecipeFilters, getHealthGrade, getHealthTone } from '../utils/recipeInsights';

const Recommendations = () => {
  const { fetchRecommendedRecipes, selectedIngredients } = useApp();
  const [recipes, setRecipes] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchRecommendedRecipes({
          cooking_type: activeFilters.filter((item) => ['firin', 'tava', 'tencere'].includes(item)),
          exclude_disliked: activeFilters.includes('excludeDisliked'),
        });

        const filtered = applyRecipeFilters(
          data,
          activeFilters.filter((item) => item !== 'excludeDisliked')
        );

        setRecipes(filtered);
      } catch {
        setError('Öneriler alınırken hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [activeFilters, fetchRecommendedRecipes]);

  const toggleFilter = (value) => {
    setActiveFilters((prev) => (
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    ));
  };

  const headerText = useMemo(() => {
    return `Seçtiğin ${selectedIngredients.length} malzemeyle eşleşen ${recipes.length} tarif bulundu.`;
  }, [recipes.length, selectedIngredients.length]);

  return (
    <Layout>
      <header style={{ marginBottom: '3rem', animation: 'fadeInDown 0.6s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div
            style={{
              background: 'rgba(255, 159, 67, 0.1)',
              color: '#ff9f43',
              padding: '8px 16px',
              borderRadius: '99px',
              fontSize: '0.85rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={16} fill="currentColor" />
            AKILLI EŞLEŞTİRME
          </div>
        </div>

        <h1
          style={{
            fontSize: '2.55rem',
            fontWeight: '950',
            color: 'var(--text-primary)',
            letterSpacing: '-0.04em',
            marginBottom: '12px',
            lineHeight: 1.05,
          }}
        >
          Sana Özel
          <br />
          Tarif Önerileri
        </h1>

        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '680px', lineHeight: '1.6' }}>
          {headerText}
        </p>
      </header>

      {!selectedIngredients.length && (
        <div
          className="card"
          style={{
            marginBottom: '2rem',
            background: 'rgba(255, 71, 87, 0.05)',
            border: '1px solid rgba(255, 71, 87, 0.2)',
            color: '#ff4757',
            padding: '20px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
          }}
        >
          <PackageOpen size={24} />
          <p style={{ fontWeight: '700' }}>Henüz malzeme seçmedin. Önce malzeme seçerek öneri alabilirsin.</p>
        </div>
      )}

      <div
        className="no-scrollbar"
        style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '3rem', overflowX: 'auto', paddingBottom: '10px' }}
      >
        <div
          style={{
            padding: '10px 18px',
            background: 'var(--background-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: '0.85rem',
          }}
        >
            <Filter size={16} /> FİLTRELE
        </div>

        {RECIPE_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => toggleFilter(option.value)}
            style={{
              padding: '12px 28px',
              borderRadius: '16px',
              border: '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontWeight: '800',
              fontSize: '1rem',
              whiteSpace: 'nowrap',
              background: activeFilters.includes(option.value) ? 'var(--primary-color)' : 'var(--card-bg)',
              color: activeFilters.includes(option.value) ? 'white' : 'var(--text-secondary)',
              boxShadow: activeFilters.includes(option.value) ? '0 8px 20px rgba(108, 92, 231, 0.2)' : 'none',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '100px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <Sparkles size={54} className="spin-slow" color="var(--primary-color)" />
          <h3 style={{ fontWeight: '900', opacity: 0.6, letterSpacing: '1px' }}>ANALİZ EDİLİYOR...</h3>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px', color: '#ff4757', fontWeight: '700' }}>
          {error}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '2.5rem' }}>
          {recipes.map((recipe) => {
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
                  borderRadius: '36px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ height: '260px', position: 'relative', overflow: 'hidden' }}>
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      alt={recipe.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s' }}
                      className="card-thumb"
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%)',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Sparkles size={64} color="var(--primary-color)" style={{ opacity: 0.2 }} />
                    </div>
                  )}

                  <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(10px)',
                        padding: '8px 16px',
                        borderRadius: '14px',
                        fontSize: '0.8rem',
                        fontWeight: '950',
                        color: 'var(--primary-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      }}
                    >
                      <UtensilsCrossed size={14} />
                      {recipe.cooking_type || 'Kişiye Özel'}
                    </div>

                    <div
                      style={{
                        background: tone.bg,
                        color: tone.text,
                        padding: '8px 16px',
                        borderRadius: '14px',
                        fontSize: '0.8rem',
                        fontWeight: '900',
                      }}
                    >
                      {recipe.health_summary}
                    </div>
                  </div>

                  {recipe.score !== undefined && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '20px',
                        right: '20px',
                        background: 'var(--primary-color)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '18px',
                        fontSize: '1rem',
                        fontWeight: '950',
                        boxShadow: '0 10px 25px rgba(108, 92, 231, 0.3)',
                      }}
                    >
                      %{recipe.score} Uyum
                    </div>
                  )}
                </div>

                <div style={{ padding: '2.2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h3
                      style={{
                        fontSize: '1.7rem',
                        fontWeight: '950',
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.02em',
                        lineHeight: '1.2',
                        margin: 0,
                      }}
                    >
                      {recipe.name}
                    </h3>

                  </div>

                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '1.05rem',
                      lineHeight: '1.6',
                      marginBottom: '2.2rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {recipe.explanation || 'Seçtiğiniz malzemelerle hazırlayabileceğiniz özel bir tarif önerisi.'}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '2.2rem', marginTop: 'auto' }}>
                    <Metric label="Kalori" value={Math.round(recipe.calorie || 0)} color="#ff4757" />
                    <Metric label="Protein" value={`${Math.round(recipe.protein || 0)}g`} color="#1e90ff" />
                    <Metric label="Süre" value={`${recipe.total_time_minutes || 25}'`} color="var(--text-primary)" />
                    <Metric label="Kalite" value={grade.split(' ')[0]} color={tone.chip} />
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
                    {!!recipe.matched_ingredients?.length && (
                      <p style={{ color: 'var(--primary-color)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} /> {recipe.matched_ingredients.map((item) => item.name).slice(0, 4).join(', ')}
                      </p>
                    )}
                    {!!recipe.missing_ingredients?.length && (
                      <p style={{ color: '#ff4757', fontSize: '0.85rem', fontWeight: '600', opacity: 0.8 }}>
                        Eksik: {recipe.missing_ingredients.map((item) => item.name).slice(0, 3).join(', ')}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ color: 'var(--primary-color)', fontSize: '0.95rem', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      TARİFE GİT <MoveRight size={18} />
                    </div>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--background-elevated)', display: 'grid', placeItems: 'center', border: '1px solid var(--border-color)' }}>
                      <ArrowRight size={20} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !error && recipes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '100px 0', background: 'var(--card-bg)', borderRadius: '40px', border: '2px dashed var(--border-color)' }}>
          <PackageOpen size={80} style={{ marginBottom: '24px', opacity: 0.2, margin: '0 auto' }} />
          <h2 style={{ fontWeight: '900' }}>Şu an uygun tarif bulunamadı</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '10px auto 30px' }}>
            Farklı malzemeler seçerek ya da filtreleri gevşeterek yeni öneriler alabilirsin.
          </p>
          <button onClick={() => navigate('/select-ingredients')} className="primary-btn" style={{ padding: '15px 40px', borderRadius: '20px' }}>
            Malzeme Seçmeye Git
          </button>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .premium-recipe-card:hover {
              transform: translateY(-15px);
              border-color: var(--primary-color) !important;
              box-shadow: 0 40px 80px rgba(108, 92, 231, 0.12);
            }
            .premium-recipe-card:hover .card-thumb { transform: scale(1.1); }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .spin-slow { animation: spin 4s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-30px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `,
        }}
      />
    </Layout>
  );
};

const Metric = ({ label, value, color }) => (
  <div style={{ textAlign: 'center', padding: '14px', background: 'var(--background-elevated)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
    <div style={{ fontSize: '0.7rem', fontWeight: '800', opacity: 0.5, marginBottom: '4px' }}>{label.toUpperCase()}</div>
    <div style={{ fontSize: '1.1rem', fontWeight: '950', color }}>{value}</div>
  </div>
);

export default Recommendations;
