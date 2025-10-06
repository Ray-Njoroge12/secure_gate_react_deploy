// BulkInvite Wizard - Multi-step form for bulk visitor invitations
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { bulkInvite } from "../../services/visitorService";
import { handleApiError } from "../../utils/errorMapper";
import { Button, Input, Card, Badge, ErrorDisplay, SuccessDisplay } from "../../components/ui";
import FormWizard from "../../components/ui/FormWizard";
import PageHeader from "../../components/PageHeader";
import AppShell from "../../layouts/AppShell";
import { 
  Users, 
  Calendar, 
  Clock, 
  Upload, 
  FileText, 
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

const BulkInviteWizard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [inviteData, setInviteData] = useState(null);

  // Wizard steps configuration
  const steps = [
    {
      title: "Event Information",
      description: "Enter details about the event or gathering",
      validate: (data) => {
        const errors = {};
        if (!data.eventName?.trim()) errors.eventName = "Event name is required";
        if (!data.date?.trim()) errors.date = "Event date is required";
        if (!data.time?.trim()) errors.time = "Event time is required";
        if (!data.numGuests || data.numGuests < 1) errors.numGuests = "Number of guests must be at least 1";
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      title: "Guest Information",
      description: "Add guest details via CSV upload or manual entry",
      validate: (data) => {
        const errors = {};
        if (!data.guestData || data.guestData.length === 0) {
          errors.guestData = "At least one guest is required";
        } else {
          // Validate each guest
          data.guestData.forEach((guest, index) => {
            if (!guest.name?.trim()) {
              errors[`guest_${index}_name`] = `Guest ${index + 1} name is required`;
            }
            if (!guest.email?.trim()) {
              errors[`guest_${index}_email`] = `Guest ${index + 1} email is required`;
            } else if (!/\S+@\S+\.\S+/.test(guest.email)) {
              errors[`guest_${index}_email`] = `Guest ${index + 1} email is invalid`;
            }
          });
        }
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      title: "Review & Generate",
      description: "Review all information and generate invitations",
      validate: (data) => {
        // Final validation
        return true;
      }
    }
  ];

  const parseCsv = useCallback((text) => {
    const MAX = 50;
    const lines = (text || "").split(/\r?\n/).filter(l => l.trim().length > 0);
    
    if (lines.length === 0) return { guests: [], errors: [], info: "No data found" };
    if (lines.length > MAX) return { guests: [], errors: [`Maximum ${MAX} guests allowed`], info: "" };
    
    const guests = [];
    const errors = [];
    
    lines.forEach((line, index) => {
      const [name, email, phone = ""] = line.split(",").map(s => s.trim());
      
      if (!name || !email) {
        errors.push(`Row ${index + 1}: Name and email are required`);
        return;
      }
      
      if (!/\S+@\S+\.\S+/.test(email)) {
        errors.push(`Row ${index + 1}: Invalid email format`);
        return;
      }
      
      guests.push({ name, email, phone });
    });
    
    return {
      guests,
      errors,
      info: `Parsed ${guests.length} guests from ${lines.length} lines`
    };
  }, []);

  const handleComplete = async (allStepData) => {
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const eventData = allStepData[0];
      const guestData = allStepData[1];
      
      const bulkInviteData = {
        eventName: eventData.eventName,
        date: eventData.date,
        time: eventData.time,
        numGuests: eventData.numGuests,
        guests: guestData.guestData || []
      };

      const result = await bulkInvite(bulkInviteData);
      setInviteData(result);
      setSuccess(`Successfully created ${result.guests?.length || 0} invitations!`);

    } catch (err) {
      setError(handleApiError(err, "Creating bulk invitations"));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = (allStepData) => {
    localStorage.setItem('bulk-invite-draft', JSON.stringify({
      data: allStepData,
      timestamp: Date.now()
    }));
    setSuccess("Draft saved successfully!");
  };

  const handleStepChange = (stepIndex, allStepData) => {
    console.log(`Moved to step ${stepIndex + 1}`, allStepData);
  };

  const resetForm = () => {
    setError("");
    setSuccess(null);
    setInviteData(null);
    localStorage.removeItem('bulk-invite-draft');
  };

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('bulk-invite-draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setSuccess("Draft loaded from previous session");
        } else {
          localStorage.removeItem('bulk-invite-draft');
        }
      } catch (error) {
        localStorage.removeItem('bulk-invite-draft');
      }
    }
  }, []);

  const renderStepContent = ({ currentStep, stepData, updateStepData, allStepData, isFirstStep, isLastStep, isValidating }) => {
    switch (currentStep) {
      case 0: // Event Information
        return (
          <div className="space-y-6">
            <div>
              <Input
                label="Event Name"
                value={stepData.eventName || ""}
                onChange={(e) => updateStepData({ eventName: e.target.value })}
                placeholder="e.g., Birthday Party, Meeting, Conference"
                required
                icon={<Calendar className="w-4 h-4" />}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Event Date"
                  type="date"
                  value={stepData.date || ""}
                  onChange={(e) => updateStepData({ date: e.target.value })}
                  required
                  icon={<Calendar className="w-4 h-4" />}
                />
              </div>
              <div>
                <Input
                  label="Event Time"
                  type="time"
                  value={stepData.time || ""}
                  onChange={(e) => updateStepData({ time: e.target.value })}
                  required
                  icon={<Clock className="w-4 h-4" />}
                />
              </div>
            </div>
            
            <div>
              <Input
                label="Expected Number of Guests"
                type="number"
                value={stepData.numGuests || ""}
                onChange={(e) => updateStepData({ numGuests: parseInt(e.target.value) || 0 })}
                placeholder="5"
                min="1"
                max="50"
                required
                icon={<Users className="w-4 h-4" />}
              />
            </div>
          </div>
        );

      case 1: // Guest Information
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Upload className="w-16 h-16 text-brand-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-200 mb-2">
                Add Guest Information
              </h3>
              <p className="text-slate-400">
                You can upload a CSV file or add guests manually.
              </p>
            </div>

            {/* CSV Upload Section */}
            <Card>
              <Card.Header>
                <Card.Title className="text-slate-200">CSV Upload</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      CSV Format: Name, Email, Phone (optional)
                    </label>
                    <textarea
                      value={stepData.csvText || ""}
                      onChange={(e) => {
                        const csvText = e.target.value;
                        updateStepData({ csvText });
                        
                        if (csvText.trim()) {
                          const parsed = parseCsv(csvText);
                          updateStepData({ 
                            guestData: parsed.guests,
                            csvErrors: parsed.errors,
                            csvInfo: parsed.info
                          });
                        }
                      }}
                      placeholder="John Doe,john@example.com,0123456789&#10;Jane Smith,jane@example.com&#10;Bob Johnson,bob@example.com,0987654321"
                      className="w-full min-h-[120px] px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                  
                  {stepData.csvInfo && (
                    <div className="text-sm text-slate-400">
                      {stepData.csvInfo}
                    </div>
                  )}
                  
                  {stepData.csvErrors && stepData.csvErrors.length > 0 && (
                    <div className="space-y-1">
                      {stepData.csvErrors.map((error, index) => (
                        <div key={index} className="text-sm text-red-400 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          {error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card.Content>
            </Card>

            {/* Guest List Preview */}
            {stepData.guestData && stepData.guestData.length > 0 && (
              <Card>
                <Card.Header>
                  <Card.Title className="text-slate-200">
                    Guest List ({stepData.guestData.length} guests)
                  </Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {stepData.guestData.map((guest, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-800 rounded-md">
                        <div>
                          <div className="text-slate-200 font-medium">{guest.name}</div>
                          <div className="text-slate-400 text-sm">{guest.email}</div>
                          {guest.phone && (
                            <div className="text-slate-500 text-sm">{guest.phone}</div>
                          )}
                        </div>
                        <Badge variant="success" size="sm">
                          Valid
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card.Content>
              </Card>
            )}
          </div>
        );

      case 2: // Review & Generate
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-brand-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-200 mb-2">
                Review Bulk Invitation
              </h3>
              <p className="text-slate-400">
                Review all information before generating invitations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <Card.Header>
                  <Card.Title className="text-slate-200">Event Details</Card.Title>
                </Card.Header>
                <Card.Content className="space-y-3">
                  <div>
                    <span className="text-sm text-slate-400">Event:</span>
                    <p className="text-slate-200">{allStepData[0]?.eventName || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">Date:</span>
                    <p className="text-slate-200">{allStepData[0]?.date || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">Time:</span>
                    <p className="text-slate-200">{allStepData[0]?.time || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">Expected Guests:</span>
                    <p className="text-slate-200">{allStepData[0]?.numGuests || 'Not provided'}</p>
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title className="text-slate-200">
                    Guest List ({allStepData[1]?.guestData?.length || 0} guests)
                  </Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {allStepData[1]?.guestData?.map((guest, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                        <div>
                          <div className="text-slate-200 text-sm font-medium">{guest.name}</div>
                          <div className="text-slate-400 text-xs">{guest.email}</div>
                        </div>
                        <Badge variant="success" size="sm">✓</Badge>
                      </div>
                    )) || (
                      <div className="text-slate-400 text-sm">No guests added</div>
                    )}
                  </div>
                </Card.Content>
              </Card>
            </div>
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
    <AppShell role={localStorage.getItem('role')} title="Bulk Invite" onLogout={onLogout}>
      <PageHeader
        title="Bulk Invite"
        subtitle="Create multiple visitor invitations for events and gatherings"
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

      {/* Generated Invitations Display */}
      {inviteData && (
        <Card className="mb-6">
          <Card.Header>
            <Card.Title className="text-slate-200">Generated Invitations</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-brand-500 mx-auto mb-2" />
                <p className="text-slate-200 mb-4">
                  Successfully created {inviteData.guests?.length || 0} invitations!
                </p>
              </div>
              
              <div className="bg-slate-800 p-4 rounded-lg">
                <h4 className="text-slate-200 font-medium mb-2">Invitation Link:</h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inviteData.inviteLink || ''}
                    readOnly
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteData.inviteLink);
                      setSuccess("Invitation link copied to clipboard!");
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-center space-x-3">
                <Button
                  variant="primary"
                  onClick={() => {
                    const link = inviteData.inviteLink;
                    if (link) {
                      window.open(link, '_blank');
                    }
                  }}
                >
                  Open Invitation Page
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteData.inviteLink);
                    setSuccess("Invitation link copied to clipboard!");
                  }}
                >
                  Copy Link
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

export default BulkInviteWizard;
