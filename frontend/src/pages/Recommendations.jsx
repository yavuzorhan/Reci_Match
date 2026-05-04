import React, { useEffect, useMemo, useState } from 'react';
import './Recommendations.css';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  MoveRight,
  PackageOpen,
  Sparkles,
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  Flame,
  Search
} from 'lucide-react';

import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import {
  RECIPE_FILTER_OPTIONS,
  applyRecipeFilters,
} from '../utils/recipeInsights';
import RecipeCard from '../components/RecipeCard';

const Recommendations = () => {
  const { fetchRecommendedRecipes, selectedIngredients, favorites, toggleFavorite } = useApp();
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
      <div className="noct-rec-container">
        {/* Header Section */}
        <header className="noct-header">
          <div className="noct-header-left">
            <div className="noct-badge">
              <Sparkles size={14} className="noct-glow-icon" />
              AKILLI EŞLEŞTİRME
            </div>
            <h1 className="noct-title">Sana Özel Öneriler</h1>
            <p className="noct-subtitle">{headerText}</p>
          </div>
          
          <div className="noct-header-right">
            <button onClick={() => navigate('/select-ingredients')} className="noct-back-btn">
              <ChevronLeft size={18} />
              Malzeme Seçimine Dön
            </button>
          </div>
        </header>

        {/* Filters Section */}
        <div className="noct-filters-row glass-panel">
          <div className="noct-filter-label">
            <Filter size={16} />
            <span>FİLTRELE</span>
          </div>
          <div className="noct-filter-list">
            {RECIPE_FILTER_OPTIONS.map((option) => {
              const isActive = activeFilters.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleFilter(option.value)}
                  className={`noct-filter-pill ${isActive ? 'is-active' : ''}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Section */}
        <div className="noct-content">
          {!selectedIngredients.length ? (
            <div className="noct-empty-warning glass-panel">
              <PackageOpen size={32} />
              <div className="noct-warning-text">
                <h3>Henüz malzeme seçmediniz</h3>
                <p>Öneri alabilmek için önce mutfağınızdaki malzemeleri seçmelisiniz.</p>
              </div>
              <button onClick={() => navigate('/select-ingredients')} className="noct-warning-btn">
                Malzeme Seç
              </button>
            </div>
          ) : loading ? (
            <div className="noct-loading-state">
              <div className="noct-loader">
                <Sparkles size={48} className="noct-spin-glow" />
              </div>
              <h3>Tarifler Analiz Ediliyor...</h3>
              <p>Mutfak kütüphanemiz taranıyor.</p>
            </div>
          ) : error ? (
            <div className="noct-error-state glass-panel">
              <p>{error}</p>
            </div>
          ) : recipes.length > 0 ? (
            <div className="noct-recipe-grid">
              {recipes.map((recipe) => (
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
          ) : (
            <div className="noct-no-results glass-panel">
              <Search size={64} opacity={0.1} />
              <h3>Şu an uygun tarif bulunamadı</h3>
              <p>Farklı malzemeler seçerek veya filtreleri değiştirerek tekrar deneyebilirsiniz.</p>
              <button onClick={() => navigate('/select-ingredients')} className="noct-primary-btn">
                Malzemeleri Güncelle
              </button>
            </div>
          )}
        </div>
      </div>

    </Layout>
  );
};

export default Recommendations;
