import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useError } from "../../contexts/ErrorContext";
import { useLoading } from "../../contexts/LoadingContext";
import { Button, Card, PageHeader } from "../../components/ui";
import {
  Users,
  Calendar,
  Clock,
  Copy,
  CheckCircle,
  Link,
  ArrowRight
} from "lucide-react";

// Helper to format date for input
const getTodayString = () => new Date().toISOString().split('T')[0];

const BulkInvite = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const { handleError, handleApiError, clearAllErrors } = useError();
  const { setLoading, isLoading } = useLoading();

  const [formData, setFormData] = useState({
    eventName: "",
    date: getTodayString(),
    time: "",
    numGuests: 20
  });

  const [generatedLink, setGeneratedLink] = useState(null);
  const [generatedCode, setGeneratedCode] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.eventName.trim()) return "Event name is required";
    if (!formData.date) return "Date is required";
    if (!formData.time) return "Time is required";
    if (formData.numGuests < 1) return "At least 1 guest is required";
    return null;
  };

  const handleGenerateLink = async (e) => {
    e.preventDefault();
    clearAllErrors();

    const error = validateForm();
    if (error) {
      handleError(error);
      return;
    }

    try {
      setLoading('bulkInvite', true);

      const res = await fetch('/api/visitors/bulk-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || 'Failed to generate link');
      }

      if (json.success) {
        setGeneratedLink(json.data.inviteLink);
        setGeneratedCode(json.data.inviteCode);
        setCurrentStep(2);
      }
    } catch (err) {
      handleApiError(err, 'Bulk Invite');
    } finally {
      setLoading('bulkInvite', false);
    }
  };

  const copyToClipboard = async () => {
    if (generatedLink) {
      try {
        await navigator.clipboard.writeText(generatedLink);
        // Could add a toast success here if available, 
        // relying on user feedback on button for now or just generic success
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
            ${currentStep >= step
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-500 dark:text-gray-300'}
          `}>
            {currentStep > step ? '✓' : step}
          </div>
          {step < 2 && (
            <div className={`w-16 h-1 mx-2 ${currentStep > step ? 'bg-green-500' : 'bg-gray-200'
              }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <PageHeader
        title="Event Invite Link"
        subtitle="Create a sharable link for your guests to self-register"
        icon={<Link className="w-6 h-6 text-green-600" />}
        showBack={true}
        backTo="/dashboard/resident"
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <StepIndicator />

        {/* Step 1: Event Details */}
        {currentStep === 1 && (
          <Card>
            <Card.Header className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 border-b border-blue-200 dark:border-slate-600">
              <Card.Title className="flex items-center text-blue-900 dark:text-blue-100">
                <span className="text-2xl mr-3">🎉</span>
                Step 1: Event Details
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <form onSubmit={handleGenerateLink} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={formData.eventName}
                    onChange={(e) => handleInputChange('eventName', e.target.value)}
                    placeholder="e.g. Birthday Party, House Warming"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" /> Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      min={getTodayString()}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Clock className="w-4 h-4 inline mr-1" /> Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => handleInputChange('time', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Users className="w-4 h-4 inline mr-1" /> Maximum Guests
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={formData.numGuests}
                      onChange={(e) => handleInputChange('numGuests', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                    />
                    <span className="w-16 text-center font-bold text-lg text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-lg">
                      {formData.numGuests}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Limit the number of people who can register with this link.
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2"
                    disabled={isLoading('bulkInvite')}
                  >
                    {isLoading('bulkInvite') ? 'Generating...' : (
                      <>Generate Invite Link <ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>
        )}

        {/* Step 2: Share Link */}
        {currentStep === 2 && (
          <Card>
            <Card.Header className="bg-gradient-to-r from-green-50 to-green-100 dark:from-slate-800 dark:to-slate-700 border-b border-green-200 dark:border-slate-600">
              <Card.Title className="flex items-center text-green-900 dark:text-green-100">
                <span className="text-2xl mr-3">✅</span>
                Step 2: Share Your Link
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Link Generated Successfully!
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Share this link with your guests. They can click it to register themselves.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-300 dark:border-slate-600 font-mono text-sm break-all text-center md:text-left text-gray-800 dark:text-gray-200 select-all">
                  {generatedLink}
                </div>
                <Button
                  onClick={copyToClipboard}
                  className="shrink-0 flex items-center gap-2"
                  variant="primary"
                >
                  <Copy className="w-4 h-4" /> Copy Link
                </Button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Event Details
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li><strong>Event:</strong> {formData.eventName}</li>
                  <li><strong>When:</strong> {formData.date} at {formData.time}</li>
                  <li><strong>Capacity:</strong> {formData.numGuests} guests</li>
                  <li className="text-xs mt-2 opacity-75">Link expires at the end of the event day.</li>
                </ul>
              </div>

              <div className="flex justify-center pt-4 gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/resident/visitor-history')}
                >
                  View History
                </Button>
                <Button
                  onClick={() => {
                    setFormData({
                      eventName: "",
                      date: getTodayString(),
                      time: "",
                      numGuests: 20
                    });
                    setCurrentStep(1);
                  }}
                >
                  Create Another Event
                </Button>
              </div>
            </Card.Content>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BulkInvite;

