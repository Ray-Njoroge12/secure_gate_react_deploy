/**
 * Privacy Policy Page
 * Comprehensive privacy policy for Kenya DPA 2019 compliance
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Shield, Eye, Lock, Database, UserCheck, FileText, Clock, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const PrivacyPolicy = () => {
  const [dpoInfo, setDpoInfo] = useState(null);
  const [odpcInfo, setOdpcInfo] = useState(null);
  const [policyMetadata, setPolicyMetadata] = useState(null);
  const { isAuthenticated, hasAnyRole } = useAuth();
  const canAccessAdminSettings = hasAnyRole(['admin']);

  useEffect(() => {
    const fetchComplianceInfo = async () => {
      try {
        const [dpoResponse, odpcResponse, metadataResponse] = await Promise.all([
          api.get('/privacy/dpo'),
          api.get('/privacy/odpc-registration'),
          api.get('/privacy/policy-metadata')
        ]);
        setDpoInfo(dpoResponse.data.data);
        setOdpcInfo(odpcResponse.data.data);
        setPolicyMetadata(metadataResponse.data.data);
      } catch (error) {
        console.error('Failed to fetch compliance information:', error);
        // Fallback to default values
        setDpoInfo({
          name: 'To Be Appointed',
          email: 'dpo@securegate.com',
          phone: '+254 700 000 000',
          office: 'Nairobi, Kenya',
          is_configured: false
        });
        setOdpcInfo({
          registration_number: 'PENDING',
          status: 'pending',
          is_configured: false
        });
        setPolicyMetadata({
          last_updated_at: null,
          last_reviewed_at: null
        });
      }
    };
    fetchComplianceInfo();
  }, []);

  const dpoMissing = dpoInfo && !dpoInfo.is_configured;
  const odpcMissing = odpcInfo && !odpcInfo.is_configured;
  const policyMissing = policyMetadata && !policyMetadata.last_updated_at;

  const formatDate = (dateString) => {
    if (!dateString) {
      return 'Not configured';
    }
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? 'Not configured' : date.toLocaleDateString();
  };
  const sections = [
    {
      id: 'introduction',
      title: 'Introduction',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <p>
            Secure Gate Access Control System ("we," "our," or "us") is committed to protecting your privacy 
            and personal data in accordance with the Kenya Data Protection Act 2019 and international best practices.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, disclose, and protect your personal information 
            when you use our visitor management system.
          </p>
          {(dpoMissing || odpcMissing || policyMissing) && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800 font-semibold mb-2">
                Compliance data is not fully configured.
              </p>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                {dpoMissing && <li>Data Protection Officer status: Not configured.</li>}
                {odpcMissing && <li>ODPC registration status: Not configured.</li>}
                {policyMissing && <li>Policy metadata (Last Updated): Not configured.</li>}
              </ul>
              <div className="mt-3 text-sm text-yellow-900">
                {canAccessAdminSettings ? (
                  <Link
                    to="/dashboard/admin/settings"
                    className="font-semibold underline"
                  >
                    Update compliance settings
                  </Link>
                ) : isAuthenticated ? (
                  <Link
                    to="/privacy"
                    className="font-semibold underline"
                  >
                    Visit the privacy dashboard
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="font-semibold underline"
                  >
                    Sign in to manage privacy settings
                  </Link>
                )}
              </div>
            </div>
          )}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Last Updated:</strong> {formatDate(policyMetadata?.last_updated_at)}<br/>
              <strong>Effective Date:</strong> {formatDate(policyMetadata?.last_updated_at)}<br/>
              <strong>Version:</strong> 1.0
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'data-collection',
      title: 'Data Collection',
      icon: Database,
      content: (
        <div className="space-y-4">
          <p>We collect the following types of personal data:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">For Residents/Users:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Full name and username</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Area and house information</li>
                <li>Role (resident, guard, admin)</li>
                <li>Authentication credentials</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">For Visitors:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Full name</li>
                <li>Phone number</li>
                <li>Email address (optional)</li>
                <li>ID number (optional)</li>
                <li>Vehicle plate number (optional)</li>
                <li>Visit purpose and timing</li>
              </ul>
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Legal Basis:</strong> We collect this data based on legitimate interest for security 
              purposes, contractual necessity for service delivery, and with your explicit consent.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'data-processing',
      title: 'Data Processing',
      icon: Lock,
      content: (
        <div className="space-y-4">
          <p>We process your personal data for the following purposes:</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Security and Access Control</h4>
                <p className="text-sm text-gray-600">
                  Managing visitor access, monitoring entry/exit, and maintaining building security.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">User Management</h4>
                <p className="text-sm text-gray-600">
                  Creating and managing user accounts, authentication, and authorization.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Audit and Compliance</h4>
                <p className="text-sm text-gray-600">
                  Maintaining audit trails, compliance reporting, and legal obligations.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Communication</h4>
                <p className="text-sm text-gray-600">
                  Sending notifications, alerts, and important updates (with your consent).
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'data-storage',
      title: 'Data Storage and Security',
      icon: Lock,
      content: (
        <div className="space-y-4">
          <p>We implement comprehensive security measures to protect your data:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Access Controls</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Secure Storage</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Audit Logging</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Data Retention</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium">Regular Backups</span>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Data Retention:</strong> Personal data is retained for 7 years (users) and 5 years (visitors) 
              as required by law and business needs.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'data-sharing',
      title: 'Data Sharing and Disclosure',
      icon: UserCheck,
      content: (
        <div className="space-y-4">
          <p>We may share your personal data in the following circumstances:</p>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold">Legal Requirements</h4>
              <p className="text-sm text-gray-600">
                When required by law, court order, or government request.
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold">Security Purposes</h4>
              <p className="text-sm text-gray-600">
                With security personnel and law enforcement for safety and security.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold">Service Providers</h4>
              <p className="text-sm text-gray-600">
                With trusted third-party service providers under strict data protection agreements.
              </p>
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>No Sale:</strong> We do not sell, rent, or trade your personal data to third parties 
              for marketing purposes.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'user-rights',
      title: 'Your Rights',
      icon: UserCheck,
      content: (
        <div className="space-y-4">
          <p>Under the Kenya Data Protection Act 2019, you have the following rights:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Eye className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-semibold">Right to Access</h4>
                  <p className="text-xs text-gray-600">Request copies of your personal data</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-green-600 mt-1" />
                <div>
                  <h4 className="font-semibold">Right to Rectification</h4>
                  <p className="text-xs text-gray-600">Correct inaccurate or incomplete data</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Database className="h-4 w-4 text-purple-600 mt-1" />
                <div>
                  <h4 className="font-semibold">Right to Portability</h4>
                  <p className="text-xs text-gray-600">Receive your data in a portable format</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-red-600 mt-1" />
                <div>
                  <h4 className="font-semibold">Right to Erasure</h4>
                  <p className="text-xs text-gray-600">Request deletion of your personal data</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-orange-600 mt-1" />
                <div>
                  <h4 className="font-semibold">Right to Restrict</h4>
                  <p className="text-xs text-gray-600">Limit how we process your data</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <UserCheck className="h-4 w-4 text-indigo-600 mt-1" />
                <div>
                  <h4 className="font-semibold">Right to Object</h4>
                  <p className="text-xs text-gray-600">Object to certain data processing</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Exercise Your Rights:</strong> Contact us at privacy@securegate.com or use the 
              Data Subject Access Request (DSAR) feature in your account.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'cookies',
      title: 'Cookies and Tracking',
      icon: Eye,
      content: (
        <div className="space-y-4">
          <p>We use cookies and similar technologies to enhance your experience:</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-semibold">Necessary Cookies</h4>
                <p className="text-sm text-gray-600">
                  Essential for website functionality, authentication, and security.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-semibold">Analytics Cookies</h4>
                <p className="text-sm text-gray-600">
                  Help us understand how you use our website (optional).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-semibold">Preference Cookies</h4>
                <p className="text-sm text-gray-600">
                  Remember your settings and preferences (optional).
                </p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Cookie Consent:</strong> You can manage your cookie preferences through our 
              cookie consent banner or browser settings.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'contact',
      title: 'Contact Information',
      icon: Mail,
      content: (
        <div className="space-y-4">
          <p>For privacy-related inquiries, please contact us:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Data Protection Officer (DPO)</h4>
              {dpoInfo ? (
                <>
                  <p className="text-sm text-gray-600">
                    <strong>Name:</strong> {dpoInfo.name}<br/>
                    <strong>Email:</strong> {dpoInfo.email}<br/>
                    <strong>Phone:</strong> {dpoInfo.phone}<br/>
                    <strong>Office:</strong> {dpoInfo.office}
                  </p>
                  {dpoMissing ? (
                    <Badge variant="danger" className="text-xs">Not Configured</Badge>
                  ) : !dpoInfo.is_appointed ? (
                    <Badge variant="warning" className="text-xs">DPO Appointment Pending</Badge>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-gray-500">Loading...</p>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">ODPC Registration</h4>
              {odpcInfo ? (
                <>
                  <p className="text-sm text-gray-600">
                    <strong>Status:</strong> {odpcMissing ? 'Not configured' : odpcInfo.status === 'active' ? 'Registered' : 'Pending Registration'}<br/>
                    <strong>Registration Number:</strong> {odpcInfo.registration_number || 'Not configured'}<br/>
                    <strong>Data Controller:</strong> {odpcInfo.data_controller_name}
                  </p>
                  {odpcMissing ? (
                    <Badge variant="danger" className="text-xs">Not Configured</Badge>
                  ) : odpcInfo.status === 'pending' ? (
                    <Badge variant="warning" className="text-xs">ODPC Registration Pending</Badge>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-gray-500">Loading...</p>
              )}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg mt-4">
            <h4 className="font-semibold mb-2">General Privacy Inquiries</h4>
            <p className="text-sm text-gray-600">
              Email: privacy@securegate.com<br/>
              Phone: +254 700 000 001<br/>
              Response Time: Within 72 hours
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-800">
              <strong>Complaints:</strong> If you believe your privacy rights have been violated, 
              you can file a complaint with the Office of the Data Protection Commissioner (ODPC) 
              at complaints@odpc.go.ke.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-lg text-gray-600 mb-4">
            Your privacy and data protection rights under Kenya DPA 2019
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="outline">Kenya DPA 2019 Compliant</Badge>
            <Badge variant="outline">GDPR Aligned</Badge>
            <Badge variant="outline">ISO 27001</Badge>
          </div>
        </div>

        <div className="space-y-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.id} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-blue-600" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {section.content}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Questions About This Privacy Policy?
              </h3>
              <p className="text-blue-800 mb-4">
                We're committed to transparency and protecting your privacy rights.
              </p>
              <div className="flex justify-center gap-4">
                <a 
                  href="mailto:privacy@securegate.com"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Contact Us
                </a>
                <a 
                  href="/consent"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <UserCheck className="h-4 w-4" />
                  Manage Consent
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
