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
  Trash2,
  Lock,
  X,
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

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; shipment: Shipment | null }>({ open: false, shipment: null });
  const [deletePassword, setDeletePassword] = useState('');

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

  const handleDeleteClick = (shipment: Shipment, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({ open: true, shipment });
    setDeletePassword('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.shipment) return;

    const shipment = deleteModal.shipment;

    // Check password if shipment has one
    if (shipment.password) {
      if (deletePassword !== shipment.password) {
        alert('❌ Nieprawidłowe hasło! Nie można usunąć wysyłki.');
        return;
      }
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:delete-shipment', shipment.id);

      if (result.success) {
        setShipments(shipments.filter(s => s.id !== shipment.id));
        setDeleteModal({ open: false, shipment: null });
        setDeletePassword('');
      } else {
        alert('❌ Błąd usuwania wysyłki');
      }
    } catch (error) {
      console.error('Error deleting shipment:', error);
      alert('❌ Błąd usuwania wysyłki');
    }
  };

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
                className="relative group bg-bg-tertiary rounded-xl p-6 card-hover cursor-pointer animate-slide-in"
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
                  {shipment.password && <span>🔒 Chroniona</span>}
                </div>

                {shipment.status === 'completed' && shipment.packing_time_seconds && (
                  <div className="mt-4 pt-4 border-t border-bg-secondary">
                    <span className="text-text-secondary text-xs">
                      ⏱️ Czas pakowania:{' '}
                      {Math.floor(shipment.packing_time_seconds / 60)} min
                    </span>
                  </div>
                )}

                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteClick(shipment, e)}
                  className="absolute top-4 right-4 p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Usuń wysyłkę"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteModal.open && deleteModal.shipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-bg-secondary rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <Trash2 className="w-6 h-6 text-red-500" />
                Usuń wysyłkę
              </h2>
              <button
                onClick={() => {
                  setDeleteModal({ open: false, shipment: null });
                  setDeletePassword('');
                }}
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-tertiary" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-text-secondary mb-4">
                Czy na pewno chcesz usunąć wysyłkę{' '}
                <span className="font-semibold text-text-primary">
                  {deleteModal.shipment.shipment_number}
                </span>
                ?
              </p>
              <p className="text-text-tertiary text-sm">
                ⚠️ Ta operacja jest nieodwracalna. Wszystkie dane, części i zdjęcia zostaną trwale usunięte.
              </p>
            </div>

            {deleteModal.shipment.password && (
              <div className="mb-6">
                <label className="flex items-center gap-2 text-text-primary font-medium mb-2">
                  <Lock className="w-5 h-5" />
                  Hasło wysyłki
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Wprowadź hasło aby usunąć..."
                  className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                  autoFocus
                />
                <p className="text-text-tertiary text-sm mt-2">
                  🔒 Ta wysyłka jest chroniona hasłem
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteModal({ open: false, shipment: null });
                  setDeletePassword('');
                }}
                className="flex-1 px-4 py-3 bg-bg-tertiary hover:bg-opacity-80 text-text-primary rounded-lg transition-all font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-medium"
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
