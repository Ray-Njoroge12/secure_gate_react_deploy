/**
 * Penetration Testing Job for Secure Gate Access Control System
 * 
 * Provides scheduled penetration testing and compliance reporting
 */

import cron from 'node-cron';
import penetrationTestingService from '../services/penetrationTestingService.js';
import internalThreatService from '../services/internalThreatService.js';
import apiMobileSecurityService from '../services/apiMobileSecurityService.js';
import penetrationComplianceService from '../services/penetrationComplianceService.js';
import loggingService from '../utils/loggingService.js';

const schedulePenetrationJobs = () => {
  // Schedule daily external attack simulations
  cron.schedule('0 1 * * *', async () => {
    try {
      loggingService.logInfo('Running daily external attack simulations...');
      
      // Test port scanning
      await penetrationTestingService.executeExternalAttackSimulation('postgres-primary:5432', 'port_scanning', 1800000);
      
      // Test firewall bypass
      await penetrationTestingService.executeExternalAttackSimulation('redis-master:6379', 'firewall_bypass', 1800000);
      
      // Test SSL/TLS exploit
      await penetrationTestingService.executeExternalAttackSimulation('vault-server:8200', 'ssl_tls_exploit', 1800000);
      
      loggingService.logInfo('Daily external attack simulations completed');
      
    } catch (error) {
      loggingService.logError('Daily external attack simulations failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule daily web application security testing
  cron.schedule('0 2 * * *', async () => {
    try {
      loggingService.logInfo('Running daily web application security testing...');
      
      // Test SQL injection
      await penetrationTestingService.executeWebAppSecurityTesting('/api/auth/login', 'sql_injection', 1800000);
      
      // Test XSS
      await penetrationTestingService.executeWebAppSecurityTesting('/api/visitors', 'xss_attack', 1800000);
      
      // Test CSRF
      await penetrationTestingService.executeWebAppSecurityTesting('/api/access', 'csrf_attack', 1800000);
      
      // Test broken authentication
      await penetrationTestingService.executeWebAppSecurityTesting('/api/logs', 'broken_authentication', 1800000);
      
      loggingService.logInfo('Daily web application security testing completed');
      
    } catch (error) {
      loggingService.logError('Daily web application security testing failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule weekly internal threat simulations
  cron.schedule('0 3 * * 1', async () => {
    try {
      loggingService.logInfo('Running weekly internal threat simulations...');
      
      // Test privilege escalation
      await internalThreatService.executePrivilegeEscalation('admin', 'sudo_abuse', 3600000);
      await internalThreatService.executePrivilegeEscalation('user', 'suid_exploitation', 3600000);
      
      // Test lateral movement
      await internalThreatService.executeLateralMovement('web-server', 'db-server', 'credential_reuse', 3600000);
      await internalThreatService.executeLateralMovement('db-server', 'vault-server', 'pass_the_hash', 3600000);
      
      // Test data exfiltration
      await internalThreatService.executeDataExfiltration('admin', 'visitor_data', 'database_dump', 3600000);
      await internalThreatService.executeDataExfiltration('user', 'access_logs', 'file_transfer', 3600000);
      
      loggingService.logInfo('Weekly internal threat simulations completed');
      
    } catch (error) {
      loggingService.logError('Weekly internal threat simulations failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule bi-weekly API and mobile security testing
  cron.schedule('0 4 1,15 * *', async () => {
    try {
      loggingService.logInfo('Running bi-weekly API and mobile security testing...');
      
      // Test MITM attacks
      await apiMobileSecurityService.executeMITMAttack('mobile-app', 'ssl_stripping', 1800000);
      await apiMobileSecurityService.executeMITMAttack('api-gateway', 'certificate_pinning_bypass', 1800000);
      
      // Test replay attacks
      await apiMobileSecurityService.executeReplayAttack('otp-service', 'otp_replay', 1800000);
      await apiMobileSecurityService.executeReplayAttack('qr-service', 'qr_replay', 1800000);
      
      // Test rate-limit bypass
      await apiMobileSecurityService.executeRateLimitBypass('api-gateway', 'ip_rotation', 1800000);
      await apiMobileSecurityService.executeRateLimitBypass('api-gateway', 'distributed_requests', 1800000);
      
      loggingService.logInfo('Bi-weekly API and mobile security testing completed');
      
    } catch (error) {
      loggingService.logError('Bi-weekly API and mobile security testing failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule monthly compliance report generation
  cron.schedule('0 5 1 * *', async () => {
    try {
      loggingService.logInfo('Generating monthly compliance reports...');
      
      // Generate Kenya DPA report
      await penetrationComplianceService.generateComplianceReport('kenya_dpa');
      
      // Generate ISO 27001 report
      await penetrationComplianceService.generateComplianceReport('iso27001');
      
      // Generate OWASP Top 10 report
      await penetrationComplianceService.generateComplianceReport('owasp_top_10');
      
      // Generate GDPR report
      await penetrationComplianceService.generateComplianceReport('gdpr');
      
      loggingService.logInfo('Monthly compliance reports generated');
      
    } catch (error) {
      loggingService.logError('Monthly compliance report generation failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule penetration testing health checks
  cron.schedule('*/30 * * * *', async () => {
    try {
      // Check penetration testing service health
      const penetrationStatus = penetrationTestingService.getStatus();
      if (!penetrationStatus.initialized) {
        loggingService.logError('Penetration testing service not initialized');
      }
      
      // Check internal threat service health
      const internalStatus = internalThreatService.getStatus();
      if (!internalStatus.initialized) {
        loggingService.logError('Internal threat service not initialized');
      }
      
      // Check API mobile security service health
      const apiStatus = apiMobileSecurityService.getStatus();
      if (!apiStatus.initialized) {
        loggingService.logError('API mobile security service not initialized');
      }
      
      // Check compliance service health
      const complianceStatus = penetrationComplianceService.getStatus();
      if (!complianceStatus.initialized) {
        loggingService.logError('Penetration compliance service not initialized');
      }
      
    } catch (error) {
      loggingService.logError('Penetration testing health check failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule vulnerability cleanup
  cron.schedule('0 0 * * *', async () => {
    try {
      loggingService.logInfo('Running penetration testing cleanup...');
      
      // Clean up old tests (older than 90 days)
      const cutoffTime = Date.now() - (90 * 24 * 60 * 60 * 1000);
      
      // Clean up penetration tests
      const penetrationHistory = penetrationTestingService.getTestHistory();
      const recentPenetrationHistory = penetrationHistory.filter(t => 
        new Date(t.timestamp || t.startTime).getTime() > cutoffTime
      );
      
      // Clean up internal threats
      const internalHistory = internalThreatService.getThreatHistory();
      const recentInternalHistory = internalHistory.filter(t => 
        new Date(t.timestamp || t.startTime).getTime() > cutoffTime
      );
      
      // Clean up API attacks
      const apiHistory = apiMobileSecurityService.getAttackHistory();
      const recentApiHistory = apiHistory.filter(t => 
        new Date(t.timestamp || t.startTime).getTime() > cutoffTime
      );
      
      loggingService.logInfo('Penetration testing cleanup completed', {
        penetration_tests: penetrationHistory.length - recentPenetrationHistory.length,
        internal_threats: internalHistory.length - recentInternalHistory.length,
        api_attacks: apiHistory.length - recentApiHistory.length
      });
      
    } catch (error) {
      loggingService.logError('Penetration testing cleanup failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule compliance metrics collection
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Collect compliance metrics
      const metrics = {
        timestamp: new Date().toISOString(),
        penetration: penetrationTestingService.getStatus(),
        internal: internalThreatService.getStatus(),
        api: apiMobileSecurityService.getStatus(),
        compliance: penetrationComplianceService.getStatus()
      };
      
      // Log metrics
      loggingService.logInfo('Penetration testing metrics collected', metrics);
      
    } catch (error) {
      loggingService.logError('Penetration testing metrics collection failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  loggingService.logInfo('Penetration testing jobs scheduled successfully');
};

export { schedulePenetrationJobs };
