/**
 * @file WatchlistManagement.jsx
 * @description Security watchlist management interface
 * Phase A3: Policy Engine & Watchlists
 */

import React, { useState, useEffect } from 'react';
import useModalAccessibility from '../../hooks/useModalAccessibility';
import Button from '../../components/ui/Button';
import api from '../../utils/apiClient';
import logger from '../../utils/logger';
import { DeleteConfirmation } from '../../components/common/ConfirmationDialog';
import './WatchlistManagement.css';

const WatchlistManagement = () => {
  const [entries, setEntries] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('entries'); // 'entries' or 'matches'
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const closeModal = () => setShowModal(false);
  const { modalRef } = useModalAccessibility(showModal, closeModal);
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
      const response = await api.get('/api/admin/watchlist');
      setEntries(response.data.data || []);
    } catch (err) {
      logger.error('Error fetching watchlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await api.get('/api/admin/watchlist/matches');
      setMatches(response.data.data || []);
    } catch (err) {
      logger.error('Error fetching matches:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingEntry 
        ? `/api/admin/watchlist/${editingEntry.id}`
        : '/api/admin/watchlist';
      
      if (editingEntry) {
        await api.put(url, formData);
      } else {
        await api.post(url, formData);
      }

      await fetchWatchlist();
      setShowModal(false);
      resetForm();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const deleteEntry = async (id) => {
    setEntryToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/api/admin/watchlist/${entryToDelete}`);
      await fetchWatchlist();
      setDeleteConfirmOpen(false);
      setEntryToDelete(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const toggleEntry = async (entry) => {
    try {
      await api.put(`/api/admin/watchlist/${entry.id}`, { ...entry, active: !entry.active });
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
        <Button 
          className="btn-create"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Add to Watchlist
        </Button>
      </div>

      {/* Tabs */}
      <div className="watchlist-tabs" role="tablist" aria-label="Watchlist sections">
        <Button 
          variant="ghost"
          className={`tab ${activeTab === 'entries' ? 'active' : ''}`}
          onClick={() => setActiveTab('entries')}
          role="tab"
          aria-selected={activeTab === 'entries'}
        >
          Watchlist Entries ({entries.length})
        </Button>
        <Button 
          variant="ghost"
          className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
          role="tab"
          aria-selected={activeTab === 'matches'}
        >
          Match History ({matches.length})
        </Button>
      </div>

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <div className="watchlist-content">
          {entries.length === 0 ? (
            <div className="empty-state">
              <p>No watchlist entries yet.</p>
              <Button className="btn-primary" onClick={() => setShowModal(true)}>
                Add First Entry
              </Button>
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
                          <Button 
                            variant="outlined" size="sm"
                            className="btn-sm btn-edit"
                            onClick={() => openEditModal(entry)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="secondary" size="sm"
                            className="btn-sm btn-toggle"
                            onClick={() => toggleEntry(entry)}
                          >
                            {entry.active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button 
                            variant="danger" size="sm"
                            className="btn-sm btn-delete"
                            onClick={() => deleteEntry(entry.id)}
                          >
                            Delete
                          </Button>
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
        <div className="modal-overlay" onClick={closeModal} role="presentation" aria-hidden="true">
          <div
            className="modal-content large"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="watchlist-modal-title"
            tabIndex={-1}
          >
            <div className="modal-header">
              <h2 id="watchlist-modal-title">{editingEntry ? 'Edit Watchlist Entry' : 'Add to Watchlist'}</h2>
              <Button variant="ghost" className="modal-close" onClick={closeModal} aria-label="Close">×</Button>
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
                <Button variant="secondary" className="btn-cancel" onClick={closeModal}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" className="btn-primary">
                  {editingEntry ? 'Update Entry' : 'Add to Watchlist'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmation
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setEntryToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName="this watchlist entry"
      />
    </div>
  );
};

export default WatchlistManagement;
