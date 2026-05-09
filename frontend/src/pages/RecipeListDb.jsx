import React, { useEffect, useMemo, useState } from 'react';
import './RecipeListDb.css';
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
    } catch (err) {
      setError(err.message || 'Tarif silinemedi.');
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

    </Layout>
  );
};

export default RecipeListDb;
