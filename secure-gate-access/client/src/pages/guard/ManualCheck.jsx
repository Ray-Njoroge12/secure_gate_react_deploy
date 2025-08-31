// client/src/pages/guard/ManualCheck.jsx
import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";

export default function ManualCheck(){
  const onLogout = ()=> { localStorage.removeItem("role"); window.location.href = "/"; };
  const [query,setQuery] = useState("");
  const rows = [
    ["824193","Jane Doe","House 3B","IN","09:30"],
    ["000111","Mike","Villa 8","OUT","10:00"]
  ];

  const validate = ()=> alert("Validated (mock): " + query);

  return (
    <div className="app-grid">
      <Sidebar role="guard" />
      <div>
        <Topbar title="Manual Check" onLogout={onLogout} />
        <main className="main">
          <div className="panel">
            <h3 style={{marginTop:0}}>Validate OTP / Search Visitor</h3>
            <div style={{display:"flex", gap:10}}>
              <input className="input" placeholder="Enter OTP or phone/ID" value={query} onChange={e=>setQuery(e.target.value)} />
              <button className="btn primary" onClick={validate}>Validate</button>
            </div>
          </div>

          <h3 style={{marginTop:16}}>Recent</h3>
          <Table headers={["OTP","Visitor","Resident","Status","Time"]} rows={rows} />
        </main>
      </div>
    </div>
  );
}
