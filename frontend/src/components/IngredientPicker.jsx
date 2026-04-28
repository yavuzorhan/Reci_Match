import React, { useState, useEffect } from 'react';
import { Search, X, Check, ChevronDown, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './IngredientPicker.css';

const IngredientPicker = ({ onSelectionChange, initialSelection = [], userId = null }) => {
  const { addCustomIngredient } = useApp();
  const [categories, setCategories] = useState([]);
  const [selectedIds, setSelectedIds] = useState(initialSelection);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(null); // null means "All" or first category
  const [loading, setLoading] = useState(true);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customError, setCustomError] = useState('');
  const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState('');

  useEffect(() => {
    fetchCategorizedIngredients();
  }, [userId]);

  useEffect(() => {
    if (initialSelection) {
      setSelectedIds(initialSelection);
    }
  }, [initialSelection]);

  const fetchCategorizedIngredients = async () => {
    try {
      const query = userId ? `?user_id=${userId}` : '';
      const response = await fetch(`http://localhost:8000/api/ingredients/categorized${query}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        if (data.length > 0) setActiveCategory(data[0].id);
      }
    } catch (error) {
      console.error('Kategorize edilmiş malzemeler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleIngredient = (id) => {
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    
    setSelectedIds(newSelection);
    if (onSelectionChange) onSelectionChange(newSelection);
  };

  const removeIngredient = (id) => {
    const newSelection = selectedIds.filter(i => i !== id);
    setSelectedIds(newSelection);
    if (onSelectionChange) onSelectionChange(newSelection);
  };

  // Flat list of all ingredients for searching
  const allIngredients = categories.flatMap(cat => cat.ingredients.map(ing => ({ ...ing, categoryName: cat.name })));

  // Filter logic
  const displayedIngredients = searchTerm 
    ? allIngredients.filter(ing => ing.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : categories.find(cat => cat.id === activeCategory)?.ingredients || [];

  const selectedObjects = allIngredients.filter(ing => selectedIds.includes(ing.id));

  const handleAddCustom = async () => {
    if (!searchTerm.trim() || !selectedCategoryToAdd) {
        setCustomError('Lütfen kategori seçiniz.');
        return;
    }
    try {
      setAddingCustom(true);
      setCustomError('');
      const data = await addCustomIngredient(searchTerm, parseInt(selectedCategoryToAdd));
      if (data.ingredient) {
         await fetchCategorizedIngredients(); // Refresh list to get new ingredient
         toggleIngredient(data.ingredient.id); // Automatically select it
         setSearchTerm('');
      } else {
         setCustomError('Eklenemedi.');
      }
    } catch (err) {
      setCustomError('Hata: ' + err.message);
    } finally {
      setAddingCustom(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Malzemeler yükleniyor...</div>;
  }

  return (
    <div className="ingredient-picker">
      <div className="picker-header">
        <div className="search-bar">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Malzeme ara (Örn: Domates, Tavuk...)" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="selected-area">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Seçilen Malzemeler ({selectedIds.length})</p>
            <div className="selected-tray">
              {selectedObjects.map(ing => (
                <div key={ing.id} className="selected-chip">
                  {ing.name}
                  <button onClick={() => removeIngredient(ing.id)}><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!searchTerm && (
          <div className="category-nav">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ingredients-grid">
        {displayedIngredients.length > 0 ? (
          displayedIngredients.map(ing => {
            const isSelected = selectedIds.includes(ing.id);
            return (
              <div 
                key={ing.id} 
                className={`ingredient-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleIngredient(ing.id)}
              >
                <div className="checkbox-circle">
                  {isSelected && <Check size={12} color="white" />}
                </div>
                <div className="ingredient-name" title={ing.name}>
                  {ing.name}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <p>"{searchTerm}" bulunamadı.</p>
            {userId && (
              <div style={{ background: 'var(--card-bg)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                 <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                   <span style={{ fontWeight: '600' }}>Malzemeyi özel listene eklemek ister misin?</span>
                   <select 
                     style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', minWidth: '150px' }}
                     value={selectedCategoryToAdd}
                     onChange={e => setSelectedCategoryToAdd(e.target.value)}
                   >
                     <option value="">Kategori Seçiniz</option>
                     {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <button onClick={handleAddCustom} disabled={addingCustom || !selectedCategoryToAdd} className="primary-btn" style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px', opacity: (addingCustom || !selectedCategoryToAdd) ? 0.5 : 1 }}>
                     <Plus size={16} /> {addingCustom ? 'Ekleniyor...' : 'Hemen Ekle'}
                   </button>
                 </div>
                 {customError && <span style={{ color: '#d63031', fontSize: '0.85rem' }}>{customError}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IngredientPicker;
