// client/src/components/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";

const Link = ({ to, children }) => (
  <NavLink to={to} className={({isActive}) => "navlink" + (isActive ? " active" : "")}>
    {children}
  </NavLink>
);

export default function Sidebar({ role }) {
  return (
    <aside className="sidebar">
      <h2>SecureGate</h2>

      {role === "resident" && (
        <>
          <div className="group-title">Resident</div>
          <Link to="/pages/resident/ResidentDashboard">Dashboard</Link>
          <Link to="/pages/resident/AddVisitor">Add Visitor</Link>
          <Link to="/pages/resident/GeneratePass">Generate Pass</Link>
          <Link to="/pages/resident/VisitorHistory">Visitor History</Link>
        </>
      )}

      {role === "guard" && (
        <>
          <div className="group-title">Security</div>
          <Link to="/guard/dashboard">Dashboard</Link>
          <Link to="/guard/scan-qr">Scan QR</Link>
          <Link to="/guard/manual-check">Manual Check</Link>
          <Link to="/visitor-history">Visitor History</Link>
        </>
      )}

      {role === "admin" && (
        <>
          <div className="group-title">Admin</div>
          <Link to="/admin/dashboard">Dashboard</Link>
          <Link to="/admin/manage-residents">Residents</Link>
          <Link to="/admin/visitor-log">Visitors Log</Link>
          <Link to="/admin/manage-staff">Staff</Link>
          <Link to="/admin/reports">Reports</Link>
        </>
      )}
    </aside>
  );
}
