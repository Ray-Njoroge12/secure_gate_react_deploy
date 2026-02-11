/**
 * DeliveryList Component
 * Phase 2.1: Resident view of their deliveries
 * 
 * Privacy: Shows only user's own deliveries
 */

import React, { useState, useEffect, useCallback } from 'react';

import deliveryService from '../../services/deliveryService';
import Button from '../ui/Button';

const DeliveryList = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const loadDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      const status = filter === 'all' ? undefined : filter;
      const response = await deliveryService.getMyDeliveries({ status });
      setDeliveries(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load deliveries');
      console.error('Load deliveries error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  const handleCollect = async (deliveryId) => {
    try {
      await deliveryService.collectDelivery(deliveryId, 'Self');
      loadDeliveries();
    } catch (err) {
      setError('Failed to mark as collected');
    }
  };

  const handleSetHandoff = async (deliveryId, preference) => {
    try {
      setUpdatingId(deliveryId);
      setError(null);
      await deliveryService.setHandoffPreference(deliveryId, preference);
      await loadDeliveries();
    } catch (err) {
      setError(err?.message || 'Failed to set delivery preference');
    } finally {
      setUpdatingId(null);
    }
  };

  const getHandoffLabel = (pref) => {
    if (pref === 'pickup_at_gate') return 'Pickup at Gate';
    if (pref === 'deliver_to_residence') return 'Deliver to Residence';
    return 'Not decided';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending_collection: 'bg-yellow-100 text-yellow-800',
      notified: 'bg-blue-100 text-blue-800',
      collected: 'bg-green-100 text-green-800',
      returned: 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200',
      expired: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      pending_collection: 'Pending',
      notified: 'Notified',
      collected: 'Collected',
      returned: 'Returned',
      expired: 'Expired'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 dark:bg-slate-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading && deliveries.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">📦 My Deliveries</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-md shadow-sm"
          >
            <option value="all">All Deliveries</option>
            <option value="pending_collection">Pending</option>
            <option value="collected">Collected</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="divide-y divide-gray-200 dark:divide-slate-700">
        {deliveries.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-300">
            <span className="text-4xl">📭</span>
            <p className="mt-2">No deliveries found</p>
          </div>
        ) : (
          deliveries.map((delivery) => (
            <div key={delivery.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {delivery.carrier_name}
                    </span>
                    {getStatusBadge(delivery.status)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                    {delivery.package_description || 'Package'}
                    {' • '}
                    <span className="capitalize">{delivery.package_size}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                    Received: {formatDate(delivery.created_at)}
                  </p>
                  {delivery.collected_at && (
                    <p className="text-xs text-green-600 mt-1">
                      Collected: {formatDate(delivery.collected_at)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {delivery.has_photo && (
                    <Button
                      onClick={() => window.open(`/api/deliveries/${delivery.id}/photo`, '_blank')}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      📷 View Photo
                    </Button>
                  )}
                  {delivery.status === 'pending_collection' && (
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-gray-600 dark:text-gray-200">
                        Handoff: <span className="font-medium">{getHandoffLabel(delivery.handoff_preference)}</span>
                      </div>

                      {!delivery.handoff_preference && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSetHandoff(delivery.id, 'pickup_at_gate')}
                            disabled={updatingId === delivery.id}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            {updatingId === delivery.id ? 'Saving...' : 'Pickup at Gate'}
                          </Button>
                          <Button
                            onClick={() => handleSetHandoff(delivery.id, 'deliver_to_residence')}
                            disabled={updatingId === delivery.id}
                            className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50"
                          >
                            {updatingId === delivery.id ? 'Saving...' : 'Deliver to Residence'}
                          </Button>
                        </div>
                      )}

                      {delivery.handoff_preference && (
                        <div className="text-xs text-gray-500 dark:text-gray-300">
                          You can change this later from the delivery details.
                        </div>
                      )}
                    </div>
                  )}
                  {delivery.status === 'pending_collection' && (
                    <Button
                      onClick={() => handleCollect(delivery.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      Mark Collected
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Privacy Notice */}
      <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-300">
        <p>🔒 Privacy: Only you can see your deliveries. Photos auto-delete 30 days after collection.</p>
      </div>
    </div>
  );
};

export default DeliveryList;
