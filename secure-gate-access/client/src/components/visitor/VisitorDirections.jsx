/**
 * VisitorDirections Component
 * Phase 2.3: Visitor view of directions to the estate
 * 
 * Privacy: Shows only gate location, not unit-specific details
 */

import React, { useState, useEffect } from 'react';

import api from '../../utils/apiClient';
import Button from '../ui/Button';

const VisitorDirections = ({ visitorId, inviteToken }) => {
  const [directions, setDirections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visitorId && inviteToken) {
      loadDirections();
    }
  }, [visitorId, inviteToken]);

  const loadDirections = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ token: inviteToken });
      const response = await api.get(
        `/api/directions/visitor/${visitorId}?${params.toString()}`
      );
      const data = response.data;
      
      if (data.success) {
        setDirections({
          ...data.directions,
          mapLinks: data.mapLinks || data.directions?.mapLinks || {},
          privacyNotice: data.privacyNotice || data.directions?.privacyNotice
        });
      } else {
        setError(data.error || 'Failed to load directions');
      }
    } catch (err) {
      setError('Failed to load directions');
      console.error('Load directions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = (app) => {
    if (!directions?.mapLinks?.[app]) return;
    window.open(directions.mapLinks[app], '_blank');
  };

  const shareLink = async () => {
    try {
      const params = new URLSearchParams({ token: inviteToken });
      const response = await api.get(`/api/directions/visitor/${visitorId}/share?${params.toString()}`);
      const data = response.data;
      
      if (data.success && navigator.share) {
        await navigator.share({
          title: `Directions to ${directions?.gate?.name || 'Estate'}`,
          text: `Get directions to ${data.gateName}`,
          url: data.link
        });
      } else if (data.success) {
        await navigator.clipboard.writeText(data.link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setError(data.error || 'Failed to generate share link');
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="text-center text-red-600">
          <span className="text-4xl">📍</span>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>🗺️</span> Directions to {directions?.gate?.name || 'Estate'}
        </h2>
        <p className="text-blue-100 text-sm mt-1">
          Visiting {directions?.hostName}
        </p>
      </div>

      {/* Map App Links */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <p className="text-sm text-gray-600 dark:text-gray-200 mb-3">Open in your favorite maps app:</p>
        <div className="flex gap-2">
          <Button
            onClick={() => openInMaps('google')}
            disabled={!directions?.mapLinks?.google}
            className="flex-1 py-3 px-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">🗺️</span>
              <span className="text-xs text-gray-600 dark:text-gray-200">Google Maps</span>
            </div>
          </Button>
          <Button
            onClick={() => openInMaps('apple')}
            disabled={!directions?.mapLinks?.apple}
            className="flex-1 py-3 px-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">🍎</span>
              <span className="text-xs text-gray-600 dark:text-gray-200">Apple Maps</span>
            </div>
          </Button>
          <Button
            onClick={() => openInMaps('waze')}
            disabled={!directions?.mapLinks?.waze}
            className="flex-1 py-3 px-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">🚗</span>
              <span className="text-xs text-gray-600 dark:text-gray-200">Waze</span>
            </div>
          </Button>
        </div>
      </div>

      {/* General Directions */}
      {(directions?.fromHighway || directions?.fromCity) && (
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">General Directions</h3>
          {directions.fromHighway && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 dark:text-gray-300 uppercase">From Highway</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{directions.fromHighway}</p>
            </div>
          )}
          {directions.fromCity && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-300 uppercase">From City Center</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{directions.fromCity}</p>
            </div>
          )}
        </div>
      )}

      {/* Custom Instructions from Host */}
      {directions?.customInstructions && (
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-yellow-50 dark:bg-yellow-900/20">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <span>💬</span> Message from {directions.hostName}
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">{directions.customInstructions}</p>
        </div>
      )}

      {/* Building Area */}
      {directions?.buildingArea && (
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">Once Inside</h3>
          <p className="text-sm text-gray-600 dark:text-gray-200">
            Ask the guard at the gate to direct you to <strong>{directions.buildingArea}</strong>
          </p>
        </div>
      )}

      {directions?.unitPin && (
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-brand-50 dark:bg-brand-900/20">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Unit PIN</h3>
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-700 rounded-lg px-4 py-3">
            <span className="font-mono text-lg text-brand-800 dark:text-brand-300">{directions.unitPin}</span>
            <span className="text-xs text-brand-700 dark:text-brand-300">Show at gate if asked</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-200 mt-2">
            This PIN is only shared because your host enabled it for this invite.
          </p>
        </div>
      )}

      {/* Share & Actions */}
      <div className="p-4 bg-gray-50 dark:bg-slate-900">
        <Button
          onClick={shareLink}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <span>✓</span>
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <span>📤</span>
              <span>Share Directions with Driver</span>
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-300 text-center mt-2">
          🔒 {directions?.privacyNotice || 'Shows gate location only, not your specific unit.'}
        </p>
      </div>
    </div>
  );
};

export default VisitorDirections;
