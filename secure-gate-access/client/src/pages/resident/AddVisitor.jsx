// client/src/pages/resident/AddVisitor.jsx
import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { createVisitor, createPass } from "../../services/passService";

export default function AddVisitor() {
  const onLogout = ()=> { localStorage.removeItem("role"); window.location.href = "/"; };
  const [form, setForm] = useState({
    name:"",
    phone:"",
    email:"",
    dateOfVisit:"",
    time:"",
    purpose:""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [generatePassImmediately, setGeneratePassImmediately] = useState(true);
  const validateForm = () => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.phone.trim()) return 'Phone is required';
    if (!form.purpose.trim()) return 'Purpose is required';

    // Validate phone format (basic)
    if (!/^0\d{9}$/.test(form.phone.trim())) {
      return 'Phone must be in format 0xxxxxxxxx (10 digits starting with 0)';
    }

    // Validate email format if provided (optional)
    if (form.email.trim() && !/\S+@\S+\.\S+/.test(form.email.trim())) {
      return 'Please enter a valid email address';
    }

    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      // Create visitor
      const visitorData = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        dateOfVisit: form.dateOfVisit.trim(),
        time: form.time.trim(),
        purpose: form.purpose.trim()
      };

      const visitorResponse = await createVisitor(visitorData);
      
      let passResponse = null;
      if (generatePassImmediately) {
        // Auto-generate pass
        try {
          passResponse = await createPass(visitorResponse.id);
        } catch (passError) {
          console.warn('Pass generation failed:', passError);
          // Continue anyway, visitor was created successfully
        }
      }

      setSuccess({
        visitor: visitorResponse,
        inviteLink: visitorResponse.inviteLink,
        message: 'Invitation created successfully! Share the link with the guest to complete registration.'
      });

      // Clear form
      setForm({
        name:"",
        phone:"",
        email:"",
        dateOfVisit:"",
        time:"",
        purpose:""
      });

    } catch (err) {
      console.error('Failed to create visitor:', err);
      setError(err.message || 'Failed to create visitor');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setForm({
      name:"",
      phone:"",
      email:"",
      dateOfVisit:"",
      time:"",
      purpose:""
    });
    setError('');
    setSuccess(null);
  };

  return (
    <div className="app-grid">
      <Sidebar role="resident" />
      <div>
        <Topbar title="Add Visitor" onLogout={onLogout} />
        <main className="main">
          <div className="panel">
            <h3 style={{marginTop:0}}>Register Visitor</h3>

            {error && (
              <div style={{color: 'red', marginBottom: 16, padding: 12, backgroundColor: '#ffeaea', borderRadius: 4}}>
                {error}
              </div>
            )}

            {success && (
              <div style={{color: 'green', marginBottom: 16, padding: 12, backgroundColor: '#eafaea', borderRadius: 4}}>
                <div style={{fontWeight: 'bold'}}>{success.message}</div>
                <div style={{marginTop: 8, fontSize: '14px'}}>
                  Visitor ID: {success.visitor.id} | Status: {success.visitor.status}
                  {success.inviteLink && (
                    <div style={{marginTop: 8}}>
                      <strong>Invite Link:</strong>
                      <div style={{wordBreak: 'break-all', backgroundColor: '#f0f0f0', padding: 8, borderRadius: 4, marginTop: 4}}>
                        {success.inviteLink}
                      </div>
                    </div>
                  )}
                  {success.pass && (
                    <div>Pass ID: {success.pass.passId} | Expires: {new Date(success.pass.expiresAt).toLocaleString()}</div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={submit} style={{display:"grid", gap:12, marginTop:12}}>
              <input
                className="input"
                placeholder="Full name *"
                value={form.name}
                onChange={e=>setForm({...form,name:e.target.value})}
                disabled={loading}
                required
              />
              <input
                className="input"
                placeholder="Phone (0xxxxxxxxx) *"
                value={form.phone}
                onChange={e=>setForm({...form,phone:e.target.value})}
                disabled={loading}
                required
              />
              <input
                className="input"
                type="email"
                placeholder="Email address (optional)"
                value={form.email}
                onChange={e=>setForm({...form,email:e.target.value})}
                disabled={loading}
              />
              <input
                className="input"
                type="date"
                placeholder="Date of Visit *"
                value={form.dateOfVisit}
                onChange={e=>setForm({...form,dateOfVisit:e.target.value})}
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
              <input
                className="input"
                placeholder="Purpose (e.g., visit, delivery, meeting) *"
                value={form.purpose}
                onChange={e=>setForm({...form,purpose:e.target.value})}
                disabled={loading}
                required
              />

              <label style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: '14px'}}>
                <input
                  type="checkbox"
                  checked={generatePassImmediately}
                  onChange={e => setGeneratePassImmediately(e.target.checked)}
                  disabled={loading}
                />
                Generate QR pass immediately (auto-approve)
              </label>

              <div style={{display:"flex", gap:10}}>
                <button type="button" className="btn" onClick={clearForm} disabled={loading}>
                  Clear
                </button>
                <button type="submit" className="btn primary" disabled={loading}>
                  {loading ? 'Creating...' : (generatePassImmediately ? 'Create & Generate Pass' : 'Create Visitor')}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
