// client/src/pages/guard/ManualCheck.jsx
import React, { useState } from "react";
import Table from "../../components/Table";

export default function ManualCheck(){
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [arrivalTime, setArrivalTime] = useState("");
  // Dummy visitor details, replace with actual data from backend
  const visitorDetails = {
    name: "Jane Doe",
    email: "janedoe@email.com",
    phone: "1234567890",
    purpose: "Visit Resident"
  };
  const rows = [
    ["824193","Jane Doe","House 3B","IN","09:30"],
    ["000111","Mike","Villa 8","OUT","10:00"]
  ];

  const handleValidate = () => {
    setShowForm(true);
  };
  const handleSave = (e) => {
    e.preventDefault();
    // Save logic here
    alert("Saved!");
    setShowForm(false);
    setQuery("");
    setArrivalTime("");
  };

  return (
    <>
      <div className="panel">
        <h3 style={{marginTop:0}}>Validate OTP / Search Visitor</h3>
        {!showForm ? (
          <div style={{maxWidth:400, display:'flex', alignItems:'center', gap:10, width:'100%'}}>
            <input className="input" placeholder="Enter OTP or phone/ID" value={query} onChange={e=>setQuery(e.target.value)} style={{width:'70%', height:'40px'}} />
            <button className="btn primary" onClick={handleValidate} style={{height:'40px', width:'30%', display:'flex', alignItems:'center', justifyContent:'center', marginTop:'-10px'}}>Validate</button>
          </div>
        ) : (
          <form className="panel" style={{maxWidth:400, marginTop:20}} onSubmit={handleSave}>
            <h3>Visitor Details</h3>
            <div>Name: {visitorDetails.name}</div>
            <div>Email: {visitorDetails.email}</div>
            <div>Phone: {visitorDetails.phone}</div>
            <div>Purpose: {visitorDetails.purpose}</div>
            <div style={{marginTop:10}}>
              <label>Arrival Time:</label>
              <input type="time" style={{width:'100%', marginTop:5}} value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} />
            </div>
            <button type="submit" className="btn primary" style={{marginTop:15}}>Save</button>
          </form>
        )}
      </div>

      <h3 style={{marginTop:16}}>Recent</h3>
      <Table headers={["OTP","Visitor","Resident","Status","Time"]} rows={rows} />
    </>
  );
}
