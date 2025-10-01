/**
 * Pre-Deployment Validation Routes for Secure Gate Access Control System
 * 
 * Provides API endpoints for comprehensive pre-deployment validation
 * Features:
 * - Load/stress testing endpoints
 * - Deployment pipeline validation endpoints
 * - Blue-green deployment testing endpoints
 * - Final Go/No-Go validation endpoints
 */

import express from 'express';
import loadStressTestingService from '../services/loadStressTestingService.js';
import deploymentPipelineValidationService from '../services/deploymentPipelineValidationService.js';
import blueGreenDeploymentService from '../services/blueGreenDeploymentService.js';
import finalGoNoGoValidationService from '../services/finalGoNoGoValidationService.js';
import { attachUserFromToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * Load/Stress Testing Routes
 */

// Run load stress test
router.post('/load-stress-test/run', 
  attachUserFromToken,
  asyncHandler(async (req, res) => {
    try {
      const result = await loadStressTestingService.runLoadStressTest();
      
      res.json({
        success: true,
        message: 'Load stress test started successfully',
        data: {
          test_id: result.id,
          status: result.status,
          start_time: result.start_time
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to start load stress test',
          details: error.message
        }
      });
    }
  })
);

// Get load stress test results
router.get('/load-stress-test/results', 
  attachUserFromToken,
  asyncHandler(async (req, res) => {
    try {
      const results = loadStressTestingService.getTestResults();
      
      res.json({
        success: true,
        message: 'Load stress test results retrieved successfully',
        data: {
          total_tests: results.length,
          results: results
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve load stress test results',
          details: error.message
        }
      });
    }
  })
);

// Get current load stress test metrics
router.get('/load-stress-test/metrics', 
  attachUserFromToken,
  asyncHandler(async (req, res) => {
    try {
      const metrics = loadStressTestingService.getCurrentMetrics();
      const status = loadStressTestingService.getServiceStatus();
      
      res.json({
        success: true,
        message: 'Load stress test metrics retrieved successfully',
        data: {
          metrics: metrics,
          status: status
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve load stress test metrics',
          details: error.message
        }
      });
    }
  })
);

/**
 * Deployment Pipeline Validation Routes
 */

// Run deployment pipeline validation
router.post('/pipeline-validation/run', 
  attachUserFromToken,
  asyncHandler(async (req, res) => {
    try {
      const result = await deploymentPipelineValidationService.runPipelineValidation();
      
      res.json({
        success: true,
        message: 'Deployment pipeline validation started successfully',
        data: {
          validation_id: result.id,
          status: result.status,
          start_time: result.start_time
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to start deployment pipeline validation',
          details: error.message
        }
      });
    }
  })
);

// Get deployment pipeline validation results
router.get('/pipeline-validation/results', 
  attachUserFromToken,
  asyncHandler(async (req, res) => {
    try {
      const results = deploymentPipelineValidationService.getValidationResults();
      
      res.json({
        success: true,
        message: 'Deployment pipeline validation results retrieved successfully',
        data: {
          total_validations: results.length,
          results: results
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve deployment pipeline validation results',
          details: error.message
        }
      });
    }
  })
);

// Get deployment pipeline validation status
router.get('/pipeline-validation/status', 
  attachUserFromToken,
  asyncHandler(async (req, res) => {
    try {
      const status = deploymentPipelineValidationService.getServiceStatus();
      
      res.json({
        success: true,
        message: 'Deployment pipeline validation status retrieved successfully',
        data: status
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve deployment pipeline validation status',
          details: error.message
        }
      });
    }
  })
);

/**
 * Blue-Green Deployment Testing Routes
 */

// Run blue-green deployment test
router.post('/blue-green-deployment/run', 
  attachUserFromToken,
  asyncHandler(async (req, res) => {
    try {
      const result = await blueGreenDeploymentService.runBlueGreenDeploymentTest();
      
      res.json({
        success: true,
        message: 'Blue-green deployment test started successfully',
        data: {
          deployment_id: result.id,
          status: result.status,
          start_time: result.start_time
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to start blue-green deployment test',
          details: error.message
        }
      });
    }
  })
);

// Get blue-green deployment results
router.get('/blue-green-deployment/results', 
  attachUserFromToken,
  asyncHandler(async (req, res) => {
    try {
      const results = blueGreenDeploymentService.getDeploymentResults();
      
      res.json({
        success: true,
        message: 'Blue-green deployment results retrieved successfully',
        data: {
          total_deployments: results.length,
          results: results
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve blue-green deployment results',
          details: error.message
        }
      });
    }
  })
);

// Get blue-green deployment status
router.get('/blue-green-deployment/status', 
  attachUserFromToken,
  asyncHandler(async (req, res) => {
    try {
      const status = blueGreenDeploymentService.getServiceStatus();
      
      res.json({
        success: true,
        message: 'Blue-green deployment status retrieved successfully',
        data: status
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve blue-green deployment status',
          details: error.message
        }
      });
    }
  })
);

/**
 * Final Go/No-Go Validation Routes
 */

// Run final Go/No-Go validation
router.post('/final-validation/run', 
  attachUserFromToken,
  asyncHandler(async (req, res) => {
    try {
      const result = await finalGoNoGoValidationService.runFinalValidation();
      
      res.json({
        success: true,
        message: 'Final Go/No-Go validation started successfully',
        data: {
          validation_id: result.id,
          status: result.status,
          go_no_go_decision: result.go_no_go_decision,
          start_time: result.start_time
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to start final Go/No-Go validation',
          details: error.message
        }
      });
    }
  })
);

// Get final Go/No-Go validation results
router.get('/final-validation/results', 
  attachUserFromToken,
  asyncHandler(async (req, res) => {
    try {
      const results = finalGoNoGoValidationService.getValidationResults();
      
      res.json({
        success: true,
        message: 'Final Go/No-Go validation results retrieved successfully',
        data: {
          total_validations: results.length,
          results: results
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve final Go/No-Go validation results',
          details: error.message
        }
      });
    }
  })
);

// Get final Go/No-Go validation status
router.get('/final-validation/status', 
  attachUserFromToken,
  asyncHandler(async (req, res) => {
    try {
      const status = finalGoNoGoValidationService.getServiceStatus();
      
      res.json({
        success: true,
        message: 'Final Go/No-Go validation status retrieved successfully',
        data: status
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve final Go/No-Go validation status',
          details: error.message
        }
      });
    }
  })
);

/**
 * Comprehensive Pre-Deployment Validation Route
 */

// Run all pre-deployment validations
router.post('/comprehensive-validation/run', 
  attachUserFromToken,
  asyncHandler(async (req, res) => {
    try {
      const results = {
        load_stress_test: null,
        pipeline_validation: null,
        blue_green_deployment: null,
        final_validation: null,
        overall_status: 'running',
        start_time: new Date().toISOString(),
        end_time: null
      };
      
      // Run load stress test
      try {
        results.load_stress_test = await loadStressTestingService.runLoadStressTest();
      } catch (error) {
        results.load_stress_test = { error: error.message };
      }
      
      // Run pipeline validation
      try {
        results.pipeline_validation = await deploymentPipelineValidationService.runPipelineValidation();
      } catch (error) {
        results.pipeline_validation = { error: error.message };
      }
      
      // Run blue-green deployment test
      try {
        results.blue_green_deployment = await blueGreenDeploymentService.runBlueGreenDeploymentTest();
      } catch (error) {
        results.blue_green_deployment = { error: error.message };
      }
      
      // Run final validation
      try {
        results.final_validation = await finalGoNoGoValidationService.runFinalValidation();
      } catch (error) {
        results.final_validation = { error: error.message };
      }
      
      // Determine overall status
      const allSuccessful = results.load_stress_test?.status === 'completed' &&
                           results.pipeline_validation?.status === 'completed' &&
                           results.blue_green_deployment?.status === 'completed' &&
                           results.final_validation?.go_no_go_decision === 'GO';
      
      results.overall_status = allSuccessful ? 'completed' : 'failed';
      results.end_time = new Date().toISOString();
      
      res.json({
        success: true,
        message: 'Comprehensive pre-deployment validation completed',
        data: results
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to run comprehensive pre-deployment validation',
          details: error.message
        }
      });
    }
  })
);

export default router;
