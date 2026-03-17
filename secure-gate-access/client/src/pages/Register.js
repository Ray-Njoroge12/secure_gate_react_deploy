// Enhanced registration page supporting normal user registration and event (bulk invite) visitor self-registration
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { completeInvite, getBulkInvite, visitorVerifyOtp, resendVisitorOtp } from "../services/passService.js";
import { useError } from "../contexts/ErrorContext.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import QRCodeDisplay from '../components/QRCodeDisplay.jsx';
import phoneValidator from '../utils/phoneValidator.js';
import passwordValidator from '../utils/passwordValidator.js';
import logger from '../utils/logger';
import api from '../utils/apiClient';
import PasswordRequirements from '../components/PasswordRequirements';
import Button from '../components/ui/Button';

// API base URL for cross-site deployment (Netlify frontend + Render backend)
const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const DEFAULT_ESTATE_ID = Number.parseInt(process.env.REACT_APP_DEFAULT_ESTATE_ID || '1', 10);
const DEFAULT_ESTATE_NAME = process.env.REACT_APP_DEFAULT_ESTATE_NAME || 'Default Estate';
const hasDefaultEstateFallback = Number.isFinite(DEFAULT_ESTATE_ID) && DEFAULT_ESTATE_ID > 0;

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { inviteCode } = useParams();
  const [searchParams] = useSearchParams();
  const { handleError, handleSuccess, handleWarning, clearAllErrors } = useError();
  const isBulkRegistration = !!inviteCode || searchParams.get('bulk') === 'true';

  // Enhanced form state management
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'resident',
    estateId: '',
    phone: '',
    houseNumber: '',
    consent: false
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [estates, setEstates] = useState([]);
  const [estatesLoading, setEstatesLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [estateError, setEstateError] = useState('');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!loading) {
          if (isBulkRegistration) {
            handleBulkRegister(e);
          } else {
            handleRegister(e);
          }
        }
      }
      // Escape to clear errors
      if (e.key === 'Escape') {
        clearAllErrors();
        setErrors({});
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, errors, isBulkRegistration]);

  useEffect(() => {
    if (isBulkRegistration) return;

    const fetchEstates = async () => {
      try {
        setEstatesLoading(true);
        setEstateError('');  // Clear previous errors

        const response = await api.get('/api/estates/available');
        const availableEstates = response.data?.data?.estates || [];
        setEstates(availableEstates);
        setFormData((prev) => {
          if (!prev.estateId) return prev;
          const hasExistingSelection = availableEstates.some((estate) => String(estate.id) === String(prev.estateId));
          return hasExistingSelection ? prev : { ...prev, estateId: '' };
        });

      } catch {
        setEstateError('Unable to load estates list');
        if (hasDefaultEstateFallback) {
          setEstates([{ id: DEFAULT_ESTATE_ID, name: DEFAULT_ESTATE_NAME }]);
          setFormData((prev) => ({
            ...prev,
            estateId: prev.estateId || String(DEFAULT_ESTATE_ID)
          }));
        } else {
          setEstates([]);
          setFormData((prev) => ({ ...prev, estateId: '' }));
          handleError('Could not load estates list. Please refresh and select your estate to continue.', {
            context: 'Estate Loading',
            title: 'Connection Issue',
            severity: 'warning',
            autoClose: true,
            autoCloseDelay: 5000
          });
        }
      } finally {
        setEstatesLoading(false);
      }
    };

    fetchEstates();
  }, [isBulkRegistration]);

  const usingTemporaryDefaultEstate =
    !!estateError &&
    hasDefaultEstateFallback &&
    String(formData.estateId) === String(DEFAULT_ESTATE_ID);

  // Bulk registration fields
  const [bulkFormData, setBulkFormData] = useState({
    name: '',
    visitorPhone: '',
    visitorEmail: '',
    idNumber: '',
    vehiclePlate: '',
    purpose: ''
  });

  const [inviteDetails, setInviteDetails] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [confirmedVisitor, setConfirmedVisitor] = useState(null);
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef([]);
  const OTP_LENGTH = 6;

  const otpDigits = Array.from({ length: OTP_LENGTH }, (_, index) => otp[index] || "");

  useEffect(() => {
    if (showOtpSection) {
      otpInputRefs.current[0]?.focus();
    }
  }, [showOtpSection]);

  useEffect(() => {
    if (isBulkRegistration && inviteCode) {
      // Fetch real invite details from server
      const fetchInviteDetails = async () => {
        try {
          const details = await getBulkInvite(inviteCode);
          const normalized = {
            eventName: details.event_name || details.eventName,
            date: details.date,
            time: details.time,
            numGuests: details.num_guests || details.numGuests,
            inviteCode: details.invite_code || details.inviteCode,
            expiresAt: details.expires_at || details.expiresAt,
            remainingSlots: details.remaining_slots || details.remainingSlots
          };
          setInviteDetails(normalized);
          setBulkFormData(prev => ({ ...prev, purpose: normalized.eventName || "Event" }));
        } catch (err) {
          logger.error('Failed to fetch invite details', err);
          handleError('Invalid or expired invitation link', {
            context: 'Invite Details',
            title: 'Invalid Invitation',
            showRecoveryActions: true,
            onHelp: () => window.open('mailto:support@securegate.com?subject=Invalid Invitation&body=Please provide a valid invitation link.')
          });
        }
      };
      fetchInviteDetails();
    } else if (isBulkRegistration) {
      // Set default purpose for bulk registration without invite code
      setBulkFormData(prev => ({ ...prev, purpose: "Event" }));
      setInviteDetails({
        eventName: "Community Event",
        date: "2024-01-15",
        time: "14:00"
      });
    }
  }, [isBulkRegistration, inviteCode]);

  // Enhanced form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else {
      const errorMessage = passwordValidator.getErrorMessage(formData.password);
      if (errorMessage) {
        newErrors.password = errorMessage;
      }
    }

    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Estate remains required by design; temporary default applies during estate-list outages.
    if (formData.role === 'resident' && !formData.estateId) {
      newErrors.estateId = hasDefaultEstateFallback
        ? 'Estate selection is required for residents'
        : 'Estate list is temporarily unavailable. Please refresh and try again.';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneError = phoneValidator.getErrorMessage(formData.phone.trim(), 'KE');
      if (phoneError) {
        newErrors.phone = phoneError;
      }
    }

    if (formData.role === 'resident' && !formData.houseNumber.trim()) {
      newErrors.houseNumber = 'House number is required for residents';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearAllErrors(); // Only clear toast errors, not form field errors
    setLoading(true);

    // Validate form - this sets inline field errors
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Convert phone number to international format for backend
      const internationalPhone = phoneValidator.toInternational(formData.phone.trim(), 'KE');
      const resolvedEstateId = formData.estateId
        ? Number(formData.estateId)
        : (hasDefaultEstateFallback ? DEFAULT_ESTATE_ID : null);

      const response = await api.post('/api/auth/register', {
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          role: formData.role,
          phone: internationalPhone,
          house: formData.role === "resident" ? formData.houseNumber : "",
          password: formData.password,
          estate_id: Number.isFinite(resolvedEstateId) ? resolvedEstateId : null
        });

      // Success - show detailed message with longer delay
      handleSuccess(`✅ Registration successful!

📧 Next steps:
1. Check your email for confirmation
2. Wait for admin approval (usually 24-48 hours)
3. You'll receive an activation email once approved

Redirecting to login in 10 seconds...`, {
        context: 'User Registration',
        title: 'Account Pending Approval',
        autoClose: true,
        autoCloseDelay: 10000  // 10 seconds instead of 5
      });
      setSuccess("Account created! Pending Admin approval. You'll receive an email when activated.");
      setTimeout(() => navigate("/login"), 10000);  // 10 seconds delay
    } catch (err) {
      const status = err.response?.status;
      const errData = err.response?.data;

      if (status === 409 || (errData?.message && errData.message.toLowerCase().includes('already exist'))) {
        // Duplicate email or username - set inline errors
        const isDuplicateEmail = errData?.message?.toLowerCase().includes('email');
        const isDuplicateUsername = errData?.message?.toLowerCase().includes('username');

        if (isDuplicateEmail) {
          setErrors(prev => ({ ...prev, email: 'This email is already registered. Try logging in instead.' }));
        }
        if (isDuplicateUsername) {
          setErrors(prev => ({ ...prev, username: 'This username is already taken. Please choose another.' }));
        }

        handleError(errData?.message, {
          context: 'User Registration',
          title: 'Account Already Exists',
          severity: 'error'
        });
      } else if (status) {
        // Server error with a response
        handleError(errData?.message || "Registration failed. Please try again.", {
          context: 'User Registration',
          title: 'Registration Failed',
          showRecoveryActions: true,
          onRetry: () => handleRegister(e)
        });
      } else {
        // Network or unexpected errors - preserve form state
        handleError(err.message || "Network error. Please check your connection and try again.", {
          context: 'User Registration',
          title: 'Connection Error',
          showRecoveryActions: true,
          onRetry: () => handleRegister(e)
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Enhanced bulk registration validation
  const validateBulkForm = () => {
    const newErrors = {};

    if (!bulkFormData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!bulkFormData.visitorPhone.trim()) {
      newErrors.visitorPhone = 'Phone number is required';
    } else {
      const phoneError = phoneValidator.getErrorMessage(bulkFormData.visitorPhone.trim(), 'KE');
      if (phoneError) {
        newErrors.visitorPhone = phoneError;
      }
    }

    if (!bulkFormData.visitorEmail.trim()) {
      newErrors.visitorEmail = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(bulkFormData.visitorEmail.trim())) {
      newErrors.visitorEmail = 'Please enter a valid email address';
    }

    if (!bulkFormData.purpose.trim()) {
      newErrors.purpose = 'Purpose of visit is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBulkRegister = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    if (!validateBulkForm()) {
      setLoading(false);
      return;
    }

    try {
      const guestData = {
        name: bulkFormData.name.trim(),
        phone: bulkFormData.visitorPhone.trim(),
        email: bulkFormData.visitorEmail.trim(),
        idNumber: bulkFormData.idNumber.trim() || null,
        vehiclePlate: bulkFormData.vehiclePlate.trim() || null,
        expectedTime: "2 hours"
      };

      const response = await completeInvite(inviteCode, guestData);
      // Expecting { visitor, otp_issued, otp_ttl_minutes, debug_otp? }
      const v = (response && response.visitor) ? response.visitor : response;
      setConfirmedVisitor(v || null);
      
      // BULK-004 FIX: Handle QR generation warnings
      if (response.warning) {
        handleWarning(response.warning, {
          context: 'QR Code Generation',
          title: 'Partial Success',
          autoClose: false
        });
      }
      
      // Show OTP step; QR will be shown after verification
      setShowOtpSection(true);
      setSuccess("Registration submitted. Please check your email/SMS for the OTP and verify to view your QR code.");
    } catch (err) {
      logger.error('Bulk registration failed', err, { inviteCode });
      // Friendly messages per status
      if (err.status === 410) {
        handleError('This invitation has expired. Please contact the host for a new link.', {
          context: 'Bulk Registration',
          title: 'Invitation Expired',
          showRecoveryActions: true,
          onHelp: () => window.open('mailto:support@securegate.com?subject=Expired Invitation&body=Please provide a new invitation link.')
        });
      } else if (err.status === 409) {
        handleError('All guest slots have been used for this event.', {
          context: 'Bulk Registration',
          title: 'Event Full',
          showRecoveryActions: true,
          onHelp: () => window.open('mailto:support@securegate.com?subject=Event Full&body=Please increase the guest limit for this event.')
        });
      } else if (err.status === 404) {
        handleError('Invitation not found. Please check your link.', {
          context: 'Bulk Registration',
          title: 'Invalid Invitation',
          showRecoveryActions: true,
          onHelp: () => window.open('mailto:support@securegate.com?subject=Invalid Invitation&body=Please provide a valid invitation link.')
        });
      } else {
        handleError(err, {
          context: 'Bulk Registration',
          title: 'Registration Failed',
          showRecoveryActions: true,
          onRetry: () => handleBulkRegister(e)
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (isBulkRegistration) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-lg p-8 shadow-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Event Registration</h1>
            {inviteDetails && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <h3 className="text-lg font-semibold text-brand-600 dark:text-brand-400 mb-2">{inviteDetails.eventName}</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Date: {inviteDetails.date} | Time: {inviteDetails.time}
                </p>
              </div>
            )}
          </div>


          {success && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 rounded-md">
              {success}
            </div>
          )}

          {/* Show QR and confirmation details after OTP verification */}
          {qrCode && (
            <div className="mb-4 p-4 border border-gray-200 dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-700 flex justify-center">
              <QRCodeDisplay value={qrCode} size={220} otp={otp} altImg={qrCode} />
            </div>
          )}

          {/* OTP verification section */}
          {showOtpSection && (
            <div className="mb-4 p-4 border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800">
              <fieldset className="mb-2" aria-describedby="otp-instructions otp-error otp-success">
                <legend className="font-semibold text-gray-700 dark:text-gray-300">Verify your OTP</legend>
                <p id="otp-instructions" className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Enter the 6-digit code sent to you.
                </p>
                <div className="flex gap-2 mb-2" role="group" aria-label="One-time password digits">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={`otp-digit-${index}`}
                      ref={(el) => {
                        otpInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, "");
                        const nextDigits = [...otpDigits];

                        if (cleaned.length === 0) {
                          nextDigits[index] = "";
                          setOtp(nextDigits.join(""));
                          return;
                        }

                        const chars = cleaned.split("");
                        chars.forEach((char, offset) => {
                          if (index + offset < OTP_LENGTH) {
                            nextDigits[index + offset] = char;
                          }
                        });

                        setOtp(nextDigits.join(""));
                        const nextIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
                        otpInputRefs.current[nextIndex]?.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
                          otpInputRefs.current[index - 1]?.focus();
                        }
                        if (e.key === "ArrowLeft" && index > 0) {
                          otpInputRefs.current[index - 1]?.focus();
                        }
                        if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
                          otpInputRefs.current[index + 1]?.focus();
                        }
                      }}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
                        if (!pasted) return;
                        e.preventDefault();
                        const nextDigits = [...otpDigits];
                        pasted.split("").forEach((char, offset) => {
                          if (index + offset < OTP_LENGTH) {
                            nextDigits[index + offset] = char;
                          }
                        });
                        setOtp(nextDigits.join(""));
                        const nextIndex = Math.min(index + pasted.length, OTP_LENGTH - 1);
                        otpInputRefs.current[nextIndex]?.focus();
                      }}
                      aria-label={`OTP digit ${index + 1}`}
                      aria-invalid={Boolean(otpError)}
                      className="w-12 h-12 text-center text-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:outline-none focus:ring-4 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:border-brand-500"
                    />
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-wrap gap-2 mb-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={async () => {
                    setOtpError("");
                    setOtpSuccess("");
                    if (!confirmedVisitor?.id || otp.trim().length !== OTP_LENGTH) {
                      setOtpError('Enter the 6-digit OTP to continue.');
                      return;
                    }
                    try {
                      const r = await visitorVerifyOtp(confirmedVisitor.id, otp.trim());
                      const v2 = r?.visitor || r;
                      if (v2?.qr_code) setQrCode(v2.qr_code);
                      setConfirmedVisitor(v2);
                      setOtpSuccess('OTP verified successfully. Your QR code is ready below.');
                      setShowOtpSection(false);
                    } catch (e) {
                      if (e.status === 401) setOtpError('Incorrect OTP. Please try again.');
                      else if (e.status === 410) setOtpError('OTP has expired. Please request a new one.');
                      else if (e.status === 429) setOtpError('Too many attempts. Please wait a while before retrying.');
                      else setOtpError(e.message || 'OTP verification failed');
                    }
                  }}
                  className="min-h-[44px] min-w-[44px]"
                >Verify</Button>
                <Button
                  variant="secondary"
                  size="md"
                  disabled={resendCooldown > 0}
                  onClick={async () => {
                    if (!confirmedVisitor?.id) return;
                    try {
                      await resendVisitorOtp(confirmedVisitor.id);
                      setOtpSuccess('OTP resent. Please check your inbox.');
                      setResendCooldown(60);
                      const t = setInterval(() => {
                        setResendCooldown((s) => {
                          if (s <= 1) { clearInterval(t); return 0; }
                          return s - 1;
                        });
                      }, 1000);
                    } catch (e) {
                      if (e.status === 429) setOtpError('Please wait a minute before requesting another OTP.');
                      else setOtpError(e.message || 'Failed to resend OTP');
                    }
                  }}
                  className="min-h-[44px] min-w-[44px]"
                >{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}</Button>
              </div>
              {otpError && (
                <div id="otp-error" className="text-red-600 text-sm mt-2" aria-live="polite">
                  {otpError}
                </div>
              )}
              {otpSuccess && (
                <div id="otp-success" className="text-green-600 text-sm mt-2" aria-live="polite">
                  {otpSuccess}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleBulkRegister} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bulk-name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                <input
                  id="bulk-name"
                  type="text"
                  value={bulkFormData.name}
                  onChange={e => setBulkFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:outline-none focus:ring-4 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:border-brand-500 text-base disabled:bg-gray-100 dark:disabled:bg-slate-600"
                  placeholder="Enter your full name"
                  disabled={loading}
                  required
                />
                {errors.name && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="bulk-phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone Number *</label>
                <input
                  id="bulk-phone"
                  type="tel"
                  value={bulkFormData.visitorPhone}
                  onChange={e => setBulkFormData(prev => ({ ...prev, visitorPhone: e.target.value }))}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:outline-none focus:ring-4 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:border-brand-500 text-base disabled:bg-gray-100 dark:disabled:bg-slate-600"
                  placeholder="0xxxxxxxxx"
                  disabled={loading}
                  required
                />
                {errors.visitorPhone && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.visitorPhone}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="bulk-email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
              <input
                id="bulk-email"
                type="email"
                value={bulkFormData.visitorEmail}
                onChange={e => setBulkFormData(prev => ({ ...prev, visitorEmail: e.target.value }))}
                className="w-full min-h-[44px] px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:outline-none focus:ring-4 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:border-brand-500 text-base disabled:bg-gray-100 dark:disabled:bg-slate-600"
                placeholder="your.email@example.com"
                disabled={loading}
                required
              />
              {errors.visitorEmail && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.visitorEmail}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bulk-id-number" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">ID Number</label>
                <input
                  id="bulk-id-number"
                  type="text"
                  value={bulkFormData.idNumber}
                  onChange={e => setBulkFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:outline-none focus:ring-4 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:border-brand-500 text-base disabled:bg-gray-100 dark:disabled:bg-slate-600"
                  placeholder="Optional"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="bulk-vehicle" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Vehicle Plate Number</label>
                <input
                  id="bulk-vehicle"
                  type="text"
                  value={bulkFormData.vehiclePlate}
                  onChange={e => setBulkFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:outline-none focus:ring-4 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:border-brand-500 text-base disabled:bg-gray-100 dark:disabled:bg-slate-600"
                  placeholder="Optional"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Purpose of Visit *</label>
              <select
                value={bulkFormData.purpose}
                onChange={e => setBulkFormData(prev => ({ ...prev, purpose: e.target.value }))}
                className="w-full min-h-[44px] px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:outline-none focus:ring-4 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:border-brand-500 text-base disabled:bg-gray-100 dark:disabled:bg-slate-600"
                disabled={loading}
                required
              >
                <option value="">Select purpose</option>
                <option value="Meeting">Meeting</option>
                <option value="Delivery">Delivery</option>
                <option value="Interview">Interview</option>
                <option value="Event">Event</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Other">Other</option>
              </select>
              {errors.purpose && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.purpose}</p>}
            </div>

            {/* Privacy Policy and Terms Agreement */}
            <div className="flex items-start space-x-2 mt-4">
              <input
                type="checkbox"
                id="bulkPrivacyTerms"
                required
                className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 dark:border-slate-600 rounded"
              />
              <label htmlFor="bulkPrivacyTerms" className="text-sm text-gray-600 dark:text-gray-300">
                I agree to the{' '}
                <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-500 underline">
                  Privacy Policy
                </Link>
                {' '}and{' '}
                <Link to="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-500 underline">
                  Terms of Service
                </Link>
                {' '}of Secure Gate Access Control System.
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              loading={loading}
              className="w-full mt-4 h-12 text-base font-semibold"
            >
              {loading ? 'Registering...' : 'Register for Event'}
            </Button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="min-h-[44px] min-w-[44px]"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout title="Create Account">

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
          {success}
        </div>
      )}

      <form onSubmit={handleRegister} noValidate className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            placeholder="Enter username"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 text-gray-900 dark:text-gray-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            required
          />
          {errors.username && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.username}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name *
            </label>
            <input
              id="first_name"
              type="text"
              placeholder="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 text-gray-900 dark:text-gray-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
            {errors.first_name && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.first_name}</p>}
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Last Name *
            </label>
            <input
              id="last_name"
              type="text"
              placeholder="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 text-gray-900 dark:text-gray-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
            {errors.last_name && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.last_name}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter email address"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 text-gray-900 dark:text-gray-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            required
          />
          {errors.email && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.email}</p>}
        </div>

        {/* Role selection removed for public registration - defaults to Resident */
          /* Guards must be created by Admin */
        }

        <div>
          <label htmlFor="estateId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Estate <span className="text-red-500">*</span>
          </label>
          <select
            id="estateId"
            value={formData.estateId}
            onChange={(e) => setFormData(prev => ({ ...prev, estateId: e.target.value }))}
            className={`w-full min-h-[44px] px-3 py-2 border rounded-md shadow-sm text-gray-900 dark:text-gray-100 dark:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:border-brand-500 ${
              errors.estateId 
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                : estateError 
                  ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' 
                  : 'border-gray-300 dark:border-slate-600'
              }`}
            disabled={estatesLoading}
            required
            aria-invalid={!!errors.estateId}
            aria-describedby={errors.estateId ? "estate-error" : "estate-help"}
          >
            <option value="">
              {estatesLoading
                ? 'Loading estates...'
                : estateError
                  ? usingTemporaryDefaultEstate
                    ? `${DEFAULT_ESTATE_NAME} selected (temporary fallback)`
                    : 'Unable to load estates - please refresh'
                  : 'Select your estate'}
            </option>
            {estates.map((estate) => (
              <option key={estate.id} value={estate.id}>
                {estate.name}
              </option>
            ))}
          </select>
          {errors.estateId && (
            <p id="estate-error" className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center" role="alert">
              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errors.estateId}
            </p>
          )}
          <p id="estate-help" className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {estateError ? (
              <span className="text-yellow-600 dark:text-yellow-400 flex items-center">
                <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {usingTemporaryDefaultEstate
                  ? `Estate list is unavailable. Using ${DEFAULT_ESTATE_NAME} temporarily so you can continue signup.`
                  : `${estateError}. Please try refreshing the page to load estates.`}
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Select the estate where you live. An estate admin will review your registration.
              </span>
            )}
          </p>
        </div>

        {formData.role === "resident" && (
          <div>
            <label htmlFor="houseNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              House Number
            </label>
            <input
              id="houseNumber"
              type="text"
              placeholder="Enter house number"
              value={formData.houseNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, houseNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 text-gray-900 dark:text-gray-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
            {errors.houseNumber && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.houseNumber}</p>}
          </div>
        )}

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="Enter phone number"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 text-gray-900 dark:text-gray-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            required
          />
          {errors.phone && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 text-gray-900 dark:text-gray-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </Button>
          </div>
          <PasswordRequirements password={formData.password} />
          {errors.password && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className={`w-full px-3 py-2 pr-20 border rounded-md shadow-sm placeholder-gray-400 text-gray-900 dark:text-gray-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${formData.confirmPassword && formData.password
                ? formData.confirmPassword === formData.password
                  ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-300 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-300 dark:border-slate-600'
                }`}
              required
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-2">
              {formData.confirmPassword && formData.password && (
                <div className="pointer-events-none flex-shrink-0">
                  {formData.confirmPassword === formData.password ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded p-1"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </Button>
            </div>
          </div>
          {formData.confirmPassword && formData.password && formData.confirmPassword !== formData.password && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Passwords do not match
            </p>
          )}
          {formData.confirmPassword && formData.password && formData.confirmPassword === formData.password && (
            <p className="text-green-600 text-sm mt-1 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Passwords match
            </p>
          )}
          {errors.confirmPassword && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
        </div>

        {/* Privacy Policy and Terms Agreement */}
        <div className="flex items-start space-x-2">
          <input
            type="checkbox"
            id="privacyTerms"
            required
            className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
          />
          <label htmlFor="privacyTerms" className="text-sm text-gray-600 dark:text-gray-300">
            I agree to the{' '}
            <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-500 underline">
              Privacy Policy
            </Link>
            {' '}and{' '}
            <Link to="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-500 underline">
              Terms of Service
            </Link>
            {' '}of Secure Gate Access Control System.
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          loading={loading}
          className="w-full h-12 text-base font-semibold"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 hover:text-brand-500 font-medium">
            Sign in
          </Link>
        </span>
      </div>
    </AuthLayout>
  );
}
