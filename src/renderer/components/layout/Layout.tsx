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
  { id: 'stats', label: 'Statystyki', icon: 'bar_chart', path: '/stats' },
  { id: 'settings', label: 'Ustawienia', icon: 'settings', path: '/settings' },
  { id: 'admin', label: 'Panel Admin', icon: 'admin_panel_settings', path: '/admin', adminOnly: true },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useUser();

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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full flex flex-col bg-surface-container-low w-64 z-50 border-r border-outline-variant/20">
        {/* Logo & Title */}
        <div className="p-8 border-b border-outline-variant/20">
          <h1 className="text-lg font-headline font-bold text-on-surface">
            Asystent Pakowania
          </h1>
          <p className="text-xs text-on-surface-variant font-label mt-1 tracking-wider uppercase">
            Terminal Pakowacza
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {visibleNavItems.map(item => {
            const isActive = isActivePath(item.path);
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full px-4 py-3 flex items-center gap-3 rounded-lg
                  transition-all duration-200
                  ${isActive
                    ? 'bg-surface-bright text-primary border-l-4 border-primary ml-0 pl-[12px]'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }
                `}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 mt-auto border-t border-outline-variant/20">
          {/* User Info */}
          {currentUser && (
            <div className="mb-4 px-4 py-3 bg-surface-container rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg">
                    person
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">
                    {currentUser.name} {currentUser.surname}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">
                    {currentUser.role === 'admin' ? 'Administrator' : 'Pakujący'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* New Shipment Button */}
          <button
            onClick={handleNewShipment}
            className="w-full primary-gradient text-on-primary font-bold py-3 rounded-full
                     flex items-center justify-center gap-2 active:scale-95 transition-transform
                     shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
          >
            <span className="material-symbols-outlined">add</span>
            Nowa Przesyłka
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full mt-3 text-on-surface-variant hover:text-on-surface
                     px-4 py-3 flex items-center gap-3 rounded-lg
                     hover:bg-surface-container transition-all"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-medium">Wyloguj</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default Layout;
