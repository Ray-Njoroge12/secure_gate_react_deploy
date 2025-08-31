// client/src/pages/admin/ManageStaff.jsx
import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";

export default function ManageStaff(){
  const onLogout = ()=> { localStorage.removeItem("role"); window.location.href = "/"; };
  const [staff] = useState([
    ["1","G. Otieno","Day","Main","Active"],
    ["2","M. Wanjiru","Night","South","Active"],
  ]);

  return (
    <div className="app-grid">
      <Sidebar role="admin" />
      <div>
        <Topbar title="Manage Security Staff" onLogout={onLogout} />
        <main className="main">
          <div className="panel">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <h3 style={{margin:0}}>Security Staff</h3>
              <div>
                <button className="btn">Assign Gate</button>
                <button className="btn primary" style={{marginLeft:8}}>Add Guard</button>
              </div>
            </div>
            <Table headers={["ID","Name","Shift","Gate","Status"]} rows={staff} />
          </div>
        </main>
      </div>
    </div>
  );
}
