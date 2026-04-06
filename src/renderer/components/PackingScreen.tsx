import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import toast, { Toaster } from 'react-hot-toast';
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
  const [modalStep, setModalStep] = useState<1 | 2 | 3 | 4>(1); // 1: confirm, 2: weight, 3: photo, 4: country
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

    // Check if weight, photos or country are required
    const needsWeight = shipment?.require_weight;
    const needsPhotos = shipment?.require_photos;
    const needsCountry = shipment?.require_country;
    const hasCountry = selectedPart.country_of_origin && selectedPart.country_of_origin.trim() !== '';

    // If no special requirements, pack immediately
    if (!needsWeight && !needsPhotos && (!needsCountry || hasCountry)) {
      await packPartDirectly(selectedPart);
      setIsModalOpen(false);
      setSelectedPart(null);
      setModalStep(1);
    } else {
      // Move to next step (weight, photo, or country)
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
        // Pack and close
        await packPartDirectly(selectedPart);
        setIsModalOpen(false);
        setSelectedPart(null);
        setModalStep(1);
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

      // Pack and close
      await packPartDirectly(selectedPart);
      setIsModalOpen(false);
      setSelectedPart(null);
      setModalStep(1);
      setSelectedCountry('');
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
          // Pack part and close modal
          await packPartDirectly(selectedPart);
          setIsModalOpen(false);
          setSelectedPart(null);
          setModalStep(1);
          setCapturedPhoto(null);
          setPhotosSavedCount(0);
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-surface-container"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500 ease-out"
        />
      </svg>
    );
  };

  if (loading || !shipment) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-surface">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-on-surface-variant text-lg">Ładowanie wysyłki...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-surface">
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
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--md-surface-container-high)',
            color: 'var(--md-on-surface)',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: 'var(--md-primary)',
              secondary: 'var(--md-on-primary)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--md-error)',
              secondary: 'var(--md-on-error)',
            },
          },
        }}
      />

      {/* Scan Confirmation Modal */}
      {isModalOpen && selectedPart && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={handleCloseModal}
        >
          <div
            className="glass-panel rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress Stepper */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className={`flex items-center gap-2 ${modalStep >= 1 ? 'text-primary' : 'text-on-surface-variant'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${modalStep >= 1 ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                  <span className="material-symbols-outlined text-xl">
                    {modalStep > 1 ? 'check' : 'check_circle'}
                  </span>
                </div>
                <span className="text-sm font-semibold">Potwierdzenie</span>
              </div>

              {shipment?.require_weight && (
                <>
                  <div className={`flex-1 h-1 rounded-full ${modalStep >= 2 ? 'bg-primary' : 'bg-surface-container'}`}></div>
                  <div className={`flex items-center gap-2 ${modalStep >= 2 ? 'text-primary' : 'text-on-surface-variant'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${modalStep >= 2 ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined text-xl">
                        {modalStep > 2 ? 'check' : 'scale'}
                      </span>
                    </div>
                    <span className="text-sm font-semibold">Waga</span>
                  </div>
                </>
              )}

              {shipment?.require_photos && (
                <>
                  <div className={`flex-1 h-1 rounded-full ${modalStep >= 3 ? 'bg-primary' : 'bg-surface-container'}`}></div>
                  <div className={`flex items-center gap-2 ${modalStep >= 3 ? 'text-primary' : 'text-on-surface-variant'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${modalStep >= 3 ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined text-xl">
                        {modalStep > 3 ? 'check' : 'photo_camera'}
                      </span>
                    </div>
                    <span className="text-sm font-semibold">Zdjęcie</span>
                  </div>
                </>
              )}
            </div>

            {/* Step 1: Confirmation */}
            {modalStep === 1 && (
              <div className="text-center">
                <h2 className="text-on-surface-variant text-lg mb-6">Odnaleziono produkt:</h2>

                {/* SAP Index - DUŻY */}
                <div className="text-primary font-headline text-6xl mb-6 tracking-wide">
                  {selectedPart.sap_index}
                </div>

                {/* Description */}
                <p className="text-on-surface text-xl mb-8">
                  {selectedPart.description}
                </p>

                {/* Quantity - DUŻY */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  <span className="text-on-surface font-headline text-5xl">
                    {selectedPart.quantity}
                  </span>
                  <span className="text-on-surface-variant text-3xl">
                    {selectedPart.unit}
                  </span>
                </div>

                {/* Confirmation instructions */}
                <div className="bg-surface-container-high rounded-2xl p-6 mb-8">
                  <p className="text-on-surface text-lg mb-4 font-semibold">Potwierdź ilość:</p>
                  <div className="flex items-center justify-center gap-6 text-sm text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">qr_code_scanner</span>
                      <span>Zeskanuj ponownie</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">keyboard_return</span>
                      <span>Naciśnij Enter</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl transition-all text-lg font-semibold"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleConfirmPart}
                    onKeyPress={(e) => e.key === 'Enter' && handleConfirmPart()}
                    className="flex-1 px-6 py-4 primary-gradient text-on-primary rounded-xl hover:shadow-glow transition-all text-lg font-semibold"
                    autoFocus
                  >
                    Potwierdź
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Weight */}
            {modalStep === 2 && selectedPart && (
              <div className="text-center">
                <h2 className="text-on-surface-variant text-lg mb-6">Ważenie:</h2>

                {/* Part info */}
                <div className="text-primary font-headline text-4xl mb-8">
                  {selectedPart.sap_index}
                </div>

                {/* Weight reading - DUŻY */}
                <div className="bg-surface-container-high rounded-3xl p-8 mb-6">
                  {/* Scale connection status */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${scaleConnected ? 'bg-primary' : 'bg-tertiary'}`}></div>
                    <p className="text-on-surface-variant text-xs">
                      {scaleConnected ? 'Waga podłączona' : 'Tryb symulacji'}
                    </p>
                    {scaleConnected && (
                      <span className={`text-xs flex items-center gap-1 ${scaleStable ? 'text-primary' : 'text-tertiary'}`}>
                        <span className="material-symbols-outlined text-sm">
                          {scaleStable ? 'check_circle' : 'pending'}
                        </span>
                        {scaleStable ? 'Stabilna' : 'Niestabilna'}
                      </span>
                    )}
                  </div>

                  <p className="text-on-surface-variant text-sm mb-2">Odczyt wagi:</p>
                  <div className={`font-headline text-7xl mb-2 ${scaleStable ? 'text-primary' : 'text-tertiary'}`}>
                    {weightReading.toFixed(3)}
                  </div>
                  <p className="text-on-surface text-2xl mb-4">kg</p>

                  {/* Scale controls */}
                  <div className="flex gap-2 justify-center mb-2">
                    {scaleConnected ? (
                      <>
                        <button
                          onClick={handleScaleZero}
                          className="px-4 py-2 bg-surface-container text-on-surface rounded-xl hover:bg-surface-container-highest transition-all font-semibold flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-lg">restart_alt</span>
                          Zero
                        </button>
                        <button
                          onClick={handleScaleTare}
                          className="px-4 py-2 bg-surface-container text-on-surface rounded-xl hover:bg-surface-container-highest transition-all font-semibold flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-lg">scale</span>
                          Tara
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setWeightReading(prev => prev + 0.1)}
                          className="px-3 py-1 bg-surface-container text-on-surface rounded-lg text-sm hover:bg-surface-container-highest transition-all"
                        >
                          +0.1kg
                        </button>
                        <button
                          onClick={() => setWeightReading(prev => prev + 1)}
                          className="px-3 py-1 bg-surface-container text-on-surface rounded-lg text-sm hover:bg-surface-container-highest transition-all"
                        >
                          +1kg
                        </button>
                        <button
                          onClick={() => setWeightReading(0)}
                          className="px-3 py-1 bg-surface-container text-on-surface rounded-lg text-sm hover:bg-surface-container-highest transition-all"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                  {!scaleConnected && (
                    <p className="text-on-surface-variant text-xs mt-2 flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      Skonfiguruj wagę w ustawieniach
                    </p>
                  )}
                </div>

                {/* Quantity selector */}
                <div className="mb-6">
                  <p className="text-on-surface text-sm mb-3 font-semibold">Ważone sztuk:</p>
                  <div className="flex gap-3 justify-center mb-4">
                    <button
                      onClick={() => {
                        setWeightQuantity(selectedPart.quantity);
                        setCustomQuantity('');
                      }}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        weightQuantity === selectedPart.quantity && !customQuantity
                          ? 'primary-gradient text-on-primary shadow-glow'
                          : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                      }`}
                    >
                      <span className="font-headline">{selectedPart.quantity}</span> {selectedPart.unit}
                    </button>
                    <button
                      onClick={() => {
                        setWeightQuantity(1);
                        setCustomQuantity('');
                      }}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        weightQuantity === 1 && !customQuantity
                          ? 'primary-gradient text-on-primary shadow-glow'
                          : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                      }`}
                    >
                      <span className="font-headline">1</span> szt
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
                      className="px-4 py-3 bg-surface-container text-on-surface rounded-xl focus:ring-2 focus:ring-primary focus:outline-none w-40 text-center font-headline"
                    />
                    <span className="text-on-surface-variant">{selectedPart.unit}</span>
                  </div>
                </div>

                {/* Weight per unit */}
                <div className="bg-surface-container rounded-2xl p-4 mb-6">
                  <p className="text-on-surface-variant text-sm mb-1">Waga za sztukę:</p>
                  <p className="text-on-surface text-2xl font-headline">
                    {weightQuantity > 0 ? (weightReading / weightQuantity).toFixed(4) : '0.0000'} kg
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl transition-all text-lg font-semibold"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleWeightConfirm}
                    className="flex-1 px-6 py-4 primary-gradient text-on-primary rounded-xl hover:shadow-glow transition-all text-lg font-semibold"
                  >
                    Potwierdź wagę
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Photo */}
            {modalStep === 3 && selectedPart && (
              <div className="text-center">
                <h2 className="text-on-surface-variant text-lg mb-4">Zdjęcie:</h2>

                {/* Part info */}
                <div className="text-primary font-headline text-4xl mb-2">
                  {selectedPart.sap_index}
                </div>

                {/* Photo counter */}
                {photosSavedCount > 0 && (
                  <div className="mb-6 px-4 py-2 bg-primary/10 rounded-xl inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                    <p className="text-primary text-sm font-semibold">
                      Zapisano zdjęć: <span className="font-headline">{photosSavedCount}</span>
                    </p>
                  </div>
                )}

                {photosSavedCount === 0 && <div className="mb-8"></div>}

                {/* Camera or captured photo */}
                <div className="relative mb-6">
                  {!capturedPhoto ? (
                    // Live camera view
                    <div className="relative bg-black rounded-2xl overflow-hidden" style={{ maxHeight: '400px' }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-auto"
                        style={{ maxHeight: '400px' }}
                      />
                      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                        <button
                          onClick={capturePhoto}
                          className="px-8 py-4 bg-white text-black rounded-full hover:shadow-2xl transition-all font-bold text-lg shadow-xl flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined">photo_camera</span>
                          Zrób zdjęcie
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Captured photo preview
                    <div className="relative">
                      <img
                        src={capturedPhoto}
                        alt="Captured"
                        className="w-full h-auto rounded-2xl"
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
                          className={`flex-1 px-6 py-4 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-xl transition-all text-lg font-semibold flex items-center justify-center gap-2 ${
                            savingPhoto ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title="Zapisz zdjęcie i zrób kolejne"
                        >
                          <span className="material-symbols-outlined">add_a_photo</span>
                          Kolejne
                        </button>
                        <button
                          onClick={() => handlePhotoConfirm(false)}
                          disabled={savingPhoto}
                          className={`flex-1 px-6 py-4 primary-gradient text-on-primary rounded-xl transition-all text-lg font-semibold ${
                            savingPhoto ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-glow'
                          }`}
                        >
                          {savingPhoto ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="material-symbols-outlined animate-spin">progress_activity</span>
                              Zapisywanie...
                            </span>
                          ) : (
                            'Potwierdź'
                          )}
                        </button>
                      </div>

                      {/* Secondary action buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={handleRetakePhoto}
                          disabled={savingPhoto}
                          className="flex-1 px-6 py-3 bg-tertiary/20 hover:bg-tertiary/30 text-tertiary rounded-xl transition-all font-semibold flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined">refresh</span>
                          Nowe zdjęcie
                        </button>
                        <button
                          onClick={handleCloseModal}
                          disabled={savingPhoto}
                          className="flex-1 px-6 py-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl transition-all font-semibold"
                        >
                          Anuluj
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={handleCloseModal}
                      className="w-full px-6 py-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl transition-all text-lg font-semibold"
                    >
                      Anuluj
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Country of Origin */}
            {modalStep === 4 && selectedPart && (
              <div className="text-center">
                <h2 className="text-on-surface-variant text-lg mb-4">Kraj pochodzenia:</h2>

                {/* Part info */}
                <div className="text-primary font-headline text-4xl mb-8">
                  {selectedPart.sap_index}
                </div>

                {/* Country selection grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {COUNTRIES.map(country => (
                    <button
                      key={country.key}
                      onClick={() => handleCountryConfirm(country.name)}
                      className="px-6 py-4 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-xl transition-all font-semibold text-lg flex items-center justify-between group"
                    >
                      <span className="text-on-surface-variant group-hover:text-secondary transition-colors font-headline text-xl">
                        {country.key}
                      </span>
                      <span>{country.name}</span>
                    </button>
                  ))}
                </div>

                {/* Custom country input */}
                <div className="mb-6">
                  <label className="block text-on-surface text-sm font-medium mb-2 text-left">
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
                    placeholder="Wpisz nazwę kraju..."
                    className="w-full px-4 py-3 bg-surface-container text-on-surface rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl transition-all font-semibold"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={() => handleCountryConfirm('')}
                    className="flex-1 px-6 py-3 bg-tertiary/20 hover:bg-tertiary/30 text-tertiary rounded-xl transition-all font-semibold flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">skip_next</span>
                    Pomiń
                  </button>
                  {selectedCountry && (
                    <button
                      onClick={() => handleCountryConfirm()}
                      className="flex-1 px-6 py-3 primary-gradient text-on-primary rounded-xl hover:shadow-glow transition-all font-semibold"
                    >
                      Potwierdź
                    </button>
                  )}
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
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={handleClosePhotoViewer}
        >
          <div
            className="glass-panel rounded-3xl p-8 max-w-5xl w-full mx-4 max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-on-surface text-2xl font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">photo_library</span>
                  Zdjęcia: <span className="font-headline">{viewingPart.sap_index}</span>
                </h2>
                <p className="text-on-surface-variant text-sm">{viewingPart.description}</p>
              </div>
              <button
                onClick={handleClosePhotoViewer}
                className="p-2 hover:bg-surface-container-high rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface">close</span>
              </button>
            </div>

            {/* Photos Grid */}
            {viewerPhotos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {viewerPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="bg-surface-container rounded-2xl overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  >
                    <img
                      src={`file://${photo.photo_path}`}
                      alt={`Photo ${photo.id}`}
                      className="w-full h-64 object-cover"
                    />
                    <div className="p-3">
                      <p className="text-on-surface-variant text-xs">
                        {new Date(photo.created_at).toLocaleString('pl-PL')}
                      </p>
                      <p className="text-on-surface-variant text-xs font-headline">
                        {(photo.file_size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-on-surface-variant mx-auto mb-4 text-6xl">photo_camera</span>
                <p className="text-on-surface-variant text-lg">Brak zdjęć dla tego produktu</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 bg-surface-container px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-3 hover:bg-surface-container-high rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface">arrow_back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-on-surface font-headline">
                {shipment.shipment_number}
              </h1>
              <p className="text-on-surface-variant text-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-base">location_on</span>
                {shipment.destination}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Timer */}
            <div className="text-right">
              <p className="text-on-surface-variant text-xs mb-1">Czas sesji</p>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                <span className="text-on-surface font-headline text-lg">
                  {formatTime(elapsedTime)}
                </span>
              </div>
            </div>

            {/* Progress */}
            <div className="text-right">
              <p className="text-on-surface-variant text-xs mb-1">Postęp</p>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className={`h-full primary-gradient transition-all duration-300 ${progress === 100 ? 'shadow-glow' : ''}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-on-surface font-headline text-sm">
                  {packedParts.length}/{parts.length}
                </span>
              </div>
            </div>

            {/* Circular progress */}
            <div className="relative">
              <CircularProgress percent={progress} size={70} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-on-surface font-headline text-lg leading-none">
                  {Math.round(progress)}%
                </span>
                <span className="text-on-surface-variant text-xs mt-0.5 font-headline">
                  {packedParts.length}/{parts.length}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                className="p-3 hover:bg-surface-container-high rounded-xl transition-colors"
                title="Zapisz"
              >
                <span className="material-symbols-outlined text-on-surface-variant">save</span>
              </button>
              <button
                className="p-3 hover:bg-surface-container-high rounded-xl transition-colors"
                title="Wstrzymaj"
              >
                <span className="material-symbols-outlined text-on-surface-variant">pause</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="p-3 hover:bg-surface-container-high rounded-xl transition-colors"
                  title="Raport"
                >
                  <span className="material-symbols-outlined text-on-surface-variant">description</span>
                </button>

                {exportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-surface-container-high rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        handleExportExcel();
                        setExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-surface-container-highest transition-colors flex items-center gap-3"
                    >
                      <span className="material-symbols-outlined text-primary text-2xl">table_chart</span>
                      <div>
                        <div className="text-on-surface font-semibold">Excel</div>
                        <div className="text-on-surface-variant text-xs">Z wagami jednostkowymi</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleExportHTML();
                        setExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-surface-container-highest transition-colors flex items-center gap-3"
                    >
                      <span className="material-symbols-outlined text-secondary text-2xl">html</span>
                      <div>
                        <div className="text-on-surface font-semibold">HTML</div>
                        <div className="text-on-surface-variant text-xs">Interaktywny raport</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleExportAll();
                        setExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-surface-container-highest transition-colors flex items-center gap-3"
                    >
                      <span className="material-symbols-outlined text-tertiary text-2xl">inventory_2</span>
                      <div>
                        <div className="text-on-surface font-semibold">Wszystkie</div>
                        <div className="text-on-surface-variant text-xs">Excel + HTML</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              <button
                className="p-3 hover:bg-surface-container-high rounded-xl transition-colors"
                title="Statystyki"
              >
                <span className="material-symbols-outlined text-on-surface-variant">bar_chart</span>
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="p-3 hover:bg-surface-container-high rounded-xl transition-colors"
                title="Ustawienia"
              >
                <span className="material-symbols-outlined text-on-surface-variant">settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex-shrink-0 bg-surface-container px-8 py-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 transform -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            type="text"
            placeholder="Skanuj QR lub wyszukaj część..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full pl-12 pr-4 py-4 bg-surface-container-high text-on-surface text-lg rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          />
        </div>

        {/* Requirements badges */}
        {(shipment.require_weight || shipment.require_country || shipment.require_photos) && (
          <div className="flex items-center gap-3 mt-4 p-4 bg-surface-container-high rounded-2xl">
            <span className="text-on-surface text-sm font-semibold">Wymagane dane:</span>
            {shipment.require_weight && (
              <span className="px-4 py-2 bg-primary/10 text-primary text-sm font-semibold rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">scale</span>
                <span>Waga</span>
              </span>
            )}
            {shipment.require_country && (
              <span className="px-4 py-2 bg-secondary/10 text-secondary text-sm font-semibold rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">public</span>
                <span>Kraj pochodzenia</span>
              </span>
            )}
            {shipment.require_photos && (
              <span className="px-4 py-2 bg-tertiary/10 text-tertiary text-sm font-semibold rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">photo_camera</span>
                <span>Zdjęcia</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Parts list */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Pending parts */}
          {filteredPendingParts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">schedule</span>
                DO SPAKOWANIA (<span className="font-headline">{filteredPendingParts.length}</span>)
              </h2>
              <div className="space-y-4">
                {filteredPendingParts.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => handlePackPart(part)}
                    className="bg-surface-container-high rounded-2xl p-6 hover:bg-surface-container-highest hover:scale-[1.01] transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-primary font-headline text-xl">
                            {part.sap_index}
                          </span>
                          <span className="text-on-surface-variant text-sm">
                            #{part.excel_row_number}
                          </span>
                        </div>
                        <p className="text-on-surface mb-3">{part.description}</p>
                        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-base">inventory_2</span>
                          <span className="font-headline">{part.quantity}</span>
                          <span>{part.unit}</span>
                        </div>
                      </div>
                      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary/10 hover:ring-2 hover:ring-primary transition-all">
                        <span className="material-symbols-outlined text-on-surface-variant text-2xl">radio_button_unchecked</span>
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
              <h2 className="text-lg font-semibold text-on-surface-variant mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                SPAKOWANE (<span className="font-headline">{filteredPackedParts.length}</span>)
              </h2>
              <p className="text-on-surface-variant text-sm mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">info</span>
                Kliknij produkt aby cofnąć pakowanie
              </p>
              <div className="space-y-4">
                {filteredPackedParts.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => handleUnpackPart(part)}
                    className="bg-surface-container rounded-2xl p-6 hover:bg-surface-container-high hover:scale-[1.01] hover:ring-2 hover:ring-tertiary transition-all cursor-pointer active:scale-[0.99]"
                    title="Kliknij aby cofnąć pakowanie"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-primary font-headline text-xl">
                            {part.sap_index}
                          </span>
                          <span className="text-on-surface-variant text-sm">
                            #{part.excel_row_number}
                          </span>
                        </div>
                        <p className="text-on-surface-variant text-sm">{part.description}</p>
                        <div className="flex items-center gap-2 text-sm text-on-surface-variant mt-3">
                          <span className="material-symbols-outlined text-base">inventory_2</span>
                          <span className="font-headline">{part.quantity}</span>
                          <span>{part.unit}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {shipment?.require_photos && (
                          <button
                            onClick={(e) => handleViewPhotos(part, e)}
                            className="p-3 hover:bg-primary/10 rounded-xl transition-all"
                            title="Pokaż zdjęcia"
                          >
                            <span className="material-symbols-outlined text-primary">photo_library</span>
                          </button>
                        )}
                        <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {pendingParts.length === 0 && packedParts.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-on-surface-variant text-6xl mb-4">inventory_2</span>
              <p className="text-on-surface-variant text-lg">
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
