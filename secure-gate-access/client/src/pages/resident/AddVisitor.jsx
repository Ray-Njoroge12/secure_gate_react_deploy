// client/src/pages/resident/AddVisitor.jsx
import React, { useState, useEffect } from "react";
import logger from 'utils/logger';
import { useNavigate } from "react-router-dom";
import { createVisitor, createPass } from "../../services/visitorService";
import { useError } from "../../contexts/ErrorContext";
import { useLoading } from "../../contexts/LoadingContext";
import { Button, Input, Card, Badge, ValidatedForm } from "../../components/ui";
import ValidatedInput from "../../components/ui/ValidatedInput";
import { commonRules } from "../../utils/validationRules";
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
  Loader2
} from "lucide-react";

const AddVisitor = () => {
  const navigate = useNavigate();
  const { handleError, handleSuccess, handleApiError, handleValidationError, clearAllErrors } = useError();
  const { setLoading, isLoading } = useLoading();
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    dateOfVisit: "",
    time: "",
    purpose: "",
    generatePassImmediately: true,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isLoading('addVisitor')) {
          handleSubmit(e);
        }
      }
      // Ctrl/Cmd + R to reset
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        resetForm();
      }
      // Escape to clear errors
      if (e.key === 'Escape') {
        clearAllErrors();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, clearAllErrors]);
  
  const [validationErrors, setValidationErrors] = useState({});

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
    
    if (!formData.purpose.trim()) {
      errors.purpose = "Purpose of visit is required";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      handleValidationError(validationErrors, 'Add Visitor Form');
      return;
    }

    setLoading('addVisitor', true, { message: 'Creating visitor...' });
    clearAllErrors();

    try {
      // Create visitor
      const visitorData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        dateOfVisit: formData.dateOfVisit,
        time: formData.time,
        purpose: formData.purpose.trim(),
      };

      if (process.env.NODE_ENV === 'development') {
        logger.debug('[DEBUG] Sending visitor data:', visitorData);
      }
      const visitorResponse = await createVisitor(visitorData);
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[DEBUG] Visitor response:', visitorResponse);
      }
      
      let passResponse = null;
      if (formData.generatePassImmediately) {
        try {
          passResponse = await createPass(visitorResponse.id);
        } catch (passError) {
          if (process.env.NODE_ENV === 'development') {
            logger.warn('[WARN] Pass generation failed:', passError);
          }
        }
      }

      handleSuccess('Visitor created successfully!', {
        context: 'Add Visitor',
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
        setValidationErrors({});
      }, 2000);

    } catch (err) {
      logger.error('Visitor creation error:', err);
      logger.error('Error details:', {
        message: err.message,
        status: err.status,
        response: err.response
      });
      handleApiError(err, 'Add Visitor');
    } finally {
      setLoading('addVisitor', false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
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
      generatePassImmediately: true,
    });
    clearAllErrors();
    setValidationErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/resident')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Go back to resident dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Create Visitor</h1>
              <p className="text-slate-400">Add a new visitor and generate access credentials</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <Card.Content className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ValidatedInput
                    name="name"
                    label="Full Name"
                    placeholder="Enter visitor's full name"
                    value={formData.name}
                    onChange={(value) => handleInputChange('name', value)}
                    disabled={isLoading('addVisitor')}
                    required
                    validationRules={[commonRules.requiredName]}
                    icon={<User className="w-4 h-4" />}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                  />

                  <ValidatedInput
                    name="phone"
                    label="Phone Number"
                    placeholder="0xxxxxxxxx"
                    value={formData.phone}
                    onChange={(value) => handleInputChange('phone', value)}
                    disabled={isLoading('addVisitor')}
                    required
                    validationRules={[commonRules.requiredPhone]}
                    helpText="Format: 0xxxxxxxxx (10 digits)"
                    icon={<Phone className="w-4 h-4" />}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>

                <ValidatedInput
                  name="email"
                  label="Email Address"
                  type="email"
                  placeholder="visitor@example.com (optional)"
                  value={formData.email}
                  onChange={(value) => handleInputChange('email', value)}
                  disabled={isLoading('addVisitor')}
                  validationRules={[commonRules.emailFormat]}
                  icon={<Mail className="w-4 h-4" />}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                />
              </div>

              {/* Visit Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Visit Details
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ValidatedInput
                    name="dateOfVisit"
                    label="Date of Visit"
                    type="date"
                    value={formData.dateOfVisit}
                    onChange={(value) => handleInputChange('dateOfVisit', value)}
                    disabled={isLoading('addVisitor')}
                    required
                    validationRules={[commonRules.requiredDate]}
                    icon={<Calendar className="w-4 h-4" />}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />

                  <ValidatedInput
                    name="time"
                    label="Time of Visit"
                    type="time"
                    value={formData.time}
                    onChange={(value) => handleInputChange('time', value)}
                    disabled={isLoading('addVisitor')}
                    required
                    validationRules={[(value) => commonRules.requiredTime(value, formData.dateOfVisit)]}
                    icon={<Clock className="w-4 h-4" />}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>

                <ValidatedInput
                  name="purpose"
                  label="Purpose of Visit"
                  placeholder="e.g., visit, delivery, meeting, maintenance"
                  value={formData.purpose}
                  onChange={(value) => handleInputChange('purpose', value)}
                  disabled={isLoading('addVisitor')}
                  required
                  validationRules={[commonRules.requiredName]}
                  icon={<FileText className="w-4 h-4" />}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                />
              </div>

              {/* QR Pass Option */}
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="generatePass"
                    checked={formData.generatePassImmediately}
                    onChange={(e) => handleInputChange('generatePassImmediately', e.target.checked)}
                    disabled={loading}
                    className="mt-1 h-4 w-4 text-green-600 bg-slate-800 border-slate-600 rounded focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="generatePass" className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <QrCode className="w-4 h-4" />
                      Generate QR pass immediately
                      <Badge variant="info" size="sm">Recommended</Badge>
                    </label>
                    <p className="text-xs text-slate-400 mt-1">
                      Auto-approve and create access pass without manual review
                    </p>
                  </div>
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
                  disabled={isLoading('addVisitor')}
                  className="flex-1 sm:flex-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 min-h-[44px]"
                >
                  {isLoading('addVisitor') ? (
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

      {/* Error and Success messages are now handled by ErrorContext */}
    </div>
  );
};

export default AddVisitor;