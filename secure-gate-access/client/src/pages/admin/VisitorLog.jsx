// client/src/pages/admin/VisitorLog.jsx
import React from "react";
import Table from "../../components/Table";

export default function VisitorLog(){
  const rows = [
    ["Jane Doe","House 3B","QR","2025-08-31 09:30","IN"],
    ["Mike P","Villa 8","OTP","2025-08-31 10:00","OUT"],
  ];

  return (
    <div className="panel">
      <h3 style={{marginTop:0}}>Visitor Log</h3>
      <Table headers={["Visitor","Resident","Method","Time","Status"]} rows={rows} />
    </div>
  );
}
