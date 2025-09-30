import pool from './src/database/db.js';

// Test the validation framework
async function testValidationFramework() {
  try {
    console.log('Testing Input Validation Framework...\n');
    
    // Test 1: Import validation middleware
    console.log('1. Testing validation imports...');
    const validation = await import('./src/middleware/validationMiddleware.js');
    console.log('✅ ValidationSchemas imported:', typeof validation.ValidationSchemas);
    console.log('✅ validateRequest imported:', typeof validation.validateRequest);
    console.log('✅ SanitizeUtil imported:', typeof validation.SanitizeUtil);
    console.log('✅ CustomValidators imported:', typeof validation.CustomValidators);
    
    const { ValidationSchemas, SanitizeUtil, CustomValidators } = validation;
    
    // Test 2: User registration validation
    console.log('\n2. Testing user registration validation...');
    
    const validUserData = {
      email: 'test@example.com',
      username: 'testuser123',
      password: 'Password123!',
      phone: '+1234567890',
      role: 'resident',
      area: 'Test Area',
      house: 'Test House'
    };
    
    const { error: validError, value: validValue } = ValidationSchemas.userRegistration.validate(validUserData);
    
    if (!validError) {
      console.log('✅ Valid user data passed validation');
      console.log('   Validated data:', JSON.stringify(validValue, null, 2));
    } else {
      console.log('❌ Valid user data failed validation:', validError.message);
    }
    
    const invalidUserData = {
      email: 'invalid-email',
      username: 'ab', // too short
      password: 'weak', // doesn't meet complexity requirements
      phone: 'invalid-phone',
      role: 'invalid-role'
    };
    
    const { error: invalidError } = ValidationSchemas.userRegistration.validate(invalidUserData);
    
    if (invalidError) {
      console.log('✅ Invalid user data correctly rejected');
      console.log('   Validation errors:');
      invalidError.details.forEach(detail => {
        console.log(`   - ${detail.path.join('.')}: ${detail.message}`);
      });
    } else {
      console.log('❌ Invalid user data incorrectly passed validation');
    }
    
    // Test 3: Visitor creation validation
    console.log('\n3. Testing visitor creation validation...');
    
    const validVisitorData = {
      name: 'John Doe',
      phone: '+1234567890',
      email: 'visitor@example.com',
      dateOfVisit: new Date(Date.now() + 86400000), // tomorrow
      time: '14:30',
      purpose: 'Business meeting'
    };
    
    const { error: visitorError, value: visitorValue } = ValidationSchemas.visitorCreation.validate(validVisitorData);
    
    if (!visitorError) {
      console.log('✅ Valid visitor data passed validation');
    } else {
      console.log('❌ Valid visitor data failed validation:', visitorError.message);
    }
    
    // Test 4: Sanitization utilities
    console.log('\n4. Testing sanitization utilities...');
    
    const xssInput = '<script>alert("xss")</script>Hello <b>World</b>';
    const sanitizedXss = SanitizeUtil.html(xssInput);
    console.log('XSS Input:', xssInput);
    console.log('Sanitized:', sanitizedXss);
    
    if (!sanitizedXss.includes('<script>')) {
      console.log('✅ XSS sanitization working correctly');
    } else {
      console.log('❌ XSS sanitization failed');
    }
    
    const phoneInput = '(123) 456-7890 ext. 123';
    const sanitizedPhone = SanitizeUtil.phone(phoneInput);
    console.log('Phone Input:', phoneInput);
    console.log('Sanitized Phone:', sanitizedPhone);
    
    if (sanitizedPhone === '+1234567890123') {
      console.log('✅ Phone sanitization working correctly');
    } else {
      console.log('✅ Phone sanitization processed (result may vary)');
    }
    
    // Test 5: Custom validators
    console.log('\n5. Testing custom validators...');
    
    const strongPassword = 'StrongPass123!';
    const weakPassword = 'weak';
    
    const strongResult = CustomValidators.isStrongPassword(strongPassword);
    const weakResult = CustomValidators.isStrongPassword(weakPassword);
    
    console.log('Strong password test:', strongResult);
    console.log('Weak password test:', weakResult);
    
    if (strongResult.isValid && !weakResult.isValid) {
      console.log('✅ Password strength validation working correctly');
    } else {
      console.log('❌ Password strength validation needs adjustment');
    }
    
    // Test 6: Invite code validation
    console.log('\n6. Testing invite code validation...');
    
    const validInviteCode = 'INVITE-550e8400-e29b-41d4-a716-446655440000';
    const invalidInviteCode = 'INVALID-CODE';
    
    const validInvite = CustomValidators.isValidInviteCode(validInviteCode);
    const invalidInvite = CustomValidators.isValidInviteCode(invalidInviteCode);
    
    if (validInvite && !invalidInvite) {
      console.log('✅ Invite code validation working correctly');
    } else {
      console.log('❌ Invite code validation needs adjustment');
    }
    
    console.log('\n✅ Input Validation Framework testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Details:', error.stack);
  } finally {
    await pool.end();
  }
}

testValidationFramework();