import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Filter, Users, Flame, ChevronRight } from 'lucide-react';

const RecipeList = () => {
  const { getRecommendedRecipes, selectedIngredients, dislikedIngredients } = useApp();
  const [activeFilters, setActiveFilters] = useState([]);
  const navigate = useNavigate();

  const filterOptions = [
    { label: '30 dk Altı', value: 'fast' },
    { label: 'Fırında', value: 'fırında' },
    { label: 'Tavada', value: 'tavada' },
    { label: 'Tencerede', value: 'tencerede' },
    { label: 'Pratik', value: 'practical' },
    { label: 'Sevilmeyenleri Çıkar', value: 'excludeDisliked' }
  ];

  const filters = {
    cooking_type: activeFilters.filter(f => ['fırında', 'tavada', 'tencerede'].includes(f)),
    exclude_disliked: activeFilters.includes('excludeDisliked')
  };

  const recipes = getRecommendedRecipes(selectedIngredients, dislikedIngredients, filters);

  const toggleFilter = (val) => {
    setActiveFilters(prev =>
      prev.includes(val) ? prev.filter(f => f !== val) : [...prev, val]
    );
  };

  return (
    <Layout>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>Önerilen Tarifler</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Elinizdeki malzemelerle en uyumlu tarifler aşağıda sıralanmıştır.</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', background: 'white', borderRadius: '12px', border: '1px solid #EEE' }}>
          <Filter size={18} color="var(--primary-color)" />
          <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>Filtrele:</span>
        </div>

        {filterOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => toggleFilter(opt.value)}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              border: `1px solid ${activeFilters.includes(opt.value) ? 'var(--primary-color)' : '#EEE'}`,
              background: activeFilters.includes(opt.value) ? 'var(--primary-color)' : 'white',
              color: activeFilters.includes(opt.value) ? 'white' : 'var(--text-secondary)',
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
        {recipes.map(recipe => (
          <div
            key={recipe.id}
            className="card"
            onClick={() => navigate(`/recipe/${recipe.id}`)}
            style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
          >
            <div style={{ height: '220px', position: 'relative' }}>
              <img src={recipe.image_url} alt={recipe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', top: '15px', right: '15px',
                background: 'rgba(255, 255, 255, 0.9)', padding: '8px 15px',
                borderRadius: '50px', fontWeight: '700', color: 'var(--primary-color)',
                boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
              }}>
                %{recipe.score} Uyumluluk
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '1.4rem' }}>{recipe.name}</h3>
                <span style={{ fontSize: '0.8rem', color: '#636E72', background: '#EEE', padding: '4px 10px', borderRadius: '10px', textTransform: 'capitalize' }}>
                  {recipe.cooking_type}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {recipe.explanation}
              </p>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: '#636E72' }}>
                  <Users size={16} /> {recipe.serving} Kişi
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: '#636E72' }}>
                  <Flame size={16} /> {recipe.calorie} kcal
                </div>
              </div>

              <button className="primary-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Detaya Git <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ))}

        {recipes.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem 0', background: 'white', borderRadius: '20px' }}>
            <ShoppingBasket size={64} color="#CCC" style={{ marginBottom: '20px' }} />
            <h3>Maalesef uygun tarif bulamadık.</h3>
            <p>Farklı malzemeler seçmeyi deneyin.</p>
            <button className="primary-btn" onClick={() => navigate('/select-ingredients')} style={{ marginTop: '20px' }}>Malzeme Seçimine Dön</button>
          </div>
        )}
      </div>
    </Layout>
  );
};

const ShoppingBasket = ({ size, color, style }) => (
  <svg style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 11 4-7"></path><path d="m19 11-4-7"></path><path d="M2 11h20"></path><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"></path><path d="m9 11 1 9"></path><path d="m15 11-1 9"></path></svg>
);

export default RecipeList;
