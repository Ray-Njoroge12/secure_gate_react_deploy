// client/src/pages/resident/Settings.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, ThemeRadioGroup, ErrorDisplay, SuccessDisplay, Button } from "../../components/ui";
import AppShell from "../../layouts/AppShell";
import { useCurrentRole } from "../../hooks/useCurrentRole";
import { useTheme } from "../../contexts/ThemeContext";
import NotificationSettings from "../../components/settings/NotificationSettings";
import { Settings as SettingsIcon, Bell, Shield, User, Eye, Users } from 'lucide-react';
import "../../styles.css";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, resolvedTheme, isDark } = useTheme();
  const role = useCurrentRole();
  
  // UI State
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Data State
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({ name: "", phone: "", email: "", area: "", house: "" });
  const [passwords, setPasswords] = useState({ old: "", new: "" });
  const [notifications, setNotifications] = useState({ notify_email: true, notify_sms: false });
  
  // Load notification preferences from backend
  useEffect(() => {
    fetch('/api/auth/profile', { method: 'GET', headers: { 'Content-Type': 'application/json' } })
      .then(res => res.json())
      .then(data => {
        if (data?.user) {
          setNotifications({
            notify_email: !!data.user.notify_email,
            notify_sms: !!data.user.notify_sms
          });
          setProfile({
            name: data.user.username || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            area: data.user.area || '',
            house: data.user.house_number || ''
          });
        }
      })
      .catch(err => console.error('Failed to load profile:', err));
  }, []);
  const [security, setSecurity] = useState({ twoFA: false, showLoginHistory: true });
  const [visitorPrefs, setVisitorPrefs] = useState({ defaultDuration: "1 hour", maxVisitors: 5 });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleUpdate('Notifications', e);
      }
      // Escape to clear messages
      if (e.key === 'Escape') {
        setError("");
        setSuccess("");
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUpdate = async (type, e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (type === 'Notifications') {
        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notify_email: notifications.notify_email, notify_sms: notifications.notify_sms })
        });
        const data = await res.json();
        if (data.success) setSuccess('Notification preferences updated!');
        else throw new Error(data.message || 'Failed to update preferences');
      } else if (type === 'Profile') {
        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: profile.name,
            email: profile.email,
            phone: profile.phone,
            area: profile.area,
            house_number: profile.house
          })
        });
        const data = await res.json();
        if (data.success) setSuccess('Profile updated successfully!');
        else throw new Error(data.message || 'Failed to update profile');
      } else {
        // Mock success for other tabs
        setSuccess(`${type} settings updated!`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: "profile", label: "Profile", icon: <User size={16} /> },
    { key: "password", label: "Password", icon: <Shield size={16} /> },
    { key: "notifications", label: "Notifications", icon: <Bell size={16} /> },
    { key: "security", label: "Security", icon: <Shield size={16} /> },
    { key: "visitorPrefs", label: "Visitors", icon: <Users size={16} /> },
    { key: "preferences", label: "Appearance", icon: <Eye size={16} /> },
  ];

  const inputClass = "input"; 
  const btnClass = "btn btn-primary w-full md:w-auto"; // Enhanced button class

  return (
    <AppShell role={role}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="Settings"
        subtitle="Manage your account preferences"
        icon={<SettingsIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
        showBack={true}
        backTo="/dashboard/resident"
      />
      
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Messages */}
        {error && <ErrorDisplay message={error} onDismiss={() => setError("")} className="mb-4" />}
        {success && <SuccessDisplay message={success} onDismiss={() => setSuccess("")} className="mb-4" />}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 space-x-1 overflow-x-auto tabs-scroll pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap text-sm transition-colors focus:outline-none ${
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

        {/* Tab Content */}
        {activeTab === "profile" && (
          <form onSubmit={(e) => handleUpdate("Profile", e)} className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Update your personal details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Name</label>
                <input type="text" placeholder="Your name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={`${inputClass} dark:bg-gray-800 dark:border-gray-600 dark:text-white`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Phone</label>
                <input type="text" placeholder="Phone number" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={`${inputClass} dark:bg-gray-800 dark:border-gray-600 dark:text-white`} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
                <input type="email" placeholder="Email address" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={`${inputClass} dark:bg-gray-800 dark:border-gray-600 dark:text-white`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Area</label>
                <input type="text" placeholder="Area/Block" value={profile.area} onChange={(e) => setProfile({ ...profile, area: e.target.value })} className={`${inputClass} dark:bg-gray-800 dark:border-gray-600 dark:text-white`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">House Number</label>
                <input type="text" placeholder="House number" value={profile.house} onChange={(e) => setProfile({ ...profile, house: e.target.value })} className={`${inputClass} dark:bg-gray-800 dark:border-gray-600 dark:text-white`} />
              </div>
            </div>
            <div className="mt-4">
              <Button type="submit" variant="primary">Update Profile</Button>
            </div>
          </form>
        )}

        {activeTab === "password" && (
          <form onSubmit={(e) => handleUpdate("Password", e)} className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Update your password for security</p>
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Current Password</label>
                <input type="password" placeholder="Enter current password" value={passwords.old} onChange={(e) => setPasswords({ ...passwords, old: e.target.value })} className={`${inputClass} dark:bg-gray-800 dark:border-gray-600 dark:text-white`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">New Password</label>
                <input type="password" placeholder="Enter new password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className={`${inputClass} dark:bg-gray-800 dark:border-gray-600 dark:text-white`} />
              </div>
            </div>
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
          <form onSubmit={(e) => handleUpdate("Security", e)} className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Configure account security options</p>
            <div className="space-y-4 mt-4">
              <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-green-500 transition-colors">
                <input 
                  type="checkbox" 
                  checked={security.twoFA} 
                  onChange={(e) => setSecurity({ ...security, twoFA: e.target.checked })} 
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500" 
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</span>
                  <p className="text-sm text-gray-500 dark:text-gray-300">Add an extra layer of security to your account</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-green-500 transition-colors">
                <input 
                  type="checkbox" 
                  checked={security.showLoginHistory} 
                  onChange={(e) => setSecurity({ ...security, showLoginHistory: e.target.checked })} 
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500" 
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Login History</span>
                  <p className="text-sm text-gray-500 dark:text-gray-300">Track and display recent login activity</p>
                </div>
              </label>
            </div>
            <div className="mt-4">
              <Button type="submit" variant="primary">Save Security Settings</Button>
            </div>
          </form>
        )}

        {activeTab === "visitorPrefs" && (
          <form onSubmit={(e) => handleUpdate("Visitor Preferences", e)} className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Visitor Preferences</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Configure default visitor settings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Default Invite Duration</label>
                <select 
                  value={visitorPrefs.defaultDuration} 
                  onChange={(e) => setVisitorPrefs({ ...visitorPrefs, defaultDuration: e.target.value })} 
                  className={`${inputClass} dark:bg-gray-800 dark:border-gray-600 dark:text-white`}
                >
                  <option>1 hour</option>
                  <option>3 hours</option>
                  <option>6 hours</option>
                  <option>1 day</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Max Visitors Per Day</label>
                <input 
                  type="number" 
                  value={visitorPrefs.maxVisitors} 
                  onChange={(e) => setVisitorPrefs({ ...visitorPrefs, maxVisitors: e.target.value })} 
                  className={`${inputClass} dark:bg-gray-800 dark:border-gray-600 dark:text-white`} 
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
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Choose how SecureGate looks to you. Select a single theme, or sync with your system and automatically switch between day and night themes.
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
        </div>
      </div>
    </div>
    </AppShell>
  );
}
