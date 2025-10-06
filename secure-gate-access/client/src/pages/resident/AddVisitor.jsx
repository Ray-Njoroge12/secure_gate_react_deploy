// client/src/pages/resident/AddVisitor.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createVisitor, createPass } from "../../services/visitorService";
import { handleApiError } from "../../utils/errorMapper";
import { Button, Input, Card, Badge, ErrorDisplay, SuccessDisplay } from "../../components/ui";
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
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    dateOfVisit: "",
    time: "",
    purpose: "",
    generatePassImmediately: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
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
      setError("Please fix the validation errors below");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(null);

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
        console.log('[DEBUG] Sending visitor data:', visitorData);
      }
      const visitorResponse = await createVisitor(visitorData);
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Visitor response:', visitorResponse);
      }
      
      let passResponse = null;
      if (formData.generatePassImmediately) {
        try {
          passResponse = await createPass(visitorResponse.id);
        } catch (passError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[WARN] Pass generation failed:', passError);
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
    setError("");
    setSuccess(null);
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
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
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
                  <Input
                    label="Full Name"
                    placeholder="Enter visitor's full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={loading}
                    required
                    error={validationErrors.name}
                    icon={<User className="w-4 h-4" />}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                  />

                  <Input
                    label="Phone Number"
                    placeholder="0xxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={loading}
                    required
                    error={validationErrors.phone}
                    helperText="Format: 0xxxxxxxxx (10 digits)"
                    icon={<Phone className="w-4 h-4" />}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="visitor@example.com (optional)"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={loading}
                  error={validationErrors.email}
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
                  <Input
                    label="Date of Visit"
                    type="date"
                    value={formData.dateOfVisit}
                    onChange={(e) => handleInputChange('dateOfVisit', e.target.value)}
                    disabled={loading}
                    required
                    error={validationErrors.dateOfVisit}
                    icon={<Calendar className="w-4 h-4" />}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />

                  <Input
                    label="Time of Visit"
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    disabled={loading}
                    required
                    error={validationErrors.time}
                    icon={<Clock className="w-4 h-4" />}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>

                <Input
                  label="Purpose of Visit"
                  placeholder="e.g., visit, delivery, meeting, maintenance"
                  value={formData.purpose}
                  onChange={(e) => handleInputChange('purpose', e.target.value)}
                  disabled={loading}
                  required
                  error={validationErrors.purpose}
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
                  disabled={loading}
                  className="flex-1 sm:flex-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 min-h-[44px]"
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