import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ShipmentCreator from './components/ShipmentCreator';
import PackingScreen from './components/PackingScreen';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize app
    const initApp = async () => {
      try {
        // Test database connection
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('db:get-settings');

        if (result.success) {
          console.log('App initialized successfully');
        } else {
          console.error('Failed to initialize app:', result.error);
        }
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

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

  return (
    <BrowserRouter>
      <div className="w-screen h-screen bg-bg-primary overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<ShipmentCreator />} />
          <Route path="/packing/:shipmentId" element={<PackingScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
