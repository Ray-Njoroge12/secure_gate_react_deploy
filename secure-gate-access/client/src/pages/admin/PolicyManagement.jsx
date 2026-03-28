/**
 * @file PolicyManagement.jsx
 * @description Policy engine management interface with structured form builders
 * for common policy types and an Advanced JSON editor toggle for power users.
 * Phase A3: Policy Engine & Watchlists
 */

import React, { useState, useEffect, useCallback } from 'react';
import useModalAccessibility from '../../hooks/useModalAccessibility';
import Button from '../../components/ui/Button';
import { useConfirmation } from '../../components/common/ConfirmationDialog';
import api from '../../utils/apiClient';
import logger from '../../utils/logger';
import './PolicyManagement.css';

/* ────────────────────────────────────────────────────────────
   Constants & helpers shared by the form builders
   ──────────────────────────────────────────────────────────── */

const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];

const TIME_WINDOWS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const AVAILABLE_ZONES = [
  { value: 'main_gate', label: 'Main Gate' },
  { value: 'side_gate', label: 'Side Gate' },
  { value: 'parking', label: 'Parking' },
  { value: 'clubhouse', label: 'Clubhouse' },
  { value: 'pool', label: 'Pool Area' },
  { value: 'gym', label: 'Gym' },
  { value: 'garden', label: 'Garden' },
];

const ALERT_EVENT_TYPES = [
  { value: 'unauthorized_entry', label: 'Unauthorized Entry' },
  { value: 'visitor_overstay', label: 'Visitor Overstay' },
  { value: 'repeated_denial', label: 'Repeated Access Denial' },
  { value: 'after_hours_access', label: 'After-Hours Access' },
  { value: 'blacklisted_visitor', label: 'Blacklisted Visitor' },
  { value: 'vehicle_mismatch', label: 'Vehicle Mismatch' },
];

const NOTIFICATION_CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'push', label: 'Push Notification' },
];

/** Policy types that have a dedicated form builder */
const FORM_BUILDER_TYPES = ['visitor_limit', 'access_restriction', 'alert_rule'];

/** Schema hints displayed alongside the JSON editor for complex types */
const SCHEMA_HINTS = {
  escalation_policy: {
    conditions: '{\n  "triggerEvent": "string",\n  "severity": "low | medium | high | critical",\n  "repeatCount": "number (optional)"\n}',
    actions: '{\n  "levels": [\n    {\n      "delayMinutes": 0,\n      "notifyRoles": ["guard"],\n      "channels": ["push"]\n    },\n    {\n      "delayMinutes": 15,\n      "notifyRoles": ["admin"],\n      "channels": ["email", "sms"]\n    }\n  ],\n  "autoResolveMinutes": "number (optional)"\n}',
  },
  time_restriction: {
    conditions: '{\n  "restrictAfter": "HH:MM",\n  "restrictBefore": "HH:MM"\n}',
    actions: '{\n  "action": "block | require_admin_approval",\n  "message": "string"\n}',
  },
  approval_requirement: {
    conditions: '{\n  "visitorType": "contractor | delivery | ...",\n  "requireApprovalFrom": "admin | guard"\n}',
    actions: '{\n  "action": "require_admin_approval",\n  "notifyAdmin": true\n}',
  },
  data_retention: {
    conditions: '{\n  "dataType": "visitor_pii | logs | ...",\n  "retentionDays": "number"\n}',
    actions: '{\n  "action": "auto_delete | archive",\n  "notifyBeforeDays": "number"\n}',
  },
  vehicle_rule: {
    conditions: '{\n  "requireVehiclePlate": true,\n  "allowedPlatePatterns": ["string (optional)"]\n}',
    actions: '{\n  "action": "block | warn",\n  "message": "string"\n}',
  },
};

/* ────────────────────────────────────────────────────────────
   Structured form-field state helpers
   ──────────────────────────────────────────────────────────── */

/** Parse existing JSON strings into structured field state for form builders */
const parseStructuredFields = (type, conditionsStr, actionsStr) => {
  let conditions = {};
  let actions = {};
  try { conditions = typeof conditionsStr === 'string' ? JSON.parse(conditionsStr) : conditionsStr || {}; } catch { /* keep empty */ }
  try { actions = typeof actionsStr === 'string' ? JSON.parse(actionsStr) : actionsStr || {}; } catch { /* keep empty */ }

  if (type === 'visitor_limit') {
    return {
      maxCount: conditions.maxCount ?? conditions.maxVisitorsPerDay ?? 5,
      timeWindow: conditions.timeWindow ?? 'daily',
      scope: conditions.scope ?? 'per_unit',
      action: actions.action ?? 'block',
      message: actions.message ?? 'Visitor limit reached',
      notifyResident: actions.notifyResident ?? true,
    };
  }

  if (type === 'access_restriction') {
    return {
      zones: conditions.zones ?? [],
      startTime: conditions.startTime ?? '22:00',
      endTime: conditions.endTime ?? '06:00',
      daysOfWeek: conditions.daysOfWeek ?? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      action: actions.action ?? 'block',
      message: actions.message ?? 'Access restricted in this zone/time',
    };
  }

  if (type === 'alert_rule') {
    return {
      eventType: conditions.eventType ?? 'unauthorized_entry',
      threshold: conditions.threshold ?? 1,
      windowMinutes: conditions.windowMinutes ?? 60,
      channels: actions.channels ?? ['email'],
      message: actions.message ?? 'Alert triggered',
      severity: actions.severity ?? 'medium',
    };
  }

  return null;
};

/** Convert structured fields back into { conditions, actions } JSON objects */
const structuredFieldsToJson = (type, fields) => {
  if (type === 'visitor_limit') {
    return {
      conditions: { maxCount: fields.maxCount, timeWindow: fields.timeWindow, scope: fields.scope },
      actions: { action: fields.action, message: fields.message, notifyResident: fields.notifyResident },
    };
  }
  if (type === 'access_restriction') {
    return {
      conditions: { zones: fields.zones, startTime: fields.startTime, endTime: fields.endTime, daysOfWeek: fields.daysOfWeek },
      actions: { action: fields.action, message: fields.message },
    };
  }
  if (type === 'alert_rule') {
    return {
      conditions: { eventType: fields.eventType, threshold: fields.threshold, windowMinutes: fields.windowMinutes },
      actions: { channels: fields.channels, message: fields.message, severity: fields.severity },
    };
  }
  return null;
};

/** Validate structured fields; returns a map of fieldName -> error message */
const validateStructuredFields = (type, fields) => {
  const errors = {};

  if (type === 'visitor_limit') {
    if (!fields.maxCount || fields.maxCount < 1) errors.maxCount = 'Must be at least 1';
    if (!fields.timeWindow) errors.timeWindow = 'Required';
    if (!fields.message || !fields.message.trim()) errors.message = 'Message is required';
  }

  if (type === 'access_restriction') {
    if (!fields.zones || fields.zones.length === 0) errors.zones = 'Select at least one zone';
    if (!fields.startTime) errors.startTime = 'Start time is required';
    if (!fields.endTime) errors.endTime = 'End time is required';
    if (!fields.daysOfWeek || fields.daysOfWeek.length === 0) errors.daysOfWeek = 'Select at least one day';
    if (!fields.message || !fields.message.trim()) errors.message = 'Message is required';
  }

  if (type === 'alert_rule') {
    if (!fields.eventType) errors.eventType = 'Required';
    if (!fields.threshold || fields.threshold < 1) errors.threshold = 'Must be at least 1';
    if (!fields.windowMinutes || fields.windowMinutes < 1) errors.windowMinutes = 'Must be at least 1 minute';
    if (!fields.channels || fields.channels.length === 0) errors.channels = 'Select at least one channel';
    if (!fields.message || !fields.message.trim()) errors.message = 'Message is required';
  }

  return errors;
};

/* ────────────────────────────────────────────────────────────
   Form Builder sub-components
   ──────────────────────────────────────────────────────────── */

const FieldError = ({ error }) => {
  if (!error) return null;
  return <small className="field-error">{error}</small>;
};

const VisitorLimitForm = ({ fields, onChange, errors }) => (
  <div className="structured-form">
    <h4 className="form-section-title">Conditions</h4>
    <div className="form-row">
      <div className="form-group">
        <label htmlFor="vl-maxCount">Max Visitor Count *</label>
        <input
          id="vl-maxCount"
          type="number"
          min="1"
          value={fields.maxCount}
          onChange={(e) => onChange({ ...fields, maxCount: parseInt(e.target.value, 10) || 0 })}
          className={errors.maxCount ? 'input-error' : ''}
        />
        <FieldError error={errors.maxCount} />
      </div>
      <div className="form-group">
        <label htmlFor="vl-timeWindow">Time Window *</label>
        <select
          id="vl-timeWindow"
          value={fields.timeWindow}
          onChange={(e) => onChange({ ...fields, timeWindow: e.target.value })}
          className={errors.timeWindow ? 'input-error' : ''}
        >
          {TIME_WINDOWS.map((tw) => (
            <option key={tw.value} value={tw.value}>{tw.label}</option>
          ))}
        </select>
        <FieldError error={errors.timeWindow} />
      </div>
    </div>
    <div className="form-group">
      <label htmlFor="vl-scope">Scope</label>
      <select
        id="vl-scope"
        value={fields.scope}
        onChange={(e) => onChange({ ...fields, scope: e.target.value })}
      >
        <option value="per_unit">Per Unit</option>
        <option value="per_estate">Per Estate</option>
      </select>
    </div>

    <h4 className="form-section-title">Actions</h4>
    <div className="form-row">
      <div className="form-group">
        <label htmlFor="vl-action">Action</label>
        <select
          id="vl-action"
          value={fields.action}
          onChange={(e) => onChange({ ...fields, action: e.target.value })}
        >
          <option value="block">Block</option>
          <option value="warn">Warn</option>
          <option value="require_admin_approval">Require Admin Approval</option>
        </select>
      </div>
      <div className="form-group">
        <label className="checkbox-label" style={{ marginTop: '28px' }}>
          <input
            type="checkbox"
            checked={fields.notifyResident}
            onChange={(e) => onChange({ ...fields, notifyResident: e.target.checked })}
          />
          <span>Notify Resident</span>
        </label>
      </div>
    </div>
    <div className="form-group">
      <label htmlFor="vl-message">Message *</label>
      <input
        id="vl-message"
        type="text"
        value={fields.message}
        onChange={(e) => onChange({ ...fields, message: e.target.value })}
        className={errors.message ? 'input-error' : ''}
        placeholder="Message shown when limit is reached"
      />
      <FieldError error={errors.message} />
    </div>
  </div>
);

const AccessRestrictionForm = ({ fields, onChange, errors }) => {
  const toggleZone = (zone) => {
    const zones = fields.zones.includes(zone)
      ? fields.zones.filter((z) => z !== zone)
      : [...fields.zones, zone];
    onChange({ ...fields, zones });
  };

  const toggleDay = (day) => {
    const daysOfWeek = fields.daysOfWeek.includes(day)
      ? fields.daysOfWeek.filter((d) => d !== day)
      : [...fields.daysOfWeek, day];
    onChange({ ...fields, daysOfWeek });
  };

  return (
    <div className="structured-form">
      <h4 className="form-section-title">Conditions</h4>
      <div className="form-group">
        <label>Restricted Zones *</label>
        <div className="multi-select-grid">
          {AVAILABLE_ZONES.map((zone) => (
            <label key={zone.value} className="chip-label">
              <input
                type="checkbox"
                checked={fields.zones.includes(zone.value)}
                onChange={() => toggleZone(zone.value)}
              />
              <span className={`chip ${fields.zones.includes(zone.value) ? 'chip-active' : ''}`}>
                {zone.label}
              </span>
            </label>
          ))}
        </div>
        <FieldError error={errors.zones} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="ar-startTime">Start Time *</label>
          <input
            id="ar-startTime"
            type="time"
            value={fields.startTime}
            onChange={(e) => onChange({ ...fields, startTime: e.target.value })}
            className={errors.startTime ? 'input-error' : ''}
          />
          <FieldError error={errors.startTime} />
        </div>
        <div className="form-group">
          <label htmlFor="ar-endTime">End Time *</label>
          <input
            id="ar-endTime"
            type="time"
            value={fields.endTime}
            onChange={(e) => onChange({ ...fields, endTime: e.target.value })}
            className={errors.endTime ? 'input-error' : ''}
          />
          <FieldError error={errors.endTime} />
        </div>
      </div>

      <div className="form-group">
        <label>Days of Week *</label>
        <div className="multi-select-grid">
          {DAYS_OF_WEEK.map((day) => (
            <label key={day.value} className="chip-label">
              <input
                type="checkbox"
                checked={fields.daysOfWeek.includes(day.value)}
                onChange={() => toggleDay(day.value)}
              />
              <span className={`chip ${fields.daysOfWeek.includes(day.value) ? 'chip-active' : ''}`}>
                {day.label}
              </span>
            </label>
          ))}
        </div>
        <FieldError error={errors.daysOfWeek} />
      </div>

      <h4 className="form-section-title">Actions</h4>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="ar-action">Action</label>
          <select
            id="ar-action"
            value={fields.action}
            onChange={(e) => onChange({ ...fields, action: e.target.value })}
          >
            <option value="block">Block</option>
            <option value="warn">Warn</option>
            <option value="require_admin_approval">Require Admin Approval</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="ar-message">Message *</label>
          <input
            id="ar-message"
            type="text"
            value={fields.message}
            onChange={(e) => onChange({ ...fields, message: e.target.value })}
            className={errors.message ? 'input-error' : ''}
            placeholder="Restriction message"
          />
          <FieldError error={errors.message} />
        </div>
      </div>
    </div>
  );
};

const AlertRuleForm = ({ fields, onChange, errors }) => {
  const toggleChannel = (channel) => {
    const channels = fields.channels.includes(channel)
      ? fields.channels.filter((c) => c !== channel)
      : [...fields.channels, channel];
    onChange({ ...fields, channels });
  };

  return (
    <div className="structured-form">
      <h4 className="form-section-title">Conditions</h4>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="alr-eventType">Event Type *</label>
          <select
            id="alr-eventType"
            value={fields.eventType}
            onChange={(e) => onChange({ ...fields, eventType: e.target.value })}
            className={errors.eventType ? 'input-error' : ''}
          >
            {ALERT_EVENT_TYPES.map((et) => (
              <option key={et.value} value={et.value}>{et.label}</option>
            ))}
          </select>
          <FieldError error={errors.eventType} />
        </div>
        <div className="form-group">
          <label htmlFor="alr-threshold">Threshold *</label>
          <input
            id="alr-threshold"
            type="number"
            min="1"
            value={fields.threshold}
            onChange={(e) => onChange({ ...fields, threshold: parseInt(e.target.value, 10) || 0 })}
            className={errors.threshold ? 'input-error' : ''}
          />
          <small>Number of occurrences before alert fires</small>
          <FieldError error={errors.threshold} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="alr-windowMinutes">Time Window (minutes) *</label>
        <input
          id="alr-windowMinutes"
          type="number"
          min="1"
          value={fields.windowMinutes}
          onChange={(e) => onChange({ ...fields, windowMinutes: parseInt(e.target.value, 10) || 0 })}
          className={errors.windowMinutes ? 'input-error' : ''}
        />
        <small>Occurrences within this window count toward threshold</small>
        <FieldError error={errors.windowMinutes} />
      </div>

      <h4 className="form-section-title">Actions</h4>
      <div className="form-group">
        <label>Notification Channels *</label>
        <div className="multi-select-grid">
          {NOTIFICATION_CHANNELS.map((ch) => (
            <label key={ch.value} className="chip-label">
              <input
                type="checkbox"
                checked={fields.channels.includes(ch.value)}
                onChange={() => toggleChannel(ch.value)}
              />
              <span className={`chip ${fields.channels.includes(ch.value) ? 'chip-active' : ''}`}>
                {ch.label}
              </span>
            </label>
          ))}
        </div>
        <FieldError error={errors.channels} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="alr-severity">Severity</label>
          <select
            id="alr-severity"
            value={fields.severity}
            onChange={(e) => onChange({ ...fields, severity: e.target.value })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="alr-message">Message *</label>
          <input
            id="alr-message"
            type="text"
            value={fields.message}
            onChange={(e) => onChange({ ...fields, message: e.target.value })}
            className={errors.message ? 'input-error' : ''}
            placeholder="Alert notification message"
          />
          <FieldError error={errors.message} />
        </div>
      </div>
    </div>
  );
};

/** Schema hint panel shown alongside the JSON editor for complex types */
const SchemaHintPanel = ({ type }) => {
  const hint = SCHEMA_HINTS[type];
  if (!hint) return null;
  return (
    <div className="schema-hint-panel">
      <h4 className="schema-hint-title">Expected JSON Structure</h4>
      <div className="schema-hint-section">
        <span className="schema-hint-label">Conditions:</span>
        <pre className="schema-hint-code">{hint.conditions}</pre>
      </div>
      <div className="schema-hint-section">
        <span className="schema-hint-label">Actions:</span>
        <pre className="schema-hint-code">{hint.actions}</pre>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Main component
   ──────────────────────────────────────────────────────────── */

const PolicyManagement = () => {
  const { confirm, dialogProps, Dialog: ConfirmDialog } = useConfirmation();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const closeModal = () => setShowModal(false);
  const { modalRef } = useModalAccessibility(showModal, closeModal);

  // Whether the user has toggled to "Advanced / Edit JSON" mode
  const [jsonMode, setJsonMode] = useState(false);
  // Structured field state for form-builder types
  const [structuredFields, setStructuredFields] = useState(null);
  // Field-level validation errors for structured forms
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'visitor_limit',
    conditions: '{}',
    actions: '{}',
    enabled: true,
    priority: 0
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/policies');
      setPolicies(response.data.data || []);
    } catch (err) {
      logger.error('Error fetching policies:', err);
    } finally {
      setLoading(false);
    }
  };

  /** Determine whether a given type supports the structured form builder */
  const hasFormBuilder = (type) => FORM_BUILDER_TYPES.includes(type);

  /** Sync structured fields into the raw JSON formData (for seamless toggle) */
  const syncStructuredToJson = useCallback((type, fields) => {
    const json = structuredFieldsToJson(type, fields);
    if (json) {
      setFormData((prev) => ({
        ...prev,
        conditions: JSON.stringify(json.conditions, null, 2),
        actions: JSON.stringify(json.actions, null, 2),
      }));
    }
  }, []);

  /** When the user changes the policy type */
  const handleTypeChange = (newType) => {
    const template = policyTemplates[newType];
    const newConditions = template
      ? JSON.stringify(template.conditions, null, 2)
      : '{}';
    const newActions = template
      ? JSON.stringify(template.actions, null, 2)
      : '{}';

    setFormData((prev) => ({
      ...prev,
      type: newType,
      conditions: newConditions,
      actions: newActions,
    }));

    if (hasFormBuilder(newType)) {
      setStructuredFields(parseStructuredFields(newType, newConditions, newActions));
      setJsonMode(false);
    } else {
      setStructuredFields(null);
      setJsonMode(false);
    }
    setFieldErrors({});
  };

  /** Toggle between form builder and raw JSON */
  const handleToggleJsonMode = () => {
    if (jsonMode && hasFormBuilder(formData.type)) {
      // Switching back to form mode — parse current JSON into structured fields
      setStructuredFields(parseStructuredFields(formData.type, formData.conditions, formData.actions));
      setFieldErrors({});
    } else if (!jsonMode && structuredFields) {
      // Switching to JSON mode — push structured fields into JSON strings
      syncStructuredToJson(formData.type, structuredFields);
    }
    setJsonMode(!jsonMode);
  };

  /** Update structured fields and keep JSON in sync */
  const handleStructuredChange = (newFields) => {
    setStructuredFields(newFields);
    // Clear errors for fields that now have values
    if (Object.keys(fieldErrors).length > 0) {
      const fresh = validateStructuredFields(formData.type, newFields);
      setFieldErrors(fresh);
    }
    syncStructuredToJson(formData.type, newFields);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate structured fields if in form mode
    if (!jsonMode && hasFormBuilder(formData.type) && structuredFields) {
      const errors = validateStructuredFields(formData.type, structuredFields);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      // Ensure JSON is up-to-date before submitting
      syncStructuredToJson(formData.type, structuredFields);
    }

    try {
      const url = editingPolicy
        ? `/api/admin/policies/${editingPolicy.id}`
        : '/api/admin/policies';

      const payload = {
        ...formData,
        conditions: JSON.parse(formData.conditions),
        actions: JSON.parse(formData.actions)
      };

      if (editingPolicy) {
        await api.put(url, payload);
      } else {
        await api.post(url, payload);
      }

      await fetchPolicies();
      setShowModal(false);
      resetForm();
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  const deletePolicy = async (id) => {
    const ok = await confirm({
      title: 'Delete Policy',
      message: 'Are you sure you want to delete this policy?',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!ok) return;

    try {
      await api.delete(`/api/admin/policies/${id}`);
      await fetchPolicies();
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  const togglePolicy = async (policy) => {
    try {
      await api.put(`/api/admin/policies/${policy.id}`, { ...policy, enabled: !policy.enabled });
      await fetchPolicies();
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  const openEditModal = (policy) => {
    setEditingPolicy(policy);
    const condStr = JSON.stringify(policy.conditions, null, 2);
    const actStr = JSON.stringify(policy.actions, null, 2);
    setFormData({
      name: policy.name,
      description: policy.description || '',
      type: policy.type,
      conditions: condStr,
      actions: actStr,
      enabled: policy.enabled,
      priority: policy.priority
    });

    if (hasFormBuilder(policy.type)) {
      setStructuredFields(parseStructuredFields(policy.type, condStr, actStr));
      setJsonMode(false);
    } else {
      setStructuredFields(null);
      setJsonMode(false);
    }
    setFieldErrors({});
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingPolicy(null);
    const defaultType = 'visitor_limit';
    const template = policyTemplates[defaultType];
    const condStr = JSON.stringify(template.conditions, null, 2);
    const actStr = JSON.stringify(template.actions, null, 2);
    setFormData({
      name: '',
      description: '',
      type: defaultType,
      conditions: condStr,
      actions: actStr,
      enabled: true,
      priority: 0
    });
    setStructuredFields(parseStructuredFields(defaultType, condStr, actStr));
    setJsonMode(false);
    setFieldErrors({});
  };

  const policyTemplates = {
    visitor_limit: {
      conditions: { maxCount: 5, timeWindow: 'daily', scope: 'per_unit' },
      actions: { action: 'block', message: 'Daily visitor limit reached', notifyResident: true }
    },
    access_restriction: {
      conditions: { zones: ['main_gate'], startTime: '22:00', endTime: '06:00', daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
      actions: { action: 'block', message: 'Access restricted in this zone/time' }
    },
    alert_rule: {
      conditions: { eventType: 'unauthorized_entry', threshold: 3, windowMinutes: 60 },
      actions: { channels: ['email', 'push'], message: 'Security alert triggered', severity: 'high' }
    },
    time_restriction: {
      conditions: { restrictAfter: '22:00', restrictBefore: '06:00' },
      actions: { action: 'require_admin_approval', message: 'Late night visitors require approval' }
    },
    approval_requirement: {
      conditions: { visitorType: 'contractor', requireApprovalFrom: 'admin' },
      actions: { action: 'require_admin_approval', notifyAdmin: true }
    },
    data_retention: {
      conditions: { dataType: 'visitor_pii', retentionDays: 90 },
      actions: { action: 'auto_delete', notifyBeforeDays: 7 }
    },
    vehicle_rule: {
      conditions: { requireVehiclePlate: true },
      actions: { action: 'block', message: 'Vehicle registration required' }
    },
    escalation_policy: {
      conditions: { triggerEvent: 'unauthorized_entry', severity: 'high' },
      actions: { levels: [{ delayMinutes: 0, notifyRoles: ['guard'], channels: ['push'] }, { delayMinutes: 15, notifyRoles: ['admin'], channels: ['email', 'sms'] }] }
    }
  };

  const getPolicyTypeIcon = (type) => {
    const icons = {
      visitor_limit: '👥',
      access_restriction: '🔒',
      alert_rule: '🔔',
      time_restriction: '⏰',
      approval_requirement: '✅',
      data_retention: '🗄️',
      vehicle_rule: '🚗',
      escalation_policy: '📢'
    };
    return icons[type] || '📋';
  };

  /** Render the conditions/actions editor area of the modal */
  const renderPolicyEditor = () => {
    const showFormBuilder = hasFormBuilder(formData.type) && !jsonMode;
    const showSchemaHints = !hasFormBuilder(formData.type) && SCHEMA_HINTS[formData.type];

    return (
      <>
        {/* Toggle button — shown for form-builder types */}
        {hasFormBuilder(formData.type) && (
          <div className="editor-mode-toggle">
            <button
              type="button"
              className={`mode-toggle-btn ${!jsonMode ? 'mode-active' : ''}`}
              onClick={() => { if (jsonMode) handleToggleJsonMode(); }}
            >
              Form Builder
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${jsonMode ? 'mode-active' : ''}`}
              onClick={() => { if (!jsonMode) handleToggleJsonMode(); }}
            >
              Advanced / Edit JSON
            </button>
          </div>
        )}

        {/* Structured form builder */}
        {showFormBuilder && structuredFields && (
          <>
            {formData.type === 'visitor_limit' && (
              <VisitorLimitForm
                fields={structuredFields}
                onChange={handleStructuredChange}
                errors={fieldErrors}
              />
            )}
            {formData.type === 'access_restriction' && (
              <AccessRestrictionForm
                fields={structuredFields}
                onChange={handleStructuredChange}
                errors={fieldErrors}
              />
            )}
            {formData.type === 'alert_rule' && (
              <AlertRuleForm
                fields={structuredFields}
                onChange={handleStructuredChange}
                errors={fieldErrors}
              />
            )}
          </>
        )}

        {/* Raw JSON editor (always shown for non-builder types, or when toggled) */}
        {(!showFormBuilder) && (
          <div className={showSchemaHints ? 'json-editor-with-hints' : ''}>
            <div className="json-editor-column">
              <div className="form-group">
                <label>Conditions (JSON) *</label>
                <textarea
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  rows="6"
                  className="code-editor"
                  required
                />
                <small>Define when this policy should trigger</small>
              </div>

              <div className="form-group">
                <label>Actions (JSON) *</label>
                <textarea
                  value={formData.actions}
                  onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
                  rows="6"
                  className="code-editor"
                  required
                />
                <small>Define what happens when policy is triggered</small>
              </div>
            </div>

            {showSchemaHints && <SchemaHintPanel type={formData.type} />}
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="policy-management">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="policy-management">
      {error && <div role="alert" style={{ color: 'red', padding: '8px', marginBottom: '8px' }}>{error}</div>}
      <div className="policy-header">
        <div className="header-left">
          <h1>📋 Policy Management</h1>
          <p className="subtitle">Manage business rules and automation policies</p>
        </div>
        <Button
          className="btn-create"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Create Policy
        </Button>
      </div>

      <div className="policies-list">
        {policies.length === 0 ? (
          <div className="empty-state">
            <p>No policies configured yet.</p>
            <Button className="btn-primary" onClick={() => setShowModal(true)}>
              Create First Policy
            </Button>
          </div>
        ) : (
          <div className="policies-grid">
            {policies.map(policy => (
              <div key={policy.id} className={`policy-card ${!policy.enabled ? 'disabled' : ''}`}>
                <div className="policy-card-header">
                  <div className="policy-title">
                    <span className="policy-icon">{getPolicyTypeIcon(policy.type)}</span>
                    <h3>{policy.name}</h3>
                  </div>
                  <div className="policy-actions">
                    <Button
                      variant="ghost"
                      className={`toggle-btn ${policy.enabled ? 'active' : ''}`}
                      onClick={() => togglePolicy(policy)}
                      aria-label={policy.enabled ? 'Disable policy' : 'Enable policy'}
                    >
                      {policy.enabled ? '✓' : '○'}
                    </Button>
                  </div>
                </div>

                <p className="policy-description">{policy.description || 'No description'}</p>

                <div className="policy-meta">
                  <span className="policy-type">{policy.type.replace('_', ' ')}</span>
                  <span className="policy-priority">Priority: {policy.priority}</span>
                </div>

                <div className="policy-footer">
                  <Button
                    className="btn-edit"
                    onClick={() => openEditModal(policy)}
                  >
                    Edit
                  </Button>
                  <Button
                    className="btn-delete"
                    onClick={() => deletePolicy(policy.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal} role="presentation" aria-hidden="true">
          <div
            className="modal-content large"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-modal-title"
            tabIndex={-1}
          >
            <div className="modal-header">
              <h2 id="policy-modal-title">{editingPolicy ? 'Edit Policy' : 'Create Policy'}</h2>
              <Button variant="ghost" className="modal-close" onClick={closeModal} aria-label="Close">×</Button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Policy Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Policy Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    required
                  >
                    <option value="visitor_limit">Visitor Limit</option>
                    <option value="access_restriction">Access Restriction</option>
                    <option value="alert_rule">Alert Rule</option>
                    <option value="time_restriction">Time Restriction</option>
                    <option value="approval_requirement">Approval Requirement</option>
                    <option value="data_retention">Data Retention</option>
                    <option value="vehicle_rule">Vehicle Rule</option>
                    <option value="escalation_policy">Escalation Policy</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="2"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                    min="0"
                  />
                  <small>Higher number = higher priority</small>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                    />
                    <span>Enabled</span>
                  </label>
                </div>
              </div>

              {renderPolicyEditor()}

              <div className="modal-footer">
                <Button variant="secondary" className="btn-cancel" onClick={closeModal}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" className="btn-primary">
                  {editingPolicy ? 'Update Policy' : 'Create Policy'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
};

export default PolicyManagement;
