import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Heart, Search, ChefHat, Flame, Utensils } from 'lucide-react';
import { buildRecipeShortSummary, getHealthGrade } from '../utils/recipeInsights';

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
            const grade = getHealthGrade(recipe.health_score || recipe.score);
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
                      <div className="fav-metric-val fav-metric-val-quality">{grade ? grade.split(' ')[0] : 'A'}</div>
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
      <style dangerouslySetInnerHTML={{ __html: `
        .layout-content:has(.fav-wrapper) {
          background-color: #0c0814 !important;
          background-image:
            radial-gradient(circle at 10% 20%, rgba(100, 31, 224, 0.12) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(68, 226, 205, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(147, 0, 10, 0.03) 0%, transparent 60%) !important;
          color: #d4e4fa;
          padding: 0;
        }

        .fav-wrapper {
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 32px 32px 40px;
          min-height: 100vh;
          width: 100%;
        }

        .fav-header {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .fav-title-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .fav-title {
          font-size: 32px;
          line-height: 1.25;
          font-weight: 600;
          color: #d4e4fa;
          margin: 0;
        }

        .fav-count {
          background-color: rgba(78, 222, 163, 0.1);
          color: #4edea3;
          border: 1px solid rgba(78, 222, 163, 0.2);
          padding: 4px 8px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .fav-desc {
          font-size: 18px;
          color: #bbcabf;
          line-height: 1.6;
          margin: 0;
        }

        .fav-search-card {
          background-color: rgba(28, 43, 60, 0.10);
          backdrop-filter: blur(48px);
          -webkit-backdrop-filter: blur(48px);
          border: 0.5px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 2.5rem;
        }

        .fav-search-row {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        @media (min-width: 768px) {
          .fav-search-row {
            flex-direction: row;
          }
        }

        .fav-search-input-wrapper {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
        }

        @media (min-width: 768px) {
          .fav-search-input-wrapper {
            width: 33.333%;
          }
        }

        .fav-search-icon {
          position: absolute;
          left: 24px;
          color: #86948a;
          pointer-events: none;
        }

        .fav-search-input {
          width: 100%;
          min-height: 64px;
          background-color: rgba(5, 20, 36, 0.60);
          border: 1px solid rgba(255, 255, 255, 0.10);
          color: #d4e4fa;
          border-radius: 16px;
          padding: 8px 8px 8px 56px;
          font-size: 18px;
          transition: all 0.2s;
          outline: none;
          box-shadow: inset 0 2px 12px rgba(0, 0, 0, 0.2);
        }

        .fav-search-input::placeholder {
          color: rgba(212, 228, 250, 0.72);
        }

        .fav-search-input:focus {
          border-color: #4edea3;
        }

        .fav-filters {
          width: 100%;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        @media (min-width: 768px) {
          .fav-filters {
            width: 66.666%;
          }
        }

        .fav-filter-btn {
          display: inline-flex;
          align-items: center;
          padding: 8px 16px;
          border-radius: 12px;
          background: rgba(18, 33, 49, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.10);
          color: #d4e4fa;
          font-size: 14px;
          font-weight: 600;
          backdrop-filter: blur(16px);
          cursor: pointer;
          transition: all 0.2s;
        }

        .fav-filter-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .fav-filter-btn.active {
          background: #4edea3;
          color: #003824;
          border-color: #4edea3;
        }

        .fav-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        @media (min-width: 768px) {
          .fav-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .fav-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .fav-card {
          background-color: rgba(28, 43, 60, 0.10);
          backdrop-filter: blur(48px);
          -webkit-backdrop-filter: blur(48px);
          border: 0.5px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s ease, border-color 0.3s ease;
          cursor: pointer;
        }

        .fav-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .fav-card-image-wrapper {
          position: relative;
          height: 256px;
          overflow: hidden;
        }

        .fav-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.7s ease;
        }

        .fav-card:hover .fav-card-image {
          transform: scale(1.05);
        }

        .fav-card-heart {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(12, 8, 20, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          color: #fc7c78;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 10;
        }

        .fav-card-heart:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.1);
        }

        .fav-card-badges {
          position: absolute;
          top: 16px;
          left: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 10;
        }

        .fav-badge-match {
          background: rgba(16, 185, 129, 0.9);
          color: #fff;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .fav-badge-type {
          background: rgba(12, 8, 20, 0.7);
          backdrop-filter: blur(8px);
          color: #d4e4fa;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border: 1px solid rgba(255, 255, 255, 0.1);
          width: fit-content;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .fav-card-content {
          padding: 24px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .fav-card-title {
          color: #d4e4fa;
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.3;
        }

        .fav-card-desc {
          color: #bbcabf;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 24px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .fav-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 24px;
        }

        .fav-metric {
          background: rgba(18, 33, 49, 0.3);
          border-radius: 8px;
          padding: 8px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .fav-metric-val {
          color: #d4e4fa;
          font-size: 15px;
          font-weight: 600;
        }

        .fav-metric-val-quality {
          color: #44e2cd;
        }

        .fav-metric-lbl {
          color: #86948a;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 4px;
        }

        .fav-actions {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .fav-btn-view {
          width: 100%;
          background: #4edea3;
          color: #003824;
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 12px 28px rgba(78, 222, 163, 0.20);
        }

        .fav-btn-view:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 32px rgba(78, 222, 163, 0.30);
        }

        .fav-btn-remove {
          width: 100%;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #bbcabf;
          min-height: 40px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .fav-btn-remove:hover {
          color: #ffb4ab;
          border-color: rgba(255, 180, 171, 0.3);
          background: rgba(255, 180, 171, 0.05);
        }
      ` }} />
    </Layout>
  );
};

export default FavoritesDb;
