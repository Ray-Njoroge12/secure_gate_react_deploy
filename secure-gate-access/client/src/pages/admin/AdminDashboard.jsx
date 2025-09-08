import React from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import StatsCard from "../../components/StatsCard";
import Table from "../../components/Table";

export default function AdminDashboard() {
  const onLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const userRows = [
    ["1","Alice Mwangi","Resident","Active","Edit | Deactivate"],
    ["2","John Guard","Guard","Active","Edit | Deactivate"],
  ];

  return (
    <div className="app-grid">
      <Sidebar role={localStorage.getItem('role')} />
      <div>
        <Topbar title="Admin Dashboard" onLogout={onLogout} />
        <main className="main">
          <div className="grid three">
            <StatsCard title="Visitors Today" value="24" />
            <StatsCard title="Active Visitors" value="6" />
            <StatsCard title="Total Residents" value="112" />
          </div>

          <h3 style={{marginTop:16}}>User Management</h3>
          <Table headers={["ID","Name","Role","Status","Actions"]} rows={userRows} />
        </main>
      </div>
    </div>
  );
}
