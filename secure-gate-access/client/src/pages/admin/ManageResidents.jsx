// client/src/pages/admin/ManageResidents.jsx
import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";

export default function ManageResidents(){
  const onLogout = ()=> { localStorage.removeItem("role"); window.location.href = "/"; };
  const [residents, setResidents] = useState([
    ["1","A. Mwangi","Villa 12","07xx xxx xxx","Active"],
    ["2","S. Okello","House 4B","07xx xxx 222","Active"],
  ]);

  return (
    <div className="app-grid">
      <Sidebar role="admin" />
      <div>
        <Topbar title="Manage Residents" onLogout={onLogout} />
        <main className="main">
          <div className="panel">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <h3 style={{margin:0}}>Residents</h3>
              <button className="btn primary" onClick={()=>alert("Add resident (mock)")}>Add Resident</button>
            </div>
            <Table headers={["ID","Name","Address","Phone","Status"]} rows={residents} />
          </div>
        </main>
      </div>
    </div>
  );
}
