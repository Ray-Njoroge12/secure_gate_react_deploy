/**
 * PendingDeliveries Component
 * Phase 2.1: Guard view of pending packages for pickup
 * 
 * Privacy: Shows minimal info - no tracking numbers visible to guards
 */

import React, { useState, useEffect } from 'react';
import deliveryService from '../../services/deliveryService';

const PendingDeliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    loadPendingDeliveries();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingDeliveries, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingDeliveries = async () => {
    try {
      const response = await deliveryService.getPendingDeliveries();
      setDeliveries(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load pending deliveries');
      console.error('Load pending deliveries error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotify = async (deliveryId) => {
    try {
      await deliveryService.notifyResident(deliveryId);
      loadPendingDeliveries();
    } catch (err) {
      console.error('Notify error:', err);
    }
  };

  const handleCollect = async (deliveryId, collectedBy) => {
    try {
      await deliveryService.collectDelivery(deliveryId, collectedBy || 'Resident');
      loadPendingDeliveries();
    } catch (err) {
      console.error('Collect error:', err);
    }
  };

  const getTimeAgo = (dateString) => {
    const received = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - received) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getSizeIcon = (size) => {
    const icons = {
      small: '📦',
      medium: '📦',
      large: '📦📦',
      'extra-large': '📦📦📦'
    };
    return icons[size] || '📦';
  };

  const getHandoffBadge = (pref) => {
    if (pref === 'pickup_at_gate') {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          🚶 Pickup at Gate
        </span>
      );
    }
    if (pref === 'deliver_to_residence') {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
          🏠 Deliver to Residence
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
        ⏳ Awaiting Decision
      </span>
    );
  };

  if (loading && deliveries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              📦 Pending Deliveries
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              {deliveries.length} package{deliveries.length !== 1 ? 's' : ''} awaiting collection
            </p>
          </div>
          <button
            onClick={() => setShowRegister(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            + Register Delivery
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Deliveries List */}
      <div className="divide-y divide-gray-200">
        {deliveries.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-300">
            <span className="text-4xl">📭</span>
            <p className="mt-2">No pending deliveries</p>
          </div>
        ) : (
          deliveries.map((delivery) => (
            <div key={delivery.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <span className="text-2xl">{getSizeIcon(delivery.packageSize)}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {delivery.carrierName}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-200">
                      For: <span className="font-medium">{delivery.recipientName}</span>
                      {' • '}
                      Unit: {delivery.recipientUnit}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                      Received {getTimeAgo(delivery.receivedAt)}
                      {' • '}
                      <span className="capitalize">{delivery.packageSize}</span> package
                    </p>
                    <div className="mt-2">
                      {getHandoffBadge(delivery.handoffPreference)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleNotify(delivery.id)}
                    className="px-3 py-1 text-sm border border-blue-300 text-blue-600 rounded-md hover:bg-blue-50"
                  >
                    📲 Notify
                  </button>
                  <button
                    onClick={() => {
                      const name = prompt('Collected by (name):');
                      if (name) handleCollect(delivery.id, name);
                    }}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    ✓ Collected
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Privacy Notice */}
      <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 dark:text-gray-300">
        🔒 Tracking numbers and package details are visible only to recipients
      </div>

      {/* Register Delivery Modal */}
      {showRegister && (
        <RegisterDeliveryModal
          onClose={() => setShowRegister(false)}
          onSuccess={() => {
            setShowRegister(false);
            loadPendingDeliveries();
          }}
        />
      )}
    </div>
  );
};

/**
 * Simple Register Delivery Modal
 */
const RegisterDeliveryModal = ({ onClose, onSuccess }) => {
  // This would use the RegisterDelivery component
  // For now, a simplified inline version
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Register New Delivery</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-200">
            ✕
          </button>
        </div>
        <div className="p-4">
          <p className="text-gray-500 dark:text-gray-300 text-center">
            Use the full registration form for detailed entry
          </p>
          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingDeliveries;
