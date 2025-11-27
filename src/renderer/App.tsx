import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import LoginScreen from './components/LoginScreen';
import ErrorBoundary from './components/ErrorBoundary';

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useUser();

  console.log('[AppContent] isLoading:', isLoading, 'currentUser:', currentUser);

  if (isLoading) {
    console.log('[AppContent] Showing loading screen');
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
    console.log('[AppContent] No user logged in - showing LoginScreen');
    return <LoginScreen />;
  }

  // User is logged in - show main app
  console.log('[AppContent] User logged in - showing test UI, user:', currentUser);

  return (
    <ErrorBoundary>
      <div className="w-screen h-screen bg-bg-primary overflow-hidden">
        <div className="p-8 text-white text-4xl">
          TEST: Routes działa! User: {currentUser.name}
        </div>
        <Routes>
          <Route path="/" element={
            <div className="p-8 text-white text-4xl bg-green-500">
              TEST: Route "/" zadziałał!
            </div>
          } />
          <Route path="*" element={
            <div className="p-8 text-white text-4xl bg-red-500">
              TEST: Catch-all route!
            </div>
          } />
        </Routes>
      </div>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
};

export default App;
