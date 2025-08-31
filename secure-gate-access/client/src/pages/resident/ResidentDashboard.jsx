import React from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

export default function ResidentDashboard() {
  const onLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="app-grid">
      <Sidebar role="resident" />
      <div>
        <Topbar title="Resident Dashboard" onLogout={onLogout} />
        <main className="main">
          <div className="dashboard-links">
            <Link to="/dashboard/resident/add-visitor" className="btn">Add Visitor</Link>
            <Link to="/dashboard/resident/generate-pass" className="btn">Generate Pass</Link>
            <Link to="/dashboard/resident/visitor-history" className="btn">Visitor History</Link>
          </div>
        </main>
      </div>
    </div>
  );
}
