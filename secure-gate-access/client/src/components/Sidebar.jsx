// client/src/components/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";

const Link = ({ to, children }) => (
  <NavLink to={to} className={({isActive}) => "navlink" + (isActive ? " active" : "")}>
    {children}
  </NavLink>
);

export default function Sidebar({ role, onLogout, error }) {
  return (
    <aside className="sidebar" style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div>
        <h2>SecureGate</h2>
        {error && <div className="error-message">{error}</div>}
        {role === "resident" && (
          <>
            <div className="group-title">Resident</div>
            <Link to="/pages/resident/ResidentDashboard">Dashboard</Link>
            <Link to="/pages/resident/AddVisitor">Add Visitor</Link>
            <Link to="/pages/resident/GeneratePass">Generate Pass</Link>
            <Link to="/pages/resident/VisitorHistory">Visitor History</Link>
            <Link to="/pages/resident/BulkInvite">Bulk Invite</Link>
            <Link to="/pages/resident/Settings">Settings</Link>
          </>
        )}
        {role === "guard" && (
          <>
            <div className="group-title">Guard</div>
            <Link to="/dashboard/guard">Dashboard</Link>
            <Link to="/dashboard/guard/VisitorHistory">Visitor History</Link>
            <Link to="/dashboard/guard/Settings">Settings</Link>
          </>
        )}
        {role === "admin" && (
          <>
            <div className="group-title">Admin</div>
            <Link to="/dashboard/admin">Dashboard</Link>
            <Link to="/dashboard/admin/users">Residents</Link>
            <Link to="/dashboard/admin/visitors">Visitors Log</Link>
            <Link to="/dashboard/admin/manage-staff">Staff</Link>
            <Link to="/dashboard/admin/reports">Reports</Link>
            <Link to="/dashboard/admin/settings">Settings</Link>
          </>
        )}
      </div>
      <button className="btn" style={{marginTop:'auto', width:'100%'}} onClick={onLogout}>Logout</button>
    </aside>
  );
}
