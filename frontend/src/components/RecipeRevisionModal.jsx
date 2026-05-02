import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const RecipeRevisionModal = ({ recipe, onClose, onSaved }) => {
  const navigate = useNavigate();
  const { reviseRecipe, saveRevisedRecipe } = useApp();
  const [removeIngredients, setRemoveIngredients] = useState([]);
  const [adjustAmounts, setAdjustAmounts] = useState([]);
  const [addIngredients, setAddIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState({ name: '', amount: '', unit: '' });
  const [freeTextRequest, setFreeTextRequest] = useState('');
  const [revised, setRevised] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleRemove = (name) => {
    setRemoveIngredients(prev =>
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    );
  };

  const revise = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await reviseRecipe(recipe.id, {
        original_recipe_id: recipe.id,
        remove_ingredients: removeIngredients,
        add_ingredients: addIngredients,
        adjust_amounts: adjustAmounts,
        free_text_request: freeTextRequest,
      });
      setRevised(result.revised_recipe);
    } catch (err) {
      setError(err.message || 'Tarif revize edilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!revised) return;
    setLoading(true);
    setError('');
    try {
      const response = await saveRevisedRecipe(recipe.id, revised);
      const newId = response?.recipe_id || response?.id;
      if (onSaved && newId) {
        onSaved(newId);
      } else {
        navigate('/recipes');
      }
    } catch (err) {
      setError(err.message || 'Revize tarif kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    if (!newIngredient.name.trim()) return;
    setAddIngredients(prev => [
      ...prev,
      { ...newIngredient, amount: Number(newIngredient.amount) || null },
    ]);
    setNewIngredient({ name: '', amount: '', unit: '' });
  };

  return (
    <div className="revision-backdrop">
      <div className="revision-shell">
        <div className="revision-header">
          <div className="revision-title-wrap">
            <div className="revision-mark">
              <Wand2 size={22} />
            </div>
            <div>
              <span className="revision-eyebrow">Tarif Stüdyosu</span>
              <h2>Bu Tarifi Revize Et</h2>
              <p>{recipe.name || recipe.recipe_name}</p>
            </div>
          </div>
          <button className="revision-icon-btn" onClick={onClose} aria-label="Kapat">
            <X size={22} />
          </button>
        </div>

        {error && (
          <div className="revision-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="revision-outer-grid">
          <section className="revision-panel">
            <div className="revision-panel-head">
              <div>
                <span className="revision-kicker">Düzenle</span>
                <h3>Malzemeler</h3>
              </div>
              <span className="revision-count">{recipe.ingredients?.length || 0}</span>
            </div>

            <div className="revision-ingredient-list">
              {(recipe.ingredients || []).map(item => {
                const isRemoved = removeIngredients.includes(item.name);
                return (
                  <div key={item.name} className={`revision-ingredient-row ${isRemoved ? 'is-removed' : ''}`}>
                    <div className="revision-ingredient-main">
                      <strong>{item.name}</strong>
                      <span>{item.amount || '-'} {item.unit || ''}</span>
                    </div>
                    <input
                      type="number"
                      placeholder="Miktar"
                      className="revision-small-input"
                      onChange={(e) => {
                        const value = e.target.value;
                        setAdjustAmounts(prev => [
                          ...prev.filter(row => row.ingredient !== item.name),
                          ...(value ? [{ ingredient: item.name, new_amount: Number(value) }] : []),
                        ]);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleRemove(item.name)}
                      className={`revision-row-action ${isRemoved ? 'restore' : 'remove'}`}
                    >
                      {isRemoved ? <RotateCcw size={15} /> : <Trash2 size={15} />}
                      {isRemoved ? 'Geri Al' : 'Çıkar'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="revision-add-box">
              <div className="revision-add-grid">
                <input
                  placeholder="Yeni malzeme"
                  value={newIngredient.name}
                  onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })}
                />
                <input
                  placeholder="Miktar"
                  type="number"
                  value={newIngredient.amount}
                  onChange={e => setNewIngredient({ ...newIngredient, amount: e.target.value })}
                />
                <input
                  placeholder="Birim"
                  value={newIngredient.unit}
                  onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                />
                <button type="button" onClick={addIngredient}>
                  <Plus size={17} />
                </button>
              </div>

              {addIngredients.length > 0 && (
                <div className="revision-added-list">
                  {addIngredients.map((item, index) => (
                    <span key={`${item.name}-${index}`}>
                      {item.amount || ''} {item.unit || ''} {item.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <textarea
              placeholder="Örn. daha hafif yap, vegan yap, yağı azalt..."
              value={freeTextRequest}
              onChange={e => setFreeTextRequest(e.target.value)}
              rows={4}
              className="revision-textarea"
            />

            <button
              className="revision-primary-btn"
              onClick={revise}
              disabled={loading}
            >
              {loading && !revised ? <Loader2 size={18} className="revision-spin" /> : <Sparkles size={18} />}
              Revize Et
            </button>
          </section>

          <section className="revision-panel result-panel">
            <div className="revision-panel-head">
              <div>
                <span className="revision-kicker">Sonuç</span>
                <h3>Revize Tarif</h3>
              </div>
              {revised && <CheckCircle2 size={24} color="#16a34a" />}
            </div>

            {loading && !revised ? (
              <div className="revision-empty-state">
                <Loader2 size={34} className="revision-spin" />
                <strong>Revize ediliyor</strong>
              </div>
            ) : revised ? (
              <div className="revision-result">
                <h4>{revised.recipe_name}</h4>

                <div className="revision-compare-grid">
                  <div className="revision-compare-column">
                    <span>Orijinal</span>
                    {recipe.ingredients.map(item => {
                      const isRemoved = (revised.ingredients || []).every(
                        r => r.ingredient_name !== item.name
                      );
                      return (
                        <div key={item.name} className={isRemoved ? 'removed-line' : ''}>
                          {item.amount || ''} {item.unit || ''} {item.name}
                        </div>
                      );
                    })}
                  </div>

                  <div className="revision-compare-column accent">
                    <span>Revize</span>
                    {(revised.ingredients || []).map((item, index) => {
                      const inOriginal = recipe.ingredients.some(o => o.name === item.ingredient_name);
                      return (
                        <div key={`${item.ingredient_name}-${index}`} className={!inOriginal ? 'new-line' : ''}>
                          {item.amount || ''} {item.unit || ''} {item.ingredient_name}
                          {item.change_reason && (
                            <small>{item.change_reason}</small>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {revised.revision_summary && (
                  <div className="revision-summary">
                    <strong>Yapılan değişiklikler</strong>
                    <p>{revised.revision_summary}</p>
                  </div>
                )}

                {revised.preparation && (
                  <div className="revision-prep">
                    <strong>Hazırlanış</strong>
                    <p>{revised.preparation}</p>
                  </div>
                )}

                <button
                  className="revision-save-btn"
                  onClick={save}
                  disabled={loading}
                >
                  {loading ? <Loader2 size={18} className="revision-spin" /> : <Save size={18} />}
                  {loading ? 'Kaydediliyor...' : 'Onayla ve Kaydet'}
                </button>
              </div>
            ) : (
              <div className="revision-empty-state">
                <Sparkles size={34} />
                <strong>Revize sonucu burada oluşacak</strong>
              </div>
            )}
          </section>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .revision-backdrop {
            position: fixed;
            inset: 0;
            z-index: 1000;
            display: grid;
            place-items: center;
            padding: 1.2rem;
            background: rgba(15, 23, 42, 0.68);
            backdrop-filter: blur(16px);
          }
          .revision-shell {
            width: min(1120px, 100%);
            max-height: 92vh;
            overflow: hidden;
            border-radius: 28px;
            background: var(--card-bg);
            border: 1px solid rgba(255,255,255,0.18);
            box-shadow: 0 34px 90px rgba(0,0,0,0.34);
            display: flex;
            flex-direction: column;
          }
          .revision-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.4rem 1.5rem;
            border-bottom: 1px solid var(--border-color);
            background: linear-gradient(135deg, rgba(16, 185, 129,0.16), rgba(22,163,74,0.08));
          }
          .revision-title-wrap {
            display: flex;
            gap: 1rem;
            min-width: 0;
          }
          .revision-mark {
            width: 52px;
            height: 52px;
            border-radius: 18px;
            display: grid;
            place-items: center;
            flex-shrink: 0;
            color: white;
            background: linear-gradient(135deg, #10b981, #16a34a);
            box-shadow: 0 14px 34px rgba(16, 185, 129,0.28);
          }
          .revision-eyebrow,
          .revision-kicker {
            display: block;
            color: var(--primary-color);
            font-size: 0.72rem;
            font-weight: 950;
            text-transform: uppercase;
            margin-bottom: 0.25rem;
          }
          .revision-header h2 {
            margin: 0;
            color: var(--text-primary);
            font-size: 1.8rem;
            line-height: 1.1;
            font-weight: 950;
          }
          .revision-header p {
            margin: 0.35rem 0 0;
            color: var(--text-secondary);
            font-size: 0.95rem;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 660px;
          }
          .revision-icon-btn {
            width: 44px;
            height: 44px;
            border-radius: 16px;
            border: 1px solid var(--border-color);
            background: rgba(255,255,255,0.72);
            color: var(--text-primary);
            display: grid;
            place-items: center;
            cursor: pointer;
          }
          .revision-error {
            margin: 1rem 1.5rem 0;
            padding: 0.85rem 1rem;
            border-radius: 16px;
            display: flex;
            align-items: center;
            gap: 0.65rem;
            color: #b91c1c;
            background: rgba(220,38,38,0.08);
            border: 1px solid rgba(220,38,38,0.18);
            font-weight: 800;
          }
          .revision-outer-grid {
            padding: 1.5rem;
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 1.2rem;
            overflow-y: auto;
          }
          .revision-panel {
            min-width: 0;
            border: 1px solid var(--border-color);
            border-radius: 22px;
            background: rgba(255,255,255,0.045);
            padding: 1rem;
          }
          .revision-panel-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            margin-bottom: 1rem;
          }
          .revision-panel h3,
          .revision-result h4 {
            margin: 0;
            color: var(--text-primary);
            font-weight: 950;
          }
          .revision-count {
            min-width: 42px;
            height: 42px;
            border-radius: 14px;
            display: grid;
            place-items: center;
            background: var(--background-elevated);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            font-weight: 950;
          }
          .revision-ingredient-list {
            display: grid;
            gap: 0.65rem;
            max-height: 300px;
            overflow-y: auto;
            padding-right: 0.25rem;
          }
          .revision-ingredient-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 84px auto;
            align-items: center;
            gap: 0.65rem;
            padding: 0.8rem;
            border-radius: 16px;
            background: var(--background-elevated);
            border: 1px solid var(--border-color);
          }
          .revision-ingredient-row.is-removed {
            background: rgba(220,38,38,0.07);
            border-color: rgba(220,38,38,0.18);
          }
          .revision-ingredient-main {
            min-width: 0;
          }
          .revision-ingredient-main strong {
            display: block;
            color: var(--text-primary);
            font-size: 0.94rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .revision-ingredient-main span {
            display: block;
            margin-top: 0.15rem;
            color: var(--text-secondary);
            font-size: 0.78rem;
            font-weight: 800;
          }
          .revision-ingredient-row.is-removed .revision-ingredient-main strong {
            text-decoration: line-through;
            color: #dc2626;
          }
          .revision-small-input,
          .revision-add-grid input,
          .revision-textarea {
            min-width: 0;
            border: 1px solid var(--border-color);
            border-radius: 14px;
            background: var(--card-bg);
            color: var(--text-primary);
            padding: 0.75rem 0.85rem;
            font-weight: 750;
            outline: none;
          }
          .revision-small-input {
            width: 84px;
            padding: 0.65rem 0.55rem;
          }
          .revision-row-action {
            height: 38px;
            padding: 0 0.75rem;
            border-radius: 13px;
            border: 1px solid;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            cursor: pointer;
            font-weight: 900;
            white-space: nowrap;
          }
          .revision-row-action.remove {
            color: #dc2626;
            background: rgba(220,38,38,0.08);
            border-color: rgba(220,38,38,0.2);
          }
          .revision-row-action.restore {
            color: var(--text-secondary);
            background: rgba(255,255,255,0.08);
            border-color: var(--border-color);
          }
          .revision-add-box {
            margin-top: 1rem;
            padding: 0.85rem;
            border-radius: 18px;
            background: rgba(22,163,74,0.07);
            border: 1px solid rgba(22,163,74,0.16);
          }
          .revision-add-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 88px 78px 44px;
            gap: 0.55rem;
          }
          .revision-add-grid button {
            border: none;
            border-radius: 14px;
            display: grid;
            place-items: center;
            color: white;
            background: #16a34a;
            cursor: pointer;
          }
          .revision-added-list {
            display: flex;
            gap: 0.45rem;
            flex-wrap: wrap;
            margin-top: 0.75rem;
          }
          .revision-added-list span {
            padding: 0.38rem 0.65rem;
            border-radius: 999px;
            background: rgba(22,163,74,0.12);
            color: #15803d;
            font-size: 0.82rem;
            font-weight: 900;
          }
          .revision-textarea {
            width: 100%;
            resize: vertical;
            margin-top: 1rem;
            line-height: 1.5;
          }
          .revision-primary-btn,
          .revision-save-btn {
            width: 100%;
            min-height: 50px;
            margin-top: 0.9rem;
            border: none;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.55rem;
            color: white;
            font-weight: 950;
            cursor: pointer;
            box-shadow: 0 16px 30px rgba(16, 185, 129,0.24);
          }
          .revision-primary-btn {
            background: linear-gradient(135deg, #10b981, #0f766e);
          }
          .revision-save-btn {
            background: linear-gradient(135deg, #059669, #16a34a);
            box-shadow: 0 16px 30px rgba(22,163,74,0.22);
          }
          .revision-primary-btn:disabled,
          .revision-save-btn:disabled {
            opacity: 0.72;
            cursor: not-allowed;
          }
          .result-panel {
            background: linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.025));
          }
          .revision-empty-state {
            min-height: 360px;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 0.8rem;
            color: var(--text-secondary);
            text-align: center;
            border: 1px dashed var(--border-color);
            border-radius: 18px;
            background: var(--background-elevated);
          }
          .revision-empty-state strong {
            color: var(--text-primary);
            font-size: 1rem;
          }
          .revision-result {
            display: grid;
            gap: 1rem;
          }
          .revision-result h4 {
            padding: 0.9rem 1rem;
            border-radius: 17px;
            background: var(--background-elevated);
            border: 1px solid var(--border-color);
          }
          .revision-compare-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 0.85rem;
          }
          .revision-compare-column {
            min-width: 0;
            padding: 0.9rem;
            border-radius: 17px;
            background: var(--background-elevated);
            border: 1px solid var(--border-color);
          }
          .revision-compare-column span {
            display: block;
            margin-bottom: 0.65rem;
            color: var(--text-secondary);
            font-size: 0.76rem;
            font-weight: 950;
            text-transform: uppercase;
          }
          .revision-compare-column div {
            padding: 0.4rem 0;
            color: var(--text-primary);
            font-size: 0.9rem;
            font-weight: 750;
            border-bottom: 1px solid rgba(148,163,184,0.16);
          }
          .revision-compare-column div:last-child {
            border-bottom: none;
          }
          .revision-compare-column.accent {
            border-color: rgba(22,163,74,0.24);
          }
          .removed-line {
            color: #dc2626 !important;
            text-decoration: line-through;
          }
          .new-line {
            color: #15803d !important;
            font-weight: 950 !important;
          }
          .revision-compare-column small {
            display: block;
            margin-top: 0.18rem;
            color: var(--text-secondary);
            font-size: 0.74rem;
            font-weight: 700;
          }
          .revision-summary,
          .revision-prep {
            padding: 1rem;
            border-radius: 17px;
            background: var(--background-elevated);
            border: 1px solid var(--border-color);
          }
          .revision-summary strong,
          .revision-prep strong {
            display: block;
            margin-bottom: 0.45rem;
            color: var(--text-primary);
            font-weight: 950;
          }
          .revision-summary p,
          .revision-prep p {
            margin: 0;
            color: var(--text-secondary);
            line-height: 1.65;
            font-size: 0.92rem;
            font-weight: 650;
            white-space: pre-wrap;
          }
          .revision-spin {
            animation: revisionSpin 1s linear infinite;
          }
          @keyframes revisionSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @media (max-width: 900px) {
            .revision-shell {
              max-height: 94vh;
              border-radius: 22px;
            }
            .revision-outer-grid,
            .revision-compare-grid {
              grid-template-columns: 1fr;
            }
            .revision-header p {
              max-width: 420px;
            }
          }
          @media (max-width: 620px) {
            .revision-backdrop {
              padding: 0.6rem;
            }
            .revision-header,
            .revision-outer-grid {
              padding: 1rem;
            }
            .revision-header h2 {
              font-size: 1.35rem;
            }
            .revision-mark {
              width: 44px;
              height: 44px;
              border-radius: 15px;
            }
            .revision-ingredient-row,
            .revision-add-grid {
              grid-template-columns: 1fr;
            }
            .revision-small-input {
              width: 100%;
            }
            .revision-row-action,
            .revision-add-grid button {
              width: 100%;
            }
            .revision-icon-btn {
              width: 40px;
              height: 40px;
            }
          }
        ` }} />
      </div>
    </div>
  );
};

export default RecipeRevisionModal;
