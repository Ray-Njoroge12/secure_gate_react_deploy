// Enhanced registration page supporting normal user registration and event (bulk invite) visitor self-registration
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { completeInvite, getBulkInvite, visitorVerifyOtp, resendVisitorOtp } from "../services/passService.js";
import { useError } from "../contexts/ErrorContext.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import QRCodeDisplay from '../components/QRCodeDisplay.jsx';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator.jsx';
import phoneValidator from '../utils/phoneValidator.js';
import passwordValidator from '../utils/passwordValidator.js';
import logger from 'utils/logger';

// API base URL for cross-site deployment (Netlify frontend + Render backend)
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { inviteCode } = useParams();
  const [searchParams] = useSearchParams();
  const { handleError, handleSuccess, handleWarning, clearAllErrors } = useError();
  const isBulkRegistration = !!inviteCode || searchParams.get('bulk') === 'true';

  // Enhanced form state management
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'resident',
    residentialArea: '',
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
        const response = await fetch(`${API_BASE_URL}/api/estates/available`);
        const data = await response.json();
        if (response.ok) {
          setEstates(data?.data?.estates || []);
        }
      } catch (err) {
        logger.error('Failed to load estates', err);
      } finally {
        setEstatesLoading(false);
      }
    };

    fetchEstates();
  }, [isBulkRegistration]);

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

    if (!formData.residentialArea.trim()) {
      newErrors.residentialArea = 'Residential area is required';
    }

    if (!isBulkRegistration && !formData.estateId) {
      newErrors.estateId = 'Estate selection is required';
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
    setErrors({});
    clearAllErrors();
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Convert phone number to international format for backend
      const internationalPhone = phoneValidator.toInternational(formData.phone.trim(), 'KE');
      
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          role: formData.role,
          area: formData.residentialArea,
          phone: internationalPhone,
          house: formData.role === "resident" ? formData.houseNumber : "", // Backend expects 'house' field
          password: formData.password,
          estate_id: Number(formData.estateId)
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        handleError(data.message || "Registration failed", {
          context: 'User Registration',
          title: 'Registration Failed',
          showRecoveryActions: true,
          onRetry: () => handleRegister(e)
        });
        return;
      }

      handleSuccess("Registration successful! Redirecting to login...", {
        context: 'User Registration',
        title: 'Registration Successful',
        autoClose: true,
        autoCloseDelay: 2000
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      handleError(err, {
        context: 'User Registration',
        title: 'Server Error',
        showRecoveryActions: true,
        onRetry: () => handleRegister(e)
      });
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Event Registration</h1>
            {inviteDetails && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="text-lg font-semibold text-brand-600 mb-2">{inviteDetails.eventName}</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Date: {inviteDetails.date} | Time: {inviteDetails.time}
                </p>
              </div>
            )}
          </div>


          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
              {success}
            </div>
          )}

          {/* Show QR and confirmation details after OTP verification */}
          {qrCode && (
            <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50 flex justify-center">
              <QRCodeDisplay value={qrCode} size={220} otp={otp} altImg={qrCode} />
            </div>
          )}

          {/* OTP verification section */}
          {showOtpSection && (
            <div className="mb-4 p-4 border border-gray-200 rounded-md bg-white">
              <fieldset className="mb-2" aria-describedby="otp-instructions otp-error otp-success">
                <legend className="font-semibold text-gray-700 dark:text-gray-300">Verify your OTP</legend>
                <p id="otp-instructions" className="text-sm text-gray-500 mb-2">
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
                      className="w-12 h-12 text-center text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-wrap gap-2 mb-2">
                <button
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
                  className="min-h-[44px] min-w-[44px] px-4 py-2 bg-brand-600 text-white border-none rounded-md cursor-pointer hover:bg-brand-700"
                >Verify</button>
                <button
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
                  className={`min-h-[44px] min-w-[44px] px-4 py-2 text-white border-none rounded-md ${
                    resendCooldown > 0 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gray-600 cursor-pointer hover:bg-gray-700'
                  }`}
                >{resendCooldown>0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}</button>
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

          <form onSubmit={handleBulkRegister} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={bulkFormData.name}
                  onChange={e => setBulkFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base disabled:bg-gray-100"
                  placeholder="Enter your full name"
                  disabled={loading}
                  required
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={bulkFormData.visitorPhone}
                  onChange={e => setBulkFormData(prev => ({ ...prev, visitorPhone: e.target.value }))}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base disabled:bg-gray-100"
                  placeholder="0xxxxxxxxx"
                  disabled={loading}
                  required
                />
                {errors.visitorPhone && <p className="text-red-600 text-sm mt-1">{errors.visitorPhone}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
              <input
                type="email"
                value={bulkFormData.visitorEmail}
                onChange={e => setBulkFormData(prev => ({ ...prev, visitorEmail: e.target.value }))}
                className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base disabled:bg-gray-100"
                placeholder="your.email@example.com"
                disabled={loading}
                required
              />
              {errors.visitorEmail && <p className="text-red-600 text-sm mt-1">{errors.visitorEmail}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">ID Number</label>
                <input
                  type="text"
                  value={bulkFormData.idNumber}
                  onChange={e => setBulkFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base disabled:bg-gray-100"
                  placeholder="Optional"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Vehicle Plate Number</label>
                <input
                  type="text"
                  value={bulkFormData.vehiclePlate}
                  onChange={e => setBulkFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base disabled:bg-gray-100"
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
                className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base disabled:bg-gray-100"
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
              {errors.purpose && <p className="text-red-600 text-sm mt-1">{errors.purpose}</p>}
            </div>

            {/* Privacy Policy and Terms Agreement */}
            <div className="flex items-start space-x-2 mt-4">
              <input
                type="checkbox"
                id="bulkPrivacyTerms"
                required
                className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="bulkPrivacyTerms" className="text-sm text-gray-600 dark:text-gray-300">
                I agree to the{' '}
                <Link to="/privacy-policy" target="_blank" className="text-green-600 hover:text-green-500 underline">
                  Privacy Policy
                </Link>
                {' '}and{' '}
                <Link to="/terms-of-service" target="_blank" className="text-green-600 hover:text-green-500 underline">
                  Terms of Service
                </Link>
                {' '}of Secure Gate Access Control System.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-4 flex justify-center items-center h-12 px-4 border-none rounded-lg shadow-md text-base font-semibold text-white transition-all duration-200 ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </>
              ) : (
                'Register for Event'
              )}
            </button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate('/')}
              className="min-h-[44px] min-w-[44px] px-4 py-2 bg-transparent text-brand-600 border border-brand-600 rounded-md cursor-pointer text-sm hover:bg-brand-50"
            >
              Back to Home
            </button>
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

      <form onSubmit={handleRegister} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            placeholder="Enter username"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            required
          />
          {errors.username && <p className="text-red-600 text-sm mt-1">{errors.username}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter email address"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            required
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            <option value="resident">Resident</option>
            <option value="security">Security Guard</option>
          </select>
        </div>

        <div>
          <label htmlFor="estateId" className="block text-sm font-medium text-gray-700 mb-2">
            Estate
          </label>
          <select
            id="estateId"
            value={formData.estateId}
            onChange={(e) => setFormData(prev => ({ ...prev, estateId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            required
            disabled={estatesLoading}
          >
            <option value="">{estatesLoading ? 'Loading estates...' : 'Select an estate'}</option>
            {estates.map((estate) => (
              <option key={estate.id} value={estate.id}>
                {estate.name}
              </option>
            ))}
          </select>
          {errors.estateId && <p className="text-red-600 text-sm mt-1">{errors.estateId}</p>}
        </div>

        <div>
          <label htmlFor="residentialArea" className="block text-sm font-medium text-gray-700 mb-2">
            Residential Area
          </label>
          <input
            id="residentialArea"
            type="text"
            placeholder="Enter residential area"
            value={formData.residentialArea}
            onChange={(e) => setFormData(prev => ({ ...prev, residentialArea: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            required
          />
          {errors.residentialArea && <p className="text-red-600 text-sm mt-1">{errors.residentialArea}</p>}
        </div>

        {formData.role === "resident" && (
          <div>
            <label htmlFor="houseNumber" className="block text-sm font-medium text-gray-700 mb-2">
              House Number
            </label>
            <input
              id="houseNumber"
              type="text"
              placeholder="Enter house number"
              value={formData.houseNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, houseNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
            {errors.houseNumber && <p className="text-red-600 text-sm mt-1">{errors.houseNumber}</p>}
          </div>
        )}

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="Enter phone number"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            required
          />
          {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            required
          />
          <PasswordStrengthIndicator password={formData.password} />
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                formData.confirmPassword && formData.password
                  ? formData.confirmPassword === formData.password
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
              required
            />
            {formData.confirmPassword && formData.password && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
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
          </div>
          {formData.confirmPassword && formData.password && formData.confirmPassword !== formData.password && (
            <p className="text-red-600 text-sm mt-1 flex items-center">
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
          {errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>}
        </div>

        {/* Privacy Policy and Terms Agreement */}
        <div className="flex items-start space-x-2">
          <input
            type="checkbox"
            id="privacyTerms"
            required
            className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
          />
          <label htmlFor="privacyTerms" className="text-sm text-gray-600">
            I agree to the{' '}
            <Link to="/privacy-policy" target="_blank" className="text-brand-600 hover:text-brand-500 underline">
              Privacy Policy
            </Link>
            {' '}and{' '}
            <Link to="/terms-of-service" target="_blank" className="text-brand-600 hover:text-brand-500 underline">
              Terms of Service
            </Link>
            {' '}of Secure Gate Access Control System.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center items-center h-12 px-4 border border-transparent rounded-lg shadow-md text-base font-semibold text-white transition-all duration-200 ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <span className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 hover:text-brand-500 font-medium">
            Sign in
          </Link>
        </span>
      </div>
    </AuthLayout>
  );
}
