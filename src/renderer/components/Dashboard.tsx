import React, { useState, useEffect } from 'react';
import { Shipment } from '../types/shipment';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
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
        // Filter out archived shipments
        const activeShipments = result.data.filter((s: Shipment) => !s.archived);
        setShipments(activeShipments);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-secondary-container',
          text: 'text-on-secondary-container',
          icon: 'check_circle',
          label: 'Ukończona'
        };
      case 'paused':
        return {
          bg: 'bg-tertiary-container',
          text: 'text-on-tertiary-container',
          icon: 'pause_circle',
          label: 'Wstrzymana'
        };
      default:
        return {
          bg: 'bg-primary-container/30',
          text: 'text-primary',
          icon: 'schedule',
          label: 'W trakcie'
        };
    }
  };

  // Calculate statistics
  const stats = {
    total: shipments.length,
    inProgress: shipments.filter(s => s.status === 'in_progress').length,
    completed: shipments.filter(s => s.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-on-surface-variant font-body">Ładowanie wysyłek...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Page Header - Display type for "Dashboard" */}
      <div>
        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
          Dashboard
        </h1>
        <p className="text-on-surface-variant font-body">
          Aktywne wysyłki i postęp pakowania
        </p>
      </div>

      {/* Statistics Cards - NO BORDERS, surface shifts only */}
      <div className="grid grid-cols-3 gap-6">
        {/* Total Shipments */}
        <div className="bg-surface-container-high rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">
                inventory_2
              </span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-label uppercase tracking-wider">
                Wszystkie
              </p>
              {/* Numbers use Manrope (font-headline) - "numbers are the most important data" */}
              <p className="text-on-surface text-3xl font-headline font-bold tracking-tight">
                {stats.total}
              </p>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-surface-container-high rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">
                pending_actions
              </span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-label uppercase tracking-wider">
                W trakcie
              </p>
              <p className="text-on-surface text-3xl font-headline font-bold tracking-tight">
                {stats.inProgress}
              </p>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-surface-container-high rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-2xl">
                task_alt
              </span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-label uppercase tracking-wider">
                Ukończone
              </p>
              <p className="text-on-surface text-3xl font-headline font-bold tracking-tight">
                {stats.completed}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Shipments List - NO DIVIDERS, 16px spacing (space-y-4) */}
      <div>
        <h2 className="text-xl font-headline font-bold text-on-surface mb-6">
          Aktywne wysyłki
        </h2>

        {shipments.length === 0 ? (
          <div className="bg-surface-container-high rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-6xl mb-4 block">
              inbox
            </span>
            <p className="text-on-surface-variant font-body text-lg mb-2">
              Brak aktywnych wysyłek
            </p>
            <p className="text-on-surface-variant font-label text-sm">
              Utwórz nową wysyłkę aby rozpocząć pakowanie
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {shipments.map((shipment) => {
              const progress = getProgress(shipment.id);
              const statusBadge = getStatusBadge(shipment.status);

              return (
                <button
                  key={shipment.id}
                  onClick={() => handleShipmentClick(shipment)}
                  className="
                    w-full bg-surface-container-highest rounded-xl p-6
                    hover:bg-surface-bright transition-all duration-200
                    active:scale-[0.99]
                    text-left
                  "
                >
                  <div className="flex items-start justify-between mb-4">
                    {/* Shipment Number - Display type (Manrope) */}
                    <div className="flex-1">
                      <h3 className="text-2xl font-headline font-bold text-on-surface tracking-tight mb-1">
                        {shipment.shipment_number}
                      </h3>
                      <p className="text-on-surface-variant font-body text-sm">
                        {shipment.destination}
                      </p>
                    </div>

                    {/* Status Badge - pill shape (full radius) */}
                    <div className={`
                      px-4 py-2 rounded-full flex items-center gap-2
                      ${statusBadge.bg} ${statusBadge.text}
                    `}>
                      <span className="material-symbols-outlined text-base">
                        {statusBadge.icon}
                      </span>
                      <span className="font-label font-semibold text-sm">
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar - thick, lg rounded, gradient fill with glow at 100% */}
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
                        className={`
                          h-full primary-gradient rounded-full transition-all duration-300
                          ${progress.percentage === 100 ? 'shadow-glow' : ''}
                        `}
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Metadata - extreme whitespace between items */}
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
                    {shipment.password && (
                      <div className="flex items-center gap-2 text-tertiary">
                        <span className="material-symbols-outlined text-base">
                          lock
                        </span>
                        <span>Chroniona</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
