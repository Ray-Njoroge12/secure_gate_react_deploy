import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  addGuard,
  updateGuard,
  deleteGuard,
  addTrainingRecord,
  checkoutEquipment,
  createGuardShift,
  getAllGuards,
  getEquipmentCheckouts,
  getGuardPerformance,
  getGuardShifts,
  getHandoverNotes,
  getTrainingRecords,
  recordGuardPerformance,
  returnEquipment,
  updateGuardShift
} from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import { useToast } from "../../contexts/ToastContext";
import logger from '../../utils/logger';
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import { ErrorState } from "../../components/ui/EmptyState";

const EQUIPMENT_TYPES = [
  'radio',
  'flashlight',
  'baton',
  'first_aid',
  'keys',
  'tablet'
];

const METRIC_TYPES = [
  'punctuality',
  'professionalism',
  'incident_response',
  'patrol_quality',
  'visitor_management'
];

const TRAINING_TYPES = [
  'security_basics',
  'first_aid',
  'fire_safety',
  'customer_service',
  'conflict_resolution'
];

const SHIFT_TYPES = ['morning', 'afternoon', 'night', 'weekend'];

const formatDate = (date) => new Date(date).toLocaleDateString();
const formatDateTime = (date) => new Date(date).toLocaleString();

const getDefaultShiftDates = () => {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7);
  return {
    start_date: start.toISOString().split('T')[0],
    end_date: end.toISOString().split('T')[0]
  };
};

export default function ManageGuards({ estateId }) {
  const { toast } = useToast();
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState('team');

  // Guard Management State
  const [showGuardModal, setShowGuardModal] = useState(false);
  const [editingGuard, setEditingGuard] = useState(null);
  const [guardForm, setGuardForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'guard',
    status: 'active',
    password: '' // For new guards
  });

  const [shiftFilters, setShiftFilters] = useState(getDefaultShiftDates());
  const [shifts, setShifts] = useState([]);
  const [shiftForm, setShiftForm] = useState({
    guard_id: '',
    shift_type: 'morning',
    start_time: '',
    end_time: '',
    post_location: '',
    notes: ''
  });
  const [editingShift, setEditingShift] = useState(null);

  const [handoverShiftId, setHandoverShiftId] = useState('');
  const [handoverNotes, setHandoverNotes] = useState([]);

  const [performanceForm, setPerformanceForm] = useState({
    guard_id: '',
    shift_id: '',
    metric_type: 'punctuality',
    rating: 3,
    notes: ''
  });
  const [performanceQuery, setPerformanceQuery] = useState({
    guard_id: '',
    start_date: '',
    end_date: ''
  });
  const [performanceData, setPerformanceData] = useState(null);

  const [equipmentForm, setEquipmentForm] = useState({
    guard_id: '',
    shift_id: '',
    equipment_type: 'radio',
    equipment_id: '',
    notes: ''
  });
  const [equipmentFilters, setEquipmentFilters] = useState({
    guard_id: '',
    status: ''
  });
  const [equipmentCheckouts, setEquipmentCheckouts] = useState([]);

  const [trainingForm, setTrainingForm] = useState({
    guard_id: '',
    training_type: 'security_basics',
    training_name: '',
    completion_date: '',
    expiry_date: '',
    certificate_number: '',
    notes: ''
  });
  const [trainingGuardId, setTrainingGuardId] = useState('');
  const [trainingRecords, setTrainingRecords] = useState([]);

  const guardOptions = useMemo(() => guards.map((guard) => ({
    value: guard.id,
    label: `${guard.username || 'Guard'} (${guard.email || guard.phone || 'ID ' + guard.id})`
  })), [guards]);

  const loadGuards = useCallback(async () => {
    try {
      const params = estateId ? { siteId: estateId } : {};
      const data = await getAllGuards(params);
      setGuards(data || []);

    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      logger.error('Failed to load guards:', e);
    } finally {
      setLoading(false);
    }
  }, [estateId]);

  const loadShifts = useCallback(async (filters = shiftFilters) => {
    try {
      const params = {
        ...filters,
        ...(estateId ? { siteId: estateId } : {})
      };
      const data = await getGuardShifts(params);
      setShifts(data || []);
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      logger.error('Failed to load shifts:', e);
    }
  }, [estateId, shiftFilters]);

  const loadEquipment = useCallback(async (filters = equipmentFilters) => {
    try {
      const params = {
        ...filters,
        ...(estateId ? { siteId: estateId } : {})
      };
      const data = await getEquipmentCheckouts(params);
      setEquipmentCheckouts(data || []);
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      logger.error('Failed to load equipment checkouts:', e);
    }
  }, [equipmentFilters, estateId]);

  useEffect(() => {
    loadGuards();
    loadShifts();
    loadEquipment();
  }, [loadGuards, loadShifts, loadEquipment]);

  const handleCreateShift = async (event) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      await createGuardShift({
        ...shiftForm,
        guard_id: Number(shiftForm.guard_id)
      });
      toast?.success?.('Shift created successfully.');
      setShiftForm({
        guard_id: '',
        shift_type: 'morning',
        start_time: '',
        end_time: '',
        post_location: '',
        notes: ''
      });
      await loadShifts();
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      toast?.error?.(errorMsg || 'Failed to create shift');
      logger.error('Failed to create shift:', e);
    }
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
  };

  const handleUpdateShift = async (event) => {
    event.preventDefault();
    if (!editingShift) return;

    setError(null);
    setNotice(null);

    try {
      await updateGuardShift(editingShift.id, {
        guard_id: Number(editingShift.guard_id),
        shift_type: editingShift.shift_type,
        start_time: editingShift.start_time,
        end_time: editingShift.end_time,
        post_location: editingShift.post_location,
        notes: editingShift.notes,
        status: editingShift.status
      });
      toast?.success?.('Shift updated successfully.');
      setEditingShift(null);
      await loadShifts();
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      toast?.error?.(errorMsg || 'Failed to update shift');
      logger.error('Failed to update shift:', e);
    }
  };

  const handleLoadHandoverNotes = async () => {
    if (!handoverShiftId) return;
    setError(null);
    try {
      const data = await getHandoverNotes(handoverShiftId);
      setHandoverNotes(data || []);
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      toast?.error?.(errorMsg || 'Failed to load handover notes');
      logger.error('Failed to load handover notes:', e);
    }
  };

  const handleRecordPerformance = async (event) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      await recordGuardPerformance({
        ...performanceForm,
        guard_id: Number(performanceForm.guard_id),
        shift_id: performanceForm.shift_id ? Number(performanceForm.shift_id) : null,
        rating: Number(performanceForm.rating)
      });
      toast?.success?.('Performance metric recorded.');
      setPerformanceForm({
        guard_id: '',
        shift_id: '',
        metric_type: 'punctuality',
        rating: 3,
        notes: ''
      });
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      toast?.error?.(errorMsg || 'Failed to record performance');
      logger.error('Failed to record performance:', e);
    }
  };

  const handleFetchPerformance = async () => {
    if (!performanceQuery.guard_id) return;
    setError(null);
    try {
      const data = await getGuardPerformance(performanceQuery.guard_id, {
        start_date: performanceQuery.start_date || undefined,
        end_date: performanceQuery.end_date || undefined
      });
      setPerformanceData(data);
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      toast?.error?.(errorMsg || 'Failed to fetch performance');
      logger.error('Failed to fetch performance:', e);
    }
  };

  const handleCheckoutEquipment = async (event) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      await checkoutEquipment({
        ...equipmentForm,
        guard_id: Number(equipmentForm.guard_id),
        shift_id: equipmentForm.shift_id ? Number(equipmentForm.shift_id) : null
      });
      toast?.success?.('Equipment checked out successfully.');
      setEquipmentForm({
        guard_id: '',
        shift_id: '',
        equipment_type: 'radio',
        equipment_id: '',
        notes: ''
      });
      await loadEquipment();
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      toast?.error?.(errorMsg || 'Failed to checkout equipment');
      logger.error('Failed to checkout equipment:', e);
    }
  };

  const handleReturnEquipment = async (checkout) => {
    setError(null);
    setNotice(null);

    try {
      await returnEquipment(checkout.id, {
        guard_id: checkout.guard_id,
        condition: 'good'
      });
      toast?.success?.('Equipment returned successfully.');
      await loadEquipment();
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      toast?.error?.(errorMsg || 'Failed to return equipment');
      logger.error('Failed to return equipment:', e);
    }
  };

  const handleAddTraining = async (event) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      await addTrainingRecord(Number(trainingForm.guard_id), {
        training_type: trainingForm.training_type,
        training_name: trainingForm.training_name,
        completion_date: trainingForm.completion_date,
        expiry_date: trainingForm.expiry_date || null,
        certificate_number: trainingForm.certificate_number || null,
        notes: trainingForm.notes || null
      });
      toast?.success?.('Training record added.');
      setTrainingForm({
        guard_id: '',
        training_type: 'security_basics',
        training_name: '',
        completion_date: '',
        expiry_date: '',
        certificate_number: '',
        notes: ''
      });
      if (trainingGuardId) {
        await handleLoadTrainingRecords(trainingGuardId);
      }
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      toast?.error?.(errorMsg || 'Failed to add training record');
      logger.error('Failed to add training record:', e);
    }
  };

  const handleLoadTrainingRecords = async (guardId) => {
    if (!guardId) return;
    setError(null);
    try {
      const data = await getTrainingRecords(guardId);
      setTrainingRecords(data || []);
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      toast?.error?.(errorMsg || 'Failed to load training records');
      logger.error('Failed to load training records:', e);
    }
  };

  const handleGuardSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingGuard) {
        // Update existing guard - send account_status, not role
        const payload = {
          username: guardForm.username,
          first_name: guardForm.first_name,
          last_name: guardForm.last_name,
          email: guardForm.email,
          phone: guardForm.phone,
          account_status: guardForm.status
        };
        await updateGuard(editingGuard.id, payload);
        toast?.success?.('Guard updated successfully.');
      } else {
        // Create new guard
        await addGuard({
          ...guardForm,
          first_name: guardForm.first_name,
          last_name: guardForm.last_name
        });
        toast?.success?.('Guard created successfully.');
      }

      setShowGuardModal(false);
      setEditingGuard(null);
      setGuardForm({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'guard',
        status: 'active',
        password: ''
      });
      await loadGuards();

    } catch (err) {
      const msg = handleApiError(err);
      setError(msg);
      toast?.error?.(msg || 'Failed to save guard');
    } finally {
      setLoading(false);
    }
  };

  const initEditGuard = (guard) => {
    setEditingGuard(guard);
    setGuardForm({
      username: guard.username || '',
      first_name: guard.first_name || '',
      last_name: guard.last_name || '',
      email: guard.email || '',
      phone: guard.phone || '',
      role: guard.role || 'guard',
      status: guard.status || 'active',
      password: '' // Don't fill password on edit
    });
    setShowGuardModal(true);
  };

  const confirmDeleteGuard = async (guardId) => {
    if (!window.confirm('Are you sure you want to remove this guard account? This action cannot be undone.')) return;

    setLoading(true);
    try {
      await deleteGuard(guardId);
      toast?.success?.('Guard removed successfully.');
      await loadGuards();
    } catch (err) {
      const msg = handleApiError(err);
      setError(msg);
      toast?.error?.(msg || 'Failed to remove guard');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'team', label: 'Team', icon: <Icon name="users" size={18} /> },
    { id: 'shifts', label: 'Shifts', icon: <Icon name="clock" size={18} /> },
    { id: 'performance', label: 'Performance', icon: <Icon name="trending-up" size={18} /> },
    { id: 'equipment', label: 'Equipment', icon: <Icon name="shield" size={18} /> },
    { id: 'training', label: 'Training', icon: <Icon name="book-open" size={18} /> }
  ];



  return (
    <div className="space-y-8">
      {error && (
        <div className="mb-4">
          <ErrorState
            errorMessage={error}
            onRetry={() => {
              setError(null);
              loadGuards();
              loadShifts();
              loadEquipment();
            }}
            compact={true}
          />
        </div>
      )}
      {notice && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
          {notice}
        </div>
      )}

      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex flex-wrap gap-2" role="tablist" aria-label="Guard management sections">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              id={`manage-guards-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`manage-guards-panel-${tab.id}`}
              variant="ghost"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3 py-2 border-b-2 text-sm font-medium rounded-t-md ${activeTab === tab.id
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : (
        <div className="mt-6">
          {/* Team Management Tab */}
          {activeTab === 'team' && (
            <div
              id="manage-guards-panel-team"
              role="tabpanel"
              aria-labelledby="manage-guards-tab-team"
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Team</h2>
                <Button
                  variant="primary"
                  onClick={() => setShowGuardModal(true)}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Icon name="Plus" size={16} />
                  Add Guard
                </Button>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                      <tr>
                        <th className="px-6 py-4 font-medium">Username</th>
                        <th className="px-6 py-4 font-medium">Contact</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium">Last Active</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {guards.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">
                            No guards found. Add your first guard to get started.
                          </td>
                        </tr>
                      ) : (
                        guards.map((guard) => (
                          <tr key={guard.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-bold">
                                  {guard.username ? guard.username.charAt(0).toUpperCase() : 'G'}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{guard.username || 'Unknown Guard'}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-300">ID: {guard.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                  <Icon name="Mail" size={14} />
                                  <span>{guard.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                  <Icon name="Phone" size={14} />
                                  <span>{guard.phone || 'N/A'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${guard.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'
                                }`}>
                                {guard.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                              {guard.last_login ? formatDateTime(guard.last_login) : 'Never'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  onClick={() => initEditGuard(guard)}
                                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400 transition"
                                  aria-label="Edit Guard"
                                >
                                  <Icon name="Edit2" size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => confirmDeleteGuard(guard.id)}
                                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition"
                                  aria-label="Remove Guard"
                                >
                                  <Icon name="Trash2" size={16} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shifts' && (
            <div
              id="manage-guards-panel-shifts"
              role="tabpanel"
              aria-labelledby="manage-guards-tab-shifts"
              className="space-y-6"
            >

              <section className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 rounded-lg p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Shift Scheduling</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-300">Create, review, and update guard shifts.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <label className="text-sm text-slate-600 dark:text-slate-200">Start</label>
                    <input
                      type="date"
                      value={shiftFilters.start_date}
                      onChange={(event) => setShiftFilters((prev) => ({ ...prev, start_date: event.target.value }))}
                      className="border border-slate-200 rounded-md px-2 py-1 text-sm"
                    />
                    <label className="text-sm text-slate-600 dark:text-slate-200">End</label>
                    <input
                      type="date"
                      value={shiftFilters.end_date}
                      onChange={(event) => setShiftFilters((prev) => ({ ...prev, end_date: event.target.value }))}
                      className="border border-slate-200 rounded-md px-2 py-1 text-sm"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => loadShifts(shiftFilters)}
                      className="px-3 py-1 text-sm"
                    >
                      Refresh
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <form onSubmit={handleCreateShift} className="space-y-4">
                    <h3 className="text-md font-semibold text-slate-800">Create Shift</h3>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Guard</label>
                      <select
                        value={shiftForm.guard_id}
                        onChange={(event) => setShiftForm((prev) => ({ ...prev, guard_id: event.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                        required
                      >
                        <option value="">Select guard</option>
                        {guardOptions.map((guard) => (
                          <option key={guard.value} value={guard.value}>{guard.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-200">Shift Type</label>
                        <select
                          value={shiftForm.shift_type}
                          onChange={(event) => setShiftForm((prev) => ({ ...prev, shift_type: event.target.value }))}
                          className="w-full border border-slate-200 rounded-md px-3 py-2"
                        >
                          {SHIFT_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-200">Post</label>
                        <input
                          type="text"
                          value={shiftForm.post_location}
                          onChange={(event) => setShiftForm((prev) => ({ ...prev, post_location: event.target.value }))}
                          className="w-full border border-slate-200 rounded-md px-3 py-2"
                          placeholder="Gate 1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-200">Start Time</label>
                        <input
                          type="datetime-local"
                          value={shiftForm.start_time}
                          onChange={(event) => setShiftForm((prev) => ({ ...prev, start_time: event.target.value }))}
                          className="w-full border border-slate-200 rounded-md px-3 py-2"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-200">End Time</label>
                        <input
                          type="datetime-local"
                          value={shiftForm.end_time}
                          onChange={(event) => setShiftForm((prev) => ({ ...prev, end_time: event.target.value }))}
                          className="w-full border border-slate-200 rounded-md px-3 py-2"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Notes</label>
                      <textarea
                        value={shiftForm.notes}
                        onChange={(event) => setShiftForm((prev) => ({ ...prev, notes: event.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                        rows="3"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                    >
                      Create Shift
                    </Button>
                  </form>

                  <form onSubmit={handleUpdateShift} className="space-y-4">
                    <h3 className="text-md font-semibold text-slate-800">Update Shift</h3>
                    {editingShift ? (
                      <>
                        <div>
                          <label className="block text-sm text-slate-600 dark:text-slate-200">Guard</label>
                          <select
                            value={editingShift.guard_id}
                            onChange={(event) => setEditingShift((prev) => ({ ...prev, guard_id: Number(event.target.value) }))}
                            className="w-full border border-slate-200 rounded-md px-3 py-2"
                          >
                            {guardOptions.map((guard) => (
                              <option key={guard.value} value={guard.value}>{guard.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-slate-600 dark:text-slate-200">Shift Type</label>
                            <select
                              value={editingShift.shift_type}
                              onChange={(event) => setEditingShift((prev) => ({ ...prev, shift_type: event.target.value }))}
                              className="w-full border border-slate-200 rounded-md px-3 py-2"
                            >
                              {SHIFT_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-slate-600 dark:text-slate-200">Status</label>
                            <select
                              value={editingShift.status}
                              onChange={(event) => setEditingShift((prev) => ({ ...prev, status: event.target.value }))}
                              className="w-full border border-slate-200 rounded-md px-3 py-2"
                            >
                              <option value="scheduled">scheduled</option>
                              <option value="cancelled">cancelled</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-slate-600 dark:text-slate-200">Start Time</label>
                            <input
                              type="datetime-local"
                              value={editingShift.start_time}
                              onChange={(event) => setEditingShift((prev) => ({ ...prev, start_time: event.target.value }))}
                              className="w-full border border-slate-200 rounded-md px-3 py-2"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-slate-600 dark:text-slate-200">End Time</label>
                            <input
                              type="datetime-local"
                              value={editingShift.end_time}
                              onChange={(event) => setEditingShift((prev) => ({ ...prev, end_time: event.target.value }))}
                              className="w-full border border-slate-200 rounded-md px-3 py-2"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600 dark:text-slate-200">Notes</label>
                          <textarea
                            value={editingShift.notes}
                            onChange={(event) => setEditingShift((prev) => ({ ...prev, notes: event.target.value }))}
                            className="w-full border border-slate-200 rounded-md px-3 py-2"
                            rows="2"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            variant="primary"
                          >
                            Update Shift
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setEditingShift(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 py-12 text-center border-2 border-dashed border-slate-100 rounded-lg">
                        Select a shift from the list to update its details.
                      </p>
                    )}
                  </form>
                </div>

                <div className="mt-8 overflow-x-auto">
                  <table className="w-full text-left text-sm border-t border-slate-100">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Guard</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Start</th>
                        <th className="px-6 py-3">End</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shifts.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-8 text-center text-slate-400">No shifts scheduled for this period.</td>
                        </tr>
                      ) : (
                        shifts.map((shift) => (
                          <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-700">{shift.guard_name}</td>
                            <td className="px-6 py-4 capitalize">{shift.shift_type}</td>
                            <td className="px-6 py-4">{formatDateTime(shift.start_time)}</td>
                            <td className="px-6 py-4">{formatDateTime(shift.end_time)}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${shift.status === 'scheduled' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                shift.status === 'in_progress' ? 'bg-green-50 text-green-600 border border-green-100' :
                                  shift.status === 'completed' ? 'bg-slate-100 text-slate-600 border border-slate-100' :
                                    'bg-red-50 text-red-600 border border-red-100'
                                }`}>
                                {shift.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => handleEditShift(shift)}
                                className="text-brand-600 hover:text-brand-700 font-semibold"
                                disabled={shift.status !== 'scheduled'}
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Handover Section */}
              <section className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Handover History</h2>
                <div className="flex gap-3 mb-6">
                  <select
                    className="border border-slate-200 rounded-md px-3 py-1.5 text-sm"
                    value={handoverShiftId}
                    onChange={(e) => setHandoverShiftId(e.target.value)}
                  >
                    <option value="">Select shift</option>
                    {shifts.map(s => (
                      <option key={s.id} value={s.id}>{s.guard_name} - {formatDate(s.start_time)}</option>
                    ))}
                  </select>
                  <Button
                    onClick={handleLoadHandoverNotes}
                    className="px-4 py-1.5 text-sm"
                    disabled={!handoverShiftId}
                  >
                    View Notes
                  </Button>
                </div>

                <div className="space-y-4">
                  {handoverNotes.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Select a shift and click 'View Notes' to see handover logs.</p>
                  ) : (
                    handoverNotes.map(note => (
                      <div key={note.id} className="border-l-4 border-brand-500 bg-slate-50 dark:bg-slate-800 p-4 rounded-r-md">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-bold text-slate-700">From: {note.from_guard_name} → To: {note.to_guard_name || 'N/A'}</span>
                          <span className="text-[11px] text-slate-400">{formatDateTime(note.created_at)}</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{note.notes}</p>
                        <div className="grid grid-cols-2 gap-4 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                          <div>Equipment: <span className="text-slate-600">{note.equipment_status}</span></div>
                          <div>Incidents: <span className="text-slate-600">{note.incidents_summary}</span></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'performance' && (
            <div
              id="manage-guards-panel-performance"
              role="tabpanel"
              aria-labelledby="manage-guards-tab-performance"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Record Performance */}
                <section className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Record Assessment</h2>
                  <form onSubmit={handleRecordPerformance} className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Guard</label>
                      <select
                        value={performanceForm.guard_id}
                        onChange={(e) => setPerformanceForm(prev => ({ ...prev, guard_id: e.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                        required
                      >
                        <option value="">Select guard</option>
                        {guardOptions.map(g => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Metric Category</label>
                      <select
                        value={performanceForm.metric_type}
                        onChange={(e) => setPerformanceForm(prev => ({ ...prev, metric_type: e.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                      >
                        {METRIC_TYPES.map(m => (
                          <option key={m} value={m}>{m.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Rating (1-5)</label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={performanceForm.rating}
                        onChange={(e) => setPerformanceForm(prev => ({ ...prev, rating: e.target.value }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-400 px-1">
                        <span>Poor</span>
                        <span>Excellent</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Assessment Notes</label>
                      <textarea
                        value={performanceForm.notes}
                        onChange={(e) => setPerformanceForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                        rows="3"
                      />
                    </div>
                    <Button type="submit" variant="primary">Submit Rating</Button>
                  </form>
                </section>

                {/* View Performance */}
                <section className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Performance Insights</h2>
                  <div className="flex gap-2 mb-6">
                    <select
                      className="border border-slate-200 rounded-md px-3 py-1.5 text-sm"
                      value={performanceQuery.guard_id}
                      onChange={(e) => setPerformanceQuery(prev => ({ ...prev, guard_id: e.target.value }))}
                    >
                      <option value="">Select guard</option>
                      {guardOptions.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                    <Button onClick={handleFetchPerformance} disabled={!performanceQuery.guard_id}>Analyze</Button>
                  </div>

                  {performanceData ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-brand-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-brand-700">{performanceData.statistics.average_rating || 'N/A'}</div>
                          <div className="text-[10px] uppercase font-bold text-brand-500">Avg Rating</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-slate-700">{performanceData.statistics.total_ratings}</div>
                          <div className="text-[10px] uppercase font-bold text-slate-500">Assessments</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {performanceData.metrics.slice(0, 3).map(m => (
                          <div key={m.id} className="text-sm p-3 border border-slate-100 rounded-md">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium capitalize">{m.metric_type.replace('_', ' ')}</span>
                              <span className="font-bold text-brand-600">{m.rating}/5</span>
                            </div>
                            <p className="text-slate-500 text-xs italic">{m.notes}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-20">Select a guard to view performance data.</p>
                  )}
                </section>
              </div>
            </div>
          )}

          {activeTab === 'equipment' && (
            <div
              id="manage-guards-panel-equipment"
              role="tabpanel"
              aria-labelledby="manage-guards-tab-equipment"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Checkout Equipment */}
                <section className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 rounded-lg p-6 lg:col-span-1">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Equipment Checkout</h2>
                  <form onSubmit={handleCheckoutEquipment} className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Guard</label>
                      <select
                        value={equipmentForm.guard_id}
                        onChange={(e) => setEquipmentForm(prev => ({ ...prev, guard_id: e.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                        required
                      >
                        <option value="">Select guard</option>
                        {guardOptions.map(g => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Item Type</label>
                      <select
                        value={equipmentForm.equipment_type}
                        onChange={(e) => setEquipmentForm(prev => ({ ...prev, equipment_type: e.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                      >
                        {EQUIPMENT_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Item S/N or ID</label>
                      <input
                        type="text"
                        value={equipmentForm.equipment_id}
                        onChange={(e) => setEquipmentForm(prev => ({ ...prev, equipment_id: e.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                        placeholder="RADIO-042"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Condition Notes</label>
                      <textarea
                        value={equipmentForm.notes}
                        onChange={(e) => setEquipmentForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                        rows="2"
                      />
                    </div>
                    <Button type="submit" variant="primary" className="w-full">Authorize Checkout</Button>
                  </form>
                </section>

                {/* Equipment Status */}
                <section className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 rounded-lg p-6 lg:col-span-2">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Checkouts</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3">Guard</th>
                          <th className="px-4 py-3">Item</th>
                          <th className="px-4 py-3">Checkout Time</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {equipmentCheckouts.length === 0 ? (
                          <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400">No active checkouts.</td></tr>
                        ) : (
                          equipmentCheckouts.map(c => (
                            <tr key={c.id}>
                              <td className="px-4 py-4">{c.guard_name}</td>
                              <td className="px-4 py-4 capitalize">{c.equipment_type} ({c.equipment_id})</td>
                              <td className="px-4 py-4">{formatDateTime(c.checkout_time)}</td>
                              <td className="px-4 py-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'checked_out' ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-600'}`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                {c.status === 'checked_out' && (
                                  <Button size="xs" variant="secondary" onClick={() => handleReturnEquipment(c)}>Mark Returned</Button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'training' && (
            <section
              id="manage-guards-panel-training"
              role="tabpanel"
              aria-labelledby="manage-guards-tab-training"
              className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Training & Certifications</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-md font-semibold text-slate-800 mb-4">Add Training Record</h3>
                  <form onSubmit={handleAddTraining} className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Guard</label>
                      <select
                        value={trainingForm.guard_id}
                        onChange={(e) => setTrainingForm(prev => ({ ...prev, guard_id: e.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                        required
                      >
                        <option value="">Select guard</option>
                        {guardOptions.map(g => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-200">Category</label>
                        <select
                          value={trainingForm.training_type}
                          onChange={(e) => setTrainingForm(prev => ({ ...prev, training_type: e.target.value }))}
                          className="w-full border border-slate-200 rounded-md px-3 py-2"
                        >
                          {TRAINING_TYPES.map(t => (
                            <option key={t} value={t}>{t.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-200">Certification Name</label>
                        <input
                          type="text"
                          value={trainingForm.training_name}
                          onChange={(e) => setTrainingForm(prev => ({ ...prev, training_name: e.target.value }))}
                          className="w-full border border-slate-200 rounded-md px-3 py-2"
                          placeholder="Fire Marshal Level 1"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-200">Completion Date</label>
                        <input
                          type="date"
                          value={trainingForm.completion_date}
                          onChange={(e) => setTrainingForm(prev => ({ ...prev, completion_date: e.target.value }))}
                          className="w-full border border-slate-200 rounded-md px-3 py-2"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-200">Expiry Date (Optional)</label>
                        <input
                          type="date"
                          value={trainingForm.expiry_date}
                          onChange={(e) => setTrainingForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                          className="w-full border border-slate-200 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>
                    <Button type="submit" variant="primary">Add Certificate</Button>
                  </form>
                </div>

                <div>
                  <h3 className="text-md font-semibold text-slate-800 mb-4">Verification Logs</h3>
                  <div className="flex gap-2 mb-4">
                    <select
                      className="border border-slate-200 rounded-md px-3 py-1.5 text-sm"
                      value={trainingGuardId}
                      onChange={(e) => setTrainingGuardId(e.target.value)}
                    >
                      <option value="">Select guard</option>
                      {guardOptions.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      onClick={() => handleLoadTrainingRecords(trainingGuardId)}
                      disabled={!trainingGuardId}
                    >
                      Load Records
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {trainingRecords.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-300" id="no-training-records">No training records loaded.</p>
                    ) : (
                      trainingRecords.map((record) => (
                        <div key={record.id} className="border border-slate-200 rounded-md p-4">
                          <div className="flex flex-wrap justify-between text-sm text-slate-600 dark:text-slate-200">
                            <span className="font-medium">{record.training_name}</span>
                            <span className="capitalize">{record.status}</span>
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-300">Completed: {formatDate(record.completion_date)}</div>
                          {record.expiry_date && <div className="text-sm text-slate-500 dark:text-slate-300">Expires: {formatDate(record.expiry_date)}</div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
      {/* Guard Modal */}
      {showGuardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingGuard ? 'Edit Guard' : 'Add New Guard'}
              </h2>
              <Button
                variant="ghost"
                onClick={() => setShowGuardModal(false)}
                aria-label="Close"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200"
              >
                <Icon name="X" size={24} />
              </Button>
            </div>

            <form onSubmit={handleGuardSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={guardForm.username}
                    onChange={(e) => setGuardForm({ ...guardForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={guardForm.email}
                    onChange={(e) => setGuardForm({ ...guardForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={guardForm.first_name}
                    onChange={(e) => setGuardForm({ ...guardForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={guardForm.last_name}
                    onChange={(e) => setGuardForm({ ...guardForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={guardForm.phone}
                    onChange={(e) => setGuardForm({ ...guardForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
                {!editingGuard && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={guardForm.password}
                      onChange={(e) => setGuardForm({ ...guardForm, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={guardForm.status}
                    onChange={(e) => setGuardForm({ ...guardForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                <Button
                  variant="secondary"
                  onClick={() => setShowGuardModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={loading}
                  loading={loading}
                >
                  {editingGuard ? 'Update Guard' : 'Create Guard'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
