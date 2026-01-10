import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";
import { useError } from "../contexts/ErrorContext.jsx";
import { handleApiError } from "../utils/errorMapper.js";
import { FloatingLabelInput, GradientButton, GradientCard, Checkbox } from "../components/ui";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, CheckCircle, KeyRound } from "lucide-react";
import passwordValidator from "../utils/passwordValidator";

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
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const buttonRef = useRef(null);

  // Validation functions
  const validateEmail = (value) => {
    if (!value) {
      setEmailError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Please enter a valid email");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (value) => {
    if (!value) {
      setPasswordError("Password is required");
      return false;
    }

    const errorMessage = passwordValidator.getErrorMessage(value);
    if (errorMessage) {
      setPasswordError(errorMessage);
      return false;
    }

    setPasswordError("");
    return true;
  };

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
        setEmailError("");
        setPasswordError("");
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
    
    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

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
      
      // Success animation before redirect
      handleSuccess("Login successful! Redirecting...", {
        context: 'Login',
        title: 'Welcome Back!',
        autoClose: true,
        autoCloseDelay: 1500
      });
      
      // Redirect after short delay for animation
      setTimeout(() => {
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
      }, 1500);
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

    if (!validateEmail(resetEmail)) {
      return;
    }

    setLoading(true);

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
      setResetEmail("");
    } catch (err) {
      handleError(err, {
        context: 'Password Reset',
        title: 'Server Error',
        showRecoveryActions: true,
        onRetry: () => handleForgotPassword(e)
      });
    } finally {
      setLoading(false);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {showForgot ? "Reset Password" : "Welcome Back"}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {showForgot 
              ? "Enter your email and we'll send you a reset link" 
              : "Sign in to your SecureGate account"}
          </p>
        </div>
        
        {/* Main Card */}
        <GradientCard className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {showForgot ? (
            /* Password Reset Form */
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <FloatingLabelInput
                id="resetEmail"
                type="email"
                label="Email Address"
                value={resetEmail}
                onChange={(e) => {
                  setResetEmail(e.target.value);
                  if (e.target.value) validateEmail(e.target.value);
                }}
                onBlur={(e) => validateEmail(e.target.value)}
                error={emailError}
                icon={<Mail className="w-5 h-5" />}
                required
                autoFocus
              />
              
              <div className="space-y-3">
                <GradientButton
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading || !resetEmail}
                  className="w-full"
                  icon={<ArrowRight className="w-5 h-5" />}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </GradientButton>
                
                <button
                  type="button"
                  className="w-full text-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-sm font-medium py-2 transition-colors"
                  onClick={() => {
                    setShowForgot(false);
                    setEmailError("");
                    setResetEmail("");
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-6">
              <FloatingLabelInput
                id="email"
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) validateEmail(e.target.value);
                }}
                onBlur={(e) => validateEmail(e.target.value)}
                error={emailError}
                icon={<Mail className="w-5 h-5" />}
                required
                autoComplete="email"
                autoFocus
              />

              <FloatingLabelInput
                id="password"
                type={showPassword ? "text" : "password"}
                label="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) validatePassword(e.target.value);
                }}
                onBlur={(e) => validatePassword(e.target.value)}
                error={passwordError}
                icon={<Lock className="w-5 h-5" />}
                required
                autoComplete="current-password"
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                }
              />

              <div className="flex items-center justify-between">
                <Checkbox
                  id="remember-me"
                  label="Remember me"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                
                <button
                  type="button"
                  className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                  onClick={() => {
                    setShowForgot(true);
                    setEmailError("");
                    setPasswordError("");
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <div className="space-y-3">
                <GradientButton
                  ref={buttonRef}
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading || !email || !password}
                  className="w-full"
                  icon={loading ? null : <ArrowRight className="w-5 h-5" />}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </GradientButton>

                {/* Security Features */}
                <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                    SSL Secured
                  </span>
                  <span className="flex items-center">
                    <KeyRound className="w-3 h-3 mr-1 text-green-500" />
                    2FA Available
                  </span>
                </div>
              </div>
            </form>
          )}
        </GradientCard>
        
        {/* Sign Up Link */}
        {!showForgot && (
          <div className="mt-6 text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Don't have an account?{" "}
              <Link 
                to="/register" 
                className="text-green-600 hover:text-green-700 font-semibold transition-colors"
              >
                Sign up
              </Link>
            </span>
          </div>
        )}

        {/* Keyboard Shortcuts Hint */}
        <div className="mt-6 text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 Press{" "}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded">
              Ctrl
            </kbd>{" "}
            +{" "}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded">
              Enter
            </kbd>{" "}
            to sign in
          </p>
        </div>
      </div>
    </div>
  );
}
