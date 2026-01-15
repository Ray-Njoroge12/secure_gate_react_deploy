/**
 * @file FavoriteVisitors.jsx
 * @description Manage and quick-invite favorite visitors
 * Phase 4: UI/UX Improvement - Gap 8
 * 
 * Features:
 * - Star/unstar visitors
 * - Quick one-tap invite from favorites
 * - Reorder favorites by drag or priority
 * - Search within favorites
 * - Recent visitor suggestions
 * - Sync across devices
 */

import React, { useState, useEffect, useCallback } from 'react';

// Icons
const StarFilledIcon = () => (
  <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const StarOutlineIcon = () => (
  <svg className="w-5 h-5 text-gray-400 hover:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// Favorite visitor card component
const FavoriteCard = ({ 
  visitor, 
  onQuickInvite, 
  onRemove, 
  onEdit,
  isLoading = false 
}) => {
  const [showActions, setShowActions] = useState(false);

  const initials = visitor.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div 
      className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-green-300 dark:hover:border-green-600 transition-all"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Star badge */}
      <div className="absolute -top-2 -right-2">
        <StarFilledIcon />
      </div>

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-lg">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {visitor.name}
          </h4>
          {visitor.relationship && (
            <p className="text-sm text-gray-500 dark:text-gray-300">
              {visitor.relationship}
            </p>
          )}
          {visitor.lastVisit && (
            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-300 mt-1">
              Last visit: {visitor.lastVisit}
            </p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300">
        <span>📊 {visitor.visitCount || 0} visits</span>
        {visitor.phone && <span className="hidden sm:inline">📱 {visitor.phone}</span>}
      </div>

      {/* Actions */}
      <div className={`mt-4 flex gap-2 transition-opacity ${showActions || isLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button
          onClick={() => onQuickInvite(visitor)}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <SendIcon />
              <span>Quick Invite</span>
            </>
          )}
        </button>
        <button
          onClick={() => onRemove(visitor.id)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Remove from favorites"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

// Add favorite modal/form
const AddFavoriteModal = ({ isOpen, onClose, onAdd, suggestions = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim() && !formData.email.trim()) {
      newErrors.phone = 'Phone or email is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onAdd(formData);
    setFormData({ name: '', phone: '', email: '', relationship: '' });
    onClose();
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData({
      name: suggestion.name,
      phone: suggestion.phone || '',
      email: suggestion.email || '',
      relationship: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              ⭐ Add to Favorites
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-300 mb-2">
                Recent visitors you might want to add:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 3).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100 ${
                  errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="+254 712 345 678"
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Relationship (optional)
              </label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Select...</option>
                <option value="Family">Family</option>
                <option value="Friend">Friend</option>
                <option value="Colleague">Colleague</option>
                <option value="Service Provider">Service Provider</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Add to Favorites
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/**
 * Favorite Visitors Component
 */
const FavoriteVisitors = ({ 
  favorites = [],
  recentVisitors = [],
  onAddFavorite,
  onRemoveFavorite,
  onQuickInvite,
  onEditFavorite,
  loading = false,
  maxVisible = 6,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [invitingId, setInvitingId] = useState(null);

  // Filter favorites by search
  const filteredFavorites = favorites.filter(fav =>
    fav.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fav.phone?.includes(searchTerm) ||
    fav.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Limit display unless "show all" is active
  const displayedFavorites = showAll 
    ? filteredFavorites 
    : filteredFavorites.slice(0, maxVisible);

  const handleQuickInvite = async (visitor) => {
    setInvitingId(visitor.id);
    try {
      await onQuickInvite?.(visitor);
    } finally {
      setInvitingId(null);
    }
  };

  const handleAddFavorite = (data) => {
    onAddFavorite?.({
      id: Date.now().toString(),
      ...data,
      visitCount: 0,
      addedAt: new Date().toISOString(),
    });
  };

  // Suggestions for adding favorites (from recent visitors not yet favorited)
  const suggestions = recentVisitors.filter(
    recent => !favorites.some(fav => fav.phone === recent.phone || fav.email === recent.email)
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Favorite Visitors
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-300">
                Quick invite your frequent visitors
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Favorite
          </button>
        </div>

        {/* Search */}
        {favorites.length > 3 && (
          <div className="relative">
            <SearchIcon />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search favorites..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
            />
            {searchTerm && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-300">
                {filteredFavorites.length} found
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          // Loading skeleton
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-xl h-40" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">⭐</span>
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No favorites yet
            </h4>
            <p className="text-gray-500 dark:text-gray-300 mb-6 max-w-sm mx-auto">
              Add your frequent visitors to favorites for quick one-tap invites
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
            >
              Add Your First Favorite
            </button>
          </div>
        ) : filteredFavorites.length === 0 ? (
          // No search results
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-300">
              No favorites match "{searchTerm}"
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-2 text-green-600 hover:text-green-700 text-sm font-medium"
            >
              Clear search
            </button>
          </div>
        ) : (
          // Favorites grid
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedFavorites.map(favorite => (
                <FavoriteCard
                  key={favorite.id}
                  visitor={favorite}
                  onQuickInvite={handleQuickInvite}
                  onRemove={onRemoveFavorite}
                  onEdit={onEditFavorite}
                  isLoading={invitingId === favorite.id}
                />
              ))}
            </div>

            {/* Show more/less */}
            {filteredFavorites.length > maxVisible && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  {showAll 
                    ? 'Show less' 
                    : `Show all ${filteredFavorites.length} favorites`
                  }
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Favorite Modal */}
      <AddFavoriteModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddFavorite}
        suggestions={suggestions}
      />
    </div>
  );
};

export { FavoriteCard, AddFavoriteModal };
export default FavoriteVisitors;
