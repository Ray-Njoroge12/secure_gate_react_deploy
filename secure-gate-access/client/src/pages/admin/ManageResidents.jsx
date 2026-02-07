/**
 * @file ManageResidents.jsx
 * @description Modern admin page for managing resident accounts
 * Redesigned for better UX, mobile responsiveness, and accessibility
 */

import React, { useEffect, useState, useCallback } from "react";
import { Card, Button, Badge, Input, PageHeader, Skeleton, Modal } from "../../components/ui";
import { SearchFilter, Pagination } from "../../components/ui";
import { getAllResidents, updateResident, deleteResident, createResident } from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import { useSearchData } from "../../hooks/useSearch";
import { useToast } from "../../contexts/ToastContext";
import { useConfirmation } from "../../components/common/ConfirmationDialog";
import { useCurrentRole } from "../../hooks/useCurrentRole";
import logger from 'utils/logger';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Phone,
  Home,
  Shield,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download
} from "lucide-react";

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    active: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
    inactive: { color: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-200', icon: <XCircle className="w-3 h-3" /> },
    pending: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400', icon: null },
    suspended: { color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400', icon: <XCircle className="w-3 h-3" /> }
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.inactive;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {status || 'Unknown'}
    </span>
  );
};

// Mobile resident card component
const ResidentCard = ({ resident, onEdit, onDeactivate, onEmail }) => (
  <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:shadow-md dark:hover:shadow-slate-700 transition-shadow">
    <Card.Content className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
              <span className="text-brand-600 font-semibold">
                {(resident.username || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                {resident.username || 'Unknown'}
              </h3>
              <StatusBadge status={resident.status} />
            </div>
          </div>

          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-200">
            {resident.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400 dark:text-gray-300" />
                <span className="truncate">{resident.email}</span>
              </div>
            )}
            {resident.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400 dark:text-gray-300" />
                <span>{resident.phone}</span>
              </div>
            )}
            {(resident.area || resident.house_number) && (
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-gray-400 dark:text-gray-300" />
                <span>{resident.area} {resident.house_number && `- ${resident.house_number}`}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 ml-2">
          <button
            onClick={() => onEdit(resident)}
            className="p-2 text-gray-500 dark:text-gray-300 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            aria-label={`Edit ${resident.name}`}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEmail(resident)}
            className="p-2 text-gray-500 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            aria-label={`Email ${resident.username}`}
          >
            <Mail className="w-4 h-4" />
          </button>
          {resident.status !== 'inactive' && (
            <button
              onClick={() => onDeactivate(resident)}
              className="p-2 text-gray-500 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              aria-label={`Deactivate ${resident.username}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </Card.Content>
  </Card>
);

// Add modal component
const AddResidentModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    unit_number: '',
    house_number: '',
    area: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...formData,
        // Ensure unit_number is populated if house_number is used (legacy vs new)
        unit_number: formData.unit_number || formData.house_number
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Resident">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Area</label>
            <input
              type="text"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit/House Number</label>
            <input
              type="text"
              value={formData.unit_number}
              onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Resident'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Edit modal component
const EditResidentModal = ({ resident, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    area: '',
    unit_number: '',
    house_number: '',
    status: 'active'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (resident) {
      setFormData({
        username: resident.username || '',
        first_name: resident.first_name || '',
        last_name: resident.last_name || '',
        email: resident.email || '',
        phone: resident.phone || '',
        area: resident.area || '',
        unit_number: resident.unit_number || '',
        house_number: resident.house_number || '',
        status: resident.status || 'active'
      });
    }
  }, [resident]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(resident.id, {
        ...formData,
        unit_number: formData.unit_number || formData.house_number
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Resident">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Area</label>
            <input
              type="text"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit/House Number</label>
            <input
              type="text"
              value={formData.unit_number}
              onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default function ManageResidents() {
  const role = useCurrentRole();
  const toast = useToast();
  const confirm = useConfirmation();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModal, setEditModal] = useState({ open: false, resident: null });
  const [addModal, setAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Search and filter configuration
  const searchFields = ['username', 'email', 'phone', 'area', 'house_number'];
  const filterFields = [
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'pending', 'suspended'] },
    { key: 'area', label: 'Area', type: 'text' }
  ];

  const {
    data: filteredUsers,
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
  } = useSearchData(users, searchFields, filterFields, {
    enablePagination: true,
    pageSize: 10
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.querySelector('input[type="search"], input[placeholder*="Search"]')?.focus();
      }
      // Ctrl/Cmd + R to refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        loadResidents();
      }
      // Ctrl/Cmd + N to add new
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setAddModal(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadResidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllResidents();
      setUsers(data || []);
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      logger.error('Failed to load residents:', e);
      toast?.error?.('Failed to load residents');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadResidents();
  }, [loadResidents]);

  const handleAddResident = async (data) => {
    try {
      await createResident(data);
      toast?.success?.('Resident created successfully');
      loadResidents();
    } catch (e) {
      toast?.error?.(e.message || 'Failed to create resident');
      throw e;
    }
  };

  const handleEdit = (resident) => {
    setEditModal({ open: true, resident });
  };

  const handleSaveEdit = async (id, data) => {
    try {
      await updateResident(id, data);
      toast?.success?.('Resident updated successfully');
      loadResidents();
    } catch (e) {
      toast?.error?.('Failed to update resident');
      throw e;
    }
  };

  const handleDeactivate = async (resident) => {
    const confirmed = await confirm?.({
      title: 'Deactivate Resident',
      message: `Are you sure you want to deactivate ${resident.username}? They will no longer be able to log in.`,
      variant: 'danger',
      confirmText: 'Deactivate'
    });

    if (confirmed) {
      try {
        await deleteResident(resident.id);
        toast?.success?.('Resident deactivated');
        loadResidents();
      } catch (e) {
        toast?.error?.('Failed to deactivate resident');
      }
    }
  };

  const handleEmail = (resident) => {
    window.location.href = `mailto:${resident.email}`;
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Username', 'Email', 'Phone', 'Area', 'House Number', 'Status'],
      ...users.map(u => [u.id, u.username, u.email, u.phone, u.area, u.house_number, u.status])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `residents_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast?.success?.('Export downloaded');
  };

  // Stats
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    pending: users.filter(u => u.status === 'pending').length
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Residents"
        subtitle={`${stats.total} total residents • ${stats.active} active`}
        icon={<Users className="w-6 h-6 text-brand-600" />}
        showBack={true}
        backTo="/dashboard/admin"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="hidden sm:flex"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadResidents}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setAddModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Resident</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        }
      />

      {/* Stats Cards - Mobile horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4">
        <div className="flex-shrink-0 w-32 sm:w-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.total}</div>
          <div className="text-xs text-gray-500 dark:text-slate-300">Total</div>
        </div>
        <div className="flex-shrink-0 w-32 sm:w-auto bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</div>
          <div className="text-xs text-green-600 dark:text-green-400">Active</div>
        </div>
        <div className="flex-shrink-0 w-32 sm:w-auto bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-500 dark:text-slate-200">{stats.inactive}</div>
          <div className="text-xs text-gray-500 dark:text-slate-300">Inactive</div>
        </div>
        <div className="flex-shrink-0 w-32 sm:w-auto bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400">Pending</div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white dark:bg-slate-800">
        <Card.Content className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
              <input
                type="search"
                placeholder="Search residents by username, email, phone, or area..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={hasFilters ? 'border-brand-500 text-brand-600' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasFilters && <span className="ml-2 w-2 h-2 bg-brand-500 rounded-full"></span>}
            </Button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Area</label>
                <input
                  type="text"
                  placeholder="Filter by area"
                  value={filters.area || ''}
                  onChange={(e) => setFilters({ ...filters, area: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex items-end">
                <Button variant="ghost" onClick={clearFilters} className="w-full sm:w-auto">
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={loadResidents} className="ml-auto">
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredUsers.length === 0 && (
        <Card className="bg-white dark:bg-slate-800">
          <Card.Content className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {hasFilters || searchTerm ? 'No residents found' : 'No residents yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-300 mb-4">
              {hasFilters || searchTerm
                ? 'Try adjusting your search or filters'
                : 'Add your first resident to get started'
              }
            </p>
            {(hasFilters || searchTerm) && (
              <Button variant="outline" onClick={() => { clearFilters(); setSearchTerm(''); }}>
                Clear Search
              </Button>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Desktop Table */}
      {!loading && !error && filteredUsers.length > 0 && (
        <>
          <div className="hidden md:block">
            <Card className="bg-white dark:bg-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Resident
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {filteredUsers.map((resident) => (
                      <tr key={resident.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                              <span className="text-brand-600 font-semibold">
                                {(resident.username || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {resident.first_name ? `${resident.first_name} ${resident.last_name}` : resident.username}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-300">
                                @{resident.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{resident.email || '-'}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">{resident.phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{resident.area || '-'}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">{resident.house_number || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={resident.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(resident)}
                              className="p-2 text-gray-500 dark:text-gray-300 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              aria-label={`Edit ${resident.username}`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEmail(resident)}
                              className="p-2 text-gray-500 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              aria-label={`Email ${resident.name}`}
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            {resident.status !== 'inactive' && (
                              <button
                                onClick={() => handleDeactivate(resident)}
                                className="p-2 text-gray-500 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label={`Deactivate ${resident.username}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredUsers.map((resident) => (
              <ResidentCard
                key={resident.id}
                resident={resident}
                onEdit={handleEdit}
                onDeactivate={handleDeactivate}
                onEmail={handleEmail}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      <EditResidentModal
        resident={editModal.resident}
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, resident: null })}
        onSave={handleSaveEdit}
      />

      {/* Add Modal */}
      <AddResidentModal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        onSave={handleAddResident}
      />
    </div>
  );
}