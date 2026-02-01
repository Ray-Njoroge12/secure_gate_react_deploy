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
import logger from '../../utils/logger';
import {
  Users,
  Clock,
  TrendingUp,
  Shield,
  BookOpen,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
  User,
  Lock,
  X
} from 'lucide-react';

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
  }, []);

  const loadShifts = useCallback(async (filters = shiftFilters) => {
    try {
      const data = await getGuardShifts(filters);
      setShifts(data || []);
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      logger.error('Failed to load shifts:', e);
    }
  }, [shiftFilters]);

  const loadEquipment = useCallback(async (filters = equipmentFilters) => {
    try {
      const data = await getEquipmentCheckouts(filters);
      setEquipmentCheckouts(data || []);
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      logger.error('Failed to load equipment checkouts:', e);
    }
  }, [equipmentFilters]);

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
      setNotice('Shift created successfully.');
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
      setNotice('Shift updated successfully.');
      setEditingShift(null);
      await loadShifts();
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
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
      setNotice('Performance metric recorded.');
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
      setNotice('Equipment checked out successfully.');
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
      setNotice('Equipment returned successfully.');
      await loadEquipment();
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
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
      setNotice('Training record added.');
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
      logger.error('Failed to load training records:', e);
    }
  };

  const handleGuardSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingGuard) {
        // Update existing guard
        const payload = {
          username: guardForm.username,
          first_name: guardForm.first_name,
          last_name: guardForm.last_name,
          email: guardForm.email,
          phone: guardForm.phone,
          status: guardForm.status,
          role: guardForm.role
        };
        await updateGuard(editingGuard.id, payload);
        setNotice('Guard updated successfully.');
      } else {
        // Create new guard
        await addGuard({
          ...guardForm,
          first_name: guardForm.first_name,
          last_name: guardForm.last_name
        });
        setNotice('Guard created successfully.');
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
      setNotice('Guard removed successfully.');
      await loadGuards();
    } catch (err) {
      const msg = handleApiError(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'team', label: 'Team', icon: <Users size={18} /> },
    { id: 'shifts', label: 'Shifts', icon: <Clock size={18} /> },
    { id: 'performance', label: 'Performance', icon: <TrendingUp size={18} /> },
    { id: 'equipment', label: 'Equipment', icon: <Shield size={18} /> },
    { id: 'training', label: 'Training', icon: <BookOpen size={18} /> }
  ];



  return (
    <div className="space-y-8">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}
      {/* Content Area */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : (
        <div className="mt-6">
          {/* Team Management Tab */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Team</h2>
                <button
                  onClick={() => setShowGuardModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  Add Guard
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                      <tr>
                        <th className="px-6 py-4 font-medium">Username</th>
                        <th className="px-6 py-4 font-medium">Contact</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium">Last Active</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {guards.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            No guards found. Add your first guard to get started.
                          </td>
                        </tr>
                      ) : (
                        guards.map((guard) => (
                          <tr key={guard.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-bold">
                                  {guard.username ? guard.username.charAt(0).toUpperCase() : 'G'}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{guard.username || 'Unknown Guard'}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">ID: {guard.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                  <Mail size={14} />
                                  <span>{guard.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                  <Phone size={14} />
                                  <span>{guard.phone || 'N/A'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${guard.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                {guard.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                              {guard.last_login ? formatDateTime(guard.last_login) : 'Never'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => initEditGuard(guard)}
                                  className="p-2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition"
                                  title="Edit Guard"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => confirmDeleteGuard(guard.id)}
                                  className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition"
                                  title="Remove Guard"
                                >
                                  <Trash2 size={16} />
                                </button>
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
            <div className="space-y-6">

              <section className="bg-white shadow-sm border border-slate-200 rounded-lg p-6">
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
                    <button
                      type="button"
                      onClick={() => loadShifts(shiftFilters)}
                      className="px-3 py-1 bg-slate-900 text-white rounded-md text-sm"
                    >
                      Refresh
                    </button>
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
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md"
                    >
                      Create Shift
                    </button>
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
                              value={editingShift.start_time ? editingShift.start_time.slice(0, 16) : ''}
                              onChange={(event) => setEditingShift((prev) => ({ ...prev, start_time: event.target.value }))}
                              className="w-full border border-slate-200 rounded-md px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-slate-600 dark:text-slate-200">End Time</label>
                            <input
                              type="datetime-local"
                              value={editingShift.end_time ? editingShift.end_time.slice(0, 16) : ''}
                              onChange={(event) => setEditingShift((prev) => ({ ...prev, end_time: event.target.value }))}
                              className="w-full border border-slate-200 rounded-md px-3 py-2"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600 dark:text-slate-200">Post</label>
                          <input
                            type="text"
                            value={editingShift.post_location || ''}
                            onChange={(event) => setEditingShift((prev) => ({ ...prev, post_location: event.target.value }))}
                            className="w-full border border-slate-200 rounded-md px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600 dark:text-slate-200">Notes</label>
                          <textarea
                            value={editingShift.notes || ''}
                            onChange={(event) => setEditingShift((prev) => ({ ...prev, notes: event.target.value }))}
                            className="w-full border border-slate-200 rounded-md px-3 py-2"
                            rows="3"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-md">Save Changes</button>
                          <button type="button" onClick={() => setEditingShift(null)} className="px-4 py-2 border border-slate-200 rounded-md">Cancel</button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-300">Select a shift from the table below to edit scheduling details.</p>
                    )}
                  </form>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 dark:text-slate-200">
                      <tr>
                        <th className="text-left px-4 py-2">Guard</th>
                        <th className="text-left px-4 py-2">Type</th>
                        <th className="text-left px-4 py-2">Start</th>
                        <th className="text-left px-4 py-2">End</th>
                        <th className="text-left px-4 py-2">Post</th>
                        <th className="text-left px-4 py-2">Status</th>
                        <th className="text-left px-4 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shifts.map((shift) => (
                        <tr key={shift.id}>
                          <td className="px-4 py-2 font-medium">{shift.guard_name || shift.guard_id}</td>
                          <td className="px-4 py-2 capitalize">{shift.shift_type}</td>
                          <td className="px-4 py-2">{formatDateTime(shift.start_time)}</td>
                          <td className="px-4 py-2">{formatDateTime(shift.end_time)}</td>
                          <td className="px-4 py-2">{shift.post_location || '—'}</td>
                          <td className="px-4 py-2 capitalize">{shift.status}</td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => handleEditShift(shift)}
                              className="text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="bg-white shadow-sm border border-slate-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-slate-900">Handover Notes</h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">Review guard-to-guard shift handovers.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <select
                    value={handoverShiftId}
                    onChange={(event) => setHandoverShiftId(event.target.value)}
                    className="border border-slate-200 rounded-md px-3 py-2"
                  >
                    <option value="">Select shift</option>
                    {shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.guard_name || shift.guard_id} • {formatDateTime(shift.start_time)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleLoadHandoverNotes}
                    className="px-3 py-2 bg-slate-900 text-white rounded-md"
                  >
                    Load Notes
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {handoverNotes.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-300">No handover notes loaded.</p>
                  ) : (
                    handoverNotes.map((note) => (
                      <div key={note.id} className="border border-slate-200 rounded-md p-4">
                        <div className="flex flex-wrap justify-between text-sm text-slate-500 dark:text-slate-300">
                          <span>From: {note.from_guard_name || note.from_guard_id}</span>
                          <span>{note.created_at ? formatDateTime(note.created_at) : ''}</span>
                        </div>
                        <p className="mt-2 text-slate-700">{note.notes}</p>
                        {(note.incidents_summary || note.equipment_status) && (
                          <div className="mt-2 text-sm text-slate-600 dark:text-slate-200">
                            {note.incidents_summary && <p>Incidents: {note.incidents_summary}</p>}
                            {note.equipment_status && <p>Equipment: {note.equipment_status}</p>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'performance' && (
            <section className="bg-white shadow-sm border border-slate-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900">Performance Metrics</h2>
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleRecordPerformance} className="space-y-4">
                  <h3 className="text-md font-semibold text-slate-800">Record Metric</h3>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-200">Guard</label>
                    <select
                      value={performanceForm.guard_id}
                      onChange={(event) => setPerformanceForm((prev) => ({ ...prev, guard_id: event.target.value }))}
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
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Metric</label>
                      <select
                        value={performanceForm.metric_type}
                        onChange={(event) => setPerformanceForm((prev) => ({ ...prev, metric_type: event.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                      >
                        {METRIC_TYPES.map((type) => (
                          <option key={type} value={type}>{type.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Rating (0-5)</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        value={performanceForm.rating}
                        onChange={(event) => setPerformanceForm((prev) => ({ ...prev, rating: event.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-200">Shift ID (optional)</label>
                    <input
                      type="text"
                      value={performanceForm.shift_id}
                      onChange={(event) => setPerformanceForm((prev) => ({ ...prev, shift_id: event.target.value }))}
                      className="w-full border border-slate-200 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-200">Notes</label>
                    <textarea
                      value={performanceForm.notes}
                      onChange={(event) => setPerformanceForm((prev) => ({ ...prev, notes: event.target.value }))}
                      className="w-full border border-slate-200 rounded-md px-3 py-2"
                      rows="3"
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Record Metric</button>
                </form>

                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-slate-800">View Metrics</h3>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-200">Guard</label>
                    <select
                      value={performanceQuery.guard_id}
                      onChange={(event) => setPerformanceQuery((prev) => ({ ...prev, guard_id: event.target.value }))}
                      className="w-full border border-slate-200 rounded-md px-3 py-2"
                    >
                      <option value="">Select guard</option>
                      {guardOptions.map((guard) => (
                        <option key={guard.value} value={guard.value}>{guard.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Start Date</label>
                      <input
                        type="date"
                        value={performanceQuery.start_date}
                        onChange={(event) => setPerformanceQuery((prev) => ({ ...prev, start_date: event.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">End Date</label>
                      <input
                        type="date"
                        value={performanceQuery.end_date}
                        onChange={(event) => setPerformanceQuery((prev) => ({ ...prev, end_date: event.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                  <button type="button" onClick={handleFetchPerformance} className="px-4 py-2 bg-slate-900 text-white rounded-md">
                    Load Metrics
                  </button>
                  {performanceData && (
                    <div className="border border-slate-200 rounded-md p-4">
                      <div className="text-sm text-slate-600 dark:text-slate-200">Average rating: {performanceData.statistics?.average_rating || '—'}</div>
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {performanceData.metrics?.map((metric) => (
                          <li key={metric.id} className="flex justify-between">
                            <span>{metric.metric_type.replace('_', ' ')}</span>
                            <span>{metric.rating}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'equipment' && (

            <section className="bg-white shadow-sm border border-slate-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900">Equipment Checkout & Returns</h2>
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleCheckoutEquipment} className="space-y-4">
                  <h3 className="text-md font-semibold text-slate-800">Checkout Equipment</h3>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-200">Guard</label>
                    <select
                      value={equipmentForm.guard_id}
                      onChange={(event) => setEquipmentForm((prev) => ({ ...prev, guard_id: event.target.value }))}
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
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Equipment Type</label>
                      <select
                        value={equipmentForm.equipment_type}
                        onChange={(event) => setEquipmentForm((prev) => ({ ...prev, equipment_type: event.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                      >
                        {EQUIPMENT_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Equipment ID</label>
                      <input
                        type="text"
                        value={equipmentForm.equipment_id}
                        onChange={(event) => setEquipmentForm((prev) => ({ ...prev, equipment_id: event.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-200">Shift ID (optional)</label>
                    <input
                      type="text"
                      value={equipmentForm.shift_id}
                      onChange={(event) => setEquipmentForm((prev) => ({ ...prev, shift_id: event.target.value }))}
                      className="w-full border border-slate-200 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-200">Notes</label>
                    <textarea
                      value={equipmentForm.notes}
                      onChange={(event) => setEquipmentForm((prev) => ({ ...prev, notes: event.target.value }))}
                      className="w-full border border-slate-200 rounded-md px-3 py-2"
                      rows="2"
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Checkout</button>
                </form>

                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-slate-800">Current Checkouts</h3>
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={equipmentFilters.guard_id}
                      onChange={(event) => setEquipmentFilters((prev) => ({ ...prev, guard_id: event.target.value }))}
                      className="border border-slate-200 rounded-md px-3 py-2"
                    >
                      <option value="">All guards</option>
                      {guardOptions.map((guard) => (
                        <option key={guard.value} value={guard.value}>{guard.label}</option>
                      ))}
                    </select>
                    <select
                      value={equipmentFilters.status}
                      onChange={(event) => setEquipmentFilters((prev) => ({ ...prev, status: event.target.value }))}
                      className="border border-slate-200 rounded-md px-3 py-2"
                    >
                      <option value="">All status</option>
                      <option value="checked_out">Checked Out</option>
                      <option value="returned">Returned</option>
                    </select>
                    <button type="button" onClick={() => loadEquipment(equipmentFilters)} className="px-3 py-2 bg-slate-900 text-white rounded-md">
                      Refresh
                    </button>
                  </div>
                  <div className="space-y-3">
                    {equipmentCheckouts.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-300">No equipment records available.</p>
                    ) : (
                      equipmentCheckouts.map((checkout) => (
                        <div key={checkout.id} className="border border-slate-200 rounded-md p-4">
                          <div className="flex flex-wrap justify-between text-sm text-slate-600 dark:text-slate-200">
                            <span>{checkout.equipment_type} • {checkout.equipment_id}</span>
                            <span className="capitalize">{checkout.status}</span>
                          </div>
                          <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">Guard: {checkout.guard_name || checkout.guard_id}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <span className="text-xs text-slate-500 dark:text-slate-300">Checked out: {formatDateTime(checkout.checkout_time)}</span>
                            {checkout.status === 'checked_out' && (
                              <button
                                type="button"
                                onClick={() => handleReturnEquipment(checkout)}
                                className="text-blue-600 text-sm"
                              >
                                Mark Returned
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'training' && (

            <section className="bg-white shadow-sm border border-slate-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900">Training & Certifications</h2>
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleAddTraining} className="space-y-4">
                  <h3 className="text-md font-semibold text-slate-800">Add Training Record</h3>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-200">Guard</label>
                    <select
                      value={trainingForm.guard_id}
                      onChange={(event) => setTrainingForm((prev) => ({ ...prev, guard_id: event.target.value }))}
                      className="w-full border border-slate-200 rounded-md px-3 py-2"
                      required
                    >
                      <option value="">Select guard</option>
                      {guardOptions.map((guard) => (
                        <option key={guard.value} value={guard.value}>{guard.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-200">Training Type</label>
                    <select
                      value={trainingForm.training_type}
                      onChange={(event) => setTrainingForm((prev) => ({ ...prev, training_type: event.target.value }))}
                      className="w-full border border-slate-200 rounded-md px-3 py-2"
                    >
                      {TRAINING_TYPES.map((type) => (
                        <option key={type} value={type}>{type.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-200">Training Name</label>
                    <input
                      type="text"
                      value={trainingForm.training_name}
                      onChange={(event) => setTrainingForm((prev) => ({ ...prev, training_name: event.target.value }))}
                      className="w-full border border-slate-200 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Completion Date</label>
                      <input
                        type="date"
                        value={trainingForm.completion_date}
                        onChange={(event) => setTrainingForm((prev) => ({ ...prev, completion_date: event.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-200">Expiry Date</label>
                      <input
                        type="date"
                        value={trainingForm.expiry_date}
                        onChange={(event) => setTrainingForm((prev) => ({ ...prev, expiry_date: event.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-200">Certificate Number</label>
                    <input
                      type="text"
                      value={trainingForm.certificate_number}
                      onChange={(event) => setTrainingForm((prev) => ({ ...prev, certificate_number: event.target.value }))}
                      className="w-full border border-slate-200 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-200">Notes</label>
                    <textarea
                      value={trainingForm.notes}
                      onChange={(event) => setTrainingForm((prev) => ({ ...prev, notes: event.target.value }))}
                      className="w-full border border-slate-200 rounded-md px-3 py-2"
                      rows="2"
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Add Training</button>
                </form>

                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-slate-800">Training Records</h3>
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={trainingGuardId}
                      onChange={(event) => setTrainingGuardId(event.target.value)}
                      className="border border-slate-200 rounded-md px-3 py-2"
                    >
                      <option value="">Select guard</option>
                      {guardOptions.map((guard) => (
                        <option key={guard.value} value={guard.value}>{guard.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleLoadTrainingRecords(trainingGuardId)}
                      className="px-3 py-2 bg-slate-900 text-white rounded-md"
                    >
                      Load Records
                    </button>
                  </div>
                  <div className="space-y-3">
                    {trainingRecords.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-300">No training records loaded.</p>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingGuard ? 'Edit Guard' : 'Add New Guard'}
              </h2>
              <button
                onClick={() => setShowGuardModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={guardForm.email}
                    onChange={(e) => setGuardForm({ ...guardForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={guardForm.first_name}
                    onChange={(e) => setGuardForm({ ...guardForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={guardForm.last_name}
                    onChange={(e) => setGuardForm({ ...guardForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowGuardModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingGuard ? 'Update Guard' : 'Create Guard')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
