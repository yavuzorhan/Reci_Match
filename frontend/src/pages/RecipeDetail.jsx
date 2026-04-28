import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Clock, 
  Flame, 
  CheckCircle, 
  ArrowLeft, 
  Utensils,
  Dna,
  Info,
  Activity
} from 'lucide-react';

const RecipeDetail = () => {
  const { id } = useParams();
  const { 
    favorites, 
    toggleFavorite, 
    addDailyLog, 
    fetchRecipeById,
    recipeCache
  } = useApp();
  
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingToLog, setAddingToLog] = useState(false);

  useEffect(() => {
    const loadRecipe = async () => {
      setLoading(true);
      try {
        const data = await fetchRecipeById(id);
        setRecipe(data);
      } catch (err) {
        console.error("Recipe load error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadRecipe();
  }, [id, fetchRecipeById]);

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'grid', placeItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
          Yükleniyor...
        </div>
      </Layout>
    );
  }

  if (!recipe) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Info size={48} style={{ opacity: 0.2, marginBottom: '20px' }} />
          <h2>Tarif bulunamadı.</h2>
          <button onClick={() => navigate(-1)} className="primary-btn" style={{ marginTop: '20px' }}>Geri Dön</button>
        </div>
      </Layout>
    );
  }

  const isFavorite = favorites.includes(recipe.id);

  const handleMarkAsDone = async () => {
    setAddingToLog(true);
    try {
      await addDailyLog({ 
        recipeId: recipe.id,
        mealType: 'Akşam Yemeği',
        servingCount: 1
      });
      alert("Afiyet olsun! Günlük kaydına bugün için eklendi.");
    } catch (err) {
      alert(err.message || "Eklenirken bir sorun oluştu.");
    } finally {
      setAddingToLog(false);
    }
  };

  return (
    <Layout>
      <div className="recipe-detail-root" style={{ animation: 'fadeIn 0.5s ease-out' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontWeight: '800', cursor: 'pointer' }}>
          <ArrowLeft size={18} /> Geri Dön
        </button>

        <div className="recipe-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
          
          <div className="recipe-main-card card" style={{ padding: 0, overflow: 'hidden', borderRadius: '32px' }}>
            <div style={{ position: 'relative' }}>
              <img src={recipe.image_url} alt={recipe.name} style={{ width: '100%', height: '450px', objectFit: 'cover' }} />
              <button 
                onClick={() => toggleFavorite(recipe.id)}
                style={{ 
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: isFavorite ? '#F43F5E' : 'rgba(255,255,255,0.9)', 
                  color: isFavorite ? 'white' : '#F43F5E',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '18px',
                  cursor: 'pointer',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                  display: 'grid',
                  placeItems: 'center'
                }}>
                <Heart size={24} fill={isFavorite ? 'white' : 'none'} />
              </button>
            </div>

            <div style={{ padding: '3rem' }}>
              <h1 style={{ fontSize: '2.8rem', fontWeight: '900', marginBottom: '1rem', color: 'var(--text-primary)' }}>{recipe.name}</h1>
              
              <div style={{ display: 'flex', gap: '20px', marginBottom: '2.5rem' }}>
                <span className="recipe-tag" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', padding: '6px 16px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: '700' }}>
                  {recipe.category || 'Genel'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  <Clock size={16} /> {recipe.prep_time} dk
                </span>
              </div>

              <div className="section-title" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '900' }}>Hazırlanış Adımları</h3>
              </div>
              
              <div className="preparation-content" style={{ color: 'var(--text-primary)', lineHeight: '1.8', fontSize: '1.1rem' }}>
                {(recipe.preparation || '').split('\r\n').map((step, i) => step.trim() && (
                  <div key={i} style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: '800', fontSize: '0.9rem' }}>
                      {i + 1}
                    </div>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="recipe-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div className="card" style={{ borderRadius: '24px', padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={20} color="var(--primary-color)" /> Besin Değerleri
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                 {[
                   { label: 'Kalori', val: `${recipe.calorie} kcal`, icon: <Flame size={14} />, col: '#EF4444' },
                   { label: 'Protein', val: `${recipe.protein}g`, icon: <Activity size={14} />, col: '#3B82F6' },
                   { label: 'Karb.', val: `${recipe.carbohydrate}g`, icon: <Dna size={14} />, col: '#10B981' },
                   { label: 'Yağ', val: `${recipe.fat}g`, icon: <Activity size={14} />, col: '#F59E0B' }
                 ].map(stat => (
                   <div key={stat.label} style={{ background: 'var(--background-elevated)', padding: '15px', borderRadius: '18px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}>{stat.label}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: stat.col }}>{stat.val}</div>
                   </div>
                 ))}
              </div>
            </div>

            <div className="card" style={{ borderRadius: '24px', padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Utensils size={20} color="var(--primary-color)" /> Malzemeler
              </h3>
              <div className="ingredients-list" style={{ display: 'grid', gap: '12px' }}>
                {recipe.recipe_ingredients?.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--background-elevated)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{item.ingredient.name}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>{item.amount} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={handleMarkAsDone} 
              disabled={addingToLog}
              className="primary-btn" 
              style={{ width: '100%', padding: '20px', borderRadius: '18px', fontSize: '1.1rem', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 15px 30px rgba(16, 185, 129, 0.25)' }}
            >
              <CheckCircle size={22} />
              {addingToLog ? 'Ekleniyor...' : 'Bugün Bunu Pişirdim!'}
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      ` }} />
    </Layout>
  );
};

export default RecipeDetail;
