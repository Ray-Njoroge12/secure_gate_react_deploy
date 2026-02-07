/**
 * Emergency Alert Banner Component
 * Phase 1.1: Guard Panic Button - Alert Notification
 * 
 * Shows at the top of guard/admin dashboards when there's an active emergency.
 * Guards can acknowledge to indicate they are responding.
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import emergencyService from '../../services/emergencyService';
import notificationService from '../../services/notificationService';
import logger from '../../utils/logger';

const EmergencyAlertBanner = ({ 
  userRole = 'guard',
  onEmergencyUpdate = () => {},
  className = ''
}) => {
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(null);
  const [expanded, setExpanded] = useState(true);

  // Fetch active emergencies
  const fetchActiveEmergencies = useCallback(async () => {
    try {
      const emergencies = await emergencyService.getActiveEmergencies();
      setActiveEmergencies(emergencies);
      onEmergencyUpdate(emergencies);
    } catch (err) {
      logger.error('Failed to fetch active emergencies:', err);
    } finally {
      setLoading(false);
    }
  }, [onEmergencyUpdate]);

  // Poll for updates every 10 seconds
  useEffect(() => {
    fetchActiveEmergencies();
    const interval = setInterval(fetchActiveEmergencies, 10000);
    return () => clearInterval(interval);
  }, [fetchActiveEmergencies]);

  // Listen for SSE events
  useEffect(() => {
    let eventSource;
    try {
      eventSource = new EventSource('/api/ws/guards', { withCredentials: true });
      
      eventSource.addEventListener('emergency:triggered', (event) => {
        const data = JSON.parse(event.data || '{}');
        notificationService.error('🆘 EMERGENCY ALERT', `Guard ${data.guardName || 'Unknown'} needs help!`);
        fetchActiveEmergencies();
      });
      
      eventSource.addEventListener('emergency:acknowledged', () => {
        fetchActiveEmergencies();
      });
      
      eventSource.addEventListener('emergency:resolved', () => {
        notificationService.success('Emergency Resolved', 'The emergency has been resolved.');
        fetchActiveEmergencies();
      });
      
      eventSource.addEventListener('emergency:cancelled', () => {
        fetchActiveEmergencies();
      });
    } catch (err) {
      logger.error('Failed to connect to emergency SSE:', err);
    }
    
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [fetchActiveEmergencies]);

  // Handle acknowledging an emergency
  const handleAcknowledge = async (emergencyId) => {
    setAcknowledging(emergencyId);
    try {
      await emergencyService.acknowledgeEmergency(emergencyId);
      notificationService.success('Acknowledged', 'You have been marked as responding to this emergency.');
      fetchActiveEmergencies();
    } catch (err) {
      notificationService.error('Failed', err.message || 'Could not acknowledge emergency');
    } finally {
      setAcknowledging(null);
    }
  };

  // Handle resolving an emergency (admin only)
  const handleResolve = async (emergencyId) => {
    if (!window.confirm('Are you sure you want to resolve this emergency?')) return;
    
    try {
      await emergencyService.resolveEmergency(emergencyId, {
        notes: 'Resolved from dashboard'
      });
      notificationService.success('Resolved', 'Emergency has been resolved.');
      fetchActiveEmergencies();
    } catch (err) {
      notificationService.error('Failed', err.message || 'Could not resolve emergency');
    }
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (loading) return null;
  if (activeEmergencies.length === 0) return null;

  return (
    <div className={`bg-red-600 text-white shadow-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="animate-pulse">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <span className="font-bold text-lg">
            🆘 ACTIVE EMERGENCY ({activeEmergencies.length})
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 hover:bg-red-700 rounded-lg transition-colors"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <svg 
            className={`w-5 h-5 transform transition-transform ${expanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Emergency List */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {activeEmergencies.map((emergency) => (
            <div 
              key={emergency.id} 
              className="bg-white bg-opacity-10 rounded-lg p-4"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                {/* Emergency Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">
                      Guard: {emergency.guard_name || `Guard #${emergency.guard_id}`}
                    </span>
                    {emergency.gate_name && (
                      <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded text-sm">
                        {emergency.gate_name}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-red-100 flex flex-wrap gap-3">
                    <span>⏱️ {formatTimeAgo(emergency.triggered_at)}</span>
                    {emergency.status === 'acknowledged' && (
                      <span className="text-green-300">
                        ✓ Acknowledged by {emergency.acknowledged_by_name || 'responder'}
                      </span>
                    )}
                    {userRole === 'admin' && emergency.latitude && (
                      <span title="Location captured">📍 Location available</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {emergency.status === 'triggered' && (
                    <button
                      onClick={() => handleAcknowledge(emergency.id)}
                      disabled={acknowledging === emergency.id}
                      className="px-4 py-2 bg-white dark:bg-slate-800 text-red-600 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                      {acknowledging === emergency.id ? 'Acknowledging...' : 'I\'m Responding'}
                    </button>
                  )}
                  
                  {userRole === 'admin' && (
                    <button
                      onClick={() => handleResolve(emergency.id)}
                      className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

EmergencyAlertBanner.propTypes = {
  userRole: PropTypes.oneOf(['guard', 'admin']),
  onEmergencyUpdate: PropTypes.func,
  className: PropTypes.string
};

export default EmergencyAlertBanner;
