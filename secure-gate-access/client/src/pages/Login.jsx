import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
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
      if (remember) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);
      } else {
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("role", data.role);
      }

      // redirect based on role
      if (data.role === "admin") navigate("/dashboard/admin");
      else if (data.role === "guard") navigate("/dashboard/guard");
      else if (data.role === "resident") navigate("/dashboard/resident");
      else navigate("/");
    } catch (err) {
      setError("Server error. Try again later.");
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error sending reset link");
        return;
      }

      setMessage("Password reset link sent to your email.");
      setShowForgot(false);
    } catch (err) {
      setError("Server error. Try again later.");
    }
  };

  // Auto-redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const role = localStorage.getItem("role") || sessionStorage.getItem("role");
    if (token && role) {
      if (role === "admin") navigate("/dashboard/admin");
      else if (role === "guard") navigate("/dashboard/guard");
      else if (role === "resident") navigate("/dashboard/resident");
    }
  }, [navigate]);

  return (
    <div className="login-wrapper">
      <div className="login-panel">
        <h2>{showForgot ? "Forgot Password" : "Secure Gate Login"}</h2>

        {!showForgot ? (
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
              <button
                type="button"
                className="link"
                onClick={() => setShowForgot(true)}
              >
                Forgot password?
              </button>
            </div>

            <p style={{ marginTop: 12 }}>
              Don&apos;t have an account?{" "}
              <Link to="/register" style={{ color: "#007bff" }}>
                Register Now
              </Link>
            </p>

            <button type="submit" className="btn primary">Login</button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword}>
            <label>Enter your email</label>
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />

            <button type="submit" className="btn primary">Send Reset Link</button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowForgot(false)}
              style={{ marginTop: "8px" }}
            >
              Back to Login
            </button>
          </form>
        )}

        {error && <p className="error" style={{ color: "red", marginTop: 8 }}>{error}</p>}
        {message && <p style={{ color: "green", marginTop: 8 }}>{message}</p>}
      </div>
    </div>
  );
}
