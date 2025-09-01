import React from "react";

export default function VisitorHistory() {
  return (
    <div className="panel">
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <input className="input" placeholder="Search visitor..." />
        <select className="select">
          <option>All</option>
          <option>Pending</option>
          <option>Checked-in</option>
          <option>Checked-out</option>
        </select>
      </div>

      <table className="table">
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Status</th><th>Check-in</th><th>Check-out</th></tr>
        </thead>
        <tbody>
          <tr><td>Jane Doe</td><td>0700 123 456</td><td>Checked-out</td><td>10:10</td><td>11:00</td></tr>
          <tr><td>John K.</td><td>0712 000 111</td><td>Checked-in</td><td>16:05</td><td>-</td></tr>
        </tbody>
      </table>
    </div>
  );
}
