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
  Camera,
  X,
} from 'lucide-react';
import { Shipment } from '../types/shipment';
import { Part } from '../types/part';
import { useAudio } from '../hooks/useAudio';
import { useUser } from '../contexts/UserContext';

// Country list for quick selection (keyboard 1-9, 0)
const COUNTRIES = [
  { key: '1', name: 'Niemcy', nameEn: 'Germany' },
  { key: '2', name: 'Chiny', nameEn: 'China' },
  { key: '3', name: 'Stany Zjednoczone', nameEn: 'United States' },
  { key: '4', name: 'Meksyk', nameEn: 'Mexico' },
  { key: '5', name: 'Japonia', nameEn: 'Japan' },
  { key: '6', name: 'Korea Południowa', nameEn: 'South Korea' },
  { key: '7', name: 'Polska', nameEn: 'Poland' },
  { key: '8', name: 'Czechy', nameEn: 'Czech Republic' },
  { key: '9', name: 'Włochy', nameEn: 'Italy' },
  { key: '0', name: 'Francja', nameEn: 'France' },
];

const PackingScreen: React.FC = () => {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const navigate = useNavigate();
  const { playScanned, playPacked, playError, playCompleted, playProgress } = useAudio();
  const { currentUser } = useUser();

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
  const [modalStep, setModalStep] = useState<1 | 2 | 3 | 4 | 5>(1); // 1: confirm, 2: weight, 3: photo, 4: country, 5: serial numbers
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
  const [photosSavedCount, setPhotosSavedCount] = useState<number>(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Country of origin state
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const countryInputRef = React.useRef<HTMLInputElement>(null);

  // Serial number state
  const [serialNumbers, setSerialNumbers] = useState<Array<{ value: string; photoPath?: string }>>([]);
  const [currentSN, setCurrentSN] = useState<string>('');
  const [snPhotoPath, setSnPhotoPath] = useState<string | null>(null);

  // Photo viewer state
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<any[]>([]);
  const [viewingPart, setViewingPart] = useState<Part | null>(null);

  // Export menu state
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

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

  // Permission helper function
  const canModifyShipment = (): boolean => {
    if (!currentUser || !shipment) return false;
    // Admin can modify all shipments
    if (currentUser.role === 'admin') return true;
    // Regular user can only modify their own shipments
    return shipment.user_id === currentUser.id;
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
    // Check permissions
    if (!canModifyShipment()) {
      toast.error('Nie masz uprawnień do edycji tej wysyłki. Tylko właściciel lub administrator może to zrobić.');
      return;
    }

    // Check if weight, photos or country are required
    const needsWeight = shipment?.require_weight;
    const needsPhotos = shipment?.require_photos;
    const needsCountry = shipment?.require_country;
    const hasCountry = part.country_of_origin && part.country_of_origin.trim() !== '';

    // If manual click and needs weight/photo/country, open modal
    if (needsWeight || needsPhotos || (needsCountry && !hasCountry)) {
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

        // Play packed sound and voice
        playPacked(part.sap_index);

        // Show success toast
        toast.success(`✅ Spakowano ${part.sap_index}`, {
          duration: 3000,
          position: 'top-right',
        });

        // Check if this was the last part
        const remainingParts = parts.filter(p => p.id !== part.id && p.status === 'pending');
        if (remainingParts.length === 0) {
          // All parts packed - update shipment status to completed
          if (shipment) {
            const { ipcRenderer } = window.require('electron');
            const updateResult = await ipcRenderer.invoke('db:update-shipment', shipment.id, {
              status: 'completed',
              completed_at: Date.now()
            });

            if (updateResult.success) {
              setShipment({ ...shipment, status: 'completed', completed_at: Date.now() });
            }
          }

          // Show confetti!
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000); // Hide after 5 seconds
          playCompleted();

          // Send desktop notification
          try {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('notification:send',
              '🎉 Wysyłka zakończona!',
              `Wszystkie części zostały spakowane dla wysyłki ${shipment?.shipment_number || ''}`
            ).catch(console.error);
          } catch (error) {
            console.error('Notification error:', error);
          }

          toast.success('🎉 Wszystkie części spakowane!', {
            duration: 5000,
            position: 'top-center',
          });
        } else {
          // Check if we should announce progress (every 5 parts)
          const packedCount = parts.filter(p => p.status === 'packed').length + 1; // +1 for current part

          if (packedCount % 5 === 0 && remainingParts.length > 0) {
            playProgress(remainingParts.length);
          }
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
    // Check permissions
    if (!canModifyShipment()) {
      toast.error('Nie masz uprawnień do edycji tej wysyłki. Tylko właściciel lub administrator może to zrobić.');
      return;
    }

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

        // Play packed sound and voice
        playPacked(part.sap_index);

        // Show success toast
        toast.success(`✅ Spakowano ${part.sap_index}`, {
          duration: 3000,
          position: 'top-right',
        });

        // Check if this was the last part
        const remainingParts = parts.filter(p => p.id !== part.id && p.status === 'pending');
        if (remainingParts.length === 0) {
          // All parts packed - update shipment status to completed
          if (shipment) {
            const { ipcRenderer } = window.require('electron');
            const updateResult = await ipcRenderer.invoke('db:update-shipment', shipment.id, {
              status: 'completed',
              completed_at: Date.now()
            });

            if (updateResult.success) {
              setShipment({ ...shipment, status: 'completed', completed_at: Date.now() });
            }
          }

          // Show confetti!
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000); // Hide after 5 seconds
          playCompleted();

          // Send desktop notification
          try {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('notification:send',
              '🎉 Wysyłka zakończona!',
              `Wszystkie części zostały spakowane dla wysyłki ${shipment?.shipment_number || ''}`
            ).catch(console.error);
          } catch (error) {
            console.error('Notification error:', error);
          }

          toast.success('🎉 Wszystkie części spakowane!', {
            duration: 5000,
            position: 'top-center',
          });
        } else {
          // Check if we should announce progress (every 5 parts)
          const packedCount = parts.filter(p => p.status === 'packed').length + 1; // +1 for current part

          if (packedCount % 5 === 0 && remainingParts.length > 0) {
            playProgress(remainingParts.length);
          }
        }
      } else {
        console.error('Failed to update part:', result.error);
      }
    } catch (error) {
      console.error('Error packing part:', error);
    }
  };

  const handleUnpackPart = async (part: Part) => {
    // Check permissions
    if (!canModifyShipment()) {
      toast.error('Nie masz uprawnień do edycji tej wysyłki. Tylko właściciel lub administrator może to zrobić.');
      return;
    }

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

    // Play scan beep
    playScanned();

    // If modal is open and we scan the same part, confirm it
    if (isModalOpen && selectedPart && selectedPart.sap_index.toUpperCase() === trimmedCode) {
      handleConfirmPart();
      return;
    }

    // Search for part by SAP index
    const foundPart = parts.find(p => p.sap_index.toUpperCase() === trimmedCode);

    if (!foundPart) {
      // Not found - red toast + error sound/voice
      playError(`Produkt nie odnaleziony: ${trimmedCode}`);
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

  // Keep focus on scanner input, but allow other inputs to work
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Don't refocus if user clicked on an input or textarea
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }

      // Don't refocus if modal is open
      if (isModalOpen) {
        return;
      }

      // Refocus scanner input when clicking elsewhere
      if (scannerInputRef.current) {
        scannerInputRef.current.focus();
      }
    };

    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [isModalOpen]);

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

    // Check if weight, photos or country are required
    const needsWeight = shipment?.require_weight;
    const needsPhotos = shipment?.require_photos;
    const needsCountry = shipment?.require_country;
    const hasCountry = selectedPart.country_of_origin && selectedPart.country_of_origin.trim() !== '';

    // Check if serial numbers required
    const needsSerialNumbers = shipment?.require_serial_numbers;

    // If no special requirements, pack immediately
    if (!needsWeight && !needsPhotos && (!needsCountry || hasCountry) && !needsSerialNumbers) {
      await packPartDirectly(selectedPart);
      setIsModalOpen(false);
      setSelectedPart(null);
      setModalStep(1);
    } else {
      // Move to next step (weight, photo, country, or serial numbers)
      if (needsWeight) {
        // Initialize weight with default quantity from part
        setWeightQuantity(selectedPart.quantity);
        setWeightReading(0); // TODO: Read from Radwag scale
        setCustomQuantity('');
        setModalStep(2); // Weight step
      } else if (needsPhotos) {
        setModalStep(3); // Photo step
      } else if (needsCountry && !hasCountry) {
        setModalStep(4); // Country step
      } else if (needsSerialNumbers) {
        setModalStep(5); // Serial number step
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
      // Check if country is required
      const needsCountry = shipment?.require_country;
      const hasCountry = selectedPart.country_of_origin && selectedPart.country_of_origin.trim() !== '';

      if (needsCountry && !hasCountry) {
        setModalStep(4); // Country step
      } else {
        // Check if serial numbers are required
        const needsSerialNumbers = shipment?.require_serial_numbers;

        if (needsSerialNumbers) {
          setModalStep(5); // Serial number step
        } else {
          // Pack and close
          await packPartDirectly(selectedPart);
          setIsModalOpen(false);
          setSelectedPart(null);
          setModalStep(1);
        }
      }
    }
  };

  // Handle country selection
  const handleCountryConfirm = async (country?: string) => {
    if (!selectedPart) return;

    // Use provided country or current selectedCountry state
    const countryToSave = country !== undefined ? country : selectedCountry;

    // Save country to database (can be empty if skipped)
    try {
      const { ipcRenderer } = window.require('electron');

      const result = await ipcRenderer.invoke('db:update-part', selectedPart.id, {
        country_of_origin: countryToSave || null
      });

      if (!result.success) {
        toast.error(`❌ Błąd zapisu kraju pochodzenia`, {
          duration: 3000,
          position: 'top-right',
        });
        return;
      }

      if (countryToSave) {
        toast.success(`🌍 Kraj: ${countryToSave}`, {
          duration: 2000,
          position: 'top-right',
        });
      }

      // Update local state
      setParts(prevParts =>
        prevParts.map(p =>
          p.id === selectedPart.id
            ? { ...p, country_of_origin: countryToSave || null }
            : p
        )
      );

      // Check if serial numbers are required
      const needsSerialNumbers = shipment?.require_serial_numbers;

      if (needsSerialNumbers) {
        setModalStep(5); // Serial number step
        setSelectedCountry('');
      } else {
        // Pack and close
        await packPartDirectly(selectedPart);
        setIsModalOpen(false);
        setSelectedPart(null);
        setModalStep(1);
        setSelectedCountry('');
      }
    } catch (error) {
      console.error('Error saving country:', error);
      toast.error(`❌ Błąd zapisu kraju`, {
        duration: 3000,
        position: 'top-right',
      });
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPart(null);
    setModalStep(1);
    setScanBuffer('');
    setPhotosSavedCount(0);
    setCapturedPhoto(null);
    setSelectedCountry('');
    setSerialNumbers([]);
    setCurrentSN('');
    setSnPhotoPath(null);
  };

  // Handle serial number confirmation
  const handleSerialNumberConfirm = async () => {
    if (!selectedPart) return;

    // Save all serial numbers to database
    try {
      const { ipcRenderer } = window.require('electron');

      for (let i = 0; i < serialNumbers.length; i++) {
        const sn = serialNumbers[i];
        const result = await ipcRenderer.invoke('db:execute',
          `INSERT INTO serial_numbers (
            part_id, serial_number, photo_path, sequence,
            manually_entered, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            selectedPart.id,
            sn.value,
            sn.photoPath || null,
            i + 1,
            sn.photoPath ? 0 : 1, // manually_entered = true if no photo
            Date.now()
          ]
        );

        if (!result.success) {
          toast.error(`❌ Błąd zapisu numeru seryjnego`, {
            duration: 3000,
            position: 'top-right',
          });
          return;
        }
      }

      if (serialNumbers.length > 0) {
        toast.success(`🔢 Zapisano ${serialNumbers.length} ${serialNumbers.length === 1 ? 'numer seryjny' : 'numerów seryjnych'}`, {
          duration: 2000,
          position: 'top-right',
        });
      }

      // Pack and close
      await packPartDirectly(selectedPart);
      setIsModalOpen(false);
      setSelectedPart(null);
      setModalStep(1);
      setSerialNumbers([]);
      setCurrentSN('');
      setSnPhotoPath(null);
    } catch (error) {
      console.error('Error saving serial numbers:', error);
      toast.error(`❌ Błąd zapisu numerów seryjnych`, {
        duration: 3000,
        position: 'top-right',
      });
    }
  };

  // Add serial number to list
  const handleAddSerialNumber = () => {
    if (!currentSN.trim()) return;

    setSerialNumbers(prev => [...prev, { value: currentSN.trim(), photoPath: snPhotoPath || undefined }]);
    setCurrentSN('');
    setSnPhotoPath(null);

    toast.success(`✅ Dodano SN: ${currentSN.trim()}`, {
      duration: 1500,
      position: 'top-right',
    });
  };

  // Remove serial number from list
  const handleRemoveSerialNumber = (index: number) => {
    setSerialNumbers(prev => prev.filter((_, i) => i !== index));
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

  const handlePhotoConfirm = async (continueWithMore: boolean = false) => {
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

      // Increment saved photos counter
      const newCount = photosSavedCount + 1;
      setPhotosSavedCount(newCount);

      toast.success(`📸 Zdjęcie ${newCount} zapisane`, {
        duration: 2000,
        position: 'top-right',
      });

      if (continueWithMore) {
        // Clear captured photo and restart camera for next photo
        setCapturedPhoto(null);
        setSavingPhoto(false);
        startCamera();
      } else {
        // Check if we need country of origin step
        const needsCountry = shipment?.require_country;
        const hasCountry = selectedPart.country_of_origin && selectedPart.country_of_origin.trim() !== '';

        if (needsCountry && !hasCountry) {
          // Move to country selection step
          setModalStep(4);
        } else {
          // Check if we need serial numbers step
          const needsSerialNumbers = shipment?.require_serial_numbers;

          if (needsSerialNumbers) {
            // Move to serial number step
            setModalStep(5);
          } else {
            // Pack part and close modal
            await packPartDirectly(selectedPart);
            setIsModalOpen(false);
            setSelectedPart(null);
            setModalStep(1);
            setCapturedPhoto(null);
            setPhotosSavedCount(0);
          }
        }
      }
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error(`❌ Błąd zapisu zdjęcia`, {
        duration: 3000,
        position: 'top-right',
      });
    } finally {
      if (!continueWithMore) {
        setSavingPhoto(false);
      }
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

  // Handle keyboard shortcuts for country selection (Step 4)
  useEffect(() => {
    if (modalStep !== 4 || !isModalOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if user is typing in the country input field
      if (document.activeElement === countryInputRef.current) {
        return; // Don't handle shortcuts when typing
      }

      const country = COUNTRIES.find(c => c.key === e.key);
      if (country) {
        e.preventDefault();
        handleCountryConfirm(country.name);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [modalStep, isModalOpen, selectedPart]);

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

  // Photo viewer functions
  const handleViewPhotos = async (part: Part, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent unpacking when clicking camera icon

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:get-photos', part.id);

      if (result.success) {
        setViewerPhotos(result.data);
        setViewingPart(part);
        setPhotoViewerOpen(true);

        if (result.data.length === 0) {
          toast('📷 Brak zdjęć dla tego produktu', {
            duration: 2000,
            position: 'top-center',
          });
        }
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error('❌ Błąd ładowania zdjęć');
    }
  };

  const handleClosePhotoViewer = () => {
    setPhotoViewerOpen(false);
    setViewerPhotos([]);
    setViewingPart(null);
  };

  // Export functions
  const handleExportExcel = async () => {
    if (!shipmentId) return;

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('file:export-excel', parseInt(shipmentId));

      if (result.success) {
        toast.success('📊 Raport Excel wygenerowany!', {
          duration: 3000,
          position: 'top-right',
        });
      } else {
        toast.error(`❌ Błąd eksportu: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('❌ Błąd eksportu');
    }
  };

  const handleExportHTML = async () => {
    if (!shipmentId) return;

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('file:export-html', parseInt(shipmentId));

      if (result.success) {
        toast.success('📄 Raport HTML wygenerowany!', {
          duration: 3000,
          position: 'top-right',
        });
      } else {
        toast.error(`❌ Błąd eksportu: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('❌ Błąd eksportu');
    }
  };

  const handleExportAll = async () => {
    if (!shipmentId) return;

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('file:export-all', parseInt(shipmentId));

      if (result.success) {
        toast.success('📦 Wszystkie raporty wygenerowane!', {
          duration: 3000,
          position: 'top-right',
        });
      } else {
        toast.error(`❌ Błąd eksportu: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('❌ Błąd eksportu');
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
                <p className="text-text-secondary text-xl mb-4">
                  {selectedPart.description}
                </p>

                {/* Order information - if available */}
                {selectedPart.order_number && (
                  <div className="bg-bg-tertiary rounded-lg p-4 mb-6">
                    <p className="text-text-tertiary text-sm mb-1">Zlecenie:</p>
                    <p className="text-accent-primary text-lg font-semibold">
                      {selectedPart.order_number}
                      {selectedPart.order_description && (
                        <span className="text-text-secondary text-base font-normal ml-2">
                          ({selectedPart.order_description})
                        </span>
                      )}
                    </p>
                  </div>
                )}

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
                <h2 className="text-text-secondary text-lg mb-4">Zdjęcie:</h2>

                {/* Part info */}
                <div className="text-accent-primary font-bold text-4xl mb-2">
                  {selectedPart.sap_index}
                </div>

                {/* Photo counter */}
                {photosSavedCount > 0 && (
                  <div className="mb-6 px-4 py-2 bg-accent-success/10 border border-accent-success/30 rounded-lg inline-block">
                    <p className="text-accent-success text-sm font-semibold">
                      ✓ Zapisano zdjęć: {photosSavedCount}
                    </p>
                  </div>
                )}

                {photosSavedCount === 0 && <div className="mb-8"></div>}

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
                <div className="flex flex-col gap-3">
                  {capturedPhoto ? (
                    <>
                      {/* Primary action buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handlePhotoConfirm(true)}
                          disabled={savingPhoto}
                          className={`flex-1 px-6 py-4 bg-accent-secondary/20 hover:bg-accent-secondary/30 text-accent-secondary rounded-lg transition-all text-lg font-semibold flex items-center justify-center gap-2 ${
                            savingPhoto ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title="Zapisz zdjęcie i zrób kolejne"
                        >
                          📸 Kolejne
                        </button>
                        <button
                          onClick={() => handlePhotoConfirm(false)}
                          disabled={savingPhoto}
                          className={`flex-1 px-6 py-4 gradient-primary text-white rounded-lg transition-all text-lg font-semibold ${
                            savingPhoto ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                          }`}
                        >
                          {savingPhoto ? '⏳ Zapisywanie...' : '✓ Potwierdź'}
                        </button>
                      </div>

                      {/* Secondary action buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={handleRetakePhoto}
                          disabled={savingPhoto}
                          className="flex-1 px-6 py-3 bg-accent-warning/20 hover:bg-accent-warning/30 text-accent-warning rounded-lg transition-all font-semibold"
                        >
                          🔄 Nowe zdjęcie
                        </button>
                        <button
                          onClick={handleCloseModal}
                          disabled={savingPhoto}
                          className="flex-1 px-6 py-3 bg-bg-tertiary hover:bg-opacity-80 text-text-primary rounded-lg transition-all font-semibold"
                        >
                          ✕ Anuluj
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={handleCloseModal}
                      className="w-full px-6 py-4 bg-bg-tertiary hover:bg-opacity-80 text-text-primary rounded-lg transition-all text-lg font-semibold"
                    >
                      ✕ Anuluj
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Country of Origin */}
            {modalStep === 4 && selectedPart && (
              <div className="text-center">
                <h2 className="text-text-secondary text-lg mb-4">Kraj pochodzenia:</h2>

                {/* Part info */}
                <div className="text-accent-primary font-bold text-4xl mb-8">
                  {selectedPart.sap_index}
                </div>

                {/* Country selection grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {COUNTRIES.map(country => (
                    <button
                      key={country.key}
                      onClick={() => handleCountryConfirm(country.name)}
                      className="px-6 py-4 bg-accent-secondary/20 hover:bg-accent-secondary/30 text-accent-secondary rounded-lg transition-all font-semibold text-lg flex items-center justify-between group"
                    >
                      <span className="text-text-tertiary group-hover:text-accent-secondary transition-colors font-bold">
                        {country.key}
                      </span>
                      <span>{country.name}</span>
                    </button>
                  ))}
                </div>

                {/* Custom country input */}
                <div className="mb-6">
                  <label className="block text-text-primary text-sm font-medium mb-2 text-left">
                    Inny kraj (wpisz ręcznie):
                  </label>
                  <input
                    ref={countryInputRef}
                    type="text"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedCountry.trim()) {
                        handleCountryConfirm();
                      }
                    }}
                    onClick={() => countryInputRef.current?.focus()}
                    placeholder="Wpisz nazwę kraju... (lub kliknij aby wpisać)"
                    className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-3 bg-bg-tertiary hover:bg-opacity-80 text-text-primary rounded-lg transition-all font-semibold"
                  >
                    ✕ Anuluj
                  </button>
                  <button
                    onClick={() => handleCountryConfirm('')}
                    className="flex-1 px-6 py-3 bg-accent-warning/20 hover:bg-accent-warning/30 text-accent-warning rounded-lg transition-all font-semibold"
                  >
                    ⏭️ Pomiń
                  </button>
                  {selectedCountry && (
                    <button
                      onClick={() => handleCountryConfirm()}
                      className="flex-1 px-6 py-3 gradient-primary text-white rounded-lg hover:opacity-90 transition-all font-semibold"
                    >
                      ✓ Potwierdź
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Serial Numbers */}
            {modalStep === 5 && selectedPart && (
              <div className="text-center">
                <h2 className="text-text-secondary text-lg mb-4">Numery Seryjne:</h2>

                {/* Part info */}
                <div className="text-accent-primary font-bold text-4xl mb-8">
                  {selectedPart.sap_index}
                </div>

                {/* Serial numbers list */}
                {serialNumbers.length > 0 && (
                  <div className="mb-6 bg-bg-tertiary rounded-lg p-4">
                    <h3 className="text-text-primary text-sm font-semibold mb-3 text-left">
                      Zapisane numery ({serialNumbers.length}):
                    </h3>
                    <div className="space-y-2">
                      {serialNumbers.map((sn, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-bg-secondary rounded p-3 group"
                        >
                          <span className="text-text-primary font-mono">
                            {index + 1}. {sn.value}
                            {sn.photoPath && <span className="text-accent-success ml-2">📷</span>}
                          </span>
                          <button
                            onClick={() => handleRemoveSerialNumber(index)}
                            className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual input */}
                <div className="mb-6">
                  <label className="block text-text-primary text-sm font-medium mb-2 text-left">
                    Wpisz numer seryjny:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentSN}
                      onChange={(e) => setCurrentSN(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && currentSN.trim()) {
                          handleAddSerialNumber();
                        }
                      }}
                      placeholder="Numer seryjny..."
                      className="flex-1 px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none transition-colors font-mono"
                      autoFocus
                    />
                    <button
                      onClick={handleAddSerialNumber}
                      disabled={!currentSN.trim()}
                      className="px-6 py-3 gradient-primary text-white rounded-lg hover:opacity-90 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      + Dodaj
                    </button>
                  </div>
                  <p className="text-text-tertiary text-xs mt-2 text-left">
                    Możesz dodać wiele numerów seryjnych. Naciśnij Enter aby dodać.
                  </p>
                </div>

                {/* OCR placeholder info */}
                <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-400 text-sm">
                    💡 <strong>Przyszła funkcja:</strong> OCR automatycznie rozpozna numery ze zdjęć
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-3 bg-bg-tertiary hover:bg-opacity-80 text-text-primary rounded-lg transition-all font-semibold"
                  >
                    ✕ Anuluj
                  </button>
                  <button
                    onClick={handleSerialNumberConfirm}
                    className="flex-2 px-8 py-3 gradient-success text-white rounded-lg hover:opacity-90 transition-all font-semibold text-lg"
                  >
                    ✓ Zakończ ({serialNumbers.length} SN)
                  </button>
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

      {/* Photo Viewer Modal */}
      {photoViewerOpen && viewingPart && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 animate-fade-in"
          onClick={handleClosePhotoViewer}
        >
          <div
            className="bg-bg-secondary rounded-2xl p-8 max-w-5xl w-full mx-4 max-h-[90vh] overflow-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-text-primary text-2xl font-bold mb-2">
                  📸 Zdjęcia: {viewingPart.sap_index}
                </h2>
                <p className="text-text-secondary text-sm">{viewingPart.description}</p>
              </div>
              <button
                onClick={handleClosePhotoViewer}
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-text-primary" />
              </button>
            </div>

            {/* Photos Grid */}
            {viewerPhotos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {viewerPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="bg-bg-tertiary rounded-xl overflow-hidden hover:ring-2 hover:ring-accent-primary transition-all"
                  >
                    <img
                      src={`file://${photo.photo_path}`}
                      alt={`Photo ${photo.id}`}
                      className="w-full h-64 object-cover"
                    />
                    <div className="p-3">
                      <p className="text-text-tertiary text-xs">
                        {new Date(photo.created_at).toLocaleString('pl-PL')}
                      </p>
                      <p className="text-text-tertiary text-xs">
                        {(photo.file_size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Camera className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                <p className="text-text-secondary text-lg">Brak zdjęć dla tego produktu</p>
              </div>
            )}
          </div>
        </div>
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
              <div className="relative">
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
                  title="Raport"
                >
                  <FileText className="w-5 h-5 text-text-secondary" />
                </button>

                {exportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-bg-secondary border border-bg-tertiary rounded-lg shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        handleExportExcel();
                        setExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-bg-tertiary transition-colors flex items-center gap-3"
                    >
                      <span className="text-xl">📊</span>
                      <div>
                        <div className="text-text-primary font-semibold">Excel</div>
                        <div className="text-text-tertiary text-xs">Z wagami jednostkowymi</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleExportHTML();
                        setExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-bg-tertiary transition-colors flex items-center gap-3"
                    >
                      <span className="text-xl">📄</span>
                      <div>
                        <div className="text-text-primary font-semibold">HTML</div>
                        <div className="text-text-tertiary text-xs">Interaktywny raport</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleExportAll();
                        setExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-bg-tertiary transition-colors flex items-center gap-3 border-t border-bg-tertiary"
                    >
                      <span className="text-xl">📦</span>
                      <div>
                        <div className="text-text-primary font-semibold">Wszystkie</div>
                        <div className="text-text-tertiary text-xs">Excel + HTML</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
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
            className="w-full pl-12 pr-4 py-4 bg-bg-tertiary text-text-primary text-lg rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Requirements badges */}
        {(shipment.require_weight || shipment.require_country || shipment.require_photos) && (
          <div className="flex items-center gap-3 mt-4 p-3 bg-bg-tertiary rounded-lg">
            <span className="text-text-primary text-sm font-semibold">Wymagane dane:</span>
            {shipment.require_weight && (
              <span className="px-4 py-2 bg-accent-primary text-white text-sm font-semibold rounded-lg border border-accent-primary border-opacity-50 flex items-center gap-2 shadow-sm">
                <span className="text-lg">⚖️</span>
                <span>Waga</span>
              </span>
            )}
            {shipment.require_country && (
              <span className="px-4 py-2 bg-accent-secondary text-white text-sm font-semibold rounded-lg border border-accent-secondary border-opacity-50 flex items-center gap-2 shadow-sm">
                <span className="text-lg">🌍</span>
                <span>Kraj pochodzenia</span>
              </span>
            )}
            {shipment.require_photos && (
              <span className="px-4 py-2 bg-accent-warning text-white text-sm font-semibold rounded-lg border border-accent-warning border-opacity-50 flex items-center gap-2 shadow-sm">
                <span className="text-lg">📷</span>
                <span>Zdjęcia</span>
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
                      <div className="flex items-center gap-2">
                        {shipment?.require_photos && (
                          <button
                            onClick={(e) => handleViewPhotos(part, e)}
                            className="p-2 hover:bg-accent-primary hover:bg-opacity-20 rounded-lg transition-all"
                            title="Pokaż zdjęcia"
                          >
                            <Camera className="w-6 h-6 text-accent-primary" />
                          </button>
                        )}
                        <CheckCircle2 className="w-8 h-8 text-accent-success group-hover:text-accent-warning transition-colors" />
                      </div>
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
