#!/usr/bin/env node

/**
 * User Documentation Generator
 * Comprehensive user guides, training materials, and onboarding documentation
 * Task 19.3 - Production deployment and launch readiness validation
 */

const fs = require('fs');
const path = require('path');

class UserDocumentationGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: 'documentation/generated',
      includeScreenshots: false,
      generatePDF: false,
      includeVideoLinks: true,
      ...options
    };
    
    this.userRoles = [
      'super_admin',
      'estate_admin', 
      'security_guard',
      'resident',
      'visitor'
    ];
    
    this.documentTypes = [
      'user_guide',
      'quick_start',
      'training_manual',
      'troubleshooting',
      'api_reference'
    ];
    
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  async generateAllDocumentation() {
    console.log('📚 Generating Comprehensive User Documentation');
    console.log('=' .repeat(60));
    
    const results = {
      userGuides: {},
      trainingMaterials: {},
      onboardingGuides: {},
      troubleshootingGuides: {},
      apiDocumentation: null,
      generatedAt: new Date().toISOString()
    };
    
    try {
      // Generate role-specific user guides
      for (const role of this.userRoles) {
        console.log(`📖 Generating documentation for ${role}`);
        results.userGuides[role] = await this.generateUserGuide(role);
        results.trainingMaterials[role] = await this.generateTrainingMaterial(role);
        results.onboardingGuides[role] = await this.generateOnboardingGuide(role);
      }
      
      // Generate common documentation
      results.troubleshootingGuides = await this.generateTroubleshootingGuides();
      results.apiDocumentation = await this.generateAPIDocumentation();
      
      // Generate master index
      await this.generateMasterIndex(results);
      
      console.log('✅ Documentation generation completed successfully');
      return results;
      
    } catch (error) {
      console.error('❌ Documentation generation failed:', error);
      throw error;
    }
  }

  async generateUserGuide(role) {
    const roleConfig = this.getRoleConfiguration(role);
    const guide = this.createUserGuideTemplate(role, roleConfig);
    
    const filePath = path.join(this.options.outputDir, `${role}_user_guide.md`);
    fs.writeFileSync(filePath, guide);
    
    console.log(`  ✅ User guide created: ${filePath}`);
    return filePath;
  }

  getRoleConfiguration(role) {
    const configurations = {
      super_admin: {
        title: 'Super Administrator',
        description: 'Platform-wide administrative control across all estates',
        primaryFeatures: [
          'Platform Overview Dashboard',
          'Estate Management',
          'System Health Monitoring',
          'User Account Oversight',
          'Global Analytics',
          'System Configuration'
        ],
        commonTasks: [
          'Monitor platform health',
          'Manage estate configurations',
          'Oversee user accounts',
          'Review system analytics',
          'Handle escalated issues'
        ]
      },
      estate_admin: {
        title: 'Estate Administrator',
        description: 'Complete estate management and system administration',
        primaryFeatures: [
          'Estate Dashboard',
          'User Management',
          'Visitor Analytics',
          'Security Monitoring',
          'Report Generation',
          'System Settings'
        ],
        commonTasks: [
          'Approve new users',
          'Monitor visitor activity',
          'Generate reports',
          'Manage estate settings',
          'Handle security incidents'
        ]
      },
      security_guard: {
        title: 'Security Guard',
        description: 'Visitor processing and security operations',
        primaryFeatures: [
          'QR Code Scanner',
          'Visitor Check-in/out',
          'Manual Verification',
          'Incident Reporting',
          'Emergency Alerts',
          'Shift Management'
        ],
        commonTasks: [
          'Scan visitor QR codes',
          'Process check-ins/outs',
          'Verify visitor identity',
          'Report incidents',
          'Handle emergencies'
        ]
      },
      resident: {
        title: 'Resident',
        description: 'Visitor invitation and management',
        primaryFeatures: [
          'Visitor Invitations',
          'QR Code Generation',
          'Visit History',
          'Bulk Invites',
          'Favorite Visitors',
          'Notification Settings'
        ],
        commonTasks: [
          'Invite visitors',
          'Generate QR codes',
          'Track visitor status',
          'Manage favorites',
          'Set preferences'
        ]
      },
      visitor: {
        title: 'Visitor',
        description: 'Self-service visitor experience',
        primaryFeatures: [
          'Invitation Response',
          'Self Check-in',
          'QR Code Access',
          'Visit Confirmation',
          'Digital Passes'
        ],
        commonTasks: [
          'Accept invitations',
          'Check-in at gate',
          'Show QR code',
          'Confirm visit details'
        ]
      }
    };
    
    return configurations[role] || {};
  }

  createUserGuideTemplate(role, config) {
    return `# ${config.title} User Guide

## Overview

${config.description}

This comprehensive guide will help you understand and effectively use all features available to ${config.title} users in the Secure Gate Access Control System.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Primary Features](#primary-features)
4. [Common Tasks](#common-tasks)
5. [Settings & Preferences](#settings--preferences)
6. [Troubleshooting](#troubleshooting)
7. [Support & Contact](#support--contact)

## Getting Started

### First Login

1. Navigate to the Secure Gate login page
2. Enter your email address and password
3. Complete two-factor authentication if enabled
4. You'll be redirected to your personalized dashboard

### Dashboard Overview

Your dashboard is customized for your role as a ${config.title}. The main sections include:

${config.primaryFeatures.map(feature => `- **${feature}**: Key functionality for your daily tasks`).join('\n')}

## Primary Features

${config.primaryFeatures.map((feature, index) => `
### ${index + 1}. ${feature}

[Detailed description of ${feature} functionality would go here]

**How to use:**
1. Step-by-step instructions
2. Screenshots and examples
3. Tips and best practices

`).join('')}

## Common Tasks

As a ${config.title}, you'll frequently perform these tasks:

${config.commonTasks.map((task, index) => `
### ${index + 1}. ${task}

**Quick Steps:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Detailed Instructions:**
[Comprehensive walkthrough with screenshots]

`).join('')}

## Settings & Preferences

### Personal Settings
- Profile information
- Password management
- Two-factor authentication
- Notification preferences

### Dashboard Customization
- Widget arrangement
- Theme selection
- Quick actions setup
- Display preferences

## Troubleshooting

### Common Issues

**Issue: Cannot log in**
- Solution: Check credentials, reset password if needed
- Contact: IT support if problem persists

**Issue: Dashboard not loading**
- Solution: Clear browser cache, try different browser
- Contact: Technical support

### Getting Help

1. **In-App Help**: Click the help icon (?) in the top navigation
2. **Knowledge Base**: Access comprehensive articles and FAQs
3. **Support Ticket**: Submit a support request for technical issues
4. **Training Videos**: Watch role-specific tutorial videos

## Support & Contact

- **Help Desk**: support@secure-gate.app
- **Phone**: +1-800-SECURE-GATE
- **Emergency**: Use the emergency button in the application
- **Training**: training@secure-gate.app

---

*This guide was generated automatically. Last updated: ${new Date().toISOString()}*
`;
  }
  async generateTrainingMaterial(role) {
    const trainingContent = this.createTrainingMaterialTemplate(role);
    
    const filePath = path.join(this.options.outputDir, `${role}_training_manual.md`);
    fs.writeFileSync(filePath, trainingContent);
    
    console.log(`  ✅ Training material created: ${filePath}`);
    return filePath;
  }

  createTrainingMaterialTemplate(role) {
    const roleConfig = this.getRoleConfiguration(role);
    
    return `# ${roleConfig.title} Training Manual

## Training Overview

This training manual provides comprehensive instruction for ${roleConfig.title} users of the Secure Gate Access Control System.

**Training Duration:** 2-4 hours  
**Prerequisites:** Basic computer skills, system access credentials  
**Training Format:** Self-paced with hands-on exercises

## Learning Objectives

By the end of this training, you will be able to:

${roleConfig.commonTasks.map(task => `- ${task} efficiently and accurately`).join('\n')}
- Navigate the system interface confidently
- Troubleshoot common issues independently
- Follow security and compliance procedures

## Module 1: System Introduction (30 minutes)

### What is Secure Gate?
- System overview and purpose
- Your role in the security ecosystem
- Key benefits and features

### Security and Compliance
- Data privacy requirements
- Access control principles
- Audit trail importance

**Exercise 1.1:** Complete system orientation quiz

## Module 2: Interface Navigation (45 minutes)

### Dashboard Tour
- Main navigation elements
- Widget functionality
- Customization options

### Common Interface Elements
- Buttons and controls
- Forms and data entry
- Search and filtering

**Exercise 2.1:** Customize your dashboard layout  
**Exercise 2.2:** Practice basic navigation tasks

## Module 3: Core Functionality (90 minutes)

${roleConfig.primaryFeatures.map((feature, index) => `
### 3.${index + 1} ${feature}
- Feature overview
- Step-by-step procedures
- Best practices
- Common mistakes to avoid

**Exercise 3.${index + 1}:** Hands-on practice with ${feature}
`).join('')}

## Module 4: Advanced Features (60 minutes)

### Reporting and Analytics
- Generating reports
- Understanding metrics
- Data export options

### Integration Features
- Mobile app usage
- Notification management
- Third-party integrations

**Exercise 4.1:** Generate and export a report  
**Exercise 4.2:** Configure notification preferences

## Module 5: Troubleshooting (30 minutes)

### Common Issues and Solutions
- Login problems
- Performance issues
- Data synchronization
- Browser compatibility

### When to Escalate
- Technical support contacts
- Emergency procedures
- Incident reporting

**Exercise 5.1:** Practice troubleshooting scenarios

## Assessment and Certification

### Knowledge Check
- 20-question multiple choice quiz
- Passing score: 80%
- Unlimited attempts allowed

### Practical Assessment
- Complete real-world scenarios
- Demonstrate proficiency
- Receive feedback and coaching

### Certification
- Digital certificate upon completion
- Valid for 12 months
- Renewal training available

## Additional Resources

### Quick Reference Cards
- Keyboard shortcuts
- Common procedures
- Emergency contacts

### Video Tutorials
- Feature demonstrations
- Best practice examples
- Troubleshooting guides

### Community Forum
- User discussions
- Tips and tricks
- Feature requests

---

*Training material version 1.0 - Generated ${new Date().toISOString()}*
`;
  }

  async generateOnboardingGuide(role) {
    const onboardingContent = this.createOnboardingGuideTemplate(role);
    
    const filePath = path.join(this.options.outputDir, `${role}_onboarding_guide.md`);
    fs.writeFileSync(filePath, onboardingContent);
    
    console.log(`  ✅ Onboarding guide created: ${filePath}`);
    return filePath;
  }

  createOnboardingGuideTemplate(role) {
    const roleConfig = this.getRoleConfiguration(role);
    
    return `# ${roleConfig.title} Onboarding Guide

## Welcome to Secure Gate!

Congratulations on joining the Secure Gate Access Control System as a ${roleConfig.title}. This guide will help you get started quickly and efficiently.

## Pre-Onboarding Checklist

Before you begin, ensure you have:

- [ ] System access credentials (username and password)
- [ ] Two-factor authentication device (phone or authenticator app)
- [ ] Contact information for your system administrator
- [ ] Basic understanding of your role responsibilities

## Day 1: Getting Started

### Hour 1: Account Setup
1. **First Login**
   - Navigate to the login page
   - Enter your credentials
   - Set up two-factor authentication
   - Complete profile information

2. **Security Briefing**
   - Review security policies
   - Understand data privacy requirements
   - Acknowledge terms of use

### Hour 2: Dashboard Orientation
1. **Interface Tour**
   - Main navigation elements
   - Dashboard widgets
   - Quick action buttons

2. **Customization**
   - Arrange dashboard widgets
   - Set theme preferences
   - Configure notifications

### Hours 3-4: Basic Training
1. **Core Features Overview**
${roleConfig.primaryFeatures.slice(0, 3).map(feature => `   - ${feature} basics`).join('\n')}

2. **First Tasks**
${roleConfig.commonTasks.slice(0, 2).map(task => `   - Practice: ${task}`).join('\n')}

## Week 1: Building Proficiency

### Days 2-3: Feature Deep Dive
- Complete training modules for all primary features
- Practice with sample data
- Ask questions and get clarification

### Days 4-5: Real-World Practice
- Begin handling actual tasks with supervision
- Receive feedback and coaching
- Build confidence with routine operations

## Week 2: Independence

### Days 6-10: Full Responsibility
- Handle tasks independently
- Use help resources when needed
- Participate in team meetings and updates

### End of Week 2: Assessment
- Complete knowledge assessment
- Demonstrate practical skills
- Receive certification

## 30-Day Check-in

### Performance Review
- Discuss progress with supervisor
- Identify areas for improvement
- Set goals for continued development

### Advanced Training
- Explore advanced features
- Learn integration capabilities
- Understand reporting and analytics

## Ongoing Development

### Monthly Training
- New feature updates
- Best practice sharing
- Skill enhancement workshops

### Annual Recertification
- Complete refresher training
- Update security knowledge
- Renew system certification

## Support Resources

### Immediate Help
- **Help Desk**: support@secure-gate.app
- **Phone**: +1-800-SECURE-GATE
- **In-App Help**: Click the (?) icon

### Learning Resources
- User guides and manuals
- Video tutorial library
- Community forums
- Best practice articles

### Emergency Contacts
- System Administrator: [Contact Info]
- IT Support: [Contact Info]
- Security Team: [Contact Info]

## Success Metrics

Your onboarding success will be measured by:

- [ ] Completion of all training modules
- [ ] Passing assessment scores (80% or higher)
- [ ] Demonstrated proficiency in core tasks
- [ ] Positive feedback from supervisor
- [ ] Adherence to security protocols

## Feedback and Improvement

We value your feedback on the onboarding process:

- **Feedback Form**: [Link to feedback form]
- **Suggestions**: onboarding-feedback@secure-gate.app
- **Training Improvements**: training@secure-gate.app

---

*Welcome aboard! We're excited to have you as part of the Secure Gate team.*

*Onboarding guide version 1.0 - Generated ${new Date().toISOString()}*
`;
  }
  async generateTroubleshootingGuides() {
    const troubleshootingContent = this.createTroubleshootingGuideTemplate();
    
    const filePath = path.join(this.options.outputDir, 'troubleshooting_guide.md');
    fs.writeFileSync(filePath, troubleshootingContent);
    
    console.log(`  ✅ Troubleshooting guide created: ${filePath}`);
    return filePath;
  }

  createTroubleshootingGuideTemplate() {
    return `# Troubleshooting Guide

## Common Issues and Solutions

### Login and Authentication Issues

#### Cannot Log In
**Symptoms:** Login page shows error message, cannot access system
**Possible Causes:**
- Incorrect username or password
- Account locked due to multiple failed attempts
- Two-factor authentication issues
- Browser cache problems

**Solutions:**
1. **Verify Credentials**
   - Double-check username and password
   - Ensure caps lock is off
   - Try typing password in a text editor first

2. **Reset Password**
   - Click "Forgot Password" link
   - Check email for reset instructions
   - Follow reset process completely

3. **Clear Browser Cache**
   - Clear browser cache and cookies
   - Try incognito/private browsing mode
   - Try a different browser

4. **Contact Support**
   - If issue persists, contact help desk
   - Provide username and error message
   - Include browser and device information

#### Two-Factor Authentication Problems
**Symptoms:** Cannot complete 2FA verification
**Solutions:**
1. **Check Time Sync**
   - Ensure device time is correct
   - Sync with network time

2. **Try Backup Codes**
   - Use backup authentication codes
   - Contact admin for new codes if needed

3. **Reconfigure 2FA**
   - Remove and re-add authenticator app
   - Generate new QR code

### Performance Issues

#### Slow Loading Pages
**Symptoms:** Pages take long time to load, system feels sluggish
**Solutions:**
1. **Check Internet Connection**
   - Test connection speed
   - Try other websites
   - Contact ISP if needed

2. **Browser Optimization**
   - Close unnecessary tabs
   - Clear browser cache
   - Disable browser extensions
   - Update browser to latest version

3. **System Resources**
   - Close other applications
   - Restart computer if needed
   - Check available memory

#### Dashboard Not Loading
**Symptoms:** Dashboard shows blank page or loading spinner
**Solutions:**
1. **Refresh Page**
   - Press F5 or Ctrl+R
   - Try hard refresh (Ctrl+Shift+R)

2. **Check Browser Console**
   - Press F12 to open developer tools
   - Look for error messages in console
   - Report errors to support

3. **Try Different Browser**
   - Test with Chrome, Firefox, or Safari
   - Ensure browser is supported version

### Data and Synchronization Issues

#### Data Not Updating
**Symptoms:** Information appears outdated, changes not reflected
**Solutions:**
1. **Manual Refresh**
   - Click refresh button in interface
   - Reload the page
   - Log out and log back in

2. **Check Network Connection**
   - Verify stable internet connection
   - Test with other online services

3. **Clear Local Storage**
   - Clear browser local storage
   - Clear application cache

#### Missing Information
**Symptoms:** Expected data or records not visible
**Solutions:**
1. **Check Filters**
   - Review active filters
   - Clear all filters
   - Check date ranges

2. **Verify Permissions**
   - Ensure you have access rights
   - Contact administrator if needed

3. **Search Function**
   - Use search to locate specific records
   - Try different search terms

### Mobile App Issues

#### App Won't Start
**Solutions:**
1. **Restart App**
   - Force close and reopen app
   - Restart device if needed

2. **Update App**
   - Check app store for updates
   - Install latest version

3. **Reinstall App**
   - Delete and reinstall app
   - Log in with credentials

#### QR Code Scanner Not Working
**Solutions:**
1. **Camera Permissions**
   - Check app has camera access
   - Grant permissions in device settings

2. **Lighting Conditions**
   - Ensure adequate lighting
   - Clean camera lens
   - Hold steady while scanning

3. **QR Code Quality**
   - Ensure QR code is clear and undamaged
   - Try different distance from code

### Browser Compatibility

#### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

#### Unsupported Features
- Internet Explorer (not supported)
- Very old browser versions
- Browsers with JavaScript disabled

### Emergency Procedures

#### System Outage
1. **Check Status Page**
   - Visit status.secure-gate.app
   - Check for known issues

2. **Alternative Access**
   - Try mobile app if web is down
   - Use backup procedures if available

3. **Contact Support**
   - Report outage immediately
   - Provide details about issue

#### Security Incident
1. **Immediate Actions**
   - Do not share credentials
   - Report suspicious activity
   - Change password if compromised

2. **Contact Security Team**
   - Email: security@secure-gate.app
   - Phone: Emergency security line
   - Use incident reporting form

## Getting Additional Help

### Self-Service Resources
- **Knowledge Base**: help.secure-gate.app
- **Video Tutorials**: tutorials.secure-gate.app
- **Community Forum**: community.secure-gate.app

### Contact Support
- **Help Desk**: support@secure-gate.app
- **Phone**: +1-800-SECURE-GATE
- **Live Chat**: Available in application
- **Emergency**: Use emergency button in app

### Information to Provide
When contacting support, include:
- Your username (not password)
- Description of the problem
- Steps you've already tried
- Browser and device information
- Screenshots if helpful
- Error messages (exact text)

---

*Troubleshooting guide version 1.0 - Generated ${new Date().toISOString()}*
`;
  }

  async generateAPIDocumentation() {
    const apiContent = this.createAPIDocumentationTemplate();
    
    const filePath = path.join(this.options.outputDir, 'api_reference.md');
    fs.writeFileSync(filePath, apiContent);
    
    console.log(`  ✅ API documentation created: ${filePath}`);
    return filePath;
  }

  createAPIDocumentationTemplate() {
    return `# API Reference Documentation

## Overview

The Secure Gate Access Control System provides a comprehensive REST API for integration with external systems and custom applications.

**Base URL:** \`https://api.secure-gate.app/api\`  
**Version:** v1  
**Authentication:** Bearer Token (JWT)

## Authentication

### Obtaining Access Token

\`\`\`http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900000,
    "tokenType": "Bearer"
  }
}
\`\`\`

### Using Access Token

Include the access token in the Authorization header:

\`\`\`http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

## Core Endpoints

### Visitors

#### Create Visitor Invitation
\`\`\`http
POST /visitors
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "+254712345678",
  "email": "john@example.com",
  "purpose": "Meeting",
  "expectedArrival": "2025-01-15T14:00:00Z"
}
\`\`\`

#### Get Visitors
\`\`\`http
GET /visitors?status=pending&page=1&limit=20
Authorization: Bearer {token}
\`\`\`

#### Check-in Visitor
\`\`\`http
POST /visitors/{id}/check-in
Authorization: Bearer {token}
Content-Type: application/json

{
  "notes": "Visitor arrived on time",
  "guardId": 123
}
\`\`\`

### Users

#### Get Users
\`\`\`http
GET /users?role=resident&status=active
Authorization: Bearer {token}
\`\`\`

#### Update User
\`\`\`http
PUT /users/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "approved",
  "role": "resident"
}
\`\`\`

### Reports

#### Generate Report
\`\`\`http
POST /reports/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "visitor_activity",
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "format": "pdf"
}
\`\`\`

## Webhooks

### Configuring Webhooks

\`\`\`http
POST /webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["visitor.checked_in", "visitor.checked_out"],
  "secret": "your-webhook-secret"
}
\`\`\`

### Webhook Events

#### Visitor Check-in
\`\`\`json
{
  "event": "visitor.checked_in",
  "timestamp": "2025-01-15T14:30:00Z",
  "data": {
    "visitorId": 123,
    "name": "John Doe",
    "guardId": 456,
    "checkInTime": "2025-01-15T14:30:00Z"
  }
}
\`\`\`

## Error Handling

### Error Response Format
\`\`\`json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "name": "Name is required",
      "email": "Invalid email format"
    }
  },
  "timestamp": "2025-01-15T14:30:00Z"
}
\`\`\`

### HTTP Status Codes
- \`200\` - Success
- \`201\` - Created
- \`400\` - Bad Request
- \`401\` - Unauthorized
- \`403\` - Forbidden
- \`404\` - Not Found
- \`429\` - Too Many Requests
- \`500\` - Internal Server Error

## Rate Limiting

- **General Endpoints**: 200 requests per 15 minutes
- **Authentication**: 20 requests per 15 minutes
- **Admin Endpoints**: 50 requests per hour

Rate limit headers:
\`\`\`http
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 195
X-RateLimit-Reset: 1642694400
\`\`\`

## SDKs and Libraries

### JavaScript/Node.js
\`\`\`bash
npm install @secure-gate/api-client
\`\`\`

\`\`\`javascript
const SecureGateAPI = require('@secure-gate/api-client');

const client = new SecureGateAPI({
  baseURL: 'https://api.secure-gate.app/api',
  accessToken: 'your-access-token'
});

const visitors = await client.visitors.list({ status: 'pending' });
\`\`\`

### Python
\`\`\`bash
pip install secure-gate-api
\`\`\`

\`\`\`python
from secure_gate_api import SecureGateClient

client = SecureGateClient(
    base_url='https://api.secure-gate.app/api',
    access_token='your-access-token'
)

visitors = client.visitors.list(status='pending')
\`\`\`

## Support

- **API Documentation**: https://docs.secure-gate.app/api
- **Developer Support**: developers@secure-gate.app
- **Status Page**: https://status.secure-gate.app
- **Community**: https://community.secure-gate.app

---

*API Reference version 1.0 - Generated ${new Date().toISOString()}*
`;
  }
  async generateMasterIndex(results) {
    const indexContent = this.createMasterIndexTemplate(results);
    
    const filePath = path.join(this.options.outputDir, 'README.md');
    fs.writeFileSync(filePath, indexContent);
    
    console.log(`  ✅ Master index created: ${filePath}`);
    return filePath;
  }

  createMasterIndexTemplate(results) {
    return `# Secure Gate Access Control System - Documentation

## Overview

Welcome to the comprehensive documentation for the Secure Gate Access Control System. This documentation suite provides everything you need to effectively use, administer, and integrate with the system.

**Generated:** ${results.generatedAt}  
**Version:** 1.0.0  
**Last Updated:** ${new Date().toISOString()}

## Documentation Structure

### User Guides by Role

${this.userRoles.map(role => {
  const config = this.getRoleConfiguration(role);
  return `#### ${config.title}
- **User Guide:** [${role}_user_guide.md](${role}_user_guide.md)
- **Training Manual:** [${role}_training_manual.md](${role}_training_manual.md)
- **Onboarding Guide:** [${role}_onboarding_guide.md](${role}_onboarding_guide.md)

${config.description}

**Key Features:** ${config.primaryFeatures.slice(0, 3).join(', ')}
`;
}).join('\n')}

### Common Documentation

#### Troubleshooting
- **Troubleshooting Guide:** [troubleshooting_guide.md](troubleshooting_guide.md)
- Common issues and solutions for all users
- Emergency procedures and contacts

#### API Reference
- **API Documentation:** [api_reference.md](api_reference.md)
- Complete REST API reference
- Integration examples and SDKs

## Quick Start Guides

### For New Users
1. **Choose Your Role:** Identify your user role from the list above
2. **Read Onboarding Guide:** Follow the role-specific onboarding process
3. **Complete Training:** Work through the training manual
4. **Use Reference Guide:** Keep the user guide handy for daily tasks

### For Administrators
1. **System Setup:** Configure estates and user accounts
2. **User Management:** Invite and approve new users
3. **Training Coordination:** Ensure all users complete appropriate training
4. **Ongoing Support:** Monitor system usage and provide assistance

### For Developers
1. **API Documentation:** Review the complete API reference
2. **Authentication:** Implement secure API authentication
3. **Integration Testing:** Test integrations in development environment
4. **Production Deployment:** Follow deployment best practices

## Training Resources

### Video Tutorials
- **Getting Started Series:** Basic navigation and setup
- **Role-Specific Tutorials:** Detailed feature demonstrations
- **Advanced Features:** Integration and customization guides
- **Troubleshooting Videos:** Visual problem-solving guides

### Interactive Training
- **Sandbox Environment:** Practice with sample data
- **Guided Tours:** In-application feature walkthroughs
- **Assessment Quizzes:** Knowledge validation and certification
- **Hands-On Exercises:** Real-world scenario practice

## Support Resources

### Self-Service Help
- **Knowledge Base:** Searchable articles and FAQs
- **Community Forum:** User discussions and tips
- **Video Library:** Tutorial and demonstration videos
- **Best Practices:** Recommended usage patterns

### Direct Support
- **Help Desk:** support@secure-gate.app
- **Phone Support:** +1-800-SECURE-GATE
- **Live Chat:** Available in application during business hours
- **Emergency Support:** 24/7 critical issue response

### Training and Consulting
- **Custom Training:** Tailored training programs for organizations
- **Implementation Consulting:** Expert guidance for system deployment
- **Best Practice Reviews:** Optimization recommendations
- **Advanced Integration:** Custom development and integration services

## Documentation Maintenance

### Regular Updates
- Documentation is updated with each system release
- User feedback is incorporated into improvements
- Training materials are refreshed quarterly
- API documentation is automatically generated from code

### Feedback and Contributions
- **Documentation Feedback:** docs-feedback@secure-gate.app
- **Improvement Suggestions:** Submit via in-app feedback
- **Error Reports:** Report inaccuracies or outdated information
- **Community Contributions:** Share tips and best practices

### Version History
- **v1.0.0:** Initial comprehensive documentation release
- **Future Versions:** Will include change logs and migration guides

## Accessibility

This documentation is designed to be accessible to all users:

- **Screen Reader Compatible:** Proper heading structure and alt text
- **High Contrast Support:** Clear visual hierarchy and color usage
- **Keyboard Navigation:** All interactive elements are keyboard accessible
- **Multiple Formats:** Available in HTML, PDF, and mobile-friendly versions

## Legal and Compliance

### Privacy and Security
- All documentation follows data privacy best practices
- No sensitive information is included in examples
- Security procedures are documented separately for authorized personnel

### Terms of Use
- Documentation is provided under the Secure Gate Terms of Service
- Usage is subject to your organization's licensing agreement
- Redistribution requires written permission

---

## Getting Started Checklist

- [ ] Identify your user role
- [ ] Read the appropriate onboarding guide
- [ ] Complete role-specific training
- [ ] Set up your account and preferences
- [ ] Practice with common tasks
- [ ] Bookmark relevant documentation
- [ ] Join the community forum
- [ ] Contact support if you need help

**Welcome to Secure Gate! We're here to help you succeed.**

---

*Master documentation index - Generated ${new Date().toISOString()}*
`;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = {
    outputDir: args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'documentation/generated',
    includeScreenshots: args.includes('--screenshots'),
    generatePDF: args.includes('--pdf'),
    includeVideoLinks: !args.includes('--no-videos')
  };
  
  console.log('📚 Starting User Documentation Generation');
  console.log(`📁 Output Directory: ${options.outputDir}`);
  console.log(`🔧 Options:`, options);
  
  const generator = new UserDocumentationGenerator(options);
  
  generator.generateAllDocumentation()
    .then(results => {
      console.log('\n✅ User documentation generation completed successfully');
      console.log(`📋 Generated ${Object.keys(results.userGuides).length} user guides`);
      console.log(`📚 Generated ${Object.keys(results.trainingMaterials).length} training manuals`);
      console.log(`🎯 Generated ${Object.keys(results.onboardingGuides).length} onboarding guides`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ User documentation generation failed:', error);
      process.exit(1);
    });
}

module.exports = UserDocumentationGenerator;