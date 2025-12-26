/**
 * @file VisitorInvitePage.jsx
 * @description Public visitor invite page - accessible via secure token URL
 * Phase V1: Visitor Invite Landing & Digital Pass
 * 
 * URL Format: /v/:token
 * Example: /v/vst_abc123...
 * 
 * Features:
 * - QR code for guard scanning
 * - Live status updates (polling)
 * - Visit details display
 * - Gate directions
 * - Mobile-optimized
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import SavePassModal from '../../components/visitor/SavePassModal'; // Phase 1.2: Save Pass
import VisitorDirections from '../../components/visitor/VisitorDirections'; // Phase 2.3: Directions
import './VisitorInvitePage.css';

const VisitorInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visitor, setVisitor] = useState(null);
  const [estateInfo, setEstateInfo] = useState(null);
  const [statusPolling, setStatusPolling] = useState(false);
  const [expiryCountdown, setExpiryCountdown] = useState(null);
  const pollingIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  
  // New states for visitor confirmation flow
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState({
    purpose: '',
    vehiclePlate: '',
    company: '',
  });
  const [consentGiven, setConsentGiven] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  
  // Phase 1.2: Save Pass Modal state
  const [showSavePassModal, setShowSavePassModal] = useState(false);

  // Fetch visitor details
  const fetchVisitorDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/public/visitors/by-token/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Invite not found or has expired');
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment.');
        } else {
          throw new Error('Failed to load invite details');
        }
      }

      const data = await response.json();
      
      if (data.success) {
        setVisitor(data.data);
      } else {
        throw new Error(data.error || 'Failed to load invite');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch estate information
  const fetchEstateInfo = async () => {
    try {
      const response = await fetch('/api/public/estate-info');
      const data = await response.json();
      
      if (data.success) {
        setEstateInfo(data.data);
      }
    } catch (err) {
      console.error('Failed to load estate info:', err);
    }
  };

  // Poll for status updates (for real-time approval changes)
  const pollStatus = async () => {
    if (!token || !visitor) return;
    
    try {
      const response = await fetch(`/api/public/visitors/${token}/status`);
      const data = await response.json();
      
      if (data.success && data.data.status !== visitor.status) {
        // Status changed - refresh full details
        await fetchVisitorDetails();
      }
    } catch (err) {
      // Ignore polling errors (don't disrupt user experience)
      console.error('Status poll failed:', err);
    }
  };

  // Initial load
  useEffect(() => {
    if (!token || !token.startsWith('vst_')) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    fetchVisitorDetails();
    fetchEstateInfo();
  }, [token]);

  // Start status polling when visitor is pending_approval
  useEffect(() => {
    if (visitor && visitor.status === 'pending_approval' && !statusPolling) {
      setStatusPolling(true);
      
      // Poll every 10 seconds for status updates
      pollingIntervalRef.current = setInterval(pollStatus, 10000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setStatusPolling(false);
      };
    } else if (visitor && visitor.status !== 'pending_approval' && statusPolling) {
      // Stop polling if status is no longer pending
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setStatusPolling(false);
    }
  }, [visitor?.status]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Calculate and update expiry countdown
  useEffect(() => {
    if (!visitor) return;

    const calculateCountdown = () => {
      // Use expiry date or visit date + 24 hours
      let expiryDate;
      if (visitor.tokenExpiresAt) {
        expiryDate = new Date(visitor.tokenExpiresAt);
      } else if (visitor.expiresAt) {
        expiryDate = new Date(visitor.expiresAt);
      } else if (visitor.dateOfVisit) {
        expiryDate = new Date(visitor.dateOfVisit);
        expiryDate.setHours(23, 59, 59, 999); // End of visit day
      } else {
        return null;
      }

      if (Number.isNaN(expiryDate.getTime())) {
        return null;
      }

      const now = new Date();
      const diff = expiryDate.getTime() - now.getTime();

      if (diff <= 0) {
        return { expired: true, text: 'Expired', color: 'red' };
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        return { 
          expired: false, 
          text: `${days}d ${hours}h remaining`,
          color: days > 1 ? 'green' : 'orange'
        };
      } else if (hours > 0) {
        return { 
          expired: false, 
          text: `${hours}h ${minutes}m remaining`,
          color: hours > 6 ? 'green' : 'orange'
        };
      } else {
        return { 
          expired: false, 
          text: `${minutes}m remaining`,
          color: 'red'
        };
      }
    };

    // Initial calculation
    setExpiryCountdown(calculateCountdown());

    // Update every minute
    countdownIntervalRef.current = setInterval(() => {
      setExpiryCountdown(calculateCountdown());
    }, 60000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [visitor]);

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'pending_approval':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      case 'on_premise':
        return 'status-onpremise';
      case 'checked_out':
        return 'status-checkedout';
      case 'expired':
        return 'status-expired';
      default:
        return 'status-default';
    }
  };

  // Format status text
  const getStatusText = (status) => {
    const statusMap = {
      'approved': 'Approved',
      'pending_approval': 'Pending Approval',
      'rejected': 'Denied',
      'on_premise': 'On Premise',
      'checked_out': 'Checked Out',
      'expired': 'Expired'
    };
    return statusMap[status] || status;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString;
  };

  if (loading) {
    return (
      <div className="visitor-invite-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="visitor-invite-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Invite Not Available</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Handle visitor confirmation
  const handleConfirmVisit = async () => {
    if (!consentGiven) {
      setConfirmError('Please accept the privacy policy to continue');
      return;
    }

    setConfirmLoading(true);
    setConfirmError(null);

    try {
      const response = await fetch(`/api/public/visitors/${token}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          purpose: additionalInfo.purpose || 'Personal Visit',
          vehiclePlate: additionalInfo.vehiclePlate,
          company: additionalInfo.company,
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
          consent_type: 'data_processing',
          consent_version: '1.0'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to confirm visit');
      }

      // Refresh visitor details to get updated status and QR code
      await fetchVisitorDetails();
      setShowConfirmation(false);
    } catch (err) {
      setConfirmError(err.message);
    } finally {
      setConfirmLoading(false);
    }
  };

  // Determine if we need to show confirmation flow
  const needsConfirmation = visitor && 
    (visitor.status === 'pending_confirmation' || !visitor.consent_given);

  if (!visitor) {
    return null;
  }

  // Render confirmation flow for new invites
  if (needsConfirmation || showConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-lg mx-auto p-4 md:py-12 py-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center">
              <h1 className="text-2xl font-bold text-white mb-1">You're Invited! 🎉</h1>
              <p className="text-green-100 text-sm">
                {visitor.resident?.name || 'Your host'} has invited you
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Visit Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Visit Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Date:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(visitor.dateOfVisit)}</span>
                  </div>
                  {visitor.timeOfVisit && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Time:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatTime(visitor.timeOfVisit)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Location:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{estateInfo?.name || 'Estate'}</span>
                  </div>
                </div>
              </div>

              {/* Additional Info (Optional) */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Complete Your Details <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">(optional)</span></h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose of Visit</label>
                  <select
                    value={additionalInfo.purpose}
                    onChange={(e) => setAdditionalInfo(prev => ({ ...prev, purpose: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select purpose...</option>
                    <option value="Personal Visit">Personal Visit</option>
                    <option value="Business Meeting">Business Meeting</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Maintenance">Maintenance / Service</option>
                    <option value="Event">Event / Party</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle License Plate</label>
                  <input
                    type="text"
                    value={additionalInfo.vehiclePlate}
                    onChange={(e) => setAdditionalInfo(prev => ({ ...prev, vehiclePlate: e.target.value.toUpperCase() }))}
                    placeholder="KAA 123A"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Required for vehicle entry</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={additionalInfo.company}
                    onChange={(e) => setAdditionalInfo(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Your company (if applicable)"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Privacy Consent */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consentGiven}
                    onChange={(e) => {
                      setConsentGiven(e.target.checked);
                      if (e.target.checked) setConfirmError(null);
                    }}
                    className="w-5 h-5 mt-0.5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                  />
                  <label htmlFor="consent" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <span className="font-medium">I consent to SecureGate processing my personal data</span>
                    <span className="text-gray-600"> for visitor management and security purposes in accordance with the </span>
                    <Link to="/privacy-policy" className="text-blue-600 underline" target="_blank">Privacy Policy</Link>.
                  </label>
                </div>
                {confirmError && (
                  <p className="text-red-600 text-sm mt-2">{confirmError}</p>
                )}
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirmVisit}
                disabled={confirmLoading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {confirmLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Confirming...
                  </span>
                ) : (
                  '✅ Confirm & Get My Pass'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-2xl mx-auto p-4 md:py-12 py-6">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 md:p-8 text-white text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Visitor Pass</h1>
            <p className="text-green-100 text-sm md:text-base">Your digital access to the estate</p>
          </div>
          <div className="p-6 md:p-8">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                  Welcome, {visitor.name || 'Guest'}! 👋
                </h2>
                <p className="text-gray-600 text-sm md:text-base">
                  You're invited to {estateInfo?.name || 'the estate'}
                </p>
              </div>

              {/* Expiry Countdown */}
              {expiryCountdown && (
                <div className={`text-center py-2 px-4 rounded-lg text-sm font-medium ${
                  expiryCountdown.expired 
                    ? 'bg-red-100 text-red-700 border border-red-200' 
                    : expiryCountdown.color === 'red'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : expiryCountdown.color === 'orange'
                        ? 'bg-orange-50 text-orange-600 border border-orange-200'
                        : 'bg-green-50 text-green-600 border border-green-200'
                }`}>
                  {expiryCountdown.expired ? (
                    <>⚠️ This pass has expired</>
                  ) : (
                    <>⏱️ Pass valid: <strong>{expiryCountdown.text}</strong></>
                  )}
                </div>
              )}

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                <div className="qr-code-container">
                  {/* Use pre-generated QR code from server if available, otherwise generate client-side */}
                  {visitor.qr_code || visitor.qrCodeDataUrl ? (
                    <img 
                      src={visitor.qr_code || visitor.qrCodeDataUrl} 
                      alt="Visitor QR Code"
                      className="qr-code mx-auto"
                      style={{ width: 200, height: 200 }}
                    />
                  ) : (
                    <QRCodeSVG
                      value={visitor.id.toString()}
                      size={200}
                      level="H"
                      includeMargin={true}
                      className="qr-code"
                    />
                  )}
                </div>
                <p className="text-center text-sm text-gray-700 font-medium">
                  📱 Show this QR code at the gate
                </p>
                <p className="qr-code-text">
                  Visit Code: <strong>{visitor.qrId || visitor.id}</strong>
                </p>
                
                {/* Phase 1.2: Save Pass Button */}
                <button
                  onClick={() => setShowSavePassModal(true)}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-green-700 font-medium py-3 px-4 rounded-xl border-2 border-green-200 hover:border-green-300 transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Save Pass to Device
                </button>
              </div>
              <div className="details-section">
                <h2>Visit Details</h2>
                <div className="detail-item">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{visitor.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{formatDate(visitor.dateOfVisit)}</span>
                </div>
                {visitor.timeOfVisit && (
                  <div className="detail-item">
                    <span className="detail-label">Time:</span>
                    <span className="detail-value">{formatTime(visitor.timeOfVisit)}</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-label">Purpose:</span>
                  <span className="detail-value">{visitor.purpose}</span>
                </div>
                {visitor.company && (
                  <div className="detail-item">
                    <span className="detail-label">Company:</span>
                    <span className="detail-value">{visitor.company}</span>
                  </div>
                )}
                {visitor.vehiclePlate && (
                  <div className="detail-item">
                    <span className="detail-label">Vehicle:</span>
                    <span className="detail-value">{visitor.vehiclePlate}</span>
                  </div>
                )}
                {visitor.resident && (
                  <div className="detail-item">
                    <span className="detail-label">Visiting:</span>
                    <span className="detail-value">{visitor.resident.name}</span>
                  </div>
                )}
              </div>
              {visitor.status === 'pending_approval' && (
                <div className="status-message status-message-pending">
                  <p>⏳ <strong>Awaiting Approval</strong></p>
                  <p>Your host has been notified. Please wait for approval.</p>
                </div>
              )}
              {visitor.status === 'approved' && (
                <div className="status-message status-message-success">
                  <p>✅ <strong>Visit Approved!</strong></p>
                  <p>You may proceed to the gate. Please have your ID ready.</p>
                </div>
              )}
              {visitor.status === 'rejected' && (
                <div className="status-message status-message-error">
                  <p>❌ <strong>Visit Denied</strong></p>
                  <p>Please contact your host for more information.</p>
                </div>
              )}
              {estateInfo && (
                <div className="bg-blue-50 rounded-xl p-4 md:p-6">
                  <h3 className="font-bold text-gray-900 text-lg mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Estate Details
                  </h3>
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">{estateInfo.name}</p>
                    {estateInfo.address && (
                      <p className="text-gray-600 text-sm flex items-start">
                        <svg className="w-4 h-4 mr-1 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {estateInfo.address}
                      </p>
                    )}
                    {estateInfo.contact && (
                      <p className="text-gray-600 text-sm flex items-center">
                        <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {estateInfo.contact}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Phase 2.3: Visitor Directions */}
              {visitor && token && (
                <div className="mt-4">
                  <VisitorDirections 
                    visitorId={visitor.id} 
                    inviteToken={token} 
                  />
                </div>
              )}
            </div>
          </div>
          {/* Footer */}
          <div className="invite-footer">
            <p className="footer-text">
              This invite is valid until {formatDate(visitor.tokenExpiresAt)}
            </p>
            <button className="btn-refresh" onClick={fetchVisitorDetails}>
              🔄 Refresh Status
            </button>
          </div>
        </div>
      </div>
      
      {/* Phase 1.2: Save Pass Modal */}
      <SavePassModal
        isOpen={showSavePassModal}
        onClose={() => setShowSavePassModal(false)}
        visitor={visitor}
        estateInfo={estateInfo}
      />
    </div>
  );
};

export default VisitorInvitePage;
