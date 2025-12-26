/**
 * RecurringPasses Component
 * P4: Resident management of daily workers, caregivers, contractors
 */

import React, { useState, useEffect } from 'react';
import recurringPassService from '../../services/recurringPassService';

const PASS_TYPES = [
  { value: 'daily_worker', label: 'Daily Worker', icon: '👷' },
  { value: 'caregiver', label: 'Caregiver', icon: '🏥' },
  { value: 'contractor', label: 'Contractor', icon: '🔧' },
  { value: 'family', label: 'Family Member', icon: '👨‍👩‍👧' },
  { value: 'other', label: 'Other', icon: '👤' }
];

const DAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' }
];

const RecurringPasses = () => {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    loadPasses();
  }, [filter]);

  const loadPasses = async () => {
    try {
      setLoading(true);
      const response = await recurringPassService.getMyPasses({
        status: filter === 'all' ? undefined : filter,
        includeExpired: filter === 'all'
      });
      setPasses(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load recurring passes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (passId) => {
    if (!window.confirm('Are you sure you want to revoke this pass? This cannot be undone.')) return;
    try {
      await recurringPassService.revokePass(passId);
      loadPasses();
    } catch (err) {
      setError('Failed to revoke pass');
    }
  };

  const handleSuspend = async (passId) => {
    try {
      await recurringPassService.suspendPass(passId);
      loadPasses();
    } catch (err) {
      setError('Failed to suspend pass');
    }
  };

  const handleReactivate = async (passId) => {
    try {
      await recurringPassService.reactivatePass(passId);
      loadPasses();
    } catch (err) {
      setError('Failed to reactivate pass');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-gray-100 text-gray-800',
      revoked: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPassTypeInfo = (type) => {
    return PASS_TYPES.find(t => t.value === type) || PASS_TYPES[4];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading && passes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">🔄 Recurring Passes</h2>
            <p className="text-sm text-gray-500">Manage access for daily workers & regular visitors</p>
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border-gray-300 rounded-md"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="all">All</option>
            </select>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              + New Pass
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {passes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <span className="text-4xl">🔑</span>
            <p className="mt-2">No recurring passes yet</p>
            <p className="text-sm">Create a pass for regular visitors like housekeepers or caregivers</p>
          </div>
        ) : (
          passes.map((pass) => {
            const typeInfo = getPassTypeInfo(pass.pass_type);
            return (
              <div key={pass.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <span className="text-2xl">{typeInfo.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{pass.visitor_name}</span>
                        {getStatusBadge(pass.status)}
                      </div>
                      <p className="text-sm text-gray-600">{typeInfo.label}</p>
                      {pass.purpose && <p className="text-sm text-gray-500">{pass.purpose}</p>}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>📅 {formatDate(pass.valid_from)} - {formatDate(pass.valid_until)}</span>
                        <span>⏰ {pass.allowed_time_start} - {pass.allowed_time_end}</span>
                        {pass.total_entries > 0 && <span>🚪 {pass.total_entries} entries</span>}
                      </div>
                      {pass.status === 'active' && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <span className="font-medium">PIN:</span> {pass.access_pin}
                          <button
                            onClick={() => setSelectedPass(pass)}
                            className="ml-4 text-blue-600 hover:underline"
                          >
                            View QR
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {pass.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleSuspend(pass.id)}
                          className="px-3 py-1 text-sm border border-yellow-300 text-yellow-700 rounded-md hover:bg-yellow-50"
                        >
                          Suspend
                        </button>
                        <button
                          onClick={() => handleRevoke(pass.id)}
                          className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                        >
                          Revoke
                        </button>
                      </>
                    )}
                    {pass.status === 'suspended' && (
                      <button
                        onClick={() => handleReactivate(pass.id)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        🔒 Passes are validated by PIN or QR code. You can suspend or revoke access at any time.
      </div>

      {showCreateModal && (
        <CreatePassModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadPasses();
          }}
        />
      )}

      {selectedPass && (
        <PassDetailsModal
          pass={selectedPass}
          onClose={() => setSelectedPass(null)}
        />
      )}
    </div>
  );
};

const CreatePassModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    visitorName: '',
    visitorPhone: '',
    vehiclePlate: '',
    passType: 'daily_worker',
    purpose: '',
    validUntil: '',
    allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    allowedTimeStart: '06:00',
    allowedTimeEnd: '18:00'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      allowedDays: prev.allowedDays.includes(day)
        ? prev.allowedDays.filter(d => d !== day)
        : [...prev.allowedDays, day]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.visitorName || !formData.validUntil) {
      setError('Name and valid until date are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await recurringPassService.createPass(formData);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create pass');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Create Recurring Pass</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visitor Name *</label>
            <input
              type="text"
              name="visitorName"
              value={formData.visitorName}
              onChange={handleChange}
              className="w-full border-gray-300 rounded-md"
              placeholder="e.g., John Mwangi"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="visitorPhone"
                value={formData.visitorPhone}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md"
                placeholder="+254..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Plate</label>
              <input
                type="text"
                name="vehiclePlate"
                value={formData.vehiclePlate}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md"
                placeholder="KXX 000X"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pass Type</label>
            <select
              name="passType"
              value={formData.passType}
              onChange={handleChange}
              className="w-full border-gray-300 rounded-md"
            >
              {PASS_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <input
              type="text"
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              className="w-full border-gray-300 rounded-md"
              placeholder="e.g., House cleaning"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
            <input
              type="date"
              name="validUntil"
              value={formData.validUntil}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    formData.allowedDays.includes(day.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                name="allowedTimeStart"
                value={formData.allowedTimeStart}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                name="allowedTimeEnd"
                value={formData.allowedTimeEnd}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Pass'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PassDetailsModal = ({ pass, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [pass.id]);

  const loadHistory = async () => {
    try {
      const response = await recurringPassService.getPassHistory(pass.id);
      setHistory(response.data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Pass Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-4">
          <div className="text-center mb-4">
            <p className="text-lg font-medium">{pass.visitor_name}</p>
            <p className="text-gray-500">{pass.pass_type}</p>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg text-center mb-4">
            <p className="text-sm text-gray-600 mb-2">Access PIN</p>
            <p className="text-3xl font-mono font-bold tracking-wider">{pass.access_pin}</p>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg text-center mb-4">
            <p className="text-sm text-gray-600 mb-2">QR Token</p>
            <p className="text-xs font-mono break-all">{pass.qr_code_token}</p>
            <p className="text-xs text-gray-500 mt-2">Guards can scan this QR code for entry</p>
          </div>

          <div className="mt-4">
            <h4 className="font-medium mb-2">Recent Entries</h4>
            {loadingHistory ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : history.length === 0 ? (
              <p className="text-gray-500 text-sm">No entries recorded yet</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {history.slice(0, 10).map((entry, idx) => (
                  <div key={idx} className="text-sm flex justify-between">
                    <span>{new Date(entry.checked_in_at).toLocaleString()}</span>
                    <span className="text-gray-500">{entry.entry_method}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurringPasses;
