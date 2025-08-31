import React from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";

export default function GuardDashboard() {
  const onLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const rows = [
    ["Jane Doe","House 3B","10:05","","Pending"],
    ["Mike Otieno","Villa 8","09:30","10:00","Out"],
  ];

  return (
    <div className="app-grid">
      <Sidebar role="guard" />
      <div>
        <Topbar title="Guard Station" onLogout={onLogout} />
        <main className="main">
          <h3>Quick Actions</h3>
          <div style={{display:"flex", gap:10, marginBottom:12}}>
            <button className="btn primary">Open Scanner</button>
            <button className="btn">Manual Check</button>
          </div>

          <h3>Recent Validations</h3>
          <Table headers={["Visitor","Resident","In","Out","Status"]} rows={rows} />
        </main>
      </div>
    </div>
  );
}
