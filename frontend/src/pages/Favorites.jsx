import React from 'react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import { recipes as allRecipes } from '../data/mockData';
import { useNavigate } from 'react-router-dom';
import { Heart, Trash2, ChevronRight } from 'lucide-react';

const Favorites = () => {
  const { favorites, setFavorites } = useApp();
  const navigate = useNavigate();
  
  const favoriteRecipes = allRecipes.filter(r => favorites.includes(r.id));

  const removeFavorite = (id, e) => {
    e.stopPropagation();
    setFavorites(prev => prev.filter(f => f !== id));
  };

  return (
    <Layout>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>Favorilerim ❤️</h1>
        <p style={{ color: 'var(--text-secondary)' }}>En sevdiğiniz tariflere buradan hızlıca ulaşabilirsiniz.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
        {favoriteRecipes.map(recipe => (
          <div 
            key={recipe.id} 
            className="card" 
            onClick={() => navigate(`/recipe/${recipe.id}`)}
            style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
            <div style={{ height: '180px', position: 'relative' }}>
              <img src={recipe.image_url} alt={recipe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button 
                onClick={(e) => removeFavorite(recipe.id, e)}
                style={{ 
                  position: 'absolute', top: '15px', right: '15px',
                  background: 'rgba(255, 255, 255, 0.9)', padding: '10px',
                  borderRadius: '50%', color: '#FF4757', border: 'none',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
                }}>
                <Trash2 size={18} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>{recipe.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', height: '40px', overflow: 'hidden' }}>
                {recipe.explanation}
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
            <button className="primary-btn" onClick={() => navigate('/dashboard')} style={{ marginTop: '20px' }}>Dashboard'a Dön</button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Favorites;
