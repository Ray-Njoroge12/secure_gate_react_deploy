import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import PanicHistory from "../../components/guard/PanicHistory"; // Phase 1.1: Emergency History
import NotificationSettings from "../../components/settings/NotificationSettings";
import { PageHeader, ThemeRadioGroup, Icon, Button } from "../../components/ui";
import { useTheme } from "../../contexts/ThemeContext";
import { useOnboardingTour } from "../../components/common/OnboardingTour";
import api from "../../utils/apiClient";
import notificationService from "../../services/notificationService";

const GUARD_SETTINGS_TABS = ["profile", "notifications", "emergency", "security", "appearance"];

export default function Settings() {
  const navigate = useNavigate();
  const { theme, resolvedTheme } = useTheme();
  const { restartTour } = useOnboardingTour('guard');
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [profilePic, setProfilePic] = useState(null);
  const [security, setSecurity] = useState({ showLoginHistory: true });

  // MFA state
  const [mfaStatus, setMfaStatus] = useState({ mfaEnabled: false, mfaRequired: false, loading: true, error: null });
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');

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

  const handleDisableMFA = async () => {
    if (!disablePassword) { setDisableError('Password is required'); return; }
    if (!disableToken) { setDisableError('Authenticator code is required'); return; }
    setDisableLoading(true);
    setDisableError('');
    try {
      const response = await api.post('/api/mfa/disable', { password: disablePassword, token: disableToken });
      if (response.data?.success) {
        setShowDisableModal(false);
        setDisablePassword('');
        setDisableToken('');
        await fetchMfaStatus();
        notificationService.success('MFA Disabled', 'Two-Factor Authentication has been disabled.');
      }
    } catch (err) {
      const errorCode = err.response?.data?.code;
      if (errorCode === 'INVALID_PASSWORD') {
        setDisableError('Incorrect password. Please try again.');
      } else if (errorCode === 'INVALID_TOTP') {
        setDisableError('Invalid authenticator code or backup code. Please try again.');
      } else {
        setDisableError(err.response?.data?.message || 'Failed to disable MFA');
      }
    } finally {
      setDisableLoading(false);
    }
  };

  const handleProfilePicChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setProfilePic(url);
      localStorage.setItem("profilePic", url);
      window.dispatchEvent(new Event("profilePicChanged"));
    }
  };

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    localStorage.setItem("profileName", profile.name);
    localStorage.setItem("profileEmail", profile.email);
    localStorage.setItem("profilePhone", profile.phone);
    if (profilePic) {
      localStorage.setItem("profilePic", profilePic);
      window.dispatchEvent(new Event("profilePicChanged"));
    }
    notificationService.success('Profile Updated', 'Your profile has been saved successfully.');
  };

  const tabs = [
    { key: "profile", label: "Profile", icon: <Icon name="User" size={16} /> },
    { key: "notifications", label: "Notifications", icon: <Icon name="Bell" size={16} /> },
    { key: "emergency", label: "Emergency", icon: <Icon name="AlertTriangle" size={16} /> }, // Phase 1.1
    { key: "security", label: "Security", icon: <Icon name="Shield" size={16} /> },
    { key: "appearance", label: "Appearance", icon: <Icon name="Eye" size={16} /> },
  ];

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const isValidTab = (tabKey) => GUARD_SETTINGS_TABS.includes(tabKey);
  const [activeTab, setActiveTab] = useState(() => (
    isValidTab(requestedTab) ? requestedTab : "profile"
  ));

  useEffect(() => {
    if (isValidTab(requestedTab) && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [activeTab, requestedTab]);

  useEffect(() => {
    if (activeTab === 'security') {
      fetchMfaStatus();
    }
  }, [activeTab, fetchMfaStatus]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    const nextParams = new URLSearchParams(searchParams);
    if (tabKey === "profile") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", tabKey);
    }
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <PageHeader 
        title="Settings"
        subtitle="Manage your guard profile and preferences"
        icon={<Icon name="Settings" className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
        showBack={true}
        backTo="/dashboard/guard"
      />
      
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
          {/* Tab Buttons */}
          <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6 space-x-1 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                variant="ghost"
                onClick={() => handleTabChange(tab.key)}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg font-medium whitespace-nowrap text-sm transition-colors ${
                  activeTab === tab.key
                    ? "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </Button>
            ))}
          </div>

          <div className="pb-24 md:pb-8">
            {activeTab === "profile" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                  <Icon name="User" className="text-blue-500" /> My Profile
                </h2>
                <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow border border-gray-200 dark:border-slate-700">
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden relative group flex-shrink-0">
                        {profilePic ? (
                          <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="User" className="w-10 h-10 text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                        )}
                        <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black bg-opacity-25 opacity-0 hover:opacity-100 transition-opacity">
                          <Icon name="Camera" className="w-5 h-5 text-white" />
                          <input type="file" accept="image/*" onChange={handleProfilePicChange} className="hidden" />
                        </label>
                      </div>
                      <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                          <div className="w-full">
                            <label htmlFor="guard-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Name</label>
                            <input 
                              id="guard-name"
                              className="mobile-input" 
                              placeholder="Your name" 
                              value={profile.name} 
                              onChange={e=>setProfile({...profile, name:e.target.value})} 
                            />
                          </div>
                          <div className="w-full">
                            <label htmlFor="guard-email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
                            <input 
                              id="guard-email"
                              className="mobile-input" 
                              placeholder="Email address" 
                              type="email"
                              value={profile.email} 
                              onChange={e=>setProfile({...profile, email:e.target.value})} 
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label htmlFor="guard-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Phone</label>
                          <input 
                            id="guard-phone"
                            className="mobile-input" 
                            placeholder="Phone number" 
                            value={profile.phone} 
                            onChange={e=>setProfile({...profile, phone:e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="primary" fullWidth type="submit">
                      Save Profile
                    </Button>
                  </form>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <NotificationSettings />
              </div>
            )}

            {/* Emergency Tab - Phase 1.1 */}
            {activeTab === "emergency" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                  <Icon name="AlertTriangle" className="text-red-500" /> Emergency Settings
                </h2>
                <PanicHistory />
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h2>

                {/* MFA Status Card */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Two-Factor Authentication</h3>
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
                    <div className={`p-4 rounded-lg border ${mfaStatus.mfaEnabled
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    }`}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <Icon
                            name={mfaStatus.mfaEnabled ? "ShieldCheck" : "ShieldAlert"}
                            className={`w-5 h-5 ${mfaStatus.mfaEnabled ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}
                          />
                          <div>
                            <p className={`font-medium text-sm ${mfaStatus.mfaEnabled ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                              MFA is {mfaStatus.mfaEnabled ? 'Enabled' : 'Not Set Up'}
                            </p>
                            <p className={`text-xs ${mfaStatus.mfaEnabled ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                              {mfaStatus.mfaRequired ? 'Required for your role' : 'Optional for your role'}
                            </p>
                          </div>
                        </div>
                        {!mfaStatus.mfaEnabled ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => navigate('/mfa/setup', {
                              state: { message: 'Set up MFA for your guard account.', returnUrl: '/dashboard/guard/settings?tab=security' }
                            })}
                          >
                            Set Up MFA
                          </Button>
                        ) : (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => { setShowDisableModal(true); setDisablePassword(''); setDisableToken(''); setDisableError(''); }}
                          >
                            Disable MFA
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Disable MFA Modal */}
                {showDisableModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="guard-disable-mfa-title">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                      <h3 id="guard-disable-mfa-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Disable MFA</h3>
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          <strong>Warning:</strong> Disabling MFA reduces your account security.
                          {mfaStatus.mfaRequired && ' MFA is required for your role — you will need to re-enable it.'}
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="guard-disable-mfa-password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Enter your password to confirm
                          </label>
                          <input
                            id="guard-disable-mfa-password"
                            type="password"
                            value={disablePassword}
                            onChange={(e) => { setDisablePassword(e.target.value); setDisableError(''); }}
                            className="w-full h-11 px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                            placeholder="Your account password"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label htmlFor="guard-disable-mfa-token" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Enter your current authenticator code to confirm
                          </label>
                          <input
                            id="guard-disable-mfa-token"
                            type="text"
                            inputMode="numeric"
                            maxLength={8}
                            value={disableToken}
                            onChange={(e) => { setDisableToken(e.target.value.replace(/[^a-zA-Z0-9]/g, '')); setDisableError(''); }}
                            className="w-full h-11 px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors max-w-[240px] tracking-widest text-center text-lg"
                            placeholder="000000"
                            autoComplete="one-time-code"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">You can also use a backup code</p>
                        </div>
                        {disableError && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{disableError}</p>}
                        <div className="flex gap-3 justify-end">
                          <Button variant="secondary" onClick={() => setShowDisableModal(false)} disabled={disableLoading}>Cancel</Button>
                          <Button variant="danger" onClick={handleDisableMFA} disabled={disableLoading || !disablePassword || !disableToken} aria-busy={disableLoading}>
                            {disableLoading ? 'Disabling...' : 'Disable MFA'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Other security options */}
                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={security.showLoginHistory}
                      onChange={(e) => setSecurity({...security, showLoginHistory: e.target.checked})}
                      className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500" 
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">Login History</span>
                      <p className="text-sm text-gray-500 dark:text-gray-300">Track recent login activity</p>
                    </div>
                  </label>
                </div>
                
                <Button variant="primary" fullWidth onClick={()=>notificationService.success('Security Settings', 'Security settings saved!')}>
                  Save Security Settings
                </Button>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Choose how SecureGate looks to you.
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
  );
}
