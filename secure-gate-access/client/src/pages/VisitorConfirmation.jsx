/**
 * Visitor Confirmation Page
 * E2 Enhancement: Public visitor self-service confirmation
 *
 * Features:
 * - Token-based visitor lookup
 * - Consent capture (GDPR/Kenya DPA compliant)
 * - QR code generation
 * - Confirmation email trigger
 */

import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';

const VisitorConfirmationPage = () => {
  const { token } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [visitor, setVisitor] = useState(null);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [qrCode, setQrCode] = useState(null);

  // Consent state
  const [consent, setConsent] = useState({
    dataProcessing: false,
    privacyPolicy: false,
    marketing: false
  });

  // Parse token from URL or params
  const visitorToken = token || new URLSearchParams(location.search).get('token');

  useEffect(() => {
    if (visitorToken) {
      fetchVisitorDetails();
    } else {
      setError('No visitor token provided');
      setLoading(false);
    }
  }, [visitorToken]);

  const fetchVisitorDetails = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/public/visitors/by-token/${visitorToken}`
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch visitor details');
      }

      setVisitor(data.data);

      // Check if already confirmed and has QR code
      if (data.data.status === 'confirmed' && data.data.qrCode) {
        setConfirmed(true);
        setQrCode(data.data.qrCode);
      }

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!consent.dataProcessing || !consent.privacyPolicy) {
      alert('Please accept the required consents to continue');
      return;
    }

    setConfirming(true);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/public/visitors/${visitorToken}/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ consent })
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to confirm visit');
      }

      setConfirmed(true);
      setQrCode(data.data.qrCode);
      setVisitor(prev => ({ ...prev, ...data.data.visitor }));
    } catch (err) {
      alert(`Confirmation failed: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-200">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Invitation Not Found</h2>
            <p className="text-gray-600 dark:text-gray-200 mb-6">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Please check your invitation link or contact the estate administration.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="bg-white rounded-lg shadow-xl overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-3xl font-bold mb-2">Visit Confirmed!</h1>
              <p className="text-green-100">Your digital pass is ready</p>
            </div>

            {/* Visitor Details */}
            <div className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Visit Details</h2>
              <div className="space-y-3">
                <div className="flex items-center text-gray-700">
                  <span className="font-medium mr-2">📅 Date:</span>
                  {new Date(visitor.dateOfVisit).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                {visitor.timeOfVisit && (
                  <div className="flex items-center text-gray-700">
                    <span className="font-medium mr-2">🕐 Time:</span>
                    {visitor.timeOfVisit}
                  </div>
                )}
                <div className="flex items-center text-gray-700">
                  <span className="font-medium mr-2">📍 Purpose:</span>
                  {visitor.purpose}
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          {qrCode && (
            <div className="bg-white rounded-lg shadow-xl p-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
                Your Digital Pass
              </h2>
              <p className="text-gray-600 dark:text-gray-200 text-center mb-6">
                Show this QR code to the guard at the gate for fast check-in
              </p>

              {qrCode.dataUrl && (
                <div className="flex justify-center mb-6">
                  <img
                    src={qrCode.dataUrl}
                    alt="Visitor QR Code"
                    className="max-w-xs border-4 border-gray-100 rounded-lg shadow-md"
                  />
                </div>
              )}

              {qrCode.message && (
                <p className="text-center text-gray-600 dark:text-gray-200 mb-4">
                  {qrCode.message}
                </p>
              )}

              {qrCode.expiresAt && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-300">
                  Valid until {new Date(qrCode.expiresAt).toLocaleString()}
                </p>
              )}

              {/* Important Instructions */}
              <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Important</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Save this QR code or take a screenshot</li>
                  <li>• A confirmation email has been sent to {visitor.email}</li>
                  <li>• Present valid ID at the gate</li>
                  <li>• QR code expires after your visit</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-8 text-center">
            <div className="text-6xl mb-4">🎫</div>
            <h1 className="text-3xl font-bold mb-2">Confirm Your Visit</h1>
            <p className="text-blue-100">You're invited to visit</p>
          </div>

          {/* Visitor Details */}
          <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Visit Details</h2>
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-gray-700">
                <span className="font-medium mr-2">👤 Name:</span>
                {visitor.name}
              </div>
              <div className="flex items-center text-gray-700">
                <span className="font-medium mr-2">📅 Date:</span>
                {new Date(visitor.dateOfVisit).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              {visitor.timeOfVisit && (
                <div className="flex items-center text-gray-700">
                  <span className="font-medium mr-2">🕐 Time:</span>
                  {visitor.timeOfVisit}
                </div>
              )}
              <div className="flex items-center text-gray-700">
                <span className="font-medium mr-2">📍 Purpose:</span>
                {visitor.purpose}
              </div>
              <div className="flex items-center text-gray-700">
                <span className="font-medium mr-2">🏠 Host:</span>
                {visitor.resident.name}
              </div>
            </div>

            {/* Consent Form */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Consent & Privacy
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-200 mb-4">
                To complete your confirmation, please review and accept the following:
              </p>

              <div className="space-y-3">
                {/* Data Processing Consent */}
                <label className="flex items-start cursor-pointer p-3 rounded border-2 border-gray-200 hover:border-blue-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={consent.dataProcessing}
                    onChange={(e) => setConsent({ ...consent, dataProcessing: e.target.checked })}
                    className="mt-1 mr-3 h-5 w-5 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    <strong className="text-red-600">*</strong> I consent to the processing of my personal data for visitor management purposes (Kenya Data Protection Act 2019)
                  </span>
                </label>

                {/* Privacy Policy */}
                <label className="flex items-start cursor-pointer p-3 rounded border-2 border-gray-200 hover:border-blue-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={consent.privacyPolicy}
                    onChange={(e) => setConsent({ ...consent, privacyPolicy: e.target.checked })}
                    className="mt-1 mr-3 h-5 w-5 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    <strong className="text-red-600">*</strong> I have read and agree to the{' '}
                    <a href="/privacy-policy" target="_blank" className="text-blue-600 underline">
                      Privacy Policy
                    </a>
                  </span>
                </label>

                {/* Marketing Consent */}
                <label className="flex items-start cursor-pointer p-3 rounded border-2 border-gray-200 hover:border-green-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={consent.marketing}
                    onChange={(e) => setConsent({ ...consent, marketing: e.target.checked })}
                    className="mt-1 mr-3 h-5 w-5 text-green-600"
                  />
                  <span className="text-sm text-gray-700">
                    (Optional) I agree to receive updates and announcements from the estate
                  </span>
                </label>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-300 mt-4">
                <strong className="text-red-600">*</strong> Required fields
              </p>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirm}
              disabled={confirming || !consent.dataProcessing || !consent.privacyPolicy}
              className={`w-full mt-6 py-4 px-6 rounded-lg font-semibold text-white transition-all ${
                confirming || !consent.dataProcessing || !consent.privacyPolicy
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {confirming ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Confirming...
                </span>
              ) : (
                'Confirm Visit & Get Digital Pass'
              )}
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-gray-300 mt-4">
              After confirmation, you'll receive a QR code via email for fast check-in at the gate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitorConfirmationPage;

