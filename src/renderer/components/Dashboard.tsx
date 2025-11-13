import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Settings,
  BarChart3,
  Clock,
  CheckCircle2,
  Pause,
} from 'lucide-react';
import { Shipment } from '../types/shipment';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [userName, setUserName] = useState('');
  const [userSurname, setUserSurname] = useState('');

  useEffect(() => {
    loadShipments();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:get-settings');

      if (result.success) {
        setUserName(result.data.user_name || '');
        setUserSurname(result.data.user_surname || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadShipments = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:get-shipments');

      if (result.success) {
        setShipments(result.data);
      } else {
        console.error('Failed to load shipments:', result.error);
      }
    } catch (error) {
      console.error('Error loading shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-accent-success" />;
      case 'paused':
        return <Pause className="w-5 h-5 text-accent-warning" />;
      default:
        return <Clock className="w-5 h-5 text-accent-primary" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ukończona';
      case 'paused':
        return 'Wstrzymana';
      default:
        return 'W trakcie';
    }
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch =
      shipment.shipment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || shipment.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col w-full h-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-bg-secondary border-b border-bg-tertiary px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              📦 Pakowanie Wysyłek
            </h1>
            <p className="text-text-secondary">
              Zarządzaj wysyłkami i śledź postęp pakowania
            </p>
            {(userName || userSurname) && (
              <p className="text-accent-primary text-sm mt-1 font-semibold">
                👤 {userName} {userSurname}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary hover:bg-opacity-80 text-text-primary rounded-lg transition-all btn-active"
              onClick={() => {/* TODO: Open statistics */}}
            >
              <BarChart3 className="w-5 h-5" />
              Statystyki
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary hover:bg-opacity-80 text-text-primary rounded-lg transition-all btn-active"
              onClick={() => navigate('/settings')}
            >
              <Settings className="w-5 h-5" />
              Ustawienia
            </button>
            <button
              className="flex items-center gap-2 px-6 py-2 gradient-primary text-white rounded-lg hover:opacity-90 transition-all btn-active font-semibold"
              onClick={() => navigate('/create')}
            >
              <Plus className="w-5 h-5" />
              Nowa Wysyłka
            </button>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex-shrink-0 bg-bg-secondary border-b border-bg-tertiary px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Szukaj po numerze wysyłki lub miejscu docelowym..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filterStatus === 'all'
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-80'
              }`}
            >
              Wszystkie
            </button>
            <button
              onClick={() => setFilterStatus('in_progress')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filterStatus === 'in_progress'
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-80'
              }`}
            >
              W trakcie
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filterStatus === 'completed'
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-80'
              }`}
            >
              Ukończone
            </button>
          </div>
        </div>
      </div>

      {/* Shipments list */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-text-secondary">Ładowanie wysyłek...</p>
            </div>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Package className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary text-lg mb-2">
                {searchQuery ? 'Nie znaleziono wysyłek' : 'Brak wysyłek'}
              </p>
              <p className="text-text-tertiary text-sm">
                {searchQuery
                  ? 'Spróbuj zmienić kryteria wyszukiwania'
                  : 'Kliknij "Nowa Wysyłka" aby rozpocząć'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredShipments.map((shipment) => (
              <div
                key={shipment.id}
                className="bg-bg-tertiary rounded-xl p-6 card-hover cursor-pointer animate-slide-in"
                onClick={() => navigate(`/packing/${shipment.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(shipment.status)}
                    <span className="text-text-secondary text-sm">
                      {getStatusText(shipment.status)}
                    </span>
                  </div>
                  <span className="text-text-tertiary text-xs">
                    {format(new Date(shipment.created_at), 'dd MMM yyyy', { locale: pl })}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-text-primary mb-2">
                  {shipment.shipment_number}
                </h3>

                <p className="text-text-secondary text-sm mb-4">
                  📍 {shipment.destination}
                </p>

                {shipment.notes && (
                  <p className="text-text-tertiary text-xs mb-4 line-clamp-2">
                    {shipment.notes}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-text-tertiary">
                  {shipment.require_weight && <span>⚖️ Waga</span>}
                  {shipment.require_country && <span>🌍 Kraj</span>}
                  {shipment.require_photos && <span>📷 Zdjęcia</span>}
                </div>

                {shipment.status === 'completed' && shipment.packing_time_seconds && (
                  <div className="mt-4 pt-4 border-t border-bg-secondary">
                    <span className="text-text-secondary text-xs">
                      ⏱️ Czas pakowania:{' '}
                      {Math.floor(shipment.packing_time_seconds / 60)} min
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
