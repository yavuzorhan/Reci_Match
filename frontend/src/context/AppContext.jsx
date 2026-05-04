import React, { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import { API_BASE } from '../config';

const AppContext = createContext();

const withProxiedImage = (recipe) => {
  if (!recipe?.image_url) return recipe;
  if (recipe.image_url.startsWith('/uploads')) return { ...recipe, image_url: `${API_BASE}${recipe.image_url}` };
  if (recipe.image_url.startsWith(`${API_BASE}/api/recipe-image`)) return recipe;
  if (recipe.image_url.startsWith(`${API_BASE}/uploads`)) return recipe;
  const proxiedUrl = `${API_BASE}/api/recipe-image?url=${encodeURIComponent(recipe.image_url)}`;
  return { ...recipe, image_url: proxiedUrl };
};

const withProxiedImages = (recipes) => {
  if (Array.isArray(recipes)) return recipes.map(withProxiedImage);
  return recipes;
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('reciMatch_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [profile, setProfile] = useState({});
  const [dislikedIngredients, setDislikedIngredients] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [pantryIngredients, setPantryIngredients] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [recipeCache, setRecipeCache] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('reciMatch_theme') === 'dark';
  });

  // Sync user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('reciMatch_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('reciMatch_user');
    }
  }, [user]);

  // Sync theme to localStorage and body class
  useEffect(() => {
    localStorage.setItem('reciMatch_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const fetchJson = useCallback(async (url, options = {}) => {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'İşlem başarısız');
    return data;
  }, []);

  const fetchUserPreferences = useCallback(async () => {
    if (!user?.id) return;
    try {
      const safeFetch = async (url, fallback) => {
        try {
          return await fetchJson(url);
        } catch (error) {
          console.error('Preference endpoint error:', url, error);
          return fallback;
        }
      };

      const [dislikedData, pantryData, favoriteIds, dailyLogData, profileData] = await Promise.all([
        safeFetch(`${API_BASE}/api/users/${user.id}/disliked-ingredients`, []),
        safeFetch(`${API_BASE}/api/users/${user.id}/ingredients`, []),
        safeFetch(`${API_BASE}/api/users/${user.id}/favorites`, []),
        safeFetch(`${API_BASE}/api/users/${user.id}/daily-logs`, []),
        safeFetch(`${API_BASE}/api/users/${user.id}/profile`, {}),
      ]);

      setDislikedIngredients(dislikedData);
      setPantryIngredients(pantryData);
      setFavorites(favoriteIds);
      setDailyLogs(dailyLogData);
      
      // Normalize profile fields to match frontend usage
      if (profileData && Object.keys(profileData).length > 0) {
        const normalizedProfile = {
          ...profileData,
          height: profileData.height ?? profileData.height_cm,
          weight: profileData.weight ?? profileData.weight_kg,
          name: profileData.name ?? profileData.name_surname ?? user.name
        };
        setProfile(normalizedProfile);
      }

      const recipeIds = [...new Set([
        ...favoriteIds,
        ...dailyLogData.map(log => log.recipeId),
      ])];

      if (recipeIds.length) {
        const params = new URLSearchParams();
        params.append('user_id', user.id);
        recipeIds.forEach(recipeId => params.append('ids', recipeId));

        const recipes = withProxiedImages(await fetchJson(`${API_BASE}/api/recipes?${params.toString()}`));
        setRecipeCache(prev => {
          const next = { ...prev };
          for (const recipe of recipes) {
            next[recipe.id] = recipe;
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Preference sync error:', error);
    }
  }, [fetchJson, user]);

  useEffect(() => {
    fetchUserPreferences();
  }, [fetchUserPreferences]);

  const fetchRecommendedRecipes = useCallback(async (filters = {}) => {
    const data = withProxiedImages(await fetchJson(`${API_BASE}/api/recipes/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selected_ingredient_ids: filters.selected_ingredient_ids ?? selectedIngredients,
        pantry_ingredient_ids: filters.pantry_ingredient_ids ?? [],
        disliked_ingredient_ids: filters.disliked_ingredient_ids ?? dislikedIngredients,
        cooking_types: filters.cooking_type || [],
        exclude_disliked: Boolean(filters.exclude_disliked),
        source: filters.source || null,
        healthy_only: Boolean(filters.healthy_only),
        user_id: user?.id || null,
      }),
    }));
    return data;
  }, [fetchJson, user, selectedIngredients, dislikedIngredients]);

  const fetchRecipeById = useCallback(async (id) => {
    const cachedRecipe = recipeCache[id];
    if (cachedRecipe && Array.isArray(cachedRecipe.ingredients) && cachedRecipe.ingredients.length > 0) {
      return cachedRecipe;
    }

    const data = withProxiedImage(await fetchJson(`${API_BASE}/api/recipes/${id}`));
    
    // Normalize ingredients
    const rawIngs = data.ingredients || data.recipe_ingredients || [];
    const normalizedRecipe = {
        ...data,
        ingredients: rawIngs.map(ing => ({
            id: ing.id || ing.ingredient?.id || ing.ingredient_id,
            name: ing.name || ing.ingredient_name || ing.ingredient?.name || ing.ingredient?.ingredient_name || 'İsimsiz Malzeme',
            amount: ing.amount,
            unit: ing.unit,
            nutrition_data_source: ing.nutrition?.nutrition_data_source || ing.nutrition_data_source
        }))
    };

    setRecipeCache(prev => ({ ...prev, [id]: normalizedRecipe }));
    return normalizedRecipe;
  }, [fetchJson, recipeCache]);

  const fetchRecipesByIds = useCallback(async (ids) => {
    const missingIds = ids.filter(id => !recipeCache[id]);
    if (missingIds.length === 0) return ids.map(id => recipeCache[id]);

    const params = new URLSearchParams();
    missingIds.forEach(id => params.append('ids', id));
    if (user?.id) params.append('user_id', user.id);

    const data = withProxiedImages(await fetchJson(`${API_BASE}/api/recipes?${params.toString()}`));
    setRecipeCache(prev => {
      const next = { ...prev };
      data.forEach(r => { next[r.id] = r; });
      return next;
    });
    return ids.map(id => recipeCache[id] || data.find(r => r.id === id));
  }, [fetchJson, recipeCache, user]);

  const fetchAllRecipes = useCallback(async () => {
    const query = user?.id ? `?user_id=${user.id}` : '';
    const data = withProxiedImages(await fetchJson(`${API_BASE}/api/recipes${query}`));
    return data;
  }, [fetchJson, user]);

  const fetchHealthyRecipes = useCallback(async () => {
     const data = withProxiedImages(await fetchJson(`${API_BASE}/api/recipes?healthy_only=true`));
     return data;
  }, [fetchJson]);

  const toggleFavorite = useCallback(async (recipeId) => {
    if (!user?.id) return;
    const isFavorite = favorites.includes(recipeId);
    if (isFavorite) {
      await fetchJson(`${API_BASE}/api/users/${user.id}/favorites/${recipeId}`, {
        method: 'DELETE',
      });
    } else {
      await fetchJson(`${API_BASE}/api/users/${user.id}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipeId }),
      });
    }
    setFavorites(prev =>
      isFavorite ? prev.filter(id => id !== recipeId) : [...prev, recipeId]
    );
  }, [favorites, fetchJson, user]);

  const addDailyLog = useCallback(async ({ recipeId, mealType = 'Akşam Yemeği', servingCount = 1, servingMultiplier = 1, logDate = null, entrySource = 'daily' }) => {
    if (!user?.id) throw new Error('Giriş yapmalısınız.');
    const data = await fetchJson(`${API_BASE}/api/users/${user.id}/daily-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipe_id: Number(recipeId),
        meal_type: mealType,
        serving_count: servingCount,
        serving_multiplier: servingMultiplier,
        log_date: logDate,
        entry_source: entrySource,
      }),
    });
    setDailyLogs(prev => [data.log, ...prev]);
    return data.log;
  }, [fetchJson, user]);

  const removeDailyLog = useCallback(async (logId) => {
    if (!user?.id) throw new Error('Giriş yapmalısınız.');
    await fetchJson(`${API_BASE}/api/users/${user.id}/daily-logs/${logId}`, {
      method: 'DELETE',
    });
    setDailyLogs(prev => prev.filter(log => log.id !== logId));
  }, [fetchJson, user]);

  const updateDailyLog = useCallback(async (logId, updateData) => {
    if (!user?.id) throw new Error('Giriş yapmalısınız.');
    const data = await fetchJson(`${API_BASE}/api/users/${user.id}/daily-logs/${logId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    setDailyLogs(prev => prev.map(log => log.id === logId ? data.log : log));
    return data.log;
  }, [fetchJson, user]);

  const addCustomIngredient = useCallback(async (name, categoryId) => {
    if (!user?.id) return;
    const data = await fetchJson(`${API_BASE}/api/users/${user.id}/custom-ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category_id: categoryId }),
    });
    return data;
  }, [fetchJson, user]);

  const addCustomRecipe = useCallback(async (recipeData) => {
    if (!user?.id) return;
    const data = await fetchJson(`${API_BASE}/api/users/${user.id}/custom-recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipeData),
    });
    return data;
  }, [fetchJson, user]);

  const updateCustomRecipe = useCallback(async (recipeId, recipeData) => {
    if (!user?.id) return;
    const data = await fetchJson(`${API_BASE}/api/users/${user.id}/custom-recipes/${recipeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipeData),
    });
    setRecipeCache(prev => {
      const next = { ...prev };
      delete next[recipeId];
      return next;
    });
    return data;
  }, [fetchJson, user]);

  const deleteCustomRecipe = useCallback(async (recipeId) => {
    if (!user?.id) return;
    const data = await fetchJson(`${API_BASE}/api/users/${user.id}/custom-recipes/${recipeId}`, {
      method: 'DELETE',
    });
    setRecipeCache(prev => {
      const next = { ...prev };
      delete next[recipeId];
      return next;
    });
    return data;
  }, [fetchJson, user]);

  const uploadRecipeImage = useCallback(async (recipeId, file, onProgress = null) => {
    if (!user?.id) throw new Error('Giris yapmalisiniz.');
    const formData = new FormData();
    formData.append('image', file);
    onProgress?.(35);
    const data = await fetchJson(`${API_BASE}/api/recipes/${recipeId}/image?user_id=${user.id}`, {
      method: 'POST',
      body: formData,
    });
    onProgress?.(100);
    return data;
  }, [fetchJson, user]);

  const reviseRecipe = useCallback(async (recipeId, modifications) => {
    if (!user?.id) throw new Error('Giris yapmalisiniz.');
    return fetchJson(`${API_BASE}/api/recipes/${recipeId}/revise?user_id=${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modifications),
    });
  }, [fetchJson, user]);

  const saveRevisedRecipe = useCallback(async (recipeId, revisedRecipe) => {
    if (!user?.id) throw new Error('Giris yapmalisiniz.');
    return fetchJson(`${API_BASE}/api/recipes/${recipeId}/revise/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, revised_recipe: revisedRecipe }),
    });
  }, [fetchJson, user]);

  const createManualIngredient = useCallback(async (ingredientName, nutritionValues) => {
    if (!user?.id) throw new Error('Giris yapmalisiniz.');
    return fetchJson(`${API_BASE}/api/users/${user.id}/ingredients/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredient_name: ingredientName,
        ...nutritionValues,
      }),
    });
  }, [fetchJson, user]);

  const calorieTarget = profile.daily_calorie || 2000;
  const proteinTarget = Math.round((calorieTarget * 0.25) / 4);
  const carbTarget = Math.round((calorieTarget * 0.45) / 4);
  const fatTarget = Math.round((calorieTarget * 0.30) / 9);

  const dashboardData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = dailyLogs.filter(log => {
      if ((log.entrySource || 'daily') === 'weekly') return false;
      const logDate = new Date(log.loggedAt || log.logDate || log.eatenAt).toISOString().split('T')[0];
      return logDate === todayStr;
    });

    const consumed = todayLogs.reduce((acc, log) => {
      const rec = recipeCache[log.recipeId];
      const multiplier = log.servingMultiplier || 1;
      return {
        calories: acc.calories + (log.calorieIntake || rec?.calorie || 0),
        protein: acc.protein + ((rec?.protein || 10) * multiplier),
        carb: acc.carb + ((rec?.carbohydrate || 20) * multiplier),
        fat: acc.fat + ((rec?.fat || 5) * multiplier)
      };
    }, { calories: 0, protein: 0, carb: 0, fat: 0 });

    return {
      dailyCalorieTarget: calorieTarget,
      consumedCalories: Math.round(consumed.calories),
      macros: {
        protein: Math.round(consumed.protein),
        carb: Math.round(consumed.carb),
        fat: Math.round(consumed.fat)
      },
      macroTargets: { protein: proteinTarget, carb: carbTarget, fat: fatTarget },
      objective: profile.objective || 'Kilo Vermek',
      mealCount: profile.meals || 3
    };
  }, [dailyLogs, profile, calorieTarget, proteinTarget, carbTarget, fatTarget, recipeCache]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <AppContext.Provider value={{
      user, setUser,
      profile, setProfile,
      dislikedIngredients, setDislikedIngredients,
      selectedIngredients, setSelectedIngredients,
      pantryIngredients, setPantryIngredients,
      favorites, setFavorites,
      dailyLogs, setDailyLogs,
      toggleFavorite,
      addDailyLog,
      removeDailyLog,
      updateDailyLog,
      fetchUserPreferences,
      recipeCache,
      fetchRecommendedRecipes,
      fetchRecipeById,
      fetchRecipesByIds,
      fetchAllRecipes,
      fetchHealthyRecipes,
      addCustomIngredient,
      addCustomRecipe,
      updateCustomRecipe,
      deleteCustomRecipe,
      uploadRecipeImage,
      reviseRecipe,
      saveRevisedRecipe,
      createManualIngredient,
      dashboardData,
      isDarkMode, toggleDarkMode
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
