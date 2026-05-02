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
  buildRecipeShortSummary,
  getHealthGrade,
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

      <style dangerouslySetInnerHTML={{ __html: `
        .layout-content:has(.noct-rec-container) {
          background-color: #0c0814 !important;
          background-image:
            radial-gradient(circle at 10% 20%, rgba(100, 31, 224, 0.12) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(68, 226, 205, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(147, 0, 10, 0.03) 0%, transparent 60%) !important;
          color: #d4e4fa;
          padding: 0;
        }

        .noct-rec-container {
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 32px 32px 60px;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .noct-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .noct-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 99px;
          color: #10b981;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          margin-bottom: 12px;
        }

        .noct-title {
          font-size: 40px;
          font-weight: 700;
          color: #d4e4fa;
          margin: 0;
          letter-spacing: -0.04em;
        }

        .noct-subtitle {
          color: #bbcabf;
          font-size: 18px;
          max-width: 700px;
          margin: 12px 0 0 0;
          line-height: 1.6;
        }

        .noct-back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 10px 20px;
          border-radius: 12px;
          color: #d4e4fa;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .noct-back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .glass-panel {
          background-color: rgba(28, 43, 60, 0.15);
          backdrop-filter: blur(48px);
          -webkit-backdrop-filter: blur(48px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          border-radius: 24px;
        }

        .noct-filters-row {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 16px 24px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .noct-filters-row::-webkit-scrollbar { display: none; }

        .noct-filter-label {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #bbcabf;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.05em;
          flex-shrink: 0;
        }

        .noct-filter-list {
          display: flex;
          gap: 10px;
        }

        .noct-filter-pill {
          padding: 10px 24px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: #bbcabf;
          font-weight: 700;
          font-size: 14px;
          white-space: nowrap;
          cursor: pointer;
          transition: 0.2s;
        }

        .noct-filter-pill:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #d4e4fa;
        }

        .noct-filter-pill.is-active {
          background: #10b981;
          color: #003824;
          border-color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        .noct-recipe-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 32px;
        }

        .noct-loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 0;
          gap: 20px;
        }

        .noct-spin-glow {
          color: #10b981;
          filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.5));
          animation: spin 4s linear infinite;
        }

        .noct-loading-state h3 {
          font-size: 24px;
          font-weight: 700;
          color: #d4e4fa;
          margin: 0;
        }

        .noct-loading-state p {
          color: #bbcabf;
          margin: 0;
        }

        .noct-empty-warning {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 32px;
          border-color: rgba(255, 179, 175, 0.2) !important;
          background: rgba(255, 179, 175, 0.05) !important;
        }

        .noct-warning-text h3 {
          font-size: 20px;
          font-weight: 600;
          color: #ffb3af;
          margin: 0;
        }

        .noct-warning-text p {
          color: #ffb3af;
          opacity: 0.8;
          margin: 4px 0 0 0;
        }

        .noct-warning-btn {
          margin-left: auto;
          background: #ffb3af;
          color: #650911;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .noct-no-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 40px;
          text-align: center;
          gap: 16px;
        }

        .noct-no-results h3 {
          font-size: 24px;
          font-weight: 600;
          color: #d4e4fa;
          margin: 10px 0 0 0;
        }

        .noct-no-results p {
          color: #bbcabf;
          max-width: 400px;
          margin: 0 0 20px 0;
        }

        .noct-primary-btn {
          background: #10b981;
          color: #003824;
          border: none;
          padding: 14px 32px;
          border-radius: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .noct-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }
          .noct-header-right { width: 100%; }
          .noct-back-btn { width: 100%; justify-content: center; }
          .noct-title { font-size: 32px; }
          .noct-subtitle { font-size: 16px; }
        }
      `}} />
    </Layout>
  );
};

export default Recommendations;
