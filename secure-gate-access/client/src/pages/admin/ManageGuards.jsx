import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import {
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
import logger from 'utils/logger';

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

export default function ManageGuards() {
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

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
    label: `${guard.username || guard.name || 'Guard'} (${guard.email || guard.phone || 'ID ' + guard.id})`
  })), [guards]);

  const loadGuards = useCallback(async () => {
    try {
      const data = await getAllGuards();
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

  return (
    <Layout title="Guard Management" role="admin" showBreadcrumbs={true}>
      <div className="space-y-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            {notice}
          </div>
        )}

        <section className="bg-white shadow-sm border border-slate-200 rounded-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Guard Directory</h2>
              <p className="text-sm text-slate-500">Active guard accounts and contact details.</p>
            </div>
            <div className="text-sm text-slate-500">{loading ? 'Loading...' : `${guards.length} guards`}</div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Phone</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guards.map((guard) => (
                  <tr key={guard.id} className="text-slate-700">
                    <td className="px-4 py-2 font-medium">{guard.username || guard.name || 'Guard'}</td>
                    <td className="px-4 py-2">{guard.email || '—'}</td>
                    <td className="px-4 py-2">{guard.phone || guard.phone_number || '—'}</td>
                    <td className="px-4 py-2 capitalize">{guard.status || 'active'}</td>
                    <td className="px-4 py-2">{guard.created_at ? formatDate(guard.created_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white shadow-sm border border-slate-200 rounded-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Shift Scheduling</h2>
              <p className="text-sm text-slate-500">Create, review, and update guard shifts.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="text-sm text-slate-600">Start</label>
              <input
                type="date"
                value={shiftFilters.start_date}
                onChange={(event) => setShiftFilters((prev) => ({ ...prev, start_date: event.target.value }))}
                className="border border-slate-200 rounded-md px-2 py-1 text-sm"
              />
              <label className="text-sm text-slate-600">End</label>
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
                <label className="block text-sm text-slate-600">Guard</label>
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
                  <label className="block text-sm text-slate-600">Shift Type</label>
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
                  <label className="block text-sm text-slate-600">Post</label>
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
                  <label className="block text-sm text-slate-600">Start Time</label>
                  <input
                    type="datetime-local"
                    value={shiftForm.start_time}
                    onChange={(event) => setShiftForm((prev) => ({ ...prev, start_time: event.target.value }))}
                    className="w-full border border-slate-200 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600">End Time</label>
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
                <label className="block text-sm text-slate-600">Notes</label>
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
                    <label className="block text-sm text-slate-600">Guard</label>
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
                      <label className="block text-sm text-slate-600">Shift Type</label>
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
                      <label className="block text-sm text-slate-600">Status</label>
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
                      <label className="block text-sm text-slate-600">Start Time</label>
                      <input
                        type="datetime-local"
                        value={editingShift.start_time ? editingShift.start_time.slice(0, 16) : ''}
                        onChange={(event) => setEditingShift((prev) => ({ ...prev, start_time: event.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600">End Time</label>
                      <input
                        type="datetime-local"
                        value={editingShift.end_time ? editingShift.end_time.slice(0, 16) : ''}
                        onChange={(event) => setEditingShift((prev) => ({ ...prev, end_time: event.target.value }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600">Post</label>
                    <input
                      type="text"
                      value={editingShift.post_location || ''}
                      onChange={(event) => setEditingShift((prev) => ({ ...prev, post_location: event.target.value }))}
                      className="w-full border border-slate-200 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600">Notes</label>
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
                <p className="text-sm text-slate-500">Select a shift from the table below to edit scheduling details.</p>
              )}
            </form>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
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
          <p className="text-sm text-slate-500">Review guard-to-guard shift handovers.</p>
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
              <p className="text-sm text-slate-500">No handover notes loaded.</p>
            ) : (
              handoverNotes.map((note) => (
                <div key={note.id} className="border border-slate-200 rounded-md p-4">
                  <div className="flex flex-wrap justify-between text-sm text-slate-500">
                    <span>From: {note.from_guard_name || note.from_guard_id}</span>
                    <span>{note.created_at ? formatDateTime(note.created_at) : ''}</span>
                  </div>
                  <p className="mt-2 text-slate-700">{note.notes}</p>
                  {(note.incidents_summary || note.equipment_status) && (
                    <div className="mt-2 text-sm text-slate-600">
                      {note.incidents_summary && <p>Incidents: {note.incidents_summary}</p>}
                      {note.equipment_status && <p>Equipment: {note.equipment_status}</p>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white shadow-sm border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900">Performance Metrics</h2>
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleRecordPerformance} className="space-y-4">
              <h3 className="text-md font-semibold text-slate-800">Record Metric</h3>
              <div>
                <label className="block text-sm text-slate-600">Guard</label>
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
                  <label className="block text-sm text-slate-600">Metric</label>
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
                  <label className="block text-sm text-slate-600">Rating (0-5)</label>
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
                <label className="block text-sm text-slate-600">Shift ID (optional)</label>
                <input
                  type="text"
                  value={performanceForm.shift_id}
                  onChange={(event) => setPerformanceForm((prev) => ({ ...prev, shift_id: event.target.value }))}
                  className="w-full border border-slate-200 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600">Notes</label>
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
                <label className="block text-sm text-slate-600">Guard</label>
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
                  <label className="block text-sm text-slate-600">Start Date</label>
                  <input
                    type="date"
                    value={performanceQuery.start_date}
                    onChange={(event) => setPerformanceQuery((prev) => ({ ...prev, start_date: event.target.value }))}
                    className="w-full border border-slate-200 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600">End Date</label>
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
                  <div className="text-sm text-slate-600">Average rating: {performanceData.statistics?.average_rating || '—'}</div>
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

        <section className="bg-white shadow-sm border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900">Equipment Checkout & Returns</h2>
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleCheckoutEquipment} className="space-y-4">
              <h3 className="text-md font-semibold text-slate-800">Checkout Equipment</h3>
              <div>
                <label className="block text-sm text-slate-600">Guard</label>
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
                  <label className="block text-sm text-slate-600">Equipment Type</label>
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
                  <label className="block text-sm text-slate-600">Equipment ID</label>
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
                <label className="block text-sm text-slate-600">Shift ID (optional)</label>
                <input
                  type="text"
                  value={equipmentForm.shift_id}
                  onChange={(event) => setEquipmentForm((prev) => ({ ...prev, shift_id: event.target.value }))}
                  className="w-full border border-slate-200 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600">Notes</label>
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
                  <p className="text-sm text-slate-500">No equipment records available.</p>
                ) : (
                  equipmentCheckouts.map((checkout) => (
                    <div key={checkout.id} className="border border-slate-200 rounded-md p-4">
                      <div className="flex flex-wrap justify-between text-sm text-slate-600">
                        <span>{checkout.equipment_type} • {checkout.equipment_id}</span>
                        <span className="capitalize">{checkout.status}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">Guard: {checkout.guard_name || checkout.guard_id}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span className="text-xs text-slate-500">Checked out: {formatDateTime(checkout.checkout_time)}</span>
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

        <section className="bg-white shadow-sm border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900">Training & Certifications</h2>
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleAddTraining} className="space-y-4">
              <h3 className="text-md font-semibold text-slate-800">Add Training Record</h3>
              <div>
                <label className="block text-sm text-slate-600">Guard</label>
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
                <label className="block text-sm text-slate-600">Training Type</label>
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
                <label className="block text-sm text-slate-600">Training Name</label>
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
                  <label className="block text-sm text-slate-600">Completion Date</label>
                  <input
                    type="date"
                    value={trainingForm.completion_date}
                    onChange={(event) => setTrainingForm((prev) => ({ ...prev, completion_date: event.target.value }))}
                    className="w-full border border-slate-200 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600">Expiry Date</label>
                  <input
                    type="date"
                    value={trainingForm.expiry_date}
                    onChange={(event) => setTrainingForm((prev) => ({ ...prev, expiry_date: event.target.value }))}
                    className="w-full border border-slate-200 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600">Certificate Number</label>
                <input
                  type="text"
                  value={trainingForm.certificate_number}
                  onChange={(event) => setTrainingForm((prev) => ({ ...prev, certificate_number: event.target.value }))}
                  className="w-full border border-slate-200 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600">Notes</label>
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
                  <p className="text-sm text-slate-500">No training records loaded.</p>
                ) : (
                  trainingRecords.map((record) => (
                    <div key={record.id} className="border border-slate-200 rounded-md p-4">
                      <div className="flex flex-wrap justify-between text-sm text-slate-600">
                        <span className="font-medium">{record.training_name}</span>
                        <span className="capitalize">{record.status}</span>
                      </div>
                      <div className="text-sm text-slate-500">Completed: {formatDate(record.completion_date)}</div>
                      {record.expiry_date && <div className="text-sm text-slate-500">Expires: {formatDate(record.expiry_date)}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
