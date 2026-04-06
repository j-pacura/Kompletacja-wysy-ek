import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import Dashboard from './components/Dashboard';
import ShipmentCreator from './components/ShipmentCreator';
import PackingScreen from './components/PackingScreen';
import SettingsScreen from './components/SettingsScreen';
import Archive from './components/Archive';
import LoginScreen from './components/LoginScreen';
import AdminPanel from './components/AdminPanel';

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-surface">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-on-surface-variant text-lg">Ładowanie aplikacji...</p>
        </div>
      </div>
    );
  }

  // Show login screen if no user is logged in
  if (!currentUser) {
    return <LoginScreen />;
  }

  // User is logged in - show main app
  return (
    <HashRouter>
      <div className="w-screen h-screen bg-surface overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<ShipmentCreator />} />
          <Route path="/packing/:shipmentId" element={<PackingScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <UserProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--md-surface-container-high)',
              color: 'var(--md-on-surface)',
              borderRadius: '12px',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: 'var(--md-primary)',
                secondary: 'var(--md-on-primary)',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--md-error)',
                secondary: 'var(--md-on-error)',
              },
            },
          }}
        />
        <AppContent />
      </UserProvider>
    </ThemeProvider>
  );
};

export default App;
