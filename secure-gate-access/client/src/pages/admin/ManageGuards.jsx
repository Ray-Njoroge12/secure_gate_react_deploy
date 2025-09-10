import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";
import axios from "axios";

export default function Guards() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token") || localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
  const [guards, setGuards] = useState([]);
  useEffect(()=> {
    axios.get("/api/admin/guards", { headers:{ Authorization:`Bearer ${token}` }})
      .then(r=>setGuards(r.data)).catch(()=>{});
  },[]);
  return (
    <div className="app-grid">
      <Sidebar />
      <div>
        <Topbar title="Guards" onLogout={() => { localStorage.clear(); window.location.href="/login"; }} />
        <main className="main">
          <Table headers={["ID","Name","Post","Status","Actions"]} rows={guards.map(g=>[g.id,g.name,g.post,g.status,"Edit | Remove"])} />
        </main>
      </div>
    </div>
  );
}
