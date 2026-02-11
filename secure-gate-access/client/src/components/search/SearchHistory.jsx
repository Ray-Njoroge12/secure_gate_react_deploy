/**
 * Search History Component
 * Displays recent searches and popular queries
 */

import React, { useState, useEffect } from 'react';
import { searchService } from '../../services/searchService';
import './SearchHistory.css';
import Button from '../ui/Button';

const SearchHistory = ({
  onHistorySelect,
  maxItems = 10,
  className = ''
}) => {
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularQueries, setPopularQueries] = useState([]);
  const [activeTab, setActiveTab] = useState('recent');

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = () => {
    const recent = searchService.getRecentSearches(maxItems);
    const popular = searchService.getPopularQueries(maxItems);
    
    setRecentSearches(recent);
    setPopularQueries(popular);
  };

  const handleHistoryClick = (query) => {
    if (onHistorySelect) {
      onHistorySelect(query);
    }
  };

  const clearHistory = () => {
    searchService.clearHistory();
    setRecentSearches([]);
  };

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (recentSearches.length === 0 && popularQueries.length === 0) {
    return (
      <div className={`search-history empty ${className}`}>
        <div className="history-empty">
          <div className="empty-icon">🕒</div>
          <div className="empty-message">No search history yet</div>
          <div className="empty-suggestion">
            Start searching to see your recent queries here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`search-history ${className}`}>
      <div className="history-header">
        <div className="history-tabs">
          <Button
            className={`history-tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            Recent
          </Button>
          <Button
            className={`history-tab ${activeTab === 'popular' ? 'active' : ''}`}
            onClick={() => setActiveTab('popular')}
          >
            Popular
          </Button>
        </div>
        
        {activeTab === 'recent' && recentSearches.length > 0 && (
          <Button
            onClick={clearHistory}
            className="clear-history-btn"
            title="Clear search history"
          >
            Clear
          </Button>
        )}
      </div>

      <div className="history-content">
        {activeTab === 'recent' && (
          <div className="recent-searches">
            {recentSearches.length === 0 ? (
              <div className="history-empty-state">
                <span>No recent searches</span>
              </div>
            ) : (
              <div className="history-list">
                {recentSearches.map((search, index) => (
                  <div role="button" tabIndex={0}
                    key={`recent-${index}`}
                    className="history-item"
                    onClick={() => handleHistoryClick(search.text)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleHistoryClick(search.text);
                      }
                    }}
                  >
                    <div className="history-icon">🕒</div>
                    <div className="history-content">
                      <div className="history-text">{search.text}</div>
                      <div className="history-time">
                        {formatTimeAgo(search.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'popular' && (
          <div className="popular-searches">
            {popularQueries.length === 0 ? (
              <div className="history-empty-state">
                <span>No popular searches yet</span>
              </div>
            ) : (
              <div className="history-list">
                {popularQueries.map((query, index) => (
                  <div role="button" tabIndex={0}
                    key={`popular-${index}`}
                    className="history-item"
                    onClick={() => handleHistoryClick(query.text)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleHistoryClick(query.text);
                      }
                    }}
                  >
                    <div className="history-icon">🔥</div>
                    <div className="history-content">
                      <div className="history-text">{query.text}</div>
                      <div className="history-count">
                        {query.count} searches
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchHistory;