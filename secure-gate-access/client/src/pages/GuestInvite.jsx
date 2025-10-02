// client/src/pages/GuestInvite.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { completeInvite, getBulkInvite } from '../services/visitorService';
import { handleApiError, mapSuccessMessage } from '../utils/errorMapper';
import QRCodeDisplay from '../components/QRCodeDisplay';
import { Button, Input, Card, Badge, Loading, StatusAnnouncement } from '../components/ui';

export default function GuestInvite() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [visitor, setVisitor] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load invite details on mount
  useEffect(() => {
    if (!inviteCode) {
      setError('Invalid invitation link.');
      setLoading(false);
      return;
    }

    loadInviteData();
  }, [inviteCode]);

  const loadInviteData = async () => {
    try {
      setLoading(true);
      const data = await getBulkInvite(inviteCode);
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
  };

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

    setSubmitting(true);
    setError('');

    try {
      const result = await completeInvite(inviteCode, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim()
      });

      setVisitor(result);
      setSuccess(mapSuccessMessage('invite_completed'));
      
      // Clear form
      setFormData({ name: '', phone: '', email: '' });
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" overlay={false} />
        <StatusAnnouncement message="Loading invitation details..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 xs:py-6 sm:py-8 px-4 xs:px-6 sm:px-8">
      <div className="max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg mx-auto">
        <Card>
          <Card.Header>
            <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900 text-center">Guest Invitation</h1>
            {inviteData && (
              <div className="mt-3 xs:mt-4 text-center">
                <Badge variant="info" className="mb-2 text-xs xs:text-sm">
                  {inviteData.eventName || inviteData.event_name}
                </Badge>
                <div className="text-xs xs:text-sm text-gray-600 space-y-1">
                  <p>{inviteData.date} at {inviteData.time}</p>
                  {inviteData.numGuests && (
                    <p>Up to {inviteData.numGuests} guests</p>
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
                {visitor.qr_code && (
                  <div className="flex justify-center w-full">
                    <QRCodeDisplay 
                      value={visitor.qr_code} 
                      otp={process.env.NODE_ENV === 'development' ? (visitor.debug_otp || visitor.otp) : visitor.otp}
                      showCopyButton={true}
                    />
                  </div>
                )}

                {/* Visitor Details */}
                <Card className="bg-gray-50">
                  <Card.Header>
                    <h3 className="font-medium text-gray-900">Your Visit Details</h3>
                  </Card.Header>
                  <Card.Content>
                    <div className="text-sm text-gray-600 space-y-2">
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

                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                  <p className="font-medium text-blue-800 mb-1">Entry Instructions:</p>
                  <p>Present the QR code above at the gate, or provide the OTP to security.</p>
                </div>

                <Button
                  variant="outline"
                  onClick={handleNewInvite}
                  className="w-full min-h-touch"
                  size="lg"
                >
                  Register Another Guest
                </Button>
              </div>
            )}

            {/* Form State - Complete Invitation */}
            {!visitor && (
              <div className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Full Name"
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
                    label="Phone Number"
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
                    label="Email Address"
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

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={submitting}
                    loading={submitting}
                    className="w-full min-h-touch"
                  >
                    Complete Invitation
                  </Button>
                </form>

                {/* Expired/Not Found State */}
                {!inviteData && !loading && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="text-sm text-yellow-700">
                      ⚠️ This invitation may have expired or is invalid. You can still complete your information above.
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card.Content>

          <Card.Footer>
            <div className="text-center text-xs text-gray-500">
              Powered by SecureGate Access System
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