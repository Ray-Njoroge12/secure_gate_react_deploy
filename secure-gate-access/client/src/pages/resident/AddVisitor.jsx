// client/src/pages/resident/AddVisitor.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createVisitor, createPass } from "../../services/visitorService";
import { handleApiError } from "../../utils/errorMapper";
import logger from "../../utils/logger";
import { Button, Input, Card, Badge, ErrorDisplay, SuccessDisplay, PageHeader } from "../../components/ui";
import ConsentForm from "../../components/ConsentForm";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  FileText, 
  QrCode,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Shield,
  ChevronDown
} from "lucide-react";

// Common visit purposes for quick selection
const VISIT_PURPOSES = [
  { value: '', label: 'Select purpose...', icon: '📋' },
  { value: 'Social Visit', label: 'Social Visit', icon: '👋' },
  { value: 'Family Visit', label: 'Family Visit', icon: '👨‍👩‍👧' },
  { value: 'Delivery', label: 'Delivery', icon: '📦' },
  { value: 'Maintenance/Repair', label: 'Maintenance/Repair', icon: '🔧' },
  { value: 'Cleaning Service', label: 'Cleaning Service', icon: '🧹' },
  { value: 'Business Meeting', label: 'Business Meeting', icon: '💼' },
  { value: 'Construction Work', label: 'Construction Work', icon: '🏗️' },
  { value: 'Healthcare Visit', label: 'Healthcare Visit', icon: '⚕️' },
  { value: 'Real Estate Viewing', label: 'Real Estate Viewing', icon: '🏠' },
  { value: 'Event/Party', label: 'Event/Party', icon: '🎉' },
  { value: 'Custom', label: 'Other (specify)', icon: '✏️' },
];

const AddVisitor = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    dateOfVisit: "",
    time: "",
    purpose: "",
    customPurpose: "",
    generatePassImmediately: true,
  });
  const [showCustomPurpose, setShowCustomPurpose] = useState(false);
  const [consentData, setConsentData] = useState({
    given: false,
    timestamp: null,
    type: 'data_processing',
    version: '1.0'
  });

  // State declarations must come before useEffect
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!loading) {
          handleSubmit(e);
        }
      }
      // Ctrl/Cmd + R to reset
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        resetForm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = "Full name is required";
    }
    
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^0\d{9}$/.test(formData.phone.trim())) {
      errors.phone = "Phone must be in format 0xxxxxxxxx (10 digits)";
    }
    
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!formData.dateOfVisit) {
      errors.dateOfVisit = "Date of visit is required";
    } else {
      const visitDate = new Date(formData.dateOfVisit);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (visitDate < today) {
        errors.dateOfVisit = "Date cannot be in the past";
      }
    }
    
    if (!formData.time) {
      errors.time = "Time of visit is required";
    }
    
    // Purpose validation - check both dropdown and custom
    const effectivePurpose = formData.purpose === 'Custom' 
      ? formData.customPurpose.trim() 
      : formData.purpose.trim();
    if (!effectivePurpose) {
      errors.purpose = "Purpose of visit is required";
    }
    
    // Consent validation
    if (!consentData.given) {
      errors.consent = "Consent is required to process visitor data";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError("Please fix the validation errors below");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      // Determine the effective purpose (dropdown or custom)
      const effectivePurpose = formData.purpose === 'Custom' 
        ? formData.customPurpose.trim() 
        : formData.purpose.trim();

      // Create visitor
      const visitorData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        dateOfVisit: formData.dateOfVisit,
        time: formData.time,
        purpose: effectivePurpose,
        // Include consent data
        consent_given: consentData.given,
        consent_timestamp: consentData.timestamp,
        consent_type: consentData.type,
        consent_version: consentData.version
      };

      if (process.env.NODE_ENV === 'development') {
        logger.debug('Sending visitor data:', visitorData);
      }
      const visitorResponse = await createVisitor(visitorData);
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Visitor response:', visitorResponse);
      }
      
      let passResponse = null;
      if (formData.generatePassImmediately) {
        try {
          passResponse = await createPass(visitorResponse.id);
        } catch (passError) {
          if (process.env.NODE_ENV === 'development') {
            logger.warn('Pass generation failed:', passError);
          }
        }
      }

      setSuccess({
        message: 'Visitor created successfully!',
        data: {
          visitor: visitorResponse,
          pass: passResponse,
          inviteLink: visitorResponse.inviteLink
        }
      });

      // Reset form after success
      setTimeout(() => {
        setFormData({
          name: "",
          phone: "",
          email: "",
          dateOfVisit: "",
          time: "",
          purpose: "",
          generatePassImmediately: true,
        });
        setSuccess(null);
      }, 5000);

    } catch (err) {
      console.error('Visitor creation error:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        response: err.response
      });
      const errorMessage = handleApiError(err, 'Visitor creation');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Handle purpose dropdown - show custom input when "Custom" is selected
    if (field === 'purpose') {
      setShowCustomPurpose(value === 'Custom');
    }
    
    // Clear field-specific validation error
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      dateOfVisit: "",
      time: "",
      purpose: "",
      customPurpose: "",
      generatePassImmediately: true,
    });
    setShowCustomPurpose(false);
    setError("");
    setSuccess(null);
    setValidationErrors({});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="Create Visitor"
        subtitle="Add a new visitor and generate access credentials"
        icon={<User className="w-6 h-6 text-green-600" />}
        showBack={true}
        backTo="/dashboard/resident"
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8">
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <Card.Content className="p-8">
          <form onSubmit={handleSubmit} data-test-id="add-visitor-form" className="space-y-6">
            {/* PHASE B1: Section 1 - Visitor Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
              <h3 className="font-semibold text-gray-900 text-base md:text-lg flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-gray-500" />
                Visitor Information
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    data-test-id="visitor-name"
                    label="Full Name"
                    placeholder="Enter visitor's full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={loading}
                    required
                    error={validationErrors.name}
                    icon={<User className="w-4 h-4" />}
                    className="bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:ring-green-500"
                  />

                  <Input
                    data-test-id="visitor-phone"
                    label="Phone Number"
                    placeholder="0xxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={loading}
                    required
                    error={validationErrors.phone}
                    helperText="Format: 0xxxxxxxxx (10 digits)"
                    icon={<Phone className="w-4 h-4" />}
                    className="bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                <Input
                  data-test-id="visitor-email"
                  label="Email Address"
                  type="email"
                  placeholder="visitor@example.com (optional)"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={loading}
                  error={validationErrors.email}
                  icon={<Mail className="w-4 h-4" />}
                  className="bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>

            {/* PHASE B1: Section 2 - Visit Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
              <h3 className="font-semibold text-gray-900 text-base md:text-lg flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-gray-500" />
                Visit Details
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    data-test-id="visit-date"
                    label="Date of Visit"
                    type="date"
                    name="dateOfVisit"
                    value={formData.dateOfVisit}
                    onChange={(e) => handleInputChange('dateOfVisit', e.target.value)}
                    disabled={loading}
                    required
                    error={validationErrors.dateOfVisit}
                    icon={<Calendar className="w-4 h-4" />}
                    className="bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500"
                  />
                  
                  <Input
                    data-test-id="visit-time"
                    label="Time of Visit"
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    disabled={loading}
                    required
                    error={validationErrors.time}
                    icon={<Clock className="w-4 h-4" />}
                    className="bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                
                {/* Purpose Dropdown */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <FileText className="w-4 h-4 inline mr-2 text-gray-400" />
                    Purpose of Visit <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      data-test-id="visit-purpose"
                      value={formData.purpose}
                      onChange={(e) => handleInputChange('purpose', e.target.value)}
                      disabled={loading}
                      className={`w-full px-4 py-3 rounded-lg border appearance-none bg-white ${
                        validationErrors.purpose 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
                      } focus:outline-none focus:ring-2 focus:ring-green-500/20 pr-10`}
                    >
                      {VISIT_PURPOSES.map((purpose) => (
                        <option key={purpose.value} value={purpose.value}>
                          {purpose.icon} {purpose.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {validationErrors.purpose && (
                    <p className="text-red-500 text-sm">{validationErrors.purpose}</p>
                  )}
                </div>

                {/* Custom Purpose Input (shown when "Custom" is selected) */}
                {showCustomPurpose && (
                  <Input
                    data-test-id="custom-purpose"
                    label="Specify Purpose"
                    name="customPurpose"
                    value={formData.customPurpose}
                    onChange={(e) => handleInputChange('customPurpose', e.target.value)}
                    disabled={loading}
                    required
                    error={validationErrors.purpose}
                    placeholder="Enter the purpose of visit"
                    icon={<FileText className="w-4 h-4" />}
                    className="bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:ring-green-500"
                  />
                )}
              </div>
            </div>

            {/* PHASE B1: Section 3 - Options & Consent */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
              <h3 className="font-semibold text-gray-900 text-base md:text-lg flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-gray-500" />
                Options & Consent
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start md:items-center gap-3 p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="generatePass"
                    name="generatePassImmediately"
                    checked={formData.generatePassImmediately}
                    onChange={(e) => handleInputChange('generatePassImmediately', e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4 mt-1 md:mt-0 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="generatePass" className="text-sm text-gray-700 cursor-pointer flex-1">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-sm md:text-base">Generate QR Pass Immediately</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Creates a QR code pass that the visitor can use for quick check-in
                    </p>
                  </label>
                </div>
                
                {/* Consent Form */}
                <ConsentForm
                  consentData={consentData}
                  onConsentChange={setConsentData}
                  required={true}
                  consentType="data_processing"
                  showDetails={true}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                />
                
                {validationErrors.consent && (
                  <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {validationErrors.consent}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  variant="outline"
                  className="flex-1 min-h-[44px]"
                >
                  Clear Form
                </Button>
                <Button
                  type="submit"
                  data-test-id="submit-invite"
                  disabled={loading}
                  className="flex-1 sm:flex-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-lg transition-all duration-200 min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {formData.generatePassImmediately ? 'Create & Generate Pass' : 'Create Visitor'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>
      </div>

      {/* Error Display */}
      <ErrorDisplay
        error={error}
        onClose={() => setError("")}
        type="error"
        title="Creation Failed"
      />

      {/* Success Display */}
      <SuccessDisplay
        success={success}
        onClose={() => setSuccess(null)}
      />
    </div>
  );
};

export default AddVisitor;