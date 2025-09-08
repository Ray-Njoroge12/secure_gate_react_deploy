import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { bulkInvite } from "../../services/passService";

export default function BulkInvite() {
  const onLogout = ()=> { localStorage.removeItem("role"); window.location.href = "/"; };
  const [form, setForm] = useState({
    eventName: "",
    date: "",
    time: "",
    numGuests: 5
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const validateForm = () => {
    if (!form.eventName.trim()) return 'Event name is required';
    if (!form.date.trim()) return 'Date is required';
    if (!form.time.trim()) return 'Time is required';
    if (form.numGuests < 1) return 'Number of guests must be at least 1';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await bulkInvite({
        eventName: form.eventName.trim(),
        date: form.date.trim(),
        time: form.time.trim(),
        numGuests: form.numGuests
      });
      setResult(response);
    } catch (err) {
      console.error('Bulk invite failed:', err);
      setError(err.message || 'Bulk invitation failed');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setForm({
      eventName: "",
      date: "",
      time: "",
      numGuests: 5
    });
    setError('');
    setResult(null);
  };

  return (
    <div className="app-grid">
      <Sidebar role="resident" />
      <div>
        <Topbar title="Bulk Invite" onLogout={onLogout} />
        <main className="main">
          <div className="panel">
            <h3 style={{marginTop:0}}>Bulk Visitor Invitation</h3>
            <p style={{color: '#666', marginBottom: 16}}>
              Create a bulk invitation for multiple guests. Guests will use the shared link to register their personal details and generate individual QR codes.
            </p>

            {error && (
              <div style={{color: 'red', marginBottom: 16, padding: 12, backgroundColor: '#ffeaea', borderRadius: 4, whiteSpace: 'pre-line'}}>
                {error}
              </div>
            )}

            {result && (
              <div style={{marginBottom: 16, padding: 12, backgroundColor: '#eafaea', borderRadius: 4}}>
                <h4 style={{margin: 0, color: 'green'}}>Bulk Invitation Created!</h4>
                <div style={{marginTop: 8, fontSize: '14px'}}>
                  Event: {result.eventName} | Date: {result.date} | Time: {result.time} | Max Guests: {result.numGuests}
                </div>
                <div style={{marginTop: 12}}>
                  <div style={{fontSize: '14px', fontWeight: 'bold'}}>Share this link with your guests:</div>
                  <input
                    type="text"
                    value={result.inviteLink}
                    readOnly
                    style={{width: '100%', padding: '8px', marginTop: 4, border: '1px solid #ddd', borderRadius: 4, fontSize: '12px'}}
                    onClick={e => e.target.select()}
                  />
                  <div style={{marginTop: 8, fontSize: '12px', color: '#666'}}>
                    Expires: {new Date(result.expiresAt).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{display:"grid", gap:12, marginTop:12}}>
              <input
                className="input"
                placeholder="Event Name/Purpose *"
                value={form.eventName}
                onChange={e=>setForm({...form,eventName:e.target.value})}
                disabled={loading}
                required
              />
              <input
                className="input"
                type="date"
                placeholder="Date of Visit *"
                value={form.date}
                onChange={e=>setForm({...form,date:e.target.value})}
                disabled={loading}
                required
              />
              <input
                className="input"
                type="time"
                placeholder="Time of Visit *"
                value={form.time}
                onChange={e=>setForm({...form,time:e.target.value})}
                disabled={loading}
                required
              />
              <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                <label>Number of Guests:</label>
                <select 
                  value={form.numGuests} 
                  onChange={(e) => setForm({...form, numGuests: Number(e.target.value)})}
                  disabled={loading}
                  style={{padding: '4px 8px'}}
                >
                  {Array.from({ length: 50 }, (_, i) => (
                    <option key={i} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>

              <div style={{display:"flex", gap:10}}>
                <button type="button" className="btn" onClick={clearForm} disabled={loading}>
                  Clear
                </button>
                <button type="submit" className="btn primary" disabled={loading}>
                  {loading ? 'Creating Invitation...' : 'Create Bulk Invitation'}
                </button>
              </div>
            </form>



            {result && result.errors && result.errors.length > 0 && (
              <div style={{marginTop: 16}}>
                <h4 style={{color: 'red'}}>Errors</h4>
                <div style={{backgroundColor: '#ffeaea', padding: 12, borderRadius: 4}}>
                  {result.errors.map((error, i) => (
                    <div key={i} style={{fontSize: '14px'}}>
                      Guest {error.index + 1}: {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
