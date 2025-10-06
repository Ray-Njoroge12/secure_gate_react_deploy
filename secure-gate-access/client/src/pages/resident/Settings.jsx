// client/src/pages/resident/Settings.jsx
import React, { useState, useEffect } from "react";
import "../../styles.css";

export default function Settings() {
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
        }
      });
  }, []);
  const [security, setSecurity] = useState({ twoFA: false, showLoginHistory: true });
  const [visitorPrefs, setVisitorPrefs] = useState({ defaultDuration: "1 hour", maxVisitors: 5 });
  const [darkMode, setDarkMode] = useState(false);

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
        // Clear any error/success messages
        const errorElements = document.querySelectorAll('.error-message');
        const successElements = document.querySelectorAll('.success-message');
        errorElements.forEach(el => el.style.display = 'none');
        successElements.forEach(el => el.style.display = 'none');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
    document.body.classList.toggle("dark-mode", savedMode);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem("darkMode", !darkMode);
    document.body.classList.toggle("dark-mode", !darkMode);
  };

  const handleUpdate = (type, e) => {
    e.preventDefault();
    if (type === 'Notifications') {
      // Save notification preferences
      fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify_email: notifications.notify_email, notify_sms: notifications.notify_sms })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) alert('Notification preferences updated!');
          else alert('Failed to update preferences');
        });
    } else {
      alert(`${type} updated!`);
    }
  };

  const tabs = [
    { key: "profile", label: "Profile" },
    { key: "password", label: "Change Password" },
    { key: "notifications", label: "Notifications" },
    { key: "security", label: "Security" },
    { key: "visitorPrefs", label: "Visitor Preferences" },
    { key: "preferences", label: "Preferences" },
  ];

  const inputClass = "input"; // use your CSS class
  const btnClass = "btn primary"; // use your CSS button class

  return (
    <div className="flex justify-center mt-10 px-4">
      <div className="w-full max-w-2xl bg-panel rounded-3xl shadow-lg p-6">
        {/* Tabs */}
        <div className="flex border-b mb-6 space-x-2 overflow-x-auto tabs-scroll">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 rounded-t-xl font-semibold cursor-pointer whitespace-nowrap text-sm ${
                activeTab === tab.key ? "bg-accent text-black" : "text-muted hover:bg-line"
              }`}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "profile" && (
          <form onSubmit={(e) => handleUpdate("Profile", e)} className="bg-panel rounded-2xl p-6 space-y-3 shadow-inner">
            <h2 className="text-lg font-semibold">Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="text" placeholder="Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={inputClass} />
              <input type="text" placeholder="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputClass} />
              <input type="email" placeholder="Email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputClass + " md:col-span-2"} />
              <input type="text" placeholder="Area" value={profile.area} onChange={(e) => setProfile({ ...profile, area: e.target.value })} className={inputClass} />
              <input type="text" placeholder="House Number" value={profile.house} onChange={(e) => setProfile({ ...profile, house: e.target.value })} className={inputClass} />
            </div>
            <button type="submit" className={btnClass}>Update Profile</button>
          </form>
        )}

        {activeTab === "password" && (
          <form onSubmit={(e) => handleUpdate("Password", e)} className="bg-panel rounded-2xl p-6 space-y-3 shadow-inner">
            <h2 className="text-lg font-semibold">Change Password</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="password" placeholder="Old Password" value={passwords.old} onChange={(e) => setPasswords({ ...passwords, old: e.target.value })} className={inputClass} />
              <input type="password" placeholder="New Password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className={inputClass} />
            </div>
            <button type="submit" className={btnClass}>Change Password</button>
          </form>
        )}

        {activeTab === "notifications" && (
          <form onSubmit={(e) => { e.preventDefault(); handleUpdate("Notifications", e); }} className="bg-panel rounded-2xl p-6 space-y-3 shadow-inner">
            <h2 className="text-lg font-semibold">Notifications</h2>
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" checked={notifications.notify_email} onChange={e => setNotifications({ ...notifications, notify_email: e.target.checked })} className="w-4 h-4" />
              <span>Email Notifications</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" checked={notifications.notify_sms} onChange={e => setNotifications({ ...notifications, notify_sms: e.target.checked })} className="w-4 h-4" />
              <span>SMS Notifications</span>
            </label>
            <button type="submit" className={btnClass}>Save Notifications</button>
          </form>
        )}

        {activeTab === "security" && (
          <form onSubmit={(e) => handleUpdate("Security", e)} className="bg-panel rounded-2xl p-6 space-y-3 shadow-inner">
            <h2 className="text-lg font-semibold">Security</h2>
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" checked={security.twoFA} onChange={(e) => setSecurity({ ...security, twoFA: e.target.checked })} className="w-4 h-4" />
              <span>Enable Two-Factor Authentication</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" checked={security.showLoginHistory} onChange={(e) => setSecurity({ ...security, showLoginHistory: e.target.checked })} className="w-4 h-4" />
              <span>Show Login History</span>
            </label>
            <button type="submit" className={btnClass}>Save Security</button>
          </form>
        )}

        {activeTab === "visitorPrefs" && (
          <form onSubmit={(e) => handleUpdate("Visitor Preferences", e)} className="bg-panel rounded-2xl p-6 space-y-3 shadow-inner">
            <h2 className="text-lg font-semibold">Visitor Preferences</h2>
            <label className="block text-sm">
              Default Invite Duration
              <select value={visitorPrefs.defaultDuration} onChange={(e) => setVisitorPrefs({ ...visitorPrefs, defaultDuration: e.target.value })} className={inputClass + " mt-1"}>
                <option>1 hour</option>
                <option>3 hours</option>
                <option>6 hours</option>
                <option>1 day</option>
              </select>
            </label>
            <label className="block text-sm">
              Max Visitors
              <input type="number" value={visitorPrefs.maxVisitors} onChange={(e) => setVisitorPrefs({ ...visitorPrefs, maxVisitors: e.target.value })} className={inputClass + " mt-1"} min="1" />
            </label>
            <button type="submit" className={btnClass}>Save Visitor Preferences</button>
          </form>
        )}

        {activeTab === "preferences" && (
          <form onSubmit={(e) => handleUpdate("Preferences", e)} className="bg-panel rounded-2xl p-6 space-y-3 shadow-inner">
            <h2 className="text-lg font-semibold">Preferences</h2>
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} className="w-4 h-4" />
              <span>Dark Mode</span>
            </label>
          </form>
        )}
      </div>
    </div>
  );
}
