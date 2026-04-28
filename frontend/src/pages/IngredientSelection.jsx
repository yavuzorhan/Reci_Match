import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Filter, Package, Plus, ShoppingCart, Trash2 } from 'lucide-react';

import IngredientPicker from '../components/IngredientPicker';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';

const IngredientSelection = () => {
  const { setSelectedIngredients, pantryIngredients, user } = useApp();
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

  const handleRecommend = () => {
    setSelectedIngredients(selectedIds);
    navigate('/recommendations');
  };

  const toggleFromPantry = (id) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const clearSelection = () => setSelectedIds([]);

  return (
    <Layout>
      <header style={{ marginBottom: '1.6rem', animation: 'fadeInDown 0.6s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ background: 'rgba(108, 92, 231, 0.1)', color: 'var(--primary-color)', padding: '8px 16px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={16} fill="currentColor" />
            MALZEME SEÇİMİ
          </div>
        </div>

        <h1 style={{ fontSize: '2.1rem', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.025em', marginBottom: '6px' }}>
          Mutfakta Ne Var?
        </h1>
        <p style={{ fontSize: '0.98rem', color: 'var(--text-secondary)', maxWidth: '520px', lineHeight: '1.45' }}>
          Malzemelerini seç, uygun tarifleri hızlıca analiz edelim.
        </p>
      </header>

      {pantryIngredients && pantryIngredients.length > 0 && (
        <section
          style={{
            marginBottom: '1.4rem',
            background: 'var(--background-elevated)',
            padding: '2rem',
            borderRadius: '32px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            animation: 'fadeIn 0.8s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255, 159, 67, 0.1)', color: '#ff9f43', display: 'grid', placeItems: 'center' }}>
              <Package size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                Dolabındakileri Ekle
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Daha önce "Dolabım" kısmına eklediğin malzemelerle hızlıca başla.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {pantryIngredients.map((ingredient) => {
              const isSelected = selectedIds.includes(ingredient.id);
              return (
                <button
                  key={ingredient.id}
                  onClick={() => toggleFromPantry(ingredient.id)}
                  className={`pantry-quick-chip ${isSelected ? 'active' : ''}`}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '18px',
                    border: '2px solid',
                    borderColor: isSelected ? 'var(--primary-color)' : 'var(--border-color)',
                    background: isSelected ? 'var(--primary-color)' : 'var(--card-bg)',
                    color: isSelected ? 'white' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '800',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {ingredient.name}
                  {isSelected ? <Check size={18} /> : <Plus size={18} color="var(--primary-color)" />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section style={{ animation: 'fadeIn 1s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(108, 92, 231, 0.1)', color: 'var(--primary-color)', display: 'grid', placeItems: 'center' }}>
              <Filter size={22} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '900' }}>Malzeme Kütüphanesi</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {selectedIds.length > 0 && (
              <button
                onClick={clearSelection}
                className="secondary-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', borderRadius: '16px', fontWeight: '700', border: '1px solid var(--border-color)', color: '#ff4757' }}
              >
                <Trash2 size={18} /> Temizle
              </button>
            )}
            <button
              onClick={handleRecommend}
              disabled={selectedIds.length === 0}
              className="primary-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '13px 28px',
                borderRadius: '16px',
                fontWeight: '850',
                fontSize: '1rem',
                opacity: selectedIds.length === 0 ? 0.5 : 1,
                cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: selectedIds.length > 0 ? '0 12px 24px rgba(108, 92, 231, 0.24)' : 'none',
                transition: 'all 0.3s',
              }}
            >
              Tarifleri Analiz Et <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <IngredientPicker
          userId={user?.id}
          onSelectionChange={(ids) => setSelectedIds(ids)}
          initialSelection={selectedIds}
        />
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .pantry-quick-chip:hover {
          transform: translateY(-4px);
          border-color: var(--primary-color) !important;
          box-shadow: 0 10px 20px rgba(0,0,0,0.05);
        }
        .pantry-quick-chip.active:hover {
          box-shadow: 0 12px 25px rgba(108, 92, 231, 0.3);
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      ` }} />
    </Layout>
  );
};

export default IngredientSelection;
