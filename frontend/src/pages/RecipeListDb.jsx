import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Book,
  BookOpen,
  ChefHat,
  ChevronRight,
  Filter,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  UtensilsCrossed,
  PackageOpen,
} from 'lucide-react';

import Layout from '../components/Layout';
import AddRecipeForm from '../components/AddRecipeForm';
import { useApp } from '../context/AppContext';
import {
  RECIPE_FILTER_OPTIONS,
  applyRecipeFilters,
  buildRecipeShortSummary,
  getHealthGrade,
  getHealthTone,
} from '../utils/recipeInsights';

const RecipeListDb = () => {
  const { fetchAllRecipes, fetchRecipeById, deleteCustomRecipe, user, dislikedIngredients } = useApp();
  const [recipes, setRecipes] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecipe, setEditingRecipe] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'add' || activeTab === 'edit') return;

    const run = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchAllRecipes();
        let filtered = activeTab === 'mine'
          ? data.filter((recipe) => recipe.user_id === user?.id)
          : data;

        filtered = applyRecipeFilters(
          filtered,
          activeFilters,
          { dislikedIngredientIds: dislikedIngredients }
        );

        if (searchTerm.trim()) {
          const needle = searchTerm.trim().toLowerCase();
          filtered = filtered.filter((item) => (item.name || '').toLowerCase().includes(needle));
        }

        setRecipes(filtered);
      } catch {
        setError('Tarifler yuklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [activeTab, activeFilters, dislikedIngredients, fetchAllRecipes, searchTerm, user]);

  const toggleFilter = (value) => {
    setActiveFilters((prev) => (
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    ));
  };

  const refreshMine = () => {
    setEditingRecipe(null);
    setActiveTab('mine');
  };

  const handleEditRecipe = async (event, recipeId) => {
    event.stopPropagation();
    setLoading(true);
    setError('');
    try {
      const detail = await fetchRecipeById(recipeId);
      setEditingRecipe(detail);
      setActiveTab('edit');
    } catch {
      setError('Tarif duzenleme icin yuklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async (event, recipeId) => {
    event.stopPropagation();
    if (!window.confirm('Bu tarifi silmek istiyor musunuz?')) return;
    setLoading(true);
    setError('');
    try {
      await deleteCustomRecipe(recipeId);
      setRecipes((prev) => prev.filter((item) => item.id !== recipeId));
    } catch {
      setError('Tarif silinemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <nav
        style={{
          display: 'inline-flex',
          background: 'var(--background-elevated)',
          padding: '5px',
          borderRadius: '18px',
          border: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'all', label: 'Tüm Tarifler', icon: <BookOpen size={17} /> },
          { id: 'mine', label: 'Kendi Tariflerim', icon: <Book size={17} /> },
          { id: 'add', label: 'Yeni Ekle', icon: <PlusCircle size={17} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontWeight: '800',
              fontSize: '0.9rem',
              background: activeTab === tab.id ? 'var(--primary-color)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'add' ? (
        <section className="card" style={{ padding: '2.2rem', borderRadius: '28px' }}>
          <AddRecipeForm onSuccess={() => setActiveTab('mine')} onCancel={() => setActiveTab('all')} />
        </section>
      ) : activeTab === 'edit' && editingRecipe ? (
        <section className="card" style={{ padding: '2.2rem', borderRadius: '28px' }}>
          <AddRecipeForm
            initialRecipe={editingRecipe}
            onSuccess={refreshMine}
            onCancel={refreshMine}
          />
        </section>
      ) : (
        <>
          <section style={{ display: 'grid', gap: '1rem', marginBottom: '1.8rem' }}>
            <div
              className="card search-bar-wrap"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0.15rem 1rem',
                borderRadius: '18px',
                border: '1px solid var(--border-color)',
                background: 'var(--background-elevated)',
                maxWidth: '420px',
              }}
            >
              <Search size={18} color="var(--primary-color)" />
              <input
                type="text"
                placeholder="Tarif ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  padding: '10px 0',
                  border: 'none',
                  background: 'transparent',
                  width: '100%',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  marginBottom: 0,
                }}
              />
            </div>

            <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
              <div style={{ padding: '9px 14px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.8rem' }}>
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
                    background: activeFilters.includes(option.value) ? 'var(--primary-color)' : 'var(--card-bg)',
                    color: activeFilters.includes(option.value) ? 'white' : 'var(--text-secondary)',
                    borderColor: activeFilters.includes(option.value) ? 'transparent' : 'var(--border-color)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '90px 0' }}>
              <h3 style={{ fontWeight: '800', opacity: 0.6 }}>Tarifler yükleniyor...</h3>
            </div>
          ) : error ? (
            <div className="card">{error}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
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
                      borderRadius: '28px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ height: '230px', position: 'relative', overflow: 'hidden' }}>
                      {recipe.image_url ? (
                        <img src={recipe.image_url} alt={recipe.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s' }} className="card-thumb" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', display: 'grid', placeItems: 'center' }}>
                          <ChefHat size={56} color="var(--primary-color)" style={{ opacity: 0.2 }} />
                        </div>
                      )}

                      <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: '900', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UtensilsCrossed size={13} />
                          {recipe.cooking_type || 'Diğer'}
                        </div>
                      </div>
                      {activeTab === 'mine' && (
                        <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '8px', zIndex: 2 }}>
                          <button
                            type="button"
                            aria-label="Tarifi düzenle"
                            title="Tarifi düzenle"
                            onClick={(event) => handleEditRecipe(event, recipe.id)}
                            style={{ width: '36px', height: '36px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.94)', color: 'var(--primary-color)', display: 'grid', placeItems: 'center', boxShadow: '0 10px 24px rgba(0,0,0,0.12)' }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            aria-label="Tarifi sil"
                            title="Tarifi sil"
                            onClick={(event) => handleDeleteRecipe(event, recipe.id)}
                            style={{ width: '36px', height: '36px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.94)', color: '#dc2626', display: 'grid', placeItems: 'center', boxShadow: '0 10px 24px rgba(0,0,0,0.12)' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '1.6rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ marginBottom: '10px' }}>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: '950', color: 'var(--text-primary)', lineHeight: '1.2', margin: 0 }}>
                          {recipe.name}
                        </h3>
                      </div>

                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.55', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {buildRecipeShortSummary(recipe)}
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: 'auto', marginBottom: '1.5rem' }}>
                        <Metric label="Kalori" value={Math.round(recipe.calorie || 0)} color="#ef4444" />
                        <Metric label="Protein" value={`${Math.round(recipe.protein || 0)}g`} color="#3b82f6" />
                        <Metric label="Süre" value={`${recipe.total_time_minutes || 25}'`} color="var(--text-primary)" />
                        <Metric label="Kalite" value={grade.split(' ')[0]} color={tone.chip} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <BookOpen size={16} /> Tarifi İncele
                        </div>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--background-elevated)', display: 'grid', placeItems: 'center', border: '1px solid var(--border-color)' }}>
                          <ChevronRight size={18} />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {recipes.length === 0 && (
                <div style={{ textAlign: 'center', padding: '80px 0', opacity: 0.6, gridColumn: '1 / -1' }}>
                  <PackageOpen size={60} style={{ marginBottom: '18px', margin: '0 auto' }} />
                  <h2>Henüz Tarif Bulunmuyor</h2>
                  <p>Aramanı değiştirebilir veya ilk tarifini sen ekleyebilirsin.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .premium-recipe-card:hover {
              transform: translateY(-10px);
              border-color: var(--primary-color) !important;
              box-shadow: 0 24px 48px rgba(0,0,0,0.08);
            }
            .premium-recipe-card:hover .card-thumb { transform: scale(1.08); }
            .search-bar-wrap:focus-within {
              border-color: var(--primary-color) !important;
              box-shadow: 0 8px 18px rgba(217, 154, 43, 0.08) !important;
            }
            .no-scrollbar::-webkit-scrollbar { display: none; }
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

export default RecipeListDb;
