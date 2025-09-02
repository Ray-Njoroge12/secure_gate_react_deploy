// Unified registration page supporting normal user registration and event (bulk invite) visitor self-registration
import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createVisitor, getBulkInvite } from "../services/passService";
import "../styles.css";

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

  useEffect(() => {
    if (isBulkRegistration && inviteCode) {
      // Fetch real invite details from server
      const fetchInviteDetails = async () => {
        try {
          const details = await getBulkInvite(inviteCode);
          setInviteDetails(details);
          setPurpose(details.eventName || "Event");
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
      const res = await fetch("http://localhost:5000/api/register", {
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

    if (!name.trim() || !visitorPhone.trim() || !visitorEmail.trim() || !purpose.trim()) {
      setError("Name, phone, email, and purpose are required");
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
      const visitorData = {
        name: name.trim(),
        phone: visitorPhone.trim(),
        email: visitorEmail.trim(),
        idNumber: idNumber.trim(),
        vehiclePlate: vehiclePlate.trim(),
        purpose: purpose.trim(),
        estimatedTime: "2 hours"
      };

      const response = await createVisitor(visitorData);

      setSuccess("Registration successful! Your visitor pass has been created.");
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      console.error('Bulk registration failed:', err);
      setError(err.message || 'Registration failed');
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
