import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CloudUpload, Search, Info, X } from 'lucide-react';
import ManualIngredientNutritionModal from './ManualIngredientNutritionModal';
import './AddRecipeForm.css';
import { API_BASE } from '../config';
import { HEALTH_SCORE_MAX_PORTION, normalizeServingPortion } from '../utils/recipeInsights';

const AddRecipeForm = ({ onSuccess, onCancel, initialRecipe = null }) => {
  const { user, addCustomRecipe, updateCustomRecipe, addCustomIngredient, createManualIngredient, uploadRecipeImage } = useApp();
  const isEditMode = Boolean(initialRecipe?.id);
  const [formData, setFormData] = useState({
    name: '',
    explanation: '',
    preparation: '',
    cooking_type: 'Fırın',
    serving: 2,
    preparation_time: '',
    image_url: ''
  });
  
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingRecipePayload, setPendingRecipePayload] = useState(null);
  const [manualIngredientName, setManualIngredientName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
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
        const res = await fetch(`${API_BASE}/api/ingredients/categorized${query}`);
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
      preparation_time: initialRecipe.preparation_time || '',
      image_url: initialRecipe.image_url || ''
    });
    setImagePreview(initialRecipe.image_url || '');
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
    preparation_time: parseInt(formData.preparation_time) || null,
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
    const recipeId = data?.recipe_id || initialRecipe?.id;
    if (recipeId && imageFile) {
      const upload = await uploadRecipeImage(recipeId, imageFile, setUploadProgress);
      payload.image_url = upload.image_url;
    }
    return true;
  };

  const handleImageSelect = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Sadece jpeg, png veya webp yukleyebilirsiniz.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Resim boyutu en fazla 5 MB olabilir.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadProgress(0);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, image_url: '' }));
    setUploadProgress(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return setError('Tarif adı zorunludur.');
    if (ingredients.length === 0) return setError('En az bir malzeme eklemelisiniz.');

    const servingCount = Number(formData.serving);
    if (!Number.isFinite(servingCount) || servingCount < 1 || servingCount > HEALTH_SCORE_MAX_PORTION) {
      alert(`Porsiyon sayısı 1 ile ${HEALTH_SCORE_MAX_PORTION} arasında olmalıdır.`);
      return;
    }

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
    <div className="arf-wrapper">
      <h3 className="arf-header">
        {isEditMode ? 'Tarifi Düzenle' : 'Yeni Tarif Ekle'}
      </h3>
      
      {error && <div className="arf-error-banner">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {/* Temel Bilgiler */}
        <section className="arf-section">
          <h4 className="arf-section-title">1. Temel Bilgiler</h4>
          <div className="arf-grid-2">
            <div className="arf-grid-2-span">
              <label className="arf-label">Tarif Adı <span className="arf-label-error">*</span></label>
              <input 
                className="arf-input" 
                placeholder="Örn: Fırında Somon" 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div>
              <label className="arf-label">Pişirme Türü</label>
              <div className="arf-select-wrapper">
                <select 
                  className="arf-select" 
                  name="cooking_type" 
                  value={formData.cooking_type} 
                  onChange={handleChange}
                >
                  <option disabled value="">Seçiniz</option>
                  <option value="Tava">Tavada</option>
                  <option value="Fırın">Fırında</option>
                  <option value="Tencere">Tencerede</option>
                  <option value="Airfryer">Airfryer</option>
                  <option value="Düdüklü">Düdüklü</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="arf-label">Porsiyon</label>
                <input
                  className="arf-input"
                  placeholder="2"
                  type="number"
                  name="serving"
                  min="1"
                  max={HEALTH_SCORE_MAX_PORTION}
                  step="1"
                  value={formData.serving}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFormData(prev => ({
                      ...prev,
                      serving: value === '' ? '' : normalizeServingPortion(value),
                    }));
                  }}
                />
              </div>
              <div>
                <label className="arf-label">Pişirme Süresi (Dakika)</label>
                <input 
                  className="arf-input" 
                  placeholder="30" 
                  type="number" 
                  name="preparation_time" 
                  value={formData.preparation_time} 
                  onChange={handleChange} 
                />
              </div>
            </div>
          </div>
        </section>

        {/* Tarif Görseli */}
        <section className="arf-section">
          <h4 className="arf-section-title">2. Tarif Görseli</h4>
          
          {imagePreview ? (
            <div className="arf-image-preview-wrapper">
              <img src={imagePreview} alt="Tarif" className="arf-image-preview" />
              <button type="button" onClick={removeImage} className="arf-image-remove">
                <X size={20} />
              </button>
            </div>
          ) : (
            <div 
              className="arf-image-upload"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleImageSelect(e.dataTransfer.files?.[0]);
              }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', width: '100%', height: '100%', justifyContent: 'center' }}>
                <div className="arf-image-upload-icon-wrapper">
                  <CloudUpload className="arf-image-upload-icon" />
                </div>
                <p className="arf-image-upload-text" style={{ marginTop: '1rem' }}>Tarif resmini seç veya sürükle</p>
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => handleImageSelect(e.target.files?.[0])} />
              </label>
            </div>
          )}
          
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div style={{ height: '8px', background: '#1c2b3c', borderRadius: '999px', overflow: 'hidden', marginTop: '1rem' }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#4edea3' }} />
            </div>
          )}
        </section>

        {/* Açıklama */}
        <section className="arf-section">
          <h4 className="arf-section-title">3. Açıklama</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label className="arf-label">Kısa Açıklama</label>
              <textarea 
                className="arf-textarea" 
                placeholder="Tarif hakkında kısa bir özet..." 
                rows="2" 
                name="explanation" 
                value={formData.explanation} 
                onChange={handleChange}
              ></textarea>
            </div>
            <div>
              <label className="arf-label">Hazırlanışı</label>
              <textarea 
                className="arf-textarea" 
                placeholder="Adım adım hazırlanış detayları..." 
                rows="4" 
                name="preparation" 
                value={formData.preparation} 
                onChange={handleChange}
              ></textarea>
            </div>
          </div>
        </section>

        {/* Malzemeler */}
        <section className="arf-section">
          <h4 className="arf-section-title">4. Malzemeler <span className="arf-label-error">*</span></h4>
          
          <div className="arf-search-wrapper">
            <Search size={20} className="arf-search-icon" />
            <input 
              className="arf-search-input" 
              placeholder="Malzeme ara veya seç..." 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
               <div className="arf-search-dropdown">
                  {filteredItems.slice(0, 50).map(item => (
                     <div key={item.id} onClick={() => handleAddIngredient(item)} className="arf-search-dropdown-item">
                        {item.name}
                     </div>
                  ))}
                  {filteredItems.length === 0 && (
                     <div style={{ padding: '10px', color: '#888', textAlign: 'center' }}>
                        Bulunamadı.
                        <button type="button" onClick={handleAddIngredientByName} style={{ marginLeft: '8px', color: '#4edea3', background: 'transparent', fontWeight: 800, cursor: 'pointer', border: 'none' }}>
                           Adıyla ekle
                        </button>
                     </div>
                  )}
               </div>
            )}
          </div>
          
          <p className="arf-hint cursor-pointer" onClick={() => setShowAddCustom(!showAddCustom)}>
            Aradığınız malzeme yok mu? Kendiniz ekleyin.
          </p>
          
          {showAddCustom && (
            <div className="arf-custom-ing-row">
               <input type="text" placeholder="Yeni malzeme adı" value={customIngName} onChange={e => setCustomIngName(e.target.value)} className="arf-custom-ing-input" />
               <select value={customIngCategory} onChange={e => setCustomIngCategory(e.target.value)} className="arf-custom-ing-select">
                  <option value="">Kategori Seçiniz</option>
                  {categorizedItems.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
               <button type="button" onClick={handleCreateCustomIngredient} disabled={loading || !customIngCategory || !customIngName.trim()} className="arf-custom-ing-btn">Ekle</button>
               <button type="button" onClick={() => setShowAddCustom(false)} style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
          )}

          <div className="arf-chips-wrapper" style={{ marginTop: '1rem' }}>
            {ingredients.length === 0 ? (
               <p style={{ color: 'rgba(187, 202, 191, 0.5)', textAlign: 'center', fontStyle: 'italic', padding: '1rem' }}>Henüz malzeme eklemediniz.</p>
            ) : (
               ingredients.map((ing) => (
                  <div key={ing.client_id} className="arf-chip-row">
                     <div className="arf-chip-name">{ing.name}</div>
                     <input type="number" min="0" placeholder="Miktar" value={ing.amount} onChange={e => updateIngredient(ing.client_id, 'amount', e.target.value)} className="arf-chip-input" />
                     <input type="text" placeholder="Birim (Örn: Gram, Adet)" value={ing.unit} onChange={e => updateIngredient(ing.client_id, 'unit', e.target.value)} className="arf-chip-input" />
                     <button type="button" onClick={() => removeIngredient(ing.client_id)} className="arf-chip-close"><X size={20} /></button>
                  </div>
               ))
            )}
          </div>
          
          <p className="arf-info">
            <Info size={16} />
            Besin değerleri ve kalori bilgisi, eklenen malzemelere göre sistem tarafından otomatik hesaplanacaktır.
          </p>
        </section>

        {/* Footer Actions */}
        <div className="arf-footer">
          <button className="arf-btn-cancel" type="button" onClick={onCancel} disabled={loading}>
            İptal
          </button>
          <button className="arf-btn-submit" type="submit" disabled={loading}>
            {loading ? 'Kaydediliyor...' : 'Tarifi Kaydet'}
          </button>
        </div>
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
