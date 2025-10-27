/**
 * Consent Form Component
 * GDPR-compliant consent collection for visitor registration
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Checkbox } from './ui/Checkbox';
import { Label } from './ui/Label';
import { Alert, AlertDescription } from './ui/Alert';
import { 
  Shield, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink,
  Clock,
  Info
} from 'lucide-react';

const ConsentForm = ({ 
  onConsentChange, 
  required = true, 
  consentType = 'data_processing',
  showDetails = true,
  className = '' 
}) => {
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentTimestamp, setConsentTimestamp] = useState(null);
  const [showFullPolicy, setShowFullPolicy] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Reset consent when component mounts
    setConsentGiven(false);
    setConsentTimestamp(null);
  }, []);

  const handleConsentChange = (checked) => {
    setConsentGiven(checked);
    
    if (checked) {
      setConsentTimestamp(new Date().toISOString());
      setErrors({});
    } else {
      setConsentTimestamp(null);
    }

    // Notify parent component
    if (onConsentChange) {
      onConsentChange({
        given: checked,
        timestamp: checked ? new Date().toISOString() : null,
        type: consentType,
        version: '1.0'
      });
    }
  };

  const validateConsent = () => {
    if (required && !consentGiven) {
      setErrors({ consent: 'Consent is required to proceed' });
      return false;
    }
    setErrors({});
    return true;
  };

  const consentTypes = {
    data_processing: {
      title: 'Data Processing Consent',
      description: 'I consent to the processing of my personal data for visitor management and security purposes.',
      details: [
        'Collection and storage of personal information (name, phone, email)',
        'Processing for security and access control purposes',
        'Retention for 5 years as required by law',
        'Sharing with security personnel when necessary',
        'Use for audit and compliance purposes'
      ]
    },
    data_collection: {
      title: 'Data Collection Consent',
      description: 'I consent to the collection of my personal data for visitor registration.',
      details: [
        'Collection of contact information',
        'Storage in secure database',
        'Use for identification and communication',
        'Retention according to data retention policy'
      ]
    },
    marketing: {
      title: 'Marketing Communications Consent',
      description: 'I consent to receive marketing communications and updates.',
      details: [
        'Email newsletters and updates',
        'SMS notifications about events',
        'Promotional materials and offers',
        'You can unsubscribe at any time'
      ]
    }
  };

  const currentConsent = consentTypes[consentType] || consentTypes.data_processing;

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-blue-600" />
            {currentConsent.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Consent Checkbox */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent-checkbox"
                checked={consentGiven}
                onCheckedChange={handleConsentChange}
                className="mt-1"
                required={required}
              />
              <div className="flex-1 space-y-2">
                <Label 
                  htmlFor="consent-checkbox" 
                  className="text-sm font-medium leading-relaxed cursor-pointer"
                >
                  {currentConsent.description}
                </Label>
                
                {/* Privacy Policy Link */}
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <FileText className="h-3 w-3" />
                  <span>I have read and agree to the</span>
                  <Link 
                    to="/privacy-policy" 
                    className="text-blue-600 hover:underline flex items-center gap-1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                {/* Consent Timestamp */}
                {consentGiven && consentTimestamp && (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                    <CheckCircle className="h-3 w-3" />
                    <span>Consent given on {new Date(consentTimestamp).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {errors.consent && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.consent}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Detailed Information */}
          {showDetails && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">What this means:</span>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <ul className="text-xs text-gray-700 space-y-1">
                  {currentConsent.details.map((detail, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Data Retention Notice */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium">Data Retention:</p>
                    <p>Your data will be retained for 5 years (visitors) or 7 years (users) as required by law and business needs.</p>
                  </div>
                </div>
              </div>

              {/* Rights Information */}
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="text-xs text-green-800">
                    <p className="font-medium">Your Rights:</p>
                    <p>You have the right to access, rectify, delete, or restrict processing of your data. Contact us at privacy@securegate.com to exercise your rights.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Consent Withdrawal Notice */}
          <div className="border-t pt-3">
            <p className="text-xs text-gray-600">
              <strong>Withdraw Consent:</strong> You can withdraw your consent at any time by contacting us. 
              Withdrawal will not affect the lawfulness of processing based on consent before its withdrawal.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Validation Helper */}
      {required && (
        <div className="text-xs text-gray-500">
          <span className="text-red-500">*</span> Required - You must provide consent to proceed with visitor registration.
        </div>
      )}
    </div>
  );
};

// Higher-order component for form validation
export const withConsentValidation = (WrappedComponent) => {
  return (props) => {
    const [consentValid, setConsentValid] = useState(false);

    const handleConsentChange = (consentData) => {
      setConsentValid(consentData.given);
    };

    return (
      <WrappedComponent 
        {...props} 
        consentValid={consentValid}
        onConsentChange={handleConsentChange}
      />
    );
  };
};

export default ConsentForm;


