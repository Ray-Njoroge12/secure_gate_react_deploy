import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";
import axios from "axios";

export default function AccessControl() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token") || localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
  const [cards, setCards] = useState([]);
  useEffect(()=>{
    // endpoint example; adapt to your backend
    axios.get("/api/admin/access-cards", { headers:{ Authorization:`Bearer ${token}` }})
      .then(r=>setCards(r.data)).catch(()=>setCards([]));
  },[]);
  return (
    <div className="app-grid">
      <Sidebar />
      <div>
        <Topbar title="Access Control" onLogout={() => { localStorage.clear(); window.location.href="/login"; }} />
        <main className="main">
          <Table headers={["Card ID","Holder","Zone","Status","Actions"]} rows={cards.map(c=>[c.id,c.holder,c.zone,c.status,"Disable | Assign"])} />
        </main>
      </div>
    </div>
  );
}
