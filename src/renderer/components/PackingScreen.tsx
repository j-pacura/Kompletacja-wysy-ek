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

  // Weight state
  const [weightReading, setWeightReading] = useState<number>(0); // kg from scale
  const [weightQuantity, setWeightQuantity] = useState<number>(1); // pieces being weighed
  const [customQuantity, setCustomQuantity] = useState<string>(''); // for custom input
  const [scaleConnected, setScaleConnected] = useState<boolean>(false);
  const [scaleStable, setScaleStable] = useState<boolean>(false);

  // Photo state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

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
    // Check if weight or photos are required
    const needsWeight = shipment?.require_weight;
    const needsPhotos = shipment?.require_photos;

    // If manual click and needs weight/photo, open modal
    if (needsWeight || needsPhotos) {
      setSelectedPart(part);
      setModalStep(1);
      setIsModalOpen(true);
      return;
    }

    // Otherwise pack immediately
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

  // Pack part without modal (called from modal confirmation)
  const packPartDirectly = async (part: Part) => {
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
    console.log('Unpacking part:', part.sap_index);
    try {
      const { ipcRenderer } = window.require('electron');

      // Update part status back to 'pending' (use null instead of undefined for IPC)
      const result = await ipcRenderer.invoke('db:update-part', part.id, {
        status: 'pending',
        packed_at: null
      });

      console.log('Unpack result:', result);

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
        toast.error(`❌ Błąd cofania: ${result.error}`, {
          duration: 3000,
          position: 'top-right',
        });
      }
    } catch (error) {
      console.error('Error unpacking part:', error);
      toast.error(`❌ Błąd cofania pakowania`, {
        duration: 3000,
        position: 'top-right',
      });
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
  const onScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('Scanner input:', scanBuffer);
      handleScannerInput(scanBuffer);
      setScanBuffer('');
    }
  };

  // Keep focus on scanner input at all times
  useEffect(() => {
    const interval = setInterval(() => {
      if (scannerInputRef.current && document.activeElement !== scannerInputRef.current) {
        scannerInputRef.current.focus();
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Re-focus scanner input when modal closes
  useEffect(() => {
    if (!isModalOpen && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [isModalOpen]);

  // Poll scale readings when on weight step
  useEffect(() => {
    if (modalStep !== 2 || !isModalOpen) {
      return;
    }

    // Try to read from scale every 500ms
    const interval = setInterval(async () => {
      try {
        const { ipcRenderer } = window.require('electron');

        // Get immediate reading from scale
        const result = await ipcRenderer.invoke('scale:get-weight', true);

        if (result.success && result.data) {
          const reading = result.data;
          setWeightReading(reading.value);
          setScaleStable(reading.stable);
          setScaleConnected(true);
        } else {
          // Scale not connected or error
          setScaleConnected(false);
        }
      } catch (error) {
        console.error('Error reading scale:', error);
        setScaleConnected(false);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [modalStep, isModalOpen]);

  // Check scale connection on load
  useEffect(() => {
    const checkScaleConnection = async () => {
      try {
        const { ipcRenderer } = window.require('electron');

        // Load scale settings
        const settingsResult = await ipcRenderer.invoke('db:get-settings');
        if (settingsResult.success) {
          const settings = settingsResult.data;
          const comPort = settings.scale_com_port;
          const baudRate = parseInt(settings.scale_baud_rate || '9600');

          if (comPort) {
            // Try to connect to scale
            const connectResult = await ipcRenderer.invoke('scale:connect', comPort, baudRate);
            if (connectResult.success) {
              console.log('Scale connected:', comPort);
              setScaleConnected(true);
            }
          }
        }
      } catch (error) {
        console.error('Error checking scale connection:', error);
      }
    };

    checkScaleConnection();
  }, []);

  // Handle confirmation (rescan, Enter, or click)
  const handleConfirmPart = async () => {
    if (!selectedPart) return;

    // Check if weight or photos are required
    const needsWeight = shipment?.require_weight;
    const needsPhotos = shipment?.require_photos;

    // For now, just pack the part (we'll add weight/photo steps later)
    if (!needsWeight && !needsPhotos) {
      // Pack immediately
      await packPartDirectly(selectedPart);
      setIsModalOpen(false);
      setSelectedPart(null);
      setModalStep(1);
    } else {
      // Move to next step (weight or photo)
      if (needsWeight) {
        // Initialize weight with default quantity from part
        setWeightQuantity(selectedPart.quantity);
        setWeightReading(0); // TODO: Read from Radwag scale
        setCustomQuantity('');
        setModalStep(2); // Weight step
      } else if (needsPhotos) {
        setModalStep(3); // Photo step
      }
    }
  };

  // Handle weight confirmation
  const handleWeightConfirm = async () => {
    if (!selectedPart) return;

    // Calculate weight per unit
    const weightPerUnit = weightReading / weightQuantity;
    const weightTotal = weightReading;

    console.log('Weight data:', {
      part: selectedPart.sap_index,
      totalWeight: weightTotal,
      quantity: weightQuantity,
      weightPerUnit: weightPerUnit
    });

    // Save weight data to database
    try {
      const { ipcRenderer } = window.require('electron');

      const result = await ipcRenderer.invoke('db:update-part', selectedPart.id, {
        weight_total: weightTotal,
        weight_per_unit: weightPerUnit,
        weight_quantity: weightQuantity
      });

      if (!result.success) {
        console.error('Failed to save weight data:', result.error);
        toast.error(`❌ Błąd zapisu wagi: ${result.error}`, {
          duration: 3000,
          position: 'top-right',
        });
        return;
      }

      // Update local state with weight data
      setParts(prevParts =>
        prevParts.map(p =>
          p.id === selectedPart.id
            ? {
                ...p,
                weight_total: weightTotal,
                weight_per_unit: weightPerUnit,
                weight_quantity: weightQuantity
              }
            : p
        )
      );
    } catch (error) {
      console.error('Error saving weight data:', error);
      toast.error(`❌ Błąd zapisu wagi`, {
        duration: 3000,
        position: 'top-right',
      });
      return;
    }

    // Check if photos are required
    const needsPhotos = shipment?.require_photos;

    if (needsPhotos) {
      setModalStep(3); // Photo step
    } else {
      // Pack and close
      await packPartDirectly(selectedPart);
      setIsModalOpen(false);
      setSelectedPart(null);
      setModalStep(1);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPart(null);
    setModalStep(1);
    setScanBuffer('');
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false
      });

      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast.error('❌ Nie można uruchomić kamery', {
        duration: 3000,
        position: 'top-right',
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to JPEG data URL
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedPhoto(photoDataUrl);

      // Stop camera
      stopCamera();
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handlePhotoConfirm = async () => {
    if (!selectedPart || !capturedPhoto) return;

    setSavingPhoto(true);
    try {
      const { ipcRenderer } = window.require('electron');

      // Save photo to disk and database
      const result = await ipcRenderer.invoke('db:save-photo', selectedPart.id, capturedPhoto);

      if (!result.success) {
        console.error('Failed to save photo:', result.error);
        toast.error(`❌ Błąd zapisu zdjęcia: ${result.error}`, {
          duration: 3000,
          position: 'top-right',
        });
        setSavingPhoto(false);
        return;
      }

      toast.success('📸 Zdjęcie zapisane', {
        duration: 2000,
        position: 'top-right',
      });

      // Pack part and close modal
      await packPartDirectly(selectedPart);
      setIsModalOpen(false);
      setSelectedPart(null);
      setModalStep(1);
      setCapturedPhoto(null);
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error(`❌ Błąd zapisu zdjęcia`, {
        duration: 3000,
        position: 'top-right',
      });
    } finally {
      setSavingPhoto(false);
    }
  };

  // Start camera when modal opens on photo step
  useEffect(() => {
    if (modalStep === 3 && isModalOpen && !capturedPhoto) {
      startCamera();
    }

    return () => {
      if (modalStep !== 3) {
        stopCamera();
      }
    };
  }, [modalStep, isModalOpen]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Scale control functions
  const handleScaleZero = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('scale:zero');

      if (result.success) {
        toast.success('⚖️ Waga wyzerowana', {
          duration: 2000,
          position: 'top-right',
        });
      } else {
        toast.error('❌ Błąd zerowania wagi', {
          duration: 2000,
          position: 'top-right',
        });
      }
    } catch (error) {
      console.error('Error zeroing scale:', error);
    }
  };

  const handleScaleTare = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('scale:tare');

      if (result.success) {
        toast.success('⚖️ Tara ustawiona', {
          duration: 2000,
          position: 'top-right',
        });
      } else {
        toast.error('❌ Błąd ustawiania tary', {
          duration: 2000,
          position: 'top-right',
        });
      }
    } catch (error) {
      console.error('Error taring scale:', error);
    }
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
        onChange={(e) => {
          console.log('Scanner buffer:', e.target.value);
          setScanBuffer(e.target.value);
        }}
        onKeyDown={onScannerKeyDown}
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

            {/* Step 2: Weight */}
            {modalStep === 2 && selectedPart && (
              <div className="text-center">
                <h2 className="text-text-secondary text-lg mb-6">Ważenie:</h2>

                {/* Part info */}
                <div className="text-accent-primary font-bold text-4xl mb-8">
                  {selectedPart.sap_index}
                </div>

                {/* Weight reading - DUŻY */}
                <div className="bg-bg-tertiary rounded-2xl p-8 mb-6">
                  {/* Scale connection status */}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${scaleConnected ? 'bg-accent-success' : 'bg-accent-warning'}`}></div>
                    <p className="text-text-tertiary text-xs">
                      {scaleConnected ? 'Waga podłączona' : 'Tryb symulacji'}
                    </p>
                    {scaleConnected && (
                      <span className={`text-xs ${scaleStable ? 'text-accent-success' : 'text-accent-warning'}`}>
                        {scaleStable ? '✓ Stabilna' : '⚠ Niestabilna'}
                      </span>
                    )}
                  </div>

                  <p className="text-text-tertiary text-sm mb-2">Odczyt wagi:</p>
                  <div className={`font-bold text-7xl mb-2 ${scaleStable ? 'text-accent-success' : 'text-accent-warning'}`}>
                    {weightReading.toFixed(3)}
                  </div>
                  <p className="text-text-secondary text-2xl mb-4">kg</p>

                  {/* Scale controls */}
                  <div className="flex gap-2 justify-center mb-2">
                    {scaleConnected ? (
                      <>
                        <button
                          onClick={handleScaleZero}
                          className="px-4 py-2 bg-bg-primary text-text-secondary rounded hover:bg-opacity-80 font-semibold"
                        >
                          ⚖️ Zero
                        </button>
                        <button
                          onClick={handleScaleTare}
                          className="px-4 py-2 bg-bg-primary text-text-secondary rounded hover:bg-opacity-80 font-semibold"
                        >
                          ⚖️ Tara
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Simulator buttons when scale not connected */}
                        <button
                          onClick={() => setWeightReading(prev => prev + 0.1)}
                          className="px-3 py-1 bg-bg-primary text-text-secondary rounded text-sm hover:bg-opacity-80"
                        >
                          +0.1kg
                        </button>
                        <button
                          onClick={() => setWeightReading(prev => prev + 1)}
                          className="px-3 py-1 bg-bg-primary text-text-secondary rounded text-sm hover:bg-opacity-80"
                        >
                          +1kg
                        </button>
                        <button
                          onClick={() => setWeightReading(0)}
                          className="px-3 py-1 bg-bg-primary text-text-secondary rounded text-sm hover:bg-opacity-80"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                  {!scaleConnected && (
                    <p className="text-text-tertiary text-xs mt-2">
                      💡 Skonfiguruj wagę w ustawieniach aby włączyć automatyczne ważenie
                    </p>
                  )}
                </div>

                {/* Quantity selector */}
                <div className="mb-6">
                  <p className="text-text-secondary text-sm mb-3">Ważone sztuk:</p>
                  <div className="flex gap-3 justify-center mb-4">
                    <button
                      onClick={() => {
                        setWeightQuantity(selectedPart.quantity);
                        setCustomQuantity('');
                      }}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                        weightQuantity === selectedPart.quantity && !customQuantity
                          ? 'gradient-primary text-white'
                          : 'bg-bg-tertiary text-text-primary hover:bg-opacity-80'
                      }`}
                    >
                      {selectedPart.quantity} {selectedPart.unit} (z listy)
                    </button>
                    <button
                      onClick={() => {
                        setWeightQuantity(1);
                        setCustomQuantity('');
                      }}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                        weightQuantity === 1 && !customQuantity
                          ? 'gradient-primary text-white'
                          : 'bg-bg-tertiary text-text-primary hover:bg-opacity-80'
                      }`}
                    >
                      1 szt
                    </button>
                  </div>

                  {/* Custom quantity input */}
                  <div className="flex items-center justify-center gap-3">
                    <input
                      type="number"
                      value={customQuantity}
                      onChange={(e) => {
                        setCustomQuantity(e.target.value);
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          setWeightQuantity(val);
                        }
                      }}
                      placeholder="Inna ilość..."
                      className="px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none w-40 text-center"
                    />
                    <span className="text-text-secondary">{selectedPart.unit}</span>
                  </div>
                </div>

                {/* Weight per unit */}
                <div className="bg-bg-tertiary bg-opacity-50 rounded-lg p-4 mb-6">
                  <p className="text-text-tertiary text-sm mb-1">Waga za sztukę:</p>
                  <p className="text-text-primary text-2xl font-bold">
                    {weightQuantity > 0 ? (weightReading / weightQuantity).toFixed(4) : '0.0000'} kg
                  </p>
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
                    onClick={handleWeightConfirm}
                    className="flex-1 px-6 py-4 gradient-primary text-white rounded-lg hover:opacity-90 transition-all text-lg font-semibold"
                  >
                    ✓ Potwierdź wagę
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Photo */}
            {modalStep === 3 && selectedPart && (
              <div className="text-center">
                <h2 className="text-text-secondary text-lg mb-6">Zdjęcie:</h2>

                {/* Part info */}
                <div className="text-accent-primary font-bold text-4xl mb-8">
                  {selectedPart.sap_index}
                </div>

                {/* Camera or captured photo */}
                <div className="relative mb-6">
                  {!capturedPhoto ? (
                    // Live camera view
                    <div className="relative bg-black rounded-xl overflow-hidden" style={{ maxHeight: '400px' }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-auto"
                        style={{ maxHeight: '400px' }}
                      />
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <button
                          onClick={capturePhoto}
                          className="px-8 py-4 bg-white text-black rounded-full hover:bg-gray-200 transition-all font-bold text-lg shadow-lg"
                        >
                          📸 Zrób zdjęcie
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Captured photo preview
                    <div className="relative">
                      <img
                        src={capturedPhoto}
                        alt="Captured"
                        className="w-full h-auto rounded-xl"
                        style={{ maxHeight: '400px', objectFit: 'contain' }}
                      />
                    </div>
                  )}

                  {/* Hidden canvas for capturing */}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>

                {/* Action buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-4 bg-bg-tertiary hover:bg-opacity-80 text-text-primary rounded-lg transition-all text-lg font-semibold"
                  >
                    Anuluj
                  </button>
                  {capturedPhoto ? (
                    <>
                      <button
                        onClick={handleRetakePhoto}
                        className="flex-1 px-6 py-4 bg-accent-warning hover:opacity-90 text-white rounded-lg transition-all text-lg font-semibold"
                      >
                        🔄 Ponów
                      </button>
                      <button
                        onClick={handlePhotoConfirm}
                        disabled={savingPhoto}
                        className={`flex-1 px-6 py-4 gradient-primary text-white rounded-lg transition-all text-lg font-semibold ${
                          savingPhoto ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                        }`}
                      >
                        {savingPhoto ? '⏳ Zapisywanie...' : '✓ Potwierdź'}
                      </button>
                    </>
                  ) : null}
                </div>
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
                onClick={() => navigate('/settings')}
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
              <p className="text-text-tertiary text-sm mb-3 italic">💡 Kliknij produkt aby cofnąć pakowanie</p>
              <div className="space-y-2">
                {filteredPackedParts.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => handleUnpackPart(part)}
                    className="bg-bg-tertiary bg-opacity-60 rounded-lg p-4 hover:bg-opacity-80 hover:scale-[1.02] hover:border-2 hover:border-accent-warning transition-all cursor-pointer active:scale-[0.98] border-2 border-transparent"
                    title="Kliknij aby cofnąć pakowanie"
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
                      <CheckCircle2 className="w-8 h-8 text-accent-success group-hover:text-accent-warning transition-colors" />
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
