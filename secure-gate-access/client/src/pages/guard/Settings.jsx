import React, { useState } from "react";
import { PageHeader, ThemeRadioGroup } from "../../components/ui";
import { useTheme } from "../../contexts/ThemeContext";
import NotificationSettings from "../../components/settings/NotificationSettings";
import PanicHistory from "../../components/guard/PanicHistory"; // Phase 1.1: Emergency History
import { Settings as SettingsIcon, Bell, Shield, User, Eye, AlertTriangle } from 'lucide-react';

export default function Settings() {
  const { theme, resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [profilePic, setProfilePic] = useState(null);
  const [security, setSecurity] = useState({ twoFA: false, showLoginHistory: true });

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
    alert("Profile updated!");
  };

  const tabs = [
    { key: "profile", label: "Profile", icon: <User size={16} /> },
    { key: "notifications", label: "Notifications", icon: <Bell size={16} /> },
    { key: "emergency", label: "Emergency", icon: <AlertTriangle size={16} /> }, // Phase 1.1
    { key: "security", label: "Security", icon: <Shield size={16} /> },
    { key: "appearance", label: "Appearance", icon: <Eye size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="Settings"
        subtitle="Manage your guard profile and preferences"
        icon={<SettingsIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
        showBack={true}
        backTo="/dashboard/guard"
      />
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Tab Buttons */}
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

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-green-500 overflow-hidden mb-3">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <label className="cursor-pointer text-sm text-green-600 dark:text-green-400 hover:underline">
                  Change Photo
                  <input type="file" accept="image/*" onChange={handleProfilePicChange} className="hidden" />
                </label>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Name</label>
                  <input 
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                    placeholder="Your name" 
                    value={profile.name} 
                    onChange={e=>setProfile({...profile, name:e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
                  <input 
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                    placeholder="Email address" 
                    type="email"
                    value={profile.email} 
                    onChange={e=>setProfile({...profile, email:e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Phone</label>
                  <input 
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                    placeholder="Phone number" 
                    value={profile.phone} 
                    onChange={e=>setProfile({...profile, phone:e.target.value})} 
                  />
                </div>
              </div>
              
              <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors" type="submit">
                Save Profile
              </button>
            </form>
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
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Emergency Settings</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  View your panic button history and privacy information.
                </p>
              </div>
              
              {/* Panic Button Info */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-red-900 dark:text-red-300">About Panic Button</h3>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                      The red emergency button at the bottom-right of your screen sends an immediate alert to all security personnel. Use it when you need urgent assistance.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Privacy Notice */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Privacy Notice</h3>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• Your location is captured <strong>only</strong> when you press the panic button</li>
                  <li>• We do not continuously track your location</li>
                  <li>• Location data is deleted 90 days after incident resolution</li>
                  <li>• Panic button usage is not used for performance reviews</li>
                </ul>
              </div>
              
              {/* Panic History */}
              <PanicHistory limit={10} />
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={security.twoFA}
                    onChange={(e) => setSecurity({...security, twoFA: e.target.checked})}
                    className="w-5 h-5 text-green-600 rounded" 
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</span>
                    <p className="text-sm text-gray-500 dark:text-gray-300">Add extra security to your account</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={security.showLoginHistory}
                    onChange={(e) => setSecurity({...security, showLoginHistory: e.target.checked})}
                    className="w-5 h-5 text-green-600 rounded" 
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Login History</span>
                    <p className="text-sm text-gray-500 dark:text-gray-300">Track recent login activity</p>
                  </div>
                </label>
              </div>
              
              <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors" type="button" onClick={()=>alert('Security settings saved!')}>
                Save Security Settings
              </button>
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
  );
}