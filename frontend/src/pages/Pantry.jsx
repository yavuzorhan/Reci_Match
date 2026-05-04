import React, { useEffect, useMemo, useState } from 'react';
import './Pantry.css';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import {
  ArrowRight,
  ChefHat,
  Leaf,
  Lightbulb,
  Package,
  Plus,
  Save,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import IngredientPicker from '../components/IngredientPicker';

const getIngredientName = (ingredient) => ingredient.name || ingredient.ingredient_name || 'Malzeme';
const getSuggestionName = (ingredient) => (
  ingredient?.name || ingredient?.ingredient_name || ingredient?.ingredient?.name || ingredient?.ingredient?.ingredient_name || 'Malzeme'
);
const normalizeIngredientName = (name) => String(name || '').trim().toLocaleLowerCase('tr-TR');
const getIngredientCategory = (ingredient) => ingredient.category || ingredient.categoryName || 'Diğer';
const isOtherCategory = (category) => {
  const normalized = String(category || '').toLocaleLowerCase('tr-TR');
  return normalized === 'diğer' || normalized === 'diger' || normalized === 'other';
};

const getCategoryIcon = (name) => {
  const normalized = String(name || '').toLocaleLowerCase('tr-TR');
  if (normalized.includes('sebze') || normalized.includes('meyve')) return <Leaf size={20} />;
  if (normalized.includes('protein') || normalized.includes('et') || normalized.includes('balık')) return <Utensils size={20} />;
  if (normalized.includes('süt')) return <ChefHat size={20} />;
  return <Package size={20} />;
};

const fallbackSuggestions = [
  { name: 'süt', reason: 'tatlı ve kahvaltı tariflerini artırır' },
  { name: 'pirinç unu', reason: 'hafif tarif seçenekleri açar' },
  { name: 'yoğurt', reason: 'proteinli ve pratik tarifleri güçlendirir' },
];

const Pantry = () => {
  const { pantryIngredients, user, fetchUserPreferences, fetchRecommendedRecipes } = useApp();
  const navigate = useNavigate();
  const pantryIds = useMemo(() => pantryIngredients.map(i => i.id).filter(Boolean), [pantryIngredients]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [hasEdited, setHasEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [allIngredients, setAllIngredients] = useState([]);
  const effectiveSelectedIds = useMemo(
    () => (hasEdited ? selectedIds : pantryIds),
    [hasEdited, pantryIds, selectedIds]
  );

  const ingredientByName = useMemo(() => {
    const map = new Map();
    for (const ingredient of allIngredients) {
      map.set(normalizeIngredientName(getIngredientName(ingredient)), ingredient);
    }
    return map;
  }, [allIngredients]);

  const groupedIngredients = useMemo(() => {
    const groups = new Map();
    for (const ingredient of pantryIngredients || []) {
      const category = getIngredientCategory(ingredient);
      if (isOtherCategory(category)) continue;
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(ingredient);
    }
    return Array.from(groups.entries()).map(([name, items]) => ({ name, items }));
  }, [pantryIngredients]);

  useEffect(() => {
    let cancelled = false;

    const loadIngredients = async () => {
      try {
        const query = user?.id ? `?user_id=${user.id}` : '';
        const response = await fetch(`${API_BASE}/api/ingredients/categorized${query}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setAllIngredients((data || []).flatMap(category => category.ingredients || []));
        }
      } catch {
        if (!cancelled) setAllIngredients([]);
      }
    };

    loadIngredients();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!effectiveSelectedIds.length) {
        setMatches([]);
        return;
      }

      setMatchesLoading(true);
      try {
        const data = await fetchRecommendedRecipes({
          selected_ingredient_ids: effectiveSelectedIds,
          pantry_ingredient_ids: effectiveSelectedIds,
          exclude_disliked: true,
        });
        if (!cancelled) setMatches((data || []).slice(0, 3));
      } catch {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setMatchesLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [effectiveSelectedIds, fetchRecommendedRecipes]);

  const handleSavePantry = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/api/users/${user.id}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient_ids: effectiveSelectedIds }),
      });
      if (response.ok) {
        await fetchUserPreferences();
        setHasEdited(false);
      } else {
        alert('Dolabınız güncellenemedi.');
      }
    } catch {
      alert('Hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const bestMatch = matches[0];
  const suggestedMissing = useMemo(() => {
    const seen = new Set();
    const collected = [];

    for (const recipe of matches || []) {
      for (const ingredient of recipe.missing_ingredients || []) {
        const name = getSuggestionName(ingredient);
        const matchedIngredient = ingredientByName.get(normalizeIngredientName(name));
        const resolvedId = ingredient?.id || matchedIngredient?.id;
        const key = resolvedId || normalizeIngredientName(name);
        if (!key || seen.has(key) || (resolvedId && effectiveSelectedIds.includes(resolvedId))) continue;
        seen.add(key);
        collected.push({ ...ingredient, id: resolvedId, name });
      }
    }

    for (const fallback of fallbackSuggestions) {
      const matchedIngredient = ingredientByName.get(normalizeIngredientName(fallback.name));
      const key = matchedIngredient?.id || normalizeIngredientName(fallback.name);
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push({ ...fallback, id: matchedIngredient?.id, isFallback: true });
    }

    return collected.slice(0, 3);
  }, [effectiveSelectedIds, ingredientByName, matches]);

  const addSuggestedIngredient = (ingredient) => {
    if (!ingredient?.id) return;
    setHasEdited(true);
    setSelectedIds((currentIds) => {
      const sourceIds = hasEdited ? currentIds : pantryIds;
      return sourceIds.includes(ingredient.id) ? sourceIds : [...sourceIds, ingredient.id];
    });
  };

  return (
    <Layout>
      <main className="pantry-noct">
        <header className="pantry-noct-header">
          <div>
            <div className="pantry-title-row">
              <h1>Dolabım</h1>
              <span>{effectiveSelectedIds.length} malzeme kayıtlı</span>
            </div>
            <p>Malzemelerini yönet ve bugün yapabileceğin tarifleri keşfet.</p>
          </div>

          <button className="pantry-save" onClick={handleSavePantry} disabled={saving}>
            <Save size={18} />
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </header>

        <div className="pantry-bento">
          <div className="pantry-left">
            <section className="pantry-glass pantry-picker-panel">
              <div className="pantry-panel-glow" />
              <div className="pantry-panel-head">
                <div>
                  <span>Malzeme Ekle</span>
                  <h2>Dolabını Güncelle</h2>
                </div>
                <Package size={26} />
              </div>
              <IngredientPicker
                key={pantryIds.join('-')}
                userId={user?.id}
                initialSelection={effectiveSelectedIds}
                selectedLabel="Dolabımdakiler"
                selectedDescription="Tarif eşleşmeleri ve öneriler doğrudan bu dolap listesine göre hesaplanır."
                searchPlaceholder="Dolabına malzeme ekle (Örn: Domates, Tavuk...)"
                onSelectionChange={(ids) => {
                  setHasEdited(true);
                  setSelectedIds(ids);
                }}
              />
            </section>

            {!!groupedIngredients.length && (
              <section className="pantry-category-grid">
                {groupedIngredients.slice(0, 4).map((group) => (
                  <article className="pantry-glass pantry-category-card" key={group.name}>
                    <div className="pantry-category-head">
                      <span>{getCategoryIcon(group.name)}</span>
                      <h3>{group.name}</h3>
                    </div>
                    <div className="pantry-chip-list">
                      {group.items.slice(0, 8).map((ingredient) => (
                        <span key={ingredient.id} className="pantry-chip">
                          {getIngredientName(ingredient)}
                          <button
                            type="button"
                            onClick={() => {
                              setHasEdited(true);
                              setSelectedIds(effectiveSelectedIds.filter(id => id !== ingredient.id));
                            }}
                            aria-label={`${getIngredientName(ingredient)} kaldır`}
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </section>
            )}

            <section className="pantry-glass pantry-more-panel">
              <div className="pantry-category-head">
                <Plus size={20} />
                <h3>Daha Fazla Tarif İçin Ekle</h3>
              </div>
              <div className="pantry-suggestion-row">
                {suggestedMissing.map((item) => (
                  <button
                    type="button"
                    key={item.id || item.name}
                    onClick={() => addSuggestedIngredient(item)}
                    disabled={!item.id || effectiveSelectedIds.includes(item.id)}
                    title={item.reason || 'Dolabına ekle'}
                  >
                    <Plus size={16} />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="pantry-right">
            <section className="pantry-glass pantry-match-preview">
              <div className="pantry-panel-glow right" />
              <div className="pantry-preview-title">
                <span>
                  <Sparkles size={28} />
                </span>
                <h2>{matchesLoading ? 'Hesaplanıyor' : `${matches.length} tarif yapılabilir`}</h2>
              </div>

              <div className="pantry-best-match">
                <span>En İyi Eşleşme</span>
                {bestMatch ? (
                  <div className="pantry-best-row">
                    <div className="pantry-best-image">
                      {bestMatch.image_url ? <img src={bestMatch.image_url} alt={bestMatch.name} /> : <ChefHat size={28} />}
                    </div>
                    <div>
                      <h3>{bestMatch.name}</h3>
                      <div className="pantry-match-meter">
                        <i><b style={{ width: `${bestMatch.score || 0}%` }} /></i>
                        <small>{bestMatch.score || 0}% Eşleşme</small>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p>Dolabındaki malzemelerle tarif önizlemesi burada görünecek.</p>
                )}
              </div>

              <button className="pantry-find-btn" onClick={() => navigate('/select-ingredients')}>
                Tarifleri Bul
                <ArrowRight size={18} />
              </button>
            </section>

            <section className="pantry-ai-tip">
              <Lightbulb size={22} />
              <div>
                <h3>Akıllı Öneri</h3>
                <p>
                  {suggestedMissing[0]
                    ? `${suggestedMissing[0].name} ekleyerek yeni tarif eşleşmeleri açabilirsin.`
                    : 'Dolabındaki malzemeleri artırdıkça öneri kalitesi yükselir.'}
                </p>
              </div>
            </section>
          </aside>
        </div>
      </main>

    </Layout>
  );
};

export default Pantry;
