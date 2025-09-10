import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
  console.debug("handleLogin invoked", { email, remember, loading });
  if (loading) return; // prevent double submit
  setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });

      const data = await res.json();
      console.log("Login response status:", res.status, "body:", data);

      if (!res.ok) {
        const reason = data && data.reason ? ` (${data.reason})` : "";
        setError((data && data.message ? data.message : "Login failed") + reason);
        setLoading(false);
        return;
      }

      // save token and role
      const token = data.token;
      const user = data.user || {};

      if (remember) {
        localStorage.setItem("token", token);
        localStorage.setItem("role", user.role);
        localStorage.setItem("username", user.username);
        localStorage.setItem("email", user.email);
      } else {
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("role", user.role);
        sessionStorage.setItem("username", user.username);
        sessionStorage.setItem("email", user.email);
      }

      // redirect based on role
  if (user.role === "admin") navigate("/dashboard/admin");
      else if (user.role === "guard") navigate("/dashboard/guard");
      else if (user.role === "resident") navigate("/dashboard/resident");
      else navigate("/");
  setLoading(false);
    } catch (err) {
      setError("Server error. Try again later.");
  setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
  const res = await fetch("http://localhost:5000/api/forgot-password", {
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

            <button type="submit" className="btn primary" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
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
