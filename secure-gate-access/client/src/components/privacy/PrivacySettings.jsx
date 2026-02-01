/**
 * Privacy Settings Component
 * 
 * Provides granular privacy controls with clear descriptions of each setting's impact.
 * Implements GDPR/KDPA compliance with immediate setting application and consent management.
 */

import React, { useState, useEffect } from 'react';
import privacyService from '../../services/privacyService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import './PrivacySettings.css';

const PrivacySettings = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [settings, setSettings] = useState(null);
  const [consentStatus, setConsentStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('privacy-controls');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState(null);

  useEffect(() => {
    loadPrivacyData();
  }, []);

  const loadPrivacyData = async () => {
    try {
      setLoading(true);
      const [settingsData, consentData] = await Promise.all([
        privacyService.getPrivacySettings(),
        privacyService.getConsentStatus()
      ]);

      setSettings(settingsData.settings);
      setConsentStatus(consentData.consentStatus);
    } catch (error) {
      console.error('Failed to load privacy data:', error);
      showNotification('Failed to load privacy settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (settingName, value) => {
    try {
      setSaving(true);

      const updatedSettings = {
        ...settings,
        [settingName]: value
      };

      const result = await privacyService.updatePrivacySettings(updatedSettings);
      setSettings(result.settings);

      showNotification('Privacy setting updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update privacy setting:', error);
      showNotification('Failed to update privacy setting', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConsentChange = async (consentType, granted) => {
    try {
      setSaving(true);

      const result = await privacyService.updateConsent(consentType, granted, {
        previousState: consentStatus[consentType]?.granted
      });

      setConsentStatus(prev => ({
        ...prev,
        [consentType]: {
          ...prev[consentType],
          granted: result.consent.granted,
          lastUpdated: result.consent.recordedAt
        }
      }));

      showNotification(
        `Consent ${granted ? 'granted' : 'withdrawn'} successfully`,
        'success'
      );
    } catch (error) {
      console.error('Failed to update consent:', error);
      showNotification('Failed to update consent', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openConsentModal = (consentType) => {
    setSelectedConsent(consentType);
    setShowConsentModal(true);
  };

  const confirmConsentChange = async (granted) => {
    if (selectedConsent) {
      await handleConsentChange(selectedConsent, granted);
      setShowConsentModal(false);
      setSelectedConsent(null);
    }
  };

  if (loading) {
    return (
      <div className="privacy-settings-loading">
        <div className="loading-spinner"></div>
        <p>Loading privacy settings...</p>
      </div>
    );
  }

  return (
    <div className="privacy-settings">
      <div className="privacy-settings-header">
        <h1>Privacy & Data Protection</h1>
        <p className="privacy-description">
          Manage your privacy preferences and control how your data is processed.
          All changes take effect immediately and are logged for your security.
        </p>
      </div>

      <div className="privacy-tabs">
        <button
          className={`tab-button ${activeTab === 'privacy-controls' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy-controls')}
        >
          Privacy Controls
        </button>
        <button
          className={`tab-button ${activeTab === 'consent-management' ? 'active' : ''}`}
          onClick={() => setActiveTab('consent-management')}
        >
          Consent Management
        </button>
        <button
          className={`tab-button ${activeTab === 'data-rights' ? 'active' : ''}`}
          onClick={() => setActiveTab('data-rights')}
        >
          Your Data Rights
        </button>
        <button
          className={`tab-button ${activeTab === 'audit-trail' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit-trail')}
        >
          Privacy Audit Trail
        </button>
      </div>

      <div className="privacy-content">
        {activeTab === 'privacy-controls' && (
          <PrivacyControlsTab
            settings={settings}
            onSettingChange={handleSettingChange}
            saving={saving}
          />
        )}

        {activeTab === 'consent-management' && (
          <ConsentManagementTab
            consentStatus={consentStatus}
            onConsentClick={openConsentModal}
            saving={saving}
          />
        )}

        {activeTab === 'data-rights' && (
          <DataRightsTab user={user} />
        )}

        {activeTab === 'audit-trail' && (
          <AuditTrailTab user={user} />
        )}
      </div>

      {showConsentModal && (
        <ConsentModal
          consentType={selectedConsent}
          currentStatus={consentStatus[selectedConsent]}
          onConfirm={confirmConsentChange}
          onCancel={() => setShowConsentModal(false)}
        />
      )}
    </div>
  );
};

const PrivacyControlsTab = ({ settings, onSettingChange, saving }) => {
  if (!settings) return null;

  const settingsWithDescriptions = settings.settingsWithDescriptions || {};

  return (
    <div className="privacy-controls-tab">
      <div className="settings-section">
        <h2>Data Processing Preferences</h2>
        <p className="section-description">
          Control how your personal data is processed and shared within the system.
        </p>

        {Object.entries(settingsWithDescriptions).map(([key, setting]) => (
          <div key={key} className="privacy-setting-item">
            <div className="setting-header">
              <div className="setting-info">
                <h3>{setting.title}</h3>
                <p className="setting-description">{setting.description}</p>
                <div className="setting-impact">
                  <strong>Impact:</strong> {setting.impact}
                </div>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={setting.value}
                    onChange={(e) => onSettingChange(key, e.target.checked)}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
            <div className="setting-category">
              Category: <span className="category-tag">{setting.category}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="settings-section">
        <h2>Data Retention Preferences</h2>
        <div className="privacy-setting-item">
          <div className="setting-header">
            <div className="setting-info">
              <h3>Data Retention Period</h3>
              <p className="setting-description">
                Choose how long your data should be retained in the system.
              </p>
            </div>
            <div className="setting-control">
              <select
                value={settings.dataRetentionPeriod || '2_years'}
                onChange={(e) => onSettingChange('dataRetentionPeriod', e.target.value)}
                disabled={saving}
                className="retention-select"
              >
                <option value="1_year">1 Year</option>
                <option value="2_years">2 Years (Recommended)</option>
                <option value="3_years">3 Years</option>
                <option value="5_years">5 Years</option>
                <option value="indefinite">Indefinite</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Communication Preferences</h2>
        <div className="communication-grid">
          {settings.communicationPreferences && Object.entries(settings.communicationPreferences).map(([channel, enabled]) => (
            <div key={channel} className="communication-item">
              <label className="communication-label">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => onSettingChange('communicationPreferences', {
                    ...settings.communicationPreferences,
                    [channel]: e.target.checked
                  })}
                  disabled={saving}
                />
                <span className="channel-name">{channel.toUpperCase()}</span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ConsentManagementTab = ({ consentStatus, onConsentClick, saving }) => {
  return (
    <div className="consent-management-tab">
      <div className="consent-section">
        <h2>Data Processing Consents</h2>
        <p className="section-description">
          Manage your consent for different types of data processing. You can withdraw consent at any time.
        </p>

        <div className="consent-grid">
          {Object.entries(consentStatus).map(([consentType, consent]) => (
            <div key={consentType} className="consent-item">
              <div className="consent-header">
                <h3>{formatConsentType(consentType)}</h3>
                <div className={`consent-status ${consent.granted ? 'granted' : 'withdrawn'}`}>
                  {consent.granted ? 'Granted' : 'Not Granted'}
                </div>
              </div>

              <p className="consent-description">{consent.description}</p>

              <div className="consent-details">
                {consent.lastUpdated && (
                  <div className="consent-meta">
                    <span>Last updated: {new Date(consent.lastUpdated).toLocaleDateString()}</span>
                  </div>
                )}

                {consent.expiresAt && (
                  <div className="consent-meta">
                    <span>Expires: {new Date(consent.expiresAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="consent-actions">
                <button
                  className={`consent-button ${consent.granted ? 'withdraw' : 'grant'}`}
                  onClick={() => onConsentClick(consentType)}
                  disabled={saving}
                >
                  {consent.granted ? 'Withdraw Consent' : 'Grant Consent'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DataRightsTab = ({ user }) => {
  const [requestType, setRequestType] = useState('');
  const [requestDetails, setRequestDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showNotification } = useNotification();

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!requestType) {
      showNotification('Please select a request type', 'error');
      return;
    }

    try {
      setSubmitting(true);

      await privacyService.submitDataSubjectRequest(requestType, {
        reason: requestDetails,
        urgency: 'normal',
        contactMethod: 'email'
      });

      showNotification('Data subject request submitted successfully', 'success');
      setRequestType('');
      setRequestDetails('');
    } catch (error) {
      console.error('Failed to submit data subject request:', error);
      showNotification('Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="data-rights-tab">
      <div className="rights-section">
        <h2>Your Data Rights</h2>
        <p className="section-description">
          Under GDPR and KDPA, you have several rights regarding your personal data.
          You can exercise these rights by submitting a request below.
        </p>

        <div className="rights-info">
          <div className="right-item">
            <h3>Right of Access</h3>
            <p>Request a copy of all personal data we hold about you.</p>
          </div>

          <div className="right-item">
            <h3>Right to Rectification</h3>
            <p>Request correction of inaccurate or incomplete personal data.</p>
          </div>

          <div className="right-item">
            <h3>Right to Erasure</h3>
            <p>Request deletion of your personal data (subject to legal requirements).</p>
          </div>

          <div className="right-item">
            <h3>Right to Data Portability</h3>
            <p>Request your data in a structured, machine-readable format.</p>
          </div>

          <div className="right-item">
            <h3>Right to Restrict Processing</h3>
            <p>Request limitation of how your data is processed.</p>
          </div>

          <div className="right-item">
            <h3>Right to Object</h3>
            <p>Object to processing of your data for specific purposes.</p>
          </div>
        </div>

        <form onSubmit={handleSubmitRequest} className="data-request-form">
          <h3>Submit a Data Subject Request</h3>

          <div className="form-group">
            <label htmlFor="requestType">Request Type</label>
            <select
              id="requestType"
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              required
            >
              <option value="">Select a request type</option>
              <option value="data_access">Data Access Request</option>
              <option value="data_rectification">Data Rectification</option>
              <option value="data_erasure">Data Erasure (Right to be Forgotten)</option>
              <option value="data_portability">Data Portability</option>
              <option value="processing_restriction">Restrict Processing</option>
              <option value="object_processing">Object to Processing</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="requestDetails">Additional Details</label>
            <textarea
              id="requestDetails"
              value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
              placeholder="Please provide any additional details about your request..."
              rows={4}
            />
          </div>

          <button
            type="submit"
            className="submit-request-button"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>

        <div className="request-info">
          <p><strong>Processing Time:</strong> We will respond to your request within 30 days.</p>
          <p><strong>Verification:</strong> We may need to verify your identity before processing your request.</p>
          <p><strong>Contact:</strong> For urgent requests, please contact our Data Protection Officer.</p>
        </div>
      </div>
    </div>
  );
};

const AuditTrailTab = ({ user }) => {
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditTrail();
  }, []);

  const loadAuditTrail = async () => {
    try {
      setLoading(true);
      const result = await privacyService.getPrivacyAuditTrail();
      setAuditTrail(result.auditTrail);
    } catch (error) {
      console.error('Failed to load audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading audit trail...</div>;
  }

  return (
    <div className="audit-trail-tab">
      <div className="audit-section">
        <h2>Privacy Audit Trail</h2>
        <p className="section-description">
          Complete log of all privacy-related actions on your account.
        </p>

        <div className="audit-timeline">
          {auditTrail.map((entry, index) => (
            <div key={index} className="audit-entry">
              <div className="audit-timestamp">
                {new Date(entry.timestamp).toLocaleString()}
              </div>
              <div className="audit-action">
                <h4>{formatAuditAction(entry.action)}</h4>
                <p>{entry.description}</p>
                {entry.details && (
                  <div className="audit-details">
                    <pre>{JSON.stringify(entry.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ConsentModal = ({ consentType, currentStatus, onConfirm, onCancel }) => {
  const isGranting = !currentStatus?.granted;

  return (
    <div className="consent-modal-overlay">
      <div className="consent-modal">
        <div className="modal-header">
          <h2>{isGranting ? 'Grant' : 'Withdraw'} Consent</h2>
        </div>

        <div className="modal-content">
          <p>
            Are you sure you want to {isGranting ? 'grant' : 'withdraw'} consent for{' '}
            <strong>{formatConsentType(consentType)}</strong>?
          </p>

          <div className="consent-impact">
            <h4>Impact of this change:</h4>
            <p>{getConsentImpactDescription(consentType, isGranting)}</p>
          </div>

          {!isGranting && (
            <div className="withdrawal-warning">
              <strong>Note:</strong> Withdrawing consent may limit some system functionality.
              This change takes effect immediately.
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            className="cancel-button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={`confirm-button ${isGranting ? 'grant' : 'withdraw'}`}
            onClick={() => onConfirm(isGranting)}
          >
            {isGranting ? 'Grant Consent' : 'Withdraw Consent'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const formatConsentType = (consentType) => {
  const formats = {
    'data_processing': 'Data Processing',
    'marketing_communications': 'Marketing Communications',
    'analytics_tracking': 'Analytics Tracking',
    'third_party_sharing': 'Third-Party Sharing',
    'location_tracking': 'Location Tracking',
    'biometric_data': 'Biometric Data Processing',
    'automated_decision_making': 'Automated Decision Making'
  };
  return formats[consentType] || consentType;
};

const formatAuditAction = (action) => {
  const formats = {
    'privacy_settings_viewed': 'Privacy Settings Viewed',
    'privacy_settings_updated': 'Privacy Settings Updated',
    'consent_granted': 'Consent Granted',
    'consent_withdrawn': 'Consent Withdrawn',
    'data_subject_request': 'Data Subject Request Submitted',
    'data_access': 'Data Access Request',
    'data_export': 'Data Export Request'
  };
  return formats[action] || action;
};

const getConsentImpactDescription = (consentType, isGranting) => {
  const impacts = {
    'data_processing': isGranting
      ? 'Your data will be processed for service provision and improvement.'
      : 'Basic data processing will continue only as necessary for service provision.',
    'marketing_communications': isGranting
      ? 'You will receive marketing emails and promotional content.'
      : 'You will no longer receive marketing communications.',
    'analytics_tracking': isGranting
      ? 'Your usage patterns will be analyzed to improve system performance.'
      : 'Analytics tracking will be disabled for your account.',
    'third_party_sharing': isGranting
      ? 'Your data may be shared with authorized third-party services.'
      : 'Data sharing with third parties will be disabled.',
    'location_tracking': isGranting
      ? 'Your location will be tracked for security and access control.'
      : 'Location tracking will be disabled, which may affect some security features.',
    'biometric_data': isGranting
      ? 'Biometric data will be processed for enhanced security.'
      : 'Biometric authentication will be disabled.',
    'automated_decision_making': isGranting
      ? 'Automated systems may make decisions about your access and permissions.'
      : 'All decisions will require manual review.'
  };
  return impacts[consentType] || 'This will change how your data is processed.';
};

export default PrivacySettings;