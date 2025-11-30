// Enhanced AddVisitor form with real-time validation
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useCurrentRole } from "../../hooks/useCurrentRole";
import { createVisitor, createPass } from "../../services/visitorService";
import { handleApiError } from "../../utils/errorMapper";
import { Button, Card, Badge, ErrorDisplay, SuccessDisplay, ValidatedForm, FormField } from "../../components/ui";
import PageHeader from "../../components/PageHeader";
import AppShell from "../../layouts/AppShell";
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

const AddVisitorEnhanced = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [generatedPass, setGeneratedPass] = useState(null);

  // Initial form values
  const initialValues = {
    name: "",
    phone: "",
    email: "",
    dateOfVisit: "",
    time: "",
    purpose: "",
    generatePassImmediately: true
  };

  // Handle form submission
  const handleSubmit = async (formData) => {
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      // Create visitor
      const visitor = await createVisitor(formData);
      
      if (formData.generatePassImmediately) {
        // Generate pass immediately
        const pass = await createPass(visitor.id);
        setGeneratedPass(pass);
        setSuccess("Visitor created and pass generated successfully!");
      } else {
        setSuccess("Visitor created successfully! You can generate a pass later.");
      }

      return visitor;
    } catch (err) {
      const errorMessage = handleApiError(err, "Creating visitor");
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setError("");
    setSuccess(null);
    setGeneratedPass(null);
  };

  const { logout } = useAuth();
  const role = useCurrentRole();
  
  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <AppShell role={role} title="Add Visitor" onLogout={onLogout}>
      <PageHeader
        title="Add Visitor"
        subtitle="Create a new visitor invitation with enhanced validation"
        showBackButton
        onBack={() => navigate('/dashboard/resident')}
        actions={
          <Button
            variant="outline"
            onClick={resetForm}
            disabled={loading}
          >
            Reset Form
          </Button>
        }
      />

      {/* Error and Success Messages */}
      {error && <ErrorDisplay message={error} onDismiss={() => setError("")} />}
      {success && <SuccessDisplay message={success} onDismiss={() => setSuccess(null)} />}

      {/* Generated Pass Display */}
      {generatedPass && (
        <Card className="mb-6">
          <Card.Header>
            <Card.Title className="text-slate-200">Generated Visitor Pass</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                <img 
                  src={generatedPass.qrCode} 
                  alt="Visitor QR Code" 
                  className="w-48 h-48"
                />
              </div>
              <p className="text-slate-400 mb-4">
                Share this QR code with the visitor for easy check-in.
              </p>
              <div className="flex justify-center space-x-3">
                <Button
                  variant="primary"
                  onClick={() => window.print()}
                >
                  Print Pass
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPass.qrCode);
                    setSuccess("QR code copied to clipboard!");
                  }}
                >
                  Copy QR Code
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Enhanced Form with Validation */}
      <ValidatedForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitButtonText="Create Visitor"
        resetButtonText="Clear Form"
        showValidationSummary={true}
        validationOptions={{
          validateOnChange: true,
          validateOnBlur: true,
          validateOnSubmit: true,
          debounceDelay: 300
        }}
      >
        {(formValidation) => (
          <div className="space-y-6">
            {/* Visitor Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Visitor Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="name"
                  label="Full Name"
                  type="text"
                  required
                  placeholder="Enter visitor's full name"
                  icon={<User className="w-4 h-4" />}
                  validationType="name"
                  example="John Doe"
                  formValidation={formValidation}
                />

                <FormField
                  name="phone"
                  label="Phone Number"
                  type="tel"
                  required
                  placeholder="0xxxxxxxxx"
                  icon={<Phone className="w-4 h-4" />}
                  validationType="phone"
                  example="0712345678"
                  formValidation={formValidation}
                />
              </div>

              <div className="mt-6">
                <FormField
                  name="email"
                  label="Email Address"
                  type="email"
                  placeholder="visitor@example.com"
                  icon={<Mail className="w-4 h-4" />}
                  validationType="email"
                  example="john.doe@example.com"
                  formValidation={formValidation}
                />
              </div>
            </div>

            {/* Visit Details Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Visit Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="dateOfVisit"
                  label="Visit Date"
                  type="date"
                  required
                  icon={<Calendar className="w-4 h-4" />}
                  validationType="date"
                  formValidation={formValidation}
                />

                <FormField
                  name="time"
                  label="Visit Time"
                  type="time"
                  required
                  icon={<Clock className="w-4 h-4" />}
                  validationType="time"
                  formValidation={formValidation}
                />
              </div>

              <div className="mt-6">
                <FormField
                  name="purpose"
                  label="Purpose of Visit"
                  type="text"
                  required
                  placeholder="Describe the purpose of the visit..."
                  icon={<FileText className="w-4 h-4" />}
                  validationType="required"
                  example="Meeting with resident, delivery, maintenance, etc."
                  formValidation={formValidation}
                />
              </div>
            </div>

            {/* Pass Generation Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
                <QrCode className="w-5 h-5 mr-2" />
                Pass Generation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all ${
                    formValidation.values.generatePassImmediately === true 
                      ? 'ring-2 ring-brand-500 bg-brand-500/10' 
                      : 'hover:bg-slate-800'
                  }`}
                  onClick={() => formValidation.handleFieldChange('generatePassImmediately', true)}
                >
                  <Card.Content className="p-4 text-center">
                    <QrCode className="w-8 h-8 text-brand-500 mx-auto mb-2" />
                    <h4 className="font-medium text-slate-200">Generate Now</h4>
                    <p className="text-sm text-slate-400">Create QR code immediately</p>
                  </Card.Content>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all ${
                    formValidation.values.generatePassImmediately === false 
                      ? 'ring-2 ring-brand-500 bg-brand-500/10' 
                      : 'hover:bg-slate-800'
                  }`}
                  onClick={() => formValidation.handleFieldChange('generatePassImmediately', false)}
                >
                  <Card.Content className="p-4 text-center">
                    <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <h4 className="font-medium text-slate-200">Generate Later</h4>
                    <p className="text-sm text-slate-400">Create pass when needed</p>
                  </Card.Content>
                </Card>
              </div>
            </div>

            {/* Form Status Display */}
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-200 mb-3">Form Status</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Valid Fields:</span>
                  <span className="ml-2 text-green-400">
                    {formValidation.getValidationSummary().validFields}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Invalid Fields:</span>
                  <span className="ml-2 text-red-400">
                    {formValidation.getValidationSummary().invalidFields}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Warnings:</span>
                  <span className="ml-2 text-yellow-400">
                    {formValidation.getValidationSummary().warningFields}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Validating:</span>
                  <span className="ml-2 text-blue-400">
                    {formValidation.getValidationSummary().validatingFields}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </ValidatedForm>
    </AppShell>
  );
};

export default AddVisitorEnhanced;
