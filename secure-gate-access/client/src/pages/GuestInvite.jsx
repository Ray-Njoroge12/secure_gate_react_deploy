// client/src/pages/GuestInvite.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import QRCodeDisplay from '../components/QRCodeDisplay';
import { Badge, Button, Card, Input, Loading, StatusAnnouncement } from '../components/ui';
import Icon from '../components/ui/Icon';
import { useI18n } from '../i18n/index.js';
import { completeInvite, getPublicInvite } from '../services/visitorService';
import { handleApiError, mapSuccessMessage } from '../utils/errorMapper';

// Calendar generation utilities
const generateICSFile = (eventData) => {
  const { title, description, location, startDate, startTime, endTime } = eventData;

  // Parse date and time
  const [year, month, day] = startDate.split('-').map(Number);
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = (endTime || `${startHour + 1}:${startMinute}`).split(':').map(Number);

  // Format dates for ICS (YYYYMMDDTHHMMSS)
  const formatDate = (y, m, d, h, min) =>
    `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}${String(min).padStart(2, '0')}00`;

  const dtStart = formatDate(year, month, day, startHour, startMinute);
  const dtEnd = formatDate(year, month, day, endHour, endMinute);
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SecureGate Access//Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `DTSTAMP:${dtStamp}`,
    `UID:${Date.now()}@securegate.com`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    location ? `LOCATION:${location}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');

  return icsContent;
};

const generateGoogleCalendarUrl = (eventData) => {
  const { title, description, location, startDate, startTime, endTime } = eventData;

  const [year, month, day] = startDate.split('-').map(Number);
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = (endTime || `${startHour + 1}:${startMinute}`).split(':').map(Number);

  const formatDate = (y, m, d, h, min) =>
    `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}${String(min).padStart(2, '0')}00`;

  const dates = `${formatDate(year, month, day, startHour, startMinute)}/${formatDate(year, month, day, endHour, endMinute)}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: dates,
    details: description,
    location: location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Add to Calendar component
const AddToCalendarButton = ({ inviteData, visitorName }) => {
  const [showOptions, setShowOptions] = useState(false);
  const menuId = `calendar-options-${inviteData?.inviteCode || 'guest'}`;

  if (!inviteData?.date || !inviteData?.time) return null;

  const eventData = {
    title: `Visit: ${inviteData.eventName || inviteData.event_name || 'Scheduled Visit'}`,
    description: `Visitor: ${visitorName}\n\nRemember to bring your QR code or OTP for entry.\n\nPowered by SecureGate Access System`,
    location: inviteData.location || 'Gate Entry',
    startDate: inviteData.date,
    startTime: inviteData.time,
    endTime: null, // Will default to 1 hour
  };

  const handleDownloadICS = () => {
    const icsContent = generateICSFile(eventData);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visit-${inviteData.date}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowOptions(false);
  };

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl(eventData);
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowOptions(false);
  };

  const handleShareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `📅 Visit Scheduled!\n\n` +
      `Event: ${eventData.title}\n` +
      `Date: ${inviteData.date}\n` +
      `Time: ${inviteData.time}\n\n` +
      `Don't forget to bring your QR code or OTP for entry!`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer');
    setShowOptions(false);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowOptions(!showOptions)}
        aria-haspopup="menu"
        aria-expanded={showOptions}
        aria-controls={showOptions ? menuId : undefined}
        className="w-full flex items-center justify-center gap-2"
      >
        <Icon name="Calendar" className="w-4 h-4" />
        Add to Calendar
      </Button>

      {showOptions && (
        <>
          {/* Backdrop */}
          <div
            role="presentation"
            aria-hidden="true"
            className="fixed inset-0 z-10"
            onClick={() => setShowOptions(false)}
          />

          {/* Dropdown Menu */}
          <div
            id={menuId}
            role="menu"
            aria-label="Add to calendar options"
            className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden z-20"
          >
            <Button
              variant="ghost"
              onClick={handleGoogleCalendar}
              role="menuitem"
              className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-3 rounded-none"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google Calendar
            </Button>

            <Button
              variant="ghost"
              onClick={handleDownloadICS}
              role="menuitem"
              className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-3 border-t border-gray-100 dark:border-slate-700 rounded-none"
            >
              <Icon name="Download" className="w-5 h-5 text-gray-500 dark:text-gray-300" />
              Download .ics (Apple/Outlook)
            </Button>

            <Button
              variant="ghost"
              onClick={handleShareViaWhatsApp}
              role="menuitem"
              className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-3 border-t border-gray-100 dark:border-slate-700 rounded-none"
            >
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Share via WhatsApp
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default function GuestInvite() {
  const { inviteCode } = useParams();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    idNumber: '',
    vehiclePlate: ''
  });
  const [consentGiven, setConsentGiven] = useState(false);
  const [visitor, setVisitor] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inviteTitle = inviteData?.eventName || inviteData?.event_name || (inviteData?.type === 'single' ? 'Visit' : 'Guest Invitation');
  const inviteDate = inviteData?.date || inviteData?.dateOfVisit || inviteData?.date_of_visit || '';
  const inviteTime = inviteData?.time || inviteData?.timeOfVisit || inviteData?.time_of_visit || '';
  const inviteTotalGuests = inviteData?.numGuests || inviteData?.num_guests;
  const inviteRemainingSlots = inviteData?.remainingSlots;

  const loadInviteData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPublicInvite(inviteCode);
      setInviteData(data);
      setError('');
    } catch (err) {
      setError(handleApiError(err, 'Loading invitation'));
      // If invite not found or expired, still show form for better UX
      if (err.status === 404 || err.status === 410) {
        setInviteData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [inviteCode]);

  // Load invite details on mount
  useEffect(() => {
    if (!inviteCode) {
      setError('Invalid invitation link.');
      setLoading(false);
      return;
    }

    loadInviteData();
  }, [inviteCode, loadInviteData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!formData.phone.trim() && !formData.email.trim()) {
      setError('Please provide either phone number or email address.');
      return;
    }

    if (!formData.idNumber.trim()) {
      setError('ID Number is required for security verification.');
      return;
    }

    if (!consentGiven) {
      setError('You must agree to the data processing terms to continue.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await completeInvite(inviteCode, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        idNumber: formData.idNumber.trim(),
        vehiclePlate: formData.vehiclePlate.trim().toUpperCase(),
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
        consent_type: 'visitor_registration',
        consent_version: '1.0'
      });

      setVisitor(result);
      setSuccess(mapSuccessMessage('invite_completed'));

      // Clear form
      setFormData({ name: '', phone: '', email: '', idNumber: '', vehiclePlate: '' });
      setConsentGiven(false);
    } catch (err) {
      setError(handleApiError(err, 'Completing invitation'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewInvite = () => {
    setVisitor(null);
    setSuccess('');
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Loading size="lg" overlay={false} />
        <StatusAnnouncement message="Loading invitation details..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-4 xs:py-6 sm:py-8 px-4 xs:px-6 sm:px-8">
      <div className="max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg mx-auto">
        <Card>
          <Card.Header>
            <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center">{t('visitor.guestInvitation')}</h1>
            {inviteData && (
              <div className="mt-3 xs:mt-4 text-center">
                <Badge variant="info" className="mb-2 text-xs xs:text-sm">
                  {inviteTitle}
                </Badge>
                <div className="text-xs xs:text-sm text-gray-600 dark:text-gray-200 space-y-1">
                  {(inviteDate || inviteTime) && (
                    <p>
                      {inviteDate || 'Date TBD'}{inviteTime ? ` at ${inviteTime}` : ''}
                    </p>
                  )}
                  {typeof inviteRemainingSlots === 'number' && (
                    <p>Slots remaining: {inviteRemainingSlots}</p>
                  )}
                  {inviteTotalGuests && (
                    <p>Up to {inviteTotalGuests} guests</p>
                  )}
                </div>
              </div>
            )}
          </Card.Header>

          <Card.Content>
            {/* Success State - Show QR and OTP */}
            {visitor && (
              <div className="text-center space-y-4">
                <Badge variant="success" size="lg">
                  ✓ {success}
                </Badge>

                {/* Display QR Code */}
                {(visitor.qrCode || visitor.qr_code) && (
                  <div className="flex justify-center w-full">
                    <QRCodeDisplay
                      value={visitor.qrCode || visitor.qr_code}
                      otp={visitor.debugOtp || visitor.debug_otp || visitor.otp}
                      showCopyButton={true}
                    />
                  </div>
                )}

                {/* Visitor Details */}
                <Card className="bg-gray-50 dark:bg-slate-800/50">
                  <Card.Header>
                    <h3 className="font-medium text-gray-900 dark:text-white">{t('visitor.yourVisitDetails')}</h3>
                  </Card.Header>
                  <Card.Content>
                    <div className="text-sm text-gray-600 dark:text-gray-200 space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Name:</span>
                        <span>{visitor.name}</span>
                      </div>
                      {visitor.phone && (
                        <div className="flex justify-between">
                          <span className="font-medium">Phone:</span>
                          <span>{visitor.phone}</span>
                        </div>
                      )}
                      {visitor.email && (
                        <div className="flex justify-between">
                          <span className="font-medium">Email:</span>
                          <span>{visitor.email}</span>
                        </div>
                      )}
                    </div>
                  </Card.Content>
                </Card>

                <div className="text-sm text-gray-600 dark:text-gray-200 bg-blue-50 p-3 rounded-md">
                  <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">{t('visitor.entryInstructions')}</p>
                  <p>{t('visitor.entryInstructionsMsg')}</p>
                </div>

                {/* Add to Calendar Button */}
                {inviteData && (
                  <AddToCalendarButton
                    inviteData={{ ...inviteData, date: inviteDate, time: inviteTime, eventName: inviteTitle }}
                    visitorName={visitor.name}
                  />
                )}

                <Button
                  variant="outline"
                  onClick={handleNewInvite}
                  className="w-full min-h-touch"
                  size="lg"
                >
                  {t('visitor.registerAnotherGuest')}
                </Button>
              </div>
            )}

            {/* Form State - Complete Invitation */}
            {!visitor && (
              <div className="space-y-4">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                    <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label={t('visitor.fullName')}
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                    disabled={submitting}
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    }
                  />

                  <Input
                    label={t('visitor.phoneNumber')}
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g., +1234567890"
                    disabled={submitting}
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    }
                  />

                  <Input
                    label={t('visitor.emailAddress')}
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your.email@example.com"
                    disabled={submitting}
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    }
                    helperText="Provide either phone number or email for notifications"
                  />

                  <Input
                    label={t('visitor.idPassportNumber')}
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleInputChange}
                    placeholder="National ID or Passport Number"
                    required
                    disabled={submitting}
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    }
                  />

                  <Input
                    label={t('visitor.vehicleRegistration')}
                    name="vehiclePlate"
                    value={formData.vehiclePlate}
                    onChange={handleInputChange}
                    placeholder="KBZ 123A"
                    disabled={submitting}
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2h5a2 2 0 012 2m0 0h2a2 2 0 012 2v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 012-2z" />
                      </svg>
                    }
                  />

                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-900 rounded-md">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      disabled={submitting}
                      className="mt-1 h-4 w-4 text-brand-600 border-gray-300 dark:border-slate-600 rounded focus:ring-brand-500"
                    />
                    <label htmlFor="consent" className="text-sm text-gray-600 dark:text-gray-200">
                      {t('visitor.kdpaConsent')}
                    </label>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={submitting || !consentGiven}
                    loading={submitting}
                    className="w-full min-h-touch"
                  >
                    {t('visitor.completeInvitation')}
                  </Button>
                </form>

                {!inviteData && !loading && (error === 'Invite not found or has expired' || error.includes('expired')) && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-3">
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      This invitation may have expired or is invalid. If you believe this is an error, please contact the host.
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card.Content>

          <Card.Footer>
            <div className="text-center text-xs text-gray-500 dark:text-gray-300">
              {t('visitor.poweredBy')}
            </div>
          </Card.Footer>
        </Card>
      </div>

      <StatusAnnouncement
        message={
          submitting ? "Completing invitation..." :
            visitor ? "Invitation completed successfully" :
              ""
        }
      />
    </div>
  );
}
