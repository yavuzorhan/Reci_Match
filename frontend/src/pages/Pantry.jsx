import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import { Package, Save } from 'lucide-react';
import IngredientPicker from '../components/IngredientPicker';

const Pantry = () => {
  const { pantryIngredients, user, fetchUserPreferences } = useApp();
  const pantryIds = pantryIngredients.map(i => i.id);
  const [selectedIds, setSelectedIds] = useState([]);
  const [hasEdited, setHasEdited] = useState(false);
  const effectiveSelectedIds = hasEdited ? selectedIds : pantryIds;

  const handleSavePantry = async () => {
    if (!user) return;

    try {
      const response = await fetch(`http://localhost:8000/api/users/${user.id}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient_ids: effectiveSelectedIds })
      });
      if (response.ok) {
        alert("Dolabınız güncellendi!");
        fetchUserPreferences();
        setHasEdited(false);
      }
    } catch {
      alert("Hata oluştu.");
    }
  };

  return (
    <Layout>
      <div className="pantry-page">
        <div className="pantry-atmosphere" aria-hidden="true" />

        <div className="pantry-header">
          <div>
            <h1>Mutfak Dolabım</h1>
            <p>Mutfakta sürekli bulunan malzemeleri buradan yönetebilirsiniz.</p>
          </div>
          <button className="primary-btn pantry-save-button" onClick={handleSavePantry}>
            <Save size={20} /> Değişiklikleri Kaydet
          </button>
        </div>

        <div className="card pantry-card">
          <h3>
            <Package size={22} color="var(--primary-color)" /> Malzeme Dolabı
          </h3>
          <IngredientPicker
            key={pantryIds.join('-')}
            userId={user?.id}
            initialSelection={effectiveSelectedIds}
            onSelectionChange={(ids) => {
              setHasEdited(true);
              setSelectedIds(ids);
            }}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Pantry;
