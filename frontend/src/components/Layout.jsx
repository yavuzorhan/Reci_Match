import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookText,
  Package,
  ShoppingBasket,
  UserCircle,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import reciMatchMiniLogo from '../assets/recimatch-mini-logo.png';

const Layout = ({ children, variant = 'default' }) => {
  const { setUser, isDarkMode } = useApp();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const [pillStyle, setPillStyle] = useState({ opacity: 0, transform: 'translateY(0)', height: 56 });

  const resolvedVariant = variant === 'default' && location.pathname.startsWith('/healthy-menu')
    ? 'healthy'
    : variant;

  const menuItems = useMemo(() => ([
    { name: 'Ana Menü', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Dolabım', icon: <Package size={20} />, path: '/pantry' },
    { name: 'Tarifler', icon: <ShoppingBasket size={20} />, path: '/recipes' },
    // Sağlıklı Menü removed from sidebar - keeping path for highlighting if relevant but user said "remove from left menu"
    { name: 'Haftalık Kayıt', icon: <NotebookText size={20} />, path: '/weekly-logs' },
    { name: 'Favoriler', icon: <Heart size={20} />, path: '/favorites' },
    // Profili Düzenle removed from here - moving to sidebar-actions bottom
  ]), []);

  useLayoutEffect(() => {
    let frameId = 0;
    const updatePill = (nextStyle) => {
      frameId = window.requestAnimationFrame(() => setPillStyle(nextStyle));
    };

    const activeItem = menuItems.find((item) => location.pathname.startsWith(item.path));
    if (!activeItem) {
        updatePill(prev => ({ ...prev, opacity: 0 }));
        return () => window.cancelAnimationFrame(frameId);
    }

    const navElement = navRef.current;
    const activeElement = itemRefs.current[activeItem.path];

    if (!navElement || !activeElement) {
      return () => window.cancelAnimationFrame(frameId);
    }

    const navRect = navElement.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();

    updatePill({
      opacity: 1,
      transform: `translateY(${activeRect.top - navRect.top}px)`,
      height: activeRect.height,
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname, menuItems]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="layout-shell" data-theme={isDarkMode ? 'dark' : 'light'} data-layout-variant={resolvedVariant}>
      <button
        className="mobile-menu-button"
        onClick={() => setMobileMenuOpen((prev) => !prev)}
        aria-label="Menüyü aç veya kapat"
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <div
        className={`layout-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="brand-mark" style={{ marginBottom: '2.5rem' }}>
          <img className="brand-symbol" src={reciMatchMiniLogo} alt="" aria-hidden="true" />
          <span className="brand-divider" aria-hidden="true" />
          <div className="brand-wordmark" aria-label="ReciMatch Beslenme Asistanı">
            <h1>
              <span className="brand-wordmark-reci">Reci</span>
              <span className="brand-wordmark-match">Match</span>
            </h1>
            <p>
              <span aria-hidden="true" />
              Beslenme Asistanı
              <span aria-hidden="true" />
            </p>
          </div>
        </div>

        <nav ref={navRef} className="sidebar-nav">
          <div
            className="nav-active-pill"
            style={{
              opacity: pillStyle.opacity,
              transform: pillStyle.transform,
              height: pillStyle.height,
            }}
          />
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMobileMenu}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              ref={(element) => {
                itemRefs.current[item.path] = element;
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-actions" style={{ marginTop: 'auto', display: 'grid', gap: '0.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <NavLink
            to="/profile-edit"
            onClick={closeMobileMenu}
            className={({ isActive }) => `sidebar-action-button profile-edit-btn ${isActive ? 'active' : ''}`}
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.8rem', 
                padding: '0.95rem 1rem', 
                borderRadius: '18px', 
                textDecoration: 'none',
                color: 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '0.9rem'
            }}
          >
            <UserCircle size={20} />
            <span>Profili Düzenle</span>
          </NavLink>

          <button onClick={() => setUser(null)} className="sidebar-action-button logout-button">
            <LogOut size={20} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      <main className="layout-content" onClick={mobileMenuOpen ? closeMobileMenu : undefined}>
        {children}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .profile-edit-btn:hover { background: var(--menu-item-hover-bg); color: var(--text-primary) !important; }
        .profile-edit-btn.active { background: var(--menu-item-active-bg); border-color: var(--menu-item-active-border); color: var(--primary-color) !important; }
        .layout-shell[data-theme="dark"] .profile-edit-btn.active,
        .layout-shell[data-theme="dark"] .profile-edit-btn:hover { color: #ffffff !important; }
      ` }} />
    </div>
  );
};

export default Layout;
