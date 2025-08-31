// client/src/pages/guard/ScanQR.jsx
import React from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

export default function ScanQR(){
  const onLogout = ()=> { localStorage.removeItem("role"); window.location.href = "/"; };

  const simulateValid = ()=> alert("QR valid — check-in recorded (mock)");
  const simulateInvalid = ()=> alert("QR invalid");

  return (
    <div className="app-grid">
      <Sidebar role="guard" />
      <div>
        <Topbar title="Scan QR" onLogout={onLogout} />
        <main className="main">
          <div className="panel">
            <h3 style={{marginTop:0}}>QR Scanner (mock)</h3>
            <div className="placeholder" style={{height:320}}>Camera view placeholder</div>
            <div style={{display:"flex", gap:10, marginTop:12}}>
              <button className="btn primary" onClick={simulateValid}>Simulate Valid</button>
              <button className="btn danger" onClick={simulateInvalid}>Simulate Invalid</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
