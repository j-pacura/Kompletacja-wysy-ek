import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
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
import ErrorBoundary from './components/ErrorBoundary';

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-bg-primary">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-text-secondary text-lg">Ładowanie aplikacji...</p>
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
    <ErrorBoundary>
      <div className="w-screen h-screen bg-bg-primary overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<ShipmentCreator />} />
          <Route path="/packing/:shipmentId" element={<PackingScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <ThemeProvider>
        <UserProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-bg-tertiary)',
              },
              success: {
                iconTheme: {
                  primary: 'var(--color-accent-success)',
                  secondary: 'white',
                },
              },
              error: {
                iconTheme: {
                  primary: 'var(--color-accent-error)',
                  secondary: 'white',
                },
              },
            }}
          />
          <AppContent />
        </UserProvider>
      </ThemeProvider>
    </HashRouter>
  );
};

export default App;
