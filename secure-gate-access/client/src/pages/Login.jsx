import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { handleApiError } from "../utils/errorMapper.js";
import AuthLayout from "../layouts/AuthLayout.jsx";

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
  const [showPassword, setShowPassword] = useState(false);
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
        else if (result.user.role === "guard") navigate("/dashboard/guard");
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
        else if (user.role === "guard") navigate("/dashboard/guard");
        else if (user.role === "resident") navigate("/dashboard/resident");
        else navigate("/");
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  return (
    <AuthLayout title={showForgot ? "Reset Password" : "Sign In"}>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {message && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
          {message}
        </div>
      )}

      {showForgot ? (
        <form onSubmit={handleForgotPassword} className="space-y-6">
          <div>
            <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="resetEmail"
              type="email"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">We'll send you a password reset link</p>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
          
          <button
            type="button"
            className="w-full text-center text-brand-600 hover:text-brand-500 text-sm font-medium"
            onClick={() => setShowForgot(false)}
          >
            Back to Sign In
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464a1.995 1.995 0 00-2.83 0L5.636 8.464m4.242 1.414L9.88 9.88m-4.242-4.242L7.05 7.05m1.414 1.414l4.242 4.242" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.066 7-9.543 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span className="ml-2 text-sm text-gray-700">Remember me</span>
            </label>
            
            <button
              type="button"
              className="text-sm text-brand-600 hover:text-brand-500 font-medium"
              onClick={() => setShowForgot(true)}
            >
              Forgot password?
            </button>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <span className="text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/register" className="text-brand-600 hover:text-brand-500 font-medium">
            Sign up
          </Link>
        </span>
      </div>
    </AuthLayout>
  );
}
