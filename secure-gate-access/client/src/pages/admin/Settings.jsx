import React, { useState, useEffect } from "react";
import { PageHeader, ThemeRadioGroup } from "../../components/ui";
import { useTheme } from "../../contexts/ThemeContext";
import NotificationSettings from "../../components/settings/NotificationSettings";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Building, 
  Eye,
  Users,
  Key,
  Database,
  Mail,
  FileCheck
} from 'lucide-react';
import "../../styles.css";

export default function Settings() {
  const { theme, resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("system");
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
      body: JSON.stringify({ section, data: 
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

  const tabs = [
    { key: "system", label: "System", icon: <Building size={16} /> },
    { key: "security", label: "Security", icon: <Shield size={16} /> },
    { key: "notifications", label: "Notifications", icon: <Bell size={16} /> },
    { key: "email", label: "Email", icon: <Mail size={16} /> },
    { key: "appearance", label: "Appearance", icon: <Eye size={16} /> },
    { key: "compliance", label: "Compliance", icon: <FileCheck size={16} /> },
  ];

  const inputClass = "w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent";
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
      const response = await fetch("/api/admin/compliance/kenya-dpa/review", {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="Admin Settings"
        subtitle="Configure system-wide settings and preferences"
        icon={<SettingsIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
        showBack={true}
        backTo="/dashboard/admin"
      />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 space-x-1 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg font-medium whitespace-nowrap text-sm transition-colors ${
                  activeTab === tab.key 
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" 
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
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
                      onChange={(e) => setSystemSettings({...systemSettings, siteName: e.target.value})}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Max Visitors per Resident</label>
                    <input 
                      type="number" 
                      value={systemSettings.maxVisitorsPerResident}
                      onChange={(e) => setSystemSettings({...systemSettings, maxVisitorsPerResident: parseInt(e.target.value)})}
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
                      onChange={(e) => setSystemSettings({...systemSettings, visitorExpiryHours: parseInt(e.target.value)})}
                      className={inputClass}
                      min="1"
                      max="168"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.requireOTP}
                      onChange={(e) => setSystemSettings({...systemSettings, requireOTP: e.target.checked})}
                      className="w-5 h-5 text-green-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">Require OTP Verification</span>
                      <p className="text-sm text-gray-500 dark:text-gray-300">Visitors must verify via OTP before entry</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.autoApproveFrequentVisitors}
                      onChange={(e) => setSystemSettings({...systemSettings, autoApproveFrequentVisitors: e.target.checked})}
                      className="w-5 h-5 text-green-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">Auto-approve Frequent Visitors</span>
                      <p className="text-sm text-gray-500 dark:text-gray-300">Skip approval for visitors with 5+ successful visits</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg cursor-pointer border border-red-200 dark:border-red-800">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.maintenanceMode}
                      onChange={(e) => setSystemSettings({...systemSettings, maintenanceMode: e.target.checked})}
                      className="w-5 h-5 text-red-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-red-700 dark:text-red-400">Maintenance Mode</span>
                      <p className="text-sm text-red-600 dark:text-red-300">Disable visitor check-ins (for system maintenance)</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <button type="submit" className="btn primary">Save System Settings</button>
            </form>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <form onSubmit={(e) => handleSave("security", e)} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Security Configuration</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Session Timeout (minutes)</label>
                    <input 
                      type="number" 
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
                      className={inputClass}
                      min="5"
                      max="480"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Max Login Attempts</label>
                    <input 
                      type="number" 
                      value={securitySettings.maxLoginAttempts}
                      onChange={(e) => setSecuritySettings({...securitySettings, maxLoginAttempts: parseInt(e.target.value)})}
                      className={inputClass}
                      min="3"
                      max="10"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={securitySettings.enforcePasswordPolicy}
                      onChange={(e) => setSecuritySettings({...securitySettings, enforcePasswordPolicy: e.target.checked})}
                      className="w-5 h-5 text-green-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">Enforce Strong Passwords</span>
                      <p className="text-sm text-gray-500 dark:text-gray-300">Require 8+ characters with uppercase, lowercase, number, and symbol</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={securitySettings.require2FA}
                      onChange={(e) => setSecuritySettings({...securitySettings, require2FA: e.target.checked})}
                      className="w-5 h-5 text-green-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">Require 2FA for Admins</span>
                      <p className="text-sm text-gray-500 dark:text-gray-300">Mandatory two-factor authentication for admin accounts</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={securitySettings.ipWhitelisting}
                      onChange={(e) => setSecuritySettings({...securitySettings, ipWhitelisting: e.target.checked})}
                      className="w-5 h-5 text-green-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">IP Whitelisting</span>
                      <p className="text-sm text-gray-500 dark:text-gray-300">Restrict admin access to specific IP addresses</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <button type="submit" className="btn primary">Save Security Settings</button>
            </form>
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
                      onChange={(e) => setEmailSettings({...emailSettings, smtpHost: e.target.value})}
                      className={inputClass}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>SMTP Port</label>
                    <input 
                      type="number" 
                      value={emailSettings.smtpPort}
                      onChange={(e) => setEmailSettings({...emailSettings, smtpPort: parseInt(e.target.value)})}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>SMTP Username</label>
                    <input 
                      type="text" 
                      value={emailSettings.smtpUser}
                      onChange={(e) => setEmailSettings({...emailSettings, smtpUser: e.target.value})}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={emailSettings.enableSSL}
                      onChange={(e) => setEmailSettings({...emailSettings, enableSSL: e.target.checked})}
                      className="w-5 h-5 text-green-600 rounded"
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
              
              <button type="submit" className="btn primary">Save Email Settings</button>
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
              <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
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
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-200">
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
                      <button type="submit" className="btn primary">Save DPO Details</button>
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
                      <button type="submit" className="btn primary">Save ODPC Status</button>
                    </form>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
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
                    <button
                      type="button"
                      onClick={handleComplianceReview}
                      className="btn secondary mt-4"
                      disabled={reviewRunning}
                    >
                      {reviewRunning ? "Running Review..." : "Run Compliance Review"}
                    </button>
                  </div>

                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
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
                            className="flex items-start justify-between gap-4 border border-gray-100 dark:border-gray-700 rounded-md p-3"
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
