// client/src/pages/resident/GeneratePass.jsx
import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

function generateOTP(){ return Math.floor(100000 + Math.random()*900000).toString(); }

export default function GeneratePass(){
  const onLogout = ()=> { localStorage.removeItem("role"); window.location.href = "/"; };
  const [visitor, setVisitor] = useState({ name:"", phone:"" });
  const [result, setResult] = useState(null);

  const create = (e) => {
    e.preventDefault();
    const otp = generateOTP();
    // mock QR data (in real app server returns image/base64)
    const qr = `QR: visitor=${visitor.name}|phone=${visitor.phone}|otp=${otp}`;
    setResult({ otp, qr, expires: new Date(Date.now()+2*60*60*1000).toISOString() });
  };

  return (
    <div className="app-grid">
      <Sidebar role="resident" />
      <div>
        <Topbar title="Generate Pass" onLogout={onLogout} />
        <main className="main">
          <div className="panel">
            <h3 style={{marginTop:0}}>Generate OTP / QR for visitor</h3>
            <form onSubmit={create} style={{display:"grid", gap:12, marginTop:12}}>
              <input className="input" placeholder="Visitor name" value={visitor.name} onChange={e=>setVisitor({...visitor,name:e.target.value})} />
              <input className="input" placeholder="Visitor phone" value={visitor.phone} onChange={e=>setVisitor({...visitor,phone:e.target.value})} />
              <div style={{display:"flex", gap:10}}>
                <button type="button" className="btn" onClick={()=>{ setVisitor({name:"",phone:""}); setResult(null); }}>Reset</button>
                <button className="btn primary" type="submit">Generate</button>
              </div>
            </form>

            {result && (
              <div style={{marginTop:16}}>
                <div className="panel">
                  <div style={{display:"flex", gap:16, alignItems:"center"}}>
                    <div style={{width:140, height:140}} className="placeholder">QR (mock)</div>
                    <div>
                      <div className="kpi">OTP: {result.otp}</div>
                      <div className="kpi-sub">Expires: {new Date(result.expires).toLocaleString()}</div>
                      <div style={{marginTop:8}}>
                        <button className="btn primary" onClick={()=>alert("Sent to visitor (mock)")}>Send to Visitor</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
