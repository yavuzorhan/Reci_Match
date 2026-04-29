import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Heart, Search, Trash2 } from 'lucide-react';
import { buildRecipeShortSummary } from '../utils/recipeInsights';

const FavoritesDb = () => {
  const { favorites, toggleFavorite, fetchRecipesByIds } = useApp();
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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
    const query = searchTerm.trim().toLocaleLowerCase('tr-TR');
    if (!query) return favoriteRecipes;

    return favoriteRecipes.filter((recipe) => {
      const title = (recipe.name || '').toLocaleLowerCase('tr-TR');
      const explanation = (recipe.explanation || '').toLocaleLowerCase('tr-TR');
      return title.includes(query) || explanation.includes(query);
    });
  }, [favoriteRecipes, searchTerm]);

  const removeFavorite = async (id, event) => {
    event.stopPropagation();
    try {
      await toggleFavorite(id);
    } catch (err) {
      alert(err.message || 'Favori kaldırılamadı.');
    }
  };

  return (
    <Layout>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>Favorilerim</h1>
        <p style={{ color: 'var(--text-secondary)' }}>En sevdiğiniz tariflere buradan hızlıca ulaşabilirsiniz.</p>
      </div>

      <div
        className="card"
        style={{
          marginBottom: '1.75rem',
          padding: '0.95rem 1.1rem',
          borderRadius: '22px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Search size={18} color="var(--text-secondary)" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Favorilerde ara"
          style={{
            margin: 0,
            padding: 0,
            border: 'none',
            boxShadow: 'none',
            background: 'transparent',
            fontSize: '1rem',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
        {filteredRecipes.map((recipe) => (
          <div
            key={recipe.id}
            className="card"
            onClick={() => navigate(`/recipe/${recipe.id}`)}
            style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
          >
            <div style={{ height: '180px', position: 'relative' }}>
              {recipe.image_url ? (
                <img src={recipe.image_url} alt={recipe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="recipe-image-fallback">
                  <div className="recipe-image-fallback-content">
                    <div className="recipe-image-fallback-badge">
                      <ChefHat size={14} />
                      <span>Favori Tarif</span>
                    </div>
                    <div className="recipe-image-fallback-title">{recipe.name}</div>
                    <div className="recipe-image-fallback-copy">
                      Kaydettiğin bu tarifi tek dokunuşla tekrar açabilirsin.
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={(event) => removeFavorite(recipe.id, event)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  padding: '10px',
                  borderRadius: '50%',
                  color: '#FF4757',
                  border: 'none',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>{recipe.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', height: '40px', overflow: 'hidden' }}>
                {buildRecipeShortSummary(recipe)}
              </p>
              <button className="primary-btn" style={{ width: '100%', padding: '10px' }}>
                Pişirmeye Başla
              </button>
            </div>
          </div>
        ))}

        {favoriteRecipes.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem 0', background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
            <Heart size={64} color="var(--border-color)" style={{ marginBottom: '20px' }} />
            <h3 style={{ color: 'var(--text-primary)' }}>Henüz favori tarifiniz yok.</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Tarif detay sayfasındaki kalp ikonuna basarak ekleyebilirsiniz.</p>
            <button className="primary-btn" onClick={() => navigate('/dashboard')} style={{ marginTop: '20px' }}>
              Dashboard'a Dön
            </button>
          </div>
        )}

        {favoriteRecipes.length > 0 && filteredRecipes.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
            <Heart size={56} color="var(--border-color)" style={{ marginBottom: '16px' }} />
            <h3 style={{ color: 'var(--text-primary)' }}>Aramana uygun favori bulunamadı.</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Farklı bir tarif adı ya da kelime deneyebilirsin.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FavoritesDb;
