import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import AddVisitor from "./AddVisitor";
import BulkInvite from "./BulkInvite";
import VisitorHistory from "./VisitorHistory";
import GeneratePass from "./GeneratePass";
import Settings from "./Settings";

export default function ResidentDashboard() {
  const onLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };
  const location = useLocation();
  let panel = <p>Welcome to your Resident Dashboard!</p>;
  if (location.pathname === "/pages/resident/AddVisitor") panel = <AddVisitor />;
  else if (location.pathname === "/pages/resident/GeneratePass") panel = <GeneratePass />;
  else if (location.pathname === "/pages/resident/VisitorHistory") panel = <VisitorHistory />;
  else if (location.pathname === "/pages/resident/BulkInvite") panel = <BulkInvite />;
  else if (location.pathname === "/pages/resident/Settings") panel = <Settings />;

  return (
    <div className="app-grid">
      <Sidebar role={localStorage.getItem('role')} />
      <div>
        <Topbar title="Resident Dashboard" onLogout={onLogout} />
        <main className="main">
          {panel}
        </main>
      </div>
    </div>
  );
}
