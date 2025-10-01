/**
 * Response Playbook Service for Secure Gate Access Control System
 * 
 * Provides automated incident response playbook execution
 * Features:
 * - Ansible/Terraform playbook integration
 * - Automated containment procedures
 * - Version-controlled playbooks
 * - Rollback capabilities
 */

import loggingService from './loggingService.js';
import notificationService from './notificationService.js';
import incidentTriageService from './incidentTriageService.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class ResponsePlaybookService {
  constructor() {
    this.config = {
      playbooks: {
        directory: process.env.PLAYBOOKS_DIR || '/app/playbooks',
        versionControl: {
          enabled: true,
          repository: process.env.PLAYBOOKS_REPO || 'git@github.com:securegate/incident-playbooks.git',
          branch: process.env.PLAYBOOKS_BRANCH || 'main'
        }
      },
      ansible: {
        enabled: true,
        executable: process.env.ANSIBLE_PLAYBOOK || 'ansible-playbook',
        inventory: process.env.ANSIBLE_INVENTORY || '/app/inventory/hosts.yml',
        timeout: parseInt(process.env.ANSIBLE_TIMEOUT) || 300 // 5 minutes
      },
      terraform: {
        enabled: true,
        executable: process.env.TERRAFORM || 'terraform',
        workingDir: process.env.TERRAFORM_DIR || '/app/terraform',
        timeout: parseInt(process.env.TERRAFORM_TIMEOUT) || 600 // 10 minutes
      },
      playbooks: {
        security: {
          'authentication_failure': {
            name: 'Authentication Failure Response',
            type: 'ansible',
            file: 'security/authentication_failure.yml',
            timeout: 300,
            rollback: true
          },
          'unauthorized_access': {
            name: 'Unauthorized Access Response',
            type: 'ansible',
            file: 'security/unauthorized_access.yml',
            timeout: 300,
            rollback: true
          },
          'data_breach': {
            name: 'Data Breach Response',
            type: 'ansible',
            file: 'security/data_breach.yml',
            timeout: 600,
            rollback: true
          },
          'malware_detection': {
            name: 'Malware Detection Response',
            type: 'ansible',
            file: 'security/malware_detection.yml',
            timeout: 900,
            rollback: true
          }
        },
        availability: {
          'service_down': {
            name: 'Service Down Response',
            type: 'ansible',
            file: 'availability/service_down.yml',
            timeout: 300,
            rollback: true
          },
          'database_connection_failed': {
            name: 'Database Connection Failed Response',
            type: 'ansible',
            file: 'availability/database_connection_failed.yml',
            timeout: 600,
            rollback: true
          },
          'high_cpu_usage': {
            name: 'High CPU Usage Response',
            type: 'ansible',
            file: 'availability/high_cpu_usage.yml',
            timeout: 300,
            rollback: true
          },
          'memory_exhaustion': {
            name: 'Memory Exhaustion Response',
            type: 'ansible',
            file: 'availability/memory_exhaustion.yml',
            timeout: 300,
            rollback: true
          }
        },
        performance: {
          'slow_query': {
            name: 'Slow Query Response',
            type: 'ansible',
            file: 'performance/slow_query.yml',
            timeout: 300,
            rollback: true
          },
          'high_response_time': {
            name: 'High Response Time Response',
            type: 'ansible',
            file: 'performance/high_response_time.yml',
            timeout: 300,
            rollback: true
          },
          'connection_pool_exhausted': {
            name: 'Connection Pool Exhausted Response',
            type: 'ansible',
            file: 'performance/connection_pool_exhausted.yml',
            timeout: 300,
            rollback: true
          }
        },
        compliance: {
          'gdpr_violation': {
            name: 'GDPR Violation Response',
            type: 'ansible',
            file: 'compliance/gdpr_violation.yml',
            timeout: 600,
            rollback: true
          },
          'kenya_dpa_violation': {
            name: 'Kenya DPA Violation Response',
            type: 'ansible',
            file: 'compliance/kenya_dpa_violation.yml',
            timeout: 600,
            rollback: true
          },
          'audit_log_tampering': {
            name: 'Audit Log Tampering Response',
            type: 'ansible',
            file: 'compliance/audit_log_tampering.yml',
            timeout: 600,
            rollback: true
          }
        }
      },
      containment: {
        actions: {
          'isolate_node': {
            name: 'Isolate Compromised Node',
            type: 'ansible',
            playbook: 'containment/isolate_node.yml',
            timeout: 180
          },
          'revoke_credentials': {
            name: 'Revoke Compromised Credentials',
            type: 'ansible',
            playbook: 'containment/revoke_credentials.yml',
            timeout: 120
          },
          'restart_service': {
            name: 'Restart Failed Service',
            type: 'ansible',
            playbook: 'containment/restart_service.yml',
            timeout: 300
          },
          'block_ip': {
            name: 'Block Malicious IP',
            type: 'ansible',
            playbook: 'containment/block_ip.yml',
            timeout: 60
          },
          'quarantine_file': {
            name: 'Quarantine Suspicious File',
            type: 'ansible',
            playbook: 'containment/quarantine_file.yml',
            timeout: 120
          }
        }
      },
      rollback: {
        enabled: true,
        timeout: 300,
        retryAttempts: 3
      }
    };
    
    this.activeExecutions = new Map();
    this.executionHistory = [];
    this.isRunning = false;
    
    this.initializeService();
  }

  /**
   * Initialize response playbook service
   */
  async initializeService() {
    try {
      loggingService.logInfo('Response playbook service initialized', {
        playbooksDirectory: this.config.playbooks.directory,
        ansibleEnabled: this.config.ansible.enabled,
        terraformEnabled: this.config.terraform.enabled,
        playbooksCount: Object.keys(this.config.playbooks).length
      });
      
      // Initialize playbooks directory
      await this.initializePlaybooksDirectory();
      
      // Load playbooks
      await this.loadPlaybooks();
      
    } catch (error) {
      loggingService.logError('Failed to initialize response playbook service', error);
      throw error;
    }
  }

  /**
   * Initialize playbooks directory
   */
  async initializePlaybooksDirectory() {
    try {
      // Create playbooks directory if it doesn't exist
      await execAsync(`mkdir -p ${this.config.playbooks.directory}`);
      
      // Clone playbooks repository if version control is enabled
      if (this.config.playbooks.versionControl.enabled) {
        await this.clonePlaybooksRepository();
      }
      
      loggingService.logInfo('Playbooks directory initialized');
      
    } catch (error) {
      loggingService.logError('Failed to initialize playbooks directory', error);
      throw error;
    }
  }

  /**
   * Clone playbooks repository
   */
  async clonePlaybooksRepository() {
    try {
      const { repository, branch } = this.config.playbooks.versionControl;
      
      // Check if directory is already a git repository
      try {
        await execAsync(`cd ${this.config.playbooks.directory} && git status`);
        loggingService.logInfo('Playbooks directory is already a git repository');
        return;
      } catch (error) {
        // Not a git repository, clone it
        await execAsync(`git clone -b ${branch} ${repository} ${this.config.playbooks.directory}`);
        loggingService.logInfo('Playbooks repository cloned');
      }
      
    } catch (error) {
      loggingService.logError('Failed to clone playbooks repository', error);
      throw error;
    }
  }

  /**
   * Load playbooks
   */
  async loadPlaybooks() {
    try {
      // This would load actual playbooks from the directory
      // For now, just log the action
      loggingService.logInfo('Playbooks loaded');
      
    } catch (error) {
      loggingService.logError('Failed to load playbooks', error);
      throw error;
    }
  }

  /**
   * Execute response playbook
   */
  async executePlaybook(incident, playbookType = 'automatic') {
    try {
      const incidentId = incident.id;
      const category = incident.category;
      const pattern = incident.pattern;
      
      // Determine playbook to execute
      const playbook = this.determinePlaybook(category, pattern);
      if (!playbook) {
        throw new Error(`No playbook found for category: ${category}, pattern: ${pattern}`);
      }
      
      // Create execution record
      const execution = {
        id: this.generateExecutionId(),
        incidentId: incidentId,
        playbook: playbook,
        type: playbookType,
        status: 'running',
        startedAt: new Date(),
        steps: [],
        logs: []
      };
      
      // Store execution
      this.activeExecutions.set(execution.id, execution);
      
      // Execute playbook
      const result = await this.executePlaybookFile(execution, playbook);
      
      // Update execution
      execution.status = result.success ? 'completed' : 'failed';
      execution.completedAt = new Date();
      execution.result = result;
      
      // Move to history
      this.executionHistory.push(execution);
      this.activeExecutions.delete(execution.id);
      
      // Notify result
      await this.notifyPlaybookResult(incident, execution);
      
      loggingService.logInfo(`Playbook executed for incident ${incidentId}`, {
        executionId: execution.id,
        playbook: playbook.name,
        status: execution.status,
        duration: execution.completedAt - execution.startedAt
      });
      
      return execution;
      
    } catch (error) {
      loggingService.logError('Failed to execute playbook', error);
      throw error;
    }
  }

  /**
   * Determine playbook to execute
   */
  determinePlaybook(category, pattern) {
    try {
      const categoryPlaybooks = this.config.playbooks[category];
      if (!categoryPlaybooks) {
        return null;
      }
      
      // Find playbook by pattern
      const playbook = categoryPlaybooks[pattern];
      if (!playbook) {
        // Find playbook by partial match
        for (const [key, value] of Object.entries(categoryPlaybooks)) {
          if (pattern.includes(key) || key.includes(pattern)) {
            return value;
          }
        }
      }
      
      return playbook;
      
    } catch (error) {
      loggingService.logError('Failed to determine playbook', error);
      return null;
    }
  }

  /**
   * Execute playbook file
   */
  async executePlaybookFile(execution, playbook) {
    try {
      const playbookPath = `${this.config.playbooks.directory}/${playbook.file}`;
      
      // Execute based on playbook type
      switch (playbook.type) {
        case 'ansible':
          return await this.executeAnsiblePlaybook(execution, playbookPath, playbook);
        case 'terraform':
          return await this.executeTerraformPlaybook(execution, playbookPath, playbook);
        default:
          throw new Error(`Unknown playbook type: ${playbook.type}`);
      }
      
    } catch (error) {
      loggingService.logError('Failed to execute playbook file', error);
      throw error;
    }
  }

  /**
   * Execute Ansible playbook
   */
  async executeAnsiblePlaybook(execution, playbookPath, playbook) {
    try {
      const command = `${this.config.ansible.executable} -i ${this.config.ansible.inventory} ${playbookPath}`;
      
      loggingService.logInfo(`Executing Ansible playbook: ${playbook.name}`, {
        command: command,
        timeout: playbook.timeout
      });
      
      // Execute with timeout
      const { stdout, stderr } = await execAsync(command, {
        timeout: playbook.timeout * 1000,
        cwd: this.config.playbooks.directory
      });
      
      // Parse output
      const result = {
        success: true,
        stdout: stdout,
        stderr: stderr,
        exitCode: 0,
        duration: Date.now() - execution.startedAt.getTime()
      };
      
      // Add to execution steps
      execution.steps.push({
        step: 'ansible_execution',
        status: 'completed',
        output: stdout,
        error: stderr,
        timestamp: new Date()
      });
      
      return result;
      
    } catch (error) {
      loggingService.logError('Ansible playbook execution failed', error);
      
      const result = {
        success: false,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
        duration: Date.now() - execution.startedAt.getTime()
      };
      
      // Add to execution steps
      execution.steps.push({
        step: 'ansible_execution',
        status: 'failed',
        output: error.stdout || '',
        error: error.stderr || error.message,
        timestamp: new Date()
      });
      
      return result;
    }
  }

  /**
   * Execute Terraform playbook
   */
  async executeTerraformPlaybook(execution, playbookPath, playbook) {
    try {
      const command = `${this.config.terraform.executable} apply -auto-approve`;
      
      loggingService.logInfo(`Executing Terraform playbook: ${playbook.name}`, {
        command: command,
        timeout: playbook.timeout
      });
      
      // Execute with timeout
      const { stdout, stderr } = await execAsync(command, {
        timeout: playbook.timeout * 1000,
        cwd: this.config.terraform.workingDir
      });
      
      // Parse output
      const result = {
        success: true,
        stdout: stdout,
        stderr: stderr,
        exitCode: 0,
        duration: Date.now() - execution.startedAt.getTime()
      };
      
      // Add to execution steps
      execution.steps.push({
        step: 'terraform_execution',
        status: 'completed',
        output: stdout,
        error: stderr,
        timestamp: new Date()
      });
      
      return result;
      
    } catch (error) {
      loggingService.logError('Terraform playbook execution failed', error);
      
      const result = {
        success: false,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
        duration: Date.now() - execution.startedAt.getTime()
      };
      
      // Add to execution steps
      execution.steps.push({
        step: 'terraform_execution',
        status: 'failed',
        output: error.stdout || '',
        error: error.stderr || error.message,
        timestamp: new Date()
      });
      
      return result;
    }
  }

  /**
   * Execute containment action
   */
  async executeContainmentAction(incident, action, parameters = {}) {
    try {
      const actionConfig = this.config.containment.actions[action];
      if (!actionConfig) {
        throw new Error(`Unknown containment action: ${action}`);
      }
      
      const execution = {
        id: this.generateExecutionId(),
        incidentId: incident.id,
        action: action,
        parameters: parameters,
        status: 'running',
        startedAt: new Date(),
        steps: [],
        logs: []
      };
      
      // Store execution
      this.activeExecutions.set(execution.id, execution);
      
      // Execute containment action
      const result = await this.executeContainmentPlaybook(execution, actionConfig, parameters);
      
      // Update execution
      execution.status = result.success ? 'completed' : 'failed';
      execution.completedAt = new Date();
      execution.result = result;
      
      // Move to history
      this.executionHistory.push(execution);
      this.activeExecutions.delete(execution.id);
      
      // Notify result
      await this.notifyContainmentResult(incident, execution);
      
      loggingService.logInfo(`Containment action executed for incident ${incident.id}`, {
        executionId: execution.id,
        action: action,
        status: execution.status,
        duration: execution.completedAt - execution.startedAt
      });
      
      return execution;
      
    } catch (error) {
      loggingService.logError('Failed to execute containment action', error);
      throw error;
    }
  }

  /**
   * Execute containment playbook
   */
  async executeContainmentPlaybook(execution, actionConfig, parameters) {
    try {
      const playbookPath = `${this.config.playbooks.directory}/${actionConfig.playbook}`;
      
      // Build command with parameters
      let command = `${this.config.ansible.executable} -i ${this.config.ansible.inventory} ${playbookPath}`;
      
      // Add parameters
      for (const [key, value] of Object.entries(parameters)) {
        command += ` -e ${key}="${value}"`;
      }
      
      loggingService.logInfo(`Executing containment playbook: ${actionConfig.name}`, {
        command: command,
        timeout: actionConfig.timeout
      });
      
      // Execute with timeout
      const { stdout, stderr } = await execAsync(command, {
        timeout: actionConfig.timeout * 1000,
        cwd: this.config.playbooks.directory
      });
      
      // Parse output
      const result = {
        success: true,
        stdout: stdout,
        stderr: stderr,
        exitCode: 0,
        duration: Date.now() - execution.startedAt.getTime()
      };
      
      // Add to execution steps
      execution.steps.push({
        step: 'containment_execution',
        status: 'completed',
        output: stdout,
        error: stderr,
        timestamp: new Date()
      });
      
      return result;
      
    } catch (error) {
      loggingService.logError('Containment playbook execution failed', error);
      
      const result = {
        success: false,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
        duration: Date.now() - execution.startedAt.getTime()
      };
      
      // Add to execution steps
      execution.steps.push({
        step: 'containment_execution',
        status: 'failed',
        output: error.stdout || '',
        error: error.stderr || error.message,
        timestamp: new Date()
      });
      
      return result;
    }
  }

  /**
   * Rollback playbook execution
   */
  async rollbackExecution(executionId) {
    try {
      const execution = this.activeExecutions.get(executionId) || 
                       this.executionHistory.find(e => e.id === executionId);
      
      if (!execution) {
        throw new Error(`Execution not found: ${executionId}`);
      }
      
      if (!execution.playbook?.rollback) {
        throw new Error(`Rollback not supported for execution: ${executionId}`);
      }
      
      loggingService.logInfo(`Rolling back execution: ${executionId}`);
      
      // Execute rollback
      const rollbackResult = await this.executeRollback(execution);
      
      // Update execution
      execution.rollback = {
        executed: true,
        executedAt: new Date(),
        result: rollbackResult
      };
      
      // Notify rollback
      await this.notifyRollbackResult(execution);
      
      loggingService.logInfo(`Execution rolled back: ${executionId}`, {
        success: rollbackResult.success,
        duration: rollbackResult.duration
      });
      
      return rollbackResult;
      
    } catch (error) {
      loggingService.logError('Failed to rollback execution', error);
      throw error;
    }
  }

  /**
   * Execute rollback
   */
  async executeRollback(execution) {
    try {
      const playbook = execution.playbook;
      const rollbackPath = `${this.config.playbooks.directory}/rollback/${playbook.file}`;
      
      const command = `${this.config.ansible.executable} -i ${this.config.ansible.inventory} ${rollbackPath}`;
      
      loggingService.logInfo(`Executing rollback for: ${playbook.name}`);
      
      // Execute rollback
      const { stdout, stderr } = await execAsync(command, {
        timeout: this.config.rollback.timeout * 1000,
        cwd: this.config.playbooks.directory
      });
      
      return {
        success: true,
        stdout: stdout,
        stderr: stderr,
        duration: Date.now() - execution.startedAt.getTime()
      };
      
    } catch (error) {
      loggingService.logError('Rollback execution failed', error);
      
      return {
        success: false,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        duration: Date.now() - execution.startedAt.getTime()
      };
    }
  }

  /**
   * Notify playbook result
   */
  async notifyPlaybookResult(incident, execution) {
    try {
      await notificationService.sendSystemNotification({
        type: 'playbook_executed',
        title: 'Playbook Execution Completed',
        message: `Playbook ${execution.playbook.name} executed for incident ${incident.id}`,
        severity: execution.status === 'completed' ? 'info' : 'error',
        data: {
          incidentId: incident.id,
          executionId: execution.id,
          playbook: execution.playbook.name,
          status: execution.status,
          duration: execution.completedAt - execution.startedAt
        }
      });
      
    } catch (error) {
      loggingService.logError('Failed to notify playbook result', error);
    }
  }

  /**
   * Notify containment result
   */
  async notifyContainmentResult(incident, execution) {
    try {
      await notificationService.sendSystemNotification({
        type: 'containment_executed',
        title: 'Containment Action Completed',
        message: `Containment action ${execution.action} executed for incident ${incident.id}`,
        severity: execution.status === 'completed' ? 'info' : 'error',
        data: {
          incidentId: incident.id,
          executionId: execution.id,
          action: execution.action,
          status: execution.status,
          duration: execution.completedAt - execution.startedAt
        }
      });
      
    } catch (error) {
      loggingService.logError('Failed to notify containment result', error);
    }
  }

  /**
   * Notify rollback result
   */
  async notifyRollbackResult(execution) {
    try {
      await notificationService.sendSystemNotification({
        type: 'playbook_rollback',
        title: 'Playbook Rollback Completed',
        message: `Rollback executed for playbook ${execution.playbook.name}`,
        severity: execution.rollback.result.success ? 'info' : 'error',
        data: {
          executionId: execution.id,
          playbook: execution.playbook.name,
          success: execution.rollback.result.success,
          duration: execution.rollback.result.duration
        }
      });
      
    } catch (error) {
      loggingService.logError('Failed to notify rollback result', error);
    }
  }

  /**
   * Generate execution ID
   */
  generateExecutionId() {
    return `EXEC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId) {
    return this.activeExecutions.get(executionId) || 
           this.executionHistory.find(e => e.id === executionId);
  }

  /**
   * Get all active executions
   */
  getActiveExecutions() {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get execution history
   */
  getExecutionHistory() {
    return this.executionHistory;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: true,
      activeExecutions: this.activeExecutions.size,
      executionHistory: this.executionHistory.length,
      playbooksCount: Object.keys(this.config.playbooks).length,
      config: this.config
    };
  }
}

// Create singleton instance
const responsePlaybookService = new ResponsePlaybookService();

export default responsePlaybookService;
