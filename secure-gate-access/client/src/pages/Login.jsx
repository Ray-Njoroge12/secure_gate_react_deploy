import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";

import { FloatingLabelInput, GradientButton, GradientCard, Checkbox, Icon, Button } from "../components/ui";
import { useAuth } from "../contexts/AuthContext.js";
import { useError } from "../contexts/ErrorContext.jsx";
import api from "../utils/apiClient";
import { encodeSession } from '../utils/sessionCrypto';
import { getRoleBasedRedirect } from '../utils/navigationFlow';

const AUTH_INLINE_ERROR_PATTERN = /invalid credentials|incorrect|locked|too many/i;
const INLINE_ERROR_ALERT_CLASS = 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300';

const shouldRenderInlineAuthError = (error, message) => {
  return error?.code === 'UNAUTHORIZED' || error?.status === 401 || AUTH_INLINE_ERROR_PATTERN.test(String(message));
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  const { handleError, handleSuccess, clearAllErrors } = useError();
  const isForgotPasswordRoute = location.pathname === '/forgot-password';

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [authError, setAuthError] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);

  useEffect(() => {
    if (rateLimitSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      setRateLimitSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitSeconds]);

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
    // Don't validate password strength on login - any password is acceptable
    // Strength is only validated during registration and password changes
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
          if (isForgotPasswordRoute) {
            handleForgotPassword(e);
          } else {
            handleLogin(e);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // Intentionally scoped to primary interaction state for global keyboard shortcuts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isForgotPasswordRoute]);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    clearAllErrors();
    setAuthError("");
    setRateLimitSeconds(0);

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

      // MFA-008 FIX: Check if MFA is required
      if (result?.requiresMFA || result?.mfaRequired) {
        // Store MFA session info for verification
        sessionStorage.setItem('mfa_session', encodeSession({
          mfaSessionId: result.mfaSessionId,
          userId: result.userId,
          expiresIn: result.expiresIn || 300,
          timestamp: Date.now()
        }));

        // Redirect to MFA verification page
        navigate('/mfa/verify', {
          state: {
            mfaSessionId: result.mfaSessionId,
            userId: result.userId,
            expiresIn: result.expiresIn || 300
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
        
        // Check if MFA is required for the user's role
        const mfaRequiredRoles = ['super_admin', 'admin', 'guard'];
        const requiresMFA = mfaRequiredRoles.includes(result.user.role);
        
        // If MFA is required but not enabled, redirect to MFA setup
        if (requiresMFA && !result.user.mfaEnabled) {
          navigate('/mfa/setup', { 
            state: { 
              required: true, 
              message: `Multi-Factor Authentication is required for ${result.user.role === 'super_admin' ? 'Super Admin' : result.user.role.charAt(0).toUpperCase() + result.user.role.slice(1)} accounts.`,
              redirectTo: from || getRoleBasedRedirect(result.user.role)
            }
          });
          return;
        }
        
        if (from && from !== '/login' && from !== '/forgot-password') {
          navigate(from, { replace: true });
        } else {
          // Default redirects based on role
          navigate(getRoleBasedRedirect(result.user.role));
        }
      }, 100);
    } catch (err) {
      const message = err?.message || 'Unable to sign in. Please try again.';
      const isRateLimited = err?.code === 'RATE_LIMITED' || err?.status === 429;
      const isAuthError = shouldRenderInlineAuthError(err, message);

      if (isRateLimited || isAuthError) {
        setAuthError(message);
        if (isRateLimited) {
          const parsedRetryAfter = Number.parseInt(err?.retryAfter, 10);
          if (Number.isFinite(parsedRetryAfter) && parsedRetryAfter > 0) {
            setRateLimitSeconds(parsedRetryAfter);
          }
        }
        return;
      }

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
    setForgotPasswordError("");

    if (!validateEmail(resetEmail)) {
      return;
    }

    setLoading(true);

    try {
      await api.post('/api/auth/forgot-password', { email: resetEmail });

      handleSuccess("Password reset link sent to your email.", {
        context: 'Password Reset',
        title: 'Reset Link Sent',
        autoClose: true,
        autoCloseDelay: 3000
      });
      setResetEmail("");
      navigate('/login', { replace: true });
    } catch (err) {
      setForgotPasswordError(err?.response?.data?.message || err?.message || 'Error sending reset link');
    } finally {
      setLoading(false);
    }
  };

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname;
      
      // Check if MFA is required for the user's role
      const mfaRequiredRoles = ['super_admin', 'admin', 'guard'];
      const requiresMFA = mfaRequiredRoles.includes(user.role);
      
      // If MFA is required but not enabled, redirect to MFA setup
      if (requiresMFA && !user.mfaEnabled) {
        navigate('/mfa/setup', { 
          state: { 
            required: true, 
            message: `Multi-Factor Authentication is required for ${user.role === 'super_admin' ? 'Super Admin' : user.role.charAt(0).toUpperCase() + user.role.slice(1)} accounts.`,
            redirectTo: from || getRoleBasedRedirect(user.role)
          }
        });
        return;
      }
      
      if (from && from !== '/login' && from !== '/forgot-password') {
        navigate(from, { replace: true });
      } else {
        // Default redirects based on role
        navigate(getRoleBasedRedirect(user.role));
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} noValidate className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="space-y-4">
        <FloatingLabelInput
          id="email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) validateEmail(e.target.value);
          }}
          onBlur={(e) => validateEmail(e.target.value)}
          error={emailError}
          leftIcon="Mail"
          placeholder="name@example.com"
          required
          autoComplete="email"
          autoFocus
        />
        <FloatingLabelInput
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) validatePassword(e.target.value);
          }}
          onBlur={(e) => validatePassword(e.target.value)}
          error={passwordError}
          leftIcon="Lock"
          placeholder="Enter your password"
          required
          autoComplete="current-password"
        />
        {authError && (
          <div id="auth-error" role="alert" className={INLINE_ERROR_ALERT_CLASS}>
            <p>{authError}</p>
            {rateLimitSeconds > 0 && (
              <p className="mt-1 text-xs font-medium">Try again in {rateLimitSeconds}s.</p>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <Checkbox
            id="remember-me"
            checked={remember}
            onCheckedChange={setRemember}
            label="Remember me"
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              clearAllErrors();
              setResetEmail(email.trim());
              setEmailError("");
              setPasswordError("");
              setAuthError("");
              setForgotPasswordError("");
              setRateLimitSeconds(0);
              navigate('/forgot-password', { state: { prefillEmail: email.trim() } });
            }}
            className="h-auto min-h-0 p-0 text-sm font-medium text-brand-700 hover:bg-transparent hover:text-brand-800 dark:text-brand-400 dark:hover:bg-transparent dark:hover:text-brand-300"
          >
            Forgot password?
          </Button>
        </div>
      </div>

      <GradientButton
        type="submit"
        loading={loading}
        disabled={loading || !email.trim() || !password}
        className="w-full"
        rightIcon={<Icon name="ArrowRight" size={18} />}
      >
        Sign In
      </GradientButton>

      <div className="flex items-center justify-center space-x-4 text-xs text-slate-500 dark:text-slate-300">
        <span className="flex items-center">
          <Icon name="CheckCircle" size={14} className="mr-1 text-brand-500" aria-hidden="true" />
          SSL Secured
        </span>
        <span className="flex items-center">
          <Icon name="KeyRound" size={14} className="mr-1 text-brand-500" aria-hidden="true" />
          2FA Available
        </span>
      </div>
    </form>
  );

  const renderForgotPasswordForm = () => (
    <form onSubmit={handleForgotPassword} noValidate className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-brand-50 dark:bg-brand-900/20 p-4 rounded-lg flex items-start space-x-3 mb-6">
        <Icon name="KeyRound" className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-brand-800 dark:text-brand-200">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>
      {forgotPasswordError && (
        <div role="alert" className={INLINE_ERROR_ALERT_CLASS}>
          {forgotPasswordError}
        </div>
      )}

      <FloatingLabelInput
        id="resetEmail"
        label="Email Address"
        type="email"
        value={resetEmail}
        onChange={(e) => {
          setResetEmail(e.target.value);
          if (emailError) validateEmail(e.target.value);
        }}
        onBlur={(e) => validateEmail(e.target.value)}
        error={emailError}
        leftIcon="Mail"
        placeholder="name@example.com"
        required
        autoComplete="email"
        autoFocus
      />

      <div className="flex flex-col space-y-3 pt-2">
        <GradientButton
          type="submit"
          loading={loading}
          disabled={loading || !resetEmail.trim()}
          className="w-full"
          rightIcon={<Icon name="Mail" size={18} />}
        >
          Send Reset Link
        </GradientButton>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            clearAllErrors();
            setEmailError("");
            setResetEmail("");
            setForgotPasswordError("");
            setAuthError("");
            setRateLimitSeconds(0);
            navigate('/login');
          }}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Back to Sign In
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 mb-4 shadow-lg">
            <Icon name="Shield" className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isForgotPasswordRoute ? "Reset Password" : "Welcome Back"}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {isForgotPasswordRoute ? "Enter your email and we'll send you a reset link" : "Sign in to your Secure Gate account"}
          </p>
        </div>

        <GradientCard className="p-6 sm:p-8 shadow-xl border-t-4 border-t-brand-500">
          {isForgotPasswordRoute ? renderForgotPasswordForm() : renderLoginForm()}
        </GradientCard>

        {!isForgotPasswordRoute && (
          <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300">
              Sign up
            </Link>
          </p>
        )}

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          By signing in, you agree to our{' '}
          <Link to="/terms-of-service" className="font-medium text-brand-700 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy-policy" className="font-medium text-brand-700 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300">
            Privacy Policy
          </Link>
        </p>

        {!isForgotPasswordRoute && (
          <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
            Tip: Press{" "}
            <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-semibold dark:border-slate-600 dark:bg-slate-700">Ctrl</kbd>
            {" "}+{" "}
            <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-semibold dark:border-slate-600 dark:bg-slate-700">Enter</kbd>
            {" "}to sign in quickly.
          </p>
        )}
      </div>
    </div>
  );
}
