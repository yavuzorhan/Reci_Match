import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const RecipeRevisionModal = ({ recipe, onClose }) => {
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
    setRemoveIngredients(prev => prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]);
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
      await saveRevisedRecipe(recipe.id, revised);
      navigate('/recipes');
    } catch (err) {
      setError(err.message || 'Revize tarif kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: 'min(980px, 100%)', maxHeight: '90vh', overflowY: 'auto', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Bu Tarifi Revize Et</h2>
          <button onClick={onClose} style={{ background: 'transparent' }}><X /></button>
        </div>
        {error && (
          <div style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', padding: '10px 12px', borderRadius: '8px', marginBottom: '1rem', fontWeight: 700 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <h3>Orijinal</h3>
            {(recipe.ingredients || []).map(item => (
              <div key={item.name} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 0' }}>
                <strong style={{ flex: 1 }}>{item.name}</strong>
                <button type="button" onClick={() => toggleRemove(item.name)}>{removeIngredients.includes(item.name) ? 'Geri Al' : 'Cikar'}</button>
                <input
                  type="number"
                  placeholder="Yeni miktar"
                  style={{ width: '110px' }}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAdjustAmounts(prev => [
                      ...prev.filter(row => row.ingredient !== item.name),
                      ...(value ? [{ ingredient: item.name, new_amount: Number(value) }] : []),
                    ]);
                  }}
                />
              </div>
            ))}

            <div style={{ display: 'flex', gap: '8px', margin: '1rem 0' }}>
              <input placeholder="Yeni malzeme" value={newIngredient.name} onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })} />
              <input placeholder="Miktar" type="number" value={newIngredient.amount} onChange={e => setNewIngredient({ ...newIngredient, amount: e.target.value })} />
              <input placeholder="Birim" value={newIngredient.unit} onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })} />
              <button type="button" onClick={() => {
                if (!newIngredient.name.trim()) return;
                setAddIngredients(prev => [...prev, { ...newIngredient, amount: Number(newIngredient.amount) || null }]);
                setNewIngredient({ name: '', amount: '', unit: '' });
              }}>Ekle</button>
            </div>
            {addIngredients.length > 0 && (
              <ul style={{ margin: '0 0 1rem 1rem' }}>
                {addIngredients.map((item, index) => (
                  <li key={`${item.name}-${index}`}>{item.amount || ''} {item.unit || ''} {item.name}</li>
                ))}
              </ul>
            )}

            <textarea
              placeholder="vegan yap, az yağlı yap"
              value={freeTextRequest}
              onChange={e => setFreeTextRequest(e.target.value)}
              rows={4}
              style={{ width: '100%' }}
            />
            <button className="primary-btn" onClick={revise} disabled={loading} style={{ marginTop: '1rem' }}>
              {loading ? 'Revize ediliyor...' : 'Revize Et'}
            </button>
          </div>

          <div>
            <h3>Revize</h3>
            {revised ? (
              <div>
                <h4>{revised.recipe_name}</h4>
                <ul>
                  {(revised.ingredients || []).map((item, index) => (
                    <li key={`${item.ingredient_name}-${index}`}>{item.amount || ''} {item.unit || ''} {item.ingredient_name}</li>
                  ))}
                </ul>
                <p style={{ whiteSpace: 'pre-wrap' }}>{revised.preparation}</p>
                <button className="primary-btn" onClick={save} disabled={loading}>Onayla ve Kaydet</button>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>Revize sonucunuz burada gorunecek.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeRevisionModal;
