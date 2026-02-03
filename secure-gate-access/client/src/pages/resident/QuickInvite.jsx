/**
 * QuickInvite.jsx
 * Simplified visitor invitation flow
 * 
 * Key Improvements:
 * - Only 3-4 fields (vs 7+ before)
 * - Quick date/time selection chips
 * - Consent moved to visitor-facing page (VisitorInvitePage)
 * - Cleaner, more focused UI
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createVisitor } from "../../services/visitorService";
import { handleApiError } from "../../utils/errorMapper";
import logger from "../../utils/logger";
import { Button, Input, Card } from "../../components/ui";
import {
  User,
  Phone,
  Calendar,
  Clock,
  ArrowLeft,
  Loader2,
  Send,
  CheckCircle,
  Info,
  Smartphone,
  Copy,
  Share2,
  MessageCircle,
  Contact
} from "lucide-react";
import useContactPicker from "../../hooks/useContactPicker";

const QuickInvite = () => {
  const navigate = useNavigate();
  const { isSupported: contactPickerSupported, pickContact, loading: pickingContact } = useContactPicker();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    dateOfVisit: "",
    time: "",
    allowResidenceLocation: false,
    unitPin: "",
  });

  // Check for URL params (e.g. from "Favorites" list)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nameParam = params.get('name');
    const phoneParam = params.get('phone');

    if (nameParam || phoneParam) {
      setFormData(prev => ({
        ...prev,
        name: nameParam || prev.name,
        phone: phoneParam || prev.phone
      }));
    }
  }, []);

  const handlePickContact = async () => {
    const contact = await pickContact({ properties: ['name', 'tel'] });
    if (contact) {
      setFormData(prev => ({
        ...prev,
        name: contact.name || prev.name,
        phone: contact.phone || prev.phone
      }));
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [selectedDateChip, setSelectedDateChip] = useState(null);
  const [selectedTimeChip, setSelectedTimeChip] = useState(null);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [copied, setCopied] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);

  // Get today and tomorrow dates
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDateDisplay = (date) => {
    return date.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Date chips configuration
  const dateChips = [
    { id: 'today', label: 'Today', sublabel: formatDateDisplay(today), value: formatDateForInput(today) },
    { id: 'tomorrow', label: 'Tomorrow', sublabel: formatDateDisplay(tomorrow), value: formatDateForInput(tomorrow) },
    { id: 'dayafter', label: formatDateDisplay(dayAfter), sublabel: '', value: formatDateForInput(dayAfter) },
    { id: 'custom', label: 'Pick Date', sublabel: '📅', value: null },
  ];

  // Time chips configuration
  const timeChips = [
    { id: 'morning', label: 'Morning', sublabel: '~9:00 AM', value: '09:00' },
    { id: 'afternoon', label: 'Afternoon', sublabel: '~2:00 PM', value: '14:00' },
    { id: 'evening', label: 'Evening', sublabel: '~6:00 PM', value: '18:00' },
    { id: 'custom', label: 'Pick Time', sublabel: '⏰', value: null },
  ];

  // Handle date chip selection
  const handleDateChipClick = (chip) => {
    setSelectedDateChip(chip.id);
    if (chip.id === 'custom') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      setFormData(prev => ({ ...prev, dateOfVisit: chip.value }));
    }
    if (validationErrors.dateOfVisit) {
      setValidationErrors(prev => ({ ...prev, dateOfVisit: null }));
    }
  };

  // Handle time chip selection
  const handleTimeChipClick = (chip) => {
    setSelectedTimeChip(chip.id);
    if (chip.id === 'custom') {
      setShowCustomTime(true);
    } else {
      setShowCustomTime(false);
      setFormData(prev => ({ ...prev, time: chip.value }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Guest name is required";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else {
      // Allow spaces, dashes, + prefix
      const cleaned = formData.phone.replace(/[\s-]/g, '');
      if (cleaned.length < 9 || cleaned.length > 15) {
        errors.phone = "Enter a valid phone number";
      }
    }

    if (!formData.dateOfVisit) {
      errors.dateOfVisit = "Please select when they're visiting";
    } else {
      const visitDate = new Date(formData.dateOfVisit);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (visitDate < todayStart) {
        errors.dateOfVisit = "Date cannot be in the past";
      }
    }

    if (formData.allowResidenceLocation && !String(formData.unitPin || '').trim()) {
      errors.unitPin = "Unit PIN is required when sharing residence details";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setError("Please fix the errors below");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      // Create visitor with minimal data - they'll complete the rest
      // Normalize phone number (Auto-fix common formats)
      let rawPhone = formData.phone.trim().replace(/[\s-]/g, '');

      // Default to KE if starts with 07 or 01
      if (rawPhone.startsWith('07') || rawPhone.startsWith('01')) {
        rawPhone = '254' + rawPhone.substring(1);
      }
      // If starts with 7 or 1 and length is 9, assume KE
      else if ((rawPhone.startsWith('7') || rawPhone.startsWith('1')) && rawPhone.length === 9) {
        rawPhone = '254' + rawPhone;
      }
      // Ensure + prefix if missing
      if (!rawPhone.startsWith('+')) {
        rawPhone = '+' + rawPhone;
      }

      const visitorData = {
        name: formData.name.trim(),
        phone: rawPhone,
        dateOfVisit: formData.dateOfVisit,
        time: formData.time || null,
        allowResidenceLocation: !!formData.allowResidenceLocation,
        unitPin: formData.allowResidenceLocation ? String(formData.unitPin || '').trim() : undefined,
        // Note: No consent here - visitor will provide it on their page
        generatePassImmediately: false, // Pass generated after visitor confirms
        status: 'pending_confirmation', // Visitor needs to confirm
      };

      if (process.env.NODE_ENV === 'development') {
        logger.debug('Creating quick invite:', visitorData);
      }

      const response = await createVisitor(visitorData);

      setSuccess({
        message: 'Invite sent! 🎉',
        subtitle: `${formData.name} will receive an SMS with their invite link`,
        data: {
          visitor: response,
          inviteLink: response.inviteLink || `${window.location.origin}/invite/${response.inviteCode}`,
          visitorId: response.id
        }
      });

    } catch (err) {
      logger.error('Quick invite error:', err);
      const errorMessage = handleApiError(err, 'Quick Invite');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'allowResidenceLocation' && !value) {
        next.unitPin = '';
      }
      return next;
    });
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
    if (field === 'allowResidenceLocation' && !value && validationErrors.unitPin) {
      setValidationErrors(prev => ({ ...prev, unitPin: null }));
    }
  };

  // Copy invite link
  const copyInviteLink = async () => {
    if (success?.data?.inviteLink) {
      try {
        await navigator.clipboard.writeText(success.data.inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        logger.error('Copy failed:', err);
      }
    }
  };

  // Share via WhatsApp (direct)
  const shareViaWhatsApp = () => {
    if (success?.data?.inviteLink) {
      const visitorName = formData.name || 'Guest';
      const visitDate = formData.dateOfVisit
        ? new Date(formData.dateOfVisit).toLocaleDateString('en-KE', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        })
        : 'your scheduled date';

      const message = encodeURIComponent(
        `🏠 You're invited!\n\n` +
        `Hi ${visitorName}! You've been invited to visit.\n\n` +
        `📅 Date: ${visitDate}\n` +
        (formData.time ? `⏰ Time: ${formData.time}\n\n` : '\n') +
        `Tap the link below to get your digital pass:\n` +
        `${success.data.inviteLink}\n\n` +
        `Show this pass at the gate for entry. ✅`
      );

      // Use WhatsApp URL scheme - works on mobile and desktop
      const whatsappUrl = `https://wa.me/?text=${message}`;
      window.open(whatsappUrl, '_blank');
      setWhatsappSent(true);
      setTimeout(() => setWhatsappSent(false), 3000);
    }
  };

  // Share via WhatsApp to specific number
  const shareViaWhatsAppDirect = () => {
    if (success?.data?.inviteLink && formData.phone) {
      const visitorName = formData.name || 'Guest';
      const visitDate = formData.dateOfVisit
        ? new Date(formData.dateOfVisit).toLocaleDateString('en-KE', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        })
        : 'your scheduled date';

      // Format phone number for WhatsApp (remove leading 0, add 254)
      let phoneNumber = formData.phone.replace(/\s/g, '');
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '254' + phoneNumber.substring(1);
      } else if (phoneNumber.startsWith('+')) {
        phoneNumber = phoneNumber.substring(1);
      }

      const message = encodeURIComponent(
        `🏠 You're invited!\n\n` +
        `Hi ${visitorName}! You've been invited to visit.\n\n` +
        `📅 Date: ${visitDate}\n` +
        (formData.time ? `⏰ Time: ${formData.time}\n\n` : '\n') +
        `Tap the link below to get your digital pass:\n` +
        `${success.data.inviteLink}\n\n` +
        `Show this pass at the gate for entry. ✅`
      );

      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
      window.open(whatsappUrl, '_blank');
      setWhatsappSent(true);
      setTimeout(() => setWhatsappSent(false), 3000);
    }
  };

  // Share invite link
  const shareInvite = async () => {
    if (success?.data?.inviteLink && navigator.share) {
      try {
        await navigator.share({
          title: 'Visitor Invite',
          text: `You're invited to visit! Use this link to get your pass:`,
          url: success.data.inviteLink,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          logger.error('Share failed:', err);
        }
      }
    }
  };

  // Reset form for new invite
  const createAnother = () => {
    setFormData({ name: "", phone: "", dateOfVisit: "", time: "", allowResidenceLocation: false, unitPin: "" });
    setSuccess(null);
    setSelectedDateChip(null);
    setSelectedTimeChip(null);
    setShowCustomDate(false);
    setShowCustomTime(false);
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Success Card */}
          <Card className="bg-white border-0 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">{success.message}</h2>
              <p className="text-green-100 mt-2">{success.subtitle}</p>
            </div>

            <div className="p-6 space-y-6">

              {/* Access Code Display - NEW */}
              {success.data.inviteCode && (
                <div className="bg-gray-50 rounded-xl p-6 text-center border-2 border-dashed border-gray-300">
                  <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold mb-2">Access Code</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-4xl font-mono font-bold text-gray-900 tracking-wider">
                      {success.data.inviteCode}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(success.data.inviteCode);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Copy Code"
                    >
                      {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Share this code with your guest for entry</p>
                </div>
              )}

              {/* Share options */}
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-200 font-medium">Share invite via:</p>

                {/* WhatsApp Share Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={shareViaWhatsAppDirect}
                    className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {whatsappSent ? '✓ Opening WhatsApp...' : `Send via WhatsApp to ${formData.name}`}
                  </button>

                  <button
                    onClick={shareViaWhatsApp}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-200 rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Share via WhatsApp (choose contact)
                  </button>
                </div>

                {/* Link Copy */}
                <div className="flex gap-2">
                  <button
                    onClick={copyInviteLink}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied Link!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* What happens next (Simplified) */}
              <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-800">
                <p className="flex items-center gap-2 mb-1 font-semibold">
                  <Info className="w-4 h-4" />
                  Next Steps:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>Guest receives SMS with link</li>
                  <li>They confirm details & get QR code</li>
                </ul>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <Button
                  onClick={() => navigate('/dashboard/resident')}
                  className="w-full bg-gray-900 text-white py-3 rounded-xl"
                >
                  Done
                </Button>
                <Button
                  onClick={createAnother}
                  variant="ghost"
                  className="w-full py-3 rounded-xl text-gray-600"
                >
                  Invite Another Guest
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/resident')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-200" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Quick Invite</h1>
              <p className="text-sm text-gray-500 dark:text-gray-300">Invite a guest in seconds</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <Card className="bg-white border-0 rounded-2xl shadow-lg">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error display */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Contact Picker - P6 */}
              {contactPickerSupported && (
                <button
                  type="button"
                  onClick={handlePickContact}
                  disabled={pickingContact || loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl border border-gray-200 text-gray-700 transition-all disabled:opacity-50"
                >
                  <Contact className="w-5 h-5" />
                  {pickingContact ? 'Opening contacts...' : 'Pick from Contacts'}
                </button>
              )}

              {/* Guest Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <User className="w-4 h-4 inline mr-2 text-gray-400" />
                  Guest Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="John Doe"
                  className={`w-full px-4 py-3 rounded-xl border ${validationErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    } focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all`}
                  disabled={loading}
                />
                {validationErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <Phone className="w-4 h-4 inline mr-2 text-gray-400" />
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="0712 345 678"
                    className={`w-full px-4 py-3 rounded-xl border ${validationErrors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all`}
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-300 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  They'll receive an SMS with the invite link
                </p>
                {validationErrors.phone && (
                  <p className="text-red-500 text-xs">{validationErrors.phone}</p>
                )}
              </div>

              {/* Date Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  <Calendar className="w-4 h-4 inline mr-2 text-gray-400" />
                  When are they visiting?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {dateChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => handleDateChipClick(chip)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${selectedDateChip === chip.id
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                    >
                      <div className="text-sm font-medium">{chip.label}</div>
                      {chip.sublabel && (
                        <div className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">{chip.sublabel}</div>
                      )}
                    </button>
                  ))}
                </div>
                {showCustomDate && (
                  <input
                    type="date"
                    value={formData.dateOfVisit}
                    onChange={(e) => handleInputChange('dateOfVisit', e.target.value)}
                    min={formatDateForInput(today)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                )}
                {validationErrors.dateOfVisit && (
                  <p className="text-red-500 text-xs">{validationErrors.dateOfVisit}</p>
                )}
              </div>

              {/* Time Selection (Optional) */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  <Clock className="w-4 h-4 inline mr-2 text-gray-400" />
                  Approximate time <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {timeChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => handleTimeChipClick(chip)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${selectedTimeChip === chip.id
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                    >
                      <div className="text-sm font-medium">{chip.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">{chip.sublabel}</div>
                    </button>
                  ))}
                </div>
                {showCustomTime && (
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Share residence details <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <label className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <input
                    type="checkbox"
                    checked={!!formData.allowResidenceLocation}
                    onChange={(e) => handleInputChange('allowResidenceLocation', e.target.checked)}
                    className="mt-1"
                    disabled={loading}
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Allow unit PIN sharing</div>
                    <div className="text-xs text-gray-600 dark:text-gray-200">
                      If enabled, your guest will see a unit PIN on their pass page. This is optional and can be left off for privacy.
                    </div>
                  </div>
                </label>

                {formData.allowResidenceLocation && (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={formData.unitPin}
                      onChange={(e) => handleInputChange('unitPin', e.target.value)}
                      placeholder="Unit PIN (e.g. A12)"
                      className={`w-full px-4 py-3 rounded-xl border ${validationErrors.unitPin ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        } focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all`}
                      disabled={loading}
                    />
                    {validationErrors.unitPin && (
                      <p className="text-red-500 text-xs">{validationErrors.unitPin}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Info note */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-200">
                <p className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span>
                    Your guest will complete their details and accept the privacy policy when they open the invite link.
                  </span>
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Sending Invite...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
            </form>
          </div>
        </Card>

        {/* Quick tips */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-300">
          <p>💡 Tip: Your guest can add purpose, vehicle info, and more when they open the link</p>
        </div>
      </div>
    </div>
  );
};

export default QuickInvite;
