// Email templates for visitor notifications
import Handlebars from 'handlebars';

// Visitor Invitation Email Template
const visitorInviteTemplate = Handlebars.compile(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visitor Invitation - {{siteName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e293b, #334155); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #059669; }
        .info-box { background: #e0f2fe; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; }
        .qr-code { text-align: center; margin: 20px 0; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: bold; color: #475569; }
        .detail-value { color: #1e293b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 Visitor Invitation</h1>
            <p>You've been invited to visit {{siteName}}</p>
        </div>
        
        <div class="content">
            <h2>Hello {{visitorName}}!</h2>
            <p>You have been invited to visit <strong>{{siteName}}</strong> by {{residentName}}.</p>
            
            <div class="info-box">
                <h3>📋 Visit Details</h3>
                <div class="details">
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">{{visitDate}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">{{visitTime}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Purpose:</span>
                        <span class="detail-value">{{purpose}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Invite Code:</span>
                        <span class="detail-value"><code>{{inviteCode}}</code></span>
                    </div>
                </div>
            </div>
            
            {{#if qrCode}}
            <div class="qr-code">
                <h3>📱 Your QR Code</h3>
                <img src="{{qrCode}}" alt="QR Code" style="max-width: 200px; height: auto;">
                <p><small>Show this QR code at the gate for quick access</small></p>
            </div>
            {{/if}}
            
            <div style="text-align: center;">
                <a href="{{inviteLink}}" class="button">Complete Registration</a>
            </div>
            
            <div class="info-box">
                <h4>📝 Next Steps:</h4>
                <ol>
                    <li>Click the button above to complete your registration</li>
                    <li>Provide your contact details and ID information</li>
                    <li>Verify your phone number with the OTP code</li>
                    <li>Download or screenshot your QR code for gate access</li>
                </ol>
            </div>
            
            <div class="footer">
                <p>This invitation is valid until {{expiryDate}}</p>
                <p>If you have any questions, please contact {{residentName}} at {{residentEmail}}</p>
                <p><small>Powered by Secure Gate Access System</small></p>
            </div>
        </div>
    </div>
</body>
</html>
`);

// Bulk Invitation Email Template
const bulkInviteTemplate = Handlebars.compile(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Invitation - {{siteName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #2563eb; }
        .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: bold; color: #475569; }
        .detail-value { color: #1e293b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Event Invitation</h1>
            <p>You're invited to {{eventName}}</p>
        </div>
        
        <div class="content">
            <h2>Hello!</h2>
            <p>You have been invited to <strong>{{eventName}}</strong> at <strong>{{siteName}}</strong> by {{residentName}}.</p>
            
            <div class="info-box">
                <h3>📅 Event Details</h3>
                <div class="details">
                    <div class="detail-row">
                        <span class="detail-label">Event:</span>
                        <span class="detail-value">{{eventName}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">{{eventDate}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">{{eventTime}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Max Guests:</span>
                        <span class="detail-value">{{maxGuests}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Invite Code:</span>
                        <span class="detail-value"><code>{{inviteCode}}</code></span>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="{{inviteLink}}" class="button">Register for Event</a>
            </div>
            
            <div class="info-box">
                <h4>📝 Registration Process:</h4>
                <ol>
                    <li>Click the button above to register for the event</li>
                    <li>Provide your personal details (name, email, phone)</li>
                    <li>Verify your phone number with the OTP code</li>
                    <li>Receive your personal QR code for gate access</li>
                </ol>
            </div>
            
            <div class="footer">
                <p>This invitation is valid until {{expiryDate}}</p>
                <p>If you have any questions, please contact {{residentName}} at {{residentEmail}}</p>
                <p><small>Powered by Secure Gate Access System</small></p>
            </div>
        </div>
    </div>
</body>
</html>
`);

// Pass Code (Entry Code) Email Template
const otpVerificationTemplate = Handlebars.compile(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pass Code - {{siteName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-code { background: #1e293b; color: #10b981; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; margin: 20px 0; letter-spacing: 4px; }
        .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Pass Code</h1>
            <p>Your entry access for {{siteName}}</p>
        </div>
        
        <div class="content">
            <h2>Hello {{visitorName}}!</h2>
            <p>Your Pass Code for gate entry is:</p>
            
            <div class="otp-code">{{otpCode}}</div>
            
            <div class="info-box">
                <h4>⚠️ Important:</h4>
                <ul>
                    <li>This code is valid for the duration of your visitor pass</li>
                    <li>Do not share this code with anyone</li>
                    <li>Enter the code exactly as shown above</li>
                </ul>
            </div>
            
            <div class="footer">
                <p>If you didn't request this code, please ignore this email</p>
                <p><small>Powered by Secure Gate Access System</small></p>
            </div>
        </div>
    </div>
</body>
</html>
`);

// Registration confirmation email template
const registrationConfirmationTemplate = Handlebars.compile(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Registration - {{siteName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e293b, #334155); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #059669; }
        .info-box { background: #e0f2fe; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to {{siteName}}!</h1>
            <p>Please confirm your email address</p>
        </div>
        
        <div class="content">
            <h2>Hello {{username}}!</h2>
            <p>Thank you for registering with {{siteName}}. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
            </div>
            
            <div class="info-box">
                <h4>⚠️ Important Information:</h4>
                <ul>
                    <li>This verification link expires in {{expiresIn}}</li>
                    <li>You cannot log in until your email is verified</li>
                    <li>If the button doesn't work, copy and paste this link: {{verificationUrl}}</li>
                </ul>
            </div>
            
            <p>If you didn't create an account with {{siteName}}, please ignore this email.</p>
            
            <div class="footer">
                <p>Best regards,<br>The {{siteName}} Team</p>
                <p><small>This is an automated message, please do not reply.</small></p>
            </div>
        </div>
    </div>
</body>
</html>
`);

// Welcome email template (for verified users)
const welcomeEmailTemplate = Handlebars.compile(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{siteName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e293b, #334155); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #059669; }
        .feature-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .feature-item { padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
        .feature-item:last-child { border-bottom: none; }
        .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; }
        .password-box { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 Welcome to {{siteName}}!</h1>
            <p>Your account is now active</p>
        </div>
        
        <div class="content">
            <h2>Hello {{username}}!</h2>
            <p>Welcome to {{siteName}}! Your account has been successfully created and verified. You can now access all the features of our secure gate access system.</p>
            
            {{#if temporaryPassword}}
            <div class="password-box">
                <h4>🔐 Temporary Login Credentials:</h4>
                <p><strong>Username:</strong> {{username}}</p>
                <p><strong>Temporary Password:</strong> <code>{{temporaryPassword}}</code></p>
                <p><em>Please change your password after your first login for security.</em></p>
            </div>
            {{/if}}
            
            <div style="text-align: center;">
                <a href="{{loginUrl}}" class="button">Access Your Account</a>
            </div>
            
            <div class="feature-list">
                <h3>🌟 What you can do now:</h3>
                <div class="feature-item">
                    <strong>👥 Manage Visitors:</strong> Invite and track your visitors
                </div>
                <div class="feature-item">
                    <strong>📱 QR Codes:</strong> Generate secure access codes
                </div>
                <div class="feature-item">
                    <strong>📊 Access History:</strong> View entry and exit logs
                </div>
                <div class="feature-item">
                    <strong>🔔 Notifications:</strong> Get real-time visitor alerts
                </div>
                <div class="feature-item">
                    <strong>🛡️ Security:</strong> Manage your access preferences
                </div>
            </div>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <div class="footer">
                <p>Best regards,<br>The {{siteName}} Team</p>
                <p><small>This is an automated message, please do not reply.</small></p>
            </div>
        </div>
    </div>
</body>
</html>
`);

// Password reset email template
const passwordResetTemplate = Handlebars.compile(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - {{siteName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #b91c1c; }
        .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset Request</h1>
            <p>Reset your {{siteName}} password</p>
        </div>
        
        <div class="content">
            <h2>Hello {{username}}!</h2>
            <p>We received a request to reset your password for your {{siteName}} account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="{{resetUrl}}" class="button">Reset Password</a>
            </div>
            
            <div class="warning-box">
                <h4>🚨 Security Information:</h4>
                <ul>
                    <li>This reset link expires in {{expiresIn}}</li>
                    <li>The link can only be used once</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Your current password remains unchanged until you complete the reset</li>
                </ul>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f1f5f9; padding: 10px; border-radius: 4px; font-family: monospace;">{{resetUrl}}</p>
            
            <p>If you didn't request a password reset, you can safely ignore this email. Your account remains secure.</p>
            
            <div class="footer">
                <p>Best regards,<br>The {{siteName}} Team</p>
                <p><small>This is an automated message, please do not reply.</small></p>
            </div>
        </div>
    </div>
</body>
</html>
`);

// OTP email template (enhanced)
const otpEmailTemplate = Handlebars.compile(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Verification Code - {{siteName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-code { font-size: 36px; font-weight: bold; text-align: center; background: white; padding: 20px; margin: 20px 0; border-radius: 8px; letter-spacing: 5px; color: #7c3aed; border: 2px dashed #a855f7; }
        .info-box { background: #f3e8ff; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Verification Code</h1>
            <p>Your {{siteName}} verification code</p>
        </div>
        
        <div class="content">
            <h2>Hello {{username}}!</h2>
            <p>Here is your verification code to complete your action:</p>
            
            <div class="otp-code">{{otp}}</div>
            
            <div class="info-box">
                <h4>⚠️ Important:</h4>
                <ul>
                    <li>This code expires in {{expiresIn}}</li>
                    <li>Enter the code exactly as shown above</li>
                    <li>Do not share this code with anyone</li>
                    <li>If you didn't request this code, please ignore this email</li>
                </ul>
            </div>
            
            <div class="footer">
                <p>Best regards,<br>The {{siteName}} Team</p>
                <p><small>This is an automated message, please do not reply.</small></p>
            </div>
        </div>
    </div>
</body>
</html>
`);

// Export all templates
export const emailTemplates = {
    visitorInvite: visitorInviteTemplate,
    bulkInvite: bulkInviteTemplate,
    otpVerification: otpVerificationTemplate,
    registrationConfirmationEmail: registrationConfirmationTemplate,
    welcomeEmail: welcomeEmailTemplate,
    passwordResetEmail: passwordResetTemplate,
    otpEmail: otpEmailTemplate
};

// Legacy exports for backward compatibility
export {
    visitorInviteTemplate,
    bulkInviteTemplate,
    otpVerificationTemplate
};
