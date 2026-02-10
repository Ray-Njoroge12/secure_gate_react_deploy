import React, { useState, useEffect } from 'react';
import api from '../utils/apiClient';
import Button from '../components/ui/Button';

/**
 * Privacy Dashboard Component
 * Kenya Data Protection Act 2019 Compliance
 * Articles 31 (Consent), 33 (Right to Erasure), 39 (Data Portability)
 */
const PrivacyDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [myData, setMyData] = useState(null);
  const [consentStatus, setConsentStatus] = useState(null);
  const [retentionPolicy, setRetentionPolicy] = useState(null);
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  // Fetch user's personal data
  const fetchMyData = async () => {
    try {
      const response = await api.get('/api/privacy/my-data');
      if (response.data.success) {
        setMyData(response.data.data);
      }
    } catch (err) {
      setError('Failed to load your data');
    }
  };

  // Fetch consent status
  const fetchConsentStatus = async () => {
    try {
      const response = await api.get('/api/privacy/consent-status');
      if (response.data.success) {
        setConsentStatus(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load consent status');
    }
  };

  // Fetch retention policy
  const fetchRetentionPolicy = async () => {
    try {
      const response = await api.get('/api/privacy/retention-policy');
      if (response.data.success) {
        setRetentionPolicy(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load retention policy');
    }
  };

  // Export user data
  const handleExportData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await api.get('/api/privacy/export', {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `personal-data-export-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccess('Your data has been exported successfully!');
    } catch (err) {
      setError('Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Request account deletion
  const handleRequestDeletion = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await api.post('/api/privacy/request-deletion', {
        confirmEmail: deleteConfirmEmail,
        reason: deleteReason
      });
      
      if (response.data.success) {
        setSuccess('Deletion request submitted successfully. We will process it within 30 days.');
        setShowDeleteModal(false);
        setDeleteConfirmEmail('');
        setDeleteReason('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit deletion request');
    } finally {
      setLoading(false);
    }
  };

  // Withdraw consent
  const handleWithdrawConsent = async (consentType) => {
    if (!window.confirm('Are you sure you want to withdraw this consent? This may limit your ability to use certain features.')) {
      return;
    }
    
    try {
      const response = await api.post('/api/privacy/withdraw-consent', {
        consentType
      });
      
      if (response.data.success) {
        setSuccess('Consent withdrawn successfully');
        fetchConsentStatus(); // Refresh consent status
      }
    } catch (err) {
      setError('Failed to withdraw consent');
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMyData(),
        fetchConsentStatus(),
        fetchRetentionPolicy()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">🔒 Privacy & Data Control</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-200">
            Manage your personal data in compliance with Kenya Data Protection Act 2019
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg mb-6">
          <div className="border-b border-gray-200 dark:border-slate-700">
            <nav className="flex -mb-px">
              {['overview', 'my-data', 'consent', 'retention'].map((tab) => (
                <Button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 px-6 text-center font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 dark:text-gray-200 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {tab === 'overview' && '📊 Overview'}
                  {tab === 'my-data' && '📁 My Data'}
                  {tab === 'consent' && '✅ Consent'}
                  {tab === 'retention' && '⏱️ Retention'}
                </Button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export Data Card */}
                  <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Export Your Data</h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-200">
                          Download all your personal data in JSON format (Kenya DPA Article 39 - Data Portability)
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleExportData}
                          disabled={loading}
                          className="mt-4"
                        >
                          📥 Export Data
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Delete Account Card */}
                  <div className="border border-red-200 dark:border-red-700 rounded-lg p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="p-3 bg-red-100 rounded-lg">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Delete Account</h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-200">
                          Permanently delete your account and all associated data (Kenya DPA Article 33 - Right to Erasure)
                        </p>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setShowDeleteModal(true)}
                          className="mt-4"
                        >
                          🗑️ Request Deletion
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Summary */}
                {myData && (
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Your Data Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-600 p-4 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{myData.visitorRecordsCreated || 0}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-200">Visitor Records</p>
                      </div>
                      <div className="bg-white dark:bg-slate-600 p-4 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{myData.recentAccessLogs || 0}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-200">Access Logs</p>
                      </div>
                      <div className="bg-white dark:bg-slate-600 p-4 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{myData.dataCategories?.length || 0}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-200">Data Categories</p>
                      </div>
                      <div className="bg-white dark:bg-slate-600 p-4 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">
                          {myData.user?.createdAt ? new Date(myData.user.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-200">Member Since</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* My Data Tab */}
            {activeTab === 'my-data' && myData && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-2">Data Categories We Store</h3>
                  <ul className="space-y-1">
                    {myData.dataCategories?.map((category, index) => (
                      <li key={index} className="text-sm text-blue-800 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {category}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Account Information</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600 dark:text-gray-200">Username:</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">{myData.user?.username}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600 dark:text-gray-200">Email:</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">{myData.user?.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600 dark:text-gray-200">Role:</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">{myData.user?.role}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600 dark:text-gray-200">Last Login:</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">
                        {myData.user?.lastLogin ? new Date(myData.user.lastLogin).toLocaleString() : 'Never'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Data Retention Policy</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-200">{myData.dataRetentionPolicy}</p>
                </div>
              </div>
            )}

            {/* Consent Tab */}
            {activeTab === 'consent' && consentStatus && (
              <div className="space-y-4">
                {consentStatus.requiredConsents?.map((consent, index) => (
                  <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{consent.type}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">{consent.description}</p>
                        <div className="mt-2 flex items-center text-xs">
                          <span className={`px-2 py-1 rounded ${consent.granted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {consent.granted ? '✓ Granted' : '○ Not Granted'}
                          </span>
                          {consent.required && (
                            <span className="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-800">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                      {consent.granted && !consent.required && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleWithdrawConsent(consent.type)}
                          className="ml-4 text-sm text-red-600 hover:text-red-800"
                        >
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Retention Tab */}
            {activeTab === 'retention' && retentionPolicy && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                  <h3 className="font-medium text-blue-900">Data Retention Information</h3>
                  <p className="text-sm text-blue-800 mt-2">
                    We retain your data in accordance with {retentionPolicy.legalBasis}
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    Last Updated: {retentionPolicy.lastUpdated}
                  </p>
                </div>

                {retentionPolicy.policies?.map((policy, index) => (
                  <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{policy.table_name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                          Retained for {policy.retention_days} days
                        </p>
                        {policy.encryption_required && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            🔒 Encrypted
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        {policy.auto_delete ? (
                          <span className="text-xs text-green-600">Auto-delete enabled</span>
                        ) : (
                          <span className="text-xs text-gray-600 dark:text-gray-200">Manual deletion required</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-200">
                    For questions about data retention, contact: {retentionPolicy.contactEmail}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Request Account Deletion</h3>
            
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-sm text-red-700">
                <strong>Warning:</strong> This action will permanently delete your account and all associated data. 
                This process takes up to 30 days and cannot be undone.
              </p>
            </div>

            <form onSubmit={handleRequestDeletion} className="space-y-4">
              <div>
                <label htmlFor="delete-confirm-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm your email:
                </label>
                <input
                  id="delete-confirm-email"
                  type="email"
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="delete-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason for deletion (optional):
                </label>
                <textarea
                  id="delete-reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Help us improve by telling us why..."
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Submitting...' : 'Request Deletion'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyDashboard;

