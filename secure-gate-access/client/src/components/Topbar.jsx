// client/src/components/Topbar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Topbar({ title }) {
  const role = localStorage.getItem("role") || "guest";
  const [profilePic, setProfilePic] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setProfilePic(localStorage.getItem("profilePic"));
    window.addEventListener("profilePicChanged", () => {
      setProfilePic(localStorage.getItem("profilePic"));
    });
    return () => window.removeEventListener("profilePicChanged", () => {});
  }, []);

  return (
    <div className="topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <strong>{title}</strong>
        <span className="pill">role: {role}</span>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
        <button
          className="profile-btn"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            marginLeft: "auto",
          }}
          onClick={() => {
            if (role === "resident") navigate("/pages/resident/Settings");
            else if (role === "guard") navigate("/dashboard/guard/Settings");
            else if (role === "admin") navigate("/dashboard/admin/settings");
          }}
        >
          <span style={{position:'relative', width:40, height:40, display:'inline-block'}}>
            <span style={{width:40, height:40, borderRadius:'50%', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', border:'2px solid var(--accent)'}}>
              {(profilePic && profilePic !== "") ? (
                <img src={profilePic} alt="Profile" style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%'}} />
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block', margin:'auto'}}>
                  <circle cx="12" cy="8" r="4" stroke="var(--accent)" strokeWidth="2" fill="var(--bg)" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="var(--accent)" strokeWidth="2" fill="none" />
                </svg>
              )}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
