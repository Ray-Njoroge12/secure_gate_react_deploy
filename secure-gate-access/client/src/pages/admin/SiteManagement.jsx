/**
 * @file SiteManagement.jsx
 * @description Multi-site/estate management interface
 * Phase A5: Multi-Site, Integrations & Automation
 */

import React, { useState, useEffect } from 'react';
import './SiteManagement.css';

const SiteManagement = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    address: '',
    city: '',
    timezone: 'Africa/Nairobi',
    logo_url: '',
    primary_color: '#667eea',
    secondary_color: '#764ba2',
    active: true,
    subscription_tier: 'basic'
  });

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/sites', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch sites');
      
      const data = await response.json();
      setSites(data.data || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingSite 
        ? `/api/admin/sites/${editingSite.id}`
        : '/api/admin/sites';
      
      const method = editingSite ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save site');

      await fetchSites();
      setShowModal(false);
      resetForm();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const switchSite = async (siteId) => {
    try {
      const response = await fetch(`/api/admin/sites/${siteId}/switch`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to switch site');

      alert('Site switched successfully! Reloading page...');
      window.location.reload();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const openEditModal = (site) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      code: site.code,
      description: site.description || '',
      address: site.address || '',
      city: site.city || '',
      timezone: site.timezone || 'Africa/Nairobi',
      logo_url: site.logo_url || '',
      primary_color: site.primary_color || '#667eea',
      secondary_color: site.secondary_color || '#764ba2',
      active: site.active,
      subscription_tier: site.subscription_tier || 'basic'
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingSite(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      address: '',
      city: '',
      timezone: 'Africa/Nairobi',
      logo_url: '',
      primary_color: '#667eea',
      secondary_color: '#764ba2',
      active: true,
      subscription_tier: 'basic'
    });
  };

  if (loading) {
    return (
      <div className="site-management">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading sites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="site-management">
      <div className="site-header">
        <div className="header-left">
          <h1>🏢 Site Management</h1>
          <p className="subtitle">Manage multiple estates and properties</p>
        </div>
        <button 
          className="btn-create"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Add New Site
        </button>
      </div>

      <div className="sites-grid">
        {sites.map(site => (
          <div key={site.id} className={`site-card ${!site.active ? 'inactive' : ''}`}>
            <div className="site-card-header">
              <div className="site-branding">
                {site.logo_url ? (
                  <img src={site.logo_url} alt={site.name} className="site-logo" />
                ) : (
                  <div 
                    className="site-logo-placeholder"
                    style={{ background: `linear-gradient(135deg, ${site.primary_color}, ${site.secondary_color})` }}
                  >
                    {site.name.charAt(0)}
                  </div>
                )}
                <div className="site-info">
                  <h3>{site.name}</h3>
                  <span className="site-code">{site.code}</span>
                </div>
              </div>
              <span className={`tier-badge ${site.subscription_tier}`}>
                {site.subscription_tier}
              </span>
            </div>

            <p className="site-description">{site.description || 'No description'}</p>

            <div className="site-meta">
              <div className="meta-item">
                <span className="meta-icon">📍</span>
                <span>{site.city || 'N/A'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-icon">🕐</span>
                <span>{site.timezone || 'N/A'}</span>
              </div>
            </div>

            <div className="site-actions">
              <button 
                className="btn-switch"
                onClick={() => switchSite(site.id)}
              >
                Switch to Site
              </button>
              <button 
                className="btn-edit"
                onClick={() => openEditModal(site)}
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSite ? 'Edit Site' : 'Add New Site'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Site Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Site Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    required
                    maxLength="50"
                    placeholder="e.g., SGE001"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                  >
                    <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                    <option value="Africa/Cairo">Africa/Cairo (EET)</option>
                    <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Subscription Tier</label>
                  <select
                    value={formData.subscription_tier}
                    onChange={(e) => setFormData({...formData, subscription_tier: e.target.value})}
                  >
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Logo URL</label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Primary Color</label>
                  <div className="color-input">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                    />
                    <input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Secondary Color</label>
                  <div className="color-input">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                    />
                    <input
                      type="text"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({...formData, active: e.target.checked})}
                  />
                  <span>Active (site enabled for use)</span>
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingSite ? 'Update Site' : 'Create Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteManagement;
