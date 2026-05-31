import React, { useState, useEffect, useMemo } from 'react';
import './IngredientSelection.css';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { 
  Check, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Search, 
  X, 
  ShoppingCart, 
  Sparkles,
  LayoutDashboard,
  UtensilsCrossed,
  Filter
} from 'lucide-react';

import IngredientPicker from '../components/IngredientPicker';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';

const IngredientSelection = () => {
  const { setSelectedIngredients, pantryIngredients, user } = useApp();
  const [selectedIds, setSelectedIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const query = user?.id ? `?user_id=${user.id}` : '';
        const response = await fetch(`${API_BASE}/api/ingredients/categorized${query}`);
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
          if (data.length > 0 && !activeCategory) setActiveCategory(data[0].id);
        }
      } catch (error) {
        console.error('Veriler yüklenemedi:', error);
      }
    };
    fetchIngredients();
  }, [user, activeCategory]);

  const allIngredients = useMemo(() => {
    return (categories || []).flatMap(cat => (cat.ingredients || []).map(ing => ({ ...ing, categoryName: cat.name })));
  }, [categories]);

  const selectedObjects = useMemo(() => {
    return allIngredients.filter(ing => selectedIds.includes(ing.id));
  }, [allIngredients, selectedIds]);

  const handleRecommend = () => {
    setSelectedIngredients(selectedIds);
    navigate('/recommendations');
  };

  const toggleIngredient = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const displayedIngredients = useMemo(() => {
    if (searchTerm) {
      return (allIngredients || []).filter(ing => ing.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    const activeCat = (categories || []).find(cat => cat.id === activeCategory);
    return activeCat?.ingredients || [];
  }, [searchTerm, allIngredients, categories, activeCategory]);

  return (
    <Layout>
      <div className="noct-selection-container">
        <header className="noct-header">
          <div className="noct-badge">
            <Sparkles size={14} className="noct-glow-icon" />
            MALZEME SEÇİMİ
          </div>
          <h1 className="noct-title">Mutfakta Ne Var?</h1>
          <p className="noct-subtitle">Elinizdeki malzemeleri seçin, size en uygun tarifleri hızlıca eşleştirelim.</p>
        </header>

        <div className="noct-selection-grid">
          <aside className="noct-selection-sidebar">
            <div className="noct-card glass-panel">
              <div className="noct-card-header">
                <div className="noct-card-title-group">
                  <h3 className="noct-card-title">Seçilen Malzemeler</h3>
                  <span className="noct-card-count">{selectedIds.length} malzeme seçildi</span>
                </div>
                {selectedIds.length > 0 && (
                  <button onClick={clearSelection} className="noct-clear-btn">Temizle</button>
                )}
              </div>

              <div className="noct-chip-tray">
                {selectedObjects.length > 0 ? (
                  selectedObjects.map(ing => (
                    <div key={ing.id} className="noct-chip animated-in">
                      {ing.name}
                      <button onClick={() => toggleIngredient(ing.id)} className="noct-chip-remove">
                        <X size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="noct-empty-chip-state">Henüz malzeme seçilmedi</div>
                )}
              </div>

              <div className="noct-card-footer">
                <button 
                  onClick={handleRecommend} 
                  disabled={selectedIds.length === 0}
                  className="noct-primary-btn"
                >
                  <Sparkles size={18} />
                  {selectedIds.length > 0 ? `${selectedIds.length} Malzeme ile Tarifleri Analiz Et` : 'Tarifleri Analiz Et'}
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {pantryIngredients && pantryIngredients.length > 0 && (
              <div className="noct-card glass-panel">
                <div className="noct-card-header">
                  <div className="noct-card-title-group">
                    <h3 className="noct-card-title">Dolabımdakileri Ekle</h3>
                    <p className="noct-card-subtitle">Kayıtlı malzemeleri hızlıca seçin.</p>
                  </div>
                </div>
                <div className="noct-quick-add-tray">
                  {pantryIngredients.map(ing => {
                    const isSelected = selectedIds.includes(ing.id);
                    return (
                      <button 
                        key={ing.id} 
                        onClick={() => toggleIngredient(ing.id)}
                        className={`noct-quick-chip ${isSelected ? 'is-selected' : ''}`}
                      >
                        {ing.name}
                        {isSelected ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>

          <main className="noct-selection-main">
            <div className="noct-card glass-panel h-full">
              <div className="noct-library-header">
                <h3 className="noct-card-title">Malzeme Kütüphanesi</h3>
                
                <div className="noct-search-wrapper">
                  <Search size={20} className="noct-search-icon" />
                  <input 
                    type="text" 
                    className="noct-search-input"
                    placeholder="Malzeme ara: domates, tavuk, yumurta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="noct-category-nav">
                  {!searchTerm && categories.map(cat => (
                    <button 
                      key={cat.id} 
                      className={`noct-category-pill ${activeCategory === cat.id ? 'is-active' : ''}`}
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="noct-ingredient-grid">
                {displayedIngredients.length > 0 ? (
                  displayedIngredients.map(ing => {
                    const isSelected = selectedIds.includes(ing.id);
                    return (
                      <button 
                        key={ing.id} 
                        className={`noct-ingredient-card ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => toggleIngredient(ing.id)}
                      >
                        <div className="noct-card-status">
                          {isSelected && <Check size={14} className="noct-check-icon" />}
                        </div>
                        <div className="noct-card-icon-box">
                          <UtensilsCrossed size={32} className="noct-ing-icon" />
                        </div>
                        <span className="noct-ing-name">{ing.name}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="noct-empty-grid-state">
                    <Search size={48} opacity={0.2} />
                    <p>Malzeme bulunamadı</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

    </Layout>
  );
};

export default IngredientSelection;
