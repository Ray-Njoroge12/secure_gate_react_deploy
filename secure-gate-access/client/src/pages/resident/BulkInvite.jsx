import React, { useState, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { bulkInvite } from "../../services/visitorService";
import { useApiForm } from "../../hooks/useApiForm";
import { ApiForm, ApiFormSubmit, ApiFormReset } from "../../components/common/ApiForm";
import { ApiResult } from "../../components/common/ApiResult";
import { Card, Button, Input, Badge } from "../../components/ui";
import { handleApiError } from "../../utils/errorMapper";

export default function BulkInvite() {
  const onLogout = ()=> { localStorage.removeItem("role"); window.location.href = "/"; };

  // CSV-related state (kept separate from form state)
  const [csvText, setCsvText] = useState("");
  const [parsedGuests, setParsedGuests] = useState([]); // [{name,email,phone}]
  const [csvErrors, setCsvErrors] = useState([]); // [{index,message}]
  const [csvInfo, setCsvInfo] = useState(""); // info/warnings (trimmed, duplicates)

  // Validation function for useApiForm
  const validateForm = useCallback((formData) => {
    const errors = {};
    if (!formData.eventName?.trim()) errors.eventName = 'Event name is required';
    if (!formData.date?.trim()) errors.date = 'Date is required';
    if (!formData.time?.trim()) errors.time = 'Time is required';
    if (!formData.numGuests || formData.numGuests < 1) errors.numGuests = 'Number of guests must be at least 1';

    // CSV validation
    if (csvText.trim().length > 0 && parsedGuests.length === 0) {
      errors.csv = 'CSV provided but no valid guests found';
    }

    return errors;
  }, [csvText, parsedGuests]);

  // Submit function for useApiForm
  const handleSubmit = useCallback(async (formData) => {
    const numGuests = csvText.trim().length > 0 ? parsedGuests.length : formData.numGuests;

    return await bulkInvite({
      eventName: formData.eventName.trim(),
      date: formData.date.trim(),
      time: formData.time.trim(),
      numGuests
    });
  }, [csvText, parsedGuests]);

  // Initialize useApiForm
  const {
    formData,
    loading,
    error,
    success,
    validationErrors,
    updateField,
    updateFields,
    resetForm,
    clearError,
    clearSuccess,
    handleSubmit: submitForm,
    setFieldError,
    getFieldValue,
    hasErrors,
    isValid
  } = useApiForm({
    submitFn: handleSubmit,
    initialFormData: {
      eventName: "",
      date: "",
      time: "",
      numGuests: 5
    },
    validateFn: validateForm,
    successAction: 'bulk_invite_created'
  });

  // Removed duplicate validateForm, handleSubmit, clearForm functions as they are handled by useApiForm

  // CSV parsing function remains unchanged
  const emailOk = (v)=> /\S+@\S+\.\S+/.test((v||"").trim());
  const phoneOk = (v)=> !v || /^0\d{9}$/.test((v||"").trim());

  function parseCsv(text) {
    const MAX = 50;
    const lines = (text || "").split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      setParsedGuests([]);
      setCsvErrors([]);
      setCsvInfo("");
      // Reset numGuests in formData using updateField
      updateField('numGuests', 5);
      return;
    }
    // Detect header
    const headerCells = lines[0].split(",").map(c => c.trim().toLowerCase());
    let startIndex = 0;
    let idxName = -1, idxEmail = -1, idxPhone = -1;
    if (["name","email","phone"].some(h => headerCells.includes(h))) {
      idxName = headerCells.indexOf("name");
      idxEmail = headerCells.indexOf("email");
      idxPhone = headerCells.indexOf("phone");
      startIndex = 1;
    }
    const errors = [];
    const seen = new Set();
    const guests = [];
    for (let i = startIndex; i < lines.length; i++) {
      const row = lines[i];
      const cells = row.split(",");
      let name = idxName >= 0 ? cells[idxName] : cells[0];
      let email = idxEmail >= 0 ? cells[idxEmail] : (cells[1] || "");
      let phone = idxPhone >= 0 ? cells[idxPhone] : (cells[2] || "");
      name = (name || "").trim();
      email = (email || "").trim();
      phone = (phone || "").trim();

      if (!name || !email) {
        errors.push({ index: i - startIndex + 1, message: "Missing required fields: name and email" });
        continue;
      }
      if (!emailOk(email)) {
        errors.push({ index: i - startIndex + 1, message: `Invalid email: ${email}` });
        continue;
      }
      if (!phoneOk(phone)) {
        errors.push({ index: i - startIndex + 1, message: `Invalid phone (expected 0xxxxxxxxx): ${phone}` });
        continue;
      }
      const key = email.toLowerCase();
      if (seen.has(key)) {
        errors.push({ index: i - startIndex + 1, message: `Duplicate email ignored: ${email}` });
        continue;
      }
      seen.add(key);
      guests.push({ name, email, phone });
    }

    let info = "";
    if (guests.length > MAX) {
      info = `Note: Trimmed ${guests.length - MAX} guests to the maximum of ${MAX}.`;
    }
    const finalGuests = guests.slice(0, MAX);
    setParsedGuests(finalGuests);
    setCsvErrors(errors);
    setCsvInfo(info);
    updateField('numGuests', finalGuests.length > 0 ? finalGuests.length : getFieldValue('numGuests'));
  }

  const handleCsvFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || "");
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
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

            {success && (
              <div style={{marginBottom: 16, padding: 12, backgroundColor: '#eafaea', borderRadius: 4}}>
                <h4 style={{margin: 0, color: 'green'}}>Bulk Invitation Created!</h4>
                <div style={{marginTop: 8, fontSize: '14px'}}>
                  Event: {(success.eventName || success.event_name)} | Date: {success.date} | Time: {success.time} | Max Guests: {(success.numGuests || success.num_guests)}
                </div>
                <div style={{marginTop: 12}}>
                  <div style={{fontSize: '14px', fontWeight: 'bold'}}>Share this link with your guests:</div>
                  <div style={{display: 'flex', gap: 8, marginTop: 4}}>
                    <input
                      type="text"
                      value={(success.inviteLink || success.invite_link)}
                      readOnly
                      style={{flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: 4, fontSize: '12px'}}
                      onClick={e => e.target.select()}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(success.inviteLink || success.invite_link);
                        alert('Link copied to clipboard!');
                      }}
                      className="btn"
                      style={{padding: '6px 12px', fontSize: '12px'}}
                    >
                      Copy Link
                    </button>
                  </div>
                  <div style={{marginTop: 8, fontSize: '12px', color: '#666'}}>
                    {success.expiresAt || success.expires_at ? (
                      <>Expires: {new Date(success.expiresAt || success.expires_at).toLocaleString()}</>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={submitForm} style={{display:"grid", gap:12, marginTop:12}}>
              <input
                className="input"
                placeholder="Event Name/Purpose *"
                value={formData.eventName}
                onChange={e=>updateField('eventName', e.target.value)}
                disabled={loading}
                required
              />
              <input
                className="input"
                type="date"
                placeholder="Date of Visit *"
                value={formData.date}
                onChange={e=>updateField('date', e.target.value)}
                disabled={loading}
                required
              />
              <input
                className="input"
                type="time"
                placeholder="Time of Visit *"
                value={formData.time}
                onChange={e=>updateField('time', e.target.value)}
                disabled={loading}
                required
              />
              {/* Optional: CSV upload or paste */}
              <div style={{display:'grid', gap:8}}>
                <label style={{fontWeight:600}}>Optional guest list (CSV)</label>
                <input type="file" accept=".csv" onChange={handleCsvFile} disabled={loading} />
                <textarea
                  value={csvText}
                  onChange={(e)=>{ setCsvText(e.target.value); parseCsv(e.target.value); }}
                  placeholder={`Paste CSV here (headers optional)\nname,email,phone\nJohn Doe,john@example.com,0712345678`}
                  rows={6}
                  style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4, fontFamily:'monospace', fontSize:12}}
                  disabled={loading}
                />
                <div style={{fontSize:12, color:'#666'}}>
                  - Required columns: name, email. Phone optional (format 0xxxxxxxxx).<br/>
                  - Duplicates by email are removed. Max 50 guests.
                </div>
              </div>
              <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                <label>Number of Guests:</label>
                <select
                  value={csvText.trim() ? parsedGuests.length : formData.numGuests}
                  onChange={(e) => updateField('numGuests', Number(e.target.value))}
                  disabled={loading}
                  style={{padding: '4px 8px'}}
                >
                  {Array.from({ length: 50 }, (_, i) => (
                    <option key={i} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>

              {/* CSV validation preview */}
              {csvText.trim() && (
                <div style={{display:'grid', gap:8, padding:12, border:'1px solid #eee', borderRadius:4, background:'#fafafa'}}>
                  <div style={{fontWeight:600}}>Guest preview ({parsedGuests.length})</div>
                  {csvInfo && <div style={{color:'#996800', background:'#fff9e6', padding:8, borderRadius:4, fontSize:12}}>{csvInfo}</div>}
                  {parsedGuests.length > 0 ? (
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%', borderCollapse:'collapse'}}>
                        <thead>
                          <tr>
                            <th style={{textAlign:'left', borderBottom:'1px solid #ddd', padding:6}}>#</th>
                            <th style={{textAlign:'left', borderBottom:'1px solid #ddd', padding:6}}>Name</th>
                            <th style={{textAlign:'left', borderBottom:'1px solid #ddd', padding:6}}>Email</th>
                            <th style={{textAlign:'left', borderBottom:'1px solid #ddd', padding:6}}>Phone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedGuests.map((g, i) => (
                            <tr key={i}>
                              <td style={{padding:6, borderBottom:'1px solid #f0f0f0'}}>{i+1}</td>
                              <td style={{padding:6, borderBottom:'1px solid #f0f0f0'}}>{g.name}</td>
                              <td style={{padding:6, borderBottom:'1px solid #f0f0f0'}}>{g.email}</td>
                              <td style={{padding:6, borderBottom:'1px solid #f0f0f0'}}>{g.phone || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{color:'#666', fontSize:12}}>No valid guests parsed yet.</div>
                  )}
                  {csvErrors.length > 0 && (
                    <div style={{marginTop:8}}>
                      <div style={{color:'red', fontWeight:600}}>CSV issues ({csvErrors.length})</div>
                      <div style={{background:'#ffeaea', padding:8, borderRadius:4}}>
                        {csvErrors.map((er, i) => (
                          <div key={i} style={{fontSize:12}}>Row {er.index}: {er.message}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{display:"flex", gap:10}}>
                <button type="button" className="btn" onClick={() => {
                  resetForm();
                  setCsvText("");
                  setParsedGuests([]);
                  setCsvErrors([]);
                  setCsvInfo("");
                }} disabled={loading}>
                  Clear
                </button>
                <button type="submit" className="btn primary" disabled={loading}>
                  {loading ? 'Creating Invitation...' : 'Create Bulk Invitation'}
                </button>
              </div>
            </form>



            {success && success.errors && success.errors.length > 0 && (
              <div style={{marginTop: 16}}>
                <h4 style={{color: 'red'}}>Errors</h4>
                <div style={{backgroundColor: '#ffeaea', padding: 12, borderRadius: 4}}>
                  {success.errors.map((error, i) => (
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
