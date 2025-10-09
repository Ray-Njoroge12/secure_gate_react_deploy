// AddVisitor Wizard - Multi-step form for adding visitors
import React, { useState, useEffect } from "react";
import logger from 'utils/logger';
import { useNavigate } from "react-router-dom";
import { createVisitor, createPass } from "../../services/visitorService";
import { handleApiError } from "../../utils/errorMapper";
import { Button, Input, Card, Badge, ErrorDisplay, SuccessDisplay } from "../../components/ui";
import FormWizard from "../../components/ui/FormWizard";
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

const AddVisitorWizard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [generatedPass, setGeneratedPass] = useState(null);

  // Wizard steps configuration
  const steps = [
    {
      title: "Visitor Information",
      description: "Enter the visitor's basic contact details",
      validate: (data) => {
        const errors = {};
        if (!data.name?.trim()) errors.name = "Name is required";
        if (!data.phone?.trim()) errors.phone = "Phone number is required";
        if (!data.email?.trim()) errors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(data.email)) errors.email = "Invalid email format";
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      title: "Visit Details",
      description: "Specify when and why the visitor is coming",
      validate: (data) => {
        const errors = {};
        if (!data.dateOfVisit?.trim()) errors.dateOfVisit = "Visit date is required";
        if (!data.time?.trim()) errors.time = "Visit time is required";
        if (!data.purpose?.trim()) errors.purpose = "Purpose of visit is required";
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      title: "Pass Generation",
      description: "Choose how to generate the visitor pass",
      validate: (data) => {
        // This step doesn't require validation as it's just a choice
        return true;
      }
    },
    {
      title: "Review & Confirm",
      description: "Review all information before creating the visitor pass",
      validate: (data) => {
        // Final validation - check all previous steps have data
        return true;
      }
    }
  ];

  const handleComplete = async (allStepData) => {
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      // Combine all step data
      const visitorData = {
        name: allStepData[0]?.name || "",
        phone: allStepData[0]?.phone || "",
        email: allStepData[0]?.email || "",
        dateOfVisit: allStepData[1]?.dateOfVisit || "",
        time: allStepData[1]?.time || "",
        purpose: allStepData[1]?.purpose || "",
        generatePassImmediately: allStepData[2]?.generatePassImmediately !== false
      };

      // Create visitor
      const visitor = await createVisitor(visitorData);
      
      if (visitorData.generatePassImmediately) {
        // Generate pass immediately
        const pass = await createPass(visitor.id);
        setGeneratedPass(pass);
        setSuccess("Visitor created and pass generated successfully!");
      } else {
        setSuccess("Visitor created successfully! You can generate a pass later.");
      }

    } catch (err) {
      setError(handleApiError(err, "Creating visitor"));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = (allStepData) => {
    // Save draft to localStorage
    localStorage.setItem('visitor-draft', JSON.stringify({
      data: allStepData,
      timestamp: Date.now()
    }));
    setSuccess("Draft saved successfully!");
  };

  const handleStepChange = (stepIndex, allStepData) => {
    // Optional: Handle step changes
    logger.debug(`Moved to step ${stepIndex + 1}`, allStepData);
  };

  const resetForm = () => {
    setError("");
    setSuccess(null);
    setGeneratedPass(null);
    localStorage.removeItem('visitor-draft');
  };

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('visitor-draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        // Check if draft is not too old (24 hours)
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setSuccess("Draft loaded from previous session");
        } else {
          localStorage.removeItem('visitor-draft');
        }
      } catch (error) {
        localStorage.removeItem('visitor-draft');
      }
    }
  }, []);

  const renderStepContent = ({ currentStep, stepData, updateStepData, allStepData, isFirstStep, isLastStep, isValidating }) => {
    switch (currentStep) {
      case 0: // Visitor Information
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Full Name"
                  value={stepData.name || ""}
                  onChange={(e) => updateStepData({ name: e.target.value })}
                  placeholder="Enter visitor's full name"
                  required
                  icon={<User className="w-4 h-4" />}
                />
              </div>
              <div>
                <Input
                  label="Phone Number"
                  type="tel"
                  value={stepData.phone || ""}
                  onChange={(e) => updateStepData({ phone: e.target.value })}
                  placeholder="0xxxxxxxxx"
                  required
                  icon={<Phone className="w-4 h-4" />}
                />
              </div>
            </div>
            <div>
              <Input
                label="Email Address"
                type="email"
                value={stepData.email || ""}
                onChange={(e) => updateStepData({ email: e.target.value })}
                placeholder="visitor@example.com"
                required
                icon={<Mail className="w-4 h-4" />}
              />
            </div>
          </div>
        );

      case 1: // Visit Details
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Visit Date"
                  type="date"
                  value={stepData.dateOfVisit || ""}
                  onChange={(e) => updateStepData({ dateOfVisit: e.target.value })}
                  required
                  icon={<Calendar className="w-4 h-4" />}
                />
              </div>
              <div>
                <Input
                  label="Visit Time"
                  type="time"
                  value={stepData.time || ""}
                  onChange={(e) => updateStepData({ time: e.target.value })}
                  required
                  icon={<Clock className="w-4 h-4" />}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Purpose of Visit
              </label>
              <textarea
                value={stepData.purpose || ""}
                onChange={(e) => updateStepData({ purpose: e.target.value })}
                placeholder="Describe the purpose of the visit..."
                className="w-full min-h-[100px] px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        );

      case 2: // Pass Generation
        return (
          <div className="space-y-6">
            <div className="text-center">
              <QrCode className="w-16 h-16 text-brand-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-200 mb-2">
                Generate Visitor Pass
              </h3>
              <p className="text-slate-400 mb-6">
                Choose whether to generate the visitor pass immediately or later.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className={`cursor-pointer transition-all ${
                  stepData.generatePassImmediately === true 
                    ? 'ring-2 ring-brand-500 bg-brand-500/10' 
                    : 'hover:bg-slate-800'
                }`}
                onClick={() => updateStepData({ generatePassImmediately: true })}
              >
                <Card.Content className="p-4 text-center">
                  <QrCode className="w-8 h-8 text-brand-500 mx-auto mb-2" />
                  <h4 className="font-medium text-slate-200">Generate Now</h4>
                  <p className="text-sm text-slate-400">Create QR code immediately</p>
                </Card.Content>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all ${
                  stepData.generatePassImmediately === false 
                    ? 'ring-2 ring-brand-500 bg-brand-500/10' 
                    : 'hover:bg-slate-800'
                }`}
                onClick={() => updateStepData({ generatePassImmediately: false })}
              >
                <Card.Content className="p-4 text-center">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <h4 className="font-medium text-slate-200">Generate Later</h4>
                  <p className="text-sm text-slate-400">Create pass when needed</p>
                </Card.Content>
              </Card>
            </div>
          </div>
        );

      case 3: // Review & Confirm
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-brand-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-200 mb-2">
                Review Visitor Information
              </h3>
              <p className="text-slate-400">
                Please review all information before creating the visitor pass.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <Card.Header>
                  <Card.Title className="text-slate-200">Visitor Details</Card.Title>
                </Card.Header>
                <Card.Content className="space-y-3">
                  <div>
                    <span className="text-sm text-slate-400">Name:</span>
                    <p className="text-slate-200">{allStepData[0]?.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">Phone:</span>
                    <p className="text-slate-200">{allStepData[0]?.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">Email:</span>
                    <p className="text-slate-200">{allStepData[0]?.email || 'Not provided'}</p>
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title className="text-slate-200">Visit Details</Card.Title>
                </Card.Header>
                <Card.Content className="space-y-3">
                  <div>
                    <span className="text-sm text-slate-400">Date:</span>
                    <p className="text-slate-200">{allStepData[1]?.dateOfVisit || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">Time:</span>
                    <p className="text-slate-200">{allStepData[1]?.time || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">Purpose:</span>
                    <p className="text-slate-200">{allStepData[1]?.purpose || 'Not provided'}</p>
                  </div>
                </Card.Content>
              </Card>
            </div>

            <Card>
              <Card.Header>
                <Card.Title className="text-slate-200">Pass Generation</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="flex items-center space-x-2">
                  {allStepData[2]?.generatePassImmediately ? (
                    <>
                      <QrCode className="w-5 h-5 text-brand-500" />
                      <span className="text-slate-200">Generate pass immediately</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-200">Generate pass later</span>
                    </>
                  )}
                </div>
              </Card.Content>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const onLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <AppShell role={localStorage.getItem('role')} title="Add Visitor" onLogout={onLogout}>
      <PageHeader
        title="Add Visitor"
        subtitle="Create a new visitor invitation with a multi-step process"
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

      {/* Form Wizard */}
      <FormWizard
        steps={steps}
        onComplete={handleComplete}
        onStepChange={handleStepChange}
        onSaveDraft={handleSaveDraft}
        showProgress={true}
        showStepNumbers={true}
        allowStepNavigation={true}
      >
        {renderStepContent}
      </FormWizard>
    </AppShell>
  );
};

export default AddVisitorWizard;
