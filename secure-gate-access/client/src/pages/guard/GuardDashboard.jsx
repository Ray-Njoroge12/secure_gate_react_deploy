import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import { Card, Button, Badge } from "../../components/ui";
import Table from "../../components/Table";
import ManualCheck from "./ManualCheck";
import ScanQR from "./ScanQR";
import Settings from "./Settings";
import VisitorHistory from "./VisitorHistory";
import notificationService from "../../services/notificationService";

export default function GuardDashboard() {
  const onLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'guard';
  const [active, setActive] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [toastFilter, setToastFilter] = useState(()=> localStorage.getItem('toastFilter') || 'all'); // all|info|warning|error
  const toastRef = React.useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to scan QR
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        navigate('/dashboard/guard/scan-qr');
      }
      // Ctrl/Cmd + M to manual check
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        navigate('/dashboard/guard/manual-check');
      }
      // Ctrl/Cmd + R to refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (!loading) {
          fetchActiveVisitors();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, navigate]);

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

  const onCheckIn = async (id) => { 
    try { 
      const r = await postAction(id, 'check-in'); 
      if(r?.data?.already_checked_in){ 
        notificationService.warning('Already Checked In', 'Visitor is already checked in');
      } else {
        notificationService.success('Check-in Successful', `Visitor ${id} has been checked in`);
        fetchActive(); // Refresh the list
      }
    } catch(e){ 
      notificationService.error('Check-in Failed', e.message);
    } 
  };
  
  const onCheckOut = async (id) => { 
    try { 
      const r = await postAction(id, 'check-out'); 
      if(r?.data?.already_checked_out){ 
        notificationService.warning('Already Checked Out', 'Visitor is already checked out');
      } else {
        notificationService.success('Check-out Successful', `Visitor ${id} has been checked out`);
        fetchActive(); // Refresh the list
      }
    } catch(e){ 
      notificationService.error('Check-out Failed', e.message);
    } 
  };
  
  const onRevoke = async (id) => { 
    if (!confirm('Revoke this visitor?')) return; 
    try { 
      await postAction(id, 'revoke');
      notificationService.warning('Visitor Revoked', `Visitor ${id} has been revoked`);
      fetchActive(); // Refresh the list
    } catch(e){ 
      notificationService.error('Revoke Failed', e.message);
    } 
  };

  let panel = (
    <div className="space-y-6">
      {/* Live toasts (severity-based) */}
      <div data-testid="toasts" ref={toastRef} className="fixed top-16 right-4 flex flex-col gap-2 z-50 max-w-sm max-h-80 overflow-y-auto">
        <div className="flex gap-2 justify-end mb-1">
          {['all','info','warning','error'].map(f => (
            <button key={f} className="min-h-[44px] min-w-[44px] text-xs px-3 py-2 rounded opacity-70 hover:opacity-100 bg-gray-800 text-white" 
                    style={{opacity: toastFilter===f?1:0.7}} onClick={()=>setToastFilter(f)}>
              {f.toUpperCase()}
            </button>
          ))}
          <span aria-label="visible-toasts" className="ml-2 text-xs bg-gray-800 text-white rounded-full px-2 py-1">
            {toasts.filter(t => toastFilter==='all' || t.severity===toastFilter).length}
          </span>
        </div>
        {toasts.filter(t => toastFilter==='all' || t.severity===toastFilter).map(t => (
          <Toast key={t.id} severity={t.severity} message={t.message} />
        ))}
      </div>

      {/* Quick Actions - Mobile First */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <QuickActionTile
          href="/dashboard/guard/ScanQR"
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 16h4m-4 0h4m-4 0v4m-4-4h4m-4 0h4" />
            </svg>
          }
          title="Scan QR"
          subtitle="Quick check-in"
          color="bg-blue-500"
        />
        <QuickActionTile
          href="/dashboard/guard/ManualCheck"
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          }
          title="Manual Check"
          subtitle="ID verification"
          color="bg-green-500"
        />
      </div>

      {/* Status Overview */}
      <Card>
        <Card.Header>
          <Card.Title>Visitor Status</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusBadge label="Confirmed" value={getStatusCount('CONFIRMED')} color="text-blue-600 bg-blue-50" />
            <StatusBadge label="On Premise" value={getStatusCount('ON_PREMISE')} color="text-green-600 bg-green-50" />
            <StatusBadge label="Exited" value={getStatusCount('EXITED')} color="text-gray-600 bg-gray-50" />
            <StatusBadge label="Revoked" value={getStatusCount('REVOKED')} color="text-red-600 bg-red-50" />
          </div>
        </Card.Content>
      </Card>

      {/* Active Visitors - Mobile Optimized */}
      <Card>
        <Card.Header className="flex flex-row items-center justify-between">
          <Card.Title>Active Visitors</Card.Title>
          <Button variant="outline" size="sm" onClick={fetchActive} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Card.Header>
        <Card.Content>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">{error}</div>}
          
          <div className="md:hidden">
            {/* Mobile Cards */}
            {active.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>No active visitors</p>
              </div>
            ) : (
              <div className="space-y-3">
                {active.map(v => (
                  <VisitorCard key={v.id} visitor={v} onCheckIn={onCheckIn} onCheckOut={onCheckOut} onRevoke={onRevoke} role={role} />
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:block">
            {/* Desktop Table */}
            <Table 
              headers={["Visitor","Host","In","Out","Status","Actions"]} 
              rows={active.map(v => [
                (v.name||`#${v.id}`),
                (v.host?mask(v.host):'-'), 
                ''+(v.check_in_time||''), 
                ''+(v.check_out_time||''), 
                statusChip(v.status),
                ((['guard','admin'].includes(role)) ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={()=>onCheckIn(v.id)} disabled={v.status!=='CONFIRMED'}>Check-in</Button>
                    <Button size="sm" onClick={()=>onCheckOut(v.id)} disabled={!(v.status==='ON_PREMISE' || (v.check_in_time && !v.check_out_time))}>Check-out</Button>
                    <Button size="sm" variant="destructive" onClick={()=>onRevoke(v.id)} disabled={v.status==='REVOKED'}>Revoke</Button>
                  </div>
                ) : null)
              ])} 
              mobileCardView={false}
            />
          </div>
        </Card.Content>
      </Card>
    </div>
  );

  function getStatusCount(status) {
    return active.filter(v => v.status === status).length;
  }
  if (location.pathname === "/dashboard/guard/ManualCheck" || location.pathname === "/dashboard/guard/manual-check") panel = <ManualCheck />;
  else if (location.pathname === "/dashboard/guard/ScanQR" || location.pathname === "/dashboard/guard/scanner") panel = <ScanQR />;
  else if (location.pathname === "/dashboard/guard/Settings" || location.pathname === "/dashboard/guard/settings") panel = <Settings />;
  else if (location.pathname === "/dashboard/guard/VisitorHistory" || location.pathname === "/dashboard/guard/history") panel = <VisitorHistory />;

  return (
    <AppShell role={localStorage.getItem('role')} title="Guard Station" onLogout={onLogout}>
      {panel}
    </AppShell>
  );
}

function mask(value){
  if(!value) return '';
  if(String(value).includes('@')) return `${value[0]}***${value.slice(-1)}`;
  const d=String(value).replace(/\D+/g,'');
  return d.length>=4?`${d.slice(0,2)}***${d.slice(-2)}`:'***';
}

// Mobile-First Components
function QuickActionTile({ href, icon, title, subtitle, color }) {
  return (
    <div 
      onClick={() => window.location.href = href}
      className="cursor-pointer"
    >
      <div className={`${color} text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200 h-full`}>
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="opacity-90">{icon}</div>
          <div className="font-semibold text-lg">{title}</div>
          <div className="text-sm opacity-80">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ label, value, color }) {
  return (
    <div className={`${color} p-3 rounded-lg text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  );
}

function VisitorCard({ visitor, onCheckIn, onCheckOut, onRevoke, role }) {
  const canCheckIn = visitor.status === 'CONFIRMED';
  const canCheckOut = visitor.status === 'ON_PREMISE' || (visitor.check_in_time && !visitor.check_out_time);
  const canRevoke = visitor.status !== 'REVOKED';

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium text-gray-900">{visitor.name || `#${visitor.id}`}</div>
          <div className="text-sm text-gray-500">Host: {visitor.host ? mask(visitor.host) : '-'}</div>
        </div>
        <div className="flex-shrink-0">
          {statusChip(visitor.status)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div>In: {visitor.check_in_time || '-'}</div>
        <div>Out: {visitor.check_out_time || '-'}</div>
      </div>

      {(['guard','admin'].includes(role)) && (
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1" onClick={()=>onCheckIn(visitor.id)} disabled={!canCheckIn}>
            Check-in
          </Button>
          <Button size="sm" className="flex-1" onClick={()=>onCheckOut(visitor.id)} disabled={!canCheckOut}>
            Check-out
          </Button>
          <Button size="sm" variant="destructive" className="flex-1" onClick={()=>onRevoke(visitor.id)} disabled={!canRevoke}>
            Revoke
          </Button>
        </div>
      )}
    </div>
  );
}

function Toast({ severity, message }){
  const colors = { info:'bg-blue-600', warning:'bg-yellow-600', error:'bg-red-600' };
  const bg = colors[severity] || 'bg-gray-600';
  return (
    <div data-testid="toast" className={`${bg} text-white p-3 rounded-lg shadow-lg min-w-64`}>
      <div data-testid="toast-title" className="font-bold text-sm opacity-95 mb-1 tracking-wide">
        {severity?.toUpperCase?.()||'INFO'}
      </div>
      <div className="text-sm">{message}</div>
    </div>
  );
}
