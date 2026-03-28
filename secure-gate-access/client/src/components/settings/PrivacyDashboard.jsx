/**
 * @file PrivacyDashboard.jsx
 * @description Privacy Dashboard for data management and consent
 * Phase 3: Privacy Dashboard Features
 * 
 * Features:
 * - Data inventory view
 * - Data export (GDPR/KDPA compliant)
 * - Data deletion requests
 * - Privacy preferences
 * - Consent management
 */

import React, { useState, useEffect, useCallback } from 'react';
import privacyService from '../../services/privacyService';
import Button from '../ui/Button';

const PrivacyDashboard = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [dataInventory, setDataInventory] = useState(null);
  const [consents, setConsents] = useState([]);
  const [exportStatus, setExportStatus] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch privacy data
  const fetchPrivacyData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsData, inventoryData, consentsData] = await Promise.all([
        privacyService.getPrivacySettings(),
        privacyService.getDataInventory(),
        privacyService.getConsentHistory()
      ]);
      
      setSettings(settingsData);
      setDataInventory(inventoryData);
      setConsents(consentsData);
    } catch (err) {
      console.error('Error fetching privacy data:', err);
      setError('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrivacyData();
  }, [fetchPrivacyData]);

  // Update privacy setting
  const handleSettingChange = async (key, value) => {
    setSaving(true);
    try {
      await privacyService.updatePrivacySettings({ [key]: value });
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      console.error('Error updating setting:', err);
      setError('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  // Request data export
  const handleRequestExport = async (format = 'json') => {
    try {
      const result = await privacyService.requestDataExport(format);
      const statusMessage = getExportStatusMessage(result.status);
      setExportStatus({
        ...result,
        message: statusMessage
      });
      
      // Poll for completion
      if (['queued', 'processing'].includes(result.status)) {
        pollExportStatus(result.requestId);
      }
    } catch (err) {
      console.error('Error requesting export:', err);
      setError('Failed to request data export');
    }
  };

  // Poll export status
  const pollExportStatus = async (requestId) => {
    try {
      const status = await privacyService.getExportStatus(requestId);

      setExportStatus({
        ...status,
        message: getExportStatusMessage(status.status)
      });

      if (['queued', 'processing'].includes(status.status)) {
        // Still processing, poll again in 5 seconds
        setTimeout(() => pollExportStatus(requestId), 5000);
      }
    } catch (err) {
      console.error('Error polling export status:', err);
    }
  };

  const getExportStatusMessage = (status) => {
    switch (status) {
      case 'queued':
        return 'Your export request is queued and will start shortly.';
      case 'processing':
        return 'Your data export is being prepared...';
      case 'completed':
        return 'Your data export is ready for download!';
      case 'failed':
        return 'Export failed. Please try again.';
      default:
        return 'Export status unavailable.';
    }
  };

  // Download export
  const handleDownloadExport = async () => {
    if (!exportStatus?.requestId) return;
    
    try {
      const blob = await privacyService.downloadExport(exportStatus.requestId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `securegate-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading export:', err);
      setError('Failed to download export');
    }
  };

  // Delete specific data category
  const handleDeleteData = async (category) => {
    const confirmMessage = {
      visitors: 'This will permanently delete your visitor history. This cannot be undone.',
      deliveries: 'This will permanently delete your delivery history. This cannot be undone.',
      emergencies: 'This will permanently delete your emergency incident history. This cannot be undone.'
    };
    
    if (!window.confirm(confirmMessage[category])) return;
    
    try {
      await privacyService.requestDataDeletion(category);
      await fetchPrivacyData();
    } catch (err) {
      console.error('Error deleting data:', err);
      setError('Failed to delete data');
    }
  };

  // Render tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'data':
        return renderDataInventory();
      case 'export':
        return renderDataExport();
      case 'preferences':
        return renderPreferences();
      case 'consents':
        return renderConsents();
      default:
        return renderOverview();
    }
  };

  // Overview tab
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Your Privacy Rights</h3>
        <p className="text-sm text-blue-800">
          Under the Kenya Data Protection Act (2019) and GDPR principles, you have the right to:
        </p>
        <ul className="mt-2 text-sm text-blue-800 space-y-1 ml-4 list-disc">
          <li>Access your personal data</li>
          <li>Export your data in a portable format</li>
          <li>Request deletion of your data</li>
          <li>Withdraw consent at any time</li>
          <li>Object to processing of your data</li>
        </ul>
      </div>

      {/* KDPA Section 26 Rights */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">Kenya Data Protection Act (2019)</h3>
        <p className="text-sm text-green-800 dark:text-green-200 mb-3">Your rights under KDPA Section 26</p>
        <ul className="text-sm text-green-800 dark:text-green-200 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">•</span>
            <span><strong>Right to Access</strong> — Request access to your personal data</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">•</span>
            <span><strong>Right to Rectification</strong> — Correct inaccurate personal data</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">•</span>
            <span><strong>Right to Erasure</strong> — Request deletion of your personal data</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">•</span>
            <span><strong>Right to Object</strong> — Object to processing of your personal data</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">•</span>
            <span><strong>Right to Data Portability</strong> — Receive your data in a portable format</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">•</span>
            <span><strong>Right to Withdraw Consent</strong> — Withdraw previously given consent</span>
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              📊
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Data We Store</h4>
              <p className="text-sm text-gray-500 dark:text-gray-300">View your data inventory</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('data')}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Data →
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              📥
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Export Your Data</h4>
              <p className="text-sm text-gray-500 dark:text-gray-300">Download in portable format</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('export')}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Export Data →
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              ⚙️
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Privacy Preferences</h4>
              <p className="text-sm text-gray-500 dark:text-gray-300">Control your privacy settings</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('preferences')}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Manage →
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              ✅
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Consent History</h4>
              <p className="text-sm text-gray-500 dark:text-gray-300">View your consent records</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('consents')}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View History →
          </Button>
        </div>
      </div>
    </div>
  );

  // Data Inventory tab
  const renderDataInventory = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Data Inventory</h3>
        <p className="text-sm text-gray-600 dark:text-gray-200 mb-4">
          This is a summary of the personal data we store about you.
        </p>
      </div>

      {dataInventory ? (
        <div className="space-y-4">
          {/* Personal Info */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Personal Information</h4>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-gray-500 dark:text-gray-300">Name:</dt>
              <dd className="text-gray-900 dark:text-white">{dataInventory.personalInfo?.name || 'Not set'}</dd>
              <dt className="text-gray-500 dark:text-gray-300">Email:</dt>
              <dd className="text-gray-900 dark:text-white">{dataInventory.personalInfo?.email || 'Not set'}</dd>
              <dt className="text-gray-500 dark:text-gray-300">Phone:</dt>
              <dd className="text-gray-900 dark:text-white">{dataInventory.personalInfo?.phone || 'Not set'}</dd>
              <dt className="text-gray-500 dark:text-gray-300">Unit:</dt>
              <dd className="text-gray-900 dark:text-white">{dataInventory.personalInfo?.unit || 'Not set'}</dd>
            </dl>
          </div>

          {/* Visitors */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Visitor Records</h4>
              <span className="text-sm text-gray-500 dark:text-gray-300">
                {dataInventory.visitors?.length || 0} records
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-200 mb-3">
              Records of visitors you've invited or who have checked in.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteData('visitors')}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Delete visitor history
            </Button>
          </div>

          {/* Deliveries */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Delivery Records</h4>
              <span className="text-sm text-gray-500 dark:text-gray-300">
                {dataInventory.deliveries?.length || 0} records
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-200 mb-3">
              Records of packages and deliveries received.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteData('deliveries')}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Delete delivery history
            </Button>
          </div>

          {/* Activity Logs */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Activity Logs</h4>
              <span className="text-sm text-gray-500 dark:text-gray-300">
                Last 90 days
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-200">
              Login history and system actions. Retained for security and automatically deleted after 90 days.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-300">Loading data inventory...</p>
      )}
    </div>
  );

  // Data Export tab
  const renderDataExport = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Your Data</h3>
        <p className="text-sm text-gray-600 dark:text-gray-200 mb-4">
          Download a copy of your personal data in a portable format. This includes all data 
          associated with your account.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">What's included:</h4>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-200 mb-6">
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Personal profile information
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Visitor history
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Delivery records
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Auto-approval rules
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Privacy preferences
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Consent history
          </li>
        </ul>

        {exportStatus ? (
          <div className={`p-4 rounded-lg ${
            exportStatus.status === 'completed' ? 'bg-green-50 border border-green-200' :
            exportStatus.status === 'failed' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-sm ${
              exportStatus.status === 'completed' ? 'text-green-700' :
              exportStatus.status === 'failed' ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {exportStatus.message}
            </p>
            {exportStatus.status === 'completed' && exportStatus.expiresAt && (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-200">
                Download available until {new Date(exportStatus.expiresAt).toLocaleString()}.
              </p>
            )}
            {exportStatus.status === 'completed' && exportStatus.downloadAvailable !== false && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadExport}
                className="mt-3 bg-green-600 hover:bg-green-700"
              >
                Download Export
              </Button>
            )}
            {exportStatus.status === 'completed' && exportStatus.downloadAvailable === false && (
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-200">
                The download window has expired. Please request a new export.
              </p>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleRequestExport('json')}
            >
              Export as JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRequestExport('csv')}
            >
              Export as CSV
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Preferences tab
  const renderPreferences = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Privacy Preferences</h3>
        <p className="text-sm text-gray-600 dark:text-gray-200 mb-4">
          Control how your data is used and shared within SecureGate.
        </p>
      </div>

      <div className="space-y-4">
        {/* Visitor Frequency */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Show Visitor Frequency to Guards</h4>
              <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                Allow guards to see how often your visitors check in
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showVisitorFrequency ?? true}
                onChange={(e) => handleSettingChange('showVisitorFrequency', e.target.checked)}
                className="sr-only peer"
                disabled={saving}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Delivery Photos */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Allow Delivery Photos</h4>
              <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                Allow guards to capture photos of your packages
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowDeliveryPhotos ?? true}
                onChange={(e) => handleSettingChange('allowDeliveryPhotos', e.target.checked)}
                className="sr-only peer"
                disabled={saving}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Non-Critical Announcements */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Receive Non-Critical Announcements</h4>
              <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                Receive maintenance, events, and general updates
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.receiveNonCriticalAnnouncements ?? true}
                onChange={(e) => handleSettingChange('receiveNonCriticalAnnouncements', e.target.checked)}
                className="sr-only peer"
                disabled={saving}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Note: Critical safety announcements cannot be disabled.
          </p>
        </div>
      </div>
    </div>
  );

  // Consents tab
  const renderConsents = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Consent History</h3>
        <p className="text-sm text-gray-600 dark:text-gray-200 mb-4">
          A record of the consents you've given and their current status.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Consent Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {consents.length > 0 ? (
              consents.map((consent, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {consent.type}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      consent.granted 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {consent.granted ? 'Granted' : 'Withdrawn'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                    {new Date(consent.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="px-4 py-6 text-center text-gray-500 dark:text-gray-300">
                  No consent records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-300">Loading privacy dashboard...</div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">🔒 Privacy Dashboard</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300">Manage your personal data and privacy settings</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-2 text-red-800 hover:text-red-900"
            aria-label="Dismiss error"
          >
            ×
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex px-4 -mb-px space-x-4" role="tablist" aria-label="Privacy dashboard tabs">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'data', label: 'My Data' },
            { id: 'export', label: 'Export' },
            { id: 'preferences', label: 'Preferences' },
            { id: 'consents', label: 'Consents' }
          ].map(tab => (
            <Button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default PrivacyDashboard;
