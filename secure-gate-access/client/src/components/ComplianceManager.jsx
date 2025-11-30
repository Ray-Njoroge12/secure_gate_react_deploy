/**
 * Compliance Manager Component
 * Handles GDPR, Kenya DPA, and data protection compliance
 */

import React, { useState, useEffect } from 'react';
import logger from 'utils/logger';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Checkbox } from './ui/Checkbox';
import { Alert, AlertDescription } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { 
  Shield, 
  Download, 
  Trash2, 
  Eye, 
  FileText, 
  Cookie, 
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

const ComplianceManager = () => {
  const [complianceStatus, setComplianceStatus] = useState(null);
  const [cookiePolicy, setCookiePolicy] = useState(null);
  const [privacyPolicy, setPrivacyPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [consentData, setConsentData] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false
  });

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      const [statusRes, cookieRes, privacyRes] = await Promise.all([
        fetch('/api/compliance/status'),
        fetch('/api/compliance/cookie-policy'),
        fetch('/api/compliance/privacy-policy')
      ]);

      const status = await statusRes.json();
      const cookie = await cookieRes.json();
      const privacy = await privacyRes.json();

      setComplianceStatus(status.data);
      setCookiePolicy(cookie.data);
      setPrivacyPolicy(privacy.data);
    } catch (error) {
      logger.error('Failed to fetch compliance data:', error);
      setMessage('Failed to load compliance information');
    } finally {
      setLoading(false);
    }
  };

  const handleDataRequest = async (type) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/compliance/${type}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestType: type })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} request submitted successfully. Request ID: ${result.data.requestId}`);
      } else {
        setMessage(`Failed to submit ${type} request: ${result.message}`);
      }
    } catch (error) {
      logger.error(`Failed to submit ${type} request:`, error);
      setMessage(`Failed to submit ${type} request`);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentUpdate = async () => {
    try {
      setLoading(true);
      
      // Update each consent type
      const consentPromises = Object.entries(consentData).map(([type, granted]) =>
        fetch('/api/compliance/consent', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type,
            granted,
            version: '1.0'
          })
        })
      );

      await Promise.all(consentPromises);
      setMessage('Consent preferences updated successfully');
    } catch (error) {
      logger.error('Failed to update consent:', error);
      setMessage('Failed to update consent preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = (type, checked) => {
    setConsentData(prev => ({
      ...prev,
      [type]: checked
    }));
  };

  if (loading && !complianceStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Compliance Management</h1>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Data Protection
        </Badge>
      </div>

      {message && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="data-rights">Data Rights</TabsTrigger>
          <TabsTrigger value="consent">Consent</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {complianceStatus && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">GDPR Compliance</h4>
                    <div className="flex items-center gap-2">
                      {complianceStatus.gdpr.enabled ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>{complianceStatus.gdpr.enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Data retention: {complianceStatus.gdpr.dataRetentionDays} days
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Kenya DPA Compliance</h4>
                    <div className="flex items-center gap-2">
                      {complianceStatus.kenyaDpa.enabled ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>{complianceStatus.kenyaDpa.enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Data retention: {complianceStatus.kenyaDpa.dataRetentionDays} days
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Cookie Consent</h4>
                    <div className="flex items-center gap-2">
                      {complianceStatus.cookieConsent.required ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>{complianceStatus.cookieConsent.required ? 'Required' : 'Not Required'}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-rights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Data Subject Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Access Your Data</h4>
                  <p className="text-sm text-gray-600">
                    Request a copy of all personal data we hold about you
                  </p>
                  <Button 
                    onClick={() => handleDataRequest('dsar')}
                    disabled={loading}
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Request Access
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Data Portability</h4>
                  <p className="text-sm text-gray-600">
                    Download your data in a portable format
                  </p>
                  <Button 
                    onClick={() => handleDataRequest('portability')}
                    disabled={loading}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Data
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Right to Erasure</h4>
                  <p className="text-sm text-gray-600">
                    Request deletion of your personal data
                  </p>
                  <Button 
                    onClick={() => handleDataRequest('deletion')}
                    disabled={loading}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Request Deletion
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="h-5 w-5" />
                Cookie Consent Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cookiePolicy && (
                <div className="space-y-4">
                  {Object.entries(cookiePolicy.categories).map(([key, category]) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{category.name}</h4>
                          {category.required && (
                            <Badge variant="secondary">Required</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </div>
                      <Checkbox
                        checked={consentData[key]}
                        onCheckedChange={(checked) => handleConsentChange(key, checked)}
                        disabled={category.required}
                      />
                    </div>
                  ))}

                  <div className="pt-4 border-t">
                    <Button 
                      onClick={handleConsentUpdate}
                      disabled={loading}
                      className="w-full"
                    >
                      Update Consent Preferences
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Policy</CardTitle>
              </CardHeader>
              <CardContent>
                {privacyPolicy && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Last updated: {privacyPolicy.lastUpdated}
                    </p>
                    <p className="text-sm text-gray-600">
                      Version: {privacyPolicy.version}
                    </p>
                    <Button variant="outline" className="w-full">
                      View Full Policy
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cookie Policy</CardTitle>
              </CardHeader>
              <CardContent>
                {cookiePolicy && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Consent required: {cookiePolicy.required ? 'Yes' : 'No'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Categories: {Object.keys(cookiePolicy.categories).length}
                    </p>
                    <Button variant="outline" className="w-full">
                      View Cookie Policy
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComplianceManager;
