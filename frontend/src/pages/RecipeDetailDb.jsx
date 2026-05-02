import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  ChefHat,
  Flame,
  Heart,
  Leaf,
  LineChart,
  Minus,
  Plus,
  Users,
  Clock,
  Activity,
  Dna,
  Info,
  Pencil,
  Utensils
} from 'lucide-react';

import Layout from '../components/Layout';
import RecipeRevisionModal from '../components/RecipeRevisionModal';
import { useApp } from '../context/AppContext';
import { getHealthGrade, getHealthTone, stripHtml } from '../utils/recipeInsights';

const splitPreparationSteps = (value) => {
  const cleaned = stripHtml(value)
    .replace(/\r/g, '')
    .replace(/\n+/g, '\n')
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(/\n+|(?<=[.!?])\s+/)
    .map((step) => step.trim())
    .filter(Boolean);
};

const getHealthLabels = (recipe) => {
  const labels = [];
  if (!recipe) return labels;

  const isMain = recipe.recipe_category === 'Ana Yemek';
  const carbLimit = isMain ? 25 : 20;
  const proteinLimit = isMain ? 25 : 15;
  const calorieLimit = recipe.recipe_category === 'Ana Yemek'
    ? 550
    : recipe.recipe_category === 'Kahvaltı'
      ? 400
      : 250;

  if (recipe.carbohydrate != null && recipe.carbohydrate <= carbLimit) {
    labels.push('Düşük Karbonhidrat');
  }
  if (recipe.protein != null && recipe.protein >= proteinLimit) {
    labels.push('Yüksek Protein');
  }
  if (recipe.calorie != null && recipe.calorie <= calorieLimit) {
    labels.push('Düşük Kalori');
  }

  return labels;
};

const getQualityLabel = (grade) => ({
  A: 'Çok iyi seçenek',
  B: 'İyi bir seçenek',
  C: 'Dengeli tüketilmeli',
  D: 'Dikkatli tüketilmeli',
}[grade] || 'Kalite bilgisi');

const getQualityRationale = (recipe, grade) => {
  const summary = stripHtml(recipe?.health_summary || recipe?.health_explanation || '');
  const cleaned = summary
    .replace(/^[ABCD]\s*kalite\s*\(\d+\/100\)\.?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned) return cleaned;

  return `${recipe?.name || 'Bu tarif'} besin değerleri, kalori miktarı ve makro dağılımı birlikte değerlendirilerek ${grade} kalite aldı.`;
};

const getQualityPoints = (recipe, grade) => {
  const calorie = Number(recipe?.calorie || 0);
  const protein = Number(recipe?.protein || 0);
  const carbs = Number(recipe?.carbohydrate || 0);
  const fat = Number(recipe?.fat || 0);

  const positives = [];
  const cautions = [];

  if (protein >= 25) positives.push('Protein oranı yüksek');
  else if (protein >= 12) positives.push('Protein desteği var');

  if (calorie > 0 && calorie <= 550) positives.push('Kalori değeri kontrollü');
  if (recipe?.cooking_type) positives.push(`${recipe.cooking_type} yöntemiyle hazırlanır`);

  if (calorie >= 700) cautions.push('Kalori değeri yüksek');
  if (carbs >= 75) cautions.push('Karbonhidrat miktarı yüksek olabilir');
  if (fat >= 35) cautions.push('Yağ miktarı yüksek olabilir');
  if (['C', 'D'].includes(grade)) cautions.push('Porsiyon kontrolü önerilir');

  return {
    positives: positives.slice(0, 3).length ? positives.slice(0, 3) : ['Tarif ölçülü porsiyonla öğüne uyarlanabilir'],
    cautions: cautions.slice(0, 3).length ? cautions.slice(0, 3) : ['Belirgin bir risk görünmüyor'],
  };
};

const RecipeDetailDb = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, favorites, toggleFavorite, addDailyLog, fetchRecipeById } = useApp();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  const isHealthyExperience = location.pathname.startsWith('/healthy-menu');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchRecipeById(id);
        setRecipe(data);
        setServingMultiplier(1);
      } catch (err) {
        console.error("Fetch error:", err);
        setError('Tarif detayı yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [fetchRecipeById, id]);

  const isFavorite = (favorites || []).includes(Number(id));
  const originalServing = recipe?.serving || 1;
  const currentServing = Math.max(1, Math.round(originalServing * servingMultiplier));
  const preparationSteps = useMemo(() => splitPreparationSteps(recipe?.preparation), [recipe?.preparation]);
  const healthLabels = useMemo(() => getHealthLabels(recipe), [recipe]);
  const nutritionConfidence = recipe?.recipe_nutrition_confidence ?? 0;
  const nutritionEstimated = Boolean(recipe?.nutrition_is_estimated);
  const healthTone = getHealthTone(recipe?.health_score ?? 0);
  const healthGrade = recipe?.health_grade || getHealthGrade(recipe?.health_score ?? 0).split(' ')[0];
  const qualityRationale = useMemo(() => getQualityRationale(recipe, healthGrade), [recipe, healthGrade]);
  const qualityPoints = useMemo(() => getQualityPoints(recipe, healthGrade), [recipe, healthGrade]);
  const canEdit = recipe?.user_id === user?.id;

  // Ingredients are now normalized in AppContext.fetchRecipeById
  const displayIngredients = useMemo(() => {
    return recipe?.ingredients || [];
  }, [recipe]);

  const handleToggleFavorite = async () => {
    try {
      setActionLoading(true);
      await toggleFavorite(Number(id));
    } catch (err) {
      alert(err.message || 'Favori işlemi başarısız oldu.');
    } finally {
      setActionLoading(false);
    }
  };

  const markAsDone = async () => {
    if (!recipe) return;
    try {
      setActionLoading(true);
      await addDailyLog({
        recipeId: recipe.id,
        mealType: 'Akşam Yemeği',
        servingCount: currentServing,
        servingMultiplier,
      });
      alert(`Afiyet olsun! ${currentServing} kişilik kayıt eklendi.`);
    } catch (err) {
      alert(err.message || 'Günlük kayıt eklenemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const adjustValue = (value) => {
    if (value == null) return '-';
    const adjusted = value * servingMultiplier;
    return adjusted % 1 === 0 ? adjusted : parseFloat(adjusted.toFixed(1));
  };

  if (loading) {
    return (
      <Layout variant={isHealthyExperience ? 'healthy' : 'default'}>
        <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
          <div className="loader" style={{ textAlign: 'center' }}>
             <ChefHat size={40} className="spin-slow" />
             <p style={{ marginTop: '15px', fontWeight: '700', opacity: 0.5 }}>Tarif Hazırlanıyor...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !recipe) {
    return (
      <Layout variant={isHealthyExperience ? 'healthy' : 'default'}>
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Info size={48} style={{ opacity: 0.2, marginBottom: '20px' }} />
          <h2>{error || 'Tarif bulunamadı.'}</h2>
          <button onClick={() => navigate(-1)} className="primary-btn" style={{ marginTop: '20px' }}>Geri Dön</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout variant={isHealthyExperience ? 'healthy' : 'default'}>
      <div className="recipe-detail-root" style={{ animation: 'fadeIn 0.6s ease-out' }}>
        
        {isHealthyExperience && (
            <div className="healthy-detail-banner" style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(16, 185, 129, 0.1)', color: '#065f46', padding: '1rem 1.5rem', borderRadius: '18px', marginBottom: '2rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <Leaf size={24} />
                <div>
                    <strong style={{ display: 'block', fontSize: '1.1rem' }}>Sağlıklı Seçim</strong>
                    <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Bu tarif hedeflerinize uygun şekilde normalize edilmiştir.</p>
                </div>
            </div>
        )}

        <button
            onClick={() => navigate(-1)}
            style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
            fontWeight: '800',
            cursor: 'pointer'
            }}
        >
            <ArrowLeft size={18} /> Geri Dön
        </button>

        <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
          
          <div className="recipe-main-card card" style={{ padding: 0, overflow: 'hidden', borderRadius: '32px', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
            <div style={{ position: 'relative' }}>
              {recipe.image_url ? (
                <img src={recipe.image_url} alt={recipe.name} style={{ width: '100%', height: '450px', objectFit: 'cover' }} />
              ) : (
                <div style={{ height: '400px', background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', display: 'grid', placeItems: 'center' }}>
                   <ChefHat size={80} style={{ opacity: 0.1 }} />
                </div>
              )}
              
              <button
                onClick={handleToggleFavorite}
                disabled={actionLoading}
                style={{
                  position: 'absolute', top: '25px', right: '25px',
                  background: isFavorite ? 'var(--favorite-wine)' : 'rgba(255,255,255,0.92)',
                  color: isFavorite ? 'white' : 'var(--favorite-wine)',
                  border: 'none', padding: '16px', borderRadius: '20px',
                  cursor: 'pointer', boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  display: 'grid', placeItems: 'center', transition: 'all 0.2s'
                }}
              >
                <Heart size={24} fill={isFavorite ? 'white' : 'none'} />
              </button>
            </div>

            <div style={{ padding: '3.5rem' }}>
              <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: '950', marginBottom: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{recipe.name}</h1>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary-color)', padding: '6px 16px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: '800' }}>
                    {recipe.recipe_category || 'Genel'}
                  </span>
                  {(healthLabels || []).map(label => (
                    <span key={label} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 16px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Leaf size={14} /> {label}
                    </span>
                  ))}
                </div>
                {canEdit && (
                  <button onClick={() => navigate(`/recipes/${recipe.id}/edit`)} className="primary-btn" style={{ marginTop: '1rem', display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                    <Pencil size={16} /> Duzenle
                  </button>
                )}
              </div>

              <section
                className="quality-insight-card"
                style={{
                  marginBottom: '3.5rem',
                  padding: '1.2rem',
                  borderRadius: '24px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ padding: '10px 16px', borderRadius: '16px', background: 'var(--background-elevated)', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '900' }}>
                    KALITE
                  </span>
                  <span style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${healthTone.bg}`, color: healthTone.text, border: `2px solid ${healthTone.chip}`, fontSize: '1.35rem', fontWeight: '950' }}>
                    {healthGrade}
                  </span>
                  <strong style={{ color: healthTone.chip, fontSize: '1rem', fontWeight: '900' }}>
                    {getQualityLabel(healthGrade)}
                  </strong>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    padding: '1.2rem',
                    borderRadius: '18px',
                    border: `1px dashed ${healthTone.chip}`,
                    background: 'rgba(255,255,255,0.025)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: healthTone.chip, fontSize: '1.05rem', fontWeight: '950' }}>
                      <LineChart size={20} /> Neden {healthGrade} Kalite?
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.7, fontWeight: '650' }}>
                      {qualityRationale}
                    </p>
                  </div>

                  <div className="quality-point-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '18px', background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#86efac', fontSize: '0.95rem', fontWeight: '900' }}>
                        <CheckCircle2 size={18} /> Olumlu Yönler
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem', fontWeight: '650' }}>
                        {qualityPoints.positives.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ padding: '1rem', borderRadius: '18px', background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#fb7185', fontSize: '0.95rem', fontWeight: '900' }}>
                        <AlertCircle size={18} /> Dikkat Edilmesi Gerekenler
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem', fontWeight: '650' }}>
                        {qualityPoints.cautions.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <h3 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Utensils size={24} color="var(--primary-color)" /> Nasıl Hazırlanır?
              </h3>
              
              <div className="steps-container" style={{ display: 'grid', gap: '24px' }}>
                {preparationSteps.map((step, index) => (
                  <div key={index} style={{ display: 'flex', gap: '25px', padding: '1.5rem', background: 'var(--background-elevated)', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: isHealthyExperience ? '#059669' : 'var(--primary-color)', color: 'white', display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: '900', fontSize: '1.1rem' }}>
                      {index + 1}
                    </div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '500', lineHeight: '1.7' }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="recipe-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* PORTION CONTROL */}
            <div className="card" style={{ padding: '2rem', borderRadius: '28px' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '900', opacity: 0.6 }}>PORSIYON AYARI</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '25px', background: 'var(--background-elevated)', padding: '20px', borderRadius: '22px' }}>
                 <button onClick={() => setServingMultiplier(m => Math.max(0.25, m - 0.25))} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'white', border: '1px solid var(--border-color)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Minus size={20} /></button>
                 <div style={{ textAlign: 'center', minWidth: '90px' }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: '950', color: isHealthyExperience ? '#059669' : 'var(--primary-color)' }}>{currentServing}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '800', opacity: 0.5 }}>KİŞİLİK</div>
                 </div>
                 <button onClick={() => setServingMultiplier(m => m + 0.25)} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'white', border: '1px solid var(--border-color)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Plus size={20} /></button>
              </div>
            </div>

            {/* NUTRITION STATS */}
            <div className="card" style={{ padding: '2.5rem', borderRadius: '28px' }}>
                <h3 style={{ marginBottom: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Activity size={20} color="var(--primary-color)" /> Besin Analizi
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {[
                      { label: 'Kalite', val: healthGrade, icon: <Leaf size={14} />, col: healthTone.chip },
                      { label: 'Enerji', val: `${adjustValue(recipe.calorie)} kcal`, icon: <Flame size={14} />, col: '#ef4444' },
                      { label: 'Protein', val: `${adjustValue(recipe.protein)}g`, icon: <Activity size={14} />, col: '#3b82f6' },
                      { label: 'Karb.', val: `${adjustValue(recipe.carbohydrate)}g`, icon: <Dna size={14} />, col: '#10b981' },
                      { label: 'Yağ', val: `${adjustValue(recipe.fat)}g`, icon: <Activity size={14} />, col: '#44e2cd' }
                    ].map(stat => (
                      <div key={stat.label} style={{ background: 'var(--background-elevated)', padding: '18px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: '950', color: stat.col }}>{stat.val}</div>
                      </div>
                    ))}
                </div>
            </div>

            {/* INGREDIENTS */}
            <div className="card" style={{ padding: '2.5rem', borderRadius: '28px' }}>
              <h3 style={{ marginBottom: '1.5rem', fontWeight: '900' }}>Malzeme Listesi</h3>
              <div style={{ display: 'grid', gap: '14px' }}>
                {displayIngredients.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', background: 'var(--background-elevated)', borderRadius: '18px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: '800', fontSize: '1rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {item.name}
                      {item.nutrition_data_source === 'ai' && (
                        <Info size={15} title="Bu deger AI tahminidir." style={{ color: '#44e2cd' }} />
                      )}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '700' }}>{adjustValue(item.amount)} {item.unit}</span>
                  </div>
                ))}
              </div>
              <button className="primary-btn" onClick={() => setShowRevisionModal(true)} style={{ marginTop: '1rem', width: '100%' }}>
                🪄 Bu Tarifi Revize Et
              </button>
            </div>

            <button
              onClick={markAsDone}
              disabled={actionLoading}
              className="primary-btn"
              style={{
                width: '100%', padding: '22px', borderRadius: '24px', fontSize: '1.2rem', fontWeight: '900',
                background: isHealthyExperience ? 'linear-gradient(135deg, #065f46, #10b981)' : '#10b981',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)', border: 'none', cursor: 'pointer'
              }}
            >
              <CheckCircle size={24} />
              {actionLoading ? 'İşleniyor...' : 'Bugün Bunu Pişirdim!'}
            </button>

            {nutritionEstimated && (
              <div style={{ padding: '1rem 1.2rem', borderRadius: '18px', background: 'rgba(245, 158, 11, 0.10)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#92400e' }}>
                <strong style={{ display: 'block', marginBottom: '6px' }}>Besin degeri tahmini</strong>
                <span style={{ fontSize: '0.95rem' }}>
                  Bu tarifin nutrition confidence degeri %{Math.round(nutritionConfidence * 100)}. Eksik veya olculendirilmesi zor malzemeler skorlamada tahmini hesaplandi.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {showRevisionModal && (
        <RecipeRevisionModal
          recipe={recipe}
          onClose={() => setShowRevisionModal(false)}
          onSaved={(newId) => {
            setShowRevisionModal(false);
            navigate(`/recipes/${newId}`);
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .spin-slow { animation: spin 4s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .quality-point-grid {
            grid-template-columns: 1fr !important;
          }
        }
      ` }} />
    </Layout>
  );
};

export default RecipeDetailDb;
