// client/src/pages/resident/AddVisitor.jsx
import React, { useState } from "react";

export default function AddVisitor() {
  const [form, setForm] = useState({ name:"", phone:"", idNumber:"", vehicle:"", datetime:"", purpose:"" });

  const submit = (e) => {
    e.preventDefault();
    // TODO: call backend to create visitor & generate OTP/QR
    alert("Visitor created (mock). Use Generate Pass to create OTP/QR.");
    setForm({ name:"", phone:"", idNumber:"", vehicle:"", datetime:"", purpose:"" });
  };

  return (
    <div className="panel">
      <h3 style={{marginTop:0}}>Register Visitor</h3>
      <form onSubmit={submit} style={{display:"grid", gap:12, marginTop:12}}>
        <input className="input" placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <input className="input" placeholder="Phone (07xx)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
        <input className="input" placeholder="ID/Passport" value={form.idNumber} onChange={e=>setForm({...form,idNumber:e.target.value})} />
        <input className="input" placeholder="Vehicle registration (optional)" value={form.vehicle} onChange={e=>setForm({...form,vehicle:e.target.value})} />
        <input className="input" type="datetime-local" value={form.datetime} onChange={e=>setForm({...form,datetime:e.target.value})} />
        <input className="input" placeholder="Purpose (eg. visit, delivery)" value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})} />
        <div style={{display:"flex", gap:10}}>
          <button type="button" className="btn" onClick={()=>setForm({ name:"", phone:"", idNumber:"", vehicle:"", datetime:"", purpose:"" })}>Clear</button>
          <button type="submit" className="btn primary">Save & Send</button>
        </div>
      </form>
    </div>
  );
}
