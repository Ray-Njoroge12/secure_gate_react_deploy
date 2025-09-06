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
            <Link to="/dashboard/resident">Dashboard</Link>
            <Link to="/resident/add-visitor">Add Visitor</Link>
            <Link to="/resident/generate-pass">Generate Pass</Link>
            <Link to="/resident/visitor-history">Visitor History</Link>
            <Link to="/resident/bulk-invite">Bulk Invite</Link>
            <Link to="/resident/settings">Settings</Link>
          </>
        )}
        {role === "security" && (
          <>
            <div className="group-title">Security</div>
            <Link to="/dashboard/guard">Dashboard</Link>
            <Link to="/dashboard/guard/scan-qr">Scan QR</Link>
            <Link to="/dashboard/guard/manual-check">Manual Check</Link>
            <Link to="/dashboard/guard/visitor-history">Visitor History</Link>
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
