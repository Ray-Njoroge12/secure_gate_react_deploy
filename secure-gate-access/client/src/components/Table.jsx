// client/src/components/Table.jsx
import React from "react";

export default function Table({ headers = [], rows = [] }) {
  return (
    <div className="panel">
      <table className="table">
        <thead>
          <tr>{headers.map((h,i)=> <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={headers.length} style={{textAlign:"center", padding:20}}>No data</td></tr>
          )}
          {rows.map((r,ri)=> (
            <tr key={ri}>
              {r.map((c,ci)=> <td key={ci}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
