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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <Card.Header>
            <h1 className="text-2xl font-bold text-gray-900 text-center">Guest Invitation</h1>
            {inviteData && (
              <div className="mt-3 text-center">
                <Badge variant="info" className="mb-2">
                  {inviteData.eventName || inviteData.event_name}
                </Badge>
                <div className="text-sm text-gray-600">
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
                  <div className="flex justify-center">
                    <QRCodeDisplay 
                      value={visitor.qr_code} 
                      size={200}
                      otp={visitor.debug_otp || visitor.otp}
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
                  className="w-full"
                >
                  Register Another Guest
                </Button>
              </div>
            )}

            {/* Form State - Complete Invitation */}
            {!visitor && (
              <div className="space-y-4">
                {error && <Toast type="error" message={error} />}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., +1234567890"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                    disabled={submitting}
                  />
                </div>

                <div className="text-xs text-gray-500">
                  * Name is required. Please provide either phone or email for notifications.
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Completing Invitation...
                    </span>
                  ) : (
                    'Complete Invitation'
                  )}
                </button>
              </form>

              {/* Expired/Not Found State */}
              {!inviteData && !loading && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="text-sm text-yellow-700">
                    This invitation may have expired or is invalid. You can still complete your information above, and we'll try to process your request.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-xs text-gray-500">
          Powered by SecureGate Access System
        </div>
      </div>
    </div>
  );
}