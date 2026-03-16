/**
 * @fileoverview Favorite Visitors Component (FULL PAGE VERSION)
 * @description Full-featured page for managing frequently visiting guests
 * @note For the compact widget version embedded in dashboard,
 *       see: /components/resident/FavoriteVisitors.jsx
 * @author Secure Gate Access Team
 * @version 1.0.0
 * 
 * Features:
 * - Full CRUD operations for favorites
 * - Modal forms for add/edit
 * - History tab with visitor suggestions
 * - Search and filter capabilities
 * - Relationship type categorization
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import {
  Card,
  Button,
  Modal,
  Loading,
  Badge,
  Icon
} from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { navigateTo } from '../../utils/appNavigation';
import api from '../../utils/apiClient';

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
  const { toast } = useToast();
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

  // New state for History Tab
  const [activeTab, setActiveTab] = useState('new');
  const [historyVisitors, setHistoryVisitors] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Fetch favorites on mount
  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/api/resident/favorites');

      const data = response.data;
      setFavorites(data.data?.favorites || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      if (err.response?.status === 404) {
        setFavorites([]);
        return;
      }
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Your session has expired. Please log in again.');
      } else {
        setFavorites([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/api/visitors');
      const json = res.data;
      if (json?.success) {
        const visitors = Array.isArray(json.data) ? json.data : (json.data?.visitors || []);
        setHistoryVisitors(visitors);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const uniqueHistoryVisitors = useMemo(() => {
    const unique = new Map();
    historyVisitors.forEach(v => {
      const key = v.phone || v.email || v.name;
      if (!unique.has(key)) {
        unique.set(key, v);
      }
    });
    return Array.from(unique.values()).slice(0, 50);
  }, [historyVisitors]);

  const filteredHistoryVisitors = useMemo(() => {
    const query = historySearchQuery.trim().toLowerCase();
    if (!query) {
      return uniqueHistoryVisitors;
    }

    return uniqueHistoryVisitors.filter((visitor) => (
      visitor.name?.toLowerCase().includes(query) ||
      String(visitor.phone || '').toLowerCase().includes(query) ||
      visitor.email?.toLowerCase().includes(query)
    ));
  }, [uniqueHistoryVisitors, historySearchQuery]);

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
    setActiveTab('new');
    setHistorySearchQuery('');
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

      await (editingFavorite ? api.put(url, formData) : api.post(url, formData));

      setIsModalOpen(false);
      fetchFavorites(); // Refresh list
    } catch (err) {
      console.error('Error saving favorite:', err);
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (favoriteId) => {
    try {
      await api.delete(`/api/resident/favorites/${favoriteId}`);

      setDeleteConfirm(null);
      fetchFavorites(); // Refresh list
    } catch (err) {
      console.error('Error deleting favorite:', err);
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // Quick invite from favorite
  const handleQuickInvite = useCallback((favorite) => {
    // Navigate to resident quick-invite page with pre-filled data
    const params = new URLSearchParams({
      name: favorite.visitor_name,
      phone: favorite.visitor_phone || '',
      email: favorite.visitor_email || '',
      from_favorite: favorite.id
    });
    navigateTo(`/resident/quick-invite?${params.toString()}`);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            Favorite Visitors
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-200'}`}>
            Save frequently visiting guests for quick invites
          </p>
        </div>

        <Button
          onClick={handleAdd}
          className="flex items-center gap-2"
        >
          <Icon name="Plus" className="w-4 h-4" />
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
              <Icon name="Search" className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-500 dark:text-gray-300'
                }`} />
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search favorite visitors"
                className={`w-full pl-10 pr-4 py-3 rounded-lg border ${isDark
                  ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-400'
                  : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white placeholder-gray-500'
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
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-100 dark:bg-slate-700'
                  }`}>
                  <Icon name="Heart" className={`w-8 h-8 ${isDark ? 'text-gray-300' : 'text-gray-500 dark:text-gray-300'}`} />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  No Favorite Visitors Yet
                </h3>
                <p className={`text-sm mb-6 max-w-sm ${isDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-200'}`}>
                  Add your frequently visiting guests here for quick one-tap invites.
                  Save time by not entering their details every time!
                </p>
                <Button onClick={handleAdd} className="flex items-center gap-2">
                  <Icon name="Plus" className="w-4 h-4" />
                  Add Your First Favorite
                </Button>
              </div>
            </Card>
          )}

          {/* No Search Results */}
          {!error && favorites.length > 0 && filteredFavorites.length === 0 && (
            <Card className={`p-8 text-center ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
              <Icon name="Search" className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-500 dark:text-gray-300' : 'text-gray-400 dark:text-gray-300'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                No Results Found
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-200'}`}>
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
                  className={`p-4 hover:shadow-md transition-shadow ${isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'hover:border-gray-300 dark:border-slate-600'
                    }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${isDark ? 'bg-slate-700' : 'bg-gray-100 dark:bg-slate-700'
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
                      <Button
                        variant="ghost"
                        onClick={() => handleEdit(favorite)}
                        className={`p-2 rounded-lg transition-colors ${isDark
                          ? 'hover:bg-slate-700 text-gray-300 hover:text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:text-gray-300'
                          }`}
                        aria-label="Edit favorite"
                      >
                        <Icon name="Edit2" className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setDeleteConfirm(favorite.id)}
                        className={`p-2 rounded-lg transition-colors ${isDark
                          ? 'hover:bg-red-900/30 text-gray-300 hover:text-red-400'
                          : 'hover:bg-red-50 text-gray-500 dark:text-gray-300 hover:text-red-600'
                          }`}
                        aria-label="Delete favorite"
                      >
                        <Icon name="Trash2" className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    {favorite.visitor_phone && (
                      <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-200'
                        }`}>
                        <Icon name="Phone" className="w-4 h-4" />
                        <span>{favorite.visitor_phone}</span>
                      </div>
                    )}
                    {favorite.visitor_email && (
                      <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-200'
                        }`}>
                        <Icon name="Mail" className="w-4 h-4" />
                        <span className="truncate">{favorite.visitor_email}</span>
                      </div>
                    )}
                  </div>

                  {/* Visit Stats */}
                  <div className={`flex items-center justify-between py-2 border-t ${isDark ? 'border-slate-700' : 'border-gray-200 dark:border-slate-700'
                    }`}>
                    <div className={`flex items-center gap-4 text-xs ${isDark ? 'text-gray-500 dark:text-gray-300' : 'text-gray-500 dark:text-gray-300'
                      }`}>
                      <span className="flex items-center gap-1">
                        <Icon name="Users" className="w-3 h-3" />
                        {favorite.visit_count || 0} visits
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="Clock" className="w-3 h-3" />
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
                    <Icon name="UserPlus" className="w-4 h-4" />
                    Quick Invite
                  </Button>
                </Card>
              ))}
            </div>
          )}

          {/* Add/Edit Modal with Tabs */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingFavorite ? 'Edit Favorite Visitor' : 'Add Favorite Visitor'}
          >
            {/* Tabs for Add Mode */}
            {!editingFavorite && (
              <div className="flex border-b border-gray-200 dark:border-slate-700 mb-4" role="tablist" aria-label="Favorite visitor source">
                <Button
                  variant="ghost"
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'new'
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
                    }`}
                  onClick={() => setActiveTab('new')}
                  role="tab"
                  aria-selected={activeTab === 'new'}
                  aria-controls="favorite-tab-new"
                >
                  New Contact
                </Button>
                <Button
                  variant="ghost"
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
                    }`}
                  onClick={() => {
                    setActiveTab('history');
                    if (historyVisitors.length === 0) fetchHistory();
                  }}
                  role="tab"
                  aria-selected={activeTab === 'history'}
                  aria-controls="favorite-tab-history"
                >
                  From History
                </Button>
              </div>
            )}

            {activeTab === 'history' && !editingFavorite ? (
              <div className="space-y-4" id="favorite-tab-history" role="tabpanel">
                <div className="relative">
                  <Icon name="Search" className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'
                    }`} />
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={historySearchQuery}
                    onChange={(event) => setHistorySearchQuery(event.target.value)}
                    aria-label="Search visitor history"
                    className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg border ${isDark
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white'
                      } focus:outline-none focus:ring-2 focus:ring-brand-500`}
                  />
                </div>

                {historyLoading ? (
                  <div className="flex justify-center py-8">
                    <Loading size="medium" />
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                    {filteredHistoryVisitors.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-300 text-sm">
                        No recent visitors found.
                      </div>
                    ) : (
                      filteredHistoryVisitors.map((visitor) => (
                        <div role="button" tabIndex={0}
                          key={visitor.id || visitor.phone || visitor.email || visitor.name}
                          className={`p-3 rounded-lg border cursor-pointer hover:border-brand-500 transition-colors ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                            }`}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              visitor_name: visitor.name || '',
                              visitor_phone: visitor.phone || '',
                              visitor_email: visitor.email || '',
                              visitor_id: visitor.id,
                              relationship: 'Guest'
                            }));
                            setActiveTab('new');
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setFormData((prev) => ({
                                ...prev,
                                visitor_name: visitor.name || '',
                                visitor_phone: visitor.phone || '',
                                visitor_email: visitor.email || '',
                                visitor_id: visitor.id,
                                relationship: 'Guest'
                              }));
                              setActiveTab('new');
                            }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                {visitor.name || 'Unknown'}
                              </p>
                              <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-300">
                                {visitor.phone && <span>{visitor.phone}</span>}
                                {visitor.email && <span>{visitor.email}</span>}
                              </div>
                            </div>
                            <span className="text-xs text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-full">
                              Select
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                <div className="text-center border-t pt-3 mt-2 border-gray-200 dark:border-slate-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('new')}
                    className="text-sm text-brand-600 hover:underline"
                  >
                    Enter details manually
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" id="favorite-tab-new" role="tabpanel">
                <div>
                  <label htmlFor="fav-visitor-name" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                    Visitor Name *
                  </label>
                  <input
                    id="fav-visitor-name"
                    type="text"
                    required
                    value={formData.visitor_name}
                    onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                    placeholder="Enter visitor's full name"
                    className={`w-full px-3 py-2 rounded-lg border ${isDark
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white'
                      } focus:outline-none focus:ring-2 focus:ring-brand-500`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fav-visitor-phone" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                      Phone Number
                    </label>
                    <input
                      id="fav-visitor-phone"
                      type="tel"
                      value={formData.visitor_phone}
                      onChange={(e) => setFormData({ ...formData, visitor_phone: e.target.value })}
                      placeholder="+254..."
                      className={`w-full px-3 py-2 rounded-lg border ${isDark
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white'
                        } focus:outline-none focus:ring-2 focus:ring-brand-500`}
                    />
                  </div>
                  <div>
                    <label htmlFor="fav-visitor-email" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                      Email Address
                    </label>
                    <input
                      id="fav-visitor-email"
                      type="email"
                      value={formData.visitor_email}
                      onChange={(e) => setFormData({ ...formData, visitor_email: e.target.value })}
                      placeholder="visitor@email.com"
                      className={`w-full px-3 py-2 rounded-lg border ${isDark
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white'
                        } focus:outline-none focus:ring-2 focus:ring-brand-500`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                    Relationship
                  </label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white'
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
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                    Notes (optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any notes about this visitor..."
                    rows={3}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white'
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
                        <Icon name="Star" className="w-4 h-4 text-yellow-500" />
                        {editingFavorite ? 'Update' : 'Add'} Favorite
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal
            isOpen={deleteConfirm !== null}
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
                  <Icon name="Trash2" className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default FavoriteVisitors;
