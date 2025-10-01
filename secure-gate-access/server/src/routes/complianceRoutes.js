/**
 * Compliance Routes for Secure Gate Access Control System
 * 
 * Provides API endpoints for compliance audits and certifications
 * Features:
 * - Kenya DPA compliance audit endpoints
 * - ISO 27001 certification readiness endpoints
 * - OWASP Top 10 validation endpoints
 * - GDPR compliance validation endpoints
 * - Final compliance reporting endpoints
 */

import express from 'express';
import kenyaDPAAuditService from '../services/kenyaDPAAuditService.js';
import iso27001CertificationService from '../services/iso27001CertificationService.js';
import owaspValidationService from '../services/owaspValidationService.js';
import gdprComplianceService from '../services/gdprComplianceService.js';
import finalComplianceReportingService from '../services/finalComplianceReportingService.js';
import centralizedLoggingService from '../services/centralizedLoggingService.js';
import loggingService from '../services/loggingService.js';

const router = express.Router();

// Middleware to apply centralized logging
router.use((req, res, next) => {
  const traceId = centralizedLoggingService.generateTraceId();
  centralizedLoggingService.setTraceId(traceId);
  req.traceId = traceId;
  next();
});

/**
 * @route POST /api/compliance/kenya-dpa/audit
 * @description Execute Kenya DPA compliance audit
 * @access Admin
 */
router.post('/kenya-dpa/audit', async (req, res) => {
  try {
    loggingService.logInfo('API: Kenya DPA compliance audit requested', { trace_id: req.traceId });
    
    const result = await kenyaDPAAuditService.executeComplianceAudit();
    
    res.status(200).json({
      message: 'Kenya DPA compliance audit completed',
      result: {
        id: result.id,
        status: result.status,
        compliance_score: result.compliance_score,
        launch_ready: result.launch_ready,
        violations: result.violations.length,
        remediations: result.remediations.length
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Kenya DPA compliance audit failed', error);
    res.status(500).json({
      message: 'Kenya DPA compliance audit failed',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/compliance/kenya-dpa/results
 * @description Get Kenya DPA audit results
 * @access Admin
 */
router.get('/kenya-dpa/results', async (req, res) => {
  try {
    const results = kenyaDPAAuditService.getAuditResults();
    const violations = kenyaDPAAuditService.getViolations();
    const remediations = kenyaDPAAuditService.getRemediations();
    
    res.status(200).json({
      message: 'Kenya DPA audit results retrieved',
      data: {
        results,
        violations,
        remediations,
        summary: {
          total_audits: results.length,
          total_violations: violations.length,
          total_remediations: remediations.length
        }
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get Kenya DPA audit results', error);
    res.status(500).json({
      message: 'Failed to get Kenya DPA audit results',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route POST /api/compliance/iso27001/assessment
 * @description Execute ISO 27001 certification readiness assessment
 * @access Admin
 */
router.post('/iso27001/assessment', async (req, res) => {
  try {
    loggingService.logInfo('API: ISO 27001 certification assessment requested', { trace_id: req.traceId });
    
    const result = await iso27001CertificationService.executeCertificationReadinessAssessment();
    
    res.status(200).json({
      message: 'ISO 27001 certification readiness assessment completed',
      result: {
        id: result.id,
        status: result.status,
        certification_readiness_score: result.certification_readiness_score,
        certification_ready: result.certification_ready,
        control_gaps: result.controlGaps.length,
        audit_findings: result.auditFindings.length
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: ISO 27001 certification assessment failed', error);
    res.status(500).json({
      message: 'ISO 27001 certification assessment failed',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/compliance/iso27001/results
 * @description Get ISO 27001 certification results
 * @access Admin
 */
router.get('/iso27001/results', async (req, res) => {
  try {
    const results = iso27001CertificationService.getCertificationResults();
    const controlGaps = iso27001CertificationService.getControlGaps();
    const auditFindings = iso27001CertificationService.getAuditFindings();
    
    res.status(200).json({
      message: 'ISO 27001 certification results retrieved',
      data: {
        results,
        control_gaps: controlGaps,
        audit_findings: auditFindings,
        summary: {
          total_assessments: results.length,
          total_control_gaps: controlGaps.length,
          total_audit_findings: auditFindings.length
        }
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get ISO 27001 certification results', error);
    res.status(500).json({
      message: 'Failed to get ISO 27001 certification results',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route POST /api/compliance/owasp/validation
 * @description Execute OWASP Top 10 validation
 * @access Admin
 */
router.post('/owasp/validation', async (req, res) => {
  try {
    loggingService.logInfo('API: OWASP Top 10 validation requested', { trace_id: req.traceId });
    
    const result = await owaspValidationService.executeOWASPValidation();
    
    res.status(200).json({
      message: 'OWASP Top 10 validation completed',
      result: {
        id: result.id,
        status: result.status,
        validation_score: result.validation_score,
        deployment_ready: result.deployment_ready,
        vulnerabilities: result.vulnerabilities.length,
        policy_violations: result.policyViolations.length
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: OWASP Top 10 validation failed', error);
    res.status(500).json({
      message: 'OWASP Top 10 validation failed',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/compliance/owasp/results
 * @description Get OWASP validation results
 * @access Admin
 */
router.get('/owasp/results', async (req, res) => {
  try {
    const results = owaspValidationService.getValidationResults();
    const vulnerabilities = owaspValidationService.getVulnerabilities();
    const policyViolations = owaspValidationService.getPolicyViolations();
    
    res.status(200).json({
      message: 'OWASP validation results retrieved',
      data: {
        results,
        vulnerabilities,
        policy_violations: policyViolations,
        summary: {
          total_validations: results.length,
          total_vulnerabilities: vulnerabilities.length,
          total_policy_violations: policyViolations.length
        }
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get OWASP validation results', error);
    res.status(500).json({
      message: 'Failed to get OWASP validation results',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route POST /api/compliance/gdpr/validation
 * @description Execute GDPR compliance validation
 * @access Admin
 */
router.post('/gdpr/validation', async (req, res) => {
  try {
    loggingService.logInfo('API: GDPR compliance validation requested', { trace_id: req.traceId });
    
    const result = await gdprComplianceService.executeGDPRComplianceValidation();
    
    res.status(200).json({
      message: 'GDPR compliance validation completed',
      result: {
        id: result.id,
        status: result.status,
        compliance_score: result.compliance_score,
        launch_ready: result.launch_ready,
        violations: result.violations.length,
        remediations: result.remediations.length
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: GDPR compliance validation failed', error);
    res.status(500).json({
      message: 'GDPR compliance validation failed',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/compliance/gdpr/results
 * @description Get GDPR compliance results
 * @access Admin
 */
router.get('/gdpr/results', async (req, res) => {
  try {
    const results = gdprComplianceService.getComplianceResults();
    const violations = gdprComplianceService.getViolations();
    const dataSubjectRequests = gdprComplianceService.getDataSubjectRequests();
    
    res.status(200).json({
      message: 'GDPR compliance results retrieved',
      data: {
        results,
        violations,
        data_subject_requests: dataSubjectRequests,
        summary: {
          total_validations: results.length,
          total_violations: violations.length,
          total_data_subject_requests: dataSubjectRequests.length
        }
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get GDPR compliance results', error);
    res.status(500).json({
      message: 'Failed to get GDPR compliance results',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route POST /api/compliance/final-report
 * @description Generate final compliance report
 * @access Admin
 */
router.post('/final-report', async (req, res) => {
  try {
    loggingService.logInfo('API: Final compliance report generation requested', { trace_id: req.traceId });
    
    const result = await finalComplianceReportingService.generateFinalComplianceReport();
    
    res.status(200).json({
      message: 'Final compliance report generated',
      result: {
        id: result.id,
        status: result.status,
        sections: Object.keys(result.sections || {}),
        executive_summary: result.executive_summary ? 'Generated' : 'Not generated',
        full_report: result.full_report ? 'Generated' : 'Not generated',
        approval_status: result.approval_status
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Final compliance report generation failed', error);
    res.status(500).json({
      message: 'Final compliance report generation failed',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/compliance/final-report/:reportId
 * @description Get specific final compliance report
 * @access Admin
 */
router.get('/final-report/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const reports = finalComplianceReportingService.getReports();
    const report = reports.find(r => r.id === reportId);
    
    if (!report) {
      return res.status(404).json({
        message: 'Report not found',
        trace_id: req.traceId
      });
    }
    
    res.status(200).json({
      message: 'Final compliance report retrieved',
      data: report,
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get final compliance report', error);
    res.status(500).json({
      message: 'Failed to get final compliance report',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/compliance/final-report
 * @description Get all final compliance reports
 * @access Admin
 */
router.get('/final-report', async (req, res) => {
  try {
    const reports = finalComplianceReportingService.getReports();
    const approvals = finalComplianceReportingService.getApprovals();
    const distributions = finalComplianceReportingService.getDistributions();
    
    res.status(200).json({
      message: 'Final compliance reports retrieved',
      data: {
        reports,
        approvals,
        distributions,
        summary: {
          total_reports: reports.length,
          total_approvals: approvals.length,
          total_distributions: distributions.length
        }
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get final compliance reports', error);
    res.status(500).json({
      message: 'Failed to get final compliance reports',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route POST /api/compliance/approve/:reportId
 * @description Approve a compliance report
 * @access Admin
 */
router.post('/approve/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { approver, team } = req.body;
    
    if (!approver || !team) {
      return res.status(400).json({
        message: 'Approver and team are required',
        trace_id: req.traceId
      });
    }
    
    const approvals = finalComplianceReportingService.getApprovals();
    const approval = approvals.find(a => a.report_id === reportId);
    
    if (!approval) {
      return res.status(404).json({
        message: 'Approval not found',
        trace_id: req.traceId
      });
    }
    
    // Update approval status
    if (approval.approvals[team]) {
      approval.approvals[team].status = 'approved';
      approval.approvals[team].approver = approver;
      approval.approvals[team].timestamp = new Date().toISOString();
      approval.updated_at = new Date().toISOString();
    }
    
    // Check if all approvals are complete
    const allApproved = Object.values(approval.approvals).every(a => a.status === 'approved');
    if (allApproved) {
      approval.status = 'approved';
    }
    
    res.status(200).json({
      message: 'Report approval updated',
      data: {
        approval_id: approval.id,
        report_id: reportId,
        team,
        approver,
        status: approval.status
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to approve compliance report', error);
    res.status(500).json({
      message: 'Failed to approve compliance report',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route POST /api/compliance/distribute/:reportId
 * @description Distribute a compliance report
 * @access Admin
 */
router.post('/distribute/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const reports = finalComplianceReportingService.getReports();
    const report = reports.find(r => r.id === reportId);
    
    if (!report) {
      return res.status(404).json({
        message: 'Report not found',
        trace_id: req.traceId
      });
    }
    
    const approvals = finalComplianceReportingService.getApprovals();
    const approval = approvals.find(a => a.report_id === reportId);
    
    if (!approval || approval.status !== 'approved') {
      return res.status(400).json({
        message: 'Report must be approved before distribution',
        trace_id: req.traceId
      });
    }
    
    await finalComplianceReportingService.distributeReport(report, approval);
    
    res.status(200).json({
      message: 'Report distribution initiated',
      data: {
        report_id: reportId,
        approval_id: approval.id,
        status: 'distributed'
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to distribute compliance report', error);
    res.status(500).json({
      message: 'Failed to distribute compliance report',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/compliance/status
 * @description Get overall compliance status
 * @access Admin
 */
router.get('/status', async (req, res) => {
  try {
    const kenyaDPAStatus = kenyaDPAAuditService.getStatus();
    const iso27001Status = iso27001CertificationService.getStatus();
    const owaspStatus = owaspValidationService.getStatus();
    const gdprStatus = gdprComplianceService.getStatus();
    const reportingStatus = finalComplianceReportingService.getStatus();
    
    res.status(200).json({
      message: 'Compliance status retrieved',
      data: {
        kenya_dpa: kenyaDPAStatus,
        iso27001: iso27001Status,
        owasp: owaspStatus,
        gdpr: gdprStatus,
        reporting: reportingStatus,
        overall: {
          all_services_running: kenyaDPAStatus.running && iso27001Status.running && owaspStatus.running && gdprStatus.running && reportingStatus.running,
          total_violations: kenyaDPAStatus.violations + owaspStatus.vulnerabilities + gdprStatus.violations,
          total_reports: reportingStatus.reports
        }
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get compliance status', error);
    res.status(500).json({
      message: 'Failed to get compliance status',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

export default router;
