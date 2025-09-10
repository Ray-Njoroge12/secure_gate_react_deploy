import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";
import axios from "axios";

export default function Visitors() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token") || localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
  const [visitors, setVisitors] = useState([]);
  useEffect(()=> {
    axios.get("/api/admin/visitors", { headers:{ Authorization:`Bearer ${token}` }})
      .then(r=>setVisitors(r.data)).catch(()=>{});
  },[]);
  return (
    <div className="app-grid">
      <Sidebar />
      <div>
        <Topbar title="Visitors" onLogout={() => { localStorage.clear(); window.location.href="/login"; }} />
        <main className="main">
          <Table headers={["ID","Name","Host","Status","Actions"]} rows={visitors.map(v=>[v.id,v.name,v.host,v.status,"Approve | Reject"])} />
        </main>
      </div>
    </div>
  );
}
