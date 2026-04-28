import React, { useState } from 'react';
import { X } from 'lucide-react';

const emptyForm = {
  calorie_per_100g: '',
  protein_per_100g: '',
  carbohydrate_per_100g: '',
  fat_per_100g: ''
};

const ManualIngredientNutritionModal = ({ ingredientName, isOpen, onSubmit, onClose }) => {
  const [values, setValues] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (Number(value) < 0) return;
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, Number(value)])
    );
    if (Object.values(values).some(value => value === '') || Object.values(payload).some(value => Number.isNaN(value) || value < 0)) {
      setError('Lutfen tum alanlari 0 veya daha buyuk bir degerle doldurun.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSubmit(payload);
      setValues(emptyForm);
    } catch (err) {
      setError(err.message || 'Malzeme kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: '420px', borderRadius: '12px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Bu malzeme bulunamadi</h3>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)' }}>
              100g icin tahmini besin degerlerini girer misiniz?
            </p>
            <strong style={{ display: 'block', marginTop: '0.65rem', color: 'var(--primary-color)' }}>{ingredientName}</strong>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'transparent', color: 'var(--text-secondary)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {[
          ['calorie_per_100g', 'Kalori'],
          ['protein_per_100g', 'Protein'],
          ['carbohydrate_per_100g', 'Karbonhidrat'],
          ['fat_per_100g', 'Yag']
        ].map(([name, label]) => (
          <label key={name} style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.8rem', fontWeight: 700 }}>
            {label}
            <input
              name={name}
              type="number"
              min="0"
              step="0.01"
              value={values[name]}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
            />
          </label>
        ))}

        {error && <div style={{ color: '#d63031', marginBottom: '0.8rem', fontWeight: 700 }}>{error}</div>}

        <button type="submit" disabled={loading} className="primary-btn" style={{ width: '100%', padding: '12px' }}>
          {loading ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
        </button>
      </form>
    </div>
  );
};

export default ManualIngredientNutritionModal;
