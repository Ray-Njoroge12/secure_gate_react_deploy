import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext.js";
import { Card, Button, Badge, Loading, EmptyState, ErrorState, Modal, Input } from "../../components/ui";
import AccessibilitySettings from "../../components/accessibility/AccessibilitySettings";
import {
  getCompany,
  updateCompany,
  getCompanyLocations,
  addCompanyLocation,
  deleteCompanyLocation
} from "../../services/companyService";

export default function CompanySettings() {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({});
  const [newLocation, setNewLocation] = useState({ name: "", address: "", isPrimary: false });
  const [locationFormLoading, setLocationFormLoading] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState(null);
  const [pendingDeleteLocation, setPendingDeleteLocation] = useState(null);

  const companyId = user?.company_id || user?.companyId;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const [compRes, locRes] = await Promise.all([
        getCompany(companyId),
        getCompanyLocations(companyId)
      ]);
      const comp = compRes?.data?.company;
      setCompany(comp);
      setLocations(locRes?.data?.locations || []);
      setForm({
        name: comp?.name || "",
        registration_number: comp?.registrationNumber || comp?.registration_number || "",
        contact_name: comp?.contactName || comp?.contact_name || "",
        contact_email: comp?.contactEmail || comp?.contact_email || "",
        contact_phone: comp?.contactPhone || comp?.contact_phone || "",
        address: comp?.address || "",
        description: comp?.description || ""
      });
    } catch (err) {
      setLoadError(err.message || "Failed to load company settings");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setLoadError(null);
    setSuccess(null);
    try {
      await updateCompany(companyId, form);
      setSuccess("Company details updated successfully");
    } catch (err) {
      setSuccess(null);
      setLoadError(err.message || "Failed to update company details");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocation.name) return;

    setLocationFormLoading(true);
    setSuccess(null);
    try {
      await addCompanyLocation(companyId, newLocation);
      setNewLocation({ name: "", address: "", isPrimary: false });
      const locRes = await getCompanyLocations(companyId);
      setLocations(locRes?.data?.locations || []);
      setSuccess("Location added successfully");
    } catch (err) {
      setLoadError(err.message || "Failed to add location");
    } finally {
      setLocationFormLoading(false);
    }
  };

  const handleDeleteLocation = (location) => {
    setPendingDeleteLocation(location);
  };

  const confirmDeleteLocation = async () => {
    if (!pendingDeleteLocation) return;

    setDeletingLocationId(pendingDeleteLocation.id);
    setSuccess(null);
    try {
      await deleteCompanyLocation(companyId, pendingDeleteLocation.id);
      setLocations((current) => current.filter((location) => location.id !== pendingDeleteLocation.id));
      setSuccess(`Deleted ${pendingDeleteLocation.name}`);
      setPendingDeleteLocation(null);
    } catch (err) {
      setLoadError(err.message || "Failed to delete location");
    } finally {
      setDeletingLocationId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-12">
        <Loading text="Loading company settings" />
      </div>
    );
  }

  if (loadError && !company) {
    return <ErrorState onRetry={fetchData} errorMessage={loadError} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Settings</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Update company details and manage your locations.
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          Refresh
        </Button>
      </div>

      {loadError && company && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100"
          role="alert"
          aria-live="polite"
        >
          {loadError}
        </div>
      )}

      {success && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-100"
          role="status"
          aria-live="polite"
        >
          {success}
        </div>
      )}

      <Card className="border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Company Details</h2>
              {company?.status && (
                <Badge variant={company.status === "approved" ? "success" : company.status === "pending" ? "pending" : company.status === "suspended" ? "warning" : "danger"} size="sm">
                  {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Keep your company identity and contact information current.
            </p>
          </div>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Company name"
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            />
            <Input
              label="Registration number"
              value={form.registration_number}
              onChange={(e) => setForm((current) => ({ ...current, registration_number: e.target.value }))}
            />
            <Input
              label="Contact name"
              value={form.contact_name}
              onChange={(e) => setForm((current) => ({ ...current, contact_name: e.target.value }))}
            />
            <Input
              label="Contact email"
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm((current) => ({ ...current, contact_email: e.target.value }))}
            />
            <Input
              label="Contact phone"
              type="tel"
              value={form.contact_phone}
              onChange={(e) => setForm((current) => ({ ...current, contact_phone: e.target.value }))}
            />
          </div>
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="company-description">
              Description
            </label>
            <textarea
              id="company-description"
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              rows={4}
            />
          </div>
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
        </form>
      </Card>

      <Card className="border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Locations</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Keep your estate locations organized for access control and reporting.
            </p>
          </div>

          {locations.length > 0 ? (
            <ul className="space-y-3">
              {locations.map((loc) => (
                <li
                  key={loc.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{loc.name}</span>
                      {(loc.isPrimary || loc.is_primary) && <Badge variant="info" size="sm">Primary</Badge>}
                    </div>
                    {loc.address && <p className="text-sm text-gray-600 dark:text-gray-300">{loc.address}</p>}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteLocation(loc)}
                    disabled={deletingLocationId === loc.id}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              title="No locations yet"
              description="Add your first location to organize company access and reporting."
            />
          )}

          <form onSubmit={handleAddLocation} className="space-y-4 border-t border-gray-200 pt-4 dark:border-slate-700">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Location name"
                value={newLocation.name}
                onChange={(e) => setNewLocation((current) => ({ ...current, name: e.target.value }))}
                required
              />
              <Input
                label="Address"
                value={newLocation.address}
                onChange={(e) => setNewLocation((current) => ({ ...current, address: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
              <input
                type="checkbox"
                checked={newLocation.isPrimary}
                onChange={(e) => setNewLocation((current) => ({ ...current, isPrimary: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">Mark as primary location</span>
            </label>
            <Button type="submit" size="sm" loading={locationFormLoading}>
              Add Location
            </Button>
          </form>
        </div>
      </Card>

      {/* Accessibility */}
      <Card className="border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="space-y-1 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Accessibility</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Configure accessibility preferences for your account.
          </p>
        </div>
        <AccessibilitySettings />
      </Card>

      <Modal
        isOpen={Boolean(pendingDeleteLocation)}
        onClose={() => setPendingDeleteLocation(null)}
        title="Delete location"
        size="md"
        ariaLabel="Confirm delete company location"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {pendingDeleteLocation?.name || "this location"}
            </span>
            ? This action will remove the location from company records.
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setPendingDeleteLocation(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deletingLocationId === pendingDeleteLocation?.id} onClick={confirmDeleteLocation}>
              Delete location
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
