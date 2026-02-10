/**
 * Terms of Service Page
 * Comprehensive terms of service for Kenya DPA 2019 compliance
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';

const TermsOfService = () => {
  const sections = [
    {
      id: 'introduction',
      title: 'Terms of Service',
      icon: "Scale",
      content: (
        <div className="space-y-4">
          <p>
            These Terms of Service ("Terms") govern your use of the Secure Gate Access Control System 
            ("Service") provided by Secure Gate Technologies ("Company," "we," "our," or "us").
          </p>
          <p>
            By accessing or using our Service, you agree to be bound by these Terms. If you disagree 
            with any part of these terms, you may not access the Service.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Last Updated:</strong> October 11, 2025<br/>
              <strong>Effective Date:</strong> October 11, 2025<br/>
              <strong>Version:</strong> 1.0
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      icon: "Gavel",
      content: (
        <div className="space-y-4">
          <p>By using our Service, you confirm that:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>You are at least 18 years old or have parental consent</li>
            <li>You have the legal capacity to enter into these Terms</li>
            <li>You will comply with all applicable laws and regulations</li>
            <li>You will not use the Service for illegal or unauthorized purposes</li>
            <li>You will provide accurate and truthful information</li>
          </ul>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Important:</strong> Continued use of the Service constitutes acceptance of any 
              updates or modifications to these Terms.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'service-description',
      title: 'Service Description',
      icon: "FileText",
      content: (
        <div className="space-y-4">
          <p>Our Service provides:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Core Features:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Visitor registration and management</li>
                <li>Access control and security monitoring</li>
                <li>QR code generation for visitor passes</li>
                <li>Real-time access logging</li>
                <li>User account management</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">User Roles:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Residents: Register visitors</li>
                <li>Guards: Monitor access</li>
                <li>Administrators: System management</li>
                <li>Visitors: Temporary access</li>
              </ul>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-300">
              <strong>Service Availability:</strong> We strive to maintain 99.9% uptime, 
              but service may be temporarily unavailable for maintenance.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'user-responsibilities',
      title: 'User Responsibilities',
      icon: "Users",
      content: (
        <div className="space-y-4">
          <p>As a user of our Service, you agree to:</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Icon name="Shield" className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Security Responsibilities</h4>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Maintain the confidentiality of your account credentials and notify us immediately 
                  of any unauthorized access.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Icon name="FileText" className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Accurate Information</h4>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Provide accurate, complete, and up-to-date information when registering visitors 
                  or updating your profile.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Icon name="AlertTriangle" className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Compliance</h4>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Comply with all applicable laws, regulations, and building security policies.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'prohibited-uses',
      title: 'Prohibited Uses',
      icon: "AlertTriangle",
      content: (
        <div className="space-y-4">
          <p>You may not use our Service for:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-red-600">Illegal Activities:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Any unlawful purpose</li>
                <li>Violating security policies</li>
                <li>Facilitating unauthorized access</li>
                <li>Harassment or intimidation</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-red-600">System Abuse:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Attempting to hack or compromise security</li>
                <li>Creating false or misleading information</li>
                <li>Circumventing access controls</li>
                <li>Distributing malware or harmful code</li>
              </ul>
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Consequences:</strong> Violation of these terms may result in immediate 
              account suspension or termination, and legal action where appropriate.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'privacy-data',
      title: 'Privacy and Data Protection',
      icon: "Shield",
      content: (
        <div className="space-y-4">
          <p>
            Your privacy is important to us. Our collection and use of personal information 
            is governed by our Privacy Policy and Kenya Data Protection Act 2019.
          </p>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold">Data Collection</h4>
              <p className="text-sm text-gray-600 dark:text-gray-200">
                We collect only necessary information for security and access control purposes.
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold">Data Security</h4>
              <p className="text-sm text-gray-600 dark:text-gray-200">
                We implement industry-standard security measures to protect your data.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold">Your Rights</h4>
              <p className="text-sm text-gray-600 dark:text-gray-200">
                You have the right to access, rectify, delete, and port your personal data.
              </p>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Privacy Policy:</strong> Please review our Privacy Policy for detailed 
              information about how we handle your personal data.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'intellectual-property',
      title: 'Intellectual Property',
      icon: "FileText",
      content: (
        <div className="space-y-4">
          <p>
            The Service and its original content, features, and functionality are owned by 
            Secure Gate Technologies and are protected by international copyright, trademark, 
            patent, trade secret, and other intellectual property laws.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Icon name="FileText" className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-semibold">Service Content</h4>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  You may not copy, modify, distribute, sell, or lease any part of our Service.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Icon name="Shield" className="h-5 w-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-semibold">User Content</h4>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  You retain ownership of content you provide, but grant us license to use it 
                  for Service operation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'limitation-liability',
      title: 'Limitation of Liability',
      icon: "AlertTriangle",
      content: (
        <div className="space-y-4">
          <p>
            To the maximum extent permitted by law, Secure Gate Technologies shall not be liable 
            for any indirect, incidental, special, consequential, or punitive damages.
          </p>
          <div className="space-y-3">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-800">Service Availability</h4>
              <p className="text-sm text-yellow-800">
                We do not guarantee uninterrupted or error-free service. The Service is provided 
                "as is" without warranties of any kind.
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800">Security Incidents</h4>
              <p className="text-sm text-blue-800">
                While we implement robust security measures, we cannot guarantee absolute security 
                against all threats.
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800">Maximum Liability</h4>
              <p className="text-sm text-green-800">
                Our total liability to you shall not exceed the amount you paid for the Service 
                in the 12 months preceding the claim.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'termination',
      title: 'Termination',
      icon: "Clock",
      content: (
        <div className="space-y-4">
          <p>
            We may terminate or suspend your account and access to the Service immediately, 
            without prior notice, for conduct that we believe violates these Terms.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">We May Terminate For:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Violation of these Terms</li>
                <li>Illegal or unauthorized use</li>
                <li>Security breaches or threats</li>
                <li>Non-payment of fees</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">You May Terminate By:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Using the account deletion feature</li>
                <li>Contacting our support team</li>
                <li>Submitting a data erasure request</li>
                <li>Ceasing to use the Service</li>
              </ul>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg">
            <p className="text-sm text-gray-800 dark:text-gray-200">
              <strong>Data Retention:</strong> Upon termination, we will retain your data 
              as required by law and our data retention policy, then securely delete it.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'governing-law',
      title: 'Governing Law',
      icon: "Gavel",
      content: (
        <div className="space-y-4">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of 
            Kenya, without regard to its conflict of law provisions.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Icon name="Gavel" className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-semibold">Jurisdiction</h4>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Any disputes arising from these Terms shall be subject to the exclusive 
                  jurisdiction of the courts of Kenya.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Icon name="Shield" className="h-5 w-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-semibold">Compliance</h4>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  These Terms comply with Kenya Data Protection Act 2019 and other applicable 
                  Kenyan laws and regulations.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'contact',
      title: 'Contact Information',
      icon: "Mail",
      content: (
        <div className="space-y-4">
          <p>For questions about these Terms of Service, please contact us:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Legal Department</h4>
              <p className="text-sm text-gray-600 dark:text-gray-200">
                Email: legal@securegate.com<br/>
                Phone: +254 700 000 000<br/>
                Address: Nairobi, Kenya
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Customer Support</h4>
              <p className="text-sm text-gray-600 dark:text-gray-200">
                Email: support@securegate.com<br/>
                Phone: +254 700 000 001<br/>
                Response Time: 24 hours
              </p>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Updates:</strong> We may update these Terms from time to time. 
              We will notify you of any material changes by email or through the Service.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h1>
          <p className="text-lg text-gray-600 dark:text-gray-200 mb-4">
            Legal terms governing the use of Secure Gate Access Control System
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="outline">Kenya Law Compliant</Badge>
            <Badge variant="outline">DPA 2019 Aligned</Badge>
            <Badge variant="outline">Version 1.0</Badge>
          </div>
        </div>

        <div className="space-y-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.id} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Icon name={Icon} className="h-6 w-6 text-blue-600" />
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
                Questions About These Terms?
              </h3>
              <p className="text-blue-800 mb-4">
                We're committed to transparency and legal compliance.
              </p>
              <div className="flex justify-center gap-4">
                <a 
                  href="mailto:legal@securegate.com"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Icon name="Mail" className="h-4 w-4" />
                  Contact Legal
                </a>
                <a 
                  href="/privacy-policy"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Icon name="Shield" className="h-4 w-4" />
                  Privacy Policy
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;



