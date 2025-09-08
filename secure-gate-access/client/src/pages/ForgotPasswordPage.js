import { useState } from "react";
import "../styles.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleForgot = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");

    try {
      const res = await fetch("http://localhost:5000/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }

      setMessage(`Check your email for reset link (mock): ${data.resetLink}`);
    } catch {
      setError("Server error. Try again later.");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-panel">
        <h2>Forgot Password</h2>
        <form onSubmit={handleForgot}>
          <label>Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn primary">Reset Password</button>
          {error && <p style={{ color: "red" }}>{error}</p>}
          {message && <p style={{ color: "green" }}>{message}</p>}
        </form>
      </div>
    </div>
  );
}
