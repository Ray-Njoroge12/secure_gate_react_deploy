import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Save,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { apiCall } from '../../services/http';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Loading from '../../components/ui/Loading';

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Event type configurations with labels and descriptions
  const eventTypes = {
    pending_approval: {
      label: 'Pending User Approvals',
      description: 'New user registrations waiting for approval',
      category: 'User Management'
    },
    user_approved: {
      label: 'User Approved',
      description: 'When a user account is approved',
      category: 'User Management'
    },
    user_rejected: {
      label: 'User Rejected',
      description: 'When a user account is rejected',
      category: 'User Management'
    },
    visitor_checkin: {
      label: 'Visitor Check-In',
      description: 'When a visitor checks in at the gate',
      category: 'Visitor Management'
    },
    visitor_checkout: {
      label: 'Visitor Check-Out',
      description: 'When a visitor checks out',
      category: 'Visitor Management'
    },
    guard_late: {
      label: 'Guard Late for Shift',
      description: 'When a guard is late for their scheduled shift',
      category: 'Guard Management'
    },
    guard_absent: {
      label: 'Guard Absent',
      description: 'When a guard misses their shift',
      category: 'Guard Management'
    },
    emergency_alert: {
      label: 'Emergency Alert',
      description: 'Critical security incidents or emergency situations',
      category: 'Security'
    },
    incident_created: {
      label: 'New Incident',
      description: 'When a new incident is reported',
      category: 'Security'
    },
    incident_escalated: {
      label: 'Incident Escalated',
      description: 'When an incident is escalated to high priority',
      category: 'Security'
    },
    backup_completed: {
      label: 'Backup Completed',
      description: 'When a system backup completes',
      category: 'System'
    },
    backup_failed: {
      label: 'Backup Failed',
      description: 'When a system backup fails',
      category: 'System'
    },
    retention_executed: {
      label: 'Data Retention Executed',
      description: 'When data retention policy runs',
      category: 'System'
    }
  };

  const frequencyOptions = [
    { value: 'instant', label: 'Instant (Real-time)' },
    { value: 'hourly', label: 'Hourly Digest' },
    { value: 'daily', label: 'Daily Summary' }
  ];

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiCall('GET', '/api/admin/notification-preferences');

      if (response.success) {
        setPreferences(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id, field) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.id === id ? { ...pref, [field]: !pref[field] } : pref
      )
    );
  };

  const handleFrequencyChange = (id, frequency) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.id === id ? { ...pref, frequency } : pref
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await apiCall('POST', '/api/admin/notification-preferences/bulk-update', {
        preferences: preferences.map(pref => ({
          id: pref.id,
          notify_email: pref.notify_email,
          notify_sms: pref.notify_sms,
          notify_in_app: pref.notify_in_app,
          frequency: pref.frequency
        }))
      });

      if (response.success) {
        setSuccess('Notification preferences saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const groupByCategory = () => {
    const grouped = {};
    preferences.forEach(pref => {
      const config = eventTypes[pref.event_type] || { category: 'Other' };
      const category = config.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(pref);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  const groupedPreferences = groupByCategory();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notification Preferences
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure how and when you receive notifications for estate events
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? <Loading size="sm" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      )}

      {/* Notification Channels Legend */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Notification Channels
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Email</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Receive notifications via email</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
              <Smartphone className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">SMS</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Receive text message alerts</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <Bell className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">In-App</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Receive in-app notifications</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences by Category */}
      {Object.entries(groupedPreferences).map(([category, prefs]) => (
        <Card key={category}>
          <CardHeader className="border-b bg-gray-50/50 dark:bg-slate-800/50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">{category}</CardTitle>
              <span className="bg-gray-200 text-gray-700 dark:text-gray-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {prefs.length} events
              </span>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-gray-100 dark:divide-slate-700">
            {prefs.map((pref) => {
              const config = eventTypes[pref.event_type] || {
                label: pref.event_type,
                description: 'Event notification'
              };

              // Determine if frequency selection should be disabled
              const isFrequencyDisabled = !pref.notify_email && !pref.notify_sms && !pref.notify_in_app;

              return (
                <div key={pref.id} className="py-6 first:pt-4 last:pb-2">
                  <div className="mb-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      {config.label}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {config.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* Notification Channels */}
                    <div className="flex flex-wrap gap-6">
                      <label className="flex items-center cursor-pointer gap-2 group">
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={pref.notify_email}
                            onChange={() => handleToggle(pref.id, 'notify_email')}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-gray-400 dark:text-gray-300 group-hover:text-blue-500" />
                          Email
                        </span>
                      </label>

                      <label className="flex items-center cursor-pointer gap-2 group">
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={pref.notify_sms}
                            onChange={() => handleToggle(pref.id, 'notify_sms')}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-gray-400 dark:text-gray-300 group-hover:text-green-500" />
                          SMS
                        </span>
                      </label>

                      <label className="flex items-center cursor-pointer gap-2 group">
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={pref.notify_in_app}
                            onChange={() => handleToggle(pref.id, 'notify_in_app')}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 flex items-center gap-1.5">
                          <Bell className="w-4 h-4 text-gray-400 dark:text-gray-300 group-hover:text-yellow-500" />
                          In-App
                        </span>
                      </label>
                    </div>

                    {/* Frequency */}
                    <div>
                      <select
                        className={`bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 ${!pref.notify_email && !pref.notify_sms && !pref.notify_in_app ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        value={pref.frequency}
                        onChange={(e) => handleFrequencyChange(pref.id, e.target.value)}
                        disabled={!pref.notify_email && !pref.notify_sms && !pref.notify_in_app}
                      >
                        {frequencyOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {preferences.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 mb-4">
                <Bell className="w-6 h-6 text-gray-400 dark:text-gray-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No preferences found</h3>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                Notification preferences have not been configured. Contact your system administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationPreferences;
