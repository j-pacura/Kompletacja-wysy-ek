import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import {
  ArrowLeft,
  Search,
  Settings,
  Save,
  Pause,
  FileText,
  BarChart3,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Shipment } from '../types/shipment';
import { Part } from '../types/part';

const PackingScreen: React.FC = () => {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const navigate = useNavigate();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionStartTime] = useState<number>(Date.now()); // We don't need setter - timer starts once
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (shipmentId) {
      loadShipment(parseInt(shipmentId));
      loadParts(parseInt(shipmentId));
    }
  }, [shipmentId]);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadShipment = async (id: number) => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:get-shipment', id);

      if (result.success) {
        setShipment(result.data);
      } else {
        console.error('Failed to load shipment:', result.error);
      }
    } catch (error) {
      console.error('Error loading shipment:', error);
    }
  };

  const loadParts = async (id: number) => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:get-parts', id);

      if (result.success) {
        setParts(result.data);
      } else {
        console.error('Failed to load parts:', result.error);
      }
    } catch (error) {
      console.error('Error loading parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePackPart = async (part: Part) => {
    try {
      const { ipcRenderer } = window.require('electron');

      // Update part status to 'packed'
      const result = await ipcRenderer.invoke('db:update-part', part.id, {
        status: 'packed',
        packed_at: Date.now()
      });

      if (result.success) {
        // Update local state
        setParts(prevParts =>
          prevParts.map(p =>
            p.id === part.id
              ? { ...p, status: 'packed', packed_at: Date.now() }
              : p
          )
        );

        // Check if this was the last part
        const remainingParts = parts.filter(p => p.id !== part.id && p.status === 'pending');
        if (remainingParts.length === 0) {
          // Show confetti!
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000); // Hide after 5 seconds
        }
      } else {
        console.error('Failed to update part:', result.error);
      }
    } catch (error) {
      console.error('Error packing part:', error);
    }
  };

  const pendingParts = parts.filter(p => p.status === 'pending');
  const packedParts = parts.filter(p => p.status === 'packed');
  const progress = parts.length > 0 ? (packedParts.length / parts.length) * 100 : 0;

  const filteredPendingParts = pendingParts.filter(part =>
    part.sap_index.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !shipment) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-bg-primary">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-text-secondary text-lg">Ładowanie wysyłki...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary">
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}

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
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {shipment.shipment_number}
              </h1>
              <p className="text-text-secondary text-sm">📍 {shipment.destination}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Timer */}
            <div className="text-right">
              <p className="text-text-secondary text-xs mb-1">Czas sesji</p>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-primary" />
                <span className="text-text-primary font-bold text-lg font-mono">
                  {formatTime(elapsedTime)}
                </span>
              </div>
            </div>

            {/* Progress */}
            <div className="text-right">
              <p className="text-text-secondary text-xs mb-1">Postęp</p>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-primary progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-text-primary font-bold text-sm">
                  {packedParts.length}/{parts.length}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
                title="Zapisz"
              >
                <Save className="w-5 h-5 text-text-secondary" />
              </button>
              <button
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
                title="Wstrzymaj"
              >
                <Pause className="w-5 h-5 text-text-secondary" />
              </button>
              <button
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
                title="Raport"
              >
                <FileText className="w-5 h-5 text-text-secondary" />
              </button>
              <button
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
                title="Statystyki"
              >
                <BarChart3 className="w-5 h-5 text-text-secondary" />
              </button>
              <button
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
                title="Ustawienia"
              >
                <Settings className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex-shrink-0 bg-bg-secondary border-b border-bg-tertiary px-8 py-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="🔍 Skanuj QR lub wyszukaj część..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full pl-12 pr-4 py-4 bg-bg-tertiary text-text-primary text-lg rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Requirements badges */}
        {(shipment.require_weight || shipment.require_country || shipment.require_photos) && (
          <div className="flex gap-3 mt-3">
            <span className="text-text-secondary text-sm">Wymagane dane:</span>
            {shipment.require_weight && (
              <span className="px-3 py-1 bg-accent-primary bg-opacity-10 text-accent-primary text-xs rounded-full">
                ⚖️ Waga
              </span>
            )}
            {shipment.require_country && (
              <span className="px-3 py-1 bg-accent-secondary bg-opacity-10 text-accent-secondary text-xs rounded-full">
                🌍 Kraj pochodzenia
              </span>
            )}
            {shipment.require_photos && (
              <span className="px-3 py-1 bg-accent-warning bg-opacity-10 text-accent-warning text-xs rounded-full">
                📷 Zdjęcia
              </span>
            )}
          </div>
        )}
      </div>

      {/* Parts list */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Pending parts */}
          {filteredPendingParts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                DO SPAKOWANIA ({filteredPendingParts.length})
              </h2>
              <div className="space-y-2">
                {filteredPendingParts.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => handlePackPart(part)}
                    className="bg-bg-tertiary rounded-lg p-4 hover:bg-opacity-80 hover:scale-[1.02] transition-all cursor-pointer animate-slide-in active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-accent-primary font-bold text-lg">
                            {part.sap_index}
                          </span>
                          <span className="text-text-tertiary text-sm">
                            #{part.excel_row_number}
                          </span>
                        </div>
                        <p className="text-text-primary mb-2">{part.description}</p>
                        <div className="flex items-center gap-4 text-sm text-text-secondary">
                          <span>📦 {part.quantity} {part.unit}</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-full border-2 border-text-tertiary flex items-center justify-center hover:border-accent-success hover:bg-accent-success hover:bg-opacity-10 transition-all">
                        <span className="text-text-tertiary text-xl">☐</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Packed parts */}
          {packedParts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-text-secondary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                SPAKOWANE ({packedParts.length})
              </h2>
              <div className="space-y-2 opacity-30">
                {packedParts.map((part) => (
                  <div
                    key={part.id}
                    className="bg-bg-tertiary rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-accent-success font-bold">
                            {part.sap_index}
                          </span>
                        </div>
                        <p className="text-text-secondary text-sm">{part.description}</p>
                      </div>
                      <CheckCircle2 className="w-6 h-6 text-accent-success" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {pendingParts.length === 0 && packedParts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-secondary text-lg">
                Brak części do spakowania
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PackingScreen;
