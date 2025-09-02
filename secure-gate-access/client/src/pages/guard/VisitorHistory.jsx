import React from "react";
import Table from "../../components/Table";

export default function VisitorHistory() {
  const rows = [
    ["Jane Doe","House 3B","10:05","","Pending"],
    ["Mike Otieno","Villa 8","09:30","10:00","Out"],
  ];
  return (
    <div className="panel">
      <h3>Visitor History</h3>
      <Table headers={["Visitor","Resident","In","Out","Status"]} rows={rows} />
    </div>
  );
}
