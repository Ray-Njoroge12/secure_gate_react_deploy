import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";
import { useError } from "../contexts/ErrorContext.jsx";
import { handleApiError } from "../utils/errorMapper.js";
import AuthLayout from "../layouts/AuthLayout.jsx";

// API base URL for cross-site deployment (Netlify frontend + Render backend)
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  const { handleError, handleSuccess, clearAllErrors } = useError();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const buttonRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!loading) {
          if (showForgot) {
            handleForgotPassword(e);
          } else {
            handleLogin(e);
          }
        }
      }
      // Escape to clear errors
      if (e.key === 'Escape') {
        clearAllErrors();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, showForgot]);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    clearAllErrors();
    setMessage("");

    if (loading) return; // prevent double submit
    setLoading(true);

    try {
      const result = await login(email, password, remember);
      
      // Check if MFA is required
      if (result.mfaRequired) {
        // Redirect to MFA verification page
        navigate('/mfa/verify', {
          state: {
            userId: result.userId,
            username: result.username
          }
        });
        return;
      }
      
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
      handleError(err, { 
        context: 'Login',
        title: 'Login Failed',
        showRecoveryActions: true,
        onRetry: () => handleLogin(e)
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearAllErrors();
    setMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include', // Include cookies for cross-site
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        handleError(data.message || "Error sending reset link", {
          context: 'Password Reset',
          title: 'Reset Failed',
          showRecoveryActions: true,
          onRetry: () => handleForgotPassword(e)
        });
        return;
      }

      handleSuccess("Password reset link sent to your email.", {
        context: 'Password Reset',
        title: 'Reset Link Sent',
        autoClose: true,
        autoCloseDelay: 3000
      });
      setShowForgot(false);
    } catch (err) {
      handleError(err, {
        context: 'Password Reset',
        title: 'Server Error',
        showRecoveryActions: true,
        onRetry: () => handleForgotPassword(e)
      });
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
    <AuthLayout 
      title={showForgot ? "Reset Password" : "Welcome Back"} 
      subtitle={showForgot ? "Enter your email and we'll send you a reset link" : "Sign in to your SecureGate account"}
    >

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
              className="w-full h-11 px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              required
              aria-required="true"
              aria-describedby="resetEmail-help"
            />
            <p id="resetEmail-help" className="mt-1 text-sm text-gray-500">We'll send you a password reset link</p>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
          
          <button
            type="button"
            className="w-full min-h-[44px] text-center text-brand-600 hover:text-brand-500 text-sm font-medium px-2 py-2"
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
              className="w-full h-11 px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              required
              aria-required="true"
              autoComplete="email"
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
                className="w-full h-11 px-4 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                required
                aria-required="true"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px]"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
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
                aria-describedby="remember-help"
              />
              <span className="ml-2 text-sm text-gray-700">Remember me</span>
            </label>
            
            <button
              type="button"
              className="min-h-[44px] min-w-[44px] text-sm text-brand-600 hover:text-brand-500 font-medium px-2 py-1"
              onClick={() => setShowForgot(true)}
              aria-label="Reset your password"
            >
              Forgot password?
            </button>
          </div>

              <button 
                ref={buttonRef}
                type="submit" 
                disabled={loading}
                className="w-full flex justify-center items-center h-12 px-4 border border-transparent rounded-lg shadow-md text-base font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
              
              {/* Keyboard Shortcuts Hint */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  💡 <span className="font-medium">Tip:</span> Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-300 rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-300 rounded">Enter</kbd> to sign in
                </p>
              </div>
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
