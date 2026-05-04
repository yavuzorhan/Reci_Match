import React, { useEffect, useMemo, useState } from 'react';
import './RecipeDetailDb.css';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Bell,
  Bot,
  Check,
  CheckCircle2,
  ChefHat,
  Clock3,
  Flame,
  Heart,
  Info,
  Leaf,
  Pencil,
  Plus,
  Sparkles,
  Utensils,
} from 'lucide-react';

import Layout from '../components/Layout';
import RecipeRevisionModal from '../components/RecipeRevisionModal';
import { useApp } from '../context/AppContext';
import { getHealthGrade, stripHtml } from '../utils/recipeInsights';

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

const toNumber = (value) => Number(value) || 0;

const formatNumber = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '-';
  const number = Number(value);
  return number % 1 === 0 ? number.toString() : number.toFixed(1);
};

const getIngredientName = (ingredient) => (
  ingredient?.name || ingredient?.ingredient_name || ingredient?.ingredient?.name || 'Malzeme'
);

const getIngredientAmount = (ingredient, multiplier) => {
  if (ingredient?.amount == null) return '';
  const adjusted = Number(ingredient.amount) * multiplier;
  return `${formatNumber(adjusted)} ${ingredient.unit || ''}`.trim();
};

const normalizePortion = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(20, Math.max(1, Math.trunc(number)));
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

  if (recipe.carbohydrate != null && Number(recipe.carbohydrate) <= carbLimit) {
    labels.push('Düşük Karbonhidrat');
  }
  if (recipe.protein != null && Number(recipe.protein) >= proteinLimit) {
    labels.push('Yüksek Protein');
  }
  if (recipe.calorie != null && Number(recipe.calorie) <= calorieLimit) {
    labels.push('Kalori Hedefiyle Uyumlu');
  }
  if (recipe.cooking_type) {
    labels.push(recipe.cooking_type);
  }

  return labels.slice(0, 3);
};

const getQualityTitle = (grade) => ({
  A: 'A Kalite',
  B: 'B Kalite',
  C: 'C Kalite',
  D: 'D Kalite',
}[grade] || `${grade || 'B'} Kalite`);

const getQualitySubtitle = (grade) => ({
  A: 'Çok iyi seçenek',
  B: 'İyi bir seçenek',
  C: 'Dengeli tüketilmeli',
  D: 'Porsiyon kontrolü önerilir',
}[grade] || 'Kalite bilgisi');

const getQualityRationale = (recipe, grade) => {
  const summary = stripHtml(recipe?.health_summary || recipe?.health_explanation || '');
  const cleaned = summary
    .replace(/^[ABCD]\s*kalite\s*\(\d+\/100\)\.?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned) return cleaned;

  if (grade === 'A') {
    return 'Bu tarif; yüksek protein içeriği, dengeli makro dağılımı ve düşük işlenmiş içerik yapısı nedeniyle A kalite olarak değerlendirilmiştir.';
  }
  if (grade === 'B') {
    return 'Bu tarif genel olarak iyi bir seçenek; porsiyon miktarı ve günlük kalori hedefiyle birlikte değerlendirildiğinde daha dengeli hale gelir.';
  }
  return 'Bu tarif besin değerleri, kalori miktarı ve makro dağılımı birlikte değerlendirilerek kalite notu almıştır.';
};

const getQualityTags = (recipe, grade) => {
  const tags = [];
  const protein = toNumber(recipe?.protein);
  const calorie = toNumber(recipe?.calorie);
  const fat = toNumber(recipe?.fat);

  if (protein >= 25) tags.push('Yüksek Protein');
  else if (protein >= 12) tags.push('Protein Desteği');

  if (fat > 0 && fat <= 35) tags.push('Dengeli Yağ');
  if (calorie > 0 && calorie <= 550) tags.push('Kalori Hedefiyle Uyumlu');
  if (['A', 'B'].includes(grade)) tags.push('Düşük İşlenmiş İçerik');
  if (recipe?.cooking_type) tags.push(`${recipe.cooking_type} Hazırlık`);

  return [...new Set(tags)].slice(0, 4);
};

const getFallbackSteps = () => [
  'Somonu baharatlarla marine edin ve 5 dakika bekletin.',
  'Tavayı orta ateşte ısıtıp az miktarda zeytinyağı ekleyin.',
  'Somonu her iki tarafı altın sarısı olana kadar yaklaşık 4-5 dakika pişirin.',
  'Avokadoyu krema ile ezerek pürüzsüz bir sos elde edin ve üzerinde servis edin.',
];

const RecipeDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, favorites, toggleFavorite, addDailyLog, fetchRecipeById } = useApp();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [mealType, setMealType] = useState('Öğle');
  const [servingCount, setServingCount] = useState(1);
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  const isHealthyExperience = location.pathname.startsWith('/healthy-menu');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchRecipeById(id);
        if (!cancelled) {
          setRecipe(data);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        if (!cancelled) setError('Tarif detayı yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [fetchRecipeById, id]);

  const isFavorite = (favorites || []).includes(Number(id));
  const canEdit = recipe?.user_id === user?.id;
  const currentServing = normalizePortion(servingCount);
  const servingMultiplier = currentServing;
  const preparationSteps = useMemo(() => {
    const steps = splitPreparationSteps(recipe?.preparation);
    return steps.length ? steps : getFallbackSteps();
  }, [recipe?.preparation]);
  const displayIngredients = useMemo(() => recipe?.ingredients || [], [recipe]);
  const availableIngredients = displayIngredients.slice(0, Math.min(2, displayIngredients.length));
  const optionalIngredients = displayIngredients.slice(availableIngredients.length);
  const healthGrade = recipe?.health_grade || getHealthGrade(recipe?.health_score ?? 0).split(' ')[0];
  const qualityRationale = useMemo(() => getQualityRationale(recipe, healthGrade), [recipe, healthGrade]);
  const qualityTags = useMemo(() => getQualityTags(recipe, healthGrade), [recipe, healthGrade]);
  const healthLabels = useMemo(() => getHealthLabels(recipe), [recipe]);
  const matchScore = location.state?.matchScore || recipe?.score || 92;
  const nutritionEstimated = Boolean(recipe?.nutrition_is_estimated);
  const nutritionConfidence = recipe?.recipe_nutrition_confidence ?? 0;

  const adjustedValue = (value) => {
    if (value == null) return '-';
    return formatNumber(Number(value) * servingMultiplier);
  };

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

  const handleServingChange = (event) => {
    setServingCount(normalizePortion(event.target.value));
  };

  const markAsDone = async () => {
    if (!recipe) return;
    const recipeId = recipe.id || recipe.recipe_id || Number(id);
    try {
      setActionLoading(true);
      await addDailyLog({
        recipeId,
        mealType,
        servingCount: currentServing,
        servingMultiplier,
        calorieIntake: (Number(recipe.calorie) || 0) * currentServing,
      });
      alert(`Afiyet olsun! ${currentServing} porsiyon kayıt eklendi.`);
    } catch (err) {
      alert(err.message || 'Günlük kayıt eklenemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout variant={isHealthyExperience ? 'healthy' : 'default'}>
        <div className="recipe-detail-page recipe-detail-state">
          <ChefHat size={42} className="recipe-detail-spin" />
          <p>Tarif hazırlanıyor...</p>
        </div>
      </Layout>
    );
  }

  if (error || !recipe) {
    return (
      <Layout variant={isHealthyExperience ? 'healthy' : 'default'}>
        <div className="recipe-detail-page recipe-detail-state">
          <Info size={46} />
          <h2>{error || 'Tarif bulunamadı.'}</h2>
          <button type="button" onClick={() => navigate(-1)} className="recipe-primary-button">
            Geri Dön
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout variant={isHealthyExperience ? 'healthy' : 'default'}>
      <div className="recipe-detail-page">
        <header className="recipe-topbar">
          <button type="button" className="recipe-back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            Tariflere Dön
          </button>

          <div className="recipe-topbar-actions">
            <button type="button" className="recipe-icon-button" aria-label="Bildirimler">
              <Bell size={18} />
            </button>
            <span className="recipe-divider" />
            <button type="button" className="recipe-assistant-button">
              <Bot size={18} />
              AI Assistant
            </button>
            <button type="button" className="recipe-avatar" onClick={() => navigate('/profile-edit')}>
              {(user?.name?.[0] || 'R').toLocaleUpperCase('tr-TR')}
            </button>
          </div>
        </header>

        <main className="recipe-detail-main">
          <section className="recipe-heading">
            <div>
              <h1>{recipe.name || 'Kremalı Avokadolu Somon'}</h1>
              <div className="recipe-pill-row">
                <span className="recipe-pill primary">
                  <Sparkles size={14} />
                  {matchScore}% Eşleşme
                </span>
                {(healthLabels.length ? healthLabels : ['Tava', 'Yüksek Protein', 'Omega-3']).map((label) => (
                  <span key={label} className="recipe-pill">{label}</span>
                ))}
              </div>
            </div>

            <div className="recipe-heading-actions">
              {canEdit && (
                <button type="button" className="recipe-secondary-button" onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>
                  <Pencil size={18} />
                  Düzenle
                </button>
              )}
              <button
                type="button"
                className={`recipe-favorite-button ${isFavorite ? 'active' : ''}`}
                onClick={handleToggleFavorite}
                disabled={actionLoading}
                aria-label="Favorilere ekle"
              >
                <Heart size={21} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>
          </section>

          <div className="recipe-detail-grid">
            <section className="recipe-left-column">
              <article className="recipe-hero-card">
                {recipe.image_url ? (
                  <img src={recipe.image_url} alt={recipe.name} />
                ) : (
                  <div className="recipe-image-fallback">
                    <ChefHat size={72} />
                  </div>
                )}
                <div className="recipe-hero-overlay" />
                <div className="recipe-hero-content">
                  <p>
                    {stripHtml(recipe.description) || 'Avokado ve somon ile hazırlanan, yüksek proteinli pratik bir ana öğün.'}
                  </p>
                  <div className="recipe-stat-row">
                    <span><Flame size={16} /> {adjustedValue(recipe.calorie)} kcal</span>
                    <span><Activity size={16} /> {adjustedValue(recipe.protein)}g Protein</span>
                    <span><Clock3 size={16} /> {recipe.preparation_time || recipe.cooking_time || 20} dk</span>
                    <span><Leaf size={16} /> Kalite: {healthGrade}</span>
                  </div>
                </div>
              </article>

              <article className="recipe-panel recipe-ingredients-panel">
                <div className="recipe-panel-title">
                  <Utensils size={22} />
                  <h2>Malzemeler</h2>
                </div>

                <div className="recipe-ingredient-grid">
                  <div>
                    <h3>Dolabında Olanlar</h3>
                    <div className="recipe-ingredient-list">
                      {(availableIngredients.length ? availableIngredients : [{ name: 'Somon Filet' }, { name: 'Zeytinyağı' }]).map((ingredient, index) => (
                        <div className="recipe-ingredient-row available" key={`${getIngredientName(ingredient)}-${index}`}>
                          <span>{getIngredientName(ingredient)}</span>
                          <small>{getIngredientAmount(ingredient, servingMultiplier)}</small>
                          <Check size={17} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3>Eksik / Opsiyonel</h3>
                    <div className="recipe-ingredient-list">
                      {(optionalIngredients.length ? optionalIngredients.slice(0, 6) : [{ name: 'Olgun Avokado' }, { name: 'Taze Krema' }]).map((ingredient, index) => (
                        <div className="recipe-ingredient-row optional" key={`${getIngredientName(ingredient)}-${index}`}>
                          <span>{getIngredientName(ingredient)}</span>
                          <small>{getIngredientAmount(ingredient, servingMultiplier)}</small>
                          <Plus size={17} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="recipe-note">
                  Diğer: Tuz, Karabiber, Limon suyu.
                </p>
              </article>

              <article className="recipe-panel">
                <div className="recipe-panel-title">
                  <ChefHat size={23} />
                  <h2>Hazırlanışı</h2>
                </div>

                <div className="recipe-step-list">
                  {preparationSteps.map((step, index) => (
                    <div className="recipe-step-row" key={`${step}-${index}`}>
                      <span>{index + 1}</span>
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <aside className="recipe-right-column">
              <article className="recipe-panel recipe-quality-card">
                <div className="recipe-quality-head">
                  <div>
                    <h2>Kalite Değerlendirmesi</h2>
                    <span>Tarif Notu</span>
                  </div>
                  <div className="recipe-quality-badge">
                    <CheckCircle2 size={26} />
                  </div>
                </div>

                <strong>{getQualityTitle(healthGrade)}</strong>
                <small>{getQualitySubtitle(healthGrade)}</small>
                <div className="recipe-quality-meter">
                  <i style={{ width: `${Math.max(12, Math.min(100, recipe.health_score || 92))}%` }} />
                </div>
                <p>{qualityRationale}</p>

                <div className="recipe-quality-tags">
                  {(qualityTags.length ? qualityTags : ['Yüksek Protein', 'Dengeli Yağ', 'Düşük İşlenmiş İçerik', 'Kalori Hedefiyle Uyumlu']).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </article>

              <article className="recipe-panel recipe-save-card">
                <h2>Öğünü Kaydet</h2>

                <label>
                  <span>Porsiyon</span>
                  <select value={currentServing} onChange={handleServingChange}>
                    {Array.from({ length: 20 }, (_, index) => index + 1).map((portion) => (
                      <option key={portion} value={portion}>{portion} Porsiyon</option>
                    ))}
                  </select>
                </label>

                <div>
                  <span className="recipe-field-label">Öğün Tipi</span>
                  <div className="recipe-meal-grid">
                    {['Kahvaltı', 'Öğle', 'Akşam', 'Ara Öğün'].map((item) => (
                      <button
                        type="button"
                        key={item}
                        className={mealType === item ? 'active' : ''}
                        onClick={() => setMealType(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="button" className="recipe-primary-button wide" onClick={markAsDone} disabled={actionLoading}>
                  <CheckCircle2 size={19} />
                  {actionLoading ? 'İşleniyor...' : 'Günlüğe Ekle'}
                </button>

                <button type="button" className="recipe-revision-button wide" onClick={() => setShowRevisionModal(true)}>
                  <Sparkles size={18} />
                  Bu Tarifi Revize Et
                </button>
              </article>

              <article className="recipe-panel recipe-nutrition-card">
                <h2>Besin Özeti</h2>
                <div className="recipe-nutrition-grid">
                  <div>
                    <span>Karbonhidrat</span>
                    <strong>{adjustedValue(recipe.carbohydrate)}g</strong>
                  </div>
                  <div>
                    <span>Yağ</span>
                    <strong>{adjustedValue(recipe.fat)}g</strong>
                  </div>
                  <div>
                    <span>Protein</span>
                    <strong>{adjustedValue(recipe.protein)}g</strong>
                  </div>
                  <div>
                    <span>Porsiyon</span>
                    <strong>{currentServing}</strong>
                  </div>
                </div>
              </article>

              {nutritionEstimated && (
                <div className="recipe-estimate-note">
                  <AlertCircle size={18} />
                  <div>
                    <strong>Besin değeri tahmini</strong>
                    <span>
                      Güven skoru %{Math.round(nutritionConfidence * 100)}. Eksik veya ölçülmesi zor malzemeler tahmini hesaplandı.
                    </span>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>

      {showRevisionModal && (
        <RecipeRevisionModal
          recipe={recipe}
          onClose={() => setShowRevisionModal(false)}
          onSaved={(newId) => {
            setShowRevisionModal(false);
            navigate(`/recipe/${newId}`);
          }}
        />
      )}

    </Layout>
  );
};


export default RecipeDetailPage;
