// Offline-capable Visitor List Component
import React, { useState, useEffect, useContext } from 'react';
import { PWAContext } from './PWAManager';
import offlineService from '../../services/offlineService';
import backgroundSyncService from '../../services/backgroundSyncService';

const OfflineVisitorList = ({ 
  filters = {}, 
  onVisitorAction,
  showOfflineIndicator = true 
}) => {
  const { pwaStatus } = useContext(PWAContext);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingActions, setPendingActions] = useState(new Set());

  useEffect(() => {
    loadVisitors();
  }, [filters, pwaStatus.isOnline]);

  const loadVisitors = async () => {
    setLoading(true);
    setError(null);

    try {
      let visitorData;

      if (pwaStatus.isOnline) {
        // Try to fetch from API first
        try {
          const response = await fetch('/api/visitors?' + new URLSearchParams(filters), {
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            visitorData = data.data?.visitors || data.visitors || [];
            
            // Cache the data for offline use
            await offlineService.cacheVisitors(visitorData);
          } else {
            throw new Error('API request failed');
          }
        } catch (apiError) {
          console.warn('API request failed, falling back to cache:', apiError);
          visitorData = await offlineService.getCachedVisitors(filters);
        }
      } else {
        // Offline mode - use cached data
        visitorData = await offlineService.getCachedVisitors(filters);
      }

      setVisitors(visitorData);
    } catch (err) {
      console.error('Error loading visitors:', err);
      setError('Failed to load visitors');
    } finally {
      setLoading(false);
    }
  };

  const handleVisitorAction = async (visitorId, action, data = {}) => {
    setPendingActions(prev => new Set([...prev, `${visitorId}-${action}`]));

    try {
      if (pwaStatus.isOnline) {
        // Try immediate action
        try {
          const response = await fetch(`/api/visitors/${visitorId}/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
          });

          if (response.ok) {
            // Update local state immediately
            updateVisitorLocally(visitorId, action);
            
            if (onVisitorAction) {
              onVisitorAction(visitorId, action, data);
            }
          } else {
            throw new Error('Action failed');
          }
        } catch (apiError) {
          console.warn('API action failed, queuing for sync:', apiError);
          await queueActionForSync(visitorId, action, data);
        }
      } else {
        // Offline mode - queue for sync
        await queueActionForSync(visitorId, action, data);
      }
    } catch (err) {
      console.error('Error handling visitor action:', err);
      setError(`Failed to ${action} visitor`);
    } finally {
      setPendingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${visitorId}-${action}`);
        return newSet;
      });
    }
  };

  const queueActionForSync = async (visitorId, action, data) => {
    // Queue action for background sync
    await backgroundSyncService.syncVisitorAction(visitorId, action, data);
    
    // Update local state optimistically
    updateVisitorLocally(visitorId, action);
    
    // Show sync indicator
    showSyncNotification(action);
  };

  const updateVisitorLocally = (visitorId, action) => {
    setVisitors(prev => prev.map(visitor => {
      if (visitor.id === visitorId) {
        const statusMap = {
          'approve': 'APPROVED',
          'check-in': 'ON_PREMISE',
          'check-out': 'CHECKED_OUT',
          'deny': 'REVOKED'
        };

        return {
          ...visitor,
          status: statusMap[action] || visitor.status,
          pending_sync: !pwaStatus.isOnline,
          last_action: action,
          last_action_time: new Date().toISOString()
        };
      }
      return visitor;
    }));
  };

  const showSyncNotification = (action) => {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'offline-toast';
    toast.textContent = `${action} queued for sync`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  const getVisitorStatusColor = (visitor) => {
    const colors = {
      'PENDING': 'var(--color-warning, #fbbf24)',
      'APPROVED': 'var(--color-success, #10b981)',
      'ON_PREMISE': 'var(--color-info, #3b82f6)',
      'CHECKED_OUT': 'var(--color-text-tertiary, #6b7280)',
      'REVOKED': 'var(--color-error, #ef4444)'
    };

    return colors[visitor.status] || 'var(--color-text-tertiary, #6b7280)';
  };

  const isActionPending = (visitorId, action) => {
    return pendingActions.has(`${visitorId}-${action}`);
  };

  if (loading) {
    return (
      <div className="offline-visitor-list loading">
        <div className="loading-skeleton">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-item">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="offline-visitor-list error">
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={loadVisitors} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="offline-visitor-list">
      {/* Offline Indicator */}
      {showOfflineIndicator && !pwaStatus.isOnline && (
        <div className="offline-indicator">
          <span className="offline-icon">📡</span>
          <span>Offline Mode - Showing cached data</span>
        </div>
      )}

      {/* Visitor List */}
      <div className="visitor-list">
        {visitors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No visitors found</h3>
            <p>
              {pwaStatus.isOnline 
                ? 'No visitors match your current filters'
                : 'No cached visitor data available'
              }
            </p>
          </div>
        ) : (
          visitors.map(visitor => (
            <div key={visitor.id} className="visitor-item">
              {/* Sync Status Indicator */}
              {visitor.pending_sync && (
                <div className="sync-indicator" title="Pending sync">
                  <div className="sync-spinner"></div>
                </div>
              )}

              {/* Visitor Info */}
              <div className="visitor-info">
                <div className="visitor-avatar">
                  {visitor.name.charAt(0).toUpperCase()}
                </div>
                <div className="visitor-details">
                  <h4 className="visitor-name">{visitor.name}</h4>
                  <p className="visitor-meta">
                    {visitor.phone && <span>{visitor.phone}</span>}
                    {visitor.purpose && <span> • {visitor.purpose}</span>}
                  </p>
                  <div className="visitor-status">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getVisitorStatusColor(visitor) }}
                    >
                      {visitor.status}
                    </span>
                    {visitor.expected_arrival && (
                      <span className="arrival-time">
                        Expected: {new Date(visitor.expected_arrival).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="visitor-actions">
                {visitor.status === 'PENDING' && (
                  <>
                    <button
                      className="action-btn approve-btn"
                      onClick={() => handleVisitorAction(visitor.id, 'approve')}
                      disabled={isActionPending(visitor.id, 'approve')}
                    >
                      {isActionPending(visitor.id, 'approve') ? (
                        <span className="btn-spinner"></span>
                      ) : (
                        '✓'
                      )}
                    </button>
                    <button
                      className="action-btn deny-btn"
                      onClick={() => handleVisitorAction(visitor.id, 'deny')}
                      disabled={isActionPending(visitor.id, 'deny')}
                    >
                      {isActionPending(visitor.id, 'deny') ? (
                        <span className="btn-spinner"></span>
                      ) : (
                        '✕'
                      )}
                    </button>
                  </>
                )}

                {visitor.status === 'APPROVED' && (
                  <button
                    className="action-btn checkin-btn"
                    onClick={() => handleVisitorAction(visitor.id, 'check-in')}
                    disabled={isActionPending(visitor.id, 'check-in')}
                  >
                    {isActionPending(visitor.id, 'check-in') ? (
                      <span className="btn-spinner"></span>
                    ) : (
                      'Check In'
                    )}
                  </button>
                )}

                {visitor.status === 'ON_PREMISE' && (
                  <button
                    className="action-btn checkout-btn"
                    onClick={() => handleVisitorAction(visitor.id, 'check-out')}
                    disabled={isActionPending(visitor.id, 'check-out')}
                  >
                    {isActionPending(visitor.id, 'check-out') ? (
                      <span className="btn-spinner"></span>
                    ) : (
                      'Check Out'
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Styles */}
      <style jsx>{`
        .offline-visitor-list {
          width: 100%;
        }

        .offline-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--color-warning-light, #fef3c7);
          border: 1px solid var(--color-warning, #f59e0b);
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
          color: var(--color-warning-dark, #92400e);
        }

        .offline-icon {
          font-size: 16px;
        }

        .loading-skeleton {
          space-y: 12px;
        }

        .skeleton-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--color-bg-subtle, #f9fafb);
          border-radius: 8px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-avatar {
          width: 48px;
          height: 48px;
          background: var(--color-border-primary, #e5e7eb);
          border-radius: 50%;
        }

        .skeleton-content {
          flex: 1;
        }

        .skeleton-line {
          height: 16px;
          background: var(--color-border-primary, #e5e7eb);
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .skeleton-line.short {
          width: 60%;
        }

        .error-message {
          text-align: center;
          padding: 32px;
          background: var(--color-error-bg, #fef2f2);
          border: 1px solid var(--color-error-light, #fecaca);
          border-radius: 8px;
          color: var(--color-error-dark, #991b1b);
        }

        .error-icon {
          font-size: 32px;
          margin-bottom: 16px;
        }

        .retry-button {
          margin-top: 16px;
          padding: 8px 16px;
          background: var(--color-error, #dc2626);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .retry-button:hover {
          background: var(--color-error-dark, #b91c1c);
        }

        .visitor-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .visitor-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--color-bg-secondary, white);
          border: 1px solid var(--color-border-primary, #e5e7eb);
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }

        .visitor-item:hover {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .sync-indicator {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 16px;
          height: 16px;
        }

        .sync-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--color-border-primary, #e5e7eb);
          border-top: 2px solid var(--color-info, #3b82f6);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .visitor-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .visitor-avatar {
          width: 48px;
          height: 48px;
          background: var(--color-info, #3b82f6);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 18px;
          flex-shrink: 0;
        }

        .visitor-details {
          flex: 1;
          min-width: 0;
        }

        .visitor-name {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: var(--color-text-primary, #111827);
        }

        .visitor-meta {
          font-size: 14px;
          color: var(--color-text-tertiary, #6b7280);
          margin: 0 0 8px 0;
        }

        .visitor-status {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          color: white;
          text-transform: uppercase;
        }

        .arrival-time {
          font-size: 12px;
          color: var(--color-text-tertiary, #6b7280);
        }

        .visitor-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .action-btn {
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 44px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .approve-btn {
          background: var(--color-success, #10b981);
          color: white;
        }

        .approve-btn:hover:not(:disabled) {
          background: var(--color-success-dark, #059669);
        }

        .deny-btn {
          background: var(--color-error, #ef4444);
          color: white;
        }

        .deny-btn:hover:not(:disabled) {
          background: var(--color-error-dark, #dc2626);
        }

        .checkin-btn {
          background: var(--color-info, #3b82f6);
          color: white;
        }

        .checkin-btn:hover:not(:disabled) {
          background: var(--color-info-dark, #2563eb);
        }

        .checkout-btn {
          background: var(--color-text-tertiary, #6b7280);
          color: white;
        }

        .checkout-btn:hover:not(:disabled) {
          background: var(--color-text-secondary, #4b5563);
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: var(--color-text-tertiary, #6b7280);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: var(--color-text-secondary, #374151);
        }

        .empty-state p {
          font-size: 14px;
          margin: 0;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .visitor-item {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .visitor-info {
            gap: 12px;
          }

          .visitor-actions {
            justify-content: center;
          }

          .action-btn {
            flex: 1;
            max-width: 120px;
          }
        }
      `}</style>
    </div>
  );
};

export default OfflineVisitorList;