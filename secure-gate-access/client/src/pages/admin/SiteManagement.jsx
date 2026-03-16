/**
 * @file SiteManagement.jsx
 * @description Multi-site/estate management interface
 * Phase A5: Multi-Site, Integrations & Automation
 */

import React, { useState, useEffect } from 'react';
import useModalAccessibility from '../../hooks/useModalAccessibility';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import api from '../../utils/apiClient';
import logger from '../../utils/logger';
import './SiteManagement.css';

const SiteManagement = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const closeModal = () => setShowModal(false);
  const { modalRef } = useModalAccessibility(showModal, closeModal);
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
      const response = await api.get('/api/admin/sites');
      setSites(response.data.data || []);
    } catch (err) {
      logger.error('Error fetching sites:', err);
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
      
      if (editingSite) {
        await api.put(url, formData);
      } else {
        await api.post(url, formData);
      }

      await fetchSites();
      setShowModal(false);
      resetForm();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const switchSite = async (siteId) => {
    try {
      await api.patch(`/api/admin/sites/${siteId}/switch`);

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
        <Button 
          variant="primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Icon name="plus" sizeOverride={16} aria-hidden="true" /> Add New Site
        </Button>
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
              <Button 
                variant="primary"
                size="sm"
                onClick={() => switchSite(site.id)}
              >
                Switch to Site
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => openEditModal(site)}
              >
                <Icon name="edit" sizeOverride={14} aria-hidden="true" /> Edit
              </Button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal} role="presentation" aria-hidden="true">
          <div
            className="modal-content large"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-modal-title"
            tabIndex={-1}
          >
            <div className="modal-header">
              <h2 id="site-modal-title">{editingSite ? 'Edit Site' : 'Add New Site'}</h2>
              <Button variant="ghost" size="sm" onClick={closeModal} aria-label="Close">×</Button>
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
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingSite ? 'Update Site' : 'Create Site'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteManagement;
