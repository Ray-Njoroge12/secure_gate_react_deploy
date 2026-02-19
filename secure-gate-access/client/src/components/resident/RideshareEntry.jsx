/**
 * RideshareEntry Component
 * P5: Resident interface for quick Uber/Bolt/Taxi entry
 */

import React, { useState, useEffect } from 'react';

import rideshareService from '../../services/rideshareService';
import Button from '../ui/Button';

const SERVICE_PROVIDERS = [
  { value: 'uber', label: 'Uber', icon: '🚗', color: 'bg-black text-white' },
  { value: 'bolt', label: 'Bolt', icon: '⚡', color: 'bg-green-500 text-white' },
  { value: 'taxi', label: 'Taxi', icon: '🚕', color: 'bg-yellow-400 text-black' },
  { value: 'other', label: 'Other', icon: '🚙', color: 'bg-gray-500 text-white' }
];

const RideshareEntry = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    driverName: '',
    vehiclePlate: '',
    vehicleDescription: '',
    serviceProvider: 'uber',
    expiryMinutes: 30
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadEntries();
    // Refresh every 30 seconds to update expiry status
    const interval = setInterval(loadEntries, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadEntries = async () => {
    try {
      const response = await rideshareService.getMyEntries();
      setEntries(response.data || []);
    } catch (err) {
      console.error('Load entries error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.driverName || !formData.vehiclePlate) {
      setError('Driver name and vehicle plate are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const response = await rideshareService.createEntry(formData);
      setSuccess(response.data);
      setShowForm(false);
      setFormData({
        driverName: '',
        vehiclePlate: '',
        vehicleDescription: '',
        serviceProvider: 'uber',
        expiryMinutes: 30
      });
      loadEntries();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (entryId) => {
    try {
      await rideshareService.cancelEntry(entryId);
      loadEntries();
    } catch (err) {
      setError('Failed to cancel entry');
    }
  };

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Less than 1 min';
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const getProviderInfo = (provider) => {
    return SERVICE_PROVIDERS.find(p => p.value === provider) || SERVICE_PROVIDERS[3];
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">🚗 Rideshare Entry</h2>
            <p className="text-sm text-gray-500 dark:text-gray-300">Quick access for Uber, Bolt & Taxi</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            + New Entry
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <Button onClick={() => setError(null)} className="text-sm text-red-600 underline">Dismiss</Button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-700 font-medium">✅ Entry Created!</p>
              <p className="text-green-600 mt-1">Share this code with your driver:</p>
              <p className="text-3xl font-mono font-bold text-green-800 mt-2">{success.access_code}</p>
              <p className="text-sm text-green-600 mt-1">
                Valid until {new Date(success.expires_at).toLocaleTimeString()}
              </p>
            </div>
            <Button onClick={() => setSuccess(null)} className="text-gray-500 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100">✕</Button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="p-4 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Driver Name *</label>
                <input
                  type="text"
                  name="driverName"
                  value={formData.driverName}
                  onChange={handleChange}
                  className="w-full border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-md"
                  placeholder="e.g., John"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle Plate *</label>
                <input
                  type="text"
                  name="vehiclePlate"
                  value={formData.vehiclePlate}
                  onChange={handleChange}
                  className="w-full border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-md uppercase"
                  placeholder="KXX 000X"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle Description</label>
              <input
                type="text"
                name="vehicleDescription"
                value={formData.vehicleDescription}
                onChange={handleChange}
                className="w-full border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-md"
                placeholder="e.g., White Toyota Prius"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service</label>
                <div className="flex gap-2">
                  {SERVICE_PROVIDERS.map(provider => (
                    <Button
                      key={provider.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, serviceProvider: provider.value }))}
                      className={`flex-1 py-2 rounded-md text-sm font-medium ${
                        formData.serviceProvider === provider.value
                          ? provider.color
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {provider.icon}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid For</label>
                <select
                  name="expiryMinutes"
                  value={formData.expiryMinutes}
                  onChange={handleChange}
                  className="w-full border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-md"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Entry'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="divide-y divide-gray-200 dark:divide-slate-700">
        {entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-300">
            <span className="text-4xl">🚕</span>
            <p className="mt-2">No active rideshare entries</p>
            <p className="text-sm">Create an entry when your Uber/Bolt arrives</p>
          </div>
        ) : (
          entries.map((entry) => {
            const provider = getProviderInfo(entry.service_provider);
            const isExpired = new Date(entry.expires_at) < new Date();
            
            return (
              <div key={entry.id} className={`p-4 ${isExpired ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <span className={`text-2xl px-2 py-1 rounded ${provider.color}`}>
                      {provider.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">{entry.driver_name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          entry.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                          entry.status === 'arrived' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                          'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-200">
                        {entry.vehicle_plate}
                        {entry.vehicle_description && ` • ${entry.vehicle_description}`}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-300">
                        <span>Code: <span className="font-mono font-bold">{entry.access_code}</span></span>
                        <span>⏱️ {getTimeRemaining(entry.expires_at)}</span>
                      </div>
                    </div>
                  </div>
                  {entry.status === 'pending' && !isExpired && (
                    <Button
                      onClick={() => handleCancel(entry.id)}
                      className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-300">
        💡 Share the access code with your driver. Guards will verify before entry.
      </div>
    </div>
  );
};

export default RideshareEntry;
