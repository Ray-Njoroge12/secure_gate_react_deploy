import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";
import ManualCheck from "./ManualCheck";
import ScanQR from "./ScanQR";
import Settings from "./Settings";
import VisitorHistory from "./VisitorHistory";

export default function GuardDashboard() {
  const onLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };
  const location = useLocation();
  const rows = [
    ["Jane Doe","House 3B","10:05","","Pending"],
    ["Mike Otieno","Villa 8","09:30","10:00","Out"],
  ];

  let panel = (
    <>
      <h3>Quick Actions</h3>
      <div style={{display:"flex", gap:10, marginBottom:12}}>
        <a href="/dashboard/guard/ScanQR"><button className="btn">Open Scanner</button></a>
        <a href="/dashboard/guard/ManualCheck"><button className="btn">Manual Check</button></a>
      </div>
      <h3>Recent Validations</h3>
      <Table headers={["Visitor","Resident","In","Out","Status"]} rows={rows} />
    </>
  );
  if (location.pathname === "/dashboard/guard/ManualCheck" || location.pathname === "/dashboard/guard/manual-check") panel = <ManualCheck />;
  else if (location.pathname === "/dashboard/guard/ScanQR" || location.pathname === "/dashboard/guard/scanner") panel = <ScanQR />;
  else if (location.pathname === "/dashboard/guard/Settings" || location.pathname === "/dashboard/guard/settings") panel = <Settings />;
  else if (location.pathname === "/dashboard/guard/VisitorHistory" || location.pathname === "/dashboard/guard/history") panel = <VisitorHistory />;

  return (
    <div className="app-grid">
      <Sidebar role="guard" />
      <div>
        <Topbar title="Guard Station" onLogout={onLogout} />
        <main className="main">
          {panel}
        </main>
      </div>
    </div>
  );
}
