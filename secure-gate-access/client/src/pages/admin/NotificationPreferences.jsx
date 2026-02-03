import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  FormGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Chip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  NotificationsActive as InAppIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { apiCall } from '../../utils/api';

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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const groupedPreferences = groupByCategory();

  return (
    <Box>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center">
          <NotificationsIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              Notification Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure how and when you receive notifications for estate events
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Notification Channels Legend */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Notification Channels
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center">
                <EmailIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="body1" fontWeight="bold">Email</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Receive notifications via email
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center">
                <SmsIcon sx={{ mr: 1, color: 'success.main' }} />
                <Box>
                  <Typography variant="body1" fontWeight="bold">SMS</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Receive text message alerts
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center">
                <InAppIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Box>
                  <Typography variant="body1" fontWeight="bold">In-App</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Receive in-app notifications
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Preferences by Category */}
      {Object.entries(groupedPreferences).map(([category, prefs]) => (
        <Card key={category} sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h6" flexGrow={1}>
                {category}
              </Typography>
              <Chip label={`${prefs.length} events`} size="small" />
            </Box>
            <Divider sx={{ mb: 2 }} />

            {prefs.map((pref, index) => {
              const config = eventTypes[pref.event_type] || {
                label: pref.event_type,
                description: 'Event notification'
              };

              return (
                <Box key={pref.id} sx={{ mb: index < prefs.length - 1 ? 3 : 0 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {config.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {config.description}
                  </Typography>

                  <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
                    {/* Notification Channels */}
                    <Grid item xs={12} md={6}>
                      <FormGroup row>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={pref.notify_email}
                              onChange={() => handleToggle(pref.id, 'notify_email')}
                              color="primary"
                            />
                          }
                          label={
                            <Box display="flex" alignItems="center">
                              <EmailIcon fontSize="small" sx={{ mr: 0.5 }} />
                              Email
                            </Box>
                          }
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={pref.notify_sms}
                              onChange={() => handleToggle(pref.id, 'notify_sms')}
                              color="success"
                            />
                          }
                          label={
                            <Box display="flex" alignItems="center">
                              <SmsIcon fontSize="small" sx={{ mr: 0.5 }} />
                              SMS
                            </Box>
                          }
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={pref.notify_in_app}
                              onChange={() => handleToggle(pref.id, 'notify_in_app')}
                              color="warning"
                            />
                          }
                          label={
                            <Box display="flex" alignItems="center">
                              <InAppIcon fontSize="small" sx={{ mr: 0.5 }} />
                              In-App
                            </Box>
                          }
                        />
                      </FormGroup>
                    </Grid>

                    {/* Frequency */}
                    <Grid item xs={12} md={6}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Frequency</InputLabel>
                        <Select
                          value={pref.frequency}
                          label="Frequency"
                          onChange={(e) => handleFrequencyChange(pref.id, e.target.value)}
                          disabled={!pref.notify_email && !pref.notify_sms && !pref.notify_in_app}
                        >
                          {frequencyOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  {index < prefs.length - 1 && <Divider sx={{ mt: 3 }} />}
                </Box>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {preferences.length === 0 && (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              No notification preferences configured. Contact your system administrator.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default NotificationPreferences;
