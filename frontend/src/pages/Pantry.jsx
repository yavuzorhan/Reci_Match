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
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>Mutfak Dolabım</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Mutfakta sürekli bulunan malzemeleri buradan yönetebilirsiniz.</p>
        </div>
        <button className="primary-btn" onClick={handleSavePantry} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={20} /> Değişiklikleri Kaydet
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Package size={20} color="var(--primary-color)" /> Malzeme Dolabı
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
    </Layout>
  );
};

export default Pantry;
