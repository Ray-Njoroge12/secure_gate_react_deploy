// client/src/pages/resident/AddVisitor.jsx
import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { createVisitor, createPass } from "../../services/visitorService";
import { handleApiError } from "../../utils/errorMapper";
import QRCodeDisplay from "../../components/QRCodeDisplay";
import { Button, Input, Card, Toast, Loading, Badge } from "../../components/ui";
import { ApiForm, ApiFormSubmit, ApiFormReset, ApiResult } from "../../components/common";
import useApiForm from "../../hooks/useApiForm";

const initialFormData = {
  name: "",
  phone: "",
  email: "",
  dateOfVisit: "",
  time: "",
  purpose: "",
  generatePassImmediately: true,
};

const validateForm = (form) => {
  if (!form.name.trim()) return 'Name is required';
  if (!form.phone.trim()) return 'Phone is required';
  if (!form.purpose.trim()) return 'Purpose is required';

  // Validate phone format (basic)
  if (!/^0\d{9}$/.test(form.phone.trim())) {
    return 'Phone must be in format 0xxxxxxxxx (10 digits starting with 0)';
  }

  // Validate email format if provided (optional)
  if (form.email.trim() && !/\S+@\S+\.\S+/.test(form.email.trim())) {
    return 'Please enter a valid email address';
  }

  return null;
};

export default function AddVisitor() {
  const onLogout = () => { localStorage.removeItem("role"); window.location.href = "/"; };

  const submitFn = async (formData) => {
    // Create visitor
    const visitorData = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      dateOfVisit: formData.dateOfVisit.trim(),
      time: formData.time.trim(),
      purpose: formData.purpose.trim(),
    };

    const visitorResponse = await createVisitor(visitorData);

    let passResponse = null;
    if (formData.generatePassImmediately) {
      try {
        passResponse = await createPass(visitorResponse.id);
      } catch (passError) {
        console.warn('Pass generation failed:', passError);
        // Continue anyway, visitor was created successfully
      }
    }

    return {
      visitor: visitorResponse,
      pass: passResponse,
      inviteLink: visitorResponse.inviteLink,
      message: 'Invitation created successfully! Share the link with the guest to complete registration.'
    };
  };

  const {
    formData,
    loading,
    error,
    success,
    validationErrors,
    updateField,
    resetForm,
    clearError,
    clearSuccess,
    handleSubmit,
  } = useApiForm({
    submitFn,
    initialFormData,
    validateFn: validateForm,
    successAction: 'createVisitor',
  });

  return (
    <>
      <div className="app-grid">
        <Sidebar role="resident" />
        <div>
          <Topbar title="Add Visitor" onLogout={onLogout} />
          <main className="main p-6">
            {/* Success and Error Display */}
            <ApiResult
              result={success}
              error={error}
              loading={loading}
              onClose={() => {
                clearError();
                clearSuccess();
              }}
            />

            <Card>
              <Card.Header>
                <Card.Title>Add New Visitor</Card.Title>
                <p className="text-sm text-slate-400 mt-2">
                  Create a visitor entry and optionally generate an access pass immediately
                </p>
              </Card.Header>

              <Card.Content>
                <ApiForm onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      placeholder="Enter visitor's full name"
                      value={formData.name}
                      onChange={e => updateField('name', e.target.value)}
                      disabled={loading}
                      required
                      error={validationErrors.name}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      }
                    />

                    <Input
                      label="Phone Number"
                      placeholder="0xxxxxxxxx (10 digits)"
                      value={formData.phone}
                      onChange={e => updateField('phone', e.target.value)}
                      disabled={loading}
                      required
                      error={validationErrors.phone}
                      helperText="Format: 0xxxxxxxxx"
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      }
                    />
                  </div>

                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="visitor@example.com (optional)"
                    value={formData.email}
                    onChange={e => updateField('email', e.target.value)}
                    disabled={loading}
                    error={validationErrors.email}
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    }
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Date of Visit"
                      type="date"
                      value={formData.dateOfVisit}
                      onChange={e => updateField('dateOfVisit', e.target.value)}
                      disabled={loading}
                      required
                      error={validationErrors.dateOfVisit}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      }
                    />

                    <Input
                      label="Time of Visit"
                      type="time"
                      value={formData.time}
                      onChange={e => updateField('time', e.target.value)}
                      disabled={loading}
                      required
                      error={validationErrors.time}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      }
                    />
                  </div>

                  <Input
                    label="Purpose of Visit"
                    placeholder="e.g., visit, delivery, meeting, maintenance"
                    value={formData.purpose}
                    onChange={e => updateField('purpose', e.target.value)}
                    disabled={loading}
                    required
                    error={validationErrors.purpose}
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    }
                  />

                  <div className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg">
                    <input
                      type="checkbox"
                      id="generatePass"
                      checked={formData.generatePassImmediately}
                      onChange={e => updateField('generatePassImmediately', e.target.checked)}
                      disabled={loading}
                      className="h-4 w-4 text-green-600 bg-slate-800 border-slate-600 rounded focus:ring-green-500"
                    />
                    <label htmlFor="generatePass" className="flex-1 text-sm text-slate-300">
                      <span className="font-medium">Generate QR pass immediately</span>
                      <span className="block text-xs text-slate-400 mt-1">
                        Auto-approve and create access pass without manual review
                      </span>
                    </label>
                    <Badge variant="info" size="sm">Recommended</Badge>
                  </div>

                  {loading && (
                    <div className="flex items-center justify-center py-4">
                      <Loading size="md" text="Creating visitor..." />
                    </div>
                  )}

                  <div className="flex gap-3 w-full mt-4">
                    <ApiFormReset
                      disabled={loading}
                      onReset={resetForm}
                      className="flex-1"
                    >
                      Clear Form
                    </ApiFormReset>
                    <ApiFormSubmit
                      loading={loading}
                      disabled={loading}
                      className="flex-2"
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      }
                    >
                      {loading ? 'Creating...' : (formData.generatePassImmediately ? 'Create & Generate Pass' : 'Create Visitor')}
                    </ApiFormSubmit>
                  </div>
                </ApiForm>
              </Card.Content>
            </Card>
          </main>
        </div>
      </div>

      {/* Toast Notifications */}
      {error && (
        <Toast
          type="error"
          message={error}
          onClose={clearError}
        />
      )}
    </>
  );
}
