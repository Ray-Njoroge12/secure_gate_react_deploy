import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles.css";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }

    try {
      const res = await fetch(`http://localhost:5000/api/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }

      navigate("/login");
    } catch {
      setError("Server error. Try again later.");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-panel">
        <h2>Reset Password</h2>
        <form onSubmit={handleReset}>
          <label>New Password</label>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <label>Confirm Password</label>
          <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          <button type="submit" className="btn primary">Update Password</button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
