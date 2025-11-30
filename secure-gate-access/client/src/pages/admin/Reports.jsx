// client/src/pages/admin/Reports.jsx
import React from 'react';

export default function Reports(){
  const params = new URLSearchParams(window.location.search);
  const [from, setFrom] = React.useState(params.get('from') || '');
  const [to, setTo] = React.useState(params.get('to') || '');
  const [status, setStatus] = React.useState(params.get('status') || '');
  const [host, setHost] = React.useState(params.get('host') || '');
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [aggregates, setAggregates] = React.useState({ counts: {}, dailyTotals: [], hostSummary: [], config: { hostFilterEnabled: true } });
  const [hostSortDir, setHostSortDir] = React.useState('desc'); // asc|desc
  const hostFilterEnabled = Boolean(aggregates?.config?.hostFilterEnabled ?? true);
  const showHostFilter = React.useMemo(() => hostFilterEnabled && (Boolean(host) || ((aggregates.hostSummary||[]).length > 0)), [host, aggregates, hostFilterEnabled]);

  const buildQuery = () => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (status) q.set('status', status);
    if (host) q.set('host', host);
    return q.toString();
  };

  const exportCsv = () => {
    const q = buildQuery();
    window.location.href = `/api/visitors/reports?${q}&format=csv`;
  };
  const exportJson = async () => {
    const q = buildQuery();
  const res = await fetch(`/api/visitors/reports?${q}&format=json`, { 
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'visitors.json'; a.click(); URL.revokeObjectURL(url);
  };

  const refreshPreview = async () => {
    try{
      setLoading(true); setError('');
      const q = buildQuery();
      const headers = { 'Content-Type': 'application/json' };
      const [resRows, resAgg] = await Promise.all([
        fetch(`/api/visitors/reports?${q}&format=json`, { credentials: 'include', headers }),
        fetch(`/api/visitors/reports?${q}&mode=aggregates`, { credentials: 'include', headers })
      ]);
      const [jsonRows, jsonAgg] = await Promise.all([resRows.json(), resAgg.json()]);
      if(!jsonRows.success) throw new Error(jsonRows.error||'Failed');
      if(!jsonAgg.success) throw new Error(jsonAgg.error||'Failed aggregates');
      setRows(jsonRows.data||[]);
  setAggregates(jsonAgg.data||{ counts:{}, dailyTotals:[], hostSummary:[], config: { hostFilterEnabled: true } });
    }catch(e){ setError(e.message);} finally{ setLoading(false); }
  };

  React.useEffect(()=>{ refreshPreview(); },[]);

  return (
    <>
      <div className="grid two">
        <div className="panel">
          <h3 style={{marginTop:0}}>Overview</h3>
          <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
            <Badge label="CONFIRMED" value={aggregates.counts?.CONFIRMED||0} color="#3b82f6" />
            <Badge label="ON_PREMISE" value={aggregates.counts?.ON_PREMISE||0} color="#10b981" />
            <Badge label="EXITED" value={aggregates.counts?.EXITED||0} color="#6b7280" />
            <Badge label="REVOKED" value={aggregates.counts?.REVOKED||0} color="#ef4444" />
          </div>
          <div style={{marginTop:12}}>
            <h4 style={{margin:'12px 0 6px'}}>Visitors per Day</h4>
            <div data-testid="daily-chart" style={{display:'grid', gap:6, maxHeight:220, overflowY:'auto'}}>
              {(() => {
                const rows = aggregates.dailyTotals||[];
                const max = Math.max(1, ...rows.map(r=>Number(r.total)||0));
                return rows.map(r => (
                  <div key={r.date || r.day} style={{display:'flex', alignItems:'center', gap:8}}>
                    <div style={{width:100, fontSize:12, color:'#6b7280'}}>{r.date || r.day}</div>
                    <div style={{background:'#e5e7eb', borderRadius:6, height:10, width:'100%', position:'relative'}}>
                      <div style={{background:'#3b82f6', height:'100%', borderRadius:6, width: `${Math.round(((Number(r.total)||0)/max)*100)}%`}} />
                    </div>
                    <div style={{width:36, textAlign:'right', fontVariantNumeric:'tabular-nums'}}>{r.total}</div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
        <div className="panel">
          <h3 style={{marginTop:0}}>Top Hosts (PII-safe)</h3>
          <div style={{maxHeight:260, overflowY:'auto'}}>
            <table className="table" style={{borderCollapse:'separate', borderSpacing:0}}>
              <thead>
                <tr>
                  <th>Host</th>
                  <th>
                    <button data-testid="sort-host-total" className="btn" style={{padding:'2px 8px'}} onClick={()=> setHostSortDir(d=>d==='desc'?'asc':'desc')}>
                      Invites {hostSortDir==='desc'?'▼':'▲'}
                    </button>
                  </th>
                  <th>On Premise</th><th>Exited</th><th>Revoked</th>
                </tr>
              </thead>
              <tbody>
                {[...(aggregates.hostSummary||[])].sort((a,b)=> hostSortDir==='desc' ? (b.total||0)-(a.total||0) : (a.total||0)-(b.total||0)).map((h,i)=>(
                  <tr key={i}>
                    <td>{h.host||'-'}</td>
                    <td>{h.total||0}</td>
                    <td>{h.on_premise||0}</td>
                    <td>{h.exited||0}</td>
                    <td>{h.revoked||0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel" style={{marginTop:16}}>
        <h3 style={{marginTop:0}}>Export</h3>
        <div style={{display:"flex", gap:10, marginBottom:10, alignItems:'center', flexWrap:'wrap'}}>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} />
          {showHostFilter && (<input placeholder="Host email" value={host} onChange={e=>setHost(e.target.value)} />)}
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">Any status</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="ON_PREMISE">ON_PREMISE</option>
            <option value="EXITED">EXITED</option>
            <option value="REVOKED">REVOKED</option>
          </select>
          <button className="btn" onClick={refreshPreview} disabled={loading}>{loading? 'Refreshing...' : 'Preview'}</button>
        </div>
        <div style={{display:"flex", gap:10}}>
          <button className="btn" onClick={exportCsv}>Export CSV</button>
          <button className="btn" onClick={exportJson}>Export JSON</button>
        </div>
        {error && <div className="alert" style={{marginTop:8}}>{error}</div>}
        <div style={{marginTop:12, overflowX:'auto'}}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Phone</th><th>Email</th><th>Host</th><th>Status</th><th>Date</th><th>Time</th><th>In</th><th>Out</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.id}</td><td>{r.name||''}</td><td>{r.phone||''}</td><td>{r.email||''}</td><td>{r.host||''}</td><td>{r.status||''}</td><td>{r.date_of_visit||''}</td><td>{r.time_of_visit||''}</td><td>{r.check_in_time||''}</td><td>{r.check_out_time||''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Badge({ label, value, color }){
  return (
    <div style={{background:color, color:'#fff', padding:'8px 12px', borderRadius:8, minWidth:120, display:'inline-flex', alignItems:'center', justifyContent:'space-between'}}>
      <span style={{fontSize:12, opacity:0.9}}>{label}</span>
      <span style={{fontWeight:700}}>{value}</span>
    </div>
  );
}
