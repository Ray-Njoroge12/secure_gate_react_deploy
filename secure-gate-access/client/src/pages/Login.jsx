import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { handleApiError } from "../utils/errorMapper.js";
import { Button, Input, Card, Toast } from "../components/ui";
import "../styles.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  
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
    
    if (loading) return; // prevent double submit
    setLoading(true);

    try {
      const result = await login(email, password, remember);
      
      // Redirect to intended page or dashboard based on role
      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        // Default redirects based on role
        if (result.user.role === "admin") navigate("/dashboard/admin");
        else if (result.user.role === "guard" || result.user.role === "security") navigate("/dashboard/guard");
        else if (result.user.role === "resident") navigate("/dashboard/resident");
        else navigate("/");
      }
    } catch (err) {
      setError(handleApiError(err, 'Login'));
    } finally {
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
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        // Default redirects based on role
        if (user.role === "admin") navigate("/dashboard/admin");
        else if (user.role === "guard" || user.role === "security") navigate("/dashboard/guard");
        else if (user.role === "resident") navigate("/dashboard/resident");
        else navigate("/");
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-secondary-900 px-4">
        <div className="w-full max-w-md">
          <Card padding="lg">
            <Card.Header className="text-center">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-secondary-200 mb-2">
                  {showForgot ? "Reset Password" : "Secure Gate"}
                </h1>
                <p className="text-secondary-400">
                  {showForgot 
                    ? "Enter your email to receive a reset link" 
                    : "Sign in to your account"
                  }
                </p>
              </div>
            </Card.Header>

            <Card.Content>
              {!showForgot ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    }
                  />

                  <Input
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    }
                  />

                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={() => setRemember(!remember)}
                        className="h-4 w-4 text-green-600 bg-slate-800 border-slate-600 rounded focus:ring-green-500"
                      />
                      <span className="ml-2 text-sm text-slate-300">Remember me</span>
                    </label>
                    
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-sm text-green-400 hover:text-green-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    loading={loading}
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>

                  <div className="text-center text-sm text-slate-400">
                    Don't have an account?{" "}
                    <Link 
                      to="/register" 
                      className="text-green-400 hover:text-green-300 transition-colors font-medium"
                    >
                      Register here
                    </Link>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    helperText="We'll send you a password reset link"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    }
                  />

                  <div className="space-y-3">
                    <Button type="submit" className="w-full">
                      Send Reset Link
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => setShowForgot(false)}
                    >
                      Back to Sign In
                    </Button>
                  </div>
                </form>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Toast Notifications */}
      {error && (
        <Toast
          type="error"
          message={error}
          onClose={() => setError("")}
        />
      )}
      
      {message && (
        <Toast
          type="success"
          message={message}
          onClose={() => setMessage("")}
        />
      )}
    </>
  );
}
