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

// OTP Verification Email Template
const otpVerificationTemplate = Handlebars.compile(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Code - {{siteName}}</title>
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
            <h1>🔐 Verification Code</h1>
            <p>Complete your visitor registration</p>
        </div>
        
        <div class="content">
            <h2>Hello {{visitorName}}!</h2>
            <p>Please use the following verification code to complete your visitor registration:</p>
            
            <div class="otp-code">{{otpCode}}</div>
            
            <div class="info-box">
                <h4>⚠️ Important:</h4>
                <ul>
                    <li>This code expires in {{expiryMinutes}} minutes</li>
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

export {
    visitorInviteTemplate,
    bulkInviteTemplate,
    otpVerificationTemplate
};
