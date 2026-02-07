// BulkInvite Wizard - Multi-step form for bulk visitor invitations
import React, { useState, useEffect, useCallback } from "react";
import logger from 'utils/logger';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useCurrentRole } from "../../hooks/useCurrentRole";
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
  const { logout } = useAuth();
  const role = useCurrentRole();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [inviteData, setInviteData] = useState(null);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Pre-set time options for events
  const timePresets = [
    { label: '10:00 AM', value: '10:00', icon: '☀️' },
    { label: '2:00 PM', value: '14:00', icon: '🌤️' },
    { label: '6:00 PM', value: '18:00', icon: '🌆' },
    { label: '8:00 PM', value: '20:00', icon: '🌃' },
  ];

  // Wizard steps configuration
  const steps = [
    {
      title: "Event Information",
      description: "Tell us about your event - we'll create a link guests can use to register",
      validate: (data) => {
        const errors = {};
        if (!data.eventName?.trim()) errors.eventName = "Please give your event a name";
        if (!data.date?.trim()) errors.date = "When is your event?";
        if (!data.time?.trim()) errors.time = "What time does it start?";
        if (!data.numGuests || data.numGuests < 1) errors.numGuests = "How many guests are you expecting?";
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      title: "Guest List",
      description: "Optional: Add your guest list now, or share the link and let them register themselves",
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
    logger.debug(`Moved to step ${stepIndex + 1}`, allStepData);
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
            {/* Event Name */}
            <div>
              <Input
                label="🎯 Event Name"
                value={stepData.eventName || ""}
                onChange={(e) => updateStepData({ eventName: e.target.value })}
                placeholder="e.g., Birthday Party, Dinner, Pool Party"
                required
                icon={<Calendar className="w-4 h-4" />}
                helperText="Give your event a memorable name"
              />
            </div>
            
            {/* Event Date */}
            <div>
              <Input
                label="📅 Event Date"
                type="date"
                value={stepData.date || ""}
                onChange={(e) => updateStepData({ date: e.target.value })}
                required
                icon={<Calendar className="w-4 h-4" />}
                min={new Date().toISOString().split('T')[0]}
                helperText="When is your event?"
              />
            </div>

            {/* Time Selection with Presets */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-3">
                🕐 Event Time *
              </label>
              <div className="space-y-3">
                {/* Quick Time Chips */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {timePresets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        updateStepData({ time: preset.value });
                        setUseCustomTime(false);
                      }}
                      className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        stepData.time === preset.value && !useCustomTime
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-xl mb-1">{preset.icon}</div>
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Time Toggle */}
                <button
                  type="button"
                  onClick={() => setUseCustomTime(!useCustomTime)}
                  className="text-sm text-brand-400 hover:text-brand-300 underline"
                >
                  {useCustomTime ? '← Back to quick select' : '⏰ Choose a specific time'}
                </button>

                {/* Custom Time Input */}
                {useCustomTime && (
                  <Input
                    type="time"
                    value={stepData.time || ""}
                    onChange={(e) => updateStepData({ time: e.target.value })}
                    icon={<Clock className="w-4 h-4" />}
                  />
                )}
              </div>
            </div>
            
            {/* Expected Guests */}
            <div>
              <Input
                label="👥 Expected Number of Guests"
                type="number"
                value={stepData.numGuests || ""}
                onChange={(e) => updateStepData({ numGuests: parseInt(e.target.value) || 0 })}
                placeholder="10"
                min="1"
                max="50"
                required
                icon={<Users className="w-4 h-4" />}
                helperText="Maximum 50 guests per event"
              />
            </div>
          </div>
        );

      case 1: // Guest Information
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Upload className="w-16 h-16 text-brand-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Add Guest Information
              </h3>
              <p className="text-gray-500 dark:text-slate-400">
                You can upload a CSV file or add guests manually.
              </p>
            </div>

            {/* CSV Upload Section */}
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <Card.Header>
                <Card.Title className="text-gray-900 dark:text-slate-200">CSV Upload</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-slate-200 mb-2">
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
                      className="w-full min-h-[120px] px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                  
                  {stepData.csvInfo && (
                    <div className="text-sm text-gray-500 dark:text-slate-400">
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
              <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                <Card.Header>
                  <Card.Title className="text-gray-900 dark:text-slate-200">
                    Guest List ({stepData.guestData.length} guests)
                  </Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {stepData.guestData.map((guest, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-md">
                        <div>
                          <div className="text-gray-900 dark:text-slate-200 font-medium">{guest.name}</div>
                          <div className="text-gray-500 dark:text-slate-400 text-sm">{guest.email}</div>
                          {guest.phone && (
                            <div className="text-gray-500 dark:text-slate-300 text-sm">{guest.phone}</div>
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">
                Review Bulk Invitation
              </h3>
              <p className="text-gray-500 dark:text-slate-400">
                Review all information before generating invitations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                <Card.Header>
                  <Card.Title className="text-gray-900 dark:text-slate-200">Event Details</Card.Title>
                </Card.Header>
                <Card.Content className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500 dark:text-slate-400">Event:</span>
                    <p className="text-gray-900 dark:text-slate-200">{allStepData[0]?.eventName || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 dark:text-slate-400">Date:</span>
                    <p className="text-gray-900 dark:text-slate-200">{allStepData[0]?.date || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 dark:text-slate-400">Time:</span>
                    <p className="text-gray-900 dark:text-slate-200">{allStepData[0]?.time || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 dark:text-slate-400">Expected Guests:</span>
                    <p className="text-gray-900 dark:text-slate-200">{allStepData[0]?.numGuests || 'Not provided'}</p>
                  </div>
                </Card.Content>
              </Card>

              <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                <Card.Header>
                  <Card.Title className="text-gray-900 dark:text-slate-200">
                    Guest List ({allStepData[1]?.guestData?.length || 0} guests)
                  </Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {allStepData[1]?.guestData?.map((guest, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded">
                        <div>
                          <div className="text-gray-900 dark:text-slate-200 text-sm font-medium">{guest.name}</div>
                          <div className="text-gray-500 dark:text-slate-400 text-xs">{guest.email}</div>
                        </div>
                        <Badge variant="success" size="sm">✓</Badge>
                      </div>
                    )) || (
                      <div className="text-gray-500 dark:text-slate-400 text-sm">No guests added</div>
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

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <AppShell role={role} title="Bulk Invite" onLogout={onLogout}>
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

      {/* Generated Invitations Display - Enhanced */}
      {inviteData && (
        <Card className="mb-6 border-2 border-green-500 bg-white dark:bg-slate-800">
          <Card.Header className="bg-green-500/10">
            <Card.Title className="text-green-400 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Your Event Link is Ready!
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-6">
              {/* Success Message */}
              <div className="text-center py-4">
                <div className="text-6xl mb-3">🎉</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-200 mb-2">
                  {inviteData.guests?.length || 0} guests can now register!
                </h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm">
                  Share this link with your guests so they can add their details
                </p>
              </div>
              
              {/* Link Display */}
              <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-2 block">🔗 Your Event Registration Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inviteData.inviteLink || ''}
                    readOnly
                    onClick={(e) => e.target.select()}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-slate-200 text-sm font-mono"
                  />
                  <Button
                    variant={copySuccess ? "success" : "outline"}
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteData.inviteLink);
                      setCopySuccess(true);
                      setSuccess("✅ Link copied!");
                      setTimeout(() => setCopySuccess(false), 2000);
                    }}
                  >
                    {copySuccess ? '✅' : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              {/* Share Actions */}
              <div>
                <p className="text-sm text-slate-400 mb-3 text-center">Share via:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* WhatsApp */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const text = `Join my event! Register here: ${inviteData.inviteLink}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="bg-green-600/10 border-green-600 hover:bg-green-600/20 text-green-400"
                  >
                    <span className="text-xl mr-2">📱</span>
                    WhatsApp
                  </Button>
                  
                  {/* SMS */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const text = `Join my event! Register: ${inviteData.inviteLink}`;
                      window.open(`sms:?body=${encodeURIComponent(text)}`);
                    }}
                    className="bg-blue-600/10 border-blue-600 hover:bg-blue-600/20 text-blue-400"
                  >
                    <span className="text-xl mr-2">💬</span>
                    SMS
                  </Button>
                  
                  {/* Email */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const subject = 'Event Invitation';
                      const body = `You're invited! Please register here: ${inviteData.inviteLink}`;
                      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                    }}
                    className="bg-purple-600/10 border-purple-600 hover:bg-purple-600/20 text-purple-400"
                  >
                    <span className="text-xl mr-2">✉️</span>
                    Email
                  </Button>
                  
                  {/* Copy Link */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteData.inviteLink);
                      setCopySuccess(true);
                      setSuccess("✅ Link copied to clipboard!");
                      setTimeout(() => setCopySuccess(false), 2000);
                    }}
                    className="bg-gray-100/50 dark:bg-slate-700/50 border-gray-300 dark:border-slate-600 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>

              {/* Preview Button */}
              <div className="text-center pt-2">
                <Button
                  variant="primary"
                  onClick={() => window.open(inviteData.inviteLink, '_blank')}
                  className="w-full md:w-auto"
                >
                  👁️ Preview Registration Page
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
