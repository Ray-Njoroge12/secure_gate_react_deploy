import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { bulkInvite } from "../../services/passService";

export default function BulkInvite() {
  const onLogout = ()=> { localStorage.removeItem("role"); window.location.href = "/"; };
  const [numGuests, setNumGuests] = useState(5);
  const [guestList, setGuestList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const initializeGuestList = () => {
    const guests = Array.from({ length: numGuests }, (_, i) => ({
      id: i + 1,
      name: "",
      email: "",
      phone: "",
      idNumber: "",
      vehiclePlate: "",
      purpose: "Bulk Invitation"
    }));
    setGuestList(guests);
    setError('');
    setResult(null);
  };

  const handleGuestChange = (index, field, value) => {
    const updatedGuests = [...guestList];
    updatedGuests[index][field] = value;
    setGuestList(updatedGuests);
  };

  const validateGuests = () => {
    const errors = [];
    guestList.forEach((guest, index) => {
      if (!guest.name.trim()) errors.push(`Guest ${index + 1}: Name is required`);
      if (!guest.email.trim()) errors.push(`Guest ${index + 1}: Email is required`);
      if (!guest.phone.trim()) errors.push(`Guest ${index + 1}: Phone is required`);
      
      if (guest.phone.trim() && !/^0\d{9}$/.test(guest.phone.trim())) {
        errors.push(`Guest ${index + 1}: Phone must be in format 0xxxxxxxxx`);
      }
      
      if (guest.email.trim() && !/\S+@\S+\.\S+/.test(guest.email.trim())) {
        errors.push(`Guest ${index + 1}: Invalid email format`);
      }
    });
    return errors;
  };

  const handleSubmit = async () => {
    if (guestList.length === 0) {
      setError('Please initialize guest list first');
      return;
    }

    const validationErrors = validateGuests();
    if (validationErrors.length > 0) {
      setError('Validation errors:\n' + validationErrors.slice(0, 5).join('\n') + 
              (validationErrors.length > 5 ? '\n... and more' : ''));
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await bulkInvite(guestList);
      setResult(response);
      
      if (response.errorCount > 0) {
        setError(`${response.errorCount} guests failed to process. Check results below.`);
      }
    } catch (err) {
      console.error('Bulk invite failed:', err);
      setError(err.message || 'Bulk invitation failed');
    } finally {
      setLoading(false);
    }
  };

  const addGuestRow = () => {
    setGuestList([...guestList, {
      id: guestList.length + 1,
      name: "",
      email: "",
      phone: "",
      idNumber: "",
      vehiclePlate: "",
      purpose: "Bulk Invitation"
    }]);
  };

  const removeGuestRow = (index) => {
    const updatedGuests = guestList.filter((_, i) => i !== index);
    setGuestList(updatedGuests);
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
              Create multiple visitor passes at once. Each guest will receive their own individual QR code and invite link.
            </p>

            {error && (
              <div style={{color: 'red', marginBottom: 16, padding: 12, backgroundColor: '#ffeaea', borderRadius: 4, whiteSpace: 'pre-line'}}>
                {error}
              </div>
            )}

            {result && (
              <div style={{marginBottom: 16, padding: 12, backgroundColor: '#eafaea', borderRadius: 4}}>
                <h4 style={{margin: 0, color: 'green'}}>Bulk Invitation Complete!</h4>
                <div style={{marginTop: 8, fontSize: '14px'}}>
                  Total Guests: {result.totalGuests} | 
                  Success: {result.successCount} | 
                  Errors: {result.errorCount}
                </div>
              </div>
            )}

            <div style={{display: 'grid', gap: 16, marginBottom: 16}}>
              <div style={{display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  Number of guests:
                  <select 
                    value={numGuests} 
                    onChange={(e) => setNumGuests(Number(e.target.value))}
                    disabled={loading}
                    style={{padding: '4px 8px'}}
                  >
                    {Array.from({ length: 50 }, (_, i) => (
                      <option key={i} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </label>
                <button 
                  className="btn" 
                  onClick={initializeGuestList}
                  disabled={loading}
                >
                  Initialize Guest List
                </button>
              </div>
            </div>

            {guestList.length > 0 && (
              <div style={{marginBottom: 16}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                  <h4 style={{margin: 0}}>Guest Information</h4>
                  <div style={{display: 'flex', gap: 8}}>
                    <button 
                      className="btn" 
                      onClick={addGuestRow}
                      disabled={loading}
                      style={{fontSize: '12px', padding: '4px 8px'}}
                    >
                      + Add Guest
                    </button>
                    <button 
                      className="btn primary" 
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? 'Creating Invitations...' : 'Send Bulk Invites'}
                    </button>
                  </div>
                </div>

                <div style={{overflowX: 'auto', border: '1px solid #ddd', borderRadius: 4}}>
                  <table style={{width: '100%', borderCollapse: 'collapse', minWidth: '800px'}}>
                    <thead style={{backgroundColor: '#f5f5f5'}}>
                      <tr>
                        <th style={{padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd'}}>#</th>
                        <th style={{padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd'}}>Name *</th>
                        <th style={{padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd'}}>Email *</th>
                        <th style={{padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd'}}>Phone *</th>
                        <th style={{padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd'}}>ID Number</th>
                        <th style={{padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd'}}>Vehicle</th>
                        <th style={{padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd'}}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guestList.map((guest, i) => (
                        <tr key={i}>
                          <td style={{padding: '4px', borderBottom: '1px solid #eee'}}>{i + 1}</td>
                          <td style={{padding: '4px', borderBottom: '1px solid #eee'}}>
                            <input
                              type="text"
                              value={guest.name}
                              onChange={(e) => handleGuestChange(i, "name", e.target.value)}
                              style={{width: '120px', padding: '4px', border: '1px solid #ccc', borderRadius: 2}}
                              disabled={loading}
                              required
                            />
                          </td>
                          <td style={{padding: '4px', borderBottom: '1px solid #eee'}}>
                            <input
                              type="email"
                              value={guest.email}
                              onChange={(e) => handleGuestChange(i, "email", e.target.value)}
                              style={{width: '150px', padding: '4px', border: '1px solid #ccc', borderRadius: 2}}
                              disabled={loading}
                              required
                            />
                          </td>
                          <td style={{padding: '4px', borderBottom: '1px solid #eee'}}>
                            <input
                              type="text"
                              value={guest.phone}
                              onChange={(e) => handleGuestChange(i, "phone", e.target.value)}
                              placeholder="0xxxxxxxxx"
                              style={{width: '110px', padding: '4px', border: '1px solid #ccc', borderRadius: 2}}
                              disabled={loading}
                              required
                            />
                          </td>
                          <td style={{padding: '4px', borderBottom: '1px solid #eee'}}>
                            <input
                              type="text"
                              value={guest.idNumber}
                              onChange={(e) => handleGuestChange(i, "idNumber", e.target.value)}
                              style={{width: '100px', padding: '4px', border: '1px solid #ccc', borderRadius: 2}}
                              disabled={loading}
                            />
                          </td>
                          <td style={{padding: '4px', borderBottom: '1px solid #eee'}}>
                            <input
                              type="text"
                              value={guest.vehiclePlate}
                              onChange={(e) => handleGuestChange(i, "vehiclePlate", e.target.value)}
                              style={{width: '80px', padding: '4px', border: '1px solid #ccc', borderRadius: 2}}
                              disabled={loading}
                            />
                          </td>
                          <td style={{padding: '4px', borderBottom: '1px solid #eee'}}>
                            <button
                              onClick={() => removeGuestRow(i)}
                              style={{padding: '2px 6px', fontSize: '12px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: 2}}
                              disabled={loading}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result && result.results && result.results.length > 0 && (
              <div style={{marginTop: 24}}>
                <h4>Generated Passes</h4>
                <div style={{display: 'grid', gap: 16}}>
                  {result.results.map((pass, i) => (
                    <div key={i} style={{border: '1px solid #ddd', borderRadius: 4, padding: 12}}>
                      <div style={{display: 'flex', gap: 16, alignItems: 'flex-start'}}>
                        <div style={{minWidth: 100}}>
                          {pass.qrDataUrl ? (
                            <img 
                              src={pass.qrDataUrl} 
                              alt={`QR for ${pass.name}`}
                              style={{width: 100, height: 100, border: '1px solid #ddd'}}
                            />
                          ) : (
                            <div style={{width: 100, height: 100, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', fontSize: '12px'}}>
                              QR Code
                            </div>
                          )}
                        </div>
                        <div style={{flex: 1}}>
                          <div style={{fontWeight: 'bold'}}>{pass.name}</div>
                          <div style={{fontSize: '14px', color: '#666'}}>
                            Pass ID: {pass.passId} | Visitor ID: {pass.visitorId}<br/>
                            Email: {pass.email}<br/>
                            Phone: {pass.maskedPhone}<br/>
                            Expires: {new Date(pass.expiresAt).toLocaleString()}
                          </div>
                          {pass.inviteLink && (
                            <div style={{marginTop: 8}}>
                              <div style={{fontSize: '12px', color: '#666'}}>Invite Link:</div>
                              <input 
                                type="text" 
                                value={pass.inviteLink} 
                                readOnly 
                                style={{width: '100%', fontSize: '11px', padding: '2px 4px'}}
                                onClick={e => e.target.select()}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
