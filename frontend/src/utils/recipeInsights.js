export const RECIPE_FILTER_OPTIONS = [
  { label: '30 dk Altı', value: 'fast' },
  { label: 'Fırında', value: 'firin' },
  { label: 'Tavada', value: 'tava' },
  { label: 'Tencerede', value: 'tencere' },
  { label: 'Sevilmeyenleri Çıkar', value: 'excludeDisliked' },
  { label: 'Düşük Kalorili', value: 'lowCalorie' },
  { label: 'Yüksek Proteinli', value: 'highProtein' },
];

export const normalizeCookingType = (value) => {
  if (!value) return '';

  const normalized = value
    .toString()
    .toLowerCase()
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c');

  if (normalized.includes('firin')) return 'firin';
  if (normalized.includes('tava')) return 'tava';
  if (normalized.includes('tencere')) return 'tencere';
  return normalized;
};

export const applyRecipeFilters = (recipes, activeFilters, options = {}) => {
  const dislikedIngredientIds = new Set(options.dislikedIngredientIds || []);

  return recipes.filter((recipe) => {
    if (activeFilters.includes('fast') && (!recipe.total_time_minutes || recipe.total_time_minutes > 30)) {
      return false;
    }

    const cookingType = normalizeCookingType(recipe.cooking_type);
    const cookingFilters = activeFilters.filter((item) => ['firin', 'tava', 'tencere'].includes(item));
    if (cookingFilters.length && !cookingFilters.includes(cookingType)) {
      return false;
    }

    if (activeFilters.includes('lowCalorie') && !(recipe.health_flags || []).includes('Dusuk kalorili')) {
      return false;
    }

    if (activeFilters.includes('highProtein') && !(recipe.health_flags || []).includes('Yuksek protein')) {
      return false;
    }

    if (activeFilters.includes('excludeDisliked') && dislikedIngredientIds.size) {
      const recipeIngredientIds = recipe.ingredient_ids || [];
      if (recipeIngredientIds.some((ingredientId) => dislikedIngredientIds.has(ingredientId))) {
        return false;
      }
    }

    if (activeFilters.includes('excludeDisliked') && (recipe.disliked_ingredients || []).length) {
      return false;
    }

    return true;
  });
};

export const HEALTH_SCORE_MAX_PORTION = 99;

export const getHealthTone = (score = 0) => {
  if (score >= 80) return { bg: '#dcfce7', text: '#166534', chip: '#16a34a' };
  if (score >= 60) return { bg: '#dbeafe', text: '#1e40af', chip: '#2563eb' };
  if (score >= 50) return { bg: '#ffedd5', text: '#9a3412', chip: '#ea580c' };
  return { bg: '#fee2e2', text: '#991b1b', chip: '#dc2626' };
};

export const getHealthGrade = (score = 0) => {
  if (score >= 80) return 'A kalite';
  if (score >= 60) return 'B kalite';
  if (score >= 50) return 'C kalite';
  return 'D kalite';
};

const normalizeGradeLetter = (value) => {
  const grade = String(value || '').trim().charAt(0).toUpperCase();
  return ['A', 'B', 'C', 'D'].includes(grade) ? grade : null;
};

export const hasCalculatedHealthScore = (value) => (
  value !== null
  && value !== undefined
  && value !== ''
  && Number.isFinite(Number(value))
);

export const getHealthMeta = (recipeOrScore) => {
  const isObject = recipeOrScore && typeof recipeOrScore === 'object';
  const scoreValue = isObject ? recipeOrScore.health_score : recipeOrScore;
  const hasScore = hasCalculatedHealthScore(scoreValue);
  const score = hasScore ? Math.max(0, Math.min(100, Number(scoreValue))) : null;
  const backendGrade = isObject ? normalizeGradeLetter(recipeOrScore.health_grade) : null;
  const grade = backendGrade || (hasScore ? getHealthGrade(score).split(' ')[0] : null);

  if (!grade) {
    return {
      hasScore: false,
      score: null,
      grade: null,
      label: 'Hesaplanmadı',
      display: '-',
      tone: { bg: 'rgba(148, 163, 184, 0.16)', text: '#64748b', chip: '#94a3b8' },
    };
  }

  const gradeScore = score ?? ({ A: 80, B: 60, C: 50, D: 0 }[grade] || 0);
  return {
    hasScore,
    score,
    grade,
    label: `${grade} Kalite`,
    display: grade,
    tone: getHealthTone(gradeScore),
  };
};

export const normalizeServingPortion = (value, max = HEALTH_SCORE_MAX_PORTION) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(max, Math.max(1, Math.trunc(number)));
};

export const stripHtml = (value) => (
  (value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const firstSentence = (value) => {
  const cleaned = stripHtml(value);
  if (!cleaned) return '';

  const match = cleaned.match(/^.*?[.!?](?=\s|$)/);
  const sentence = (match ? match[0] : cleaned).trim();
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
};

const looksLikeHealthScore = (value) => {
  const text = stripHtml(value).toLocaleLowerCase('tr-TR');
  if (!text) return false;

  return (
    /^[abcd]\s*kalite\b/.test(text)
    || /\bkalite\s*\(\d+\/100\)/.test(text)
    || text.includes('makro dagilimi')
    || text.includes('makro dağılımı')
    || text.includes('sağlık skoru')
    || text.includes('saglik skoru')
    || text.includes('skoru düşürülmüştür')
    || text.includes('skoru dusurulmustur')
    || text.includes('skoru destekledi')
  );
};

export const buildRecipeShortSummary = (recipe, fallback = 'Lezzetli ve pratik bir tarif seçeneği.') => {
  const candidates = [
    recipe?.recipe_summary,
    recipe?.description,
    recipe?.explanation,
  ];

  const realSummary = candidates.find((item) => item && !looksLikeHealthScore(item));
  if (realSummary) return firstSentence(realSummary);

  if (!recipe?.name) return fallback;

  const category = (recipe.recipe_category || 'tarif').toLocaleLowerCase('tr-TR');
  const cookingType = recipe.cooking_type
    ? `${recipe.cooking_type.toLocaleLowerCase('tr-TR')} yöntemiyle hazırlanan `
    : '';

  return `${recipe.name}, ${cookingType}kısa sürede sofraya uyarlanabilecek bir ${category} seçeneğidir.`;
};
