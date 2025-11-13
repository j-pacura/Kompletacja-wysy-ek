import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';

const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();

  // Scale settings
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<string>('9600');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

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

          {/* Other Settings (placeholder for future) */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary opacity-50">
            <h2 className="text-xl font-bold text-text-primary mb-4">
              🔧 Inne ustawienia
            </h2>
            <p className="text-text-tertiary text-sm">
              Dodatkowe ustawienia będą dostępne wkrótce...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
