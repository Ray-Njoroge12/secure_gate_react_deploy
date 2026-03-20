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

import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import SavePassModal from '../../components/visitor/SavePassModal';
import VisitorDirections from '../../components/visitor/VisitorDirections';
import './VisitorInvitePage.css';

// Custom hook import
import { useVisitorInvite } from '../../hooks/useVisitorInvite';
import Button from '../../components/ui/Button';
import { useI18n } from '../../i18n/index.js';
import offlineService from '../../services/offlineService';
import api from '../../utils/apiClient';

const VisitorInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  // Use the custom hook for data management
  const {
    loading,
    error,
    visitor,
    estateInfo,
    expiryCountdown,
    fetchVisitorDetails
  } = useVisitorInvite(token);

  // New states for visitor confirmation flow
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState({
    purpose: '',
    vehiclePlate: '',
    // company removed as per requirements
  });
  const [consentGiven, setConsentGiven] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  // Phase 1.2: Save Pass Modal state
  const [showSavePassModal, setShowSavePassModal] = useState(false);

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
          <p>{t('visitor.loadingInvite')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="visitor-invite-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>{t('visitor.inviteNotAvailable')}</h2>
          <p>{error}</p>
          <Button className="btn-primary" onClick={() => navigate('/')}>
            {t('visitor.goHome')}
          </Button>
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

    if (!additionalInfo.idNumber || additionalInfo.idNumber.length < 5) {
      setConfirmError('Please enter a valid ID Number (min 5 characters)');
      return;
    }

    setConfirmLoading(true);
    setConfirmError(null);

    if (!navigator.onLine) {
      try {
        await offlineService.addToSyncQueue({
          type: 'visitor_confirmation',
          url: `/api/public/visitors/${token}/confirm`,
          method: 'POST',
          body: {
            consent: { dataProcessing: true, privacyPolicy: true, marketing: false },
            additionalInfo: {
              purpose: additionalInfo.purpose || 'Personal Visit',
              vehiclePlate: additionalInfo.vehiclePlate,
              idNumber: additionalInfo.idNumber
            }
          }
        });
        setConfirmError('You are offline. Your confirmation has been saved and will be sent when you reconnect.');
      } catch {
        setConfirmError('Failed to save confirmation for offline sync.');
      } finally {
        setConfirmLoading(false);
      }
      return;
    }

    try {
      const response = await api.post(`/api/public/visitors/${token}/confirm`, {
        consent: {
          dataProcessing: true,
          privacyPolicy: true,
          marketing: false
        },
        additionalInfo: {
          purpose: additionalInfo.purpose || 'Personal Visit',
          vehiclePlate: additionalInfo.vehiclePlate,
          idNumber: additionalInfo.idNumber
        }
      });
      const data = response.data;

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
  const needsConfirmation = visitor?.status === 'pending_confirmation';

  // Determine if this is a bulk invite self-registration
  const isBulkInvite = visitor?.isBulkInvite;

  // Handle event registration (Bulk Invite)
  const handleEventRegistration = async (e) => {
    e.preventDefault();
    if (!consentGiven) {
      setConfirmError('Please accept the privacy policy to continue');
      return;
    }

    if (!additionalInfo.name || !additionalInfo.name.trim()) {
      setConfirmError('Name is required');
      return;
    }

    if (!additionalInfo.phone && !additionalInfo.email) {
      setConfirmError('Phone or email is required');
      return;
    }

    if (!additionalInfo.idNumber || additionalInfo.idNumber.length < 5) {
      setConfirmError('Please enter a valid ID Number (min 5 characters)');
      return;
    }

    setConfirmLoading(true);
    setConfirmError(null);

    try {
      const response = await api.post(`/api/visitors/complete/${token}`, {
        name: additionalInfo.name,
        phone: additionalInfo.phone,
        email: additionalInfo.email,
        purpose: additionalInfo.purpose || visitor.eventName || 'Event',
        vehiclePlate: additionalInfo.vehiclePlate,
        // company removed
        idNumber: additionalInfo.idNumber,
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
        consent_type: 'data_processing',
        consent_version: '1.0'
      });

      const data = response.data;

      // On success, redirect to the new visitor pass URL
      if (data.visitor_token) {
        navigate(`/v/${data.visitor_token}`, { replace: true });
      }

    } catch (err) {
      setConfirmError(err.message);
    } finally {
      setConfirmLoading(false);
    }
  };

  if (!visitor) {
    return null;
  }

  // Render Bulk Invite Registration Form
  if (isBulkInvite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-lg mx-auto p-4 md:py-12 py-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
              <h1 className="text-2xl font-bold text-white mb-1">{t('visitor.eventInvitation')} 🎟️</h1>
              <p className="text-blue-100 text-sm">
                You're invited to <strong>{visitor.eventName}</strong>
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Event Details */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('visitor.eventDetails')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-200">Date:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(visitor.dateOfVisit)}</span>
                  </div>
                  {visitor.timeOfVisit && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-200">Time:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatTime(visitor.timeOfVisit)}</span>
                    </div>
                  )}
                  {visitor.remainingSlots !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-200">Remaining Slots:</span>
                      <span className="font-medium text-indigo-700 dark:text-indigo-400">{visitor.remainingSlots}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleEventRegistration} className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('visitor.registerForAccess')}</h3>

                {/* Name */}
                <div>
                  <label htmlFor="visitor-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {t('visitor.fullName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="visitor-name"
                    type="text"
                    required
                    value={additionalInfo.name || ''}
                    onChange={(e) => setAdditionalInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="visitor-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {t('visitor.phoneNumber')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="visitor-phone"
                    type="tel"
                    required
                    value={additionalInfo.phone || ''}
                    onChange={(e) => setAdditionalInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0712 345 678"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* ID Number */}
                <div>
                  <label htmlFor="visitor-id-number" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {t('visitor.idPassportNumber')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="visitor-id-number"
                    type="text"
                    required
                    value={additionalInfo.idNumber || ''}
                    onChange={(e) => setAdditionalInfo(prev => ({ ...prev, idNumber: e.target.value }))}
                    placeholder="Enter your ID Number"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Required for security verification</p>
                </div>

                {/* Vehicle Plate */}
                <div>
                  <label htmlFor="visitor-vehicle" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('visitor.vehiclePlate')}</label>
                  <input
                    id="visitor-vehicle"
                    type="text"
                    value={additionalInfo.vehiclePlate}
                    onChange={(e) => setAdditionalInfo(prev => ({ ...prev, vehiclePlate: e.target.value.toUpperCase() }))}
                    placeholder="KAA 123A"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Required if driving in</p>
                </div>

                {/* Privacy Consent */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="consent-bulk"
                      checked={consentGiven}
                      onChange={(e) => {
                        setConsentGiven(e.target.checked);
                        if (e.target.checked) setConfirmError(null);
                      }}
                      className="w-5 h-5 mt-0.5 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500"
                    />
                    <label htmlFor="consent-bulk" className="text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                      <span className="font-medium">{t('visitor.privacyConsent')}</span>
                      <span className="text-gray-600 dark:text-gray-200"> for visitor management and security purposes in accordance with the </span>
                      <Link to="/privacy-policy" className="text-blue-600 dark:text-blue-400 underline" target="_blank">Privacy Policy</Link>.
                    </label>
                  </div>
                  {confirmError && (
                    <p className="text-red-700 dark:text-red-400 text-sm mt-2">{confirmError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={confirmLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {confirmLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                      {t('visitor.registering')}
                    </span>
                  ) : `${t('visitor.registerGetPass')} ➔`}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render confirmation flow for new invites (Standard)
  if (needsConfirmation || showConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-lg mx-auto p-4 md:py-12 py-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-center">
              <h1 className="text-2xl font-bold text-white mb-1">{t('visitor.youreInvited')} 🎉</h1>
              <p className="text-brand-100 text-sm">
                {visitor.resident?.name || 'Your host'} has invited you
              </p>
            </div>

            <div className="p-6 space-y-6" data-tour="visitor-otp">
              {/* Visit Summary */}
              <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('visitor.visitDetails')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-200">Date:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(visitor.dateOfVisit)}</span>
                  </div>
                  {visitor.timeOfVisit && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-200">Time:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatTime(visitor.timeOfVisit)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-200">Location:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{estateInfo?.name || 'Estate'}</span>
                  </div>
                </div>
              </div>

              {/* Additional Info (Optional) */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('visitor.completeRegistration')} <span className="text-gray-500 dark:text-gray-300 font-normal text-sm">(optional)</span></h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('visitor.purposeOfVisit')}</label>
                  <select
                    value={additionalInfo.purpose}
                    onChange={(e) => setAdditionalInfo(prev => ({ ...prev, purpose: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
                  <label htmlFor="self-reg-vehicle" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('visitor.vehiclePlate')}</label>
                  <input
                    id="self-reg-vehicle"
                    type="text"
                    value={additionalInfo.vehiclePlate}
                    onChange={(e) => setAdditionalInfo(prev => ({ ...prev, vehiclePlate: e.target.value.toUpperCase() }))}
                    placeholder="KAA 123A"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Required for vehicle entry</p>
                </div>

                <div>
                  <label htmlFor="self-reg-id" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {t('visitor.idPassportNumber')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="self-reg-id"
                    type="text"
                    required
                    value={additionalInfo.idNumber || ''}
                    onChange={(e) => setAdditionalInfo(prev => ({ ...prev, idNumber: e.target.value }))}
                    placeholder="Enter your ID Number"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Required for security verification</p>
                </div>
              </div>

              {/* Privacy Consent */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consentGiven}
                    onChange={(e) => {
                      setConsentGiven(e.target.checked);
                      if (e.target.checked) setConfirmError(null);
                    }}
                    className="w-5 h-5 mt-0.5 text-brand-600 rounded border-gray-300 dark:border-slate-600 focus:ring-brand-500"
                  />
                  <label htmlFor="consent" className="text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                    <span className="font-medium">{t('visitor.privacyConsent')}</span>
                    <span className="text-gray-600 dark:text-gray-200"> for visitor management and security purposes in accordance with the </span>
                    <Link to="/privacy-policy" className="text-blue-600 dark:text-blue-400 underline" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.
                  </label>
                </div>
                {confirmError && (
                  <p className="text-red-700 dark:text-red-400 text-sm mt-2">{confirmError}</p>
                )}
              </div>

              {/* Confirm Button */}
              <Button
                onClick={handleConfirmVisit}
                disabled={confirmLoading}
                className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-semibold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {confirmLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('visitor.confirming')}
                  </span>
                ) : (
                  `✅ ${t('visitor.confirmGetPass')}`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const qrImageSrc = visitor?.qr_code || visitor?.qrCodeDataUrl || visitor?.qrCode?.dataUrl || visitor?.qrCode?.qrCodeDataUrl;
  const qrFallbackValue = visitor?.visitorToken || visitor?.visitor_token || visitor?.qrId || String(visitor?.id || '');
  const visitCode = visitor?.qrId || visitor?.visitorToken || visitor?.visitor_token || visitor?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-2xl mx-auto p-4 md:py-12 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 md:p-8 text-white text-center" data-tour="visitor-invite-header">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('visitor.visitorPass')}</h1>
            <p className="text-brand-100 text-sm md:text-base">{t('visitor.yourDigitalAccess')}</p>
          </div>
          <div className="p-6 md:p-8">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Welcome, {visitor.name || 'Guest'}! 👋
                </h2>
                <p className="text-gray-600 dark:text-gray-200 text-sm md:text-base">
                  You're invited to {estateInfo?.name || 'the estate'}
                </p>
              </div>

              {/* Expiry Countdown / Expired Screen */}
              {expiryCountdown?.expired ? (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-8 text-center border border-red-200 dark:border-red-800">
                  <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">This invitation has expired</h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-1">
                    This pass was valid until {formatDate(visitor.tokenExpiresAt || visitor.expiresAt || visitor.expires_at)}.
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Please ask your host to send a new invitation.
                  </p>
                </div>
              ) : (
                <>
                  {/* Near-expiry warning */}
                  {expiryCountdown && (
                    <div className={`text-center py-2 px-4 rounded-lg text-sm font-medium ${
                      expiryCountdown.color === 'red'
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : expiryCountdown.color === 'orange'
                          ? 'bg-orange-50 text-orange-600 border border-orange-200'
                          : 'bg-brand-50 text-brand-600 border border-brand-200'
                    }`}>
                      <span aria-hidden="true">⏱️</span> Pass valid: <strong>{expiryCountdown.text}</strong>
                    </div>
                  )}

                  <div className="bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-900/10 rounded-xl p-6" data-tour="visitor-qr">
                    <div className="qr-code-container">
                      {qrImageSrc ? (
                        <img
                          src={qrImageSrc}
                          alt="Visitor QR Code"
                          className="qr-code mx-auto"
                          style={{ width: 200, height: 200 }}
                        />
                      ) : (
                        <QRCodeSVG
                          value={qrFallbackValue}
                          size={200}
                          level="H"
                          includeMargin={true}
                          className="qr-code"
                        />
                      )}
                    </div>
                    <p className="text-center text-sm text-gray-700 dark:text-gray-300 font-medium">
                      <span aria-hidden="true">📱</span> {t('visitor.presentQR')}
                    </p>
                    <p className="qr-code-text">
                      Visit Code: <strong>{visitCode}</strong>
                    </p>

                    {/* Phase 1.2: Save Pass Button */}
                    <Button
                      onClick={() => setShowSavePassModal(true)}
                      className="w-full mt-4 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-green-700 font-medium py-3 px-4 rounded-xl border-2 border-green-200 hover:border-green-300 transition-colors shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {t('visitor.savePassToDevice')}
                    </Button>
                  </div>
                </>
              )}
              <div className="details-section">
                <h2>{t('visitor.visitDetails')}</h2>
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
                <div className="status-message status-message-pending" data-tour="visitor-confirm">
                  <p>⏳ <strong>{t('visitor.awaitingApproval')}</strong></p>
                  <p>{t('visitor.awaitingApprovalMsg')}</p>
                </div>
              )}
              {visitor.status === 'approved' && (
                <div className="status-message status-message-success" data-tour="visitor-confirm">
                  <p>✅ <strong>{t('visitor.visitApproved')}</strong></p>
                  <p>{t('visitor.visitApprovedMsg')}</p>
                </div>
              )}
              {visitor.status === 'rejected' && (
                <div className="status-message status-message-error">
                  <p>❌ <strong>{t('visitor.visitDenied')}</strong></p>
                  <p>{t('visitor.visitDeniedMsg')}</p>
                </div>
              )}
              {estateInfo && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 md:p-6">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {t('visitor.estateDetails')}
                  </h3>
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900 dark:text-white">{estateInfo.name}</p>
                    {estateInfo.address && (
                      <p className="text-gray-600 dark:text-gray-200 text-sm flex items-start">
                        <svg className="w-4 h-4 mr-1 mt-0.5 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {estateInfo.address}
                      </p>
                    )}
                    {estateInfo.contact && (
                      <p className="text-gray-600 dark:text-gray-200 text-sm flex items-center">
                        <svg className="w-4 h-4 mr-1 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              {t('visitor.inviteValidUntil')} {formatDate(visitor.tokenExpiresAt)}
            </p>
            <Button className="btn-refresh" onClick={fetchVisitorDetails}>
              🔄 {t('visitor.refreshStatus')}
            </Button>
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
