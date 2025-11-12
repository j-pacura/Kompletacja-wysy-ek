import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import toast, { Toaster } from 'react-hot-toast';
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

  // Scanner state
  const [scanBuffer, setScanBuffer] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1); // 1: confirm, 2: weight, 3: photo
  const scannerInputRef = React.useRef<HTMLInputElement>(null);

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

        // Show success toast
        toast.success(`✅ Spakowano ${part.sap_index}`, {
          duration: 3000,
          position: 'top-right',
        });

        // Check if this was the last part
        const remainingParts = parts.filter(p => p.id !== part.id && p.status === 'pending');
        if (remainingParts.length === 0) {
          // Show confetti!
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000); // Hide after 5 seconds
          toast.success('🎉 Wszystkie części spakowane!', {
            duration: 5000,
            position: 'top-center',
          });
        }
      } else {
        console.error('Failed to update part:', result.error);
      }
    } catch (error) {
      console.error('Error packing part:', error);
    }
  };

  const handleUnpackPart = async (part: Part) => {
    try {
      const { ipcRenderer } = window.require('electron');

      // Update part status back to 'pending'
      const result = await ipcRenderer.invoke('db:update-part', part.id, {
        status: 'pending',
        packed_at: undefined
      });

      if (result.success) {
        // Update local state
        setParts(prevParts =>
          prevParts.map(p =>
            p.id === part.id
              ? { ...p, status: 'pending', packed_at: undefined }
              : p
          )
        );

        // Show info toast
        toast(`↩️ Cofnięto ${part.sap_index}`, {
          duration: 3000,
          position: 'top-right',
          icon: '⚠️',
        });
      } else {
        console.error('Failed to unpack part:', result.error);
      }
    } catch (error) {
      console.error('Error unpacking part:', error);
    }
  };

  // Handle scanner input
  const handleScannerInput = (scannedCode: string) => {
    const trimmedCode = scannedCode.trim().toUpperCase();

    if (!trimmedCode) return;

    // If modal is open and we scan the same part, confirm it
    if (isModalOpen && selectedPart && selectedPart.sap_index.toUpperCase() === trimmedCode) {
      handleConfirmPart();
      return;
    }

    // Search for part by SAP index
    const foundPart = parts.find(p => p.sap_index.toUpperCase() === trimmedCode);

    if (!foundPart) {
      // Not found - red toast
      toast.error(`❌ Produkt nie odnaleziony: ${trimmedCode}`, {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#dc2626',
          color: '#fff',
        },
      });
      return;
    }

    if (foundPart.status === 'packed') {
      // Already packed - yellow toast
      toast(`⚠️ Uwaga: produkt ${foundPart.sap_index} został już spakowany. Sprawdź poprawność`, {
        duration: 5000,
        position: 'top-center',
        icon: '⚠️',
        style: {
          background: '#eab308',
          color: '#000',
        },
      });
      return;
    }

    // Found pending part - open modal
    setSelectedPart(foundPart);
    setModalStep(1);
    setIsModalOpen(true);
  };

  // Handle scanner Enter key
  const onScannerKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScannerInput(scanBuffer);
      setScanBuffer('');
    }
  };

  // Re-focus scanner input when modal closes
  useEffect(() => {
    if (!isModalOpen && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [isModalOpen]);

  // Handle confirmation (rescan, Enter, or click)
  const handleConfirmPart = async () => {
    if (!selectedPart) return;

    // Check if weight or photos are required
    const needsWeight = shipment?.require_weight;
    const needsPhotos = shipment?.require_photos;

    // For now, just pack the part (we'll add weight/photo steps later)
    if (!needsWeight && !needsPhotos) {
      // Pack immediately
      await handlePackPart(selectedPart);
      setIsModalOpen(false);
      setSelectedPart(null);
      setModalStep(1);
    } else {
      // Move to next step (weight or photo)
      if (needsWeight) {
        setModalStep(2); // Weight step
      } else if (needsPhotos) {
        setModalStep(3); // Photo step
      }
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPart(null);
    setModalStep(1);
    setScanBuffer('');
  };

  const pendingParts = parts.filter(p => p.status === 'pending');
  const packedParts = parts.filter(p => p.status === 'packed');
  const progress = parts.length > 0 ? (packedParts.length / parts.length) * 100 : 0;

  const filteredPendingParts = pendingParts.filter(part =>
    part.sap_index.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPackedParts = packedParts.filter(part =>
    part.sap_index.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Circular progress ring component
  const CircularProgress = ({ percent, size = 80 }: { percent: number; size?: number }) => {
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;

    return (
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-bg-tertiary"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1db954" />
            <stop offset="100%" stopColor="#1ed760" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

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
      {/* Hidden scanner input */}
      <input
        ref={scannerInputRef}
        type="text"
        value={scanBuffer}
        onChange={(e) => setScanBuffer(e.target.value)}
        onKeyPress={onScannerKeyPress}
        autoFocus
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
        }}
      />

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

      {/* Scan Confirmation Modal */}
      {isModalOpen && selectedPart && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fade-in"
          onClick={handleCloseModal}
        >
          <div
            className="bg-bg-secondary rounded-2xl p-8 max-w-2xl w-full mx-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Breadcrumb */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className={`flex items-center gap-2 ${modalStep >= 1 ? 'text-accent-success' : 'text-text-tertiary'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${modalStep >= 1 ? 'bg-accent-success' : 'bg-bg-tertiary'}`}>
                  <span className="text-white font-bold">1</span>
                </div>
                <span className="text-sm font-semibold">Potwierdzenie</span>
              </div>

              {shipment?.require_weight && (
                <>
                  <div className="w-8 h-0.5 bg-bg-tertiary"></div>
                  <div className={`flex items-center gap-2 ${modalStep >= 2 ? 'text-accent-success' : 'text-text-tertiary'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${modalStep >= 2 ? 'bg-accent-success' : 'bg-bg-tertiary'}`}>
                      <span className="text-white font-bold">2</span>
                    </div>
                    <span className="text-sm font-semibold">Waga</span>
                  </div>
                </>
              )}

              {shipment?.require_photos && (
                <>
                  <div className="w-8 h-0.5 bg-bg-tertiary"></div>
                  <div className={`flex items-center gap-2 ${modalStep >= 3 ? 'text-accent-success' : 'text-text-tertiary'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${modalStep >= 3 ? 'bg-accent-success' : 'bg-bg-tertiary'}`}>
                      <span className="text-white font-bold">3</span>
                    </div>
                    <span className="text-sm font-semibold">Zdjęcie</span>
                  </div>
                </>
              )}
            </div>

            {/* Step 1: Confirmation */}
            {modalStep === 1 && (
              <div className="text-center">
                <h2 className="text-text-secondary text-lg mb-4">Odnaleziono produkt:</h2>

                {/* SAP Index - DUŻY */}
                <div className="text-accent-primary font-bold text-6xl mb-4 tracking-wide">
                  {selectedPart.sap_index}
                </div>

                {/* Description - mały */}
                <p className="text-text-secondary text-xl mb-8">
                  {selectedPart.description}
                </p>

                {/* Quantity - DUŻY */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  <span className="text-text-primary font-bold text-5xl">
                    {selectedPart.quantity}
                  </span>
                  <span className="text-text-secondary text-3xl">
                    {selectedPart.unit}
                  </span>
                </div>

                {/* Confirmation instructions */}
                <div className="bg-bg-tertiary rounded-lg p-6 mb-6">
                  <p className="text-text-secondary text-lg mb-4">Potwierdź ilość:</p>
                  <div className="flex items-center justify-center gap-6 text-sm text-text-tertiary">
                    <span>📱 Zeskanuj ponownie</span>
                    <span>•</span>
                    <span>⌨️ Naciśnij Enter</span>
                    <span>•</span>
                    <span>🖱️ Kliknij przycisk</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-4 bg-bg-tertiary hover:bg-opacity-80 text-text-primary rounded-lg transition-all text-lg font-semibold"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleConfirmPart}
                    onKeyPress={(e) => e.key === 'Enter' && handleConfirmPart()}
                    className="flex-1 px-6 py-4 gradient-primary text-white rounded-lg hover:opacity-90 transition-all text-lg font-semibold"
                    autoFocus
                  >
                    ✓ Potwierdź
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Weight (placeholder for now) */}
            {modalStep === 2 && (
              <div className="text-center">
                <h2 className="text-text-primary text-2xl mb-4">Ważenie (wkrótce)</h2>
                <p className="text-text-secondary mb-6">Funkcja wagi będzie dostępna w następnej wersji</p>
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-3 gradient-primary text-white rounded-lg"
                >
                  Zamknij
                </button>
              </div>
            )}

            {/* Step 3: Photo (placeholder for now) */}
            {modalStep === 3 && (
              <div className="text-center">
                <h2 className="text-text-primary text-2xl mb-4">Zdjęcie (wkrótce)</h2>
                <p className="text-text-secondary mb-6">Funkcja zdjęć będzie dostępna w następnej wersji</p>
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-3 gradient-primary text-white rounded-lg"
                >
                  Zamknij
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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

            {/* Circular progress */}
            <div className="relative">
              <CircularProgress percent={progress} size={70} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-text-primary font-bold text-lg leading-none">
                  {Math.round(progress)}%
                </span>
                <span className="text-text-tertiary text-xs mt-0.5">
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
          {filteredPackedParts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-text-secondary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                SPAKOWANE ({filteredPackedParts.length})
              </h2>
              <div className="space-y-2">
                {filteredPackedParts.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => handleUnpackPart(part)}
                    className="bg-bg-tertiary bg-opacity-60 rounded-lg p-4 hover:bg-opacity-80 hover:scale-[1.01] transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-accent-success font-bold text-lg">
                            {part.sap_index}
                          </span>
                          <span className="text-text-tertiary text-sm">
                            #{part.excel_row_number}
                          </span>
                        </div>
                        <p className="text-text-secondary text-sm">{part.description}</p>
                        <div className="flex items-center gap-4 text-sm text-text-secondary mt-2">
                          <span>📦 {part.quantity} {part.unit}</span>
                        </div>
                      </div>
                      <CheckCircle2 className="w-8 h-8 text-accent-success hover:text-accent-warning transition-colors" />
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
