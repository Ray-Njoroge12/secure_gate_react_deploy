// client/src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // import Link
import "../styles.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      // save token and role
      localStorage.setItem("token", data.token);
      const role = data.role || data.user?.role;
      localStorage.setItem("role", role);
      if (remember) localStorage.setItem("remember", "true");

      // redirect based on role
      if (role === "admin") navigate("/dashboard/admin");
      else if (role === "security") navigate("/dashboard/guard");
      else if (role === "resident") navigate("/dashboard/resident");
      else navigate("/login");
    } catch (err) {
      setError("Server error. Try again later.");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-panel">
        <h2>Secure Gate Login</h2>
        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input
            type="email"
            placeholder="Email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

          <div className="flex-between">
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
              />
              Remember me
            </label>
            <a href="#" className="link">Forgot password?</a>
          </div>

          {/* Register Now link */}
          <p style={{ marginTop: 12 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#007bff" }}>Register Now</Link>
          </p>

          <button type="submit" className="btn primary">Login</button>

          {error && <p className="error" style={{ color: "red", marginTop: 8 }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
