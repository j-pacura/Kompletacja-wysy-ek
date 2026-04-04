import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import Layout from './components/layout/Layout';
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
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-on-surface-variant text-lg font-body">Ładowanie aplikacji...</p>
        </div>
      </div>
    );
  }

  // Show login screen if no user is logged in
  if (!currentUser) {
    return <LoginScreen />;
  }

  // User is logged in - show main app with Layout
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/shipment/new" element={<ShipmentCreator />} />
          <Route path="/shipment/:shipmentId" element={<PackingScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
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
              border: '1px solid var(--md-outline-variant)',
              borderRadius: '12px',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: 'var(--md-secondary)',
                secondary: 'var(--md-on-secondary)',
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
