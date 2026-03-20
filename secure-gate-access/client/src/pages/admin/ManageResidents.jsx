/**
 * @file ManageResidents.jsx
 * @description Modern admin page for managing resident accounts
 * Redesigned for better UX, mobile responsiveness, and accessibility
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, Button, Badge, Input, PageHeader, Skeleton, Modal } from "../../components/ui";
import { SearchFilter, Pagination } from "../../components/ui";
import { getAllResidents, updateResident, deleteResident, createResident } from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import { useSearchData } from "../../hooks/useSearch";
import { useToast } from "../../contexts/ToastContext";
import { useConfirmation } from "../../components/common/ConfirmationDialog";
import { useCurrentRole } from "../../hooks/useCurrentRole";
import logger from 'utils/logger';
import Icon from "../../components/ui/Icon";

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    active: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400', icon: <Icon name="check-circle" className="w-3 h-3" /> },
    inactive: { color: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-200', icon: <Icon name="x-circle" className="w-3 h-3" /> },
    pending: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400', icon: null },
    suspended: { color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400', icon: <Icon name="x-circle" className="w-3 h-3" /> }
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
const ResidentCard = ({ resident, onEdit, onToggle, onDelete, onEmail }) => (
  <Card className="hover:shadow-md transition-shadow dark:border-slate-700">
    <Card.Content className="p-6">
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
                <Icon name="mail" className="w-4 h-4 text-gray-400 dark:text-gray-300" />
                <span className="truncate">{resident.email}</span>
              </div>
            )}
            {resident.phone && (
              <div className="flex items-center gap-2">
                <Icon name="phone" className="w-4 h-4 text-gray-400 dark:text-gray-300" />
                <span>{resident.phone}</span>
              </div>
            )}
            {resident.unit_number && (
              <div className="flex items-center gap-2">
                <Icon name="home" className="w-4 h-4 text-gray-400 dark:text-gray-300" />
                <span>Unit {resident.unit_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(resident)}
            className="p-2 text-gray-500 dark:text-gray-300 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            aria-label={`Edit ${resident.name}`}
          >
            <Icon name="edit" className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEmail(resident)}
            className="p-2 text-gray-500 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            aria-label={`Email ${resident.username}`}
          >
            <Icon name="mail" className="w-4 h-4" />
          </Button>
          {resident.status !== 'inactive' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggle(resident)}
              className="p-2 text-gray-500 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title={resident.status === 'active' ? 'Deactivate' : 'Activate'}
              aria-label={resident.status === 'active' ? 'Deactivate' : 'Activate'}
            >
              <Icon name={resident.status === 'active' ? 'x-circle' : 'check-circle'} className="w-4 h-4" />
            </Button>
          )}

          {/* Delete action - admin only */}
          {true && (
             <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(resident)}
              className="p-2 text-gray-500 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Resident"
              aria-label={`Delete ${resident.username}`}
            >
              <Icon name="trash-2" className="w-4 h-4" />
            </Button>
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
    unit_number: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...formData
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Number</label>
            <input
              type="text"
              value={formData.unit_number}
              onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
              placeholder="e.g., A-101, B-205"
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
    unit_number: '',
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
        unit_number: resident.unit_number || '',
        status: resident.status || 'active'
      });
    }
  }, [resident]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(resident.id, formData);
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Number</label>
            <input
              type="text"
              value={formData.unit_number}
              onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
              placeholder="e.g., A-101, B-205"
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

export default function ManageResidents({ estateId }) {
  const role = useCurrentRole();
  const toast = useToast();
  const { confirm, dialogProps, Dialog: ConfirmDialog } = useConfirmation();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModal, setEditModal] = useState({ open: false, resident: null });
  const [addModal, setAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Search and filter configuration
  const searchFields = ['username', 'email', 'phone', 'unit_number'];
  const filterFields = [
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'pending', 'suspended'] },
    { key: 'unit_number', label: 'Unit Number', type: 'text' }
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

  const estateParams = useMemo(
    () => (estateId ? { siteId: estateId } : {}),
    [estateId]
  );

  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelectResident = (id) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllResidents = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(r => r.id));
    }
  };

  const handleBulkResidentAction = async (action) => {
    const count = selectedUsers.length;
    const actionLabel = action === 'delete' ? 'remove' : action;
    const confirmed = window.confirm(`${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} ${count} resident${count > 1 ? 's' : ''}?`);
    if (!confirmed) return;

    setBulkLoading(true);
    let successes = 0;
    let failures = 0;

    for (const id of selectedUsers) {
      try {
        if (action === 'delete') {
          await deleteResident(id);
        } else {
          await updateResident(id, { status: action === 'activate' ? 'active' : 'inactive' });
        }
        successes++;
      } catch {
        failures++;
      }
    }

    setBulkLoading(false);
    setSelectedUsers([]);

    if (failures === 0) {
      toast?.success(`${successes} resident${successes > 1 ? 's' : ''} ${actionLabel}d successfully.`);
    } else {
      toast?.error(`${successes} succeeded, ${failures} failed.`);
    }
    loadResidents();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
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
      const data = await getAllResidents(estateParams);
      setUsers(data || []);
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      logger.error('Failed to load residents:', e);
      toast?.error?.('Failed to load residents');
    } finally {
      setLoading(false);
    }
  }, [estateParams, toast]);

  useEffect(() => {
    loadResidents();
  }, [loadResidents]);

  const handleAddResident = async (data) => {
    try {
      await createResident(data, estateParams);
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
      await updateResident(id, data, estateParams);
      toast?.success?.('Resident updated successfully');
      loadResidents();
    } catch (e) {
      toast?.error?.('Failed to update resident');
      throw e;
    }
  };

  const handleDeactivate = async (resident) => {
    const ok = await confirm({
      title: 'Deactivate Resident',
      message: `Are you sure you want to deactivate ${resident.username}?`,
      variant: 'warning',
      confirmText: 'Deactivate',
    });
    if (!ok) return;
    
    try {
      await updateResident(resident.id, { status: 'inactive' }, estateParams);
      toast?.success?.(`${resident.username} deactivated successfully.`);
      await loadResidents();
    } catch (err) {
      const msg = handleApiError(err);
      setError(msg);
      toast?.error?.(msg || 'Failed to deactivate resident');
    }
  };

  const handleEmail = (resident) => {
    window.location.href = `mailto:${resident.email}`;
  };

  const handleDeleteResident = async (resident) => {
    const ok = await confirm({
      title: 'Delete Resident',
      message: `Are you sure you want to delete ${resident.username}? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
      requireDoubleConfirm: true,
    });
    if (!ok) return;

    try {
      await deleteResident(resident.id, estateParams);
      toast?.success?.(`${resident.username} deleted successfully.`);
      await loadResidents();
    } catch (err) {
      const msg = handleApiError(err);
      setError(msg);
      toast?.error?.(msg || 'Failed to delete resident');
    }
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Username', 'Email', 'Phone', 'Unit Number', 'Status'],
      ...users.map(u => [u.id, u.username, u.email, u.phone, u.unit_number, u.status])
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
    <div className="space-y-6" data-tour="manage-residents">
      {/* Page Header */}
      <PageHeader
        title="Residents"
        subtitle={`${stats.total} total residents • ${stats.active} active`}
        icon={<Icon name="users" className="w-6 h-6 text-brand-600" />}
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
              <Icon name="download" className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadResidents}
              disabled={loading}
            >
              <Icon name="refresh-cw" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setAddModal(true)}>
              <Icon name="user-plus" className="w-4 h-4 mr-2" />
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
              <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
              <input
                type="search"
                placeholder="Search residents by username, email, phone, or unit number..."
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
              <Icon name="filter" className="w-4 h-4 mr-2" />
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Number</label>
                <input
                  type="text"
                  placeholder="Filter by unit number"
                  value={filters.unit_number || ''}
                  onChange={(e) => setFilters({ ...filters, unit_number: e.target.value })}
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
          <Icon name="x-circle" className="w-5 h-5 flex-shrink-0" />
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
            <Icon name="users" className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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

      {/* Bulk Action Bar */}
      {selectedUsers.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700 rounded-lg">
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">{selectedUsers.length} selected</span>
          <Button variant="ghost" size="sm" onClick={() => handleBulkResidentAction('activate')} disabled={bulkLoading}>Activate</Button>
          <Button variant="ghost" size="sm" onClick={() => handleBulkResidentAction('deactivate')} disabled={bulkLoading}>Deactivate</Button>
          <Button variant="danger" size="sm" onClick={() => handleBulkResidentAction('delete')} disabled={bulkLoading}>Delete</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedUsers([])}>Clear</Button>
          {bulkLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-600" />}
        </div>
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
                      <th className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                          onChange={toggleSelectAllResidents}
                          className="rounded border-gray-300 dark:border-slate-500"
                          aria-label="Select all residents"
                        />
                      </th>
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
                      <tr key={resident.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${selectedUsers.includes(resident.id) ? 'bg-brand-50 dark:bg-brand-900/10' : ''}`}>
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(resident.id)}
                            onChange={() => toggleSelectResident(resident.id)}
                            className="rounded border-gray-300 dark:border-slate-500"
                            aria-label={`Select ${resident.username || 'resident'}`}
                          />
                        </td>
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
                          <div className="text-sm text-gray-900 dark:text-white">Unit {resident.unit_number || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={resident.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(resident)}
                              className="p-2 text-gray-500 dark:text-gray-300 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              aria-label={`Edit ${resident.username}`}
                            >
                              <Icon name="edit" className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEmail(resident)}
                              className="p-2 text-gray-500 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              aria-label={`Email ${resident.name}`}
                            >
                              <Icon name="mail" className="w-4 h-4" />
                            </Button>
                            {resident.status !== 'inactive' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeactivate(resident)}
                                className="p-2 text-gray-500 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label={`Deactivate ${resident.username}`}
                              >
                                <Icon name="trash-2" className="w-4 h-4" />
                              </Button>
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
                onToggle={handleDeactivate}
                onDelete={handleDeleteResident}
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
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
