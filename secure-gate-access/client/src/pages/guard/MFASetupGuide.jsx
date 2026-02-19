import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Icon } from '../../components/ui';

export default function MFASetupGuide() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
        <Card.Content className="p-6">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${isAdmin ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
              <Icon name="Shield" className={`w-6 h-6 ${isAdmin ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'}`} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
                {isAdmin ? 'Admin Security Guide' : 'MFA Setup Guide'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                {isAdmin
                  ? 'Secure your admin account with multi-factor authentication to protect sensitive system operations.'
                  : 'Enable multi-factor authentication to protect guard actions such as check-ins, check-outs, incident handling, and shift operations.'}
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
        <Card.Content className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Setup Steps</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-200">
            <li>
              {isAdmin
                ? 'Go to Admin Settings and switch to the Security tab.'
                : 'Open Guard Settings and switch to the Security tab.'}
            </li>
            <li>Enable two-factor authentication.</li>
            <li>Scan the QR code in your authenticator app.</li>
            <li>Enter the one-time code to confirm setup.</li>
            <li>Store backup codes in a safe place.</li>
          </ol>
        </Card.Content>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
        <Card.Content className="p-6">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => navigate(isAdmin ? '/dashboard/admin/settings?tab=security' : '/dashboard/guard/settings?tab=security')}
              className="min-h-[44px]"
            >
              {isAdmin ? 'Open Admin Security Settings' : 'Open Guard Security Settings'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(isAdmin ? '/dashboard/admin' : '/dashboard/guard')}
              className="min-h-[44px]"
            >
              {isAdmin ? 'Back to Admin Dashboard' : 'Back to Guard Dashboard'}
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
