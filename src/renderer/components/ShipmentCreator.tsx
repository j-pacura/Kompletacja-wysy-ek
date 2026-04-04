import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { PartFromExcel } from '../types/part';
import toast from 'react-hot-toast';

type Step = 'info' | 'excel' | 'config';

const ShipmentCreator: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const [step, setStep] = useState<Step>('info');
  const [loading, setLoading] = useState(false);

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
  const [hasCountryColumn, setHasCountryColumn] = useState(false);

  const handleExcelSelect = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('file:select-excel');

      if (result.success && result.data) {
        setExcelFile(result.data.path);
        setExcelFileName(result.data.name);

        setLoading(true);
        const parseResult = await ipcRenderer.invoke('file:parse-excel', result.data.path);

        if (parseResult.success) {
          setParts(parseResult.data.parts);

          const hasCountry = parseResult.data.hasCountryColumn || false;
          setHasCountryColumn(hasCountry);

          if (hasCountry) {
            setRequireCountry(true);
          }

          toast.success(`✅ Wczytano ${parseResult.data.parts.length} pozycji`);
          setStep('config');
        } else {
          toast.error(parseResult.error || 'Nie udało się odczytać pliku Excel');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Wystąpił błąd podczas wybierania pliku');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShipment = async () => {
    try {
      setLoading(true);
      const { ipcRenderer } = window.require('electron');

      const shipmentData: any = {
        shipment_number: shipmentNumber,
        destination,
        notes: notes || undefined,
        require_weight: requireWeight,
        require_country: requireCountry,
        require_photos: requirePhotos,
        excel_file_path: excelFile || undefined,
        user_id: currentUser?.id,
        packed_by: currentUser ? `${currentUser.name} ${currentUser.surname}` : undefined,
      };

      const createResult = await ipcRenderer.invoke('db:create-shipment', shipmentData);

      if (!createResult.success) {
        throw new Error(createResult.error || 'Nie udało się utworzyć wysyłki');
      }

      const shipmentId = createResult.data.id;

      // Add parts
      if (parts.length > 0) {
        for (const part of parts) {
          await ipcRenderer.invoke('db:add-part', shipmentId, part);
        }
      }

      toast.success('🎉 Wysyłka utworzona pomyślnie!');
      navigate(`/shipment/${shipmentId}`);
    } catch (err: any) {
      toast.error(err.message || 'Wystąpił błąd podczas tworzenia wysyłki');
    } finally {
      setLoading(false);
    }
  };

  const canProceedFromInfo = shipmentNumber.trim() !== '' && destination.trim() !== '';
  const canProceedFromExcel = excelFile !== null && parts.length > 0;

  const steps = [
    { id: 'info' as Step, label: 'Podstawowe informacje', icon: 'info' },
    { id: 'excel' as Step, label: 'Import danych', icon: 'upload_file' },
    { id: 'config' as Step, label: 'Konfiguracja', icon: 'settings' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
          Nowa Wysyłka
        </h1>
        <p className="text-on-surface-variant font-body">
          Kreator tworzenia nowej wysyłki
        </p>
      </div>

      {/* Progress Stepper - NO BORDERS */}
      <div className="bg-surface-container-high rounded-xl p-6">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center flex-1">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${idx <= currentStepIndex
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant'
                  }
                `}>
                  <span className="material-symbols-outlined">
                    {idx < currentStepIndex ? 'check' : s.icon}
                  </span>
                </div>
                <span className={`
                  mt-2 font-label text-sm font-semibold
                  ${idx <= currentStepIndex ? 'text-primary' : 'text-on-surface-variant'}
                `}>
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`
                  flex-1 h-1 mx-4 rounded-full transition-all duration-300
                  ${idx < currentStepIndex ? 'bg-primary' : 'bg-surface-container'}
                `} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-surface-container-high rounded-xl p-8 min-h-[400px]">
        {/* STEP 1: Basic Info */}
        {step === 'info' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-headline font-bold text-on-surface mb-6">
              Podstawowe informacje
            </h2>

            <div>
              <label className="text-on-surface font-label font-semibold text-sm uppercase tracking-wider mb-3 block">
                Numer wysyłki *
              </label>
              <input
                type="text"
                value={shipmentNumber}
                onChange={(e) => setShipmentNumber(e.target.value)}
                className="
                  w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg
                  font-body outline-none focus:ring-2 focus:ring-primary
                "
                placeholder="np. WYS-2024-001"
              />
            </div>

            <div>
              <label className="text-on-surface font-label font-semibold text-sm uppercase tracking-wider mb-3 block">
                Miejsce docelowe *
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="
                  w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg
                  font-body outline-none focus:ring-2 focus:ring-primary
                "
                placeholder="np. Warszawa, Polska"
              />
            </div>

            <div>
              <label className="text-on-surface font-label font-semibold text-sm uppercase tracking-wider mb-3 block">
                Notatki (opcjonalnie)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="
                  w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg
                  font-body outline-none focus:ring-2 focus:ring-primary resize-none
                "
                placeholder="Dodatkowe informacje o wysyłce..."
              />
            </div>

            <button
              onClick={() => setStep('excel')}
              disabled={!canProceedFromInfo}
              className="
                w-full primary-gradient text-on-primary font-bold py-4
                rounded-lg flex items-center justify-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-95 transition-all shadow-lg shadow-primary/20
                font-headline
              "
            >
              <span>Dalej</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        )}

        {/* STEP 2: Excel Import */}
        {step === 'excel' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-headline font-bold text-on-surface mb-6">
              Import danych z Excel
            </h2>

            {!excelFile ? (
              <div
                onClick={handleExcelSelect}
                className="
                  border-2 border-dashed border-outline-variant rounded-xl p-12
                  hover:border-primary hover:bg-primary/5
                  cursor-pointer transition-all text-center
                "
              >
                <span className="material-symbols-outlined text-on-surface-variant text-6xl mb-4 block">
                  upload_file
                </span>
                <p className="text-on-surface font-body text-lg font-semibold mb-2">
                  Kliknij aby wybrać plik Excel
                </p>
                <p className="text-on-surface-variant font-label text-sm">
                  Obsługiwane formaty: .xlsx, .xls
                </p>
              </div>
            ) : (
              <div className="bg-surface-container rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary text-2xl">
                        description
                      </span>
                    </div>
                    <div>
                      <p className="text-on-surface font-body font-semibold">
                        {excelFileName}
                      </p>
                      <p className="text-on-surface-variant font-label text-sm">
                        {parts.length} pozycji wczytanych
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleExcelSelect}
                    className="
                      px-4 py-2 rounded-lg flex items-center gap-2
                      text-tertiary hover:bg-tertiary/10
                      transition-all font-label font-semibold text-sm
                    "
                  >
                    <span className="material-symbols-outlined text-base">sync</span>
                    <span>Zmień plik</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('info')}
                className="
                  flex-1 px-6 py-3 rounded-lg
                  bg-surface-container text-on-surface
                  hover:bg-surface-bright
                  transition-all font-body font-semibold
                  flex items-center justify-center gap-2
                "
              >
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Wstecz</span>
              </button>
              <button
                onClick={() => setStep('config')}
                disabled={!canProceedFromExcel}
                className="
                  flex-1 primary-gradient text-on-primary font-bold py-3
                  rounded-lg flex items-center justify-center gap-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  active:scale-95 transition-all shadow-lg shadow-primary/20
                  font-headline
                "
              >
                <span>Dalej</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Configuration */}
        {step === 'config' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-headline font-bold text-on-surface mb-6">
              Konfiguracja wymagań
            </h2>

            <div className="space-y-4">
              {/* Require Weight */}
              <label className="
                flex items-center gap-4 p-6 rounded-xl cursor-pointer
                bg-surface-container hover:bg-surface-bright transition-all
              ">
                <input
                  type="checkbox"
                  checked={requireWeight}
                  onChange={(e) => setRequireWeight(e.target.checked)}
                  className="w-6 h-6 rounded accent-primary cursor-pointer"
                />
                <span className="material-symbols-outlined text-primary text-3xl">scale</span>
                <div className="flex-1">
                  <p className="text-on-surface font-body font-semibold">Pomiar wagi</p>
                  <p className="text-on-surface-variant font-label text-sm">
                    Wymagaj ważenia każdej części przed spakowaniem
                  </p>
                </div>
              </label>

              {/* Require Photos */}
              <label className="
                flex items-center gap-4 p-6 rounded-xl cursor-pointer
                bg-surface-container hover:bg-surface-bright transition-all
              ">
                <input
                  type="checkbox"
                  checked={requirePhotos}
                  onChange={(e) => setRequirePhotos(e.target.checked)}
                  className="w-6 h-6 rounded accent-primary cursor-pointer"
                />
                <span className="material-symbols-outlined text-primary text-3xl">photo_camera</span>
                <div className="flex-1">
                  <p className="text-on-surface font-body font-semibold">Zdjęcia</p>
                  <p className="text-on-surface-variant font-label text-sm">
                    Wymagaj zrobienia zdjęć przed spakowaniem
                  </p>
                </div>
              </label>

              {/* Require Country (only if Excel has country column) */}
              {hasCountryColumn && (
                <label className="
                  flex items-center gap-4 p-6 rounded-xl cursor-pointer
                  bg-surface-container hover:bg-surface-bright transition-all
                ">
                  <input
                    type="checkbox"
                    checked={requireCountry}
                    onChange={(e) => setRequireCountry(e.target.checked)}
                    className="w-6 h-6 rounded accent-primary cursor-pointer"
                  />
                  <span className="material-symbols-outlined text-primary text-3xl">public</span>
                  <div className="flex-1">
                    <p className="text-on-surface font-body font-semibold">Kraj pochodzenia</p>
                    <p className="text-on-surface-variant font-label text-sm">
                      Wymagaj podania kraju pochodzenia dla części bez kraju
                    </p>
                  </div>
                </label>
              )}
            </div>

            {/* Summary */}
            <div className="bg-surface-container rounded-xl p-6 mt-8">
              <h3 className="text-on-surface font-headline font-bold mb-4">
                📋 Podsumowanie
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-on-surface-variant font-label text-xs uppercase tracking-wider mb-1">
                    Numer wysyłki
                  </p>
                  <p className="text-on-surface font-headline font-bold text-base">
                    {shipmentNumber}
                  </p>
                </div>
                <div>
                  <p className="text-on-surface-variant font-label text-xs uppercase tracking-wider mb-1">
                    Miejsce docelowe
                  </p>
                  <p className="text-on-surface font-body font-semibold">
                    {destination}
                  </p>
                </div>
                <div>
                  <p className="text-on-surface-variant font-label text-xs uppercase tracking-wider mb-1">
                    Liczba pozycji
                  </p>
                  <p className="text-on-surface font-headline font-bold text-base">
                    {parts.length}
                  </p>
                </div>
                <div>
                  <p className="text-on-surface-variant font-label text-xs uppercase tracking-wider mb-1">
                    Wymagania
                  </p>
                  <div className="flex gap-2">
                    {requireWeight && <span className="text-xs">⚖️</span>}
                    {requirePhotos && <span className="text-xs">📷</span>}
                    {requireCountry && <span className="text-xs">🌍</span>}
                    {!requireWeight && !requirePhotos && !requireCountry && (
                      <span className="text-on-surface-variant text-xs">Brak</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('excel')}
                className="
                  flex-1 px-6 py-3 rounded-lg
                  bg-surface-container text-on-surface
                  hover:bg-surface-bright
                  transition-all font-body font-semibold
                  flex items-center justify-center gap-2
                "
              >
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Wstecz</span>
              </button>
              <button
                onClick={handleCreateShipment}
                disabled={loading}
                className="
                  flex-1 primary-gradient text-on-primary font-bold py-3
                  rounded-lg flex items-center justify-center gap-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  active:scale-95 transition-all shadow-lg shadow-primary/20
                  font-headline
                "
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    <span>Tworzenie...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">check</span>
                    <span>Utwórz wysyłkę</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShipmentCreator;
