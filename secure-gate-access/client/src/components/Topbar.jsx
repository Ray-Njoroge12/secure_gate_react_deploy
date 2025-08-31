// client/src/components/Topbar.jsx
import React from "react";

export default function Topbar({ title, onLogout }) {
  const role = localStorage.getItem("role") || "guest";
  return (
    <div className="topbar">
      <div style={{display:"flex", gap:12, alignItems:"center"}}>
        <strong>{title}</strong>
        <span className="pill">role: {role}</span>
      </div>
      <div>
        <button className="btn" onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
}
