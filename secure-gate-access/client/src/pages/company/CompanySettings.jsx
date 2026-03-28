import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext.js";
import { Card, Button, Loading, EmptyState } from "../../components/ui";
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
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({});
  const [newLocation, setNewLocation] = useState({ name: "", address: "", isPrimary: false });

  const companyId = user?.company_id || user?.companyId;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateCompany(companyId, form);
      setSuccess("Company details updated successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocation.name) return;
    try {
      await addCompanyLocation(companyId, newLocation);
      setNewLocation({ name: "", address: "", isPrimary: false });
      const locRes = await getCompanyLocations(companyId);
      setLocations(locRes?.data?.locations || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm("Delete this location?")) return;
    try {
      await deleteCompanyLocation(companyId, locationId);
      setLocations(ls => ls.filter(l => l.id !== locationId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
              <input type="text" value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input type="text" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input type="tel" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={3} />
          </div>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Locations</h2>
        {locations.length > 0 && (
          <ul className="space-y-2 mb-4">
            {locations.map(loc => (
              <li key={loc.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">{loc.name}</span>
                  {loc.isPrimary || loc.is_primary ? <span className="ml-2 text-xs text-blue-600 font-medium">Primary</span> : null}
                  {loc.address && <p className="text-sm text-gray-500">{loc.address}</p>}
                </div>
                <button onClick={() => handleDeleteLocation(loc.id)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddLocation} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
            <input type="text" value={newLocation.name} onChange={e => setNewLocation(l => ({ ...l, name: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input type="text" value={newLocation.address} onChange={e => setNewLocation(l => ({ ...l, address: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={newLocation.isPrimary} onChange={e => setNewLocation(l => ({ ...l, isPrimary: e.target.checked }))} />
            <span className="text-sm text-gray-700">Primary</span>
          </label>
          <Button type="submit" size="sm">Add Location</Button>
        </form>
      </Card>
    </div>
  );
}
