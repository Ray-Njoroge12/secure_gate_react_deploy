import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/ui';
import { apiClient } from '../utils/apiClient.js';

const EstateSelection = () => {
  const navigate = useNavigate();
  const [estates, setEstates] = useState([]);
  const [estateId, setEstateId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchEstates = async () => {
      try {
        const response = await apiClient.get('/api/estates/available');
        setEstates(response.data?.data?.estates ?? []);
      } catch (err) {
        setError('Unable to load available estates. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchEstates();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!estateId) {
      setError('Please select an estate to continue.');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/api/estates/select', { estateId: Number(estateId) });
      setSuccess('Estate assigned successfully. You can now access the app.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to update estate assignment. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-8">
        <div className="text-4xl mb-4">🏢</div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Select your estate
        </h1>
        <p className="text-gray-600 dark:text-gray-200 mb-6">
          Your account is active but needs an estate assignment. Choose your estate below to continue.
        </p>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-300">Loading estates...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="estateId" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Available estates <span className="text-red-500">*</span>
              </label>
              <select
                id="estateId"
                className="w-full min-h-[44px] rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                value={estateId}
                onChange={(event) => setEstateId(event.target.value)}
                required
                aria-required="true"
                aria-invalid={!estateId && "true"}
                aria-describedby="estate-help"
              >
                <option value="">Select an estate</option>
                {estates.map((estate) => (
                  <option key={estate.id} value={estate.id}>
                    {estate.name}
                  </option>
                ))}
              </select>
            </div>
            <p id="estate-help" className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              Select the estate you belong to. This assignment is required to access the system.
            </p>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {success && (
              <div className="text-sm text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 rounded-lg px-3 py-2">
                {success}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !estateId}
              loading={submitting}
              className="w-full"
              aria-busy={submitting}
            >
              {submitting ? 'Assigning estate...' : 'Confirm estate'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default EstateSelection;
