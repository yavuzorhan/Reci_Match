import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Book,
  BookOpen,
  ChefHat,
  ChevronRight,
  Clock3,
  Filter,
  Flame,
  Heart,
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
} from '../utils/recipeInsights';
import RecipeCard from '../components/RecipeCard';



const RecipeListDb = () => {
  const {
    fetchAllRecipes,
    fetchRecipeById,
    deleteCustomRecipe,
    user,
    dislikedIngredients,
    favorites,
    toggleFavorite,
  } = useApp();
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
          const needle = searchTerm.trim().toLocaleLowerCase('tr-TR');
          filtered = filtered.filter((item) => (
            item.name || ''
          ).toLocaleLowerCase('tr-TR').includes(needle));
        }

        setRecipes(filtered);
      } catch {
        setError('Tarifler yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [activeTab, activeFilters, dislikedIngredients, fetchAllRecipes, searchTerm, user]);

  const visibleFilters = useMemo(() => RECIPE_FILTER_OPTIONS.slice(0, 9), []);

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
      setError('Tarif düzenleme için yüklenemedi.');
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

  const handleFavorite = async (event, recipeId) => {
    event.stopPropagation();
    await toggleFavorite(recipeId);
  };

  return (
    <Layout>
      <main className="recipes-noct">
        <div className="recipes-shell">
          <header className="recipes-header">
            <div>
              <div className="recipes-title-row">
                <h1>Tarifler</h1>
                <span>{recipes.length} tarif</span>
              </div>
              <p>Malzemelerine, hedeflerine ve beslenme tercihlerine uygun tarifleri keşfet.</p>
            </div>

            <nav className="recipes-tabs" aria-label="Tarif görünümü">
              {[
                { id: 'all', label: 'Tüm Tarifler', icon: <BookOpen size={17} /> },
                { id: 'mine', label: 'Kendi Tariflerim', icon: <Book size={17} /> },
                { id: 'add', label: 'Yeni Ekle', icon: <PlusCircle size={17} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? 'active' : ''}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </header>

          {activeTab === 'add' ? (
            <section className="recipes-glass recipes-form-panel">
              <AddRecipeForm onSuccess={() => setActiveTab('mine')} onCancel={() => setActiveTab('all')} />
            </section>
          ) : activeTab === 'edit' && editingRecipe ? (
            <section className="recipes-glass recipes-form-panel">
              <AddRecipeForm
                initialRecipe={editingRecipe}
                onSuccess={refreshMine}
                onCancel={refreshMine}
              />
            </section>
          ) : (
            <>
              <section className="recipes-glass recipes-search-panel">
                <div className="recipes-search-row">
                  <label className="recipes-search-box">
                    <Search size={20} />
                    <input
                      type="text"
                      placeholder="Tarif veya malzeme ara..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </label>
                  <button type="button" className="recipes-search-button">
                    Tarif Ara
                  </button>
                </div>

                <div className="recipes-filter-row">
                  <span className="recipes-filter-label">
                    <Filter size={15} />
                    Filtrele
                  </span>
                  {visibleFilters.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={activeFilters.includes(option.value) ? 'active' : ''}
                      onClick={() => toggleFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              {loading ? (
                <div className="recipes-state">Tarifler yükleniyor...</div>
              ) : error ? (
                <div className="recipes-glass recipes-state error">{error}</div>
              ) : (
                <section className="recipes-grid">
                  {recipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      isFavorite={favorites.includes(recipe.id)}
                      onFavorite={handleFavorite}
                      isOwner={activeTab === 'mine'}
                      onEdit={handleEditRecipe}
                      onDelete={handleDeleteRecipe}
                    />
                  ))}

                  {recipes.length === 0 && (
                    <div className="recipes-glass recipes-empty">
                      <PackageOpen size={54} />
                      <h2>Henüz tarif bulunmuyor</h2>
                      <p>Aramanı değiştirebilir veya ilk tarifini sen ekleyebilirsin.</p>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .layout-content:has(.recipes-noct) {
          padding: 0;
          background-color: #0c0814 !important;
          background-image:
            radial-gradient(circle at 10% 20%, rgba(100, 31, 224, 0.12) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(68, 226, 205, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(147, 0, 10, 0.03) 0%, transparent 60%) !important;
          color: #d4e4fa;
        }

        .recipes-noct {
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #d4e4fa;
        }

        .recipes-shell {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding: 40px 32px 56px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .recipes-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }

        .recipes-title-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .recipes-title-row h1 {
          margin: 0;
          color: #d4e4fa;
          font-size: clamp(2.2rem, 3.2vw, 3.1rem);
          line-height: 1.2;
          font-weight: 700;
          letter-spacing: 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .recipes-title-row span {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(78, 222, 163, 0.18);
          background: rgba(28, 43, 60, 0.42);
          color: #bbcabf;
          font-size: 12px;
          line-height: 1.1;
          font-weight: 800;
          text-transform: uppercase;
        }

        .recipes-header p {
          margin: 0;
          max-width: 720px;
          color: #bbcabf;
          font-size: 18px;
          line-height: 1.6;
        }

        .recipes-tabs {
          display: inline-flex;
          gap: 6px;
          padding: 5px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(18, 33, 49, 0.32);
        }

        .recipes-tabs button,
        .recipes-filter-row button,
        .recipes-search-button,
        .recipes-detail-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          font-family: inherit;
          font-weight: 800;
        }

        .recipes-tabs button {
          min-height: 42px;
          padding: 0 14px;
          border-radius: 10px;
          color: #bbcabf;
          background: transparent;
        }

        .recipes-tabs button.active {
          color: #003824;
          background: #4edea3;
        }

        .recipes-glass {
          background: rgba(28, 43, 60, 0.10);
          backdrop-filter: blur(48px);
          -webkit-backdrop-filter: blur(48px);
          border: 0.5px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
        }

        .recipes-form-panel,
        .recipes-search-panel {
          border-radius: 16px;
          padding: 24px;
        }

        .recipes-form-panel {
          color: var(--text-primary);
        }

        .recipes-search-panel {
          display: grid;
          gap: 16px;
        }

        .recipes-search-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
        }

        .recipes-search-box {
          position: relative;
          min-height: 48px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
          padding: 0 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(18, 33, 49, 0.46);
          color: #86948a;
        }

        .recipes-search-box:focus-within {
          border-color: rgba(78,222,163,0.42);
          box-shadow: 0 0 0 4px rgba(78,222,163,0.10);
        }

        .recipes-search-box input {
          width: 100%;
          margin: 0;
          padding: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #d4e4fa;
          font-size: 16px;
          font-weight: 650;
        }

        .recipes-search-box input::placeholder {
          color: rgba(187,202,191,0.64);
        }

        .recipes-search-button {
          min-height: 48px;
          padding: 0 24px;
          border-radius: 12px;
          background: #10b981;
          color: white;
          font-size: 15px;
        }

        .recipes-filter-row {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
        }

        .recipes-filter-row::-webkit-scrollbar {
          display: none;
        }

        .recipes-filter-label,
        .recipes-filter-row button {
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(18, 33, 49, 0.42);
          color: #bbcabf;
          white-space: nowrap;
          font-size: 14px;
        }

        .recipes-filter-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
        }

        .recipes-filter-row button.active {
          border-color: rgba(78,222,163,0.34);
          background: rgba(78,222,163,0.12);
          color: #4edea3;
        }

        .recipes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        .recipes-card {
          overflow: hidden;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease;
        }

        .recipes-card:hover {
          transform: translateY(-6px);
          border-color: rgba(78,222,163,0.28);
          box-shadow: 0 18px 44px rgba(0,0,0,0.34);
        }

        .recipes-card-media {
          position: relative;
          height: 224px;
          overflow: hidden;
          background: rgba(18,33,49,0.52);
        }

        .recipes-card-media img,
        .recipes-card-fallback {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.7s ease;
        }

        .recipes-card:hover .recipes-card-media img {
          transform: scale(1.06);
        }

        .recipes-card-fallback {
          display: grid;
          place-items: center;
          color: #4edea3;
          background:
            radial-gradient(circle at 20% 20%, rgba(78,222,163,0.12), transparent 40%),
            linear-gradient(145deg, #122131, #010f1f);
        }

        .recipes-media-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 42%, rgba(12,8,20,0.84));
          pointer-events: none;
        }

        .recipes-card-badges {
          position: absolute;
          left: 14px;
          bottom: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .recipes-card-badges span {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(18,33,49,0.78);
          color: #d4e4fa;
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
        }

        .recipes-card-badges .match-badge {
          border-color: rgba(78,222,163,0.32);
          background: #10b981;
          color: white;
        }

        .recipes-heart,
        .recipes-owner-actions button {
          position: absolute;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(12,8,20,0.42);
          color: #bbcabf;
          backdrop-filter: blur(16px);
        }

        .recipes-heart {
          top: 14px;
          right: 14px;
          width: 42px;
          height: 42px;
          border-radius: 12px;
        }

        .recipes-heart.active,
        .recipes-heart:hover {
          color: #ffb3af;
          border-color: rgba(255,179,175,0.26);
          background: rgba(252,124,120,0.12);
        }

        .recipes-owner-actions {
          position: absolute;
          top: 14px;
          right: 64px;
          display: flex;
          gap: 8px;
        }

        .recipes-owner-actions button {
          position: static;
          width: 36px;
          height: 36px;
          border-radius: 10px;
        }

        .recipes-card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
        }

        .recipes-card-body h2 {
          margin: 0 0 8px;
          color: #d4e4fa;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 20px;
          line-height: 1.25;
          font-weight: 750;
        }

        .recipes-card-body p {
          margin: 0;
          color: #bbcabf;
          font-size: 14px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .recipes-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-top: auto;
        }

        .recipes-metric {
          min-width: 0;
          display: grid;
          gap: 4px;
          justify-items: center;
          padding: 9px 7px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.05);
          background: rgba(18,33,49,0.42);
          text-align: center;
        }

        .recipes-metric small {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #bbcabf;
          font-size: 11px;
          line-height: 1.2;
          white-space: nowrap;
        }

        .recipes-metric strong {
          color: #d4e4fa;
          font-size: 14px;
          line-height: 1.2;
          font-weight: 850;
        }

        .recipes-detail-button {
          min-height: 44px;
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(78,222,163,0.18);
          background: rgba(78,222,163,0.08);
          color: #4edea3;
          font-size: 14px;
        }

        .recipes-state,
        .recipes-empty {
          min-height: 240px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 10px;
          border-radius: 16px;
          color: #bbcabf;
          text-align: center;
          font-weight: 800;
        }

        .recipes-state.error {
          color: #ffb4ab;
        }

        .recipes-empty {
          grid-column: 1 / -1;
          padding: 40px;
        }

        .recipes-empty svg {
          color: #4edea3;
        }

        .recipes-empty h2 {
          margin: 0;
          color: #d4e4fa;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .recipes-empty p {
          margin: 0;
          color: #bbcabf;
        }

        @media (max-width: 860px) {
          .recipes-shell {
            padding: 28px 16px 44px;
          }

          .recipes-search-row {
            grid-template-columns: 1fr;
          }

          .recipes-search-button {
            width: 100%;
          }

          .recipes-tabs {
            width: 100%;
            overflow-x: auto;
          }
        }
      ` }} />
    </Layout>
  );
};

export default RecipeListDb;
