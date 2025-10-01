import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";
import axios from "axios";

export default function Users() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token") || localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
  const [users, setUsers] = useState([]);
  useEffect(() => {
    axios.get("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setUsers(r.data)).catch(()=>{});
  }, []);
  return (
    <div className="app-grid">
      <Sidebar />
      <div>
        <Topbar title="User Management" onLogout={() => { localStorage.clear(); window.location.href="/login"; }} />
        <main className="main">
          <Table headers={["ID","Name","Role","Status","Actions"]} rows={users.map(u=>[u.id,u.name,u.role,u.status,"Edit | Deactivate"])} />
        </main>
      </div>
    </div>
  );
}
