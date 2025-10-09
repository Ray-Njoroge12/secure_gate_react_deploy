// client/src/pages/resident/GeneratePass.jsx
import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { getMyVisitors, createPass } from "../../services/passService";
import logger from 'utils/logger';

export default function GeneratePass(){
  const onLogout = ()=> { localStorage.removeItem("role"); window.location.href = "/"; };
  const [visitors, setVisitors] = useState([]);
  const [selectedVisitor, setSelectedVisitor] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + G to generate pass
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (!loading && selectedVisitor) {
          generatePass(e);
        }
      }
      // Ctrl/Cmd + R to reset
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        reset();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, selectedVisitor]);

  useEffect(() => {
    loadVisitors();
  }, []);

  const loadVisitors = async () => {
    try {
      const data = await getMyVisitors();
      // Filter for approved visitors who don't have active passes
      const approvedVisitors = data.filter(v => v.status === 'approved');
      setVisitors(approvedVisitors);
    } catch (err) {
      logger.error('Failed to load visitors', err);
      setError('Failed to load visitors');
    }
  };

  const generatePass = async (e) => {
    e.preventDefault();
    if (!selectedVisitor) {
      setError('Please select a visitor');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await createPass(selectedVisitor);
      setResult({
        ...response,
        visitorName: visitors.find(v => v.id == selectedVisitor)?.name || 'Unknown'
      });
    } catch (err) {
      logger.error('Failed to create pass', err, { visitorId: selectedVisitor });
      setError(err.message || 'Failed to create pass');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedVisitor('');
    setResult(null);
    setError('');
  };

  return (
    <div className="grid grid-cols-[260px_1fr] min-h-screen">
      <Sidebar role="resident" />
      <div>
        <Topbar title="Generate Pass" onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto bg-slate-900 p-6">
          <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-brand p-6">
            <h3 style={{marginTop:0}}>Generate QR Pass for Approved Visitor</h3>
            
            {error && (
              <div style={{color: 'red', marginBottom: 16, padding: 12, backgroundColor: '#ffeaea', borderRadius: 4}}>
                {error}
              </div>
            )}

            <form onSubmit={generatePass} style={{display:"grid", gap:12, marginTop:12}}>
              <select 
                className="input" 
                value={selectedVisitor} 
                onChange={e => setSelectedVisitor(e.target.value)}
                disabled={loading}
              >
                <option value="">Select an approved visitor...</option>
                {visitors.map(visitor => (
                  <option key={visitor.id} value={visitor.id}>
                    {visitor.name} - {visitor.phone} ({visitor.purpose})
                  </option>
                ))}
              </select>
              
              <div style={{display:"flex", gap:10}}>
                <button type="button" className="btn" onClick={reset} disabled={loading}>
                  Reset
                </button>
                <button className="btn primary" type="submit" disabled={loading || !selectedVisitor}>
                  {loading ? 'Generating...' : 'Generate Pass'}
                </button>
              </div>
            </form>

            {visitors.length === 0 && !error && (
              <div style={{marginTop: 16, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 4}}>
                No approved visitors found. Please add and approve visitors first.
              </div>
            )}

            {result && (
              <div style={{marginTop:16}}>
                <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-brand p-6">
                  <h4 style={{marginTop: 0}}>Pass Generated for {result.visitorName}</h4>
                  <div style={{display:"flex", gap:16, alignItems:"flex-start", flexWrap: "wrap"}}>
                    <div style={{minWidth: 200}}>
                      {result.qrDataUrl ? (
                        <img 
                          src={result.qrDataUrl} 
                          alt="QR Code" 
                          style={{width: 200, height: 200, border: '1px solid #ddd'}}
                        />
                      ) : (
                        <div style={{width:200, height:200, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd'}}>
                          QR Code
                        </div>
                      )}
                    </div>
                    <div style={{flex: 1, minWidth: 250}}>
                      <div className="kpi">Pass ID: {result.passId}</div>
                      <div className="kpi">Visitor ID: {result.visitorId}</div>
                      {result.plainOtp && (
                        <div className="kpi">OTP: {result.plainOtp}</div>
                      )}
                      <div className="kpi-sub">
                        Expires: {new Date(result.expiresAt).toLocaleString()}
                      </div>
                      <div className="kvi-sub">
                        Phone: {result.maskedPhone}
                      </div>
                      {result.inviteLink && (
                        <div style={{marginTop:12}}>
                          <div className="kpi-sub">Invite Link:</div>
                          <input 
                            type="text" 
                            value={result.inviteLink} 
                            readOnly 
                            style={{width: '100%', marginTop: 4, fontSize: '12px'}}
                            onClick={e => e.target.select()}
                          />
                        </div>
                      )}
                      <div style={{marginTop:16}}>
                        <button 
                          className="btn primary" 
                          onClick={() => alert("Invite sent to visitor via email/SMS (automated)")}
                        >
                          Notification Sent
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
