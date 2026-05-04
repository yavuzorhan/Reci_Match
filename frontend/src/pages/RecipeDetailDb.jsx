import React, { useEffect, useMemo, useState } from 'react';
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
  const originalServing = recipe?.serving || 1;
  const currentServing = 20;
  const servingMultiplier = currentServing / originalServing;
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

  const markAsDone = async () => {
    if (!recipe) return;
    try {
      setActionLoading(true);
      await addDailyLog({
        recipeId: recipe.id,
        mealType,
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

  if (loading) {
    return (
      <Layout variant={isHealthyExperience ? 'healthy' : 'default'}>
        <div className="recipe-detail-page recipe-detail-state">
          <ChefHat size={42} className="recipe-detail-spin" />
          <p>Tarif hazırlanıyor...</p>
        </div>
        <RecipeDetailStyles />
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
        <RecipeDetailStyles />
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
                  <select value={20} disabled>
                    <option value={20}>20 Porsiyon</option>
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

      <RecipeDetailStyles />
    </Layout>
  );
};

const RecipeDetailStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    .layout-content:has(.recipe-detail-page) {
      padding: 0;
      background:
        radial-gradient(circle at 18% 0%, rgba(78, 222, 163, 0.08), transparent 32%),
        radial-gradient(circle at 90% 16%, rgba(68, 226, 205, 0.06), transparent 28%),
        #050B14 !important;
      color: #d4e4fa;
    }

    .layout-shell:has(.recipe-detail-page) .sidebar {
      background: rgba(7, 16, 27, 0.92);
      border-right: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(30px);
      box-shadow: none;
    }

    .layout-shell:has(.recipe-detail-page) .brand-wordmark-reci,
    .layout-shell:has(.recipe-detail-page) .brand-wordmark-match {
      color: #4edea3;
      text-shadow: none;
    }

    .layout-shell:has(.recipe-detail-page) .brand-wordmark p,
    .layout-shell:has(.recipe-detail-page) .nav-item,
    .layout-shell:has(.recipe-detail-page) .sidebar-action-button {
      color: #8ea0b8 !important;
    }

    .layout-shell:has(.recipe-detail-page) .nav-active-pill {
      border-radius: 12px;
      background: rgba(78, 222, 163, 0.10);
      box-shadow: inset 2px 0 0 #4edea3;
    }

    .layout-shell:has(.recipe-detail-page) .nav-item.active {
      color: #4edea3 !important;
    }

    .recipe-detail-page {
      min-height: 100vh;
      font-family: 'Plus Jakarta Sans', Inter, system-ui, sans-serif;
      color: #d4e4fa;
    }

    .recipe-topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 0 32px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: rgba(7, 16, 27, 0.72);
      backdrop-filter: blur(20px);
    }

    .recipe-back-button,
    .recipe-icon-button,
    .recipe-assistant-button,
    .recipe-secondary-button,
    .recipe-favorite-button,
    .recipe-revision-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 1px solid rgba(255,255,255,0.08);
      color: #8ea0b8;
      background: rgba(16, 26, 42, 0.66);
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .recipe-back-button {
      border: 0;
      background: transparent;
      font-size: 15px;
      font-weight: 800;
    }

    .recipe-back-button:hover,
    .recipe-icon-button:hover,
    .recipe-assistant-button:hover,
    .recipe-secondary-button:hover,
    .recipe-revision-button:hover {
      color: #d4e4fa;
      border-color: rgba(78,222,163,0.22);
      background: rgba(78,222,163,0.08);
    }

    .recipe-topbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .recipe-icon-button,
    .recipe-avatar {
      width: 40px;
      height: 40px;
      border-radius: 999px;
    }

    .recipe-divider {
      width: 1px;
      height: 24px;
      background: rgba(255,255,255,0.10);
    }

    .recipe-assistant-button {
      min-height: 40px;
      padding: 0 15px;
      border-radius: 999px;
      color: #d4e4fa;
      font-weight: 800;
    }

    .recipe-assistant-button svg {
      color: #4edea3;
    }

    .recipe-avatar {
      border: 1px solid rgba(78,222,163,0.18);
      background: linear-gradient(135deg, rgba(78,222,163,0.18), rgba(68,226,205,0.10));
      color: #d4e4fa;
      font-weight: 900;
      cursor: pointer;
    }

    .recipe-detail-main {
      width: min(100%, 1440px);
      margin: 0 auto;
      padding: 32px;
    }

    .recipe-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
      margin-bottom: 24px;
    }

    .recipe-heading h1 {
      margin: 0;
      color: #d4e4fa;
      font-size: clamp(2rem, 3.2vw, 3.3rem);
      line-height: 1.12;
      font-weight: 850;
      letter-spacing: 0;
    }

    .recipe-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .recipe-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 30px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(19, 34, 53, 0.78);
      color: #8ea0b8;
      font-size: 12px;
      font-weight: 850;
      letter-spacing: 0.02em;
    }

    .recipe-pill.primary {
      color: #4edea3;
      border-color: rgba(78,222,163,0.20);
      background: rgba(78,222,163,0.10);
    }

    .recipe-heading-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .recipe-primary-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 46px;
      padding: 0 22px;
      border: 0;
      border-radius: 14px;
      background: #4edea3;
      color: #003824;
      font-weight: 900;
      box-shadow: 0 18px 34px rgba(78,222,163,0.18);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .recipe-primary-button:hover {
      background: #6ffbbe;
      transform: translateY(-1px);
    }

    .recipe-primary-button:disabled,
    .recipe-favorite-button:disabled {
      cursor: wait;
      opacity: 0.65;
    }

    .recipe-primary-button.wide {
      width: 100%;
      min-height: 52px;
    }

    .recipe-secondary-button {
      min-height: 46px;
      padding: 0 16px;
      border-radius: 14px;
      font-weight: 850;
    }

    .recipe-favorite-button {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      color: #ff8a8a;
    }

    .recipe-favorite-button.active {
      border-color: rgba(255,138,138,0.32);
      background: rgba(255,138,138,0.12);
    }

    .recipe-detail-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 380px;
      gap: 24px;
      align-items: start;
    }

    .recipe-left-column,
    .recipe-right-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
      min-width: 0;
    }

    .recipe-hero-card,
    .recipe-panel {
      border: 1px solid rgba(78,222,163,0.12);
      background: rgba(16, 26, 42, 0.88);
      box-shadow: 0 18px 50px rgba(0,0,0,0.28);
    }

    .recipe-hero-card {
      position: relative;
      min-height: 430px;
      overflow: hidden;
      border-radius: 28px;
    }

    .recipe-hero-card img,
    .recipe-image-fallback {
      width: 100%;
      height: 430px;
      object-fit: cover;
      display: block;
    }

    .recipe-image-fallback {
      display: grid;
      place-items: center;
      color: rgba(78,222,163,0.32);
      background:
        radial-gradient(circle at 30% 20%, rgba(78,222,163,0.14), transparent 30%),
        linear-gradient(145deg, #132235, #07101b);
    }

    .recipe-hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(5,11,20,0.96), rgba(5,11,20,0.32), transparent 58%);
    }

    .recipe-hero-content {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 28px;
    }

    .recipe-hero-content p {
      max-width: 720px;
      margin: 0 0 18px;
      color: #d4e4fa;
      font-size: 18px;
      line-height: 1.6;
      font-weight: 650;
    }

    .recipe-stat-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .recipe-stat-row span {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 38px;
      padding: 0 13px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(7,16,27,0.72);
      color: #d4e4fa;
      font-size: 14px;
      font-weight: 800;
      backdrop-filter: blur(18px);
    }

    .recipe-stat-row svg {
      color: #4edea3;
    }

    .recipe-panel {
      border-radius: 24px;
      padding: 24px;
    }

    .recipe-panel-title {
      display: flex;
      align-items: center;
      gap: 11px;
      margin-bottom: 20px;
    }

    .recipe-panel-title svg {
      color: #4edea3;
    }

    .recipe-panel h2,
    .recipe-panel-title h2,
    .recipe-quality-head h2 {
      margin: 0;
      color: #d4e4fa;
      font-size: 24px;
      line-height: 1.25;
      font-weight: 850;
      letter-spacing: 0;
    }

    .recipe-ingredient-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }

    .recipe-ingredient-grid h3 {
      margin: 0 0 10px;
      color: #8ea0b8;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .recipe-ingredient-list,
    .recipe-step-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .recipe-ingredient-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: center;
      gap: 8px;
      min-height: 48px;
      padding: 0 14px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(19,34,53,0.72);
    }

    .recipe-ingredient-row span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #d4e4fa;
      font-weight: 750;
    }

    .recipe-ingredient-row small {
      color: #8ea0b8;
      font-weight: 750;
      white-space: nowrap;
    }

    .recipe-ingredient-row.available {
      border-color: rgba(78,222,163,0.14);
      background: rgba(78,222,163,0.07);
    }

    .recipe-ingredient-row.available svg {
      color: #4edea3;
    }

    .recipe-ingredient-row.optional {
      border-color: rgba(68,226,205,0.14);
      background: rgba(68,226,205,0.06);
    }

    .recipe-ingredient-row.optional svg {
      color: #44e2cd;
    }

    .recipe-note {
      margin: 18px 0 0;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.08);
      color: #8ea0b8;
      font-size: 14px;
      font-style: italic;
    }

    .recipe-step-row {
      display: flex;
      gap: 14px;
      padding: 15px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(19,34,53,0.68);
    }

    .recipe-step-row > span {
      width: 34px;
      height: 34px;
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      border-radius: 12px;
      border: 1px solid rgba(78,222,163,0.18);
      background: rgba(78,222,163,0.10);
      color: #4edea3;
      font-weight: 950;
    }

    .recipe-step-row p {
      margin: 4px 0 0;
      color: #b9c9dc;
      font-size: 16px;
      line-height: 1.65;
      font-weight: 600;
    }

    .recipe-quality-card {
      border-color: rgba(78,222,163,0.22);
      background:
        radial-gradient(circle at 100% 0%, rgba(78,222,163,0.12), transparent 36%),
        rgba(16, 31, 35, 0.90);
    }

    .recipe-quality-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }

    .recipe-quality-head span,
    .recipe-field-label,
    .recipe-save-card label > span {
      display: block;
      color: #8ea0b8;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .recipe-quality-badge {
      width: 52px;
      height: 52px;
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      border-radius: 999px;
      border: 1px solid rgba(78,222,163,0.28);
      background: rgba(78,222,163,0.10);
      color: #4edea3;
    }

    .recipe-quality-card > strong {
      display: block;
      color: #4edea3;
      font-size: 38px;
      line-height: 1;
      font-weight: 950;
    }

    .recipe-quality-card > small {
      display: block;
      margin-top: 8px;
      color: #44e2cd;
      font-weight: 850;
    }

    .recipe-quality-meter {
      height: 8px;
      margin: 18px 0;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(255,255,255,0.08);
    }

    .recipe-quality-meter i {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #18c98b, #4edea3);
      box-shadow: 0 0 18px rgba(78,222,163,0.38);
    }

    .recipe-quality-card p {
      margin: 0;
      color: #b9c9dc;
      font-size: 14px;
      line-height: 1.7;
      font-weight: 600;
    }

    .recipe-quality-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 18px;
    }

    .recipe-quality-tags span {
      padding: 7px 10px;
      border-radius: 10px;
      border: 1px solid rgba(78,222,163,0.17);
      background: rgba(78,222,163,0.08);
      color: #4edea3;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .recipe-save-card,
    .recipe-nutrition-card {
      background: rgba(16, 26, 42, 0.92);
    }

    .recipe-save-card h2,
    .recipe-nutrition-card h2 {
      margin-bottom: 18px;
    }

    .recipe-save-card label {
      display: block;
      margin-bottom: 18px;
    }

    .recipe-save-card select {
      width: 100%;
      min-height: 48px;
      margin-top: 8px;
      padding: 0 14px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.10);
      background: #132235;
      color: #d4e4fa;
      font-weight: 800;
      outline: none;
    }

    .recipe-save-card select:disabled {
      cursor: default;
      opacity: 1;
      color: #4edea3;
      border-color: rgba(78,222,163,0.22);
      background: rgba(78,222,163,0.08);
    }

    .recipe-save-card select:focus {
      border-color: rgba(78,222,163,0.45);
      box-shadow: 0 0 0 3px rgba(78,222,163,0.10);
    }

    .recipe-meal-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin: 8px 0 18px;
    }

    .recipe-meal-grid button {
      min-height: 42px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(19,34,53,0.72);
      color: #8ea0b8;
      font-weight: 850;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .recipe-meal-grid button.active {
      color: #4edea3;
      border-color: rgba(78,222,163,0.28);
      background: rgba(78,222,163,0.11);
    }

    .recipe-nutrition-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .recipe-nutrition-grid div {
      min-height: 88px;
      display: grid;
      align-content: center;
      gap: 8px;
      padding: 14px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(19,34,53,0.72);
      text-align: center;
    }

    .recipe-nutrition-grid span {
      color: #8ea0b8;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .recipe-nutrition-grid strong {
      color: #d4e4fa;
      font-size: 22px;
      font-weight: 950;
    }

    .recipe-revision-button {
      min-height: 48px;
      border-radius: 14px;
      border: 0;
      color: #003731;
      background: linear-gradient(135deg, #44e2cd, #4edea3);
      font-weight: 900;
      box-shadow: 0 18px 34px rgba(68,226,205,0.14);
    }

    .recipe-revision-button.wide {
      width: 100%;
      margin-top: 10px;
    }

    .recipe-revision-button:hover {
      color: #003731;
      border-color: transparent;
      background: linear-gradient(135deg, #62fae3, #6ffbbe);
      transform: translateY(-1px);
    }

    .recipe-estimate-note {
      display: flex;
      gap: 12px;
      padding: 15px;
      border-radius: 16px;
      border: 1px solid rgba(255,138,138,0.22);
      background: rgba(255,138,138,0.08);
      color: #ffb4ab;
    }

    .recipe-estimate-note strong,
    .recipe-estimate-note span {
      display: block;
    }

    .recipe-estimate-note span {
      margin-top: 4px;
      color: #d6b8bd;
      font-size: 13px;
      line-height: 1.5;
      font-weight: 650;
    }

    .recipe-detail-state {
      min-height: 70vh;
      display: grid;
      place-items: center;
      align-content: center;
      gap: 14px;
      text-align: center;
      color: #8ea0b8;
    }

    .recipe-detail-state svg {
      color: #4edea3;
    }

    .recipe-detail-state h2 {
      margin: 0;
      color: #d4e4fa;
    }

    .recipe-detail-spin {
      animation: recipeSpin 3.5s linear infinite;
    }

    @keyframes recipeSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 1180px) {
      .recipe-detail-grid {
        grid-template-columns: 1fr;
      }

      .recipe-right-column {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .recipe-quality-card {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 820px) {
      .recipe-topbar {
        padding: 0 16px;
      }

      .recipe-assistant-button,
      .recipe-divider {
        display: none;
      }

      .recipe-detail-main {
        padding: 24px 16px;
      }

      .recipe-heading {
        align-items: stretch;
        flex-direction: column;
      }

      .recipe-heading-actions {
        justify-content: flex-start;
      }

      .recipe-ingredient-grid,
      .recipe-right-column {
        grid-template-columns: 1fr;
      }

      .recipe-hero-card,
      .recipe-hero-card img,
      .recipe-image-fallback {
        min-height: 380px;
        height: 380px;
      }

      .recipe-hero-content {
        padding: 20px;
      }
    }
  ` }} />
);

export default RecipeDetailPage;
