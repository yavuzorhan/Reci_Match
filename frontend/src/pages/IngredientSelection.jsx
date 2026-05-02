import React, { useState, useEffect, useMemo } from 'react';
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

  // Fetch ingredients for local display of chips and grid
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
  }, [user]);

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
        {/* Header Section */}
        <header className="noct-header">
          <div className="noct-badge">
            <Sparkles size={14} className="noct-glow-icon" />
            MALZEME SEÇİMİ
          </div>
          <h1 className="noct-title">Mutfakta Ne Var?</h1>
          <p className="noct-subtitle">Elinizdeki malzemeleri seçin, size en uygun tarifleri hızlıca eşleştirelim.</p>
        </header>

        <div className="noct-selection-grid">
          {/* Left Column: Selection & Pantry */}
          <aside className="noct-selection-sidebar">
            {/* Selected Ingredients Card */}
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

            {/* Pantry Quick Add Card */}
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

          {/* Right Column: Library */}
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

      <style dangerouslySetInnerHTML={{ __html: `
        .layout-content:has(.noct-selection-container) {
          background-color: #0c0814 !important;
          background-image:
            radial-gradient(circle at 10% 20%, rgba(100, 31, 224, 0.12) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(68, 226, 205, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(147, 0, 10, 0.03) 0%, transparent 60%) !important;
          color: #d4e4fa;
          padding: 0;
        }

        .noct-selection-container {
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 32px 32px 60px;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .noct-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .noct-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 99px;
          color: #10b981;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          width: fit-content;
        }

        .noct-glow-icon {
          filter: drop-shadow(0 0 4px #10b981);
        }

        .noct-title {
          font-size: 40px;
          font-weight: 700;
          color: #d4e4fa;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .noct-subtitle {
          color: #bbcabf;
          font-size: 18px;
          max-width: 600px;
          margin: 0;
        }

        .noct-selection-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 24px;
        }

        .noct-selection-sidebar {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .glass-panel {
          background-color: rgba(28, 43, 60, 0.15);
          backdrop-filter: blur(48px);
          -webkit-backdrop-filter: blur(48px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          border-radius: 24px;
        }

        .noct-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .noct-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .noct-card-title {
          font-size: 20px;
          font-weight: 600;
          color: #d4e4fa;
          margin: 0;
        }

        .noct-card-count {
          font-size: 14px;
          color: #bbcabf;
        }

        .noct-card-subtitle {
          font-size: 14px;
          color: #bbcabf;
          margin-top: 4px;
        }

        .noct-clear-btn {
          background: transparent;
          border: none;
          color: #ffb3af;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .noct-clear-btn:hover {
          color: #fc7c78;
        }

        .noct-chip-tray {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 24px;
          min-height: 100px;
        }

        .noct-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #d4e4fa;
          font-size: 14px;
          font-weight: 600;
        }

        .noct-chip-remove {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #bbcabf;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: 0.2s;
        }

        .noct-chip-remove:hover {
          background: #ffb3af;
          color: #650911;
        }

        .noct-empty-chip-state {
          width: 100%;
          display: grid;
          place-items: center;
          color: #86948a;
          font-size: 14px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
        }

        .noct-card-footer {
          margin-top: auto;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .noct-primary-btn {
          width: 100%;
          background: #10b981;
          color: #003824;
          border: none;
          padding: 16px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: 0.3s;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.2);
        }

        .noct-primary-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);
        }

        .noct-primary-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          box-shadow: none;
        }

        .noct-quick-add-tray {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .noct-quick-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          color: #bbcabf;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .noct-quick-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(16, 185, 129, 0.3);
          color: #d4e4fa;
        }

        .noct-quick-chip.is-selected {
          background: rgba(16, 185, 129, 0.1);
          border-color: #10b981;
          color: #10b981;
        }

        .noct-library-header {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 24px;
        }

        .noct-search-wrapper {
          position: relative;
        }

        .noct-search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #86948a;
          pointer-events: none;
        }

        .noct-search-input {
          width: 100%;
          padding: 14px 14px 14px 50px;
          background: rgba(5, 20, 36, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          color: #d4e4fa;
          font-size: 16px;
          outline: none;
          transition: 0.2s;
        }

        .noct-search-input:focus {
          background: rgba(5, 20, 36, 0.6);
          border-color: #10b981;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
        }

        .noct-category-nav {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 8px;
          scrollbar-width: none;
        }

        .noct-category-nav::-webkit-scrollbar { display: none; }

        .noct-category-pill {
          padding: 8px 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: #bbcabf;
          font-weight: 700;
          font-size: 14px;
          white-space: nowrap;
          cursor: pointer;
          transition: 0.2s;
        }

        .noct-category-pill:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #d4e4fa;
        }

        .noct-category-pill.is-active {
          background: #10b981;
          color: #003824;
          border-color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        .noct-ingredient-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
          overflow-y: auto;
          flex: 1;
          padding-right: 4px;
        }

        .noct-ingredient-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 24px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .noct-ingredient-card:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateY(-4px);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .noct-ingredient-card.is-selected {
          background: rgba(16, 185, 129, 0.08);
          border-color: #10b981;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.1);
        }

        .noct-card-status {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: grid;
          place-items: center;
          transition: 0.2s;
        }

        .is-selected .noct-card-status {
          background: #10b981;
          border-color: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .noct-check-icon {
          color: #003824;
          font-weight: 800;
        }

        .noct-card-icon-box {
          width: 56px;
          height: 56px;
          display: grid;
          place-items: center;
          color: #86948a;
          transition: 0.2s;
        }

        .is-selected .noct-card-icon-box {
          color: #10b981;
        }

        .noct-ing-name {
          font-size: 14px;
          font-weight: 700;
          color: #bbcabf;
          text-align: center;
          transition: 0.2s;
        }

        .is-selected .noct-ing-name {
          color: #d4e4fa;
        }

        .noct-empty-grid-state {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 60px;
          color: #86948a;
        }

        .animated-in {
          animation: scaleIn 0.3s ease-out forwards;
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        @media (max-width: 1200px) {
          .noct-selection-grid {
            grid-template-columns: 1fr;
          }
          .noct-selection-sidebar {
            order: 2;
          }
          .noct-selection-main {
            order: 1;
            height: 600px;
          }
        }

        @media (max-width: 768px) {
          .noct-selection-container {
            padding: 20px;
          }
          .noct-title {
            font-size: 32px;
          }
          .noct-subtitle {
            font-size: 16px;
          }
        }
      `}} />
    </Layout>
  );
};

export default IngredientSelection;
