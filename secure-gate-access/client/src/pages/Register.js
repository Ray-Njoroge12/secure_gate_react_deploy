import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "resident",
    area: "",
    phone: "",
    house: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const payload = {
      username: form.username,
      email: form.email,
      password: form.password,
      role: form.role,
      area: form.area,
      phone: form.phone,
      house: form.role === "resident" ? form.house : null,
    };

    try {
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      navigate("/login");
    } catch (err) {
      setError("Server error. Try again later.");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-panel">
        <h2>Create Account</h2>
        <form onSubmit={handleRegister}>
          <label>Full Name</label>
          <input
            type="text"
            name="username"
            placeholder="Full Name"
            className="input"
            value={form.username}
            onChange={handleChange}
            required
          />

          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="input"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="input"
            value={form.password}
            onChange={handleChange}
            required
          />

          <label>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            className="input"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <label>Role</label>
          <select
            name="role"
            className="input"
            value={form.role}
            onChange={handleChange}
          >
            <option value="resident">Resident</option>
            <option value="guard">Guard</option>
          </select>

          <label>Area</label>
          <input
            type="text"
            name="area"
            placeholder="Estate/Block"
            className="input"
            value={form.area}
            onChange={handleChange}
            required
          />

          <label>Phone</label>
          <input
            type="text"
            name="phone"
            placeholder="Phone Number"
            className="input"
            value={form.phone}
            onChange={handleChange}
            required
          />

          {form.role === "resident" && (
            <>
              <label>House Number</label>
              <input
                type="text"
                name="house"
                placeholder="House/Apartment Number"
                className="input"
                value={form.house}
                onChange={handleChange}
                required
              />
            </>
          )}

          <p style={{ marginTop: 12 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#007bff" }}>Login</Link>
          </p>

          <button type="submit" className="btn primary">Register</button>

          {error && <p className="error" style={{ color: "red", marginTop: 8 }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
