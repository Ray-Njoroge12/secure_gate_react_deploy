import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, ThemeRadioGroup, Icon, Button } from "../../components/ui";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../utils/apiClient";
import NotificationSettings from "../../components/settings/NotificationSettings";
import AccessibilitySettings from "../../components/accessibility/AccessibilitySettings";
import "../../styles.css";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState("system");

  // ===== MFA Personal Management State =====
  const [mfaStatus, setMfaStatus] = useState({ mfaEnabled: false, mfaRequired: false, loading: true, error: null });
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenToken, setRegenToken] = useState('');
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState('');
  const [regenCodes, setRegenCodes] = useState(null);

  // Fetch MFA status on mount and when security tab is active
  const fetchMfaStatus = useCallback(async () => {
    try {
      setMfaStatus(prev => ({ ...prev, loading: true, error: null }));
      const response = await api.get('/api/mfa/status');
      if (response.data?.success) {
        setMfaStatus({
          mfaEnabled: response.data.data.mfaEnabled,
          mfaRequired: response.data.data.mfaRequired,
          loading: false,
          error: null
        });
      }
    } catch (err) {
      setMfaStatus(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || 'Failed to load MFA status'
      }));
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'security') {
      fetchMfaStatus();
    }
  }, [activeTab, fetchMfaStatus]);

  const handleDisableMFA = async () => {
    if (!disablePassword) {
      setDisableError('Password is required');
      return;
    }
    setDisableLoading(true);
    setDisableError('');
    try {
      const response = await api.post('/api/mfa/disable', { password: disablePassword });
      if (response.data?.success) {
        setShowDisableModal(false);
        setDisablePassword('');
        await fetchMfaStatus();
      }
    } catch (err) {
      setDisableError(err.response?.data?.message || 'Failed to disable MFA');
    } finally {
      setDisableLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!regenToken || regenToken.length !== 6) {
      setRegenError('Please enter a valid 6-digit code');
      return;
    }
    setRegenLoading(true);
    setRegenError('');
    try {
      const response = await api.post('/api/mfa/regenerate-backup-codes', { token: regenToken });
      if (response.data?.success) {
        setRegenCodes(response.data.data.backupCodes);
        setRegenToken('');
      }
    } catch (err) {
      setRegenError(err.response?.data?.message || 'Failed to regenerate backup codes');
    } finally {
      setRegenLoading(false);
    }
  };

  const downloadBackupCodes = (codes) => {
    const codesText = codes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secure-gate-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [systemSettings, setSystemSettings] = useState({
    siteName: "SecureGate Estate",
    maxVisitorsPerResident: 10,
    visitorExpiryHours: 24,
    requireOTP: true,
    autoApproveFrequentVisitors: false,
    maintenanceMode: false
  });
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    enforcePasswordPolicy: true,
    require2FA: false,
    ipWhitelisting: false
  });
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    enableSSL: true
  });
  const [complianceLoaded, setComplianceLoaded] = useState(false);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceError, setComplianceError] = useState(null);
  const [dpoSettings, setDpoSettings] = useState({
    name: "",
    email: "",
    phone: "",
    office: "",
    qualifications: "",
    appointed_date: ""
  });
  const [odpcSettings, setOdpcSettings] = useState({
    registration_number: "",
    registration_date: "",
    status: "pending"
  });
  const [policyMetadata, setPolicyMetadata] = useState({
    last_updated_at: null,
    last_reviewed_at: null,
    last_review_status: "pending",
    last_review_notes: []
  });
  const [retentionPolicy, setRetentionPolicy] = useState({
    policies: [],
    legalBasis: "Kenya Data Protection Act 2019",
    lastUpdated: null,
    contactEmail: "privacy@securegate.com"
  });
  const [reviewRunning, setReviewRunning] = useState(false);

  const handleSave = (section, e) => {
    e.preventDefault();
    // API call to save settings
    fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section, data:
          section === 'system' ? systemSettings :
            section === 'security' ? securitySettings :
              emailSettings
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert(`${section} settings saved successfully!`);
        } else {
          alert('Failed to save settings');
        }
      })
      .catch(() => alert('Failed to save settings'));
  };

  // Define all tabs - some are Super Admin only
  const allTabs = [
    { key: "system", label: "System", icon: <Icon name="Building" size={16} />, superAdminOnly: false },
    { key: "security", label: "Security", icon: <Icon name="Shield" size={16} />, superAdminOnly: false },
    { key: "notifications", label: "Notifications", icon: <Icon name="Bell" size={16} />, superAdminOnly: false },
    { key: "email", label: "Email", icon: <Icon name="Mail" size={16} />, superAdminOnly: true },
    { key: "appearance", label: "Appearance", icon: <Icon name="Eye" size={16} />, superAdminOnly: false },
    { key: "compliance", label: "Compliance", icon: <Icon name="FileCheck" size={16} />, superAdminOnly: true },
  ];

  // Filter tabs based on role
  const tabs = isSuperAdmin ? allTabs : allTabs.filter(tab => !tab.superAdminOnly);

  const inputClass = "w-full h-11 px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1";

  const formatDateValue = (dateValue) => {
    if (!dateValue) {
      return "Not configured";
    }
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return "Not configured";
    }
    return parsed.toLocaleDateString();
  };

  const toDateInputValue = (dateValue) => {
    if (!dateValue) {
      return "";
    }
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    return parsed.toISOString().split("T")[0];
  };

  const loadComplianceData = async () => {
    setComplianceLoading(true);
    setComplianceError(null);
    try {
      const [dpoResponse, odpcResponse, metadataResponse, retentionResponse] = await Promise.all([
        fetch("/api/privacy/dpo"),
        fetch("/api/privacy/odpc-registration"),
        fetch("/api/privacy/policy-metadata"),
        fetch("/api/privacy/retention-policy")
      ]);

      const dpoData = await dpoResponse.json();
      const odpcData = await odpcResponse.json();
      const metadataData = await metadataResponse.json();
      const retentionData = await retentionResponse.json();

      if (!dpoData.success || !odpcData.success || !metadataData.success || !retentionData.success) {
        throw new Error("Failed to load compliance settings");
      }

      setDpoSettings({
        name: dpoData.data.name || "",
        email: dpoData.data.email || "",
        phone: dpoData.data.phone || "",
        office: dpoData.data.office || "",
        qualifications: dpoData.data.qualifications || "",
        appointed_date: toDateInputValue(dpoData.data.appointed_date)
      });

      setOdpcSettings({
        registration_number: odpcData.data.registration_number || "",
        registration_date: toDateInputValue(odpcData.data.registration_date),
        status: odpcData.data.status || "pending"
      });

      setPolicyMetadata({
        last_updated_at: metadataData.data.last_updated_at,
        last_reviewed_at: metadataData.data.last_reviewed_at,
        last_review_status: metadataData.data.last_review_status || "pending",
        last_review_notes: metadataData.data.last_review_notes || []
      });

      setRetentionPolicy({
        policies: retentionData.data.policies || [],
        legalBasis: retentionData.data.legalBasis,
        lastUpdated: retentionData.data.lastUpdated,
        contactEmail: retentionData.data.contactEmail
      });

      setComplianceLoaded(true);
    } catch (error) {
      setComplianceError(error.message || "Unable to load compliance settings");
    } finally {
      setComplianceLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "compliance" && !complianceLoaded && !complianceLoading) {
      loadComplianceData();
    }
  }, [activeTab, complianceLoaded, complianceLoading]);

  const handleComplianceUpdate = async (section, payload) => {
    try {
      const response = await fetch(`/api/admin/compliance/${section}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to update compliance settings");
      }

      await loadComplianceData();
      alert("Compliance settings updated successfully!");
    } catch (error) {
      alert(error.message || "Failed to update compliance settings");
    }
  };

  const handleComplianceReview = async () => {
    setReviewRunning(true);
    try {
      const response = await fetch("/api/admin/compliance/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to run compliance review");
      }
      await loadComplianceData();
      alert("Compliance review completed.");
    } catch (error) {
      alert(error.message || "Failed to run compliance review");
    } finally {
      setReviewRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900" data-tour="system-settings">
      <PageHeader
        title="Admin Settings"
        subtitle="Configure system-wide settings and preferences"
        icon={<Icon name="Settings" className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
        showBack={true}
        backTo="/dashboard/admin"
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6 space-x-1 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg font-medium whitespace-nowrap text-sm transition-colors ${activeTab === tab.key
                    ? "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </Button>
            ))}
          </div>

          {/* System Settings */}
          {activeTab === "system" && (
            <form onSubmit={(e) => handleSave("system", e)} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Configuration</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Site Name</label>
                    <input
                      type="text"
                      value={systemSettings.siteName}
                      onChange={(e) => setSystemSettings({ ...systemSettings, siteName: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Max Visitors per Resident</label>
                    <input
                      type="number"
                      value={systemSettings.maxVisitorsPerResident}
                      onChange={(e) => setSystemSettings({ ...systemSettings, maxVisitorsPerResident: parseInt(e.target.value) })}
                      className={inputClass}
                      min="1"
                      max="50"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Visitor Pass Expiry (hours)</label>
                    <input
                      type="number"
                      value={systemSettings.visitorExpiryHours}
                      onChange={(e) => setSystemSettings({ ...systemSettings, visitorExpiryHours: parseInt(e.target.value) })}
                      className={inputClass}
                      min="1"
                      max="168"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={systemSettings.requireOTP}
                      onChange={(e) => setSystemSettings({ ...systemSettings, requireOTP: e.target.checked })}
                      className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">Require OTP Verification</span>
                      <p className="text-sm text-gray-500 dark:text-gray-300">Visitors must verify via OTP before entry</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={systemSettings.autoApproveFrequentVisitors}
                      onChange={(e) => setSystemSettings({ ...systemSettings, autoApproveFrequentVisitors: e.target.checked })}
                      className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">Auto-approve Frequent Visitors</span>
                      <p className="text-sm text-gray-500 dark:text-gray-300">Skip approval for visitors with 5+ successful visits</p>
                    </div>
                  </label>

                  {/* Maintenance Mode - Super Admin only */}
                  {isSuperAdmin && (
                    <label className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg cursor-pointer border border-red-200 dark:border-red-800">
                      <input
                        type="checkbox"
                        checked={systemSettings.maintenanceMode}
                        onChange={(e) => setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked })}
                        className="w-5 h-5 text-red-600 rounded"
                      />
                      <div>
                        <span className="font-medium text-red-700 dark:text-red-400">Maintenance Mode</span>
                        <p className="text-sm text-red-600 dark:text-red-300">Disable visitor check-ins (for system maintenance)</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <Button type="submit" variant="primary">Save System Settings</Button>
            </form>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <div className="space-y-8">
              {/* ===== Personal MFA Management ===== */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your MFA Status</h2>

                {mfaStatus.loading ? (
                  <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-200 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-600"></div>
                    Loading MFA status...
                  </div>
                ) : mfaStatus.error ? (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800" role="alert">
                    <p className="text-sm text-red-700 dark:text-red-300">{mfaStatus.error}</p>
                    <Button variant="secondary" size="sm" className="mt-2" onClick={fetchMfaStatus}>Retry</Button>
                  </div>
                ) : (
                  <div className={`p-5 rounded-lg border ${mfaStatus.mfaEnabled
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  }`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${mfaStatus.mfaEnabled
                          ? 'bg-green-100 dark:bg-green-800/40'
                          : 'bg-yellow-100 dark:bg-yellow-800/40'
                        }`}>
                          <Icon
                            name={mfaStatus.mfaEnabled ? "ShieldCheck" : "ShieldAlert"}
                            className={`w-6 h-6 ${mfaStatus.mfaEnabled ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}
                          />
                        </div>
                        <div>
                          <p className={`font-semibold ${mfaStatus.mfaEnabled
                            ? 'text-green-800 dark:text-green-200'
                            : 'text-yellow-800 dark:text-yellow-200'
                          }`}>
                            MFA is {mfaStatus.mfaEnabled ? 'Enabled' : 'Not Set Up'}
                          </p>
                          <p className={`text-sm ${mfaStatus.mfaEnabled
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-yellow-700 dark:text-yellow-300'
                          }`}>
                            {mfaStatus.mfaRequired
                              ? 'MFA is required for your role.'
                              : 'MFA is optional for your role.'}
                            {!mfaStatus.mfaEnabled && mfaStatus.mfaRequired && ' Please set up MFA to access all features.'}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {!mfaStatus.mfaEnabled ? (
                          <Button
                            variant="primary"
                            onClick={() => navigate('/mfa/setup', {
                              state: {
                                message: 'Set up Multi-Factor Authentication for your account.',
                                returnUrl: '/dashboard/admin/settings'
                              }
                            })}
                          >
                            <Icon name="Shield" className="w-4 h-4 mr-1.5" />
                            Set Up MFA
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() => { setShowRegenModal(true); setRegenCodes(null); setRegenToken(''); setRegenError(''); }}
                            >
                              <Icon name="RefreshCw" className="w-4 h-4 mr-1.5" />
                              Regenerate Backup Codes
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => { setShowDisableModal(true); setDisablePassword(''); setDisableError(''); }}
                            >
                              <Icon name="ShieldOff" className="w-4 h-4 mr-1.5" />
                              Disable MFA
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ===== Disable MFA Modal ===== */}
              {showDisableModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="disable-mfa-title">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                    <h3 id="disable-mfa-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Disable MFA</h3>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        <strong>Warning:</strong> Disabling MFA will reduce your account security.
                        {mfaStatus.mfaRequired && ' MFA is required for your role — you will need to re-enable it to access protected features.'}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="disable-mfa-password" className={labelClass}>Enter your password to confirm</label>
                        <input
                          id="disable-mfa-password"
                          type="password"
                          value={disablePassword}
                          onChange={(e) => setDisablePassword(e.target.value)}
                          className={inputClass}
                          placeholder="Your account password"
                          autoFocus
                        />
                      </div>
                      {disableError && (
                        <p className="text-sm text-red-600 dark:text-red-400" role="alert">{disableError}</p>
                      )}
                      <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowDisableModal(false)} disabled={disableLoading}>
                          Cancel
                        </Button>
                        <Button variant="danger" onClick={handleDisableMFA} disabled={disableLoading || !disablePassword} aria-busy={disableLoading}>
                          {disableLoading ? 'Disabling...' : 'Disable MFA'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== Regenerate Backup Codes Modal ===== */}
              {showRegenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="regen-codes-title">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
                    <h3 id="regen-codes-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {regenCodes ? 'New Backup Codes' : 'Regenerate Backup Codes'}
                    </h3>

                    {!regenCodes ? (
                      <div className="space-y-4">
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            <strong>Warning:</strong> Regenerating backup codes will invalidate all existing backup codes.
                          </p>
                        </div>
                        <div>
                          <label htmlFor="regen-mfa-token" className={labelClass}>
                            Enter your 6-digit authenticator code
                          </label>
                          <input
                            id="regen-mfa-token"
                            type="text"
                            maxLength="6"
                            pattern="[0-9]{6}"
                            value={regenToken}
                            onChange={(e) => setRegenToken(e.target.value.replace(/\D/g, ''))}
                            className={`${inputClass} text-center text-lg font-mono tracking-widest`}
                            placeholder="000000"
                            autoFocus
                          />
                        </div>
                        {regenError && (
                          <p className="text-sm text-red-600 dark:text-red-400" role="alert">{regenError}</p>
                        )}
                        <div className="flex gap-3 justify-end">
                          <Button variant="secondary" onClick={() => setShowRegenModal(false)} disabled={regenLoading}>
                            Cancel
                          </Button>
                          <Button variant="primary" onClick={handleRegenerateBackupCodes} disabled={regenLoading || regenToken.length !== 6} aria-busy={regenLoading}>
                            {regenLoading ? 'Generating...' : 'Generate New Codes'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                            ⚠️ Save these codes now! They won't be shown again.
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-600">
                          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                            {regenCodes.map((code, index) => (
                              <div key={index} className="p-2 bg-white dark:bg-slate-800 rounded text-center text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-600">
                                {code}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                          <Button variant="secondary" onClick={() => downloadBackupCodes(regenCodes)}>
                            <Icon name="Download" className="w-4 h-4 mr-1.5" />
                            Download Codes
                          </Button>
                          <Button variant="primary" onClick={() => { setShowRegenModal(false); setRegenCodes(null); }}>
                            Done
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== System Security Policy (SuperAdmin only) ===== */}
              {isSuperAdmin && (
                <form onSubmit={(e) => handleSave("security", e)} className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Security Policy</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">These settings apply to all users in the system.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="session-timeout" className={labelClass}>Session Timeout (minutes)</label>
                        <input
                          id="session-timeout"
                          type="number"
                          value={securitySettings.sessionTimeout}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                          className={inputClass}
                          min="5"
                          max="480"
                        />
                      </div>
                      <div>
                        <label htmlFor="max-login-attempts" className={labelClass}>Max Login Attempts</label>
                        <input
                          id="max-login-attempts"
                          type="number"
                          value={securitySettings.maxLoginAttempts}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
                          className={inputClass}
                          min="3"
                          max="10"
                        />
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <input
                          type="checkbox"
                          checked={securitySettings.enforcePasswordPolicy}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, enforcePasswordPolicy: e.target.checked })}
                          className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">Enforce Strong Passwords</span>
                          <p className="text-sm text-gray-500 dark:text-gray-300">Require 8+ characters with uppercase, lowercase, number, and symbol</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <input
                          type="checkbox"
                          checked={securitySettings.require2FA}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, require2FA: e.target.checked })}
                          className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">Require 2FA for Admins</span>
                          <p className="text-sm text-gray-500 dark:text-gray-300">Mandatory two-factor authentication for admin accounts</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <input
                          type="checkbox"
                          checked={securitySettings.ipWhitelisting}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelisting: e.target.checked })}
                          className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">IP Whitelisting</span>
                          <p className="text-sm text-gray-500 dark:text-gray-300">Restrict admin access to specific IP addresses</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <Button type="submit" variant="primary">Save Security Settings</Button>
                </form>
              )}
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <NotificationSettings />
            </div>
          )}

          {/* Email Settings */}
          {activeTab === "email" && (
            <form onSubmit={(e) => handleSave("email", e)} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Configuration</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>SMTP Host</label>
                    <input
                      type="text"
                      value={emailSettings.smtpHost}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                      className={inputClass}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>SMTP Port</label>
                    <input
                      type="number"
                      value={emailSettings.smtpPort}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: parseInt(e.target.value) })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>SMTP Username</label>
                    <input
                      type="text"
                      value={emailSettings.smtpUser}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={emailSettings.enableSSL}
                      onChange={(e) => setEmailSettings({ ...emailSettings, enableSSL: e.target.checked })}
                      className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">Enable SSL/TLS</span>
                      <p className="text-sm text-gray-500 dark:text-gray-300">Use secure connection for email sending</p>
                    </div>
                  </label>
                </div>

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> For security, SMTP password should be configured via environment variables (SMTP_PASSWORD).
                  </p>
                </div>
              </div>

              <Button type="submit" variant="primary">Save Email Settings</Button>
            </form>
          )}

          {/* Appearance Settings */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Choose how SecureGate looks to you.
                </p>
              </div>
              <ThemeRadioGroup />
              <AccessibilitySettings className="mt-6" />
              <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Current theme: <span className="font-medium text-gray-900 dark:text-white capitalize">{resolvedTheme}</span>
                  {theme === 'system' && <span className="ml-1 text-gray-500 dark:text-gray-300">(following system preference)</span>}
                </p>
              </div>
            </div>
          )}

          {/* Compliance Settings */}
          {activeTab === "compliance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compliance Administration</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Manage Data Protection Officer and ODPC registration details.
                </p>
              </div>

              {complianceLoading && (
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-200">
                  Loading compliance settings...
                </div>
              )}

              {complianceError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                  {complianceError}
                </div>
              )}

              {!complianceLoading && !complianceError && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleComplianceUpdate("dpo", dpoSettings);
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">DPO Details</h3>
                        <div className="space-y-3">
                          <div>
                            <label className={labelClass}>Name</label>
                            <input
                              type="text"
                              value={dpoSettings.name}
                              onChange={(e) => setDpoSettings({ ...dpoSettings, name: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Email</label>
                            <input
                              type="email"
                              value={dpoSettings.email}
                              onChange={(e) => setDpoSettings({ ...dpoSettings, email: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Phone</label>
                            <input
                              type="tel"
                              value={dpoSettings.phone}
                              onChange={(e) => setDpoSettings({ ...dpoSettings, phone: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Office</label>
                            <input
                              type="text"
                              value={dpoSettings.office}
                              onChange={(e) => setDpoSettings({ ...dpoSettings, office: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Qualifications</label>
                            <input
                              type="text"
                              value={dpoSettings.qualifications}
                              onChange={(e) => setDpoSettings({ ...dpoSettings, qualifications: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Appointed Date</label>
                            <input
                              type="date"
                              value={dpoSettings.appointed_date}
                              onChange={(e) => setDpoSettings({ ...dpoSettings, appointed_date: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>
                      <Button type="submit" variant="primary">Save DPO Details</Button>
                    </form>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleComplianceUpdate("odpc-registration", odpcSettings);
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">ODPC Registration</h3>
                        <div className="space-y-3">
                          <div>
                            <label className={labelClass}>Status</label>
                            <select
                              value={odpcSettings.status}
                              onChange={(e) => {
                                const nextStatus = e.target.value;
                                setOdpcSettings({
                                  ...odpcSettings,
                                  status: nextStatus,
                                  registration_number: nextStatus === "active" ? odpcSettings.registration_number : "",
                                  registration_date: nextStatus === "active" ? odpcSettings.registration_date : ""
                                });
                              }}
                              className={inputClass}
                            >
                              <option value="pending">Pending</option>
                              <option value="active">Active</option>
                              <option value="expired">Expired</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>Registration Number</label>
                            <input
                              type="text"
                              value={odpcSettings.registration_number}
                              onChange={(e) => setOdpcSettings({ ...odpcSettings, registration_number: e.target.value })}
                              className={inputClass}
                              disabled={odpcSettings.status !== "active"}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Registration Date</label>
                            <input
                              type="date"
                              value={odpcSettings.registration_date}
                              onChange={(e) => setOdpcSettings({ ...odpcSettings, registration_date: e.target.value })}
                              className={inputClass}
                              disabled={odpcSettings.status !== "active"}
                            />
                          </div>
                        </div>
                      </div>
                      <Button type="submit" variant="primary">Save ODPC Status</Button>
                    </form>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-700">
                    <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Policy Metadata</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-200">
                      <strong>Last Updated:</strong> {formatDateValue(policyMetadata.last_updated_at)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-200">
                      <strong>Last Reviewed:</strong> {formatDateValue(policyMetadata.last_reviewed_at)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-200">
                      <strong>Review Status:</strong>{" "}
                      {policyMetadata.last_review_status === "verified"
                        ? "Verified"
                        : policyMetadata.last_review_status === "pending"
                          ? "Pending"
                          : "Needs Attention"}
                    </p>
                    {policyMetadata.last_review_notes?.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-sm text-gray-600 dark:text-gray-200 space-y-1">
                        {policyMetadata.last_review_notes.map((note, index) => (
                          <li key={`${note}-${index}`}>{note}</li>
                        ))}
                      </ul>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleComplianceReview}
                      className="mt-4"
                      disabled={reviewRunning}
                    >
                      {reviewRunning ? "Running Review..." : "Run Compliance Review"}
                    </Button>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                    <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Retention Policy Overview</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-200">
                      Legal basis: {retentionPolicy.legalBasis || "Kenya Data Protection Act 2019"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-200">
                      Last updated: {formatDateValue(retentionPolicy.lastUpdated)}
                    </p>
                    <div className="mt-4 space-y-3">
                      {retentionPolicy.policies.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-300">No retention policies configured.</p>
                      ) : (
                        retentionPolicy.policies.map((policy) => (
                          <div
                            key={policy.table_name}
                            className="flex items-start justify-between gap-4 border border-gray-100 dark:border-slate-700 rounded-md p-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {policy.category || policy.table_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-300">
                                Table: {policy.table_name}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-700 dark:text-gray-200">
                                {policy.retention_days} days
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-300">
                                {policy.auto_delete ? "Auto delete" : "Manual retention"}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-300">
                      Contact {retentionPolicy.contactEmail || "privacy@securegate.com"} for retention adjustments.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
