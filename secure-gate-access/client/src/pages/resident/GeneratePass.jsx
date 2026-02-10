// client/src/pages/resident/GeneratePass.jsx
import React, { useState, useEffect } from "react";
import { navigateTo } from "../../utils/appNavigation";
import { PageHeader, Card, Button, EmptyState, Icon } from "../../components/ui";
import { getMyVisitors, createPass } from "../../services/passService";
// import AppShell from "../../layouts/AppShell"; // Removed to fix duplicate sidebar
// import { useCurrentRole } from "../../hooks/useCurrentRole"; // Removed - handled by App.js
import logger from 'utils/logger';

export default function GeneratePass() {
  const [visitors, setVisitors] = useState([]);
  const [copied, setCopied] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + G to generate pass
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (!loading && selectedVisitor) {
          generatePass(e);
        }
      }
      // Ctrl/Cmd + R to reset
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        reset();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, selectedVisitor]);

  useEffect(() => {
    loadVisitors();
  }, []);

  const loadVisitors = async () => {
    try {
      const response = await getMyVisitors();
      // Handle different response formats (direct array or wrapper object)
      const visitorsList = Array.isArray(response) ? response : (response.data || response.visitors || []);

      if (!Array.isArray(visitorsList)) {
        logger.warn('Unexpected visitors response format:', response);
        setVisitors([]);
        return;
      }

      // Filter for approved visitors who don't have active passes
      const approvedVisitors = visitorsList.filter(v => v.status === 'approved');
      setVisitors(approvedVisitors);
    } catch (err) {
      logger.error('Failed to load visitors', err);
      setError('Failed to load visitors');
    }
  };

  const generatePass = async (e) => {
    e.preventDefault();
    if (!selectedVisitor) {
      setError('Please select a visitor');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await createPass(selectedVisitor);
      setResult({
        ...response,
        qrDataUrl: response.qr_code,
        passId: response.visitor_token,
        inviteLink: response.passLink,
        plainOtp: response.otp,
        visitorName: visitors.find(v => v.id == selectedVisitor)?.name || 'Unknown'
      });
    } catch (err) {
      logger.error('Failed to create pass', err, { visitorId: selectedVisitor });
      setError(err.message || 'Failed to create pass');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedVisitor('');
    setResult(null);
    setError('');
  };

  const handleCopyLink = () => {
    if (result?.inviteLink) {
      navigator.clipboard.writeText(result.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  //   const role = useCurrentRole();

  return (
    // <AppShell role={role}> // Hiding AppShell to fix duplicate layout
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <PageHeader
        title="Generate Pass"
        subtitle="Create QR passes for approved visitors"
        icon={<Icon name="QrCode" className="w-6 h-6 text-brand-600" />}
        showBack={true}
        backTo="/dashboard/resident"
      />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Empty State */}
        {visitors.length === 0 && !error && !result && (
          <Card className="p-8 text-center">
            <EmptyState
              variant="visitors"
              title="No Approved Visitors"
              description="You need to add and approve visitors before generating passes"
              actionLabel="Add Visitor"
              onAction={() => navigateTo('/resident/quick-invite')}
            />
          </Card>
        )}

        {/* Visitor Selection */}
        {visitors.length > 0 && !result && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Visitor
            </h2>

            <form onSubmit={generatePass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Approved Visitor
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200"
                  value={selectedVisitor}
                  onChange={e => setSelectedVisitor(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select a visitor...</option>
                  {visitors.map(visitor => (
                    <option key={visitor.id} value={visitor.id}>
                      {visitor.name} - {visitor.phone} ({visitor.purpose || 'Visit'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={reset}
                  disabled={loading}
                  className="flex-1"
                >
                  <Icon name="RefreshCw" className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !selectedVisitor}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
                >
                  {loading ? (
                    <>
                      <Icon name="RefreshCw" className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Icon name="QrCode" className="w-4 h-4 mr-2" />
                      Generate Pass
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Success Result */}
        {result && (
          <Card className="overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white text-center">
              <Icon name="CheckCircle" className="w-12 h-12 mx-auto mb-2" />
              <h2 className="text-xl font-bold">Pass Generated!</h2>
              <p className="text-brand-100">For {result.visitorName}</p>
            </div>

            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                {/* QR Code */}
                <div className="flex-shrink-0">
                  {result.qrDataUrl ? (
                    <img
                      src={result.qrDataUrl}
                      alt="QR Code"
                      className="w-48 h-48 rounded-xl border-2 border-gray-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-gray-100 dark:bg-slate-700 rounded-xl flex items-center justify-center border-2 border-gray-200 dark:border-slate-700">
                      <Icon name="QrCode" className="w-16 h-16 text-gray-400 dark:text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 text-center md:text-left">
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-300">Pass ID</p>
                    <p className="font-mono text-lg font-semibold">{result.passId}</p>
                  </div>

                  {result.plainOtp && (
                    <div className="space-y-1 mb-4">
                      <p className="text-sm text-gray-500 dark:text-gray-300">OTP Code</p>
                      <p className="font-mono text-2xl font-bold text-brand-600">{result.plainOtp}</p>
                    </div>
                  )}

                  <div className="space-y-1 mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-300">Expires</p>
                    <p className="text-gray-700 dark:text-gray-300">{new Date(result.expiresAt).toLocaleString()}</p>
                  </div>

                  {result.inviteLink && (
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-500 dark:text-gray-300">Invite Link</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={result.inviteLink}
                          readOnly
                          aria-label="Invite link"
                          className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-200 rounded-lg border border-gray-200 dark:border-slate-700"
                          onClick={e => e.target.select()}
                        />
                        <Button
                          variant="outline"
                          onClick={handleCopyLink}
                          className="flex-shrink-0"
                        >
                          {copied ? <Icon name="CheckCircle" className="w-4 h-4 text-green-600" /> : <Icon name="Copy" className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  onClick={reset}
                  className="flex-1"
                >
                  <Icon name="RefreshCw" className="w-4 h-4 mr-2" />
                  Generate Another
                </Button>
                <Button
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
                  onClick={() => navigateTo('/dashboard/resident')}
                >
                  Done
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
    // </AppShell>
  );
}

