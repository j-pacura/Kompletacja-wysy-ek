import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/' },
  { id: 'archive', label: 'Archiwum', icon: 'archive', path: '/archive' },
  { id: 'settings', label: 'Ustawienia', icon: 'settings', path: '/settings' },
  { id: 'admin', label: 'Panel Admin', icon: 'admin_panel_settings', path: '/admin', adminOnly: true },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  console.log('🏗️ Layout component mounted');
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useUser();
  console.log('📍 Current path:', location.pathname);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleNewShipment = () => {
    navigate('/shipment/new');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActivePath = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Filter nav items based on user role
  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly && currentUser?.role !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar Navigation - surface-container-low (sectional layer, NO BORDERS) */}
      <aside className="fixed left-0 top-0 h-full flex flex-col bg-surface-container-low w-64 z-50">
        {/* Logo & Title - Extreme whitespace (p-8) */}
        <div className="px-8 py-8">
          <h1 className="text-lg font-headline font-extrabold text-on-surface tracking-tight">
            Asystent Pakowania
          </h1>
          <p className="text-xs text-on-surface-variant font-label mt-1.5 tracking-wider uppercase">
            Terminal Pakowacza
          </p>
        </div>

        {/* Navigation Items - extreme whitespace between items (space-y-2 = 8px) */}
        <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
          {visibleNavItems.map(item => {
            const isActive = isActivePath(item.path);
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full px-4 py-3.5 flex items-center gap-3
                  rounded-lg transition-all duration-200
                  relative overflow-hidden
                  ${isActive
                    ? 'bg-surface-bright text-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }
                `}
              >
                {/* 2px vertical pill for active state - "The Ghost Border" at left edge */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary rounded-full"
                    style={{ width: '2px' }}
                  />
                )}

                {/* Material Symbol icon with FILL variation for active state */}
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{
                    fontVariationSettings: isActive
                      ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                      : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                  }}
                >
                  {item.icon}
                </span>
                <span className={`font-body font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Section - User Card + Actions (NO BORDER-T) */}
        <div className="p-4 mt-auto space-y-4">
          {/* User Info Card - surface-container (tonal layering, NO BORDER) */}
          {currentUser && (
            <div className="bg-surface-container rounded-xl p-4">
              <div className="flex items-center gap-3">
                {/* Avatar with primary-container background */}
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center ring-2 ring-primary/10">
                    <span className="text-on-primary-container font-headline font-bold text-base tracking-tight">
                      {currentUser.name[0]}{currentUser.surname[0]}
                    </span>
                  </div>
                </div>

                {/* User Info - Display type for name (numbers are data!) */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate font-body">
                    {currentUser.name} {currentUser.surname}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate font-label mt-0.5">
                    {currentUser.role === 'admin' ? 'Administrator' : 'Pakujący'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Primary Action Button - Gradient (primary to primary-container) */}
          <button
            onClick={handleNewShipment}
            className="
              w-full primary-gradient text-on-primary font-bold py-3.5 px-4
              rounded-full flex items-center justify-center gap-2
              active:scale-95 transition-all duration-150
              shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35
              font-headline tracking-tight
            "
          >
            <span className="material-symbols-outlined text-xl">add</span>
            <span>Nowa Przesyłka</span>
          </button>

          {/* Logout Button - Ghost style (secondary button, no background) */}
          <button
            onClick={handleLogout}
            className="
              w-full px-4 py-3 flex items-center justify-center gap-3
              text-on-surface-variant hover:text-on-surface
              hover:bg-surface-container rounded-lg
              transition-all duration-200
              font-body font-medium
            "
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Wyloguj</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area - surface-container (interactive layer), extreme whitespace (p-8) */}
      <main className="flex-1 ml-64 min-h-screen bg-surface-container">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
