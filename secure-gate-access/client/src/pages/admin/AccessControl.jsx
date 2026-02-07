/**
 * @file AccessControl.jsx
 * @description Modern admin page for managing access control cards and zones
 * Redesigned for better UX, mobile responsiveness, and accessibility
 */

import React, { useEffect, useState, useCallback } from "react";
import AppShell from "../../layouts/AppShell";
import { Card, Button, Badge, Input, PageHeader, Skeleton, Modal } from "../../components/ui";
import { SearchFilter, Pagination } from "../../components/ui";
import { getAccessLogs } from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import { useSearchData } from "../../hooks/useSearch";
import { useToast } from "../../contexts/ToastContext";
import { useConfirmation } from "../../components/common/ConfirmationDialog";
import { useCurrentRole } from "../../hooks/useCurrentRole";
import logger from 'utils/logger';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  MapPin,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  UserPlus,
  Lock,
  Unlock,
  AlertTriangle
} from "lucide-react";

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    active: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" />, label: 'Active' },
    inactive: { color: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-200', icon: <XCircle className="w-3 h-3" />, label: 'Inactive' },
    suspended: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: <AlertTriangle className="w-3 h-3" />, label: 'Suspended' },
    lost: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: <AlertTriangle className="w-3 h-3" />, label: 'Lost' },
  };
  
  const config = statusConfig[status?.toLowerCase()] || statusConfig.inactive;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

// Zone badge component
const ZoneBadge = ({ zone }) => {
  const zoneColors = {
    'Main Gate': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'Side Gate': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'Parking': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    'Pool Area': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    'Gym': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    'Clubhouse': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${zoneColors[zone] || 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'}`}>
      <MapPin className="w-3 h-3" />
      {zone || 'Unknown'}
    </span>
  );
};

// Mobile card component
const AccessCardItem = ({ card, onEdit, onDisable, onAssign }) => (
  <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow">
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                {card.id || 'Card ID'}
              </h3>
              <StatusBadge status={card.status} />
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Shield className="w-4 h-4" />
              <span className="truncate">{card.holder || 'Unassigned'}</span>
            </div>
            <div className="flex items-center gap-2">
              <ZoneBadge zone={card.zone} />
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col gap-2 ml-3">
          <button 
            onClick={() => onEdit(card)}
            className="p-2 text-gray-500 dark:text-gray-300 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
            aria-label={`Edit card ${card.id}`}
          >
            <Edit className="w-4 h-4" />
          </button>
          {card.status === 'active' ? (
            <button 
              onClick={() => onDisable(card)}
              className="p-2 text-gray-500 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              aria-label={`Disable card ${card.id}`}
            >
              <Lock className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={() => onDisable(card)}
              className="p-2 text-gray-500 dark:text-gray-300 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              aria-label={`Enable card ${card.id}`}
            >
              <Unlock className="w-4 h-4" />
            </button>
          )}
          {!card.holder && (
            <button 
              onClick={() => onAssign(card)}
              className="p-2 text-gray-500 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              aria-label={`Assign card ${card.id}`}
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  </Card>
);

// Edit/Assign Modal
const CardModal = ({ card, isOpen, onClose, onSave, mode = 'edit' }) => {
  const [formData, setFormData] = useState({
    holder: '',
    zone: '',
    status: 'active'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setFormData({
        holder: card.holder || '',
        zone: card.zone || '',
        status: card.status || 'active'
      });
    }
  }, [card]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(card?.id, formData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const zones = ['Main Gate', 'Side Gate', 'Parking', 'Pool Area', 'Gym', 'Clubhouse'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'assign' ? 'Assign Card' : 'Edit Access Card'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Card ID
          </label>
          <input
            type="text"
            value={card?.id || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Card Holder
          </label>
          <input
            type="text"
            value={formData.holder}
            onChange={(e) => setFormData({ ...formData, holder: e.target.value })}
            placeholder="Enter resident name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-slate-800 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Access Zone
          </label>
          <select
            value={formData.zone}
            onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Select zone...</option>
            {zones.map(zone => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
        </div>
        
        {mode !== 'assign' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-slate-800 dark:text-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        )}
        
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white"
          >
            {saving ? 'Saving...' : mode === 'assign' ? 'Assign Card' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Stats card component
const StatsCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-300">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

export default function AccessControl() {
  const role = useCurrentRole();
  const toast = useToast();
  const confirm = useConfirmation();
  
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [modalMode, setModalMode] = useState('edit');
  const [refreshing, setRefreshing] = useState(false);

  // Search and filter configuration
  const searchFields = ['id', 'holder', 'zone', 'status'];
  const filterFields = [
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'suspended', 'lost'] },
    { key: 'zone', label: 'Zone', type: 'select', options: ['Main Gate', 'Side Gate', 'Parking', 'Pool Area', 'Gym', 'Clubhouse'] },
  ];

  // Use search hook
  const {
    data: filteredCards,
    pagination,
    searchTerm,
    filters,
    setSearchTerm,
    setFilters,
    clearFilters,
    setPage,
    isSearching,
    hasFilters,
    hasResults
  } = useSearchData(cards, searchFields, filterFields, {
    enablePagination: true,
    pageSize: 12
  });

  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAccessLogs();
      setCards(data || []);
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      logger.error('Failed to load access cards:', e);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCards();
    setRefreshing(false);
    toast?.success({ title: 'Refreshed', message: 'Access cards updated' });
  };

  const handleEdit = (card) => {
    setModalMode('edit');
    setEditingCard(card);
  };

  const handleAssign = (card) => {
    setModalMode('assign');
    setEditingCard(card);
  };

  const handleDisable = async (card) => {
    const action = card.status === 'active' ? 'disable' : 'enable';
    const confirmed = await confirm?.({
      variant: action === 'disable' ? 'warning' : 'info',
      title: `${action === 'disable' ? 'Disable' : 'Enable'} Access Card?`,
      message: `Are you sure you want to ${action} card ${card.id}${card.holder ? ` (${card.holder})` : ''}?`,
      confirmText: action === 'disable' ? 'Disable' : 'Enable',
    });

    if (confirmed) {
      // API call would go here
      toast?.success({ 
        title: `Card ${action === 'disable' ? 'Disabled' : 'Enabled'}`, 
        message: `Card ${card.id} has been ${action}d` 
      });
      fetchCards();
    }
  };

  const handleSaveCard = async (cardId, data) => {
    // API call would go here
    toast?.success({ 
      title: modalMode === 'assign' ? 'Card Assigned' : 'Card Updated', 
      message: `Card ${cardId} has been ${modalMode === 'assign' ? 'assigned' : 'updated'}` 
    });
    setEditingCard(null);
    fetchCards();
  };

  const handleExport = () => {
    toast?.info({ title: 'Exporting', message: 'Preparing CSV export...' });
    // Export logic would go here
  };

  // Calculate stats
  const stats = {
    total: cards.length,
    active: cards.filter(c => c.status === 'active').length,
    assigned: cards.filter(c => c.holder).length,
    suspended: cards.filter(c => c.status === 'suspended' || c.status === 'lost').length,
  };

  return (
    <AppShell role={role} title="Access Control">
      <PageHeader 
        title="Access Control"
        subtitle="Manage access cards and zone permissions"
        icon={<CreditCard className="w-6 h-6 text-brand-600 dark:text-brand-400" />}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="hidden sm:flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              className="hidden sm:flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button className="bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Card</span>
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard title="Total Cards" value={stats.total} icon={CreditCard} color="bg-blue-500" />
          <StatsCard title="Active" value={stats.active} icon={CheckCircle} color="bg-green-500" />
          <StatsCard title="Assigned" value={stats.assigned} icon={Shield} color="bg-purple-500" />
          <StatsCard title="Suspended/Lost" value={stats.suspended} icon={AlertTriangle} color="bg-amber-500" />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-medium text-red-800 dark:text-red-200">Error Loading Data</h3>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
              <Button variant="outline" onClick={fetchCards} className="ml-auto">
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                <input
                  type="text"
                  placeholder="Search by card ID, holder, or zone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-slate-700 dark:text-white"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasFilters && (
                <span className="w-2 h-2 bg-brand-500 rounded-full" />
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <SearchFilter
                data={cards}
                searchFields={searchFields}
                filterFields={filterFields}
                onSearch={setSearchTerm}
                onFilter={setFilters}
                showAdvanced={true}
              />
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-2 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:text-gray-300"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          )}

          {/* Results summary */}
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            {isSearching || hasFilters ? (
              <>Showing {filteredCards.length} of {cards.length} cards</>
            ) : (
              <>Total: {cards.length} access cards</>
            )}
          </div>
        </div>

        {/* Cards Grid/List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : hasResults ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCards.map((card) => (
                <AccessCardItem
                  key={card.id}
                  card={card}
                  onEdit={handleEdit}
                  onDisable={handleDisable}
                  onAssign={handleAssign}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
            <CreditCard className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-200 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {isSearching || hasFilters ? 'No cards found' : 'No access cards'}
            </h3>
            <p className="text-gray-500 dark:text-gray-300 mb-4">
              {isSearching || hasFilters 
                ? 'Try adjusting your search or filters'
                : 'Add your first access card to get started'
              }
            </p>
            {(isSearching || hasFilters) ? (
              <Button variant="outline" onClick={() => { setSearchTerm(''); clearFilters(); }}>
                Clear search and filters
              </Button>
            ) : (
              <Button className="bg-brand-600 hover:bg-brand-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add First Card
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Edit/Assign Modal */}
      <CardModal
        card={editingCard}
        isOpen={!!editingCard}
        onClose={() => setEditingCard(null)}
        onSave={handleSaveCard}
        mode={modalMode}
      />
    </AppShell>
  );
}
