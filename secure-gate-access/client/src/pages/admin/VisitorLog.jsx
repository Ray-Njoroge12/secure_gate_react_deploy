import React, { useState, useEffect } from 'react';
import {
  getVisitorLogs,
  checkInVisitor,
  checkOutVisitor,
  getVisitorDetails
} from '../../services/adminService';
import Table from '../../components/ui/ResponsiveTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import PasswordConfirmationModal from '../../components/common/PasswordConfirmationModal';
import VisitorDetailsModal from '../../components/admin/VisitorDetailsModal';
import Icon from '../../components/ui/Icon';
import { ErrorState } from '../../components/ui/EmptyState';
import { handleApiError } from '../../utils/errorMapper';
import { maskAccessCode } from '../../utils/formatters';

const VisitorLog = ({ estateId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [actionDialog, setActionDialog] = useState({
    isOpen: false,
    type: null, // 'check-in' | 'check-out'
    visitor: null
  });
  const [processingId, setProcessingId] = useState(null);

  const { toast } = useToast();
  const { verifyPassword } = useAuth(); // for completeness, though modal handles it

  // Secure Reveal State
  const [passwordModal, setPasswordModal] = useState({ open: false, type: null, targetId: null });
  const [detailsModal, setDetailsModal] = useState({ open: false, visitor: null });

  const handleViewDetails = (visitor) => {
    setPasswordModal({ open: true, type: 'view_details', targetId: visitor.id });
  };

  const handlePasswordConfirmed = async () => {
    try {
      const { targetId } = passwordModal;
      // Fetch full details (unmasked)
      const response = await getVisitorDetails(targetId);
      const visitorDetails = response.data || response;

      setDetailsModal({ open: true, visitor: visitorDetails });
      setPasswordModal({ open: false, type: null, targetId: null });
    } catch (err) {
      toast?.error?.(handleApiError(err) || 'Failed to fetch visitor details');
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filter
      };
      if (estateId) params.estateId = estateId;

      const response = await getVisitorLogs(params);
      // Handle various response data structures
      const data = response.data || response;

      setLogs(Array.isArray(data) ? data : (data.data || []));
      // Update pagination if provided in response
      if (data.pagination) {
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
      setError(null);
    } catch (err) {
      setError(handleApiError(err) || 'Failed to load visitor logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filter, estateId]);

  const handleAction = (type, visitor) => {
    setActionDialog({ isOpen: true, type, visitor });
  };

  const confirmAction = async () => {
    const { type, visitor } = actionDialog;
    if (!visitor) return;

    setProcessingId(visitor.id);
    try {
      if (type === 'check-in') {
        await checkInVisitor(visitor.id);
        toast?.success?.(`${visitor.name} checked in successfully`);
      } else {
        await checkOutVisitor(visitor.id);
        toast?.success?.(`${visitor.name} checked out successfully`);
      }
      fetchLogs();
    } catch (err) {
      toast?.error?.(handleApiError(err) || `Failed to ${type} visitor`);
    } finally {
      setProcessingId(null);
      setActionDialog({ isOpen: false, type: null, visitor: null });
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Visitor',
      priority: 1
    },
    {
      key: 'host',
      label: 'Host',
      priority: 2,
      render: (value, row) => row.host_name || row.host || '-'
    },
    {
      key: 'access_code',
      label: 'Access Code',
      priority: 4,
      render: (value) => maskAccessCode(value)
    },
    {
      key: 'status',
      label: 'Status',
      priority: 1,
      render: (value, row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${value === 'checked_in' ? 'bg-green-100 text-green-800' :
          value === 'checked_out' ? 'bg-gray-100 text-gray-800' :
            value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
          }`}>
          {value?.replace('_', ' ').toUpperCase()}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Visit Date',
      priority: 3,
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'time',
      label: 'Time',
      priority: 2,
      render: (value, row) => {
        if (row.checkOutTime || row.check_out) return `Out: ${new Date(row.checkOutTime || row.check_out).toLocaleTimeString()}`;
        if (row.checkInTime || row.check_in) return `In: ${new Date(row.checkInTime || row.check_in).toLocaleTimeString()}`;
        return '-';
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      priority: 1,
      render: (value, visitor) => (
        <div className="flex gap-2">
          {visitor.status === 'approved' || visitor.status === 'verified' ? (
            <Button
              size="xs"
              variant="primary"
              onClick={() => handleAction('check-in', visitor)}
              disabled={processingId === visitor.id}
            >
              Check In
            </Button>
          ) : null}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => handleViewDetails(visitor)}
            title="View Details"
          >
            <Icon name="eye" className="w-4 h-4" />
          </Button>
          {visitor.status === 'checked_in' ? (
            <Button
              size="xs"
              variant="secondary"
              onClick={() => handleAction('check-out', visitor)}
              disabled={processingId === visitor.id}
            >
              Check Out
            </Button>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
        <Input
          placeholder="Search visitor, host..."
          value={filter.search}
          onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value, page: 1 }))}
          className="max-w-xs"
        />
        <select
          className="rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
          value={filter.status}
          onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value, page: 1 }))}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
        </select>
      </div>

      {error ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-lg shadow-sm">
          <ErrorState
            errorMessage={error}
            onRetry={fetchLogs}
          />
        </div>
      ) : (
        <Table
          columns={columns}
          data={logs}
          loading={loading}
          emptyMessage="No visitor logs found."
        />
      )}

      {/* Pagination Controls could go here if Table doesn't support them internally */}
      {/* Simple Pagination */}
      <div className="flex justify-between items-center px-4">
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page <= 1}
          onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
        >
          Previous
        </Button>
        <span className="text-sm text-gray-500">Page {pagination.page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={logs.length < pagination.limit} // Approximation
          onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
        >
          Next
        </Button>
      </div>

      {actionDialog.isOpen && (
        <ConfirmationDialog
          isOpen={actionDialog.isOpen}
          onClose={() => setActionDialog({ isOpen: false, type: null, visitor: null })}
          onConfirm={confirmAction}
          title={actionDialog.type === 'check-in' ? 'Check In Visitor' : 'Check Out Visitor'}
          message={`Are you sure you want to ${actionDialog.type?.replace('-', ' ')} ${actionDialog.visitor?.name}?`}
          confirmText={actionDialog.type === 'check-in' ? 'Check In' : 'Check Out'}
          variant={actionDialog.type === 'check-in' ? 'success' : 'warning'}
          isLoading={!!processingId}
        />
      )}


      <PasswordConfirmationModal
        isOpen={passwordModal.open}
        onClose={() => setPasswordModal({ open: false, type: null, targetId: null })}
        onConfirm={handlePasswordConfirmed}
        title="Confirm Identity to View Visitor Details"
        message="Please enter your password to view unmasked visitor information."
      />

      <VisitorDetailsModal
        isOpen={detailsModal.open}
        onClose={() => setDetailsModal({ open: false, visitor: null })}
        visitor={detailsModal.visitor}
      />
    </div>
  );
};

export default VisitorLog;
