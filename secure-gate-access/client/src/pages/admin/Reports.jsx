// client/src/pages/admin/Reports.jsx
export default function Reports(){
  return (
    <>
      <div className="grid two">
        <div className="panel">
          <h3 style={{marginTop:0}}>Visitors per Day</h3>
          <div className="placeholder">Chart placeholder</div>
        </div>
        <div className="panel">
          <h3 style={{marginTop:0}}>Peak Hours</h3>
          <div className="placeholder">Chart placeholder</div>
        </div>
      </div>

      <div className="panel" style={{marginTop:16}}>
        <h3 style={{marginTop:0}}>Export</h3>
        <div style={{display:"flex", gap:10}}>
          <button className="btn">Export CSV</button>
          <button className="btn">Export PDF</button>
        </div>
      </div>
    </>
  );
}
