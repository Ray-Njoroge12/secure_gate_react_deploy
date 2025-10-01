/**
 * Chaos Engineering Job for Secure Gate Access Control System
 * 
 * Provides scheduled chaos engineering tests and maintenance
 */

import cron from 'node-cron';
import chaosService from '../services/chaosService.js';
import networkChaosService from '../services/networkChaosService.js';
import resourceStressService from '../services/resourceStressService.js';
import applicationFaultService from '../services/applicationFaultService.js';
import chaosReportingService from '../services/chaosReportingService.js';
import loggingService from '../utils/loggingService.js';

const scheduleChaosJobs = () => {
  // Schedule daily service failure injection tests
  cron.schedule('0 2 * * *', async () => {
    try {
      loggingService.logInfo('Running daily service failure injection tests...');
      
      // Test PostgreSQL failure
      await chaosService.executeServiceFailureInjection('postgres', 'terminate_pods', 300000);
      
      // Test Redis failure
      await chaosService.executeServiceFailureInjection('redis', 'introduce_latency', 180000);
      
      // Test Vault failure
      await chaosService.executeServiceFailureInjection('vault', 'disable_unsealing', 240000);
      
      loggingService.logInfo('Daily service failure injection tests completed');
      
    } catch (error) {
      loggingService.logError('Daily service failure injection tests failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule weekly network disruption tests
  cron.schedule('0 3 * * 1', async () => {
    try {
      loggingService.logInfo('Running weekly network disruption tests...');
      
      // Test latency injection
      await networkChaosService.executeLatencyInjection('primary', 300, 600000);
      
      // Test packet loss injection
      await networkChaosService.executePacketLossInjection('primary', 5, 480000);
      
      // Test connectivity cut
      await networkChaosService.executeConnectivityCut('secondary', 300000);
      
      loggingService.logInfo('Weekly network disruption tests completed');
      
    } catch (error) {
      loggingService.logError('Weekly network disruption tests failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule bi-weekly resource stress tests
  cron.schedule('0 4 1,15 * *', async () => {
    try {
      loggingService.logInfo('Running bi-weekly resource stress tests...');
      
      // Test CPU stress
      await resourceStressService.executeCpuStressTest(80, 1200000);
      
      // Test memory stress
      await resourceStressService.executeMemoryStressTest(70, 1200000);
      
      // Test disk stress
      await resourceStressService.executeDiskStressTest(60, 1200000);
      
      loggingService.logInfo('Bi-weekly resource stress tests completed');
      
    } catch (error) {
      loggingService.logError('Bi-weekly resource stress tests failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule monthly application fault injection tests
  cron.schedule('0 5 1 * *', async () => {
    try {
      loggingService.logInfo('Running monthly application fault injection tests...');
      
      // Test API throttling
      await applicationFaultService.executeApiThrottling('otp', 50, 900000);
      await applicationFaultService.executeApiThrottling('qr', 60, 900000);
      await applicationFaultService.executeApiThrottling('api', 70, 900000);
      
      // Test request dropping
      await applicationFaultService.executeRequestDropping('otp', 10, 900000);
      await applicationFaultService.executeRequestDropping('qr', 15, 900000);
      
      // Test malformed data injection
      await applicationFaultService.executeMalformedDataInjection('api', 'visitor_record', 900000);
      await applicationFaultService.executeMalformedDataInjection('otp', 'otp_request', 900000);
      
      loggingService.logInfo('Monthly application fault injection tests completed');
      
    } catch (error) {
      loggingService.logError('Monthly application fault injection tests failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule compliance report generation
  cron.schedule('0 6 1 * *', async () => {
    try {
      loggingService.logInfo('Generating monthly compliance reports...');
      
      // Generate Kenya DPA report
      await chaosReportingService.generateKenyaDPAReport();
      
      // Generate ISO 27001 report
      await chaosReportingService.generateISO27001Report();
      
      loggingService.logInfo('Monthly compliance reports generated');
      
    } catch (error) {
      loggingService.logError('Monthly compliance report generation failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule chaos engineering health checks
  cron.schedule('*/30 * * * *', async () => {
    try {
      // Check chaos service health
      const chaosStatus = chaosService.getStatus();
      if (!chaosStatus.initialized) {
        loggingService.logError('Chaos service not initialized');
      }
      
      // Check network chaos service health
      const networkStatus = networkChaosService.getStatus();
      if (!networkStatus.initialized) {
        loggingService.logError('Network chaos service not initialized');
      }
      
      // Check resource stress service health
      const resourceStatus = resourceStressService.getStatus();
      if (!resourceStatus.initialized) {
        loggingService.logError('Resource stress service not initialized');
      }
      
      // Check application fault service health
      const applicationStatus = applicationFaultService.getStatus();
      if (!applicationStatus.initialized) {
        loggingService.logError('Application fault service not initialized');
      }
      
      // Check reporting service health
      const reportingStatus = chaosReportingService.getStatus();
      if (!reportingStatus.initialized) {
        loggingService.logError('Chaos reporting service not initialized');
      }
      
    } catch (error) {
      loggingService.logError('Chaos engineering health check failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule experiment cleanup
  cron.schedule('0 1 * * *', async () => {
    try {
      loggingService.logInfo('Running chaos experiment cleanup...');
      
      // Clean up old experiments (older than 30 days)
      const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      // Clean up service experiments
      const serviceHistory = chaosService.getExperimentHistory();
      const recentServiceHistory = serviceHistory.filter(e => 
        new Date(e.timestamp || e.startTime).getTime() > cutoffTime
      );
      
      // Clean up network experiments
      const networkHistory = networkChaosService.getExperimentHistory();
      const recentNetworkHistory = networkHistory.filter(e => 
        new Date(e.timestamp || e.startTime).getTime() > cutoffTime
      );
      
      // Clean up resource experiments
      const resourceHistory = resourceStressService.getExperimentHistory();
      const recentResourceHistory = resourceHistory.filter(e => 
        new Date(e.timestamp || e.startTime).getTime() > cutoffTime
      );
      
      // Clean up application experiments
      const applicationHistory = applicationFaultService.getExperimentHistory();
      const recentApplicationHistory = applicationHistory.filter(e => 
        new Date(e.timestamp || e.startTime).getTime() > cutoffTime
      );
      
      loggingService.logInfo('Chaos experiment cleanup completed', {
        service_experiments: serviceHistory.length - recentServiceHistory.length,
        network_experiments: networkHistory.length - recentNetworkHistory.length,
        resource_experiments: resourceHistory.length - recentResourceHistory.length,
        application_experiments: applicationHistory.length - recentApplicationHistory.length
      });
      
    } catch (error) {
      loggingService.logError('Chaos experiment cleanup failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule metrics collection
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Collect chaos engineering metrics
      const metrics = {
        timestamp: new Date().toISOString(),
        service: chaosService.getStatus(),
        network: networkChaosService.getStatus(),
        resource: resourceStressService.getStatus(),
        application: applicationFaultService.getStatus(),
        reporting: chaosReportingService.getStatus()
      };
      
      // Log metrics
      loggingService.logInfo('Chaos engineering metrics collected', metrics);
      
    } catch (error) {
      loggingService.logError('Chaos engineering metrics collection failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  loggingService.logInfo('Chaos engineering jobs scheduled successfully');
};

export { scheduleChaosJobs };
