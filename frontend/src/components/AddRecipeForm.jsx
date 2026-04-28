import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, X, Search } from 'lucide-react';
import ManualIngredientNutritionModal from './ManualIngredientNutritionModal';

const AddRecipeForm = ({ onSuccess, onCancel, initialRecipe = null }) => {
  const { user, addCustomRecipe, updateCustomRecipe, addCustomIngredient, createManualIngredient } = useApp();
  const isEditMode = Boolean(initialRecipe?.id);
  const [formData, setFormData] = useState({
    name: '',
    explanation: '',
    preparation: '',
    cooking_type: 'Fırın',
    serving: 2,
    calorie: '',
    image_url: ''
  });
  
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingRecipePayload, setPendingRecipePayload] = useState(null);
  const [manualIngredientName, setManualIngredientName] = useState('');
  
  // Ingredient search & select
  const [searchTerm, setSearchTerm] = useState('');
  const [categorizedItems, setCategorizedItems] = useState([]);
  const [flatItems, setFlatItems] = useState([]);
  
  // Custom ingredient add state
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customIngName, setCustomIngName] = useState('');
  const [customIngCategory, setCustomIngCategory] = useState('');

  useEffect(() => {
    // Fetch all ingredients to allow selection
    const fetchIngs = async () => {
      try {
        const query = user?.id ? `?user_id=${user.id}` : '';
        const res = await fetch(`http://localhost:8000/api/ingredients/categorized${query}`);
        if(res.ok) {
           const data = await res.json();
           setCategorizedItems(data);
           const flat = [];
           data.forEach(cat => cat.ingredients.forEach(i => flat.push(i)));
           setFlatItems(flat);
        }
      } catch (err) {
        console.error("Malzemeler yüklenemedi", err);
      }
    };
    fetchIngs();
  }, [user]);

  useEffect(() => {
    if (!initialRecipe) return;
    setFormData({
      name: initialRecipe.name || '',
      explanation: initialRecipe.explanation || '',
      preparation: initialRecipe.preparation || '',
      cooking_type: initialRecipe.cooking_type || 'Fırın',
      serving: initialRecipe.serving || 2,
      calorie: initialRecipe.calorie || '',
      image_url: initialRecipe.image_url || ''
    });
    setIngredients((initialRecipe.ingredients || []).map((item) => ({
      client_id: `id-${item.id}-${Date.now()}-${Math.random()}`,
      ingredient_id: item.id,
      ingredient_name: item.name,
      name: item.name,
      amount: item.amount ?? 1,
      unit: item.unit || 'Gram'
    })));
  }, [initialRecipe]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddIngredient = (ing) => {
    if (ingredients.find(i => i.ingredient_id === ing.id)) return;
    setIngredients([...ingredients, { client_id: `id-${ing.id}`, ingredient_id: ing.id, name: ing.name, amount: 1, unit: 'Adet' }]);
    setSearchTerm('');
  };

  const handleAddIngredientByName = () => {
    const cleanName = searchTerm.trim();
    if (!cleanName) return;
    const duplicate = ingredients.some(i => (i.name || '').toLowerCase() === cleanName.toLowerCase());
    if (duplicate) return;
    setIngredients([...ingredients, {
      client_id: `name-${Date.now()}`,
      ingredient_name: cleanName,
      name: cleanName,
      amount: 1,
      unit: 'Gram'
    }]);
    setSearchTerm('');
  };

  const updateIngredient = (clientId, field, value) => {
    setIngredients(ingredients.map(i => i.client_id === clientId ? { ...i, [field]: value } : i));
  };

  const removeIngredient = (clientId) => {
    setIngredients(ingredients.filter(i => i.client_id !== clientId));
  };

  const handleCreateCustomIngredient = async () => {
    if (!customIngName.trim() || !customIngCategory) {
        alert("Lütfen malzeme adını ve kategorisini doldurun.");
        return;
    }
    try {
      setLoading(true);
      const data = await addCustomIngredient(customIngName, parseInt(customIngCategory));
      if (data.ingredient) {
        handleAddIngredient({ id: data.ingredient.id, name: data.ingredient.name });
        // update local list
        setFlatItems([...flatItems, {id: data.ingredient.id, name: data.ingredient.name}]);
      }
      setCustomIngName('');
      setCustomIngCategory('');
      setShowAddCustom(false);
    } catch (err) {
      alert("Malzeme eklenirken hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const buildRecipePayload = () => ({
    ...formData,
    serving: parseInt(formData.serving) || null,
    calorie: parseFloat(formData.calorie) || null,
    ingredients: ingredients.map(i => ({
      ingredient_id: i.ingredient_id || null,
      ingredient_name: i.ingredient_name || i.name,
      amount: parseFloat(i.amount) || null,
      unit: i.unit
    }))
  });

  const submitRecipePayload = async (payload) => {
    const data = isEditMode
      ? await updateCustomRecipe(initialRecipe.id, payload)
      : await addCustomRecipe(payload);
    if (data?.status === 'manual_required') {
      setPendingRecipePayload(payload);
      setManualIngredientName(data.ingredient_name);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return setError('Tarif adı zorunludur.');
    if (ingredients.length === 0) return setError('En az bir malzeme eklemelisiniz.');
    
    setLoading(true);
    setError('');
    try {
       const saved = await submitRecipePayload(buildRecipePayload());
       if (saved) onSuccess();
    } catch (err) {
       setError(err.message || 'Tarif eklenemedi.');
    } finally {
       setLoading(false);
    }
  };

  const handleManualNutritionSubmit = async (nutritionValues) => {
    await createManualIngredient(manualIngredientName, nutritionValues);
    setLoading(true);
    try {
      const saved = await submitRecipePayload(pendingRecipePayload || buildRecipePayload());
      if (saved) {
        setManualIngredientName('');
        setPendingRecipePayload(null);
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = flatItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)', display: 'flex', justifyContent: 'space-between' }}>
        {isEditMode ? 'Tarifi Düzenle' : 'Yeni Tarif Ekle'}
        <button onClick={onCancel} style={{ background: 'none', color: '#666' }}><X size={24} /></button>
      </h2>
      
      {error && <div style={{ background: '#ffeaa7', color: '#d63031', padding: '10px', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tarif Adı *</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Pişirme Türü</label>
             <select name="cooking_type" value={formData.cooking_type} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <option value="Fırın">Fırın</option>
                <option value="Tava">Tava</option>
                <option value="Tencere">Tencere</option>
                <option value="Izgara">Izgara</option>
                <option value="Diğer">Diğer</option>
             </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Porsiyon</label>
            <input type="number" name="serving" value={formData.serving} onChange={handleChange} className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Kalori (1 Porsiyon)</label>
            <input type="number" name="calorie" value={formData.calorie} onChange={handleChange} className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
           <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Kısa Açıklama</label>
           <textarea name="explanation" value={formData.explanation} onChange={handleChange} rows="2" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
           <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Hazırlanışı</label>
           <textarea name="preparation" value={formData.preparation} onChange={handleChange} rows="4" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
        </div>

        <div style={{ padding: '1.5rem', background: 'rgba(108, 92, 231, 0.05)', borderRadius: '12px', marginBottom: '1.5rem' }}>
           <h3 style={{ marginBottom: '10px' }}>Malzemeler *</h3>
           
           <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={18} style={{ position: 'absolute', top: '12px', left: '10px', color: '#888' }} />
              <input 
                 type="text" 
                 placeholder="Malzeme ara ve seç..." 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)}
                 style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              />
              {searchTerm && (
                 <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto', zIndex: 10 }}>
                    {filteredItems.slice(0, 50).map(item => (
                       <div key={item.id} onClick={() => handleAddIngredient(item)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #EEE' }}>
                          {item.name}
                       </div>
                    ))}
                    {filteredItems.length === 0 && (
                       <div style={{ padding: '10px', color: '#888', textAlign: 'center' }}>
                          Bulunamadı.
                          <button type="button" onClick={handleAddIngredientByName} style={{ marginLeft: '8px', color: 'var(--primary-color)', background: 'transparent', fontWeight: 800 }}>
                             Adıyla ekle
                          </button>
                       </div>
                    )}
                 </div>
              )}
           </div>

           {!showAddCustom ? (
              <button type="button" onClick={() => setShowAddCustom(true)} style={{ color: 'var(--primary-color)', background: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '1rem' }}>
                 <Plus size={16} /> Aradığınız malzeme yok mu? Kendiniz ekleyin.
              </button>
           ) : (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', alignItems: 'center', background: 'var(--background-color)', padding: '10px', borderRadius: '8px', flexWrap: 'wrap' }}>
                 <input type="text" placeholder="Yeni malzeme adı" value={customIngName} onChange={e => setCustomIngName(e.target.value)} style={{ padding: '8px', flex: 1, borderRadius: '6px', border: '1px solid var(--border-color)', minWidth: '150px' }} />
                 <select value={customIngCategory} onChange={e => setCustomIngCategory(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', minWidth: '150px' }}>
                    <option value="">Kategori Seçiniz</option>
                    {categorizedItems.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
                 <button type="button" onClick={handleCreateCustomIngredient} disabled={loading || !customIngCategory || !customIngName.trim()} style={{ background: 'var(--primary-color)', color: '#FFF', padding: '8px 12px', borderRadius: '6px', opacity: (loading || !customIngCategory || !customIngName.trim()) ? 0.5 : 1 }}>Ekle</button>
                 <button type="button" onClick={() => setShowAddCustom(false)} style={{ background: 'transparent', color: '#888' }}><X size={20}/></button>
              </div>
           )}

           {ingredients.map((ing) => (
              <div key={ing.client_id} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                 <div style={{ flex: 2, fontWeight: 'bold' }}>{ing.name}</div>
                 <input type="number" min="0" placeholder="Miktar" value={ing.amount} onChange={e => updateIngredient(ing.client_id, 'amount', e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                 <input type="text" placeholder="Birim (Örn: Gram, Adet)" value={ing.unit} onChange={e => updateIngredient(ing.client_id, 'unit', e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                 <button type="button" onClick={() => removeIngredient(ing.client_id)} style={{ color: '#d63031', background: 'none' }}><X size={20} /></button>
              </div>
           ))}
        </div>

        <button type="submit" disabled={loading} className="primary-btn" style={{ width: '100%', padding: '15px' }}>
          {loading ? 'Kaydediliyor...' : (isEditMode ? 'Değişiklikleri Kaydet' : 'Tarifi Kaydet')}
        </button>
      </form>
      <ManualIngredientNutritionModal
        ingredientName={manualIngredientName}
        isOpen={Boolean(manualIngredientName)}
        onSubmit={handleManualNutritionSubmit}
        onClose={() => {
          setManualIngredientName('');
          setPendingRecipePayload(null);
        }}
      />
    </div>
  );
};

export default AddRecipeForm;
