// client/src/pages/resident/Settings.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, ThemeRadioGroup, ErrorDisplay, SuccessDisplay, Button } from "../../components/ui";
import { useTheme } from "../../contexts/ThemeContext";
import NotificationSettings from "../../components/settings/NotificationSettings";
import AccessibilitySettings from "../../components/accessibility/AccessibilitySettings";
import { Icon } from "../../components/ui/Icon";
import { useOnboardingTour } from "../../components/common/OnboardingTour";
import api from "../../utils/apiClient";
import logger from '../../utils/logger';
import "../../styles.css";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, resolvedTheme, isDark } = useTheme();
  const { restartTour } = useOnboardingTour('resident');
  // const role = useCurrentRole();

  // UI State
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Data State
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({ name: "", phone: "", email: "", area: "", house: "" });
  const [passwords, setPasswords] = useState({ old: "", new: "" });
  const [notifications, setNotifications] = useState({ notify_email: true, notify_sms: false });

  // Load profile from resident endpoint
  useEffect(() => {
    api.get('/api/resident/profile')
      .then(res => {
        const data = res.data;
        if (data?.data) {
          const user = data.data;
          setNotifications({
            notify_email: !!user.notify_email,
            notify_sms: !!user.notify_sms
          });
          // Combine first_name and last_name into name for display
          const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
          setProfile({
            name: fullName || '',
            email: user.email || '',
            phone: user.phone || '',
            area: user.area || '', // Note: Resident routes might not return area if not in query
            house: user.unit_number || ''
          });
        }
      })
      .catch(err => logger.error('Failed to load profile:', err));
  }, []);
  const [security, setSecurity] = useState({ showLoginHistory: true });
  const [visitorPrefs, setVisitorPrefs] = useState({ defaultDuration: "1 hour", maxVisitors: 5 });

  // MFA state
  const [mfaStatus, setMfaStatus] = useState({ mfaEnabled: false, mfaRequired: false, loading: true, error: null });
  const [mfaCode, setMfaCode] = useState('');
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
  const [mfaError, setMfaError] = useState('');

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
      setMfaStatus(prev => ({ ...prev, loading: false, error: 'Failed to load MFA status' }));
    }
  }, []);

  useEffect(() => {
    fetchMfaStatus();
  }, [fetchMfaStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Only trigger save for tabs that this component manages directly
        if (activeTab === 'profile') handleUpdate('Profile', e);
        if (activeTab === 'password') handleUpdate('Password', e);
      }
      // Escape to clear messages
      if (e.key === 'Escape') {
        setError("");
        setSuccess("");
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]); // Add activeTab dependency

  const handleUpdate = async (type, e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (type === 'Profile') {
        // Split name into first_name and last_name
        const nameParts = profile.name.trim().split(/\s+/);
        const first_name = nameParts[0] || '';
        const last_name = nameParts.slice(1).join(' ') || '';
        
        const res = await api.put('/api/resident/profile', {
          first_name,
          last_name,
          email: profile.email,
          phone: profile.phone,
          area: profile.area,
          unit_number: profile.house
        });
        const data = res.data;
        console.log('Profile update response:', data);
        console.log('Returned data object:', data.data);
        if (data.success) {
          setSuccess('Profile updated successfully!');
          console.log('Success state set:', success);
        }
        else throw new Error(data.message || 'Failed to update profile');
      } else if (type === 'Password') {
        // If MFA is enabled, require verification first
        if (mfaStatus.mfaEnabled && !showMfaPrompt) {
          setShowMfaPrompt(true);
          setLoading(false);
          return;
        }

        // If MFA prompt is shown, verify MFA code first
        if (mfaStatus.mfaEnabled && showMfaPrompt) {
          if (!mfaCode || mfaCode.length !== 6) {
            setMfaError('Please enter a valid 6-digit code');
            setLoading(false);
            return;
          }
          try {
            const mfaRes = await api.post('/api/mfa/verify', { code: mfaCode });
            if (!mfaRes.data?.success) {
              setMfaError('Invalid MFA code. Please try again.');
              setLoading(false);
              return;
            }
          } catch {
            setMfaError('MFA verification failed. Please try again.');
            setLoading(false);
            return;
          }
        }

        // Use auth endpoint for password change
        const res = await api.post('/api/auth/change-password', {
          currentPassword: passwords.old,
          newPassword: passwords.new,
          ...(mfaCode ? { mfaCode } : {})
        });
        const data = res.data;
        if (data.success) {
          setSuccess('Password changed successfully!');
          setPasswords({ old: "", new: "" });
          setMfaCode('');
          setShowMfaPrompt(false);
          setMfaError('');
        }
        else throw new Error(data.message || 'Failed to change password');
      } else {
        // Mock success for other tabs
        setSuccess(`${type} settings updated!`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      // Auto-scroll to top to show success/error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };


  const tabs = [
    { key: "profile", label: "Profile", icon: <Icon name="User" size={16} /> },
    { key: "password", label: "Password", icon: <Icon name="Shield" size={16} /> },
    { key: "notifications", label: "Notifications", icon: <Icon name="Bell" size={16} /> },
    { key: "security", label: "Security", icon: <Icon name="Shield" size={16} /> },
    { key: "accessibility", label: "Accessibility", icon: <Icon name="Accessibility" size={16} /> },
    { key: "visitorPrefs", label: "Visitors", icon: <Icon name="Users" size={16} /> },
    { key: "preferences", label: "Appearance", icon: <Icon name="Eye" size={16} /> },
  ];

  // Consistent input styling for all fields
  const inputClass = "w-full h-11 px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:text-white dark:placeholder-gray-400 transition-colors";
  const btnClass = "btn btn-primary w-full md:w-auto"; // Enhanced button class

  return (
    // <AppShell role={role}>
    <div data-tour="settings" className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <PageHeader
        title="Settings"
        subtitle="Manage your account preferences"
        icon={<Icon name="Settings" className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
        showBack={true}
        backTo="/dashboard/resident"
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Messages */}
        {error && <ErrorDisplay message={error} onDismiss={() => setError("")} className="mb-4" />}
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-green-700 dark:text-green-300 font-medium">✓ {success}</p>
              <Button variant="ghost" size="sm" onClick={() => setSuccess("")} className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100" aria-label="Dismiss success message">✕</Button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6 space-x-1 overflow-x-auto tabs-scroll pb-2">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap text-sm transition-colors focus:outline-none ${activeTab === tab.key
                    ? "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </Button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "profile" && (
            <form onSubmit={(e) => handleUpdate("Profile", e)} className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Update your personal details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Name</label>
                  <input id="profile-name" type="text" placeholder="Your name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Phone</label>
                  <input id="profile-phone" type="text" placeholder="Phone number" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
                  <input id="profile-email" type="email" placeholder="Email address" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="profile-area" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Area</label>
                  <input id="profile-area" type="text" placeholder="Area/Block" value={profile.area} onChange={(e) => setProfile({ ...profile, area: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="profile-house" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">House Number</label>
                  <input id="profile-house" type="text" placeholder="House number" value={profile.house} onChange={(e) => setProfile({ ...profile, house: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="mt-4">
                <Button type="submit" variant="primary">Update Profile</Button>
              </div>
            </form>
          )}

          {activeTab === "password" && (
            <form onSubmit={(e) => handleUpdate("Password", e)} className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Update your password for security</p>
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Current Password</label>
                  <input id="current-password" type="password" placeholder="Enter current password" value={passwords.old} onChange={(e) => setPasswords({ ...passwords, old: e.target.value })} className={`${inputClass} dark:bg-slate-800 dark:border-slate-600 dark:text-white`} />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">New Password</label>
                  <input id="new-password" type="password" placeholder="Enter new password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className={`${inputClass} dark:bg-slate-800 dark:border-slate-600 dark:text-white`} />
                </div>
              </div>
              {showMfaPrompt && mfaStatus.mfaEnabled && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Authenticator Code
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Enter the 6-digit code from your authenticator app to confirm this change.
                  </p>
                  <input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => { setMfaCode(e.target.value.replace(/\D/g, '')); setMfaError(''); }}
                    className={`${inputClass} max-w-[200px] text-center tracking-widest text-lg`}
                    autoComplete="one-time-code"
                  />
                  {mfaError && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{mfaError}</p>}
                </div>
              )}
              <div className="mt-4">
                <Button type="submit" variant="primary">Change Password</Button>
              </div>
            </form>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <NotificationSettings />
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Configure account security options</p>
              </div>

              {/* MFA Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Two-Factor Authentication</h3>
                {mfaStatus.loading ? (
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-lg text-sm text-gray-600 dark:text-gray-200 flex items-center gap-2 border border-gray-200 dark:border-slate-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-600"></div>
                    Loading MFA status...
                  </div>
                ) : mfaStatus.error ? (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800" role="alert">
                    <p className="text-sm text-red-700 dark:text-red-300">{mfaStatus.error}</p>
                    <Button variant="secondary" size="sm" className="mt-2" onClick={fetchMfaStatus}>Retry</Button>
                  </div>
                ) : (
                  <div className={`p-4 rounded-lg border ${mfaStatus.mfaEnabled
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600'
                  }`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Icon
                          name={mfaStatus.mfaEnabled ? "ShieldCheck" : "Shield"}
                          className={`w-5 h-5 ${mfaStatus.mfaEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}
                        />
                        <div>
                          <p className={`font-medium text-sm ${mfaStatus.mfaEnabled ? 'text-green-800 dark:text-green-200' : 'text-gray-700 dark:text-gray-200'}`}>
                            {mfaStatus.mfaEnabled ? 'MFA is Enabled' : 'MFA is Not Set Up'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {mfaStatus.mfaEnabled ? 'Your account is protected with two-factor authentication.' : 'Add extra security to your account with an authenticator app.'}
                          </p>
                        </div>
                      </div>
                      {!mfaStatus.mfaEnabled && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate('/mfa/setup', {
                            state: { message: 'Set up two-factor authentication for your account.', returnUrl: '/resident/settings' }
                          })}
                        >
                          Set Up MFA
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Other security options */}
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-600">
                  <input
                    type="checkbox"
                    checked={security.showLoginHistory}
                    onChange={(e) => setSecurity({ ...security, showLoginHistory: e.target.checked })}
                    className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Login History</span>
                    <p className="text-sm text-gray-500 dark:text-gray-300">Track and display recent login activity</p>
                  </div>
                </label>
              </div>
              <div className="mt-4">
                <Button type="button" variant="primary" onClick={(e) => handleUpdate("Security", e)}>Save Security Settings</Button>
              </div>

              {/* Privacy Dashboard link */}
              <div className="pt-2 border-t border-gray-200 dark:border-slate-600">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Data Privacy</h3>
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">Privacy &amp; Data Rights</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Manage your consent, data access, and erasure requests</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => navigate('/privacy-dashboard')}>
                    Manage Privacy
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "accessibility" && (
            <div className="space-y-6">
              <AccessibilitySettings />
            </div>
          )}

          {activeTab === "visitorPrefs" && (
            <form onSubmit={(e) => handleUpdate("Visitor Preferences", e)} className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Visitor Preferences</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Configure default visitor settings</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label htmlFor="default-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Default Invite Duration</label>
                  <select
                    id="default-duration"
                    value={visitorPrefs.defaultDuration}
                    onChange={(e) => setVisitorPrefs({ ...visitorPrefs, defaultDuration: e.target.value })}
                    className={`${inputClass} dark:bg-slate-800 dark:border-slate-600 dark:text-white`}
                  >
                    <option>1 hour</option>
                    <option>3 hours</option>
                    <option>6 hours</option>
                    <option>1 day</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="max-visitors" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Max Visitors Per Day</label>
                  <input
                    id="max-visitors"
                    type="number"
                    value={visitorPrefs.maxVisitors}
                    onChange={(e) => setVisitorPrefs({ ...visitorPrefs, maxVisitors: e.target.value })}
                    className={`${inputClass} dark:bg-slate-800 dark:border-slate-600 dark:text-white`}
                    min="1"
                    max="20"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button type="submit" variant="primary">Save Visitor Preferences</Button>
              </div>
            </form>
          )}

          {activeTab === "preferences" && (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Choose how SecureGate looks to you. Select a single theme, or sync with your system and automatically switch between day and night themes.
                </p>
              </div>
              <ThemeRadioGroup />
              <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Current theme: <span className="font-medium text-gray-900 dark:text-white capitalize">{resolvedTheme}</span>
                  {theme === 'system' && <span className="ml-1 text-gray-500 dark:text-gray-300">(following system preference)</span>}
                </p>
              </div>
            </div>
          )}
        </div>

          {/* Guided Tour */}
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Guided Tour</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Retake the feature walkthrough to discover what you can do.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={restartTour}>
                Restart Tour
              </Button>
            </div>
          </div>
      </div>
    </div>
    // </AppShell>
  );
}
