import React, { useState, useEffect } from 'react';
import { Shipment } from '../types/shipment';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Archive: React.FC = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [shipmentParts, setShipmentParts] = useState<{ [shipmentId: number]: any[] }>({});

  useEffect(() => {
    loadShipments();
  }, []);

  useEffect(() => {
    if (shipments.length > 0) {
      loadAllParts();
    }
  }, [shipments]);

  const loadShipments = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:get-shipments');

      if (result.success) {
        // Filter only archived shipments
        const archivedShipments = result.data.filter((s: Shipment) => s.archived);
        setShipments(archivedShipments);
      } else {
        console.error('Failed to load shipments:', result.error);
      }
    } catch (error) {
      console.error('Error loading shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllParts = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const partsData: { [shipmentId: number]: any[] } = {};

      for (const shipment of shipments) {
        const result = await ipcRenderer.invoke('db:get-parts', shipment.id);
        if (result.success) {
          partsData[shipment.id] = result.data;
        }
      }

      setShipmentParts(partsData);
    } catch (error) {
      console.error('Error loading parts:', error);
    }
  };

  const handleUnarchiveClick = async (shipment: Shipment, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:update-shipment', shipment.id, { archived: 0 });

      if (result.success) {
        toast.success('Wysyłka przywrócona do aktywnych');
        loadShipments();
      } else {
        toast.error('Błąd przywracania wysyłki');
      }
    } catch (error) {
      console.error('Error unarchiving shipment:', error);
      toast.error('Błąd przywracania wysyłki');
    }
  };

  const handleShipmentClick = (shipment: Shipment) => {
    navigate(`/shipment/${shipment.id}`);
  };

  const getProgress = (shipmentId: number): { packed: number; total: number; percentage: number } => {
    const parts = shipmentParts[shipmentId] || [];
    const packed = parts.filter(p => p.status === 'packed').length;
    const total = parts.length;
    const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;
    return { packed, total, percentage };
  };

  const filteredShipments = shipments.filter(shipment =>
    shipment.shipment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shipment.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-on-surface-variant font-body">Ładowanie archiwum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
          Archiwum
        </h1>
        <p className="text-on-surface-variant font-body">
          Zarchiwizowane wysyłki
        </p>
      </div>

      {/* Search Bar - surface-container-high, no border */}
      <div className="bg-surface-container-high rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant text-2xl">
            search
          </span>
          <input
            type="text"
            placeholder="Szukaj po numerze lub miejscu docelowym..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              flex-1 bg-transparent text-on-surface font-body
              placeholder:text-on-surface-variant
              outline-none
            "
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Shipments List - NO DIVIDERS, 16px spacing (space-y-4) */}
      {filteredShipments.length === 0 ? (
        <div className="bg-surface-container-high rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-6xl mb-4 block">
            inventory_2
          </span>
          <p className="text-on-surface-variant font-body text-lg mb-2">
            {searchQuery ? 'Nie znaleziono wysyłek' : 'Brak zarchiwizowanych wysyłek'}
          </p>
          <p className="text-on-surface-variant font-label text-sm">
            {searchQuery ? 'Spróbuj innego wyszukiwania' : 'Zarchiwizowane wysyłki pojawią się tutaj'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredShipments.map((shipment) => {
            const progress = getProgress(shipment.id);

            return (
              <div
                key={shipment.id}
                className="
                  bg-surface-container-highest rounded-xl p-6
                  hover:bg-surface-bright transition-all duration-200
                "
              >
                <div className="flex items-start justify-between mb-4">
                  {/* Shipment Info */}
                  <button
                    onClick={() => handleShipmentClick(shipment)}
                    className="flex-1 text-left"
                  >
                    <h3 className="text-2xl font-headline font-bold text-on-surface tracking-tight mb-1">
                      {shipment.shipment_number}
                    </h3>
                    <p className="text-on-surface-variant font-body text-sm">
                      {shipment.destination}
                    </p>
                  </button>

                  {/* Action Button - Ghost style */}
                  <button
                    onClick={(e) => handleUnarchiveClick(shipment, e)}
                    className="
                      px-4 py-2 rounded-lg flex items-center gap-2
                      text-tertiary hover:bg-tertiary/10
                      transition-all font-label font-semibold text-sm
                    "
                  >
                    <span className="material-symbols-outlined text-base">
                      unarchive
                    </span>
                    <span>Przywróć</span>
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-on-surface-variant font-label text-xs uppercase tracking-wider">
                      Postęp
                    </span>
                    <span className="text-on-surface font-headline font-bold text-sm">
                      {progress.packed}/{progress.total}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-surface-container-low rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Metadata - extreme whitespace */}
                <div className="flex items-center gap-6 text-on-surface-variant font-label text-xs">
                  {shipment.packed_by && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">
                        person
                      </span>
                      <span>{shipment.packed_by}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">
                      calendar_today
                    </span>
                    <span>
                      {format(new Date(shipment.created_at), 'dd MMM yyyy', { locale: pl })}
                    </span>
                  </div>
                  {shipment.completed_at && (
                    <div className="flex items-center gap-2 text-secondary">
                      <span className="material-symbols-outlined text-base">
                        check_circle
                      </span>
                      <span>
                        Ukończona {format(new Date(shipment.completed_at), 'dd MMM', { locale: pl })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Archive;
