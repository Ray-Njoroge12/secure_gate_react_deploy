/**
 * @file WatchlistManagement.jsx
 * @description Security watchlist management interface
 * Phase A3: Policy Engine & Watchlists
 */

import React, { useState, useEffect } from 'react';
import './WatchlistManagement.css';

const WatchlistManagement = () => {
  const [entries, setEntries] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('entries'); // 'entries' or 'matches'
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    entry_type: 'person',
    name: '',
    phone: '',
    email: '',
    id_number: '',
    vehicle_plate: '',
    company_name: '',
    reason: '',
    severity: 'medium',
    category: 'suspicious',
    notes: '',
    active: true
  });

  useEffect(() => {
    fetchWatchlist();
    if (activeTab === 'matches') {
      fetchMatches();
    }
  }, [activeTab]);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/watchlist', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch watchlist');
      
      const data = await response.json();
      setEntries(data.data || []);
    } catch (err) {
      console.error('Error fetching watchlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/admin/watchlist/matches', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch matches');
      
      const data = await response.json();
      setMatches(data.data || []);
    } catch (err) {
      console.error('Error fetching matches:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingEntry 
        ? `/api/admin/watchlist/${editingEntry.id}`
        : '/api/admin/watchlist';
      
      const method = editingEntry ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save watchlist entry');

      await fetchWatchlist();
      setShowModal(false);
      resetForm();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm('Are you sure you want to remove this entry from the watchlist?')) return;

    try {
      const response = await fetch(`/api/admin/watchlist/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete entry');
      await fetchWatchlist();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const toggleEntry = async (entry) => {
    try {
      const response = await fetch(`/api/admin/watchlist/${entry.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entry, active: !entry.active })
      });

      if (!response.ok) throw new Error('Failed to toggle entry');
      await fetchWatchlist();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setFormData({
      entry_type: entry.entry_type,
      name: entry.name || '',
      phone: entry.phone || '',
      email: entry.email || '',
      id_number: entry.id_number || '',
      vehicle_plate: entry.vehicle_plate || '',
      company_name: entry.company_name || '',
      reason: entry.reason,
      severity: entry.severity,
      category: entry.category || 'suspicious',
      notes: entry.notes || '',
      active: entry.active
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingEntry(null);
    setFormData({
      entry_type: 'person',
      name: '',
      phone: '',
      email: '',
      id_number: '',
      vehicle_plate: '',
      company_name: '',
      reason: '',
      severity: 'medium',
      category: 'suspicious',
      notes: '',
      active: true
    });
  };

  const getSeverityClass = (severity) => {
    return `severity-${severity}`;
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return icons[severity] || '⚪';
  };

  if (loading) {
    return (
      <div className="watchlist-management">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading watchlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="watchlist-management">
      <div className="watchlist-header">
        <div className="header-left">
          <h1>🛡️ Security Watchlist</h1>
          <p className="subtitle">Manage flagged individuals and vehicles</p>
        </div>
        <button 
          className="btn-create"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Add to Watchlist
        </button>
      </div>

      {/* Tabs */}
      <div className="watchlist-tabs">
        <button 
          className={`tab ${activeTab === 'entries' ? 'active' : ''}`}
          onClick={() => setActiveTab('entries')}
        >
          Watchlist Entries ({entries.length})
        </button>
        <button 
          className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          Match History ({matches.length})
        </button>
      </div>

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <div className="watchlist-content">
          {entries.length === 0 ? (
            <div className="empty-state">
              <p>No watchlist entries yet.</p>
              <button className="btn-primary" onClick={() => setShowModal(true)}>
                Add First Entry
              </button>
            </div>
          ) : (
            <div className="entries-table-container">
              <table className="entries-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name/Identifier</th>
                    <th>Severity</th>
                    <th>Category</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id} className={!entry.active ? 'inactive' : ''}>
                      <td>
                        <span className="entry-type-badge">
                          {entry.entry_type === 'person' ? '👤' : 
                           entry.entry_type === 'vehicle' ? '🚗' : '🏢'}
                        </span>
                      </td>
                      <td>
                        <div className="entry-info">
                          <strong>{entry.name || entry.vehicle_plate || entry.company_name}</strong>
                          {entry.phone && <small>{entry.phone}</small>}
                        </div>
                      </td>
                      <td>
                        <span className={`severity-badge ${getSeverityClass(entry.severity)}`}>
                          {getSeverityIcon(entry.severity)} {entry.severity}
                        </span>
                      </td>
                      <td>
                        <span className="category-badge">{entry.category}</span>
                      </td>
                      <td className="reason-cell">{entry.reason}</td>
                      <td>
                        <span className={`status-badge ${entry.active ? 'active' : 'inactive'}`}>
                          {entry.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-sm btn-edit"
                            onClick={() => openEditModal(entry)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn-sm btn-toggle"
                            onClick={() => toggleEntry(entry)}
                          >
                            {entry.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button 
                            className="btn-sm btn-delete"
                            onClick={() => deleteEntry(entry.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <div className="watchlist-content">
          {matches.length === 0 ? (
            <div className="empty-state">
              <p>No watchlist matches recorded yet.</p>
            </div>
          ) : (
            <div className="matches-list">
              {matches.map(match => (
                <div key={match.id} className="match-card">
                  <div className="match-header">
                    <span className={`severity-badge ${getSeverityClass(match.severity)}`}>
                      {getSeverityIcon(match.severity)} {match.severity}
                    </span>
                    <span className="match-score">
                      Match Score: {match.match_score}%
                    </span>
                  </div>
                  <div className="match-details">
                    <p><strong>Visitor:</strong> {match.visitor_name}</p>
                    <p><strong>Matched Fields:</strong> {match.matched_fields?.join(', ')}</p>
                    <p><strong>Action Taken:</strong> {match.action_taken || 'Pending'}</p>
                    <p><strong>Date:</strong> {new Date(match.matched_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEntry ? 'Edit Watchlist Entry' : 'Add to Watchlist'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Entry Type *</label>
                  <select
                    value={formData.entry_type}
                    onChange={(e) => setFormData({...formData, entry_type: e.target.value})}
                    required
                  >
                    <option value="person">Person</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="company">Company</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Severity *</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({...formData, severity: e.target.value})}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {formData.entry_type === 'person' && (
                <>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>

                    <div className="form-group">
                      <label>ID Number</label>
                      <input
                        type="text"
                        value={formData.id_number}
                        onChange={(e) => setFormData({...formData, id_number: e.target.value})}
                      />
                    </div>
                  </div>
                </>
              )}

              {formData.entry_type === 'vehicle' && (
                <div className="form-group">
                  <label>Vehicle Plate *</label>
                  <input
                    type="text"
                    value={formData.vehicle_plate}
                    onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value})}
                    required
                  />
                </div>
              )}

              {formData.entry_type === 'company' && (
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="security_threat">Security Threat</option>
                  <option value="banned">Banned</option>
                  <option value="suspicious">Suspicious</option>
                  <option value="vip">VIP</option>
                  <option value="contractor">Contractor</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reason *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({...formData, active: e.target.checked})}
                  />
                  <span>Active (triggers alerts)</span>
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingEntry ? 'Update Entry' : 'Add to Watchlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchlistManagement;
