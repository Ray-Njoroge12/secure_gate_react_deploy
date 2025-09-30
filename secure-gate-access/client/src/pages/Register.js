// Unified registration page supporting normal user registration and event (bulk invite) visitor self-registration
import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { completeInvite, getBulkInvite, visitorVerifyOtp, resendVisitorOtp } from "../services/passService.js";
import "../styles.css";
import QRCodeDisplay from '../components/QRCodeDisplay.jsx';

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { inviteCode } = useParams();
  const [searchParams] = useSearchParams();
  const isBulkRegistration = !!inviteCode || searchParams.get('bulk') === 'true';

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("resident");
  const [residentialArea, setResidentialArea] = useState("");
  const [phone, setPhone] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Bulk registration fields
  const [name, setName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteDetails, setInviteDetails] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [confirmedVisitor, setConfirmedVisitor] = useState(null);
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (isBulkRegistration && inviteCode) {
      // Fetch real invite details from server
      const fetchInviteDetails = async () => {
        try {
          const details = await getBulkInvite(inviteCode);
          const normalized = {
            eventName: details.event_name || details.eventName,
            date: details.date,
            time: details.time,
            numGuests: details.num_guests || details.numGuests,
            inviteCode: details.invite_code || details.inviteCode,
            expiresAt: details.expires_at || details.expiresAt,
            remainingSlots: details.remaining_slots || details.remainingSlots
          };
          setInviteDetails(normalized);
          setPurpose(normalized.eventName || "Event");
        } catch (err) {
          console.error('Failed to fetch invite details:', err);
          setError('Invalid or expired invitation link');
        }
      };
      fetchInviteDetails();
    } else if (isBulkRegistration) {
      // Set default purpose for bulk registration without invite code
      setPurpose("Event");
      setInviteDetails({
        eventName: "Community Event",
        date: "2024-01-15",
        time: "14:00"
      });
    }
  }, [isBulkRegistration, inviteCode]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          role,
          area: residentialArea,
          phone,
          house: role === "resident" ? houseNumber : "", // only send house number for residents
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      setSuccess("Registration successful! Please check your email to verify.");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError("Server error. Try again later.");
    }
  };

  const handleBulkRegister = async (e) => {
    e.preventDefault();

    if (!name.trim() || !visitorPhone.trim() || !visitorEmail.trim()) {
      setError("Name, phone, and email are required");
      return;
    }

    // Phone validation
    if (!/^0\d{9}$/.test(visitorPhone.trim())) {
      setError("Phone must be in format 0xxxxxxxxx (10 digits starting with 0)");
      return;
    }

    // Email validation
    if (!/\S+@\S+\.\S+/.test(visitorEmail.trim())) {
      setError("Valid email address is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const guestData = {
        name: name.trim(),
        phone: visitorPhone.trim(),
        email: visitorEmail.trim(),
        idNumber: idNumber.trim() || null,
        vehiclePlate: vehiclePlate.trim() || null,
        expectedTime: "2 hours"
      };

  const response = await completeInvite(inviteCode, guestData);
  // Expecting { visitor, otp_issued, otp_ttl_minutes, debug_otp? }
  const v = (response && response.visitor) ? response.visitor : response;
  setConfirmedVisitor(v || null);
  // If backend echoed debug OTP (dev only), surface it for ease of local testing
  if (response && response.debug_otp) {
    setOtp(response.debug_otp);
    setOtpSuccess('Debug OTP provided (dev only)');
  }
  // Show OTP step; QR will be shown after verification
  setShowOtpSection(true);
  setSuccess("Registration submitted. Please check your email/SMS for the OTP and verify to view your QR code.");
    } catch (err) {
  console.error('Bulk registration failed:', err);
  // Friendly messages per status
  if (err.status === 410) setError('This invitation has expired. Please contact the host for a new link.');
  else if (err.status === 409) setError('All guest slots have been used for this event.');
  else if (err.status === 404) setError('Invitation not found. Please check your link.');
  else setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (isBulkRegistration) {
    return (
      <div style={{minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20}}>
        <div style={{maxWidth: 600, width: '100%', backgroundColor: 'white', borderRadius: 8, padding: 32, boxShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
          <div style={{textAlign: 'center', marginBottom: 32}}>
            <h1 style={{margin: 0, color: '#333'}}>Event Registration</h1>
            {inviteDetails && (
              <div style={{marginTop: 16, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 4}}>
                <h3 style={{margin: 0, color: '#007bff'}}>{inviteDetails.eventName}</h3>
                <p style={{margin: 8, color: '#666'}}>
                  Date: {inviteDetails.date} | Time: {inviteDetails.time}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div style={{color: 'red', marginBottom: 16, padding: 12, backgroundColor: '#ffeaea', borderRadius: 4, whiteSpace: 'pre-line'}}>
              {error}
            </div>
          )}

          {success && (
            <div style={{color: 'green', marginBottom: 16, padding: 12, backgroundColor: '#eafaea', borderRadius: 4}}>
              {success}
            </div>
          )}

          {/* Show QR and confirmation details after OTP verification */}
          {qrCode && (
            <div style={{marginBottom: 16, padding: 16, border: '1px solid #eee', borderRadius: 6, background: '#fafafa', display: 'flex', justifyContent: 'center'}}>
              <QRCodeDisplay value={qrCode} size={220} otp={otp} altImg={qrCode} />
            </div>
          )}

          {/* OTP verification section */}
          {showOtpSection && (
            <div style={{marginBottom: 16, padding: 16, border: '1px solid #eee', borderRadius: 6, background: '#fff'}}>
              <div style={{fontWeight: 600, marginBottom: 8}}>Verify your OTP</div>
              <div style={{display: 'flex', gap: 8}}>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  style={{flex: 1, padding: 10, border: '1px solid #ddd', borderRadius: 4}}
                />
                <button
                  onClick={async () => {
                    setOtpError("");
                    setOtpSuccess("");
                    if (!confirmedVisitor?.id || !otp.trim()) {
                      setOtpError('OTP and visitor are required');
                      return;
                    }
                    try {
                      const r = await visitorVerifyOtp(confirmedVisitor.id, otp.trim());
                      const v2 = r?.visitor || r;
                      if (v2?.qr_code) setQrCode(v2.qr_code);
                      setConfirmedVisitor(v2);
                      setOtpSuccess('OTP verified successfully. Your QR code is ready below.');
                      setShowOtpSection(false);
                    } catch (e) {
                      if (e.status === 401) setOtpError('Incorrect OTP. Please try again.');
                      else if (e.status === 410) setOtpError('OTP has expired. Please request a new one.');
                      else if (e.status === 429) setOtpError('Too many attempts. Please wait a while before retrying.');
                      else setOtpError(e.message || 'OTP verification failed');
                    }
                  }}
                  style={{padding: '10px 16px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'}}
                >Verify</button>
                <button
                  disabled={resendCooldown > 0}
                  onClick={async () => {
                    if (!confirmedVisitor?.id) return;
                    try {
                      await resendVisitorOtp(confirmedVisitor.id);
                      setOtpSuccess('OTP resent. Please check your inbox.');
                      setResendCooldown(60);
                      const t = setInterval(() => {
                        setResendCooldown((s) => {
                          if (s <= 1) { clearInterval(t); return 0; }
                          return s - 1;
                        });
                      }, 1000);
                    } catch (e) {
                      if (e.status === 429) setOtpError('Please wait a minute before requesting another OTP.');
                      else setOtpError(e.message || 'Failed to resend OTP');
                    }
                  }}
                  style={{padding: '10px 16px', backgroundColor: resendCooldown>0 ? '#ccc' : '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: resendCooldown>0 ? 'not-allowed' : 'pointer'}}
                >{resendCooldown>0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}</button>
              </div>
              {otpError && <div style={{color:'red', marginTop:8}}>{otpError}</div>}
              {otpSuccess && <div style={{color:'green', marginTop:8}}>{otpSuccess}</div>}
            </div>
          )}

          <form onSubmit={handleBulkRegister} style={{display: 'grid', gap: 16}}>
            <div>
              <label style={{display: 'block', marginBottom: 4, fontWeight: 'bold'}}>Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 4, fontSize: '16px'}}
                placeholder="Enter your full name"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: 4, fontWeight: 'bold'}}>Phone Number *</label>
              <input
                type="tel"
                value={visitorPhone}
                onChange={e => setVisitorPhone(e.target.value)}
                style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 4, fontSize: '16px'}}
                placeholder="0xxxxxxxxx"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: 4, fontWeight: 'bold'}}>Email Address *</label>
              <input
                type="email"
                value={visitorEmail}
                onChange={e => setVisitorEmail(e.target.value)}
                style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 4, fontSize: '16px'}}
                placeholder="your.email@example.com"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: 4, fontWeight: 'bold'}}>ID Number</label>
              <input
                type="text"
                value={idNumber}
                onChange={e => setIdNumber(e.target.value)}
                style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 4, fontSize: '16px'}}
                placeholder="Optional"
                disabled={loading}
              />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: 4, fontWeight: 'bold'}}>Vehicle Plate Number</label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={e => setVehiclePlate(e.target.value)}
                style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 4, fontSize: '16px'}}
                placeholder="Optional"
                disabled={loading}
              />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: 4, fontWeight: 'bold'}}>Purpose of Visit *</label>
              <select
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 4, fontSize: '16px'}}
                disabled={loading}
                required
              >
                <option value="">Select purpose</option>
                <option value="Meeting">Meeting</option>
                <option value="Delivery">Delivery</option>
                <option value="Interview">Interview</option>
                <option value="Event">Event</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: loading ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 16
              }}
            >
              {loading ? 'Registering...' : 'Register for Event'}
            </button>
          </form>

          <div style={{textAlign: 'center', marginTop: 24, paddingTop: 24, borderTop: '1px solid #eee'}}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#007bff',
                border: '1px solid #007bff',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      <div className="login-panel">
        <h2>Register</h2>
        <form onSubmit={handleRegister}>
          <label>Username</label>
          <input
            type="text"
            placeholder="Username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label>Email</label>
          <input
            type="email"
            placeholder="Email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Role</label>
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="resident">Resident</option>
            <option value="security">Guard</option>
          </select>

          <label>Residential Area</label>
          <input
            type="text"
            placeholder="Residential Area"
            className="input"
            value={residentialArea}
            onChange={(e) => setResidentialArea(e.target.value)}
            required
          />

          {/* Show house number only for residents */}
          {role === "resident" && (
            <>
              <label>House Number</label>
              <input
                type="text"
                placeholder="House Number"
                className="input"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                required
              />
            </>
          )}

          <label>Phone Number</label>
          <input
            type="text"
            placeholder="Phone Number"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="btn primary">Register</button>

          {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}
          {success && <p style={{ color: "green", marginTop: 8 }}>{success}</p>}
        </form>
      </div>
    </div>
  );
}
