import React, { useState, useEffect } from 'react';
import {
  Archive as ArchiveIcon,
  ArrowLeft,
  Search,
  Grid3x3,
  LayoutGrid,
  List,
  Package,
  Clock,
  CheckCircle2,
  Undo2,
  Trash2,
  Lock,
  X,
} from 'lucide-react';
import { Shipment } from '../types/shipment';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'table' | 'small-cards' | 'large-cards';

const Archive: React.FC = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [indexSearch, setIndexSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('large-cards');
  const [shipmentParts, setShipmentParts] = useState<{ [shipmentId: number]: any[] }>({});

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; shipment: Shipment | null }>({ open: false, shipment: null });
  const [deletePassword, setDeletePassword] = useState('');

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
        loadShipments();
      } else {
        alert('❌ Błąd przywracania wysyłki');
      }
    } catch (error) {
      console.error('Error unarchiving shipment:', error);
      alert('❌ Błąd przywracania wysyłki');
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-accent-success" />;
      default:
        return <Clock className="w-4 h-4 text-accent-primary" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ukończona';
      default:
        return 'W trakcie';
    }
  };

  // Filter shipments based on search
  const filteredShipments = shipments.filter(shipment => {
    // General search (by number or destination)
    const matchesGeneralSearch =
      shipment.shipment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(searchQuery.toLowerCase());

    // Index search (search in parts)
    let matchesIndexSearch = true;
    if (indexSearch.trim()) {
      const parts = shipmentParts[shipment.id] || [];
      matchesIndexSearch = parts.some(part =>
        part.sap_index.toLowerCase().includes(indexSearch.toLowerCase())
      );
    }

    return matchesGeneralSearch && matchesIndexSearch;
  });

  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-bg-tertiary sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Nr wysyłki</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Miejsce docelowe</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Data utworzenia</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Części</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary">Akcje</th>
          </tr>
        </thead>
        <tbody>
          {filteredShipments.map((shipment) => {
            const parts = shipmentParts[shipment.id] || [];
            const totalParts = parts.length;
            const packedParts = parts.filter(p => p.status === 'packed').length;

            return (
              <tr
                key={shipment.id}
                className="border-b border-bg-tertiary hover:bg-bg-tertiary/50 transition-colors"
              >
                <td className="px-4 py-3 text-sm font-semibold text-text-primary">
                  {shipment.shipment_number}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {shipment.destination}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(shipment.status)}
                    <span className="text-xs text-text-secondary">{getStatusText(shipment.status)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-text-tertiary">
                  {format(new Date(shipment.created_at), 'dd MMM yyyy', { locale: pl })}
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {packedParts}/{totalParts}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={(e) => handleUnarchiveClick(shipment, e)}
                      className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-all"
                      title="Przywróć z archiwum"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(shipment, e)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                      title="Usuń"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderSmallCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {filteredShipments.map((shipment) => {
        const parts = shipmentParts[shipment.id] || [];
        const totalParts = parts.length;
        const packedParts = parts.filter(p => p.status === 'packed').length;
        const progress = totalParts > 0 ? (packedParts / totalParts) * 100 : 0;

        return (
          <div
            key={shipment.id}
            className="bg-bg-tertiary rounded-lg p-3 hover:bg-opacity-80 transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(shipment.status)}
              <span className="text-xs text-text-tertiary truncate flex-1">
                {format(new Date(shipment.created_at), 'dd MMM yyyy', { locale: pl })}
              </span>
            </div>

            <h3 className="text-sm font-bold text-text-primary mb-1 truncate">
              {shipment.shipment_number}
            </h3>

            <p className="text-xs text-text-secondary mb-2 truncate">
              {shipment.destination}
            </p>

            {totalParts > 0 && (
              <div className="mb-2">
                <div className="h-1 bg-bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-primary to-green-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-1">
              <button
                onClick={(e) => handleUnarchiveClick(shipment, e)}
                className="flex-1 p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded transition-all"
                title="Przywróć"
              >
                <Undo2 className="w-3 h-3 mx-auto" />
              </button>
              <button
                onClick={(e) => handleDeleteClick(shipment, e)}
                className="flex-1 p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded transition-all"
                title="Usuń"
              >
                <Trash2 className="w-3 h-3 mx-auto" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderLargeCards = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {filteredShipments.map((shipment) => {
        const parts = shipmentParts[shipment.id] || [];
        const totalParts = parts.length;
        const packedParts = parts.filter(p => p.status === 'packed').length;
        const progress = totalParts > 0 ? (packedParts / totalParts) * 100 : 0;

        return (
          <div
            key={shipment.id}
            className="bg-bg-tertiary rounded-xl p-6 hover:bg-opacity-80 transition-all"
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
              {shipment.destination}
            </p>

            {shipment.notes && (
              <p className="text-text-tertiary text-xs mb-4 line-clamp-2">
                {shipment.notes}
              </p>
            )}

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
                    className="h-full bg-gradient-to-r from-accent-primary to-green-400 rounded-full transition-all duration-500"
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

            <div className="flex gap-2 mt-4 pt-4 border-t border-bg-secondary">
              <button
                onClick={(e) => handleUnarchiveClick(shipment, e)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-all text-sm"
              >
                <Undo2 className="w-4 h-4" />
                Przywróć
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
  );

  return (
    <div className="flex flex-col w-full h-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-bg-secondary border-b border-bg-tertiary px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                🗄️ Archiwum Wysyłek
              </h1>
              <p className="text-text-secondary">
                Przeglądaj i zarządzaj zarchiwizowanymi wysyłkami
              </p>
            </div>
          </div>

          {/* View mode switcher */}
          <div className="flex gap-2 bg-bg-tertiary rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded transition-all ${
                viewMode === 'table'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Widok tabeli"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('small-cards')}
              className={`p-2 rounded transition-all ${
                viewMode === 'small-cards'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Małe kafelki"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('large-cards')}
              className={`p-2 rounded transition-all ${
                viewMode === 'large-cards'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Duże kafelki"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Szukaj po numerze wysyłki lub miejscu docelowym..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors"
            />
          </div>
          <div className="relative">
            <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Szukaj po indeksie SAP..."
              value={indexSearch}
              onChange={(e) => setIndexSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-text-secondary">Ładowanie archiwum...</p>
            </div>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <ArchiveIcon className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary text-lg mb-2">
                {searchQuery || indexSearch ? 'Nie znaleziono wysyłek' : 'Brak zarchiwizowanych wysyłek'}
              </p>
              <p className="text-text-tertiary text-sm">
                {searchQuery || indexSearch
                  ? 'Spróbuj zmienić kryteria wyszukiwania'
                  : 'Zarchiwizowane wysyłki pojawią się tutaj'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'table' && renderTableView()}
            {viewMode === 'small-cards' && renderSmallCards()}
            {viewMode === 'large-cards' && renderLargeCards()}
          </>
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

export default Archive;
