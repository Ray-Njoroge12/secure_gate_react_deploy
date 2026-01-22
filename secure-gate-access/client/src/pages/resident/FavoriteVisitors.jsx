/**
 * @fileoverview Favorite Visitors Component
 * @description Manage frequently visiting guests for quick invites
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { navigateTo } from '../../utils/appNavigation';
import { 
  Card, 
  Button, 
  Input, 
  Modal, 
  EmptyState, 
  Loading, 
  Badge,
  SearchBar
} from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
// import AppShell from '../../layouts/AppShell';
// import { useCurrentRole } from '../../hooks/useCurrentRole';
import { 
  Star, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  User, 
  Edit2, 
  Trash2, 
  UserPlus,
  Clock,
  ChevronRight,
  Heart,
  Users
} from 'lucide-react';

// Relationship type options
const RELATIONSHIP_TYPES = [
  { value: 'Family', label: 'Family Member', icon: '👨‍👩‍👧‍👦' },
  { value: 'Friend', label: 'Friend', icon: '🤝' },
  { value: 'Colleague', label: 'Colleague', icon: '💼' },
  { value: 'Service Provider', label: 'Service Provider', icon: '🔧' },
  { value: 'Delivery', label: 'Delivery Person', icon: '📦' },
  { value: 'Guest', label: 'General Guest', icon: '👤' },
  { value: 'Other', label: 'Other', icon: '❓' }
];

/**
 * Favorite Visitors Page Component
 */
const FavoriteVisitors = () => {
  const { isDark } = useTheme();
  // const role = useCurrentRole();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState(null);
  const [formData, setFormData] = useState({
    visitor_name: '',
    visitor_phone: '',
    visitor_email: '',
    relationship: 'Guest',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch favorites on mount
  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/resident/favorites', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
           setFavorites([]);
           return;
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('Your session has expired. Please log in again.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch favorites');
      }
      
      const data = await response.json();
      setFavorites(data.data?.favorites || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter favorites based on search
  const filteredFavorites = useMemo(() => {
    if (!searchQuery.trim()) return favorites;
    
    const query = searchQuery.toLowerCase();
    return favorites.filter(fav => 
      fav.visitor_name?.toLowerCase().includes(query) ||
      fav.visitor_phone?.includes(query) ||
      fav.visitor_email?.toLowerCase().includes(query) ||
      fav.relationship?.toLowerCase().includes(query)
    );
  }, [favorites, searchQuery]);

  // Open modal for adding new favorite
  const handleAdd = useCallback(() => {
    setEditingFavorite(null);
    setFormData({
      visitor_name: '',
      visitor_phone: '',
      visitor_email: '',
      relationship: 'Guest',
      notes: ''
    });
    setIsModalOpen(true);
  }, []);

  // Open modal for editing
  const handleEdit = useCallback((favorite) => {
    setEditingFavorite(favorite);
    setFormData({
      visitor_name: favorite.visitor_name || '',
      visitor_phone: favorite.visitor_phone || '',
      visitor_email: favorite.visitor_email || '',
      relationship: favorite.relationship || 'Guest',
      notes: favorite.notes || ''
    });
    setIsModalOpen(true);
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const url = editingFavorite 
        ? `/api/resident/favorites/${editingFavorite.id}`
        : '/api/resident/favorites';
      
      const response = await fetch(url, {
        method: editingFavorite ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save favorite');
      }
      
      setIsModalOpen(false);
      fetchFavorites(); // Refresh list
    } catch (err) {
      console.error('Error saving favorite:', err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (favoriteId) => {
    try {
      const response = await fetch(`/api/resident/favorites/${favoriteId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete favorite');
      }
      
      setDeleteConfirm(null);
      fetchFavorites(); // Refresh list
    } catch (err) {
      console.error('Error deleting favorite:', err);
      alert(err.message);
    }
  };

  // Quick invite from favorite
  const handleQuickInvite = useCallback((favorite) => {
    // Navigate to add visitor page with pre-filled data
    const params = new URLSearchParams({
      name: favorite.visitor_name,
      phone: favorite.visitor_phone || '',
      email: favorite.visitor_email || '',
      from_favorite: favorite.id
    });
    navigateTo(`/resident/add-visitor?${params.toString()}`);
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Get relationship icon
  const getRelationshipIcon = (relationship) => {
    const found = RELATIONSHIP_TYPES.find(r => r.value === relationship);
    return found?.icon || '👤';
  };



  return (
    // <AppShell role={role}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            Favorite Visitors
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600 dark:text-gray-200'}`}>
            Save frequently visiting guests for quick invites
          </p>
        </div>
        
        <Button 
          onClick={handleAdd}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Favorite
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
             <div key={i} className={`h-40 rounded-xl animate-pulse ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`} />
          ))}
        </div>
      ) : (
        <>

      {/* Search Bar */}
      {favorites.length > 0 && (
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
            isDark ? 'text-gray-400' : 'text-gray-500 dark:text-gray-300'
          }`} />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
              isDark 
                ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 dark:text-white placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent`}
          />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-200">{error}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchFavorites}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!error && favorites.length === 0 && (
        <Card className={`p-12 text-center ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              isDark ? 'bg-slate-700' : 'bg-gray-100'
            }`}>
              <Heart className={`w-8 h-8 ${isDark ? 'text-gray-400' : 'text-gray-500 dark:text-gray-300'}`} />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              No Favorite Visitors Yet
            </h3>
            <p className={`text-sm mb-6 max-w-sm ${isDark ? 'text-gray-400' : 'text-gray-600 dark:text-gray-200'}`}>
              Add your frequently visiting guests here for quick one-tap invites. 
              Save time by not entering their details every time!
            </p>
            <Button onClick={handleAdd} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Favorite
            </Button>
          </div>
        </Card>
      )}

      {/* No Search Results */}
      {!error && favorites.length > 0 && filteredFavorites.length === 0 && (
        <Card className={`p-8 text-center ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
          <Search className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-500 dark:text-gray-300' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            No Results Found
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600 dark:text-gray-200'}`}>
            No favorites match "{searchQuery}". Try a different search term.
          </p>
        </Card>
      )}

      {/* Favorites Grid */}
      {filteredFavorites.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFavorites.map((favorite) => (
            <Card 
              key={favorite.id}
              className={`p-4 hover:shadow-lg transition-shadow ${
                isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    isDark ? 'bg-slate-700' : 'bg-gray-100'
                  }`}>
                    {getRelationshipIcon(favorite.relationship)}
                  </div>
                  <div>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      {favorite.visitor_name}
                    </h3>
                    <Badge variant="secondary" size="sm">
                      {favorite.relationship}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(favorite)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark 
                        ? 'hover:bg-slate-700 text-gray-400 hover:text-white'
                        : 'hover:bg-gray-100 text-gray-500 dark:text-gray-300 hover:text-gray-700'
                    }`}
                    aria-label="Edit favorite"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(favorite.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark 
                        ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400'
                        : 'hover:bg-red-50 text-gray-500 dark:text-gray-300 hover:text-red-600'
                    }`}
                    aria-label="Delete favorite"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {favorite.visitor_phone && (
                  <div className={`flex items-center gap-2 text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600 dark:text-gray-200'
                  }`}>
                    <Phone className="w-4 h-4" />
                    <span>{favorite.visitor_phone}</span>
                  </div>
                )}
                {favorite.visitor_email && (
                  <div className={`flex items-center gap-2 text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600 dark:text-gray-200'
                  }`}>
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{favorite.visitor_email}</span>
                  </div>
                )}
              </div>

              {/* Visit Stats */}
              <div className={`flex items-center justify-between py-2 border-t ${
                isDark ? 'border-slate-700' : 'border-gray-200'
              }`}>
                <div className={`flex items-center gap-4 text-xs ${
                  isDark ? 'text-gray-500 dark:text-gray-300' : 'text-gray-500 dark:text-gray-300'
                }`}>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {favorite.visit_count || 0} visits
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(favorite.last_visit)}
                  </span>
                </div>
              </div>

              {/* Quick Invite Button */}
              <Button 
                variant="primary"
                className="w-full mt-3 flex items-center justify-center gap-2"
                onClick={() => handleQuickInvite(favorite)}
              >
                <UserPlus className="w-4 h-4" />
                Quick Invite
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFavorite ? 'Edit Favorite Visitor' : 'Add Favorite Visitor'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Visitor Name *
            </label>
            <input
              type="text"
              required
              value={formData.visitor_name}
              onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
              placeholder="Enter visitor's full name"
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900 dark:text-white'
              } focus:outline-none focus:ring-2 focus:ring-brand-500`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.visitor_phone}
                onChange={(e) => setFormData({ ...formData, visitor_phone: e.target.value })}
                placeholder="+254..."
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark 
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900 dark:text-white'
                } focus:outline-none focus:ring-2 focus:ring-brand-500`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Email Address
              </label>
              <input
                type="email"
                value={formData.visitor_email}
                onChange={(e) => setFormData({ ...formData, visitor_email: e.target.value })}
                placeholder="visitor@email.com"
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark 
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900 dark:text-white'
                } focus:outline-none focus:ring-2 focus:ring-brand-500`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Relationship
            </label>
            <select
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900 dark:text-white'
              } focus:outline-none focus:ring-2 focus:ring-brand-500`}
            >
              {RELATIONSHIP_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any notes about this visitor..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900 dark:text-white'
              } focus:outline-none focus:ring-2 focus:ring-brand-500`}
            />
          </div>

          <p className={`text-xs ${isDark ? 'text-gray-500 dark:text-gray-300' : 'text-gray-500 dark:text-gray-300'}`}>
            * Either phone or email is required for identification
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loading size="small" />
                  Saving...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" />
                  {editingFavorite ? 'Update' : 'Add'} Favorite
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Favorite"
      >
        <div className="space-y-4">
          <p className={isDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-200'}>
            Are you sure you want to remove this visitor from your favorites? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDelete(deleteConfirm)}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </Modal>
      </>
      )}
      </div>
    // </AppShell>
  );
};

export default FavoriteVisitors;
