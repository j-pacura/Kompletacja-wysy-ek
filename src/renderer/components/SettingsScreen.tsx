import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowLeft, Save, RefreshCw, FolderOpen, Sun, Moon, Palette, Volume2, VolumeX, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { mode, colorScheme, setMode, setColorScheme } = useTheme();

  // Scale settings
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<string>('9600');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  // Audio settings
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(70);
  const [voiceVolume, setVoiceVolume] = useState(80);

  // Personalization settings
  const [userName, setUserName] = useState('');
  const [userSurname, setUserSurname] = useState('');

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
        setSoundEffectsEnabled(settings.sound_effects_enabled === 'true');
        setVoiceEnabled(settings.enable_voice === 'true');
        setSoundVolume(parseInt(settings.sound_volume || '70'));
        setVoiceVolume(parseInt(settings.voice_volume || '80'));
        setUserName(settings.user_name || '');
        setUserSurname(settings.user_surname || '');
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

      // Try to connect
      const connectResult = await ipcRenderer.invoke('scale:connect', selectedPort, parseInt(baudRate));

      if (!connectResult.success) {
        toast.error('Nie udało się połączyć z wagą');
        setTesting(false);
        return;
      }

      // Try to read weight
      const readResult = await ipcRenderer.invoke('scale:get-weight', true);

      if (readResult.success) {
        const reading = readResult.data;
        toast.success(`✅ Waga działa! Odczyt: ${reading.value.toFixed(3)} ${reading.unit}`, {
          duration: 5000,
        });
      } else {
        toast.error('Połączono, ale nie można odczytać wagi');
      }

      // Disconnect after test
      await ipcRenderer.invoke('scale:disconnect');
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Błąd testowania połączenia');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      const { ipcRenderer } = window.require('electron');

      // Save settings
      await ipcRenderer.invoke('db:update-setting', 'scale_com_port', selectedPort);
      await ipcRenderer.invoke('db:update-setting', 'scale_baud_rate', baudRate);

      toast.success('✅ Ustawienia zapisane');

      // Try to reconnect if port is set
      if (selectedPort) {
        const connectResult = await ipcRenderer.invoke('scale:connect', selectedPort, parseInt(baudRate));
        if (connectResult.success) {
          toast.success('🔗 Połączono z wagą');
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('❌ Błąd zapisu ustawień');
    }
  };

  const handleAudioSettingChange = async (key: string, value: string) => {
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('db:update-setting', key, value);
      toast.success('Ustawienie zapisane', { duration: 1500 });
    } catch (error) {
      console.error('Error saving audio setting:', error);
      toast.error('Błąd zapisu ustawienia');
    }
  };

  const handleOpenPhotosFolder = async () => {
    try {
      const { ipcRenderer } = window.require('electron');

      // Get userData path
      const userDataResult = await ipcRenderer.invoke('app:get-path', 'userData');
      if (!userDataResult.success) {
        toast.error('❌ Nie można znaleźć folderu');
        return;
      }

      const path = window.require('path');
      const photosPath = path.join(userDataResult.data, 'photos');

      // Open folder
      const result = await ipcRenderer.invoke('file:open-folder', photosPath);
      if (result.success) {
        toast.success('📁 Folder otwarty');
      } else {
        toast.error('❌ Nie można otworzyć folderu');
      }
    } catch (error) {
      console.error('Error opening photos folder:', error);
      toast.error('❌ Błąd otwierania folderu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-bg-primary">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-text-secondary text-lg">Ładowanie ustawień...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-screen h-screen bg-bg-primary">
      {/* Toast notifications */}
      <Toaster
        toastOptions={{
          style: {
            background: '#1e1e1e',
            color: '#fff',
            border: '1px solid #333',
          },
          success: {
            iconTheme: {
              primary: '#1db954',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Header */}
      <div className="flex-shrink-0 bg-bg-secondary border-b border-bg-tertiary px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-text-primary" />
            </button>
            <h1 className="text-2xl font-bold text-text-primary">⚙️ Ustawienia</h1>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 gradient-primary text-white rounded-lg hover:opacity-90 transition-all font-semibold"
          >
            <Save className="w-5 h-5" />
            Zapisz
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Theme Settings */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <Palette className="w-6 h-6" />
              Motyw aplikacji
            </h2>

            <div className="space-y-4">
              {/* Theme Mode Toggle */}
              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Tryb wyświetlania
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setMode('dark')}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg border-2 transition-all ${
                      mode === 'dark'
                        ? 'border-accent-primary bg-accent-primary bg-opacity-10 text-text-primary'
                        : 'border-bg-tertiary bg-bg-tertiary text-text-secondary hover:border-accent-primary hover:border-opacity-50'
                    }`}
                  >
                    <Moon className="w-5 h-5" />
                    <span className="font-semibold">Ciemny</span>
                  </button>
                  <button
                    onClick={() => setMode('light')}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg border-2 transition-all ${
                      mode === 'light'
                        ? 'border-accent-primary bg-accent-primary bg-opacity-10 text-text-primary'
                        : 'border-bg-tertiary bg-bg-tertiary text-text-secondary hover:border-accent-primary hover:border-opacity-50'
                    }`}
                  >
                    <Sun className="w-5 h-5" />
                    <span className="font-semibold">Jasny</span>
                  </button>
                </div>
              </div>

              {/* Color Scheme Selector */}
              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Schemat kolorów
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setColorScheme('default')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                      colorScheme === 'default'
                        ? 'border-accent-primary bg-accent-primary bg-opacity-10'
                        : 'border-bg-tertiary bg-bg-tertiary hover:border-accent-primary hover:border-opacity-50'
                    }`}
                  >
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                    </div>
                    <span className={`font-semibold ${colorScheme === 'default' ? 'text-text-primary' : 'text-text-secondary'}`}>
                      Domyślny
                    </span>
                  </button>

                  <button
                    onClick={() => setColorScheme('blue')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                      colorScheme === 'blue'
                        ? 'border-accent-primary bg-accent-primary bg-opacity-10'
                        : 'border-bg-tertiary bg-bg-tertiary hover:border-accent-primary hover:border-opacity-50'
                    }`}
                  >
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full bg-sky-500"></div>
                      <div className="w-4 h-4 rounded-full bg-cyan-500"></div>
                    </div>
                    <span className={`font-semibold ${colorScheme === 'blue' ? 'text-text-primary' : 'text-text-secondary'}`}>
                      Niebieski
                    </span>
                  </button>

                  <button
                    onClick={() => setColorScheme('purple')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                      colorScheme === 'purple'
                        ? 'border-accent-primary bg-accent-primary bg-opacity-10'
                        : 'border-bg-tertiary bg-bg-tertiary hover:border-accent-primary hover:border-opacity-50'
                    }`}
                  >
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                      <div className="w-4 h-4 rounded-full bg-pink-500"></div>
                    </div>
                    <span className={`font-semibold ${colorScheme === 'purple' ? 'text-text-primary' : 'text-text-secondary'}`}>
                      Fioletowy
                    </span>
                  </button>

                  <button
                    onClick={() => setColorScheme('green')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                      colorScheme === 'green'
                        ? 'border-accent-primary bg-accent-primary bg-opacity-10'
                        : 'border-bg-tertiary bg-bg-tertiary hover:border-accent-primary hover:border-opacity-50'
                    }`}
                  >
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                    </div>
                    <span className={`font-semibold ${colorScheme === 'green' ? 'text-text-primary' : 'text-text-secondary'}`}>
                      Zielony (Spotify)
                    </span>
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="bg-bg-tertiary bg-opacity-50 rounded-lg p-4">
                <p className="text-text-secondary text-sm">
                  💡 Zmiany motywu są zapisywane automatycznie i obowiązują natychmiast
                </p>
              </div>
            </div>
          </div>

          {/* Personalization Settings */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <User className="w-6 h-6" />
              Personalizacja
            </h2>

            <div className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Imię
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onBlur={() => handleAudioSettingChange('user_name', userName)}
                  placeholder="Np. Jan"
                  className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                />
              </div>

              {/* Surname Input */}
              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Nazwisko
                </label>
                <input
                  type="text"
                  value={userSurname}
                  onChange={(e) => setUserSurname(e.target.value)}
                  onBlur={() => handleAudioSettingChange('user_surname', userSurname)}
                  placeholder="Np. Kowalski"
                  className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                />
              </div>

              {/* Preview */}
              {(userName || userSurname) && (
                <div className="bg-bg-tertiary bg-opacity-50 rounded-lg p-4">
                  <p className="text-text-secondary text-sm">
                    👤 <strong>Podgląd:</strong> {userName} {userSurname}
                  </p>
                  <p className="text-text-tertiary text-xs mt-1">
                    Dane będą wyświetlane w raportach i nagłówku aplikacji
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Audio Settings */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <Volume2 className="w-6 h-6" />
              Dźwięk i głos
            </h2>

            <div className="space-y-6">
              {/* Sound Effects Toggle */}
              <div>
                <label className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary text-sm">Efekty dźwiękowe (beep, sukces, błąd)</span>
                  <button
                    onClick={() => {
                      const newValue = !soundEffectsEnabled;
                      setSoundEffectsEnabled(newValue);
                      handleAudioSettingChange('sound_effects_enabled', newValue.toString());
                    }}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      soundEffectsEnabled ? 'bg-accent-primary' : 'bg-bg-tertiary'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                        soundEffectsEnabled ? 'transform translate-x-7' : ''
                      }`}
                    />
                  </button>
                </label>

                {/* Sound Volume Slider */}
                {soundEffectsEnabled && (
                  <div className="mt-3">
                    <div className="flex items-center gap-4">
                      <VolumeX className="w-5 h-5 text-text-tertiary" />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={soundVolume}
                        onChange={(e) => {
                          const newVolume = parseInt(e.target.value);
                          setSoundVolume(newVolume);
                          handleAudioSettingChange('sound_volume', newVolume.toString());
                        }}
                        className="flex-1 h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-primary
                          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                          [&::-moz-range-thumb]:bg-accent-primary [&::-moz-range-thumb]:border-0"
                      />
                      <Volume2 className="w-5 h-5 text-text-secondary" />
                      <span className="text-text-secondary font-semibold w-12 text-right">{soundVolume}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Voice Toggle */}
              <div>
                <label className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary text-sm">Potwierdzenia głosowe (synteza mowy)</span>
                  <button
                    onClick={() => {
                      const newValue = !voiceEnabled;
                      setVoiceEnabled(newValue);
                      handleAudioSettingChange('enable_voice', newValue.toString());
                    }}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      voiceEnabled ? 'bg-accent-primary' : 'bg-bg-tertiary'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                        voiceEnabled ? 'transform translate-x-7' : ''
                      }`}
                    />
                  </button>
                </label>

                {/* Voice Volume Slider */}
                {voiceEnabled && (
                  <div className="mt-3">
                    <div className="flex items-center gap-4">
                      <VolumeX className="w-5 h-5 text-text-tertiary" />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={voiceVolume}
                        onChange={(e) => {
                          const newVolume = parseInt(e.target.value);
                          setVoiceVolume(newVolume);
                          handleAudioSettingChange('voice_volume', newVolume.toString());
                        }}
                        className="flex-1 h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-primary
                          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                          [&::-moz-range-thumb]:bg-accent-primary [&::-moz-range-thumb]:border-0"
                      />
                      <Volume2 className="w-5 h-5 text-text-secondary" />
                      <span className="text-text-secondary font-semibold w-12 text-right">{voiceVolume}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="bg-bg-tertiary bg-opacity-50 rounded-lg p-4">
                <p className="text-text-secondary text-sm">
                  🔊 <strong>Efekty dźwiękowe:</strong> Beep przy skanowaniu, dźwięki sukcesu/błędu<br/>
                  🗣️ <strong>Głos:</strong> "Spakowano część ABC123", "Pozostało X części" (co 5 pozycji)
                </p>
              </div>
            </div>
          </div>

          {/* Scale Settings */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              ⚖️ Ustawienia wagi Radwag
            </h2>

            <div className="space-y-4">
              {/* COM Port */}
              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Port COM
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedPort}
                    onChange={(e) => setSelectedPort(e.target.value)}
                    className="flex-1 px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none"
                  >
                    <option value="">Wybierz port...</option>
                    {availablePorts.map((port) => (
                      <option key={port} value={port}>
                        {port}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={loadAvailablePorts}
                    className="px-4 py-3 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-opacity-80 transition-all"
                    title="Odśwież listę portów"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
                {availablePorts.length === 0 && (
                  <p className="text-text-tertiary text-xs mt-2">
                    ⚠️ Nie znaleziono dostępnych portów COM
                  </p>
                )}
              </div>

              {/* Baud Rate */}
              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Prędkość transmisji (Baud Rate)
                </label>
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none"
                >
                  <option value="4800">4800</option>
                  <option value="9600">9600</option>
                  <option value="19200">19200</option>
                  <option value="38400">38400</option>
                  <option value="57600">57600</option>
                  <option value="115200">115200</option>
                </select>
                <p className="text-text-tertiary text-xs mt-2">
                  💡 Standardowo: 9600 (sprawdź ustawienia wagi)
                </p>
              </div>

              {/* Test Connection */}
              <div>
                <button
                  onClick={handleTestConnection}
                  disabled={testing || !selectedPort}
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                    testing || !selectedPort
                      ? 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                      : 'bg-accent-primary text-white hover:opacity-90'
                  }`}
                >
                  {testing ? '⏳ Testowanie...' : '🔍 Testuj połączenie'}
                </button>
              </div>

              {/* Info */}
              <div className="bg-bg-tertiary bg-opacity-50 rounded-lg p-4">
                <h3 className="text-text-primary font-semibold mb-2">
                  📋 Specyfikacja połączenia
                </h3>
                <ul className="text-text-secondary text-sm space-y-1">
                  <li>• Baud Rate: 9600 (domyślnie)</li>
                  <li>• Data Bits: 8</li>
                  <li>• Parity: None</li>
                  <li>• Stop Bits: 1</li>
                  <li>• Kabel: NULL-MODEM (skrzyżowany TX/RX)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Photos Settings */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              📸 Zdjęcia
            </h2>

            <div className="space-y-4">
              <p className="text-text-secondary text-sm mb-4">
                Zdjęcia są zapisywane w folderze aplikacji i powiązane z produktami.
              </p>

              <button
                onClick={handleOpenPhotosFolder}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent-primary text-white rounded-lg hover:opacity-90 transition-all font-semibold"
              >
                <FolderOpen className="w-5 h-5" />
                📁 Otwórz folder ze zdjęciami
              </button>

              <div className="bg-bg-tertiary bg-opacity-50 rounded-lg p-4">
                <h3 className="text-text-primary font-semibold mb-2">
                  📋 Informacje
                </h3>
                <ul className="text-text-secondary text-sm space-y-1">
                  <li>• Format: JPEG (jakość 90%)</li>
                  <li>• Rozdzielczość: 1280x720</li>
                  <li>• Nazwa pliku: SAP_[indeks]_[timestamp].jpg</li>
                  <li>• Można przeglądać zdjęcia klikając ikonę 📷 przy spakowanych produktach</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
