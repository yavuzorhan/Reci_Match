import React, { useEffect, useMemo, useState } from 'react';
import './FavoritesDb.css';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Heart, Search, ChefHat, Flame, Utensils } from 'lucide-react';
import { buildRecipeShortSummary, getHealthMeta } from '../utils/recipeInsights';

const FavoritesDb = () => {
  const { favorites, toggleFavorite, fetchRecipesByIds } = useApp();
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tümü');
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      if (!favorites.length) {
        setFavoriteRecipes([]);
        return;
      }

      try {
        const data = await fetchRecipesByIds(favorites);
        setFavoriteRecipes(data);
      } catch {
        setFavoriteRecipes([]);
      }
    };

    run();
  }, [favorites, fetchRecipesByIds]);

  const filteredRecipes = useMemo(() => {
    let result = favoriteRecipes;
    
    // Search
    const query = searchTerm.trim().toLocaleLowerCase('tr-TR');
    if (query) {
      result = result.filter((recipe) => {
        const title = (recipe.name || '').toLocaleLowerCase('tr-TR');
        const explanation = (recipe.explanation || '').toLocaleLowerCase('tr-TR');
        return title.includes(query) || explanation.includes(query);
      });
    }

    // Filter
    if (activeFilter !== 'Tümü') {
      if (activeFilter === 'Yüksek Protein') {
        result = result.filter(r => (r.protein || 0) >= 20);
      } else if (activeFilter === 'Düşük Kalori') {
        result = result.filter(r => (r.calorie || 0) < 400 && r.calorie > 0);
      } else if (activeFilter === '30 dk altı') {
        result = result.filter(r => {
          const time = r.total_time_minutes || r.preparation_time_minutes || 0;
          return time > 0 && time <= 30;
        });
      } else {
        // match cooking_type like Tavada, Fırında, vs.
        result = result.filter(r => (r.cooking_type || '').toLowerCase().includes(activeFilter.toLowerCase().replace('da', '').replace('de', '')));
      }
    }

    return result;
  }, [favoriteRecipes, searchTerm, activeFilter]);

  const handleFavoriteToggle = async (event, id) => {
    event.stopPropagation();
    try {
      await toggleFavorite(id);
    } catch (err) {
      alert(err.message || 'Favori kaldırılamadı.');
    }
  };

  const filters = [
    'Tümü', 'Yüksek Protein', 'Düşük Kalori', '30 dk altı', 
    'Tavada', 'Fırında', 'Tencerede', 'Airfryer'
  ];

  const getCookingIcon = (type) => {
    const lower = (type || '').toLowerCase();
    if (lower.includes('tava')) return <Utensils size={14} />;
    if (lower.includes('fırın')) return <ChefHat size={14} />;
    if (lower.includes('çiğ') || lower.includes('ateş')) return <Flame size={14} />;
    return <ChefHat size={14} />; // Default / Tencere
  };

  return (
    <Layout>
      <div className="fav-wrapper">
        <header className="fav-header">
          <div className="fav-title-row">
            <h1 className="fav-title">Favoriler</h1>
            <span className="fav-count">{favorites.length} Favori</span>
          </div>
          <p className="fav-desc">Beğendiğiniz tarifleri kaydedin ve daha sonra kolayca tekrar ulaşın.</p>
        </header>

        <section className="fav-search-card">
          <div className="fav-search-row">
            <div className="fav-search-input-wrapper">
              <Search size={20} className="fav-search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Favori tariflerde ara..."
                className="fav-search-input"
              />
            </div>
            <div className="fav-filters">
              {filters.map(filter => (
                <button
                  key={filter}
                  className={`fav-filter-btn ${activeFilter === filter ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="fav-grid">
          {filteredRecipes.map((recipe) => {
            const healthMeta = getHealthMeta(recipe);
            return (
              <article key={recipe.id} className="fav-card" onClick={() => navigate(`/recipe/${recipe.id}`)} style={{ cursor: 'pointer' }}>
                <div className="fav-card-image-wrapper">
                  <img
                    alt={recipe.name}
                    className="fav-card-image"
                    src={recipe.image_url || 'https://via.placeholder.com/400?text=Tarif+Görseli'}
                  />
                  <div className="fav-card-heart" onClick={(e) => handleFavoriteToggle(e, recipe.id)}>
                    <Heart size={20} fill="#FC7C78" stroke="#FC7C78" />
                  </div>
                  <div className="fav-card-badges">
                    {(recipe.match_score || recipe.score) && (
                      <span className="fav-badge-match">{Math.round(recipe.match_score || recipe.score)}% Eşleşme</span>
                    )}
                    {recipe.cooking_type && (
                      <span className="fav-badge-type">
                        {getCookingIcon(recipe.cooking_type)} {recipe.cooking_type}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="fav-card-content">
                  <h3 className="fav-card-title">{recipe.name}</h3>
                  <p className="fav-card-desc">{buildRecipeShortSummary(recipe) || recipe.explanation || 'Bu harika tarifi denemelisiniz.'}</p>
                  
                  <div className="fav-metrics-grid">
                    <div className="fav-metric">
                      <div className="fav-metric-val">{Math.round(recipe.calorie || 0)}</div>
                      <div className="fav-metric-lbl">Kalori</div>
                    </div>
                    <div className="fav-metric">
                      <div className="fav-metric-val">{Math.round(recipe.protein || 0)}g</div>
                      <div className="fav-metric-lbl">Protein</div>
                    </div>
                    <div className="fav-metric">
                      <div className="fav-metric-val">{recipe.total_time_minutes || recipe.preparation_time_minutes || 25}'</div>
                      <div className="fav-metric-lbl">Süre</div>
                    </div>
                    <div className="fav-metric">
                      <div className="fav-metric-val fav-metric-val-quality" style={{ color: healthMeta.tone.chip }}>
                        {healthMeta.display}
                      </div>
                      <div className="fav-metric-lbl">Kalite</div>
                    </div>
                  </div>
                  
                  <div className="fav-actions">
                    <button className="fav-btn-view" onClick={(e) => { e.stopPropagation(); navigate(`/recipe/${recipe.id}`); }}>
                      Tarifi İncele
                    </button>
                    <button className="fav-btn-remove" onClick={(e) => handleFavoriteToggle(e, recipe.id)}>
                      Favoriden Çıkar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {favoriteRecipes.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem 0', backgroundColor: 'rgba(39, 54, 71, 0.4)', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Heart size={64} fill="rgba(252, 124, 120, 0.2)" stroke="rgba(252, 124, 120, 0.5)" style={{ marginBottom: '20px', margin: '0 auto' }} />
              <h3 style={{ color: '#d4e4fa', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Henüz favori tarifiniz yok.</h3>
              <p style={{ color: '#bbcabf', marginBottom: '1.5rem' }}>Tarif detay sayfasındaki kalp ikonuna basarak ekleyebilirsiniz.</p>
              <button className="fav-btn-view" style={{ width: 'auto', padding: '0.75rem 2rem' }} onClick={() => navigate('/dashboard')}>
                Dashboard'a Dön
              </button>
            </div>
          )}

          {favoriteRecipes.length > 0 && filteredRecipes.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem 0', backgroundColor: 'rgba(39, 54, 71, 0.4)', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Search size={56} color="rgba(187, 202, 191, 0.4)" style={{ marginBottom: '16px', margin: '0 auto' }} />
              <h3 style={{ color: '#d4e4fa', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Aramana uygun favori bulunamadı.</h3>
              <p style={{ color: '#bbcabf' }}>Farklı bir arama terimi veya filtre seçeneği deneyebilirsin.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FavoritesDb;
