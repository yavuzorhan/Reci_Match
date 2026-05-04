import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Heart,
  Leaf,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookText,
  Package,
  ShoppingBasket,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import reciMatchLogo from '../assets/recimatch-logo.png';
import './Layout.css';

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
    { name: 'Tarifler', icon: <ShoppingBasket size={20} />, path: '/recipes', matchPaths: ['/recipes', '/recipe'] },
    { name: 'Sağlıklı Tarifler', icon: <Leaf size={20} />, path: '/healthy-menu' },
    { name: 'Haftalık Kayıt', icon: <NotebookText size={20} />, path: '/weekly-logs' },
    { name: 'Favoriler', icon: <Heart size={20} />, path: '/favorites' },
    { name: 'Profil', icon: <User size={20} />, path: '/profile-edit' },
  ]), []);

  useLayoutEffect(() => {
    let frameId = 0;
    const updatePill = (nextStyle) => {
      frameId = window.requestAnimationFrame(() => setPillStyle(nextStyle));
    };

    const activeItem = menuItems.find((item) => (
      item.matchPaths || [item.path]
    ).some((path) => location.pathname.startsWith(path)));
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

  const isNocturnalExperience = location.pathname.startsWith('/dashboard')
    || location.pathname.startsWith('/pantry')
    || location.pathname.startsWith('/recipes')
    || location.pathname.startsWith('/recipe')
    || location.pathname.startsWith('/favorites')
    || location.pathname.startsWith('/healthy-menu')
    || location.pathname.startsWith('/weekly-logs')
    || location.pathname.startsWith('/profile-edit')
    || location.pathname.startsWith('/select-ingredients')
    || location.pathname.startsWith('/recommendations');

  return (
    <div
      className={`layout-shell ${isNocturnalExperience ? 'noct-layout' : ''}`}
      data-theme={isDarkMode ? 'dark' : 'light'}
      data-layout-variant={resolvedVariant}
    >
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
        <div className="brand-mark">
          <img className="brand-symbol" src={reciMatchLogo} alt="" aria-hidden="true" />
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
              className={({ isActive }) => `nav-item ${item.path === '/favorites' ? 'nav-item-favorites' : ''} ${isActive ? 'active' : ''}`}
              ref={(element) => {
                itemRefs.current[item.path] = element;
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-actions">
          <button onClick={() => setUser(null)} className="sidebar-action-button logout-button">
            <LogOut size={20} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      <main className="layout-content" onClick={mobileMenuOpen ? closeMobileMenu : undefined}>
        {children}
      </main>

    </div>
  );
};

export default Layout;
