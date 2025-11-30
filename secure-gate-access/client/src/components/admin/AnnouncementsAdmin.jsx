/**
 * @file AnnouncementsAdmin.jsx
 * @description Admin interface for managing community announcements
 * Phase 3.4: Community Announcements
 * 
 * Features:
 * - Create/edit/delete announcements
 * - Target audience selection
 * - Priority and expiration settings
 * - Aggregate analytics (no individual tracking)
 */

import React, { useState, useEffect, useCallback } from 'react';
import announcementsService from '../../services/announcementsService';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'General updates' },
  { value: 'normal', label: 'Normal', description: 'Standard announcements' },
  { value: 'high', label: 'High', description: 'Important notices' },
  { value: 'critical', label: 'Critical', description: 'Safety/emergency alerts (cannot be dismissed)' }
];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone', description: 'All residents and guards' },
  { value: 'resident', label: 'Residents Only', description: 'All residents' },
  { value: 'guard', label: 'Guards Only', description: 'All guards' }
];

const AnnouncementsAdmin = ({ className = '' }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    targetAudience: 'all',
    expiresAt: '',
    isPinned: false
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const { announcements: data } = await announcementsService.getAllAnnouncements({
        includeExpired: true,
        includeInactive: true
      });
      setAnnouncements(data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      targetAudience: 'all',
      expiresAt: '',
      isPinned: false
    });
    setEditingAnnouncement(null);
    setError(null);
  };

  // Open edit modal
  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      targetAudience: announcement.target_audience,
      expiresAt: announcement.expires_at ? new Date(announcement.expires_at).toISOString().slice(0, 16) : '',
      isPinned: announcement.is_pinned
    });
    setShowCreateModal(true);
  };

  // Submit form (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingAnnouncement) {
        await announcementsService.updateAnnouncement(editingAnnouncement.id, formData);
      } else {
        await announcementsService.createAnnouncement(formData);
      }
      
      await fetchAnnouncements();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving announcement:', error);
      setError('Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  // Delete announcement
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await announcementsService.deleteAnnouncement(id);
      await fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      setError('Failed to delete announcement');
    }
  };

  // Get priority badge color
  const getPriorityBadge = (priority) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      normal: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800'
    };
    return colors[priority] || colors.normal;
  };

  // Check if announcement is expired
  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Community Announcements</h2>
          <p className="text-sm text-gray-500">Manage announcements for residents and guards</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          + New Announcement
        </button>
      </div>

      {/* Announcements List */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">📢 No announcements yet</p>
            <p className="mt-1 text-sm">Create your first announcement to get started</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div 
              key={announcement.id}
              className={`p-4 ${isExpired(announcement.expires_at) ? 'opacity-60 bg-gray-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      {announcement.title}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityBadge(announcement.priority)}`}>
                      {announcement.priority}
                    </span>
                    {announcement.is_pinned && (
                      <span className="text-xs">📌</span>
                    )}
                    {isExpired(announcement.expires_at) && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {announcement.content}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>Audience: {announcement.target_audience}</span>
                    <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                    {announcement.read_count !== undefined && (
                      <span className="text-blue-600">
                        {announcement.read_count} views (aggregate)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                    title="Edit"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Announcement title"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content *
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Announcement content..."
                  required
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {PRIORITY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  name="targetAudience"
                  value={formData.targetAudience}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {AUDIENCE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Privacy: No individual targeting allowed. Only role-based groups.
                </p>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires At (Optional)
                </label>
                <input
                  type="datetime-local"
                  name="expiresAt"
                  value={formData.expiresAt}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Pin */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isPinned"
                  id="isPinned"
                  checked={formData.isPinned}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isPinned" className="ml-2 text-sm text-gray-700">
                  Pin to top of announcements
                </label>
              </div>

              {/* Privacy Notice */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Privacy:</strong> Read tracking is aggregate only (e.g., "45 of 120 viewed"). 
                  Individual read status is not tracked or stored.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingAnnouncement ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsAdmin;
