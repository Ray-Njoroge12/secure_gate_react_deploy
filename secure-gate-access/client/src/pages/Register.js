// client/src/pages/Registration.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("resident");
  const [residentialArea, setResidentialArea] = useState("");
  const [phone, setPhone] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
          area: residentialArea,  // matches backend field
          phone,
          house: houseNumber,     // matches backend field
          password
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      setSuccess("Registration successful! Please check your email to verify.");
      // Optionally navigate to login after a delay
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError("Server error. Try again later.");
    }
  };

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
            <option value="guard">Guard</option>
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

          <label>House Number</label>
          <input
            type="text"
            placeholder="House Number"
            className="input"
            value={houseNumber}
            onChange={(e) => setHouseNumber(e.target.value)}
            required
          />

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
