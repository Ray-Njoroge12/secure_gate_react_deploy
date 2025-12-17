/**
 * Consent Modal Component
 * Modal dialog for collecting user consent with detailed information
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Checkbox } from './ui/Checkbox';
import { Label } from './ui/Label';
import { Badge } from './ui/Badge';
import { Alert, AlertDescription } from './ui/Alert';
import { 
  Shield, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  X,
  Clock,
  UserCheck,
  Database,
  Eye,
  Lock
} from 'lucide-react';

const ConsentModal = ({ 
  isOpen, 
  onClose, 
  onConsentGiven,
  consentType = 'data_processing',
  title = 'Consent Required',
  description = 'Please provide your consent to continue'
}) => {
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentTimestamp, setConsentTimestamp] = useState(null);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setConsentGiven(false);
      setConsentTimestamp(null);
      setErrors({});
      setActiveTab('overview');
    }
  }, [isOpen]);

  const handleConsentChange = (checked) => {
    setConsentGiven(checked);
    
    if (checked) {
      setConsentTimestamp(new Date().toISOString());
      setErrors({});
    } else {
      setConsentTimestamp(null);
    }
  };

  const handleSubmit = () => {
    if (!consentGiven) {
      setErrors({ consent: 'You must provide consent to continue' });
      return;
    }

    // Call parent callback with consent data
    if (onConsentGiven) {
      onConsentGiven({
        given: true,
        timestamp: consentTimestamp,
        type: consentType,
        version: '1.0',
        ipAddress: 'captured_on_submit', // Will be captured by backend
        userAgent: navigator.userAgent
      });
    }

    onClose();
  };

  const consentTypes = {
    data_processing: {
      title: 'Data Processing Consent',
      description: 'We need your consent to process your personal data for visitor management and security purposes.',
      icon: Database,
      color: 'blue'
    },
    data_collection: {
      title: 'Data Collection Consent',
      description: 'We need your consent to collect and store your personal information.',
      icon: UserCheck,
      color: 'green'
    },
    marketing: {
      title: 'Marketing Communications',
      description: 'We would like to send you updates and notifications (optional).',
      icon: Eye,
      color: 'purple'
    }
  };

  const currentConsent = consentTypes[consentType] || consentTypes.data_processing;
  const Icon = currentConsent.icon;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'rights', label: 'Your Rights', icon: UserCheck }
  ];

  const tabContent = {
    overview: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-6 w-6 text-${currentConsent.color}-600 mt-1`} />
          <div>
            <h3 className="font-semibold text-lg">{currentConsent.title}</h3>
            <p className="text-gray-600">{currentConsent.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">What we collect:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Full name</li>
              <li>• Phone number</li>
              <li>• Email address (optional)</li>
              <li>• Visit purpose and timing</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Why we collect it:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Security and access control</li>
              <li>• Visitor management</li>
              <li>• Audit and compliance</li>
              <li>• Emergency contact</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    
    details: (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-blue-600 mt-1" />
            <div>
              <h4 className="font-semibold">Data Processing</h4>
              <p className="text-sm text-gray-600">
                Your personal data will be processed for visitor management, security monitoring, 
                and compliance purposes. We use industry-standard security measures to protect your data.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-green-600 mt-1" />
            <div>
              <h4 className="font-semibold">Data Retention</h4>
              <p className="text-sm text-gray-600">
                Visitor data is retained for 5 years as required by law and business needs. 
                User data is retained for 7 years for employment and contract purposes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-purple-600 mt-1" />
            <div>
              <h4 className="font-semibold">Data Security</h4>
              <p className="text-sm text-gray-600">
                We implement comprehensive security measures including encryption, access controls, 
                audit logging, and regular security assessments.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    
    rights: (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Your Rights Under Kenya DPA 2019</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Right to Access</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Right to Rectification</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Right to Portability</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Right to Erasure</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Right to Restrict</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium">Right to Object</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">How to Exercise Your Rights</h4>
          <p className="text-sm text-green-800">
            Contact us at <strong>privacy@securegate.com</strong> or use the Data Subject Access Request (DSAR) 
            feature in your account. We will respond within 72 hours.
          </p>
        </div>
      </div>
    )
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <Card className="shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                {title}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-gray-600">{description}</p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <TabIcon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
              {tabContent[activeTab]}
            </div>

            {/* Consent Checkbox */}
            <div className="border-t pt-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="modal-consent-checkbox"
                  checked={consentGiven}
                  onCheckedChange={handleConsentChange}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <Label 
                    htmlFor="modal-consent-checkbox" 
                    className="text-sm font-medium leading-relaxed cursor-pointer"
                  >
                    I have read and understood the information above and consent to the processing of my personal data 
                    as described for visitor management and security purposes.
                  </Label>
                  
                  {consentGiven && consentTimestamp && (
                    <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                      <CheckCircle className="h-3 w-3" />
                      <span>Consent recorded on {new Date(consentTimestamp).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {errors.consent && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errors.consent}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!consentGiven}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Provide Consent
              </Button>
            </div>

            {/* Footer */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              <p>
                By providing consent, you acknowledge that you have read our{' '}
                <a href="/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>{' '}
                and understand your rights under the Kenya Data Protection Act 2019.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsentModal;






