import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

console.log('🔍 [main.tsx] Starting application...');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

console.log('🔍 [main.tsx] Root created, rendering App...');

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('🔍 [main.tsx] App rendered');
