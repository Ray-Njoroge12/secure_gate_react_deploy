import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import StatsCard from "../../components/StatsCard";
import Table from "../../components/Table";
import axios from "axios";

export default function AdminDashboard() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token") || localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
  const [users, setUsers] = useState([]);
  useEffect(() => {
    axios.get("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setUsers(r.data)).catch(()=>{});
  }, []);
  const onLogout = () => { localStorage.clear(); window.location.href = "/login"; };

  return (
    <div className="app-grid">
      <Sidebar role="admin" />
      <div>
        <Topbar title="Admin Dashboard" onLogout={onLogout} />
        <main className="main">
          <div className="grid three">
            <StatsCard title="Visitors Today" value="24" />
            <StatsCard title="Active Visitors" value="6" />
            <StatsCard title="Total Residents" value={String(users.filter(u=>u.role==='resident').length)} />
          </div>

          <h3 style={{ marginTop: 16 }}>User Management (quick view)</h3>
          <Table headers={["ID","Name","Role","Status","Actions"]} rows={users.map(u=>[u.id,u.name,u.role,u.status,"View | Edit"])} />
        </main>
      </div>
    </div>
  );
}
