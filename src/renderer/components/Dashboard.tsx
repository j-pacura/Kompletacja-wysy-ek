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
  TrendingUp,
  Calendar,
  Play,
  FileText,
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
  const [shipmentParts, setShipmentParts] = useState<{ [shipmentId: number]: any[] }>({});

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; shipment: Shipment | null }>({ open: false, shipment: null });
  const [deletePassword, setDeletePassword] = useState('');

  // Password unlock modal state (for opening protected shipments)
  const [unlockModal, setUnlockModal] = useState<{ open: boolean; shipment: Shipment | null }>({ open: false, shipment: null });
  const [unlockPassword, setUnlockPassword] = useState('');

  // Welcome modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [welcomeSurname, setWelcomeSurname] = useState('');
  const [reportLanguage, setReportLanguage] = useState('pl');

  useEffect(() => {
    loadShipments();
    loadUserData();
  }, []);

  useEffect(() => {
    if (shipments.length > 0) {
      loadAllParts();
    }
  }, [shipments]);

  const loadUserData = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:get-settings');

      if (result.success) {
        const name = result.data.user_name || '';
        const surname = result.data.user_surname || '';
        const language = result.data.report_language || 'pl';

        setUserName(name);
        setUserSurname(surname);
        setReportLanguage(language);

        // Show welcome modal if user hasn't set their name yet
        if (!name && !surname) {
          setShowWelcomeModal(true);
        }
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

  const handleWelcomeSubmit = async () => {
    if (!welcomeName.trim() && !welcomeSurname.trim()) {
      alert('⚠️ Proszę podać przynajmniej imię lub nazwisko');
      return;
    }

    try {
      const { ipcRenderer } = window.require('electron');

      // Save all three settings
      await ipcRenderer.invoke('db:update-setting', 'user_name', welcomeName.trim());
      await ipcRenderer.invoke('db:update-setting', 'user_surname', welcomeSurname.trim());
      await ipcRenderer.invoke('db:update-setting', 'report_language', reportLanguage);

      // Update local state
      setUserName(welcomeName.trim());
      setUserSurname(welcomeSurname.trim());

      // Close modal
      setShowWelcomeModal(false);
    } catch (error) {
      console.error('Error saving welcome data:', error);
      alert('❌ Błąd zapisywania danych');
    }
  };

  const handleShipmentClick = (shipment: Shipment) => {
    // If shipment has password, show unlock modal
    if (shipment.password) {
      setUnlockModal({ open: true, shipment });
      setUnlockPassword('');
    } else {
      // No password, navigate directly
      navigate(`/packing/${shipment.id}`);
    }
  };

  const handleUnlockConfirm = () => {
    if (!unlockModal.shipment) return;

    const shipment = unlockModal.shipment;

    // Check password
    if (unlockPassword !== shipment.password) {
      alert('❌ Nieprawidłowe hasło!');
      return;
    }

    // Password correct, navigate to shipment
    navigate(`/packing/${shipment.id}`);
    setUnlockModal({ open: false, shipment: null });
    setUnlockPassword('');
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Total Shipments */}
          <div className="group relative bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-600/0 group-hover:from-blue-500/5 group-hover:to-blue-600/5 rounded-xl transition-all duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Package className="w-6 h-6 text-blue-400" />
                </div>
                <TrendingUp className="w-5 h-5 text-blue-400 opacity-50" />
              </div>
              <h3 className="text-text-tertiary text-sm font-medium mb-1">Wszystkie</h3>
              <p className="text-3xl font-bold text-text-primary mb-1">{shipments.length}</p>
              <p className="text-blue-400 text-xs font-medium">wysyłek łącznie</p>
            </div>
          </div>

          {/* In Progress */}
          <div className="group relative bg-gradient-to-br from-yellow-500/10 to-orange-600/10 border border-yellow-500/20 rounded-xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-orange-600/0 group-hover:from-yellow-500/5 group-hover:to-orange-600/5 rounded-xl transition-all duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <TrendingUp className="w-5 h-5 text-yellow-400 opacity-50" />
              </div>
              <h3 className="text-text-tertiary text-sm font-medium mb-1">W trakcie</h3>
              <p className="text-3xl font-bold text-text-primary mb-1">
                {shipments.filter(s => s.status === 'in_progress').length}
              </p>
              <p className="text-yellow-400 text-xs font-medium">aktywnych wysyłek</p>
            </div>
          </div>

          {/* Completed */}
          <div className="group relative bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20 rounded-xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-emerald-600/0 group-hover:from-green-500/5 group-hover:to-emerald-600/5 rounded-xl transition-all duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-400 opacity-50" />
              </div>
              <h3 className="text-text-tertiary text-sm font-medium mb-1">Ukończone</h3>
              <p className="text-3xl font-bold text-text-primary mb-1">
                {shipments.filter(s => s.status === 'completed').length}
              </p>
              <p className="text-green-400 text-xs font-medium">zrealizowanych</p>
            </div>
          </div>

          {/* Today's Shipments */}
          <div className="group relative bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-600/0 group-hover:from-purple-500/5 group-hover:to-pink-600/5 rounded-xl transition-all duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-400" />
                </div>
                <TrendingUp className="w-5 h-5 text-purple-400 opacity-50" />
              </div>
              <h3 className="text-text-tertiary text-sm font-medium mb-1">Dzisiaj</h3>
              <p className="text-3xl font-bold text-text-primary mb-1">
                {shipments.filter(s => {
                  const today = new Date().toISOString().split('T')[0];
                  return s.created_date === today;
                }).length}
              </p>
              <p className="text-purple-400 text-xs font-medium">nowych wysyłek</p>
            </div>
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
            {filteredShipments.map((shipment) => {
              const parts = shipmentParts[shipment.id] || [];
              const totalParts = parts.length;
              const packedParts = parts.filter(p => p.status === 'packed').length;
              const progress = totalParts > 0 ? (packedParts / totalParts) * 100 : 0;

              return (
              <div
                key={shipment.id}
                className="relative group bg-bg-tertiary rounded-xl p-6 transition-all animate-slide-in overflow-hidden"
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

                {/* Progress Bar */}
                {totalParts > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-text-secondary">Postęp pakowania</span>
                      <span className="text-xs font-semibold text-accent-primary">
                        {packedParts}/{totalParts} części
                      </span>
                    </div>
                    <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent-primary to-green-400 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-text-tertiary mb-4">
                  {shipment.require_weight && <span>⚖️ Waga</span>}
                  {shipment.require_country && <span>🌍 Kraj</span>}
                  {shipment.require_photos && <span>📷 Zdjęcia</span>}
                  {shipment.password && <span>🔒 Chroniona</span>}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-bg-secondary">
                  <button
                    onClick={() => handleShipmentClick(shipment)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-primary hover:bg-opacity-90 text-white rounded-lg transition-all text-sm font-medium"
                  >
                    <Play className="w-4 h-4" />
                    {shipment.status === 'completed' ? 'Zobacz' : 'Kontynuuj'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Open reports menu
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-bg-secondary hover:bg-opacity-80 text-text-primary rounded-lg transition-all text-sm"
                    title="Raporty"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(shipment, e)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all text-sm"
                    title="Usuń"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              );
            })}
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

      {/* Password unlock modal */}
      {unlockModal.open && unlockModal.shipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-bg-secondary rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <Lock className="w-6 h-6 text-accent-primary" />
                Wysyłka chroniona
              </h2>
              <button
                onClick={() => {
                  setUnlockModal({ open: false, shipment: null });
                  setUnlockPassword('');
                }}
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-tertiary" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-text-secondary mb-4">
                Wysyłka{' '}
                <span className="font-semibold text-text-primary">
                  {unlockModal.shipment.shipment_number}
                </span>
                {' '}jest chroniona hasłem
              </p>
              <p className="text-text-tertiary text-sm">
                🔒 Wprowadź hasło aby uzyskać dostęp
              </p>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2 text-text-primary font-medium mb-2">
                <Lock className="w-5 h-5" />
                Hasło
              </label>
              <input
                type="password"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleUnlockConfirm();
                  }
                }}
                placeholder="Wprowadź hasło..."
                className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setUnlockModal({ open: false, shipment: null });
                  setUnlockPassword('');
                }}
                className="flex-1 px-4 py-3 bg-bg-tertiary hover:bg-opacity-80 text-text-primary rounded-lg transition-all font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={handleUnlockConfirm}
                className="flex-1 px-4 py-3 gradient-primary text-white rounded-lg hover:opacity-90 transition-all font-medium"
              >
                Otwórz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-bg-secondary rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-text-primary mb-2">
                👋 Witaj!
              </h2>
              <p className="text-text-secondary">
                Zanim zaczniesz, przedstaw się i wybierz język raportów
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-text-primary font-medium mb-2">
                  Imię
                </label>
                <input
                  type="text"
                  value={welcomeName}
                  onChange={(e) => setWelcomeName(e.target.value)}
                  placeholder="Wpisz swoje imię..."
                  className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2">
                  Nazwisko
                </label>
                <input
                  type="text"
                  value={welcomeSurname}
                  onChange={(e) => setWelcomeSurname(e.target.value)}
                  placeholder="Wpisz swoje nazwisko..."
                  className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2">
                  Język raportów
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setReportLanguage('pl')}
                    className={`flex-1 px-4 py-3 rounded-lg transition-all font-medium ${
                      reportLanguage === 'pl'
                        ? 'bg-accent-primary text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-80'
                    }`}
                  >
                    🇵🇱 Polski
                  </button>
                  <button
                    onClick={() => setReportLanguage('en')}
                    className={`flex-1 px-4 py-3 rounded-lg transition-all font-medium ${
                      reportLanguage === 'en'
                        ? 'bg-accent-primary text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-80'
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
                <p className="text-text-tertiary text-sm mt-2">
                  ℹ️ Dotyczy tylko nagłówków raportów, nie danych z Excela
                </p>
              </div>
            </div>

            <button
              onClick={handleWelcomeSubmit}
              className="w-full px-4 py-3 gradient-primary text-white rounded-lg hover:opacity-90 transition-all font-semibold"
            >
              Rozpocznij pracę
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
