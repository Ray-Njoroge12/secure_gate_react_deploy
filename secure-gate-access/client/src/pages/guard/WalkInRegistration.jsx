/**
 * @file WalkInRegistration.jsx
 * @description Phase G2 - Guard walk-in visitor registration with real-time approval
 * Allows guards to register unexpected visitors and request resident approval
 */

import React, { useState } from 'react';
import { Card, Button, Input, PageHeader } from '../../components/ui';
import { User, Phone, Home, FileText, AlertCircle, UserPlus } from 'lucide-react';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';
import ApprovalStatusCard from '../../components/guard/ApprovalStatusCard';

const WalkInRegistration = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    purpose: '',
    residentName: '',
    vehiclePlate: ''
  });
  const [registeredVisitor, setRegisteredVisitor] = useState(null);
  const [showApprovalCard, setShowApprovalCard] = useState(false);
  
  const { handleError, handleApiError, clearAllErrors } = useError();
  const { setLoading, isLoading } = useLoading();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      handleError('Visitor name is required', { context: 'Walk-In Registration' });
      return false;
    }
    if (!formData.phone.trim()) {
      handleError('Phone number is required', { context: 'Walk-In Registration' });
      return false;
    }
    if (!formData.residentName.trim()) {
      handleError('Resident name is required', { context: 'Walk-In Registration' });
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading('walkInReg', true, { message: 'Registering walk-in visitor...' });
      clearAllErrors();

      // Create visitor with walk-in flag
      const response = await fetch('/api/visitors/walk-in', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          purpose: formData.purpose || 'Walk-in visit',
          residentName: formData.residentName,
          vehiclePlate: formData.vehiclePlate,
          dateOfVisit: new Date().toISOString().split('T')[0],
          timeOfVisit: new Date().toTimeString().slice(0, 5)
        })
      });

      if (!response.ok) {
        const error = new Error('Failed to register walk-in visitor');
        error.response = { status: response.status, data: await response.json() };
        throw error;
      }

      const result = await response.json();
      const visitor = result.data || result;
      
      setRegisteredVisitor(visitor);
      setShowApprovalCard(true);

    } catch (err) {
      handleApiError(err, 'Walk-In Registration');
    } finally {
      setLoading('walkInReg', false);
    }
  };

  const handleRequestApproval = async (visitor) => {
    try {
      setLoading('approval', true, { message: 'Requesting resident approval...' });

      const response = await fetch(`/api/visitors/${visitor.id}/request-approval`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'Walk-in visitor at gate',
          guardNotes: formData.purpose
        })
      });

      if (!response.ok) {
        const error = new Error('Failed to request approval');
        error.response = { status: response.status };
        throw error;
      }

      // Update visitor status
      setRegisteredVisitor(prev => ({
        ...prev,
        status: 'pending_approval'
      }));

    } catch (err) {
      handleApiError(err, 'Approval Request');
    } finally {
      setLoading('approval', false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      phone: '',
      purpose: '',
      residentName: '',
      vehiclePlate: ''
    });
    setRegisteredVisitor(null);
    setShowApprovalCard(false);
    clearAllErrors();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <PageHeader 
        title="Walk-In Registration"
        subtitle="Register unexpected visitors at the gate"
        icon={<UserPlus className="w-6 h-6 text-blue-600" />}
        showBack={true}
        backTo="/dashboard/guard"
        actions={showApprovalCard && (
          <Button variant="outline" onClick={handleReset}>
            Register Another
          </Button>
        )}
      />
      
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-6">

      {!showApprovalCard ? (
        <Card>
          <Card.Header>
            <Card.Title>Visitor Information</Card.Title>
          </Card.Header>
          <Card.Content>
            <form onSubmit={handleRegister} data-testid="walk-in-form" className="space-y-4">
              {/* Visitor Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Visitor Name *
                </label>
                <input
                  type="text"
                  name="name"
                  data-testid="walk-in-visitor-name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter visitor's full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  data-testid="walk-in-visitor-phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="e.g., +254712345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>

              {/* Resident Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Home className="w-4 h-4 inline mr-1" />
                  Visiting Resident *
                </label>
                <input
                  type="text"
                  name="residentName"
                  data-testid="walk-in-resident-name"
                  value={formData.residentName}
                  onChange={handleInputChange}
                  placeholder="Name of resident being visited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Purpose (Optional)
                </label>
                <textarea
                  name="purpose"
                  data-testid="walk-in-purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  placeholder="Reason for visit"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              {/* Vehicle Plate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🚗 Vehicle Plate (Optional)
                </label>
                <input
                  type="text"
                  name="vehiclePlate"
                  value={formData.vehiclePlate}
                  onChange={handleInputChange}
                  placeholder="e.g., KXX 123A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              {/* Info Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Walk-In Approval Process</p>
                  <p>After registration, you can request approval from the resident. They'll receive a real-time notification and can approve/reject instantly.</p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  data-testid="walk-in-submit"
                  disabled={isLoading('walkInReg')}
                  className="flex-1"
                >
                  {isLoading('walkInReg') ? 'Registering...' : 'Register Walk-In'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                >
                  Clear
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Visitor Details Card */}
          <Card>
            <Card.Header>
              <Card.Title>Walk-In Visitor Registered</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Name:</span> {registeredVisitor?.name}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {registeredVisitor?.phone}
                </div>
                <div>
                  <span className="font-medium">Visiting:</span> {formData.residentName}
                </div>
                {formData.purpose && (
                  <div>
                    <span className="font-medium">Purpose:</span> {formData.purpose}
                  </div>
                )}
                {formData.vehiclePlate && (
                  <div>
                    <span className="font-medium">Vehicle:</span> {formData.vehiclePlate}
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>

          {/* Approval Status Card */}
          <ApprovalStatusCard
            visitor={registeredVisitor}
            onRequestApproval={handleRequestApproval}
          />
        </div>
      )}
      </div>
    </div>
  );
};

export default WalkInRegistration;

