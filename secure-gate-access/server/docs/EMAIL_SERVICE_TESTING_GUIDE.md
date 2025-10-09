# Email Service Integration Testing Guide

## Overview

This guide covers comprehensive testing of the email service integration in the Secure Gate Access Control System. The email service handles visitor invitations, OTP verification, and general notifications.

## Email Service Components

### 1. Core Services
- **`notificationService.js`**: Main email service with visitor invites and OTP verification
- **`tokenHelper.js`**: Generic email utilities for OTP and general messages
- **`mfaService.js`**: Multi-factor authentication email integration

### 2. Email Templates
- **`visitorInviteTemplate`**: HTML template for visitor invitations
- **`bulkInviteTemplate`**: HTML template for bulk event invitations  
- **`otpVerificationTemplate`**: HTML template for OTP verification codes

### 3. Configuration
- **SMTP Settings**: Host, port, authentication, security
- **Environment Variables**: Required configuration parameters
- **Template Data**: Dynamic content for email personalization

## Testing Framework

### Test Files
- `tests/integration/email-service-comprehensive.test.js` - Comprehensive integration tests
- `scripts/test-email-service.js` - Manual testing script
- `tests/integration/email-service.test.js` - Basic unit tests

### Test Categories

#### 1. SMTP Configuration Tests
```javascript
// Validates required environment variables
const requiredEnvVars = [
  'SMTP_HOST',
  'SMTP_PORT', 
  'SMTP_USER',
  'SMTP_PASS',
  'FROM_EMAIL'
];
```

#### 2. Email Service Tests
- Visitor invitation emails
- OTP verification emails
- Generic email functions
- Error handling and validation

#### 3. Template Rendering Tests
- HTML template compilation
- Dynamic content injection
- XSS protection and escaping
- Mobile responsiveness

#### 4. Performance Tests
- Concurrent email sending
- Response time validation
- Memory usage monitoring
- Error rate tracking

## Running Tests

### 1. Integration Tests
```bash
# Run comprehensive email service tests
npm run test:integration -- tests/integration/email-service-comprehensive.test.js

# Run all email-related tests
npm run test:integration -- --testNamePattern="email"
```

### 2. Manual Testing Script
```bash
# Run interactive email service testing
node scripts/test-email-service.js
```

### 3. Environment Setup
```bash
# Set up test environment
export NODE_ENV=test
export SMTP_HOST=your-smtp-host
export SMTP_PORT=587
export SMTP_USER=your-username
export SMTP_PASS=your-password
export FROM_EMAIL=noreply@yourdomain.com
```

## Test Results Analysis

### Expected Behavior

#### ✅ Success Cases
- **SMTP Configured**: All email functions return `true`
- **Templates Render**: HTML content generated correctly
- **Error Handling**: Graceful degradation when SMTP unavailable
- **Validation**: Input validation works correctly

#### ⚠️ Warning Cases
- **SMTP Not Configured**: Services return `false` but don't crash
- **Invalid Email Format**: Services handle gracefully
- **Missing Data**: Services provide appropriate error messages

#### ❌ Failure Cases
- **SMTP Connection Errors**: Should be logged and handled
- **Template Compilation Errors**: Should be caught and reported
- **Memory Issues**: Should be monitored and prevented

## Email Service Features

### 1. Visitor Invitation Emails
```javascript
const visitorData = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+254712345678',
  dateOfVisit: '2025-10-07',
  time: '14:00',
  purpose: 'Meeting',
  inviteCode: 'ABC123'
};

const residentData = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  unit: 'A101'
};

await sendVisitorInviteEmail(visitorData, residentData, inviteLink);
```

### 2. OTP Verification Emails
```javascript
const visitorData = {
  name: 'John Doe',
  email: 'john.doe@example.com'
};

await sendOtpVerificationEmail(visitorData, '123456', 15);
```

### 3. Generic Email Functions
```javascript
// OTP email
await sendEmailOtp('user@example.com', '123456');

// Generic email
await sendEmail('user@example.com', 'Subject', 'Message');
```

## Template System

### 1. Handlebars Templates
- **Dynamic Content**: Visitor names, dates, codes
- **Conditional Rendering**: QR codes, special instructions
- **Responsive Design**: Mobile-friendly layouts
- **Security**: XSS protection and content escaping

### 2. Template Data Structure
```javascript
const emailData = {
  siteName: 'Secure Gate Access',
  visitorName: 'John Doe',
  residentName: 'Jane Smith',
  residentEmail: 'jane@example.com',
  visitDate: '2025-10-07',
  visitTime: '14:00',
  purpose: 'Meeting',
  inviteCode: 'ABC123',
  inviteLink: 'https://secure-gate.com/invite/abc123',
  qrCode: 'data:image/png;base64,...',
  expiryDate: '2025-10-14'
};
```

## Error Handling

### 1. SMTP Configuration Errors
```javascript
if (!transporter || !process.env.SMTP_HOST) {
  console.warn('Email service not configured');
  return false;
}
```

### 2. Template Compilation Errors
```javascript
try {
  const html = visitorInviteTemplate(emailData);
  // Send email
} catch (err) {
  console.error('Template compilation failed:', err);
  return false;
}
```

### 3. SMTP Sending Errors
```javascript
try {
  await transporter.sendMail(emailOptions);
  return true;
} catch (err) {
  console.error('Email sending failed:', err);
  return false;
}
```

## Performance Considerations

### 1. Concurrent Email Sending
- **Rate Limiting**: Prevent SMTP server overload
- **Queue Management**: Handle high-volume sending
- **Error Recovery**: Retry failed sends

### 2. Memory Management
- **Template Caching**: Compile templates once
- **Connection Pooling**: Reuse SMTP connections
- **Garbage Collection**: Clean up large objects

### 3. Monitoring
- **Success Rate**: Track email delivery success
- **Response Time**: Monitor SMTP server performance
- **Error Rate**: Track and alert on failures

## Production Deployment

### 1. Environment Configuration
```bash
# Production SMTP settings
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=secure-password
FROM_EMAIL=noreply@yourdomain.com
SITE_NAME=Secure Gate Access
SITE_URL=https://yourdomain.com
```

### 2. Monitoring Setup
- **Email Delivery Tracking**: Monitor bounce rates
- **Template Performance**: Track rendering times
- **Error Alerting**: Set up failure notifications
- **Usage Analytics**: Track email volume and patterns

### 3. Security Considerations
- **SMTP Authentication**: Use secure credentials
- **TLS Encryption**: Enable secure connections
- **Rate Limiting**: Prevent abuse
- **Content Filtering**: Scan for malicious content

## Troubleshooting

### Common Issues

#### 1. SMTP Connection Failed
```bash
# Check SMTP settings
echo $SMTP_HOST
echo $SMTP_PORT
echo $SMTP_USER

# Test SMTP connection
telnet $SMTP_HOST $SMTP_PORT
```

#### 2. Template Rendering Errors
```javascript
// Check template data
console.log('Template data:', JSON.stringify(emailData, null, 2));

// Validate required fields
const requiredFields = ['siteName', 'visitorName', 'residentName'];
requiredFields.forEach(field => {
  if (!emailData[field]) {
    console.error(`Missing required field: ${field}`);
  }
});
```

#### 3. Email Not Delivered
- Check spam folders
- Verify SMTP authentication
- Test with different email providers
- Check SMTP server logs

### Debug Mode
```bash
# Enable debug logging
export DEBUG=email:*
node scripts/test-email-service.js
```

## Test Coverage

### Current Coverage
- ✅ SMTP Configuration Validation
- ✅ Email Service Function Calls
- ✅ Template Data Validation
- ✅ Error Handling
- ✅ Performance Testing
- ✅ Concurrent Operations

### Coverage Goals
- 🎯 95%+ code coverage
- 🎯 All email templates tested
- 🎯 All error scenarios covered
- 🎯 Performance benchmarks met

## Conclusion

The email service integration testing provides comprehensive validation of all email functionality in the Secure Gate Access Control System. The testing framework ensures reliable email delivery, proper error handling, and optimal performance in production environments.

For questions or issues, refer to the main project documentation or contact the development team.




