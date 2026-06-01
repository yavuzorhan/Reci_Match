
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import IngredientPicker from '../components/IngredientPicker';
import { API_BASE } from '../config';
import './DislikedIngredients.css';

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
    <div className="disliked-setup-shell">
      <div className="disliked-setup-card">
        <div className="disliked-setup-heading">
          <span className="disliked-setup-kicker">Tercihlerini ayarla</span>
          <h2>Sevmediğin Malzemeler</h2>
          <p>
            Tadını sevmediğin veya alerjin olan malzemeleri seç, sana önermeyelim.
          </p>
        </div>

        <IngredientPicker
          userId={user?.id}
          onSelectionChange={(ids) => setSelectedIds(ids)}
          initialSelection={selectedIds}
        />

        <button onClick={handleFinish} className="primary-btn disliked-setup-submit">
          Seçimi Kaydet ve Devam Et
        </button>
      </div>
    </div>
  );
};

export default DislikedIngredients;
