import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import api from '../../utils/apiClient';
import logger from '../../utils/logger';

function extractVisitors(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.visitors)) return payload.data.visitors;
  if (Array.isArray(payload?.visitors)) return payload.visitors;
  return [];
}

function extractPassPayload(payload) {
  const data = payload?.data?.data || payload?.data || payload;
  const visitorToken = data?.visitorToken || data?.visitor_token || null;
  const qrCode = data?.qrCode || data?.qr_code || null;
  const passLink = data?.passLink || (visitorToken ? `${window.location.origin}/v/${visitorToken}` : null);

  return {
    visitorToken,
    qrCode,
    passLink
  };
}

function extractExistingPassArtifact(visitorRecord) {
  const visitorToken = visitorRecord?.visitor_token || visitorRecord?.visitorToken || '';
  const qrCode = visitorRecord?.qr_code || visitorRecord?.qrCode || '';
  const passLink = visitorToken ? `${window.location.origin}/v/${visitorToken}` : '';

  return {
    visitorToken,
    qrCode,
    passLink
  };
}

function extractErrorStatus(error) {
  return error?.status || error?.response?.status || null;
}

function extractErrorMessage(error) {
  return (
    error?.response?.data?.message
    || error?.response?.payload?.message
    || error?.response?.payload?.error?.message
    || error?.data?.message
    || error?.data?.error?.message
    || error?.message
    || 'Failed to generate pass. Please try again.'
  );
}

export default function VisitorPass() {
  const { visitorId } = useParams();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [visitor, setVisitor] = useState(null);
  const [visitorToken, setVisitorToken] = useState('');
  const [passLink, setPassLink] = useState('');
  const [qrCode, setQrCode] = useState('');

  const normalizedVisitorId = useMemo(() => String(visitorId || ''), [visitorId]);

  const hydrateVisitorFromApi = useCallback(async () => {
    const response = await api.get('/api/visitors');
    const visitors = extractVisitors(response?.data);
    const matchedVisitor = visitors.find((candidate) => String(candidate?.id) === normalizedVisitorId);

    if (!matchedVisitor) {
      return null;
    }

    const existingPass = extractExistingPassArtifact(matchedVisitor);

    setVisitor(matchedVisitor);
    setVisitorToken(existingPass.visitorToken);
    setQrCode(existingPass.qrCode);
    setPassLink(existingPass.passLink);

    return {
      matchedVisitor,
      ...existingPass
    };
  }, [normalizedVisitorId]);

  const loadVisitor = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const hydrated = await hydrateVisitorFromApi();

      if (!hydrated?.matchedVisitor) {
        setError('Visitor not found in your resident history.');
      }
    } catch (err) {
      logger.error('Failed to load visitor for pass view', err);
      setError('Failed to load visitor details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [hydrateVisitorFromApi]);

  useEffect(() => {
    loadVisitor();
  }, [loadVisitor]);

  const handleGeneratePass = async () => {
    try {
      setGenerating(true);
      setError('');

      const response = await api.post(`/api/visitors/${normalizedVisitorId}/pass`);
      const pass = extractPassPayload(response);

      if (!pass.visitorToken) {
        setError('Pass was generated but token was not returned. Please retry.');
        return;
      }

      setVisitorToken(pass.visitorToken);
      setPassLink(pass.passLink || `${window.location.origin}/v/${pass.visitorToken}`);
      setQrCode(pass.qrCode || '');
    } catch (err) {
      if (extractErrorStatus(err) === 409) {
        try {
          const hydrated = await hydrateVisitorFromApi();
          if (hydrated?.visitorToken) {
            setError('');
            return;
          }
        } catch (hydrateError) {
          logger.warn('Failed to hydrate existing pass after conflict', hydrateError);
        }
      }

      logger.error('Failed to generate visitor pass', err);
      setError(extractErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link to="/resident/visitor-history" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700">
          Back to Visitor History
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 space-y-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Visitor Pass / QR</h1>

          {loading && (
            <p className="text-sm text-gray-600 dark:text-gray-300" data-testid="visitor-pass-loading">
              Loading visitor pass details...
            </p>
          )}

          {!loading && error && (
            <p className="text-sm text-red-700 dark:text-red-400" data-testid="visitor-pass-error">
              {error}
            </p>
          )}

          {!loading && visitor && (
            <div className="space-y-4" data-testid="visitor-pass-content">
              <div className="rounded-lg bg-gray-100 dark:bg-slate-900 p-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">Visitor</p>
                <p className="font-medium text-gray-900 dark:text-white">{visitor.name || 'Unnamed visitor'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                  Status: {(visitor.status || 'unknown').replace(/_/g, ' ')}
                </p>
              </div>

              {!visitorToken && (
                <button
                  type="button"
                  onClick={handleGeneratePass}
                  disabled={generating}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {generating ? 'Generating Pass / QR...' : 'Generate Pass / QR'}
                </button>
              )}

              {visitorToken && (
                <div className="space-y-3" data-testid="visitor-pass-artifact">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Digital pass is ready.
                  </p>

                  <a
                    href={passLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex px-4 py-2 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900/20"
                  >
                    Open Full Pass View
                  </a>

                  {qrCode ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700 dark:text-gray-200">QR code preview</p>
                      <img
                        src={qrCode}
                        alt="Visitor pass QR code"
                        className="w-56 h-56 object-contain border border-gray-200 dark:border-slate-700 rounded-md bg-white"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      QR image is not cached here. Use the full pass view to access the scannable artifact.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
