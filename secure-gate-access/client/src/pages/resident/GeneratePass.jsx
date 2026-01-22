// client/src/pages/resident/GeneratePass.jsx
import React, { useState, useEffect } from "react";
import { navigateTo } from "../../utils/appNavigation";
import { PageHeader, Card, Button, EmptyState } from "../../components/ui";
import { getMyVisitors, createPass } from "../../services/passService";
import AppShell from "../../layouts/AppShell";
import { useCurrentRole } from "../../hooks/useCurrentRole";
import logger from 'utils/logger';
import { QrCode, RefreshCw, Send, Copy, CheckCircle } from 'lucide-react';

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

  const role = useCurrentRole();

  return (
    <AppShell role={role}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <PageHeader
          title="Generate Pass"
          subtitle="Create QR passes for approved visitors"
          icon={<QrCode className="w-6 h-6 text-green-600" />}
          showBack={true}
          backTo="/dashboard/resident"
        />

        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approved Visitor
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
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
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !selectedVisitor}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 mr-2" />
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
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                <h2 className="text-xl font-bold">Pass Generated!</h2>
                <p className="text-green-100">For {result.visitorName}</p>
              </div>

              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                  {/* QR Code */}
                  <div className="flex-shrink-0">
                    {result.qrDataUrl ? (
                      <img
                        src={result.qrDataUrl}
                        alt="QR Code"
                        className="w-48 h-48 rounded-xl border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
                        <QrCode className="w-16 h-16 text-gray-400" />
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
                        <p className="font-mono text-2xl font-bold text-green-600">{result.plainOtp}</p>
                      </div>
                    )}

                    <div className="space-y-1 mb-4">
                      <p className="text-sm text-gray-500 dark:text-gray-300">Expires</p>
                      <p className="text-gray-700">{new Date(result.expiresAt).toLocaleString()}</p>
                    </div>

                    {result.inviteLink && (
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-gray-500 dark:text-gray-300">Invite Link</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={result.inviteLink}
                            readOnly
                            className="flex-1 px-3 py-2 text-sm bg-gray-100 rounded-lg border border-gray-200"
                            onClick={e => e.target.select()}
                          />
                          <Button
                            variant="outline"
                            onClick={handleCopyLink}
                            className="flex-shrink-0"
                          >
                            {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={reset}
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate Another
                  </Button>
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
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
    </AppShell>
  );
}

