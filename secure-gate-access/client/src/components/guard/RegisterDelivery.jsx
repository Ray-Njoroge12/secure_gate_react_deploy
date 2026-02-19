/**
 * RegisterDelivery Component
 * Phase 2.1: Guard interface to register incoming deliveries
 * 
 * Privacy: Minimal data collection, encrypted tracking numbers
 */

import React, { useState, useEffect, useRef } from 'react';
import deliveryService from '../../services/deliveryService';
import Button from '../ui/Button';

const RegisterDelivery = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    carrierName: '',
    recipientId: '',
    trackingNumber: '',
    packageDescription: '',
    packageSize: 'medium',
    notes: ''
  });
  const [residents, setResidents] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Common carriers in Kenya
  const carriers = [
    'DHL',
    'FedEx',
    'UPS',
    'Aramex',
    'G4S',
    'Fargo Courier',
    'Posta Kenya',
    'Sendy',
    'Jumia',
    'Other'
  ];

  const packageSizes = [
    { value: 'small', label: 'Small (fits in hand)' },
    { value: 'medium', label: 'Medium (shoebox size)' },
    { value: 'large', label: 'Large (box)' },
    { value: 'extra-large', label: 'Extra Large (needs cart)' }
  ];

  useEffect(() => {
    loadResidents();
  }, []);

  const loadResidents = async () => {
    try {
      // This would be an API call to get resident list
      // For now, using placeholder

      // Use guard-specific endpoint for fetching residents
      const response = await fetch('/api/guard/residents');
      if (response.ok) {
        const data = await response.json();
        setResidents(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load residents:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Register the delivery
      const result = await deliveryService.registerDelivery({
        trackingNumber: formData.trackingNumber,
        carrierName: formData.carrierName,
        recipientId: parseInt(formData.recipientId),
        packageDescription: formData.packageDescription,
        packageSize: formData.packageSize,
        notes: formData.notes
      });

      // Add photo if captured
      if (photo && result.delivery?.id) {
        await deliveryService.addPhoto(result.delivery.id, photo);
      }

      // Send notification to resident
      if (result.delivery?.id) {
        await deliveryService.notifyResident(result.delivery.id);
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess(result.delivery);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register delivery');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-xl font-semibold text-green-600">Delivery Registered!</h3>
        <p className="text-gray-600 dark:text-gray-200 mt-2">Resident has been notified</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">📦 Register Delivery</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Log incoming package for resident</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Carrier */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Carrier / Courier *
          </label>
          <select
            name="carrierName"
            value={formData.carrierName}
            onChange={handleChange}
            required
            className="w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select carrier...</option>
            {carriers.map(carrier => (
              <option key={carrier} value={carrier}>{carrier}</option>
            ))}
          </select>
        </div>

        {/* Recipient */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Recipient (Resident) *
          </label>
          <select
            name="recipientId"
            value={formData.recipientId}
            onChange={handleChange}
            required
            className="w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select resident...</option>
            {residents.map(resident => (
              <option key={resident.id} value={resident.id}>
                {resident.username} - {resident.house}
              </option>
            ))}
          </select>
        </div>

        {/* Package Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Package Size *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {packageSizes.map(size => (
              <label
                key={size.value}
                className={`flex items-center p-3 border rounded-md cursor-pointer transition ${formData.packageSize === size.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:border-slate-600'
                  }`}
              >
                <input
                  type="radio"
                  name="packageSize"
                  value={size.value}
                  checked={formData.packageSize === size.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="text-sm">{size.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Tracking Number (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tracking Number
            <span className="text-gray-500 dark:text-gray-300 ml-1">(Optional, encrypted)</span>
          </label>
          <input
            type="text"
            name="trackingNumber"
            value={formData.trackingNumber}
            onChange={handleChange}
            placeholder="e.g., 1234567890"
            className="w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">🔒 Encrypted and visible only to recipient</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <input
            type="text"
            name="packageDescription"
            value={formData.packageDescription}
            onChange={handleChange}
            placeholder="e.g., Electronics, Documents, Food"
            className="w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Photo Capture */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Package Photo
            <span className="text-gray-500 dark:text-gray-300 ml-1">(Visible only to recipient)</span>
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
          />
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Package"
                className="w-full h-48 object-cover rounded-md"
              />
              <Button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                }}
                className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full"
              >
                ✕
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-md text-center hover:border-gray-400"
            >
              <span className="text-3xl">📷</span>
              <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">Tap to capture photo</p>
            </Button>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">🔒 Photo auto-deletes 30 days after collection</p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            placeholder="Any special handling instructions..."
            className="w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register & Notify Resident'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RegisterDelivery;
