// client/src/pages/resident/Settings.jsx
import React, { useState, useEffect } from "react";
import "../styles.css";

export default function Settings() {
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    email: "",
    area: "",
    house: "",
  });
  const [passwords, setPasswords] = useState({ old: "", new: "" });
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
    document.body.classList.toggle("dark-mode", savedMode);
  }, []);

  const handleProfileUpdate = async () => {
    // send /api/update-profile
    alert("Profile updated!");
  };

  const handlePasswordChange = async () => {
    // send /api/change-password
    alert("Password changed!");
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem("darkMode", !darkMode);
    document.body.classList.toggle("dark-mode", !darkMode);
  };

  return (
    <div className="dashboard-panel">
      <h2>Settings</h2>

      <div className="form-group">
        <h3>Profile</h3>
        <input
          type="text"
          placeholder="Name"
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Phone"
          value={profile.phone}
          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
        />
        <input
          type="text"
          placeholder="Area"
          value={profile.area}
          onChange={(e) => setProfile({ ...profile, area: e.target.value })}
        />
        <input
          type="text"
          placeholder="House Number"
          value={profile.house}
          onChange={(e) => setProfile({ ...profile, house: e.target.value })}
        />
        <button className="btn primary" onClick={handleProfileUpdate}>Update Profile</button>
      </div>

      <div className="form-group">
        <h3>Change Password</h3>
        <input
          type="password"
          placeholder="Old Password"
          value={passwords.old}
          onChange={(e) => setPasswords({ ...passwords, old: e.target.value })}
        />
        <input
          type="password"
          placeholder="New Password"
          value={passwords.new}
          onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
        />
        <button className="btn primary" onClick={handlePasswordChange}>Change Password</button>
      </div>

      <div className="form-group">
        <h3>Preferences</h3>
        <label>
          <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} /> Dark Mode
        </label>
      </div>
    </div>
  );
}
