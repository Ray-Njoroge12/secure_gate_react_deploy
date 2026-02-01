/**
 * Maintenance Notification Manager
 * 
 * Handles system maintenance notifications with estimated completion times
 * Requirement 7.4: System maintenance notifications with estimated completion times
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import errorQueueService from './errorQueueService.js';

// Maintenance types
export const MAINTENANCE_TYPES = {
  SCHEDULED: 'scheduled',
  EMERGENCY: 'emergency',
  ROLLING: 'rolling',
  PARTIAL: 'partial'
};

// Maintenance severity levels
export const MAINTENANCE_SEVERITY = {
  LOW: 'low',        // Minor updates, no service interruption
  MEDIUM: 'medium',  // Some features unavailable
  HIGH: 'high',      // Major service disruption
  CRITICAL: 'critical' // Complete service outage
};

// Maintenance status
export const MAINTENANCE_STATUS = {
  SCHEDULED: 'scheduled',
  STARTING: 'starting',
  IN_PROGRESS: 'in_progress',
  COMPLETING: 'completing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

class MaintenanceNotificationManager {
  constructor() {
    this.activeMaintenances = new Map();
    this.maintenanceHistory = [];
    this.notificationCallbacks = new Set();
    this.statusCheckInterval = null;
    this.config = {
      statusCheckIntervalMs: 30000, // Check status every 30 seconds
      advanceNotificationHours: 24, // Notify 24 hours in advance
      reminderIntervals: [24, 4, 1, 0.5], // Hours before maintenance
      autoRetryAfterMaintenanceMs: 60000 // Retry after 1 minute when maintenance ends
    };
    
    this.initializeStatusMonitoring();
  }

  /**
   * Initialize maintenance status monitoring
   */
  initializeStatusMonitoring() {
    // Check for maintenance status on page load
    this.checkMaintenanceStatus();
    
    // Set up periodic status checks
    this.statusCheckInterval = setInterval(() => {
      this.checkMaintenanceStatus();
    }, this.config.statusCheckIntervalMs);

    // Listen for visibility changes to check status when user returns
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkMaintenanceStatus();
      }
    });

    logger.debug('[MAINTENANCE] Maintenance notification manager initialized');
  }

  /**
   * Check current maintenance status from server
   */
  async checkMaintenanceStatus() {
    try {
      const response = await fetch('/api/system/maintenance-status', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          this.processMaintenanceStatus(data.data);
        }
      } else if (response.status === 503) {
        // Service unavailable - likely in maintenance mode
        const maintenanceInfo = await this.extractMaintenanceInfo(response);
        this.handleMaintenanceMode(maintenanceInfo);
      }
    } catch (error) {
      logger.warn('[MAINTENANCE] Failed to check maintenance status:', error);
      // Don't show error for maintenance status checks
    }
  }

  /**
   * Extract maintenance information from 503 response
   */
  async extractMaintenanceInfo(response) {
    try {
      const data = await response.json();
      return {
        type: MAINTENANCE_TYPES.EMERGENCY,
        severity: MAINTENANCE_SEVERITY.CRITICAL,
        status: MAINTENANCE_STATUS.IN_PROGRESS,
        message: data.message || 'System maintenance in progress',
        estimatedCompletion: data.estimatedCompletion,
        affectedServices: data.affectedServices || ['all'],
        reason: data.reason || 'System maintenance'
      };
    } catch (error) {
      // Fallback maintenance info
      return {
        type: MAINTENANCE_TYPES.EMERGENCY,
        severity: MAINTENANCE_SEVERITY.CRITICAL,
        status: MAINTENANCE_STATUS.IN_PROGRESS,
        message: 'System maintenance in progress',
        estimatedCompletion: null,
        affectedServices: ['all'],
        reason: 'System maintenance'
      };
    }
  }

  /**
   * Process maintenance status from server
   */
  processMaintenanceStatus(statusData) {
    const { scheduled = [], active = [], completed = [] } = statusData;

    // Process scheduled maintenances
    scheduled.forEach(maintenance => {
      this.scheduleMaintenanceNotification(maintenance);
    });

    // Process active maintenances
    active.forEach(maintenance => {
      this.handleActiveMaintenanceUpdate(maintenance);
    });

    // Process completed maintenances
    completed.forEach(maintenance => {
      this.handleMaintenanceCompletion(maintenance);
    });
  }

  /**
   * Schedule maintenance notification
   */
  scheduleMaintenanceNotification(maintenanceInfo) {
    const {
      id,
      type = MAINTENANCE_TYPES.SCHEDULED,
      severity = MAINTENANCE_SEVERITY.MEDIUM,
      scheduledStart,
      estimatedDuration,
      message,
      affectedServices = [],
      reason
    } = maintenanceInfo;

    const maintenanceId = id || uuidv4();
    const startTime = new Date(scheduledStart);
    const now = new Date();
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Store maintenance info
    this.activeMaintenances.set(maintenanceId, {
      ...maintenanceInfo,
      id: maintenanceId,
      type,
      severity,
      status: MAINTENANCE_STATUS.SCHEDULED,
      notificationsSent: []
    });

    // Schedule advance notifications
    this.config.reminderIntervals.forEach(hours => {
      if (hoursUntilStart > hours) {
        const notificationTime = startTime.getTime() - (hours * 60 * 60 * 1000);
        const delay = notificationTime - now.getTime();
        
        if (delay > 0) {
          setTimeout(() => {
            this.sendAdvanceNotification(maintenanceId, hours);
          }, delay);
        }
      }
    });

    logger.info('[MAINTENANCE] Scheduled maintenance notification:', {
      id: maintenanceId,
      scheduledStart,
      hoursUntilStart
    });
  }

  /**
   * Send advance notification for scheduled maintenance
   */
  sendAdvanceNotification(maintenanceId, hoursUntilStart) {
    const maintenance = this.activeMaintenances.get(maintenanceId);
    if (!maintenance || maintenance.notificationsSent.includes(hoursUntilStart)) {
      return;
    }

    const timeText = this.formatTimeUntilMaintenance(hoursUntilStart);
    const estimatedCompletion = this.calculateEstimatedCompletion(
      maintenance.scheduledStart,
      maintenance.estimatedDuration
    );

    const notification = {
      id: `maintenance_advance_${maintenanceId}_${hoursUntilStart}`,
      type: this.getNotificationType(maintenance.severity),
      title: 'Scheduled Maintenance Notice',
      message: `System maintenance is scheduled to begin ${timeText}.`,
      guidance: this.generateMaintenanceGuidance(maintenance, estimatedCompletion),
      details: {
        'Maintenance Type': this.getMaintenanceTypeLabel(maintenance.type),
        'Scheduled Start': new Date(maintenance.scheduledStart).toLocaleString(),
        'Estimated Duration': this.formatDuration(maintenance.estimatedDuration),
        'Estimated Completion': estimatedCompletion ? new Date(estimatedCompletion).toLocaleString() : 'TBD',
        'Affected Services': maintenance.affectedServices.join(', ') || 'All services',
        'Reason': maintenance.reason || 'System improvements'
      },
      persistent: maintenance.severity === MAINTENANCE_SEVERITY.CRITICAL,
      autoClose: maintenance.severity === MAINTENANCE_SEVERITY.LOW,
      autoCloseDelay: 10000,
      actions: this.getMaintenanceActions(maintenance, 'advance')
    };

    errorQueueService.addError(notification);
    
    // Mark notification as sent
    maintenance.notificationsSent.push(hoursUntilStart);
    this.activeMaintenances.set(maintenanceId, maintenance);

    // Notify callbacks
    this.notifyCallbacks('advance_notification', maintenance);

    logger.info('[MAINTENANCE] Sent advance notification:', {
      maintenanceId,
      hoursUntilStart,
      severity: maintenance.severity
    });
  }

  /**
   * Handle active maintenance mode
   */
  handleMaintenanceMode(maintenanceInfo) {
    const {
      id = 'active_maintenance',
      type = MAINTENANCE_TYPES.EMERGENCY,
      severity = MAINTENANCE_SEVERITY.CRITICAL,
      message = 'System maintenance in progress',
      estimatedCompletion,
      affectedServices = ['all'],
      reason = 'System maintenance'
    } = maintenanceInfo;

    // Store active maintenance
    this.activeMaintenances.set(id, {
      ...maintenanceInfo,
      id,
      type,
      severity,
      status: MAINTENANCE_STATUS.IN_PROGRESS,
      startedAt: new Date().toISOString()
    });

    const notification = {
      id: `maintenance_active_${id}`,
      type: 'error',
      title: 'System Maintenance in Progress',
      message,
      guidance: this.generateMaintenanceGuidance(maintenanceInfo, estimatedCompletion),
      details: {
        'Status': 'In Progress',
        'Estimated Completion': estimatedCompletion ? 
          new Date(estimatedCompletion).toLocaleString() : 'To be determined',
        'Affected Services': affectedServices.join(', '),
        'Reason': reason
      },
      persistent: true,
      showRecoveryActions: false,
      autoClose: false,
      actions: this.getMaintenanceActions(maintenanceInfo, 'active')
    };

    errorQueueService.addError(notification);

    // Notify callbacks
    this.notifyCallbacks('maintenance_started', maintenanceInfo);

    logger.warn('[MAINTENANCE] System maintenance mode activated:', {
      id,
      type,
      severity,
      estimatedCompletion
    });

    return id;
  }

  /**
   * Handle active maintenance update
   */
  handleActiveMaintenanceUpdate(maintenanceInfo) {
    const { id, status, estimatedCompletion, progress } = maintenanceInfo;
    
    if (!this.activeMaintenances.has(id)) {
      return;
    }

    const maintenance = this.activeMaintenances.get(id);
    const updatedMaintenance = {
      ...maintenance,
      ...maintenanceInfo,
      lastUpdated: new Date().toISOString()
    };

    this.activeMaintenances.set(id, updatedMaintenance);

    // Update existing notification
    const notification = {
      id: `maintenance_active_${id}`,
      type: 'warning',
      title: 'Maintenance Update',
      message: this.getMaintenanceStatusMessage(status, progress),
      guidance: this.generateMaintenanceGuidance(updatedMaintenance, estimatedCompletion),
      details: {
        'Status': this.getMaintenanceStatusLabel(status),
        'Progress': progress ? `${progress}%` : 'In progress',
        'Estimated Completion': estimatedCompletion ? 
          new Date(estimatedCompletion).toLocaleString() : 'To be determined'
      },
      persistent: true,
      autoClose: false,
      actions: this.getMaintenanceActions(updatedMaintenance, 'update')
    };

    errorQueueService.updateError(notification);

    // Notify callbacks
    this.notifyCallbacks('maintenance_updated', updatedMaintenance);

    logger.info('[MAINTENANCE] Maintenance updated:', {
      id,
      status,
      progress,
      estimatedCompletion
    });
  }

  /**
   * Handle maintenance completion
   */
  handleMaintenanceCompletion(maintenanceInfo) {
    const { id } = maintenanceInfo;
    
    if (!this.activeMaintenances.has(id)) {
      return;
    }

    const maintenance = this.activeMaintenances.get(id);
    const completedMaintenance = {
      ...maintenance,
      ...maintenanceInfo,
      status: MAINTENANCE_STATUS.COMPLETED,
      completedAt: new Date().toISOString()
    };

    // Move to history
    this.maintenanceHistory.push(completedMaintenance);
    this.activeMaintenances.delete(id);

    // Remove active maintenance notification
    errorQueueService.removeError(`maintenance_active_${id}`);

    // Show completion notification
    const notification = {
      id: `maintenance_completed_${id}`,
      type: 'success',
      title: 'Maintenance Completed',
      message: 'System maintenance has been completed successfully.',
      guidance: 'All services are now fully operational. Thank you for your patience.',
      autoClose: true,
      autoCloseDelay: 8000,
      actions: [{
        type: 'refresh',
        label: 'Refresh Page',
        primary: true,
        handler: () => window.location.reload()
      }]
    };

    errorQueueService.addError(notification);

    // Notify callbacks
    this.notifyCallbacks('maintenance_completed', completedMaintenance);

    // Auto-retry failed operations after maintenance
    setTimeout(() => {
      this.triggerPostMaintenanceRetry();
    }, this.config.autoRetryAfterMaintenanceMs);

    logger.info('[MAINTENANCE] Maintenance completed:', {
      id,
      duration: completedMaintenance.completedAt && completedMaintenance.startedAt ?
        new Date(completedMaintenance.completedAt).getTime() - new Date(completedMaintenance.startedAt).getTime() :
        null
    });
  }

  /**
   * Generate maintenance guidance message
   */
  generateMaintenanceGuidance(maintenance, estimatedCompletion) {
    const { type, severity, affectedServices = [] } = maintenance;
    
    let guidance = '';

    if (type === MAINTENANCE_TYPES.EMERGENCY) {
      guidance = 'We are working to resolve an urgent issue. ';
    } else if (type === MAINTENANCE_TYPES.SCHEDULED) {
      guidance = 'This is a planned maintenance to improve system performance. ';
    }

    if (severity === MAINTENANCE_SEVERITY.CRITICAL) {
      guidance += 'All services are temporarily unavailable. ';
    } else if (severity === MAINTENANCE_SEVERITY.HIGH) {
      guidance += 'Most services are temporarily unavailable. ';
    } else if (affectedServices.length > 0 && !affectedServices.includes('all')) {
      guidance += `The following services are affected: ${affectedServices.join(', ')}. `;
    }

    if (estimatedCompletion) {
      const completionTime = new Date(estimatedCompletion);
      const now = new Date();
      const timeRemaining = completionTime.getTime() - now.getTime();
      
      if (timeRemaining > 0) {
        const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
        guidance += `Expected completion: ${completionTime.toLocaleString()} (approximately ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} remaining).`;
      } else {
        guidance += `Maintenance was expected to complete by ${completionTime.toLocaleString()}.`;
      }
    } else {
      guidance += 'We will provide updates as more information becomes available.';
    }

    return guidance;
  }

  /**
   * Get maintenance actions based on context
   */
  getMaintenanceActions(maintenance, context) {
    const actions = [];

    if (context === 'advance') {
      actions.push({
        type: 'info',
        label: 'More Details',
        handler: () => this.showMaintenanceDetails(maintenance.id)
      });
      
      if (maintenance.type === MAINTENANCE_TYPES.SCHEDULED) {
        actions.push({
          type: 'calendar',
          label: 'Add to Calendar',
          handler: () => this.addToCalendar(maintenance)
        });
      }
    } else if (context === 'active') {
      actions.push({
        type: 'refresh',
        label: 'Check Status',
        handler: () => this.checkMaintenanceStatus()
      });
      
      actions.push({
        type: 'info',
        label: 'Status Page',
        handler: () => this.openStatusPage()
      });
    } else if (context === 'update') {
      actions.push({
        type: 'refresh',
        label: 'Refresh',
        handler: () => window.location.reload()
      });
    }

    return actions;
  }

  /**
   * Format time until maintenance
   */
  formatTimeUntilMaintenance(hours) {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (hours < 24) {
      const roundedHours = Math.round(hours);
      return `in ${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.round(hours / 24);
      return `in ${days} day${days !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Format duration
   */
  formatDuration(durationMs) {
    if (!durationMs) return 'TBD';
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} minute${minutes !== 1 ? 's' : ''}` : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Calculate estimated completion time
   */
  calculateEstimatedCompletion(startTime, durationMs) {
    if (!startTime || !durationMs) return null;
    
    const start = new Date(startTime);
    return new Date(start.getTime() + durationMs);
  }

  /**
   * Get notification type based on severity
   */
  getNotificationType(severity) {
    switch (severity) {
      case MAINTENANCE_SEVERITY.CRITICAL:
        return 'error';
      case MAINTENANCE_SEVERITY.HIGH:
        return 'warning';
      case MAINTENANCE_SEVERITY.MEDIUM:
        return 'warning';
      case MAINTENANCE_SEVERITY.LOW:
        return 'info';
      default:
        return 'warning';
    }
  }

  /**
   * Get maintenance type label
   */
  getMaintenanceTypeLabel(type) {
    const labels = {
      [MAINTENANCE_TYPES.SCHEDULED]: 'Scheduled Maintenance',
      [MAINTENANCE_TYPES.EMERGENCY]: 'Emergency Maintenance',
      [MAINTENANCE_TYPES.ROLLING]: 'Rolling Update',
      [MAINTENANCE_TYPES.PARTIAL]: 'Partial Maintenance'
    };
    
    return labels[type] || 'System Maintenance';
  }

  /**
   * Get maintenance status label
   */
  getMaintenanceStatusLabel(status) {
    const labels = {
      [MAINTENANCE_STATUS.SCHEDULED]: 'Scheduled',
      [MAINTENANCE_STATUS.STARTING]: 'Starting',
      [MAINTENANCE_STATUS.IN_PROGRESS]: 'In Progress',
      [MAINTENANCE_STATUS.COMPLETING]: 'Completing',
      [MAINTENANCE_STATUS.COMPLETED]: 'Completed',
      [MAINTENANCE_STATUS.CANCELLED]: 'Cancelled'
    };
    
    return labels[status] || 'Unknown';
  }

  /**
   * Get maintenance status message
   */
  getMaintenanceStatusMessage(status, progress) {
    switch (status) {
      case MAINTENANCE_STATUS.STARTING:
        return 'Maintenance is beginning. Some services may become unavailable.';
      case MAINTENANCE_STATUS.IN_PROGRESS:
        return progress ? 
          `Maintenance is ${progress}% complete.` : 
          'Maintenance is in progress.';
      case MAINTENANCE_STATUS.COMPLETING:
        return 'Maintenance is nearly complete. Services are being restored.';
      default:
        return 'Maintenance status updated.';
    }
  }

  /**
   * Show maintenance details
   */
  showMaintenanceDetails(maintenanceId) {
    const maintenance = this.activeMaintenances.get(maintenanceId);
    if (!maintenance) return;

    // Show detailed maintenance information
    const detailsModal = {
      id: `maintenance_details_${maintenanceId}`,
      type: 'info',
      title: 'Maintenance Details',
      message: maintenance.reason || 'System maintenance',
      details: {
        'Type': this.getMaintenanceTypeLabel(maintenance.type),
        'Severity': maintenance.severity.toUpperCase(),
        'Scheduled Start': maintenance.scheduledStart ? 
          new Date(maintenance.scheduledStart).toLocaleString() : 'N/A',
        'Estimated Duration': this.formatDuration(maintenance.estimatedDuration),
        'Affected Services': maintenance.affectedServices?.join(', ') || 'All services',
        'Reason': maintenance.reason || 'System improvements'
      },
      persistent: false,
      autoClose: false
    };

    errorQueueService.addError(detailsModal);
  }

  /**
   * Add maintenance to calendar
   */
  addToCalendar(maintenance) {
    const startDate = new Date(maintenance.scheduledStart);
    const endDate = maintenance.estimatedDuration ? 
      new Date(startDate.getTime() + maintenance.estimatedDuration) : 
      new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

    const calendarEvent = {
      title: `System Maintenance - ${this.getMaintenanceTypeLabel(maintenance.type)}`,
      start: startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
      end: endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
      description: maintenance.reason || 'System maintenance',
      location: 'Secure Gate Access System'
    };

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarEvent.title)}&dates=${calendarEvent.start}/${calendarEvent.end}&details=${encodeURIComponent(calendarEvent.description)}&location=${encodeURIComponent(calendarEvent.location)}`;
    
    window.open(calendarUrl, '_blank');
  }

  /**
   * Open status page
   */
  openStatusPage() {
    // Open external status page or internal status dashboard
    const statusPageUrl = '/system/status';
    window.open(statusPageUrl, '_blank');
  }

  /**
   * Trigger post-maintenance retry
   */
  triggerPostMaintenanceRetry() {
    // Notify other services that maintenance is complete and they can retry
    window.dispatchEvent(new CustomEvent('maintenanceCompleted', {
      detail: { timestamp: new Date().toISOString() }
    }));

    logger.info('[MAINTENANCE] Post-maintenance retry triggered');
  }

  /**
   * Register notification callback
   */
  onMaintenanceNotification(callback) {
    this.notificationCallbacks.add(callback);
    
    return () => {
      this.notificationCallbacks.delete(callback);
    };
  }

  /**
   * Notify all registered callbacks
   */
  notifyCallbacks(event, data) {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        logger.error('[MAINTENANCE] Callback error:', error);
      }
    });
  }

  /**
   * Get active maintenances
   */
  getActiveMaintenances() {
    return Array.from(this.activeMaintenances.values());
  }

  /**
   * Get maintenance history
   */
  getMaintenanceHistory() {
    return [...this.maintenanceHistory];
  }

  /**
   * Check if system is in maintenance mode
   */
  isInMaintenanceMode() {
    return Array.from(this.activeMaintenances.values()).some(
      maintenance => maintenance.status === MAINTENANCE_STATUS.IN_PROGRESS &&
                    maintenance.severity === MAINTENANCE_SEVERITY.CRITICAL
    );
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
    
    this.notificationCallbacks.clear();
    this.activeMaintenances.clear();
    
    logger.debug('[MAINTENANCE] Maintenance notification manager destroyed');
  }
}

// Create singleton instance
const maintenanceNotificationManager = new MaintenanceNotificationManager();

export default maintenanceNotificationManager;