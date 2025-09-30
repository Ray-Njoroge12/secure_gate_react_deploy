import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";
import ManualCheck from "./ManualCheck";
import ScanQR from "./ScanQR";
import Settings from "./Settings";
import VisitorHistory from "./VisitorHistory";

export default function GuardDashboard() {
  const onLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };
  const location = useLocation();
  const role = localStorage.getItem('role') || 'guard';
  const [active, setActive] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [toastFilter, setToastFilter] = useState(()=> localStorage.getItem('toastFilter') || 'all'); // all|info|warning|error
  const toastRef = React.useRef(null);

  function statusChip(s){
    const color = s==='ON_PREMISE' ? '#10b981' : s==='CONFIRMED' ? '#3b82f6' : s==='EXITED' ? '#6b7280' : s==='REVOKED' ? '#ef4444' : '#9ca3af';
    return <span style={{background:color, color:'#fff', padding:'2px 8px', borderRadius:12, fontSize:12}}>{s||'-'}</span>;
  }

  async function fetchActive() {
    try {
  setLoading(true); setError("");
  const token = localStorage.getItem('token');
  const res = await fetch('/api/visitors/active', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      setActive(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchActive(); }, []);

  // Subscribe to guard SSE for live updates
  useEffect(() => {
    let es;
    try {
      es = new EventSource('/api/ws/guards', { withCredentials: false });
      const onEvt = (evt) => {
        try {
          const data = JSON.parse(evt.data||'{}');
          // Minimal toast based on severity; never show PII
          const map = {
            'visitor.check_in': 'Visitor checked in',
            'visitor.check_out': 'Visitor checked out',
            'visitor.revoked': 'Visitor revoked',
            'visitor.self_check_in': 'Visitor self check-in',
          };
          const msg = map[evt.type] || 'Event';
          const sev = (data && data.severity) || 'info';
          pushToast({ message: msg, severity: sev });
        } catch { /* ignore */ }
        fetchActive();
      };
      es.addEventListener('visitor.check_in', onEvt);
      es.addEventListener('visitor.check_out', onEvt);
      es.addEventListener('visitor.revoked', onEvt);
      es.addEventListener('visitor.self_check_in', onEvt);
    } catch {}
    return () => { try { es && es.close(); } catch {} };
  }, []);

  // Persist toast filter and auto-scroll to newest
  useEffect(() => { try { localStorage.setItem('toastFilter', toastFilter); } catch {} }, [toastFilter]);
  useEffect(() => {
    try { toastRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' }); } catch {}
  }, [toasts]);

  function pushToast(t){
    const id = Math.random().toString(36).slice(2);
    const item = { id, ...t };
    setToasts((prev)=>[item, ...prev].slice(0,5));
    // Auto-remove after 4s
    setTimeout(()=>{
      setToasts((prev)=>prev.filter(x=>x.id!==id));
    }, 4000);
  }

  async function postAction(id, action) {
  const url = `/api/visitors/${id}/${action}`;
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(url, { method: 'POST', headers });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Action failed');
    await fetchActive();
    return json;
  }

  const onCheckIn = async (id) => { try { const r = await postAction(id, 'check-in'); if(r?.data?.already_checked_in){ /* no-op */ } } catch(e){ alert(e.message); } };
  const onCheckOut = async (id) => { try { const r = await postAction(id, 'check-out'); if(r?.data?.already_checked_out){ /* no-op */ } } catch(e){ alert(e.message); } };
  const onRevoke = async (id) => { if (!confirm('Revoke this visitor?')) return; try { await postAction(id, 'revoke'); } catch(e){ alert(e.message); } };

  let panel = (
    <>
      {/* Live toasts (severity-based) */}
  <div data-testid="toasts" ref={toastRef} style={{position:'fixed', top:72, right:16, display:'flex', flexDirection:'column', gap:8, zIndex:50, maxWidth:360, maxHeight:300, overflowY:'auto'}}>
        <div style={{display:'flex', gap:6, justifyContent:'flex-end', marginBottom:2}}>
          {['all','info','warning','error'].map(f => (
            <button key={f} className="btn" style={{padding:'2px 8px', fontSize:12, opacity: toastFilter===f?1:0.7}} onClick={()=>setToastFilter(f)}>{f.toUpperCase()}</button>
          ))}
          <span aria-label="visible-toasts" style={{marginLeft:6, fontSize:12, background:'#111827', color:'#fff', borderRadius:10, padding:'2px 6px'}}>
            {toasts.filter(t => toastFilter==='all' || t.severity===toastFilter).length}
          </span>
        </div>
        {toasts.filter(t => toastFilter==='all' || t.severity===toastFilter).map(t => (
          <Toast key={t.id} severity={t.severity} message={t.message} />
        ))}
      </div>

      <h3>Quick Actions</h3>
      <div style={{display:"flex", gap:10, marginBottom:12}}>
        <a href="/dashboard/guard/ScanQR"><button className="btn">Open Scanner</button></a>
        <a href="/dashboard/guard/ManualCheck"><button className="btn">Manual Check</button></a>
      </div>
      <AggBadges active={active} />
      <h3>Active Visitors</h3>
      {error && <div className="alert">{error}</div>}
      <Table headers={["Visitor","Host","In","Out","Status","Actions"]} rows={active.map(v => [
        (v.name||`#${v.id}`),
        (v.host?mask(v.host):'-'), ''+(v.check_in_time||''), ''+(v.check_out_time||''), statusChip(v.status),
        ((['guard','admin'].includes(role)) ? (
          <div style={{display:'flex', gap:8}}>
            <button className="btn" onClick={()=>onCheckIn(v.id)} disabled={v.status!=='CONFIRMED'}>Check-in</button>
            <button className="btn" onClick={()=>onCheckOut(v.id)} disabled={!(v.status==='ON_PREMISE' || (v.check_in_time && !v.check_out_time))}>Check-out</button>
            <button className="btn danger" onClick={()=>onRevoke(v.id)} disabled={v.status==='REVOKED'}>Revoke</button>
          </div>
        ) : null)
      ])} />
      <div style={{marginTop:8}}>
        <button className="btn" onClick={fetchActive} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
      </div>
    </>
  );
  if (location.pathname === "/dashboard/guard/ManualCheck" || location.pathname === "/dashboard/guard/manual-check") panel = <ManualCheck />;
  else if (location.pathname === "/dashboard/guard/ScanQR" || location.pathname === "/dashboard/guard/scanner") panel = <ScanQR />;
  else if (location.pathname === "/dashboard/guard/Settings" || location.pathname === "/dashboard/guard/settings") panel = <Settings />;
  else if (location.pathname === "/dashboard/guard/VisitorHistory" || location.pathname === "/dashboard/guard/history") panel = <VisitorHistory />;

  return (
    <div className="app-grid">
      <Sidebar role={localStorage.getItem('role')} />
      <div>
        <Topbar title="Guard Station" onLogout={onLogout} />
        <main className="main">
          {panel}
        </main>
      </div>
    </div>
  );
}

function mask(value){
  if(!value) return '';
  if(String(value).includes('@')) return `${value[0]}***${value.slice(-1)}`;
  const d=String(value).replace(/\D+/g,'');
  return d.length>=4?`${d.slice(0,2)}***${d.slice(-2)}`:'***';
}

function Toast({ severity, message }){
  const colors = { info:'#2563eb', warning:'#f59e0b', error:'#dc2626' };
  const bg = colors[severity] || '#374151';
  return (
    <div data-testid="toast" style={{background:bg, color:'#fff', padding:'12px 14px', borderRadius:10, minWidth:260, boxShadow:'0 6px 18px rgba(0,0,0,0.25)'}}>
      <div data-testid="toast-title" style={{fontWeight:700, fontSize:13, opacity:0.95, marginBottom:4, letterSpacing:0.3}}>{severity?.toUpperCase?.()||'INFO'}</div>
      <div style={{fontSize:14}}>{message}</div>
    </div>
  );
}

function AggBadges({ active }){
  const agg = useMemo(()=>{
    const counts = { CONFIRMED:0, ON_PREMISE:0, EXITED:0, REVOKED:0 };
    (active||[]).forEach(v => { counts[v.status] = (counts[v.status]||0)+1; });
    return counts;
  }, [active]);
  return (
    <div style={{display:'flex', gap:12, flexWrap:'wrap', margin:'8px 0 16px'}}>
      <Badge label="CONFIRMED" value={agg.CONFIRMED} color="#3b82f6" />
      <Badge label="ON_PREMISE" value={agg.ON_PREMISE} color="#10b981" />
      <Badge label="EXITED" value={agg.EXITED} color="#6b7280" />
      <Badge label="REVOKED" value={agg.REVOKED} color="#ef4444" />
    </div>
  );
}

function Badge({ label, value, color }){
  return (
    <div style={{background:color, color:'#fff', padding:'8px 12px', borderRadius:10, minWidth:120, display:'inline-flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 10px rgba(0,0,0,0.12)'}}>
      <span style={{fontSize:12, opacity:0.95}}>{label}</span>
      <span style={{fontWeight:800}}>{value}</span>
    </div>
  );
}
