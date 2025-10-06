import React from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

export default function Settings() {
  return (
    <div className="grid grid-cols-[260px_1fr] min-h-screen">
      <Sidebar />
      <div>
        <Topbar title="Settings" onLogout={() => { localStorage.clear(); window.location.href="/login"; }} />
        <main className="flex-1 overflow-y-auto bg-slate-900 p-6">
          <h3>Settings</h3>
          <p>Configure policies, notification channels, and admin details (server-side).</p>
        </main>
      </div>
    </div>
  );
}
