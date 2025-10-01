// Enhanced registration page supporting normal user registration and event (bulk invite) visitor self-registration
import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { completeInvite, getBulkInvite, visitorVerifyOtp, resendVisitorOtp } from "../services/passService.js";
import AuthLayout from "../layouts/AuthLayout.jsx";
import QRCodeDisplay from '../components/QRCodeDisplay.jsx';

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { inviteCode } = useParams();
  const [searchParams] = useSearchParams();
  const isBulkRegistration = !!inviteCode || searchParams.get('bulk') === 'true';

  // Enhanced form state management
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'resident',
    residentialArea: '',
    phone: '',
    houseNumber: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
          console.error('Failed to fetch invite details:', err);
          setErrors({ general: 'Invalid or expired invitation link' });
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
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.residentialArea.trim()) {
      newErrors.residentialArea = 'Residential area is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^0\d{9}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Phone must be in format 0xxxxxxxxx (10 digits starting with 0)';
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
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          role: formData.role,
          area: formData.residentialArea,
          phone: formData.phone,
          house: formData.role === "resident" ? formData.houseNumber : "", // Backend expects 'house' field
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ general: data.message || "Registration failed" });
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setErrors({ general: "Server error. Try again later." });
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
    } else if (!/^0\d{9}$/.test(bulkFormData.visitorPhone.trim())) {
      newErrors.visitorPhone = 'Phone must be in format 0xxxxxxxxx (10 digits starting with 0)';
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
      // If backend echoed debug OTP (dev only), surface it for ease of local testing
      if (response && response.debug_otp) {
        setOtp(response.debug_otp);
        setOtpSuccess('Debug OTP provided (dev only)');
      }
      // Show OTP step; QR will be shown after verification
      setShowOtpSection(true);
      setSuccess("Registration submitted. Please check your email/SMS for the OTP and verify to view your QR code.");
    } catch (err) {
      console.error('Bulk registration failed:', err);
      // Friendly messages per status
      if (err.status === 410) setErrors({ general: 'This invitation has expired. Please contact the host for a new link.' });
      else if (err.status === 409) setErrors({ general: 'All guest slots have been used for this event.' });
      else if (err.status === 404) setErrors({ general: 'Invitation not found. Please check your link.' });
      else setErrors({ general: err.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  if (isBulkRegistration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg p-8 shadow-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Registration</h1>
            {inviteDetails && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="text-lg font-semibold text-brand-600 mb-2">{inviteDetails.eventName}</h3>
                <p className="text-gray-600">
                  Date: {inviteDetails.date} | Time: {inviteDetails.time}
                </p>
              </div>
            )}
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md whitespace-pre-line">
              {errors.general}
            </div>
          )}

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
              <div className="font-semibold mb-2 text-gray-700">Verify your OTP</div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <button
                  onClick={async () => {
                    setOtpError("");
                    setOtpSuccess("");
                    if (!confirmedVisitor?.id || !otp.trim()) {
                      setOtpError('OTP and visitor are required');
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
                  className="px-4 py-2 bg-brand-600 text-white border-none rounded-md cursor-pointer hover:bg-brand-700"
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
                  className={`px-4 py-2 text-white border-none rounded-md ${
                    resendCooldown > 0 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gray-600 cursor-pointer hover:bg-gray-700'
                  }`}
                >{resendCooldown>0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}</button>
              </div>
              {otpError && <div className="text-red-600 text-sm mt-2">{otpError}</div>}
              {otpSuccess && <div className="text-green-600 text-sm mt-2">{otpSuccess}</div>}
            </div>
          )}

          <form onSubmit={handleBulkRegister} className="grid gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={bulkFormData.name}
                onChange={e => setBulkFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base disabled:bg-gray-100"
                placeholder="Enter your full name"
                disabled={loading}
                required
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                value={bulkFormData.visitorPhone}
                onChange={e => setBulkFormData(prev => ({ ...prev, visitorPhone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base disabled:bg-gray-100"
                placeholder="0xxxxxxxxx"
                disabled={loading}
                required
              />
              {errors.visitorPhone && <p className="text-red-600 text-sm mt-1">{errors.visitorPhone}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address *</label>
              <input
                type="email"
                value={bulkFormData.visitorEmail}
                onChange={e => setBulkFormData(prev => ({ ...prev, visitorEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base disabled:bg-gray-100"
                placeholder="your.email@example.com"
                disabled={loading}
                required
              />
              {errors.visitorEmail && <p className="text-red-600 text-sm mt-1">{errors.visitorEmail}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">ID Number</label>
              <input
                type="text"
                value={bulkFormData.idNumber}
                onChange={e => setBulkFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base disabled:bg-gray-100"
                placeholder="Optional"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle Plate Number</label>
              <input
                type="text"
                value={bulkFormData.vehiclePlate}
                onChange={e => setBulkFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base disabled:bg-gray-100"
                placeholder="Optional"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Purpose of Visit *</label>
              <select
                value={bulkFormData.purpose}
                onChange={e => setBulkFormData(prev => ({ ...prev, purpose: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base disabled:bg-gray-100"
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

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-4 px-4 py-3 text-white border-none rounded-md text-base font-semibold ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
              }`}
            >
              {loading ? 'Registering...' : 'Register for Event'}
            </button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-transparent text-brand-600 border border-brand-600 rounded-md cursor-pointer text-sm hover:bg-brand-50"
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
      {errors.general && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {errors.general}
        </div>
      )}

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
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            required
          />
          {errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500'
          }`}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
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
