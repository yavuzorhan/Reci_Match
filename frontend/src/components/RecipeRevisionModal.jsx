import React, { useState } from 'react';
import { X } from 'lucide-react';
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

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.45)',
      zIndex: 1000,
      display: 'grid',
      placeItems: 'center',
      padding: '1rem',
    }}>
      <div className="card" style={{
        width: 'min(980px, 100%)',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: '12px',
        padding: '1.5rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Bu Tarifi Revize Et</h2>
          <button onClick={onClose} style={{ background: 'transparent' }}><X /></button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            color: '#dc2626',
            padding: '0.75rem',
            background: 'rgba(220,38,38,0.08)',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        {/* Main two-column layout */}
        <div className="revision-outer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* ── Left: Editing Form ── */}
          <div>
            <h3 style={{ marginBottom: '0.75rem' }}>Düzenle</h3>

            {/* Ingredient list with visual feedback */}
            {(recipe.ingredients || []).map(item => {
              const isRemoved = removeIngredients.includes(item.name);
              return (
                <div key={item.name} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <strong style={{
                    flex: 1,
                    textDecoration: isRemoved ? 'line-through' : 'none',
                    opacity: isRemoved ? 0.5 : 1,
                    color: isRemoved ? 'var(--text-secondary)' : 'inherit',
                    transition: 'all 0.2s',
                    fontSize: '0.9rem',
                  }}>
                    {item.name}
                  </strong>
                  <button
                    type="button"
                    onClick={() => toggleRemove(item.name)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      background: isRemoved ? 'rgba(0,0,0,0.06)' : 'rgba(220,38,38,0.09)',
                      color: isRemoved ? 'var(--text-secondary)' : '#dc2626',
                      border: '1px solid',
                      borderColor: isRemoved ? 'var(--border-color)' : 'rgba(220,38,38,0.25)',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isRemoved ? 'Geri Al' : 'Çıkar'}
                  </button>
                  <input
                    type="number"
                    placeholder="Yeni miktar"
                    style={{ width: '95px', fontSize: '0.85rem' }}
                    onChange={(e) => {
                      const value = e.target.value;
                      setAdjustAmounts(prev => [
                        ...prev.filter(row => row.ingredient !== item.name),
                        ...(value ? [{ ingredient: item.name, new_amount: Number(value) }] : []),
                      ]);
                    }}
                  />
                </div>
              );
            })}

            {/* Add ingredient row */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '1rem' }}>
              <input
                placeholder="Yeni malzeme"
                value={newIngredient.name}
                onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })}
                style={{ flex: '1 1 120px', fontSize: '0.85rem' }}
              />
              <input
                placeholder="Miktar"
                type="number"
                value={newIngredient.amount}
                onChange={e => setNewIngredient({ ...newIngredient, amount: e.target.value })}
                style={{ width: '75px', fontSize: '0.85rem' }}
              />
              <input
                placeholder="Birim"
                value={newIngredient.unit}
                onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                style={{ width: '65px', fontSize: '0.85rem' }}
              />
              <button
                type="button"
                onClick={() => {
                  if (!newIngredient.name.trim()) return;
                  setAddIngredients(prev => [...prev, { ...newIngredient, amount: Number(newIngredient.amount) || null }]);
                  setNewIngredient({ name: '', amount: '', unit: '' });
                }}
              >
                Ekle
              </button>
            </div>

            {addIngredients.length > 0 && (
              <ul style={{ margin: '0.5rem 0 0.5rem 1.2rem', fontSize: '0.88rem', color: '#16a34a' }}>
                {addIngredients.map((item, index) => (
                  <li key={`${item.name}-${index}`}>{item.amount || ''} {item.unit || ''} {item.name}</li>
                ))}
              </ul>
            )}

            <textarea
              placeholder="vegan yap, az yağlı yap..."
              value={freeTextRequest}
              onChange={e => setFreeTextRequest(e.target.value)}
              rows={4}
              style={{ width: '100%', marginTop: '1rem', fontSize: '0.9rem' }}
            />
            <button
              className="primary-btn"
              onClick={revise}
              disabled={loading}
              style={{ marginTop: '0.75rem', width: '100%' }}
            >
              Revize Et
            </button>
          </div>

          {/* ── Right: Revised Result ── */}
          <div>
            <h3 style={{ marginBottom: '0.75rem' }}>Revize</h3>

            {/* Loading spinner (only while revising, not while saving) */}
            {loading && !revised ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
                <div>Yapay zeka tarifinizi revize ediyor...</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Bu 5-15 saniye sürebilir</div>
              </div>
            ) : revised ? (
              <div>
                <h4 style={{ marginBottom: '1rem', fontWeight: 700 }}>{revised.recipe_name}</h4>

                {/* Side-by-side ingredient comparison */}
                <div className="revision-compare-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {/* Original column */}
                  <div>
                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                      Orijinal
                    </h4>
                    {recipe.ingredients.map(item => {
                      const isRemoved = (revised.ingredients || []).every(
                        r => r.ingredient_name !== item.name
                      );
                      return (
                        <div key={item.name} style={{
                          textDecoration: isRemoved ? 'line-through' : 'none',
                          color: isRemoved ? '#dc2626' : 'inherit',
                          padding: '3px 0',
                          fontSize: '0.9rem',
                        }}>
                          {item.amount} {item.unit} {item.name}
                        </div>
                      );
                    })}
                  </div>

                  {/* Revised column */}
                  <div>
                    <h4 style={{ color: 'var(--primary-color)', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                      Revize
                    </h4>
                    {(revised.ingredients || []).map((item, index) => {
                      const inOriginal = recipe.ingredients.some(o => o.name === item.ingredient_name);
                      return (
                        <div key={`${item.ingredient_name}-${index}`} style={{
                          color: !inOriginal ? '#16a34a' : 'inherit',
                          fontWeight: !inOriginal ? 600 : 'normal',
                          padding: '3px 0',
                          fontSize: '0.9rem',
                        }}>
                          {item.amount || ''} {item.unit || ''} {item.ingredient_name}
                          {!inOriginal && (
                            <span style={{ fontSize: '0.75rem', marginLeft: '4px' }}>🆕</span>
                          )}
                          {item.change_reason && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                              ↳ {item.change_reason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Revision summary */}
                {revised.revision_summary && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1rem',
                    background: 'var(--background-elevated)',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    borderLeft: '3px solid var(--primary-color)',
                  }}>
                    <strong>Yapılan değişiklikler:</strong> {revised.revision_summary}
                  </div>
                )}

                {/* Revised preparation */}
                {revised.preparation && (
                  <p style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {revised.preparation}
                  </p>
                )}

                <button
                  className="primary-btn"
                  onClick={save}
                  disabled={loading}
                  style={{ marginTop: '1rem', width: '100%' }}
                >
                  {loading ? 'Kaydediliyor...' : 'Onayla ve Kaydet'}
                </button>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Revize sonucunuz burada görünecek.
              </p>
            )}
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 600px) {
            .revision-outer-grid {
              grid-template-columns: 1fr !important;
            }
            .revision-compare-grid {
              grid-template-columns: 1fr !important;
            }
          }
        ` }} />
      </div>
    </div>
  );
};

export default RecipeRevisionModal;
