import React from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";

export default function ResidentDashboard() {
  const onLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const rows = [
    ["James K","31 Aug 2025","Pending","Approve | Reject"],
    ["Anna L","30 Aug 2025","Approved","Cancel"],
  ];

  return (
    <div className="app-grid">
      <Sidebar role="resident" />
      <div>
        <Topbar title="Resident Dashboard" onLogout={onLogout} />
        <main className="main">
          <div className="grid two">
            <div className="panel">
              <div className="kpi">2</div>
              <div className="kpi-sub">Active visitors</div>
            </div>
            <div className="panel">
              <div className="kpi">5</div>
              <div className="kpi-sub">Approved today</div>
            </div>
          </div>

          <h3 style={{marginTop:16}}>My Visitor Requests</h3>
          <Table headers={["Visitor","Date","Status","Actions"]} rows={rows} />
        </main>
      </div>
    </div>
  );
}
