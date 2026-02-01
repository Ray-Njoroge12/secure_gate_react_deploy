/**
 * Security Settings Component
 * 
 * Provides interface for users to manage their security settings,
 * including MFA, additional authentication requirements, and security preferences.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { securityService } from '../../services/securityService';
import { useNotification } from '../../hooks/useNotification';
import './SecuritySettings.css';

const SecuritySettings = () => {
  const [settings, setSettings] = useState({
    mfaEnabled: false,
    mfaMethods: [],
    requireAdditionalAuthFor: [],
    sessionTimeoutMinutes: 30,
    maxConcurrentSessions: 3,
    securityNotificationsEnabled: true,
    loginNotificationsEnabled: true,
    unusualActivityAlerts: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showAdditionalAuth, setShowAdditionalAuth] = useState(false);
  const [additionalAuthData, setAdditionalAuthData] = useState(null);
  const [mfaSetupStep, setMfaSetupStep] = useState('method');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpQrCode, setTotpQrCode] = useState('');

  const { showNotification } = useNotification();

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      setLoading(true);
      const response = await securityService.getSecuritySettings();
      if (response.success) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      showNotification('Failed to load security settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      // Check if additional authentication is required
      const authResponse = await securityService.requestAdditionalAuth('security_settings');
      
      if (authResponse.additionalAuth) {
        setAdditionalAuthData(authResponse.additionalAuth);
        setShowAdditionalAuth(true);
        return;
      }

      await saveSettingsWithAuth();
    } catch (error) {
      showNotification('Failed to save security settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveSettingsWithAuth = async (additionalAuthFactors = null) => {
    try {
      const headers = {};
      if (additionalAuthFactors) {
        headers['X-Additional-Auth'] = JSON.stringify({
          sessionId: additionalAuthData.sessionId,
          factors: additionalAuthFactors
        });
      }

      const response = await securityService.updateSecuritySettings(settings, headers);
      
      if (response.success) {
        showNotification('Security settings updated successfully', 'success');
        setShowAdditionalAuth(false);
        setAdditionalAuthData(null);
      }
    } catch (error) {
      showNotification('Failed to update security settings', 'error');
    }
  };

  const handleMfaSetup = async (method) => {
    try {
      if (method === 'totp') {
        const response = await securityService.setupTOTP();
        if (response.success) {
          setTotpSecret(response.data.secret);
          setTotpQrCode(response.data.qrCode);
          setMfaSetupStep('verify');
        }
      } else if (method === 'sms') {
        const response = await securityService.setupSMS();
        if (response.success) {
          setMfaSetupStep('verify');
        }
      }
    } catch (error) {
      showNotification('Failed to setup MFA', 'error');
    }
  };

  const handleMfaVerification = async (code) => {
    try {
      const response = await securityService.verifyMfaSetup(code, mfaSetupStep === 'verify' ? 'totp' : 'sms');
      
      if (response.success) {
        showNotification('MFA setup completed successfully', 'success');
        setShowMfaSetup(false);
        setMfaSetupStep('method');
        loadSecuritySettings(); // Reload to get updated settings
      } else {
        showNotification('Invalid verification code', 'error');
      }
    } catch (error) {
      showNotification('MFA verification failed', 'error');
    }
  };

  const sensitiveOperations = [
    { value: 'user_deletion', label: 'User Account Deletion' },
    { value: 'bulk_data_export', label: 'Bulk Data Export' },
    { value: 'system_configuration', label: 'System Configuration' },
    { value: 'security_settings', label: 'Security Settings Changes' },
    { value: 'admin_impersonation', label: 'Admin Impersonation' }
  ];

  const mfaMethodOptions = [
    { value: 'totp', label: 'Authenticator App (TOTP)' },
    { value: 'sms', label: 'SMS Code' },
    { value: 'email', label: 'Email Code' }
  ];

  if (loading) {
    return (
      <div className="security-settings-loading">
        <Spinner size="large" />
        <p>Loading security settings...</p>
      </div>
    );
  }

  return (
    <div className="security-settings">
      <div className="security-settings-header">
        <h2>Security Settings</h2>
        <p>Manage your account security preferences and authentication methods</p>
      </div>

      <div className="security-settings-content">
        {/* Multi-Factor Authentication */}
        <Card className="security-card">
          <CardHeader>
            <h3>Multi-Factor Authentication</h3>
            <p>Add an extra layer of security to your account</p>
          </CardHeader>
          <CardContent>
            <div className="setting-row">
              <div className="setting-info">
                <label>Enable MFA</label>
                <span className="setting-description">
                  Require additional verification when signing in
                </span>
              </div>
              <Switch
                checked={settings.mfaEnabled}
                onChange={(checked) => handleSettingChange('mfaEnabled', checked)}
              />
            </div>

            {settings.mfaEnabled && (
              <div className="mfa-methods">
                <label>MFA Methods</label>
                <div className="mfa-methods-list">
                  {settings.mfaMethods.map(method => (
                    <div key={method} className="mfa-method-item">
                      <span>{mfaMethodOptions.find(opt => opt.value === method)?.label}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveMfaMethod(method)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowMfaSetup(true)}
                  className="add-mfa-method"
                >
                  Add MFA Method
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Authentication Requirements */}
        <Card className="security-card">
          <CardHeader>
            <h3>Additional Authentication</h3>
            <p>Require extra verification for sensitive operations</p>
          </CardHeader>
          <CardContent>
            <div className="setting-row">
              <label>Require Additional Auth For</label>
              <Select
                multiple
                value={settings.requireAdditionalAuthFor}
                onChange={(value) => handleSettingChange('requireAdditionalAuthFor', value)}
                options={sensitiveOperations}
                placeholder="Select operations..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Session Management */}
        <Card className="security-card">
          <CardHeader>
            <h3>Session Management</h3>
            <p>Control how your sessions are managed</p>
          </CardHeader>
          <CardContent>
            <div className="setting-row">
              <label>Session Timeout (minutes)</label>
              <Input
                type="number"
                min="5"
                max="480"
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => handleSettingChange('sessionTimeoutMinutes', parseInt(e.target.value))}
              />
            </div>

            <div className="setting-row">
              <label>Maximum Concurrent Sessions</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={settings.maxConcurrentSessions}
                onChange={(e) => handleSettingChange('maxConcurrentSessions', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Notifications */}
        <Card className="security-card">
          <CardHeader>
            <h3>Security Notifications</h3>
            <p>Choose which security events you want to be notified about</p>
          </CardHeader>
          <CardContent>
            <div className="setting-row">
              <div className="setting-info">
                <label>Security Notifications</label>
                <span className="setting-description">
                  Receive notifications about security events
                </span>
              </div>
              <Switch
                checked={settings.securityNotificationsEnabled}
                onChange={(checked) => handleSettingChange('securityNotificationsEnabled', checked)}
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <label>Login Notifications</label>
                <span className="setting-description">
                  Get notified when someone signs into your account
                </span>
              </div>
              <Switch
                checked={settings.loginNotificationsEnabled}
                onChange={(checked) => handleSettingChange('loginNotificationsEnabled', checked)}
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <label>Unusual Activity Alerts</label>
                <span className="setting-description">
                  Receive alerts for suspicious account activity
                </span>
              </div>
              <Switch
                checked={settings.unusualActivityAlerts}
                onChange={(checked) => handleSettingChange('unusualActivityAlerts', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="security-settings-actions">
        <Button
          variant="primary"
          onClick={handleSaveSettings}
          loading={saving}
          disabled={saving}
        >
          Save Security Settings
        </Button>
      </div>

      {/* MFA Setup Modal */}
      <Modal
        isOpen={showMfaSetup}
        onClose={() => {
          setShowMfaSetup(false);
          setMfaSetupStep('method');
        }}
        title="Setup Multi-Factor Authentication"
      >
        <MfaSetupModal
          step={mfaSetupStep}
          onMethodSelect={handleMfaSetup}
          onVerify={handleMfaVerification}
          totpSecret={totpSecret}
          totpQrCode={totpQrCode}
        />
      </Modal>

      {/* Additional Authentication Modal */}
      <Modal
        isOpen={showAdditionalAuth}
        onClose={() => setShowAdditionalAuth(false)}
        title="Additional Authentication Required"
      >
        <AdditionalAuthModal
          authData={additionalAuthData}
          onVerify={saveSettingsWithAuth}
          onCancel={() => setShowAdditionalAuth(false)}
        />
      </Modal>
    </div>
  );
};

// MFA Setup Modal Component
const MfaSetupModal = ({ step, onMethodSelect, onVerify, totpSecret, totpQrCode }) => {
  const [verificationCode, setVerificationCode] = useState('');

  if (step === 'method') {
    return (
      <div className="mfa-setup-method">
        <p>Choose your preferred MFA method:</p>
        <div className="mfa-method-options">
          <Button
            variant="outline"
            onClick={() => onMethodSelect('totp')}
            className="mfa-method-button"
          >
            <div className="mfa-method-content">
              <h4>Authenticator App</h4>
              <p>Use an app like Google Authenticator or Authy</p>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => onMethodSelect('sms')}
            className="mfa-method-button"
          >
            <div className="mfa-method-content">
              <h4>SMS Code</h4>
              <p>Receive codes via text message</p>
            </div>
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="mfa-setup-verify">
        {totpQrCode && (
          <div className="totp-setup">
            <p>Scan this QR code with your authenticator app:</p>
            <div className="qr-code-container">
              <img src={totpQrCode} alt="TOTP QR Code" />
            </div>
            <p>Or enter this secret manually: <code>{totpSecret}</code></p>
          </div>
        )}
        
        <div className="verification-input">
          <label>Enter verification code:</label>
          <Input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter 6-digit code"
            maxLength="6"
          />
        </div>
        
        <div className="verification-actions">
          <Button
            variant="primary"
            onClick={() => onVerify(verificationCode)}
            disabled={verificationCode.length !== 6}
          >
            Verify and Enable
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

// Additional Authentication Modal Component
const AdditionalAuthModal = ({ authData, onVerify, onCancel }) => {
  const [factors, setFactors] = useState({});
  const [verifying, setVerifying] = useState(false);

  const handleFactorChange = (factorType, value) => {
    setFactors(prev => ({
      ...prev,
      [factorType]: value
    }));
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await onVerify(factors);
    } finally {
      setVerifying(false);
    }
  };

  const isVerifyDisabled = () => {
    return !authData?.factors.every(factor => 
      factors[factor.type] && factors[factor.type].length > 0
    );
  };

  return (
    <div className="additional-auth-modal">
      <Alert variant="info">
        Additional authentication is required to save security settings.
      </Alert>

      <div className="auth-factors">
        {authData?.factors.map(factor => (
          <div key={factor.type} className="auth-factor">
            {factor.type === 'password_confirmation' && (
              <div>
                <label>Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  onChange={(e) => handleFactorChange('password', e.target.value)}
                />
              </div>
            )}

            {factor.type === 'totp' && (
              <div>
                <label>Authenticator Code</label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                  onChange={(e) => handleFactorChange('totp', e.target.value)}
                />
              </div>
            )}

            {factor.type === 'sms_otp' && (
              <div>
                <label>SMS Code</label>
                <Input
                  type="text"
                  placeholder="Enter SMS code"
                  maxLength="6"
                  onChange={(e) => handleFactorChange('smsCode', e.target.value)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="auth-actions">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleVerify}
          loading={verifying}
          disabled={isVerifyDisabled() || verifying}
        >
          Verify and Save
        </Button>
      </div>
    </div>
  );
};

export default SecuritySettings;