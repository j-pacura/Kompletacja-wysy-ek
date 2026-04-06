import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import type { ColorScheme } from '../contexts/ThemeContext';

const SettingsScreen: React.FC = () => {
  const { mode, colorScheme, setMode, setColorScheme } = useTheme();
  const { currentUser } = useUser();

  // Scale settings
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<string>('9600');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadSettings();
    loadAvailablePorts();
  }, []);

  const loadSettings = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:get-settings');

      if (result.success) {
        const settings = result.data;
        setSelectedPort(settings.scale_com_port || '');
        setBaudRate(settings.scale_baud_rate || '9600');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Błąd ładowania ustawień');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePorts = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('scale:list-ports');

      if (result.success) {
        setAvailablePorts(result.data);
      }
    } catch (error) {
      console.error('Error loading ports:', error);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedPort) {
      toast.error('Wybierz port COM');
      return;
    }

    setTesting(true);
    try {
      const { ipcRenderer } = window.require('electron');
      const connectResult = await ipcRenderer.invoke('scale:connect', selectedPort, parseInt(baudRate));

      if (!connectResult.success) {
        toast.error('Nie udało się połączyć z wagą');
        setTesting(false);
        return;
      }

      const readResult = await ipcRenderer.invoke('scale:get-weight', true);

      if (readResult.success) {
        const reading = readResult.data;
        toast.success(`✅ Waga działa! Odczyt: ${reading.value.toFixed(3)} ${reading.unit}`, {
          duration: 5000,
        });
      } else {
        toast.error('Połączono, ale nie można odczytać wagi');
      }

      await ipcRenderer.invoke('scale:disconnect');
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Błąd testowania połączenia');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveScaleSettings = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('db:update-setting', 'scale_com_port', selectedPort);
      await ipcRenderer.invoke('db:update-setting', 'scale_baud_rate', baudRate);
      toast.success('✅ Ustawienia wagi zapisane');

      if (selectedPort) {
        const connectResult = await ipcRenderer.invoke('scale:connect', selectedPort, parseInt(baudRate));
        if (connectResult.success) {
          toast.success('🔗 Połączono z wagą');
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Błąd zapisu ustawień');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('Nowe hasła nie są identyczne');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Hasło musi mieć minimum 6 znaków');
      return;
    }

    setChangingPassword(true);
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:change-password', currentUser?.id, currentPassword, newPassword);

      if (result.success) {
        toast.success('✅ Hasło zmienione pomyślnie');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        toast.error(result.error || 'Błąd zmiany hasła');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Błąd zmiany hasła');
    } finally {
      setChangingPassword(false);
    }
  };

  const colorSchemes: { value: ColorScheme; label: string; preview: string[] }[] = [
    { value: 'green', label: 'Zielony', preview: ['#72fe8f', '#1cb853', '#7cfbb5'] },
    { value: 'blue', label: 'Niebieski', preview: ['#64b5f6', '#1976d2', '#81c784'] },
    { value: 'purple', label: 'Fioletowy', preview: ['#ba68c8', '#7b1fa2', '#ce93d8'] },
    { value: 'orange', label: 'Pomarańczowy', preview: ['#ff9800', '#e65100', '#ffb74d'] },
    { value: 'red', label: 'Czerwony', preview: ['#ef5350', '#c62828', '#ef5350'] },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-on-surface-variant font-body">Ładowanie ustawień...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
          Ustawienia
        </h1>
        <p className="text-on-surface-variant font-body">
          Personalizacja i konfiguracja aplikacji
        </p>
      </div>

      {/* Theme Settings - MOST IMPORTANT */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
            Motyw
          </h2>
          <p className="text-on-surface-variant font-body text-sm">
            Wybierz tryb i schemat kolorystyczny
          </p>
        </div>

        {/* Dark/Light Mode Toggle */}
        <div className="bg-surface-container-high rounded-xl p-6">
          <label className="text-on-surface font-label font-semibold text-sm uppercase tracking-wider mb-4 block">
            Tryb wyświetlania
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setMode('dark')}
              className={`
                flex-1 px-6 py-4 rounded-lg flex items-center justify-center gap-3
                transition-all duration-200
                ${mode === 'dark'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright'
                }
              `}
            >
              <span className="material-symbols-outlined">dark_mode</span>
              <span className="font-body font-semibold">Ciemny</span>
            </button>
            <button
              onClick={() => setMode('light')}
              className={`
                flex-1 px-6 py-4 rounded-lg flex items-center justify-center gap-3
                transition-all duration-200
                ${mode === 'light'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright'
                }
              `}
            >
              <span className="material-symbols-outlined">light_mode</span>
              <span className="font-body font-semibold">Jasny</span>
            </button>
          </div>
        </div>

        {/* Color Scheme Selector */}
        <div className="bg-surface-container-high rounded-xl p-6">
          <label className="text-on-surface font-label font-semibold text-sm uppercase tracking-wider mb-4 block">
            Schemat kolorów
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {colorSchemes.map((scheme) => (
              <button
                key={scheme.value}
                onClick={() => setColorScheme(scheme.value)}
                className={`
                  px-6 py-5 rounded-xl flex flex-col items-center gap-3
                  transition-all duration-200
                  ${colorScheme === scheme.value
                    ? 'bg-primary/20 ring-2 ring-primary'
                    : 'bg-surface-container hover:bg-surface-bright'
                  }
                `}
              >
                {/* Color Preview Circles */}
                <div className="flex gap-1.5">
                  {scheme.preview.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className={`
                  font-body font-semibold text-sm
                  ${colorScheme === scheme.value ? 'text-primary' : 'text-on-surface'}
                `}>
                  {scheme.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Scale Settings */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
            Waga
          </h2>
          <p className="text-on-surface-variant font-body text-sm">
            Konfiguracja połączenia z wagą Radwag
          </p>
        </div>

        <div className="bg-surface-container-high rounded-xl p-6 space-y-6">
          {/* COM Port */}
          <div>
            <label className="text-on-surface font-label font-semibold text-sm uppercase tracking-wider mb-3 block">
              Port COM
            </label>
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              className="
                w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg
                font-body outline-none
                focus:ring-2 focus:ring-primary
              "
            >
              <option value="">Wybierz port...</option>
              {availablePorts.map((port) => (
                <option key={port} value={port}>
                  {port}
                </option>
              ))}
            </select>
          </div>

          {/* Baud Rate */}
          <div>
            <label className="text-on-surface font-label font-semibold text-sm uppercase tracking-wider mb-3 block">
              Prędkość (Baud Rate)
            </label>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(e.target.value)}
              className="
                w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg
                font-body outline-none
                focus:ring-2 focus:ring-primary
              "
            >
              <option value="9600">9600</option>
              <option value="19200">19200</option>
              <option value="38400">38400</option>
              <option value="57600">57600</option>
              <option value="115200">115200</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleTestConnection}
              disabled={!selectedPort || testing}
              className="
                flex-1 px-6 py-3 rounded-lg flex items-center justify-center gap-2
                bg-tertiary/20 text-tertiary hover:bg-tertiary/30
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all font-body font-semibold
              "
            >
              <span className="material-symbols-outlined">
                {testing ? 'progress_activity' : 'science'}
              </span>
              <span>{testing ? 'Testowanie...' : 'Testuj połączenie'}</span>
            </button>
            <button
              onClick={handleSaveScaleSettings}
              disabled={!selectedPort}
              className="
                flex-1 primary-gradient text-on-primary font-bold py-3 px-6
                rounded-lg flex items-center justify-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-95 transition-all shadow-lg shadow-primary/20
                font-headline
              "
            >
              <span className="material-symbols-outlined">save</span>
              <span>Zapisz</span>
            </button>
          </div>
        </div>
      </section>

      {/* Password Change */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
            Bezpieczeństwo
          </h2>
          <p className="text-on-surface-variant font-body text-sm">
            Zmiana hasła do konta
          </p>
        </div>

        <div className="bg-surface-container-high rounded-xl p-6 space-y-4">
          <div>
            <label className="text-on-surface font-label font-semibold text-sm uppercase tracking-wider mb-2 block">
              Obecne hasło
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="
                w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg
                font-body outline-none
                focus:ring-2 focus:ring-primary
              "
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-on-surface font-label font-semibold text-sm uppercase tracking-wider mb-2 block">
              Nowe hasło
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="
                w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg
                font-body outline-none
                focus:ring-2 focus:ring-primary
              "
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-on-surface font-label font-semibold text-sm uppercase tracking-wider mb-2 block">
              Potwierdź nowe hasło
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="
                w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg
                font-body outline-none
                focus:ring-2 focus:ring-primary
              "
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
            className="
              w-full primary-gradient text-on-primary font-bold py-3 px-6
              rounded-lg flex items-center justify-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-95 transition-all shadow-lg shadow-primary/20
              font-headline
            "
          >
            <span className="material-symbols-outlined">lock_reset</span>
            <span>{changingPassword ? 'Zmiana...' : 'Zmień hasło'}</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default SettingsScreen;
