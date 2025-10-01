import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";
import axios from "axios";

export default function Incidents() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token") || localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
  const [incidents, setIncidents] = useState([]);
  useEffect(()=> {
    axios.get("/api/admin/incidents", { headers:{ Authorization:`Bearer ${token}` }})
      .then(r=>setIncidents(r.data)).catch(()=>{});
  },[]);
  return (
    <div className="app-grid">
      <Sidebar />
      <div>
        <Topbar title="Incidents" onLogout={() => { localStorage.clear(); window.location.href="/login"; }} />
        <main className="main">
          <Table headers={["ID","Title","Status","Assigned","Actions"]} rows={incidents.map(i=>[i.id,i.title,i.status,i.assignedTo || "-", "View | Close"])} />
        </main>
      </div>
    </div>
  );
}
