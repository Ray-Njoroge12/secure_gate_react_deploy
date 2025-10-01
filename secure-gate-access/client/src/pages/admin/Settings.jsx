import React from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

export default function Settings() {
  return (
    <div className="app-grid">
      <Sidebar />
      <div>
        <Topbar title="Settings" onLogout={() => { localStorage.clear(); window.location.href="/login"; }} />
        <main className="main">
          <h3>Settings</h3>
          <p>Configure policies, notification channels, and admin details (server-side).</p>
        </main>
      </div>
    </div>
  );
}
