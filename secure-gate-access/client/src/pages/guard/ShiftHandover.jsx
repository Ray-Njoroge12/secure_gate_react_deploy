/**
 * @fileoverview Shift Handover Page for Guards
 * @description Allows guards to manage shift handovers, view incoming handover notes,
 * and create handover notes for the next guard
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';
import { Card, Button, Badge } from '../../components/ui';
import PageHeader from '../../components/PageHeader';
import logger from '../../utils/logger';

// Icons
const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ToolIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default function ShiftHandover() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleApiError } = useError();
  const { setLoading, isLoading } = useLoading();

  // State
  const [currentShift, setCurrentShift] = useState(null);
  const [incomingHandover, setIncomingHandover] = useState(null);
  const [guards, setGuards] = useState([]);
  const [handoverForm, setHandoverForm] = useState({
    notes: '',
    incidents_summary: '',
    equipment_status: 'good',
    to_guard_id: ''
  });
  const [recentHandovers, setRecentHandovers] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch current shift and incoming handover notes
  const fetchShiftData = useCallback(async () => {
    try {
      setLoading('shiftHandover', true);

      // Get current shift
      const today = new Date().toISOString().split('T')[0];
      const shiftsRes = await fetch(`/api/guards/shifts?start_date=${today}&end_date=${today}`, {
        credentials: 'include'
      });
      const shiftsJson = await shiftsRes.json();

      if (shiftsJson.success && shiftsJson.data?.length > 0) {
        // Find current user's active shift
        const myShift = shiftsJson.data.find(
          s => s.guard_id === user.id && s.status === 'in_progress'
        );
        setCurrentShift(myShift || null);

        // Get handover notes for the previous shift
        if (myShift) {
          const handoverRes = await fetch(`/api/guards/handover/${myShift.id}`, {
            credentials: 'include'
          });
          const handoverJson = await handoverRes.json();
          if (handoverJson.success && handoverJson.data?.length > 0) {
            setIncomingHandover(handoverJson.data[0]);
          }
        }
      }

      // Fetch list of guards for handover selection
      const guardsRes = await fetch('/api/guards/shifts?start_date=' + today + '&end_date=' + today, {
        credentials: 'include'
      });
      const guardsJson = await guardsRes.json();
      if (guardsJson.success) {
        // Extract unique guards from shifts
        const uniqueGuards = [];
        const seenIds = new Set();
        guardsJson.data?.forEach(shift => {
          if (!seenIds.has(shift.guard_id) && shift.guard_id !== user.id) {
            seenIds.add(shift.guard_id);
            uniqueGuards.push({
              id: shift.guard_id,
              name: shift.guard_name || `Guard #${shift.guard_id}`
            });
          }
        });
        setGuards(uniqueGuards);
      }

    } catch (error) {
      handleApiError(error, 'Shift Handover');
      logger.error('Failed to fetch shift data:', error);
    } finally {
      setLoading('shiftHandover', false);
    }
  }, [user, handleApiError, setLoading]);

  useEffect(() => {
    fetchShiftData();
  }, [fetchShiftData]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setHandoverForm(prev => ({ ...prev, [name]: value }));
  };

  // Submit handover notes
  const handleSubmitHandover = async (e) => {
    e.preventDefault();

    if (!currentShift) {
      alert('No active shift found. Please start a shift first.');
      return;
    }

    if (!handoverForm.notes.trim()) {
      alert('Please enter handover notes.');
      return;
    }

    try {
      setLoading('submitHandover', true);

      const res = await fetch('/api/guards/handover', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: currentShift.id,
          to_guard_id: handoverForm.to_guard_id || null,
          notes: handoverForm.notes,
          incidents_summary: handoverForm.incidents_summary,
          equipment_status: handoverForm.equipment_status
        })
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || 'Failed to submit handover');
      }

      setShowSuccess(true);
      setHandoverForm({
        notes: '',
        incidents_summary: '',
        equipment_status: 'good',
        to_guard_id: ''
      });

      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);

      // Refresh data
      fetchShiftData();

    } catch (error) {
      handleApiError(error, 'Submit Handover');
    } finally {
      setLoading('submitHandover', false);
    }
  };

  // End shift
  const handleEndShift = async () => {
    if (!currentShift) return;

    if (!window.confirm('Are you sure you want to end your shift? Make sure you have submitted your handover notes.')) {
      return;
    }

    try {
      setLoading('endShift', true);

      const res = await fetch(`/api/guards/shifts/${currentShift.id}/end`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handover_notes: handoverForm.notes || 'Shift ended without additional notes.'
        })
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || 'Failed to end shift');
      }

      alert('Shift ended successfully!');
      navigate('/dashboard/guard');

    } catch (error) {
      handleApiError(error, 'End Shift');
    } finally {
      setLoading('endShift', false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <PageHeader
        title="Shift Handover"
        description="Manage shift transitions and handover notes"
        backTo="/dashboard/guard"
      />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Current Shift Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardIcon />
              Current Shift Status
            </h2>
            {currentShift && (
              <Badge variant={currentShift.status === 'in_progress' ? 'success' : 'warning'}>
                {currentShift.status === 'in_progress' ? 'Active' : currentShift.status}
              </Badge>
            )}
          </div>

          {currentShift ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-300">Shift Type</span>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {currentShift.shift_type}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-300">Started</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatTime(currentShift.actual_start_time || currentShift.start_time)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-300">Scheduled End</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatTime(currentShift.end_time)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-300">Post</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {currentShift.post_location || 'Main Gate'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-300">
              <p>No active shift found.</p>
              <p className="text-sm mt-2">Start a shift to enable handover features.</p>
            </div>
          )}
        </Card>

        {/* Incoming Handover Notes */}
        {incomingHandover && (
          <Card className="p-6 border-l-4 border-blue-500">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <AlertIcon />
              Incoming Handover Notes
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
                <UserIcon />
                <span>From: {incomingHandover.from_guard_name || 'Previous Guard'}</span>
                <span className="mx-2">•</span>
                <span>{formatTime(incomingHandover.created_at)}</span>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Notes</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {incomingHandover.notes}
                </p>
              </div>

              {incomingHandover.incidents_summary && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <AlertIcon className="text-yellow-600" />
                    Incidents Summary
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {incomingHandover.incidents_summary}
                  </p>
                </div>
              )}

              {incomingHandover.equipment_status && (
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <ToolIcon />
                    Equipment Status
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {incomingHandover.equipment_status}
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIncomingHandover(null)}
                className="mt-2"
              >
                <CheckIcon className="mr-2" />
                Acknowledge
              </Button>
            </div>
          </Card>
        )}

        {/* Create Handover Notes */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create Handover Notes
          </h2>

          {showSuccess && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-300 flex items-center gap-2">
                <CheckIcon />
                Handover notes submitted successfully!
              </p>
            </div>
          )}

          <form onSubmit={handleSubmitHandover} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Handover To (Optional)
              </label>
              <select
                name="to_guard_id"
                value={handoverForm.to_guard_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Any incoming guard --</option>
                {guards.map(guard => (
                  <option key={guard.id} value={guard.id}>
                    {guard.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Handover Notes *
              </label>
              <textarea
                name="notes"
                value={handoverForm.notes}
                onChange={handleInputChange}
                rows={4}
                required
                placeholder="Summary of shift activities, ongoing issues, special instructions for the next guard..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Incidents Summary
              </label>
              <textarea
                name="incidents_summary"
                value={handoverForm.incidents_summary}
                onChange={handleInputChange}
                rows={3}
                placeholder="List any incidents that occurred during your shift and their current status..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Equipment Status
              </label>
              <select
                name="equipment_status"
                value={handoverForm.equipment_status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="good">All equipment in good condition</option>
                <option value="issues">Some equipment has issues (describe in notes)</option>
                <option value="damaged">Equipment damaged (requires attention)</option>
                <option value="missing">Equipment missing (report to admin)</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading('submitHandover') || !currentShift}
                className="flex-1"
              >
                {isLoading('submitHandover') ? 'Submitting...' : 'Submit Handover Notes'}
              </Button>

              {currentShift && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleEndShift}
                  disabled={isLoading('endShift')}
                >
                  {isLoading('endShift') ? 'Ending...' : 'End Shift'}
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/guard/activity-log')}
            className="flex flex-col items-center py-4"
          >
            <ClipboardIcon />
            <span className="mt-2 text-sm">Activity Log</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/guard/incidents')}
            className="flex flex-col items-center py-4"
          >
            <AlertIcon />
            <span className="mt-2 text-sm">Incidents</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/guard/bulk-checkout')}
            className="flex flex-col items-center py-4"
          >
            <CheckIcon />
            <span className="mt-2 text-sm">Bulk Checkout</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/guard')}
            className="flex flex-col items-center py-4"
          >
            <UserIcon />
            <span className="mt-2 text-sm">Dashboard</span>
          </Button>
        </div>
      </main>
    </div>
  );
}
