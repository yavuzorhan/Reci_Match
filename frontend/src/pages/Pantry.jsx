import React, { useEffect, useMemo, useState } from 'react';
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

      <style dangerouslySetInnerHTML={{ __html: `
        .layout-content:has(.pantry-noct) {
          padding: 0;
          background-color: #0c0814 !important;
          background-image:
            radial-gradient(circle at 10% 20%, rgba(100, 31, 224, 0.12) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(68, 226, 205, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(147, 0, 10, 0.03) 0%, transparent 60%) !important;
          color: #d4e4fa;
        }

        .pantry-noct {
          min-height: 100vh;
          padding: 32px;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .pantry-noct-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin: 16px 0 40px;
        }

        .pantry-title-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .pantry-title-row h1 {
          margin: 0;
          color: #d4e4fa;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(2.2rem, 3.2vw, 3.1rem);
          line-height: 1.2;
          font-weight: 700;
          letter-spacing: 0;
        }

        .pantry-title-row span {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(78, 222, 163, 0.2);
          background: rgba(28, 43, 60, 0.64);
          color: #4edea3;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .pantry-noct-header p {
          margin: 0;
          max-width: 760px;
          color: #bbcabf;
          font-size: 18px;
          line-height: 1.6;
        }

        .pantry-save {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 48px;
          padding: 0 24px;
          border-radius: 12px;
          background: #10b981;
          color: white;
          font-size: 15px;
          font-weight: 700;
          box-shadow: 0 16px 34px rgba(16, 185, 129, 0.22);
          white-space: nowrap;
        }

        .pantry-save:disabled {
          opacity: 0.68;
        }

        .pantry-bento {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
          gap: 24px;
        }

        .pantry-left,
        .pantry-right {
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-width: 0;
        }

        .pantry-glass {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          background: rgba(28, 43, 60, 0.10);
          backdrop-filter: blur(48px);
          -webkit-backdrop-filter: blur(48px);
          border: 0.5px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
        }

        .pantry-picker-panel {
          padding: 40px;
        }

        .pantry-panel-glow {
          position: absolute;
          width: 360px;
          height: 360px;
          left: -140px;
          top: -140px;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.10);
          filter: blur(80px);
          pointer-events: none;
        }

        .pantry-panel-glow.right {
          left: auto;
          right: -120px;
        }

        .pantry-panel-head,
        .pantry-category-head,
        .pantry-preview-title {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pantry-panel-head {
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .pantry-panel-head span {
          display: block;
          margin-bottom: 4px;
          color: #4edea3;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .pantry-panel-head h2,
        .pantry-preview-title h2 {
          margin: 0;
          color: #d4e4fa;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 24px;
          line-height: 1.3;
          font-weight: 600;
        }

        .pantry-panel-head svg {
          color: #4edea3;
        }

        .pantry-category-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
        }

        .pantry-category-card,
        .pantry-more-panel {
          padding: 16px;
        }

        .pantry-category-head {
          padding-bottom: 12px;
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .pantry-category-head .material-symbols-outlined,
        .pantry-category-head svg {
          color: #4edea3;
        }

        .pantry-category-head h3 {
          margin: 0;
          color: #d4e4fa;
          font-size: 15px;
          line-height: 1;
          font-weight: 700;
        }

        .pantry-chip-list,
        .pantry-suggestion-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .pantry-chip,
        .pantry-suggestion-row button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(18, 33, 49, 0.42);
          color: #d4e4fa;
          font-size: 14px;
          line-height: 1.5;
          font-weight: 500;
        }

        .pantry-chip button {
          width: 18px;
          height: 18px;
          display: grid;
          place-items: center;
          padding: 0;
          background: transparent;
          color: #86948a;
        }

        .pantry-chip button:hover {
          color: #ffb4ab;
        }

        .pantry-suggestion-row button {
          border-radius: 10px;
          color: #4edea3;
          background: rgba(78, 222, 163, 0.05);
          border-color: rgba(78, 222, 163, 0.20);
        }

        .pantry-suggestion-row button:hover:not(:disabled) {
          background: rgba(78, 222, 163, 0.12);
          border-color: rgba(78, 222, 163, 0.34);
        }

        .pantry-suggestion-row button:disabled {
          cursor: default;
          opacity: 0.48;
        }

        .pantry-empty-wide {
          grid-column: 1 / -1;
          min-height: 190px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 8px;
          padding: 32px;
          text-align: center;
          color: #bbcabf;
        }

        .pantry-empty-wide svg {
          color: #4edea3;
        }

        .pantry-empty-wide strong {
          color: #d4e4fa;
        }

        .pantry-match-preview {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pantry-preview-title > span {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          border: 1px solid rgba(78, 222, 163, 0.30);
          background: rgba(16, 185, 129, 0.20);
          color: #4edea3;
        }

        .pantry-best-match {
          position: relative;
          z-index: 1;
          margin-top: 8px;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(28, 43, 60, 0.50);
        }

        .pantry-best-match > span {
          display: block;
          margin-bottom: 12px;
          color: #44e2cd;
          font-size: 12px;
          line-height: 1.1;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .pantry-best-match p {
          margin: 0;
          color: #bbcabf;
          font-size: 14px;
          line-height: 1.5;
        }

        .pantry-best-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .pantry-best-image {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          overflow: hidden;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: #122131;
          color: #4edea3;
        }

        .pantry-best-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pantry-best-row h3 {
          margin: 0 0 8px;
          color: #d4e4fa;
          font-size: 15px;
          line-height: 1.2;
          font-weight: 700;
        }

        .pantry-match-meter {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pantry-match-meter i {
          width: 96px;
          height: 6px;
          border-radius: 999px;
          overflow: hidden;
          background: #010f1f;
        }

        .pantry-match-meter b {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #4edea3;
        }

        .pantry-match-meter small {
          color: #4edea3;
          font-size: 12px;
          font-weight: 700;
        }

        .pantry-find-btn {
          width: 100%;
          min-height: 46px;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          border-radius: 12px;
          border: 1px solid #44e2cd;
          background: transparent;
          color: #44e2cd;
          font-size: 15px;
          font-weight: 700;
        }

        .pantry-find-btn:hover {
          background: rgba(68, 226, 205, 0.10);
        }

        .pantry-ai-tip {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid rgba(252, 124, 120, 0.20);
          background: rgba(28, 43, 60, 0.40);
        }

        .pantry-ai-tip svg {
          color: #fc7c78;
          margin-top: 4px;
          flex: 0 0 auto;
        }

        .pantry-ai-tip h3 {
          margin: 0 0 4px;
          color: #d4e4fa;
          font-size: 15px;
          font-weight: 700;
        }

        .pantry-ai-tip p {
          margin: 0;
          color: #bbcabf;
          font-size: 14px;
          line-height: 1.5;
        }

        .pantry-noct .ingredient-picker {
          position: relative;
          z-index: 1;
        }

        .pantry-noct .picker-header {
          display: grid;
          gap: 14px;
        }

        .pantry-noct .search-bar {
          border-radius: 12px;
          border: 1px solid #3c4a42;
          background: #122131;
          color: #d4e4fa;
        }

        .pantry-noct .search-bar svg {
          color: #86948a;
        }

        .pantry-noct .search-bar input {
          background: transparent;
          color: #d4e4fa;
          margin: 0;
        }

        .pantry-noct .selected-area {
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(18, 33, 49, 0.56);
        }

        .pantry-noct .selected-area p {
          color: #d4e4fa !important;
          font-size: 1rem !important;
          font-weight: 900 !important;
          letter-spacing: 0;
        }

        .pantry-noct .selected-area-head span {
          color: #44e2cd;
        }

        .pantry-noct .selected-chip,
        .pantry-noct .category-btn,
        .pantry-noct .ingredient-card {
          border-radius: 10px;
          border-color: rgba(255,255,255,0.10);
          background: rgba(18, 33, 49, 0.52);
          color: #d4e4fa;
        }

        .pantry-noct .category-btn.active,
        .pantry-noct .ingredient-card.selected,
        .pantry-noct .selected-chip {
          border-color: rgba(78,222,163,0.35);
          background: rgba(78,222,163,0.10);
          color: #4edea3;
        }

        .pantry-noct .ingredient-name {
          color: inherit;
        }

        .pantry-noct .checkbox-circle {
          border-color: rgba(78,222,163,0.35);
        }

        .pantry-noct .ingredient-card.selected .checkbox-circle {
          background: #10b981;
        }

        @media (max-width: 1180px) {
          .pantry-bento {
            grid-template-columns: 1fr;
          }

          .pantry-right {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 820px) {
          .pantry-noct {
            padding: 24px 16px;
          }

          .pantry-noct-header {
            flex-direction: column;
            align-items: stretch;
          }

          .pantry-save {
            justify-content: center;
          }

          .pantry-category-grid,
          .pantry-right {
            grid-template-columns: 1fr;
          }

          .pantry-picker-panel {
            padding: 24px;
          }
        }
      ` }} />
    </Layout>
  );
};

export default Pantry;
