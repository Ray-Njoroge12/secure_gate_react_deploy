/**
 * Chaos Engineering Routes for Secure Gate Access Control System
 * 
 * Provides API endpoints for chaos engineering tests and reporting
 */

import express from 'express';
import chaosService from '../services/chaosService.js';
import networkChaosService from '../services/networkChaosService.js';
import resourceStressService from '../services/resourceStressService.js';
import applicationFaultService from '../services/applicationFaultService.js';
import chaosReportingService from '../services/chaosReportingService.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import loggingService from '../utils/loggingService.js';

const router = express.Router();

/**
 * @route POST /api/chaos/service-failure
 * @description Execute service failure injection test
 * @access Admin
 */
router.post('/service-failure', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { service, method, duration } = req.body;
    
    if (!service || !method) {
      return res.status(400).json({ 
        success: false, 
        message: 'Service and method are required' 
      });
    }
    
    const experiment = await chaosService.executeServiceFailureInjection(service, method, duration);
    
    res.status(200).json({
      success: true,
      message: 'Service failure injection test started',
      data: {
        experiment_id: experiment.id,
        service: experiment.service,
        method: experiment.method,
        status: experiment.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Service failure injection failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute service failure injection',
      error: error.message
    });
  }
});

/**
 * @route POST /api/chaos/network-latency
 * @description Execute network latency injection test
 * @access Admin
 */
router.post('/network-latency', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { region, latency, duration } = req.body;
    
    if (!region || !latency) {
      return res.status(400).json({ 
        success: false, 
        message: 'Region and latency are required' 
      });
    }
    
    const experiment = await networkChaosService.executeLatencyInjection(region, latency, duration);
    
    res.status(200).json({
      success: true,
      message: 'Network latency injection test started',
      data: {
        experiment_id: experiment.id,
        region: experiment.region,
        latency: experiment.latency,
        status: experiment.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Network latency injection failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute network latency injection',
      error: error.message
    });
  }
});

/**
 * @route POST /api/chaos/network-packet-loss
 * @description Execute network packet loss injection test
 * @access Admin
 */
router.post('/network-packet-loss', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { region, packet_loss, duration } = req.body;
    
    if (!region || !packet_loss) {
      return res.status(400).json({ 
        success: false, 
        message: 'Region and packet_loss are required' 
      });
    }
    
    const experiment = await networkChaosService.executePacketLossInjection(region, packet_loss, duration);
    
    res.status(200).json({
      success: true,
      message: 'Network packet loss injection test started',
      data: {
        experiment_id: experiment.id,
        region: experiment.region,
        packet_loss: experiment.packet_loss,
        status: experiment.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Network packet loss injection failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute network packet loss injection',
      error: error.message
    });
  }
});

/**
 * @route POST /api/chaos/network-connectivity
 * @description Execute network connectivity cut test
 * @access Admin
 */
router.post('/network-connectivity', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { region, duration } = req.body;
    
    if (!region) {
      return res.status(400).json({ 
        success: false, 
        message: 'Region is required' 
      });
    }
    
    const experiment = await networkChaosService.executeConnectivityCut(region, duration);
    
    res.status(200).json({
      success: true,
      message: 'Network connectivity cut test started',
      data: {
        experiment_id: experiment.id,
        region: experiment.region,
        status: experiment.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Network connectivity cut failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute network connectivity cut',
      error: error.message
    });
  }
});

/**
 * @route POST /api/chaos/cpu-stress
 * @description Execute CPU stress test
 * @access Admin
 */
router.post('/cpu-stress', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { intensity, duration } = req.body;
    
    if (!intensity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Intensity is required' 
      });
    }
    
    const experiment = await resourceStressService.executeCpuStressTest(intensity, duration);
    
    res.status(200).json({
      success: true,
      message: 'CPU stress test started',
      data: {
        experiment_id: experiment.id,
        resource: experiment.resource,
        intensity: experiment.intensity,
        status: experiment.status
      }
    });
    
  } catch (error) {
    loggingService.logError('CPU stress test failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute CPU stress test',
      error: error.message
    });
  }
});

/**
 * @route POST /api/chaos/memory-stress
 * @description Execute memory stress test
 * @access Admin
 */
router.post('/memory-stress', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { intensity, duration } = req.body;
    
    if (!intensity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Intensity is required' 
      });
    }
    
    const experiment = await resourceStressService.executeMemoryStressTest(intensity, duration);
    
    res.status(200).json({
      success: true,
      message: 'Memory stress test started',
      data: {
        experiment_id: experiment.id,
        resource: experiment.resource,
        intensity: experiment.intensity,
        status: experiment.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Memory stress test failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute memory stress test',
      error: error.message
    });
  }
});

/**
 * @route POST /api/chaos/disk-stress
 * @description Execute disk I/O stress test
 * @access Admin
 */
router.post('/disk-stress', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { intensity, duration } = req.body;
    
    if (!intensity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Intensity is required' 
      });
    }
    
    const experiment = await resourceStressService.executeDiskStressTest(intensity, duration);
    
    res.status(200).json({
      success: true,
      message: 'Disk stress test started',
      data: {
        experiment_id: experiment.id,
        resource: experiment.resource,
        intensity: experiment.intensity,
        status: experiment.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Disk stress test failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute disk stress test',
      error: error.message
    });
  }
});

/**
 * @route POST /api/chaos/api-throttling
 * @description Execute API throttling test
 * @access Admin
 */
router.post('/api-throttling', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { service, throttle_rate, duration } = req.body;
    
    if (!service || !throttle_rate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Service and throttle_rate are required' 
      });
    }
    
    const experiment = await applicationFaultService.executeApiThrottling(service, throttle_rate, duration);
    
    res.status(200).json({
      success: true,
      message: 'API throttling test started',
      data: {
        experiment_id: experiment.id,
        service: experiment.service,
        throttle_rate: experiment.throttle_rate,
        status: experiment.status
      }
    });
    
  } catch (error) {
    loggingService.logError('API throttling test failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute API throttling test',
      error: error.message
    });
  }
});

/**
 * @route POST /api/chaos/request-dropping
 * @description Execute request dropping test
 * @access Admin
 */
router.post('/request-dropping', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { service, drop_rate, duration } = req.body;
    
    if (!service || !drop_rate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Service and drop_rate are required' 
      });
    }
    
    const experiment = await applicationFaultService.executeRequestDropping(service, drop_rate, duration);
    
    res.status(200).json({
      success: true,
      message: 'Request dropping test started',
      data: {
        experiment_id: experiment.id,
        service: experiment.service,
        drop_rate: experiment.drop_rate,
        status: experiment.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Request dropping test failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute request dropping test',
      error: error.message
    });
  }
});

/**
 * @route POST /api/chaos/malformed-data
 * @description Execute malformed data injection test
 * @access Admin
 */
router.post('/malformed-data', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { service, data_type, duration } = req.body;
    
    if (!service || !data_type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Service and data_type are required' 
      });
    }
    
    const experiment = await applicationFaultService.executeMalformedDataInjection(service, data_type, duration);
    
    res.status(200).json({
      success: true,
      message: 'Malformed data injection test started',
      data: {
        experiment_id: experiment.id,
        service: experiment.service,
        data_type: experiment.data_type,
        status: experiment.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Malformed data injection test failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute malformed data injection test',
      error: error.message
    });
  }
});

/**
 * @route GET /api/chaos/experiments
 * @description Get all active experiments
 * @access Admin
 */
router.get('/experiments', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type } = req.query;
    
    let experiments = [];
    
    if (!type || type === 'service') {
      experiments = experiments.concat(chaosService.getActiveExperiments());
    }
    
    if (!type || type === 'network') {
      experiments = experiments.concat(networkChaosService.getActiveExperiments());
    }
    
    if (!type || type === 'resource') {
      experiments = experiments.concat(resourceStressService.getActiveExperiments());
    }
    
    if (!type || type === 'application') {
      experiments = experiments.concat(applicationFaultService.getActiveExperiments());
    }
    
    res.status(200).json({
      success: true,
      data: experiments
    });
    
  } catch (error) {
    loggingService.logError('Failed to get experiments', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get experiments',
      error: error.message
    });
  }
});

/**
 * @route GET /api/chaos/experiments/history
 * @description Get experiment history
 * @access Admin
 */
router.get('/experiments/history', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type, limit } = req.query;
    
    let history = [];
    
    if (!type || type === 'service') {
      history = history.concat(chaosService.getExperimentHistory());
    }
    
    if (!type || type === 'network') {
      history = history.concat(networkChaosService.getExperimentHistory());
    }
    
    if (!type || type === 'resource') {
      history = history.concat(resourceStressService.getExperimentHistory());
    }
    
    if (!type || type === 'application') {
      history = history.concat(applicationFaultService.getExperimentHistory());
    }
    
    // Sort by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp || b.startTime) - new Date(a.timestamp || a.startTime));
    
    // Apply limit
    if (limit) {
      history = history.slice(0, parseInt(limit));
    }
    
    res.status(200).json({
      success: true,
      data: history
    });
    
  } catch (error) {
    loggingService.logError('Failed to get experiment history', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get experiment history',
      error: error.message
    });
  }
});

/**
 * @route GET /api/chaos/metrics
 * @description Get chaos engineering metrics
 * @access Admin
 */
router.get('/metrics', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { timeframe } = req.query;
    
    const metrics = {
      service: chaosService.getStatus(),
      network: networkChaosService.getStatus(),
      resource: resourceStressService.getStatus(),
      application: applicationFaultService.getStatus(),
      reporting: chaosReportingService.getStatus()
    };
    
    res.status(200).json({
      success: true,
      data: metrics
    });
    
  } catch (error) {
    loggingService.logError('Failed to get metrics', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get metrics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/chaos/reports
 * @description Get chaos engineering reports
 * @access Admin
 */
router.get('/reports', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type, framework } = req.query;
    
    const reports = chaosReportingService.getTestResults();
    
    let filteredReports = reports;
    
    if (type) {
      filteredReports = filteredReports.filter(r => r.test_type === type);
    }
    
    if (framework) {
      filteredReports = filteredReports.filter(r => r.compliance[framework]);
    }
    
    res.status(200).json({
      success: true,
      data: filteredReports
    });
    
  } catch (error) {
    loggingService.logError('Failed to get reports', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reports',
      error: error.message
    });
  }
});

/**
 * @route POST /api/chaos/reports/generate
 * @description Generate chaos engineering report
 * @access Admin
 */
router.post('/reports/generate', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type, framework, period } = req.body;
    
    let report;
    
    if (type === 'compliance' && framework === 'kenya_dpa') {
      report = await chaosReportingService.generateKenyaDPAReport();
    } else if (type === 'compliance' && framework === 'iso27001') {
      report = await chaosReportingService.generateISO27001Report();
    } else {
      report = await chaosReportingService.generateHourlyReport();
    }
    
    res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      data: report
    });
    
  } catch (error) {
    loggingService.logError('Failed to generate report', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
});

/**
 * @route GET /api/chaos/status
 * @description Get chaos engineering service status
 * @access Admin
 */
router.get('/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const status = {
      service: chaosService.getStatus(),
      network: networkChaosService.getStatus(),
      resource: resourceStressService.getStatus(),
      application: applicationFaultService.getStatus(),
      reporting: chaosReportingService.getStatus()
    };
    
    res.status(200).json({
      success: true,
      data: status
    });
    
  } catch (error) {
    loggingService.logError('Failed to get status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get status',
      error: error.message
    });
  }
});

export default router;
