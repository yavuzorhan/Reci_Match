import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Leaf, Plus, Search, Sparkles } from 'lucide-react';

import Layout from '../components/Layout';
import IngredientPicker from '../components/IngredientPicker';
import { useApp } from '../context/AppContext';

const HealthyMenu = () => {
  const { pantryIngredients, user } = useApp();
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

  const toggleFromPantry = (id) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const handleContinue = () => {
    const params = new URLSearchParams();
    if (selectedIds.length) {
      params.set('ingredients', selectedIds.join(','));
    }
    navigate(`/healthy-menu/results?${params.toString()}`);
  };

  return (
    <Layout variant="healthy">
      <header style={{ marginBottom: '3rem', animation: 'fadeInDown 0.6s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              padding: '8px 16px',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Leaf size={16} fill="currentColor" />
            FIT TARIF SECIMI
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1
              style={{
                fontSize: '3rem',
                fontWeight: '950',
                color: 'var(--text-primary)',
                letterSpacing: '-0.04em',
                marginBottom: '12px',
              }}
            >
              Fit Tarifler Icin
              <br />
              Malzemeni Sec
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: '680px', lineHeight: '1.6' }}>
              Bu ilk sayfada sadece malzemeni seciyorsun. Sonraki ekranda tum fit tarifler,
              saglik dereceleri ve filtrelerle birlikte listelenecek.
            </p>
          </div>

          <button
            onClick={handleContinue}
            className="primary-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '15px 32px',
              borderRadius: '18px',
              fontWeight: '900',
              fontSize: '1.05rem',
              boxShadow: '0 16px 30px rgba(16, 185, 129, 0.25)',
            }}
          >
            Tarifleri Goster <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {!!pantryIngredients?.length && (
        <section
          style={{
            marginBottom: '2.5rem',
            background: 'var(--background-elevated)',
            padding: '2rem',
            borderRadius: '28px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
            <Sparkles size={18} color="#10b981" />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                Dolabindaki Malzemeler
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Istersen dolabindaki urunlerden hizlica secim yapabilirsin.
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
                  style={{
                    padding: '12px 22px',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: isSelected ? '#10b981' : 'var(--border-color)',
                    background: isSelected ? '#10b981' : 'var(--card-bg)',
                    color: isSelected ? 'white' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: '800',
                    cursor: 'pointer',
                  }}
                >
                  {ingredient.name}
                  {isSelected ? <Check size={16} /> : <Plus size={16} />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section
        className="card"
        style={{
          padding: '2rem',
          borderRadius: '28px',
          border: '1px solid var(--border-color)',
          background: 'var(--background-elevated)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'grid',
              placeItems: 'center',
              color: '#10b981',
            }}
          >
            <Search size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-primary)' }}>
              Malzeme Kutuphanesi
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Eslesmesini istedigin malzemeleri sec ve ikinci sayfada fit tarif onerilerini filtrele.
            </p>
          </div>
        </div>

        <IngredientPicker
          userId={user?.id || null}
          initialSelection={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </section>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `,
        }}
      />
    </Layout>
  );
};

export default HealthyMenu;
