/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import IngredientPicker from '../components/IngredientPicker';
import { API_BASE } from '../config';

const DislikedIngredients = () => {
  const { user, setDislikedIngredients } = useApp();
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

  const fetchDisliked = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/users/${user.id}/disliked-ingredients`);
      if (resp.ok) {
        const ids = await resp.json();
        setSelectedIds(ids);
      }
    } catch (error) {
      console.error('Disliked fetch error:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchDisliked();
    }
  }, [user]);

  const handleFinish = async () => {
    if (user?.id) {
      try {
        const response = await fetch(`${API_BASE}/api/users/${user.id}/disliked-ingredients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredient_ids: selectedIds })
        });
        if (response.ok) {
          setDislikedIngredients(selectedIds);
          navigate('/dashboard');
        }
      } catch {
        alert('Kayıt sırasında bir hata oluştu.');
      }
    } else {
      setDislikedIngredients(selectedIds);
      navigate('/dashboard');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', background: 'var(--background-color)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '900px', padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Sevmediğin Malzemeler</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Tadını sevmediğin veya alerjin olan malzemeleri seç, sana önermeyelim.
        </p>

        <IngredientPicker
          userId={user?.id}
          onSelectionChange={(ids) => setSelectedIds(ids)}
          initialSelection={selectedIds}
        />

        <button onClick={handleFinish} className="primary-btn" style={{ width: '100%', marginTop: '2rem' }}>Seçimi Kaydet ve Devam Et</button>
      </div>
    </div>
  );
};

export default DislikedIngredients;
