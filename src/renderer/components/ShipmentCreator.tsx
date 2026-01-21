import React, { useState } from 'react';
import {
  ArrowLeft,
  Upload,
  Package,
  MapPin,
  FileText,
  Scale,
  Globe,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Hash,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { PartFromExcel } from '../types/part';

const ShipmentCreator: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const [step, setStep] = useState<'info' | 'excel' | 'config'>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [shipmentNumber, setShipmentNumber] = useState('');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [excelFile, setExcelFile] = useState<string | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [parts, setParts] = useState<PartFromExcel[]>([]);
  const [requireWeight, setRequireWeight] = useState(false);
  const [requireCountry, setRequireCountry] = useState(false);
  const [requirePhotos, setRequirePhotos] = useState(false);
  const [requireSerialNumbers, setRequireSerialNumbers] = useState(false);
  const [hasCountryColumn, setHasCountryColumn] = useState(false);

  const handleExcelSelect = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('file:select-excel');

      if (result.success && result.data) {
        setExcelFile(result.data.path);
        setExcelFileName(result.data.name);

        // Parse Excel file
        setLoading(true);
        setError(null);

        const parseResult = await ipcRenderer.invoke('file:parse-excel', result.data.path);

        if (parseResult.success) {
          setParts(parseResult.data.parts);

          // Save whether country column exists
          const hasCountry = parseResult.data.hasCountryColumn || false;
          setHasCountryColumn(hasCountry);

          // Auto-enable country requirement if column exists
          if (hasCountry) {
            setRequireCountry(true);
          }

          setStep('config');
        } else {
          setError(parseResult.error || 'Nie udało się odczytać pliku Excel');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas wybierania pliku');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShipment = async () => {
    try {
      setLoading(true);
      setError(null);

      const { ipcRenderer } = window.require('electron');

      // Create shipment
      const shipmentData: any = {
        shipment_number: shipmentNumber,
        destination,
        notes: notes || undefined,
        require_weight: requireWeight,
        require_country: requireCountry,
        require_photos: requirePhotos,
        require_serial_numbers: requireSerialNumbers,
        excel_file_path: excelFile || undefined,
        user_id: currentUser?.id,
        packed_by: currentUser ? `${currentUser.name} ${currentUser.surname}` : undefined,
      };

      const createResult = await ipcRenderer.invoke('db:create-shipment', shipmentData);

      if (!createResult.success) {
        throw new Error(createResult.error || 'Nie udało się utworzyć wysyłki');
      }

      const shipmentId = createResult.data.id;

      // Add parts to database
      for (const part of parts) {
        await ipcRenderer.invoke('db:execute',
          `INSERT INTO parts (
            shipment_id, sap_index, description, quantity, unit,
            country_of_origin, order_number, order_description, excel_row_number, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            shipmentId,
            part.sap_index,
            part.description,
            part.quantity,
            part.unit,
            part.country_of_origin || null,
            part.order_number || null,
            part.order_description || null,
            part.excel_row_number,
          ]
        );
      }

      // Navigate to packing screen
      navigate(`/packing/${shipmentId}`);
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas tworzenia wysyłki');
    } finally {
      setLoading(false);
    }
  };

  const canProceedFromInfo = shipmentNumber.trim() !== '' && destination.trim() !== '';
  const canProceedFromExcel = parts.length > 0;

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary">
      {/* Header */}
      <div className="flex-shrink-0 bg-bg-secondary border-b border-bg-tertiary px-8 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-text-primary" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Nowa Wysyłka
            </h1>
            <p className="text-text-secondary mt-1">
              Krok {step === 'info' ? '1' : step === 'excel' ? '2' : '3'} z 3
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex-shrink-0 bg-bg-secondary border-b border-bg-tertiary px-8 py-4">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${step === 'info' ? 'text-accent-primary' : 'text-accent-success'}`}>
            {step === 'info' ? (
              <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-white font-bold">1</div>
            ) : (
              <CheckCircle2 className="w-8 h-8" />
            )}
            <span className="font-medium">Informacje</span>
          </div>
          <div className="flex-1 h-1 bg-bg-tertiary rounded">
            <div
              className={`h-full bg-accent-primary rounded transition-all duration-500 ${
                step !== 'info' ? 'w-full' : 'w-0'
              }`}
            />
          </div>
          <div className={`flex items-center gap-2 ${
            step === 'info' ? 'text-text-tertiary' :
            step === 'excel' ? 'text-accent-primary' : 'text-accent-success'
          }`}>
            {step === 'info' ? (
              <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-text-tertiary font-bold">2</div>
            ) : step === 'excel' ? (
              <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-white font-bold">2</div>
            ) : (
              <CheckCircle2 className="w-8 h-8" />
            )}
            <span className="font-medium">Excel</span>
          </div>
          <div className="flex-1 h-1 bg-bg-tertiary rounded">
            <div
              className={`h-full bg-accent-primary rounded transition-all duration-500 ${
                step === 'config' ? 'w-full' : 'w-0'
              }`}
            />
          </div>
          <div className={`flex items-center gap-2 ${
            step === 'config' ? 'text-accent-primary' : 'text-text-tertiary'
          }`}>
            <div className={`w-8 h-8 rounded-full ${
              step === 'config' ? 'bg-accent-primary text-white' : 'bg-bg-tertiary text-text-tertiary'
            } flex items-center justify-center font-bold`}>3</div>
            <span className="font-medium">Konfiguracja</span>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-8 mt-4 p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-500 font-medium">Błąd</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Step 1: Basic Info */}
          {step === 'info' && (
            <div className="space-y-6 animate-scale-in">
              <div>
                <label className="flex items-center gap-2 text-text-primary font-medium mb-2">
                  <Package className="w-5 h-5" />
                  Numer Wysyłki *
                </label>
                <input
                  type="text"
                  value={shipmentNumber}
                  onChange={(e) => setShipmentNumber(e.target.value)}
                  placeholder="np. WYS-001"
                  className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-text-primary font-medium mb-2">
                  <MapPin className="w-5 h-5" />
                  Miejsce Docelowe *
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="np. Magazyn Warszawa"
                  className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-text-primary font-medium mb-2">
                  <FileText className="w-5 h-5" />
                  Notatki (opcjonalne)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Dodatkowe informacje o wysyłce..."
                  rows={4}
                  className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 px-6 py-3 bg-bg-tertiary text-text-primary rounded-lg hover:bg-opacity-80 transition-all btn-active font-medium"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => setStep('excel')}
                  disabled={!canProceedFromInfo}
                  className="flex-1 px-6 py-3 gradient-primary text-white rounded-lg hover:opacity-90 transition-all btn-active font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Dalej →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Excel Upload */}
          {step === 'excel' && (
            <div className="space-y-6 animate-scale-in">
              <div className="text-center py-12">
                <Upload className="w-16 h-16 text-accent-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-text-primary mb-2">
                  Importuj Listę Części
                </h2>
                <p className="text-text-secondary mb-8">
                  Wybierz plik Excel z listą części do spakowania
                </p>

                {!excelFile ? (
                  <button
                    onClick={handleExcelSelect}
                    disabled={loading}
                    className="px-8 py-4 gradient-primary text-white rounded-lg hover:opacity-90 transition-all btn-active font-medium inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Wczytuję plik...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Wybierz Plik Excel
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-bg-tertiary rounded-lg p-6 max-w-md mx-auto">
                    <CheckCircle2 className="w-12 h-12 text-accent-success mx-auto mb-3" />
                    <p className="text-text-primary font-medium mb-2">{excelFileName}</p>
                    <p className="text-text-secondary text-sm mb-4">
                      {parts.length} {parts.length === 1 ? 'część' : 'części'} wczytano
                    </p>
                    <button
                      onClick={handleExcelSelect}
                      className="text-accent-primary hover:text-accent-secondary transition-colors text-sm"
                    >
                      Wybierz inny plik
                    </button>
                  </div>
                )}

                <div className="mt-8 bg-bg-tertiary rounded-lg p-6 text-left max-w-md mx-auto">
                  <p className="text-text-primary font-medium mb-3">
                    Wymagany format Excel:
                  </p>
                  <ul className="text-text-secondary text-sm space-y-2">
                    <li>✓ Kolumna A: SAP Index</li>
                    <li>✓ Kolumna B: Opis</li>
                    <li>✓ Kolumna C: Ilość</li>
                    <li>✓ Kolumna D: Jednostka</li>
                    <li className="text-text-tertiary">○ Kolumna E: Kraj pochodzenia (opcjonalna)</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('info')}
                  className="flex-1 px-6 py-3 bg-bg-tertiary text-text-primary rounded-lg hover:bg-opacity-80 transition-all btn-active font-medium"
                >
                  ← Wstecz
                </button>
                <button
                  onClick={() => setStep('config')}
                  disabled={!canProceedFromExcel}
                  className="flex-1 px-6 py-3 gradient-primary text-white rounded-lg hover:opacity-90 transition-all btn-active font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Dalej →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Configuration */}
          {step === 'config' && (
            <div className="space-y-6 animate-scale-in">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">
                  Konfiguracja Wymagań
                </h2>
                <p className="text-text-secondary">
                  Wybierz, jakie dane są wymagane podczas pakowania
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-4 bg-bg-tertiary rounded-lg p-6 cursor-pointer hover:bg-opacity-80 transition-all">
                  <input
                    type="checkbox"
                    checked={requireWeight}
                    onChange={(e) => setRequireWeight(e.target.checked)}
                    className="w-6 h-6 rounded border-2 border-text-tertiary checked:bg-accent-primary checked:border-accent-primary"
                  />
                  <Scale className="w-8 h-8 text-accent-primary" />
                  <div className="flex-1">
                    <p className="text-text-primary font-medium">Pomiar Wagi</p>
                    <p className="text-text-secondary text-sm">Wymagaj ważenia każdej części na wadze Radwag</p>
                  </div>
                </label>

                {/* Only show country checkbox if Excel had country column */}
                {hasCountryColumn && (
                  <label className="flex items-center gap-4 bg-bg-tertiary rounded-lg p-6 cursor-pointer hover:bg-opacity-80 transition-all">
                    <input
                      type="checkbox"
                      checked={requireCountry}
                      onChange={(e) => setRequireCountry(e.target.checked)}
                      className="w-6 h-6 rounded border-2 border-text-tertiary checked:bg-accent-primary checked:border-accent-primary"
                    />
                    <Globe className="w-8 h-8 text-accent-secondary" />
                    <div className="flex-1">
                      <p className="text-text-primary font-medium">Kraj Pochodzenia</p>
                      <p className="text-text-secondary text-sm">Wymagaj podania kraju pochodzenia dla części bez kraju</p>
                    </div>
                  </label>
                )}

                <label className="flex items-center gap-4 bg-bg-tertiary rounded-lg p-6 cursor-pointer hover:bg-opacity-80 transition-all">
                  <input
                    type="checkbox"
                    checked={requirePhotos}
                    onChange={(e) => setRequirePhotos(e.target.checked)}
                    className="w-6 h-6 rounded border-2 border-text-tertiary checked:bg-accent-primary checked:border-accent-primary"
                  />
                  <Camera className="w-8 h-8 text-accent-warning" />
                  <div className="flex-1">
                    <p className="text-text-primary font-medium">Zdjęcia</p>
                    <p className="text-text-secondary text-sm">Wymagaj wykonania zdjęć dla każdej części</p>
                  </div>
                </label>

                <label className="flex items-center gap-4 bg-bg-tertiary rounded-lg p-6 cursor-pointer hover:bg-opacity-80 transition-all">
                  <input
                    type="checkbox"
                    checked={requireSerialNumbers}
                    onChange={(e) => setRequireSerialNumbers(e.target.checked)}
                    className="w-6 h-6 rounded border-2 border-text-tertiary checked:bg-accent-primary checked:border-accent-primary"
                  />
                  <Hash className="w-8 h-8 text-blue-400" />
                  <div className="flex-1">
                    <p className="text-text-primary font-medium">Numery Seryjne</p>
                    <p className="text-text-secondary text-sm">Wymagaj skanowania numerów seryjnych (OCR)</p>
                  </div>
                </label>
              </div>

              <div className="bg-bg-tertiary border-2 border-accent-primary/30 rounded-lg p-6">
                <h3 className="text-accent-primary font-semibold mb-4 text-lg">📋 Podsumowanie</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-text-tertiary text-xs mb-1">Numer wysyłki:</p>
                    <p className="text-text-primary font-semibold text-base">{shipmentNumber}</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary text-xs mb-1">Miejsce docelowe:</p>
                    <p className="text-text-primary font-semibold text-base">{destination}</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary text-xs mb-1">Liczba części:</p>
                    <p className="text-text-primary font-semibold text-base">{parts.length}</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary text-xs mb-1">Wymagania:</p>
                    <div className="flex gap-2 flex-wrap">
                      {requireWeight && <span className="text-accent-primary font-medium">⚖️ Waga</span>}
                      {requireCountry && <span className="text-accent-secondary font-medium">🌍 Kraj</span>}
                      {requirePhotos && <span className="text-accent-warning font-medium">📷 Zdjęcia</span>}
                      {requireSerialNumbers && <span className="text-blue-400 font-medium">🔢 SN</span>}
                      {!requireWeight && !requireCountry && !requirePhotos && !requireSerialNumbers && (
                        <span className="text-text-tertiary">Brak</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('excel')}
                  className="flex-1 px-6 py-3 bg-bg-tertiary text-text-primary rounded-lg hover:bg-opacity-80 transition-all btn-active font-medium"
                >
                  ← Wstecz
                </button>
                <button
                  onClick={handleCreateShipment}
                  disabled={loading}
                  className="flex-1 px-6 py-3 gradient-success text-white rounded-lg hover:opacity-90 transition-all btn-active font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Tworzenie...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Rozpocznij Pakowanie
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShipmentCreator;
