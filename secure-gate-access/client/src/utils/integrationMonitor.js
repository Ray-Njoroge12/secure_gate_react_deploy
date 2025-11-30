/**
 * Integration Status Monitor
 * Monitors frontend-backend integration health
 */

class IntegrationMonitor {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.isHealthy = false;
    this.lastCheck = null;
    this.errors = [];
  }
  
  async checkBackendConnectivity() {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/api/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        this.isHealthy = true;
        this.errors = [];
        this.lastCheck = new Date();
        return { status: 'healthy', timestamp: this.lastCheck };
      } else {
        throw new Error(`Backend returned ${response.status}`);
      }
    } catch (error) {
      this.isHealthy = false;
      this.errors.push({
        type: 'connectivity',
        message: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }
  
  async testAuthEndpoints() {
    const results = {};
    
    try {
      // Test registration endpoint
      const registerResponse = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty body to test validation
      });
      
      results.registration = {
        reachable: true,
        validationWorking: !registerResponse.ok && registerResponse.status === 422
      };
    } catch (error) {
      results.registration = { reachable: false, error: error.message };
    }
    
    try {
      // Test login endpoint
      const loginResponse = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty body to test validation
      });
      
      results.login = {
        reachable: true,
        validationWorking: !loginResponse.ok && loginResponse.status === 400
      };
    } catch (error) {
      results.login = { reachable: false, error: error.message };
    }
    
    return results;
  }
  
  async runFullDiagnostic() {
    const diagnostic = {
      timestamp: new Date(),
      backend: null,
      auth: null,
      overall: 'unknown'
    };
    
    try {
      diagnostic.backend = await this.checkBackendConnectivity();
      diagnostic.auth = await this.testAuthEndpoints();
      
      const backendHealthy = diagnostic.backend.status === 'healthy';
      const authHealthy = diagnostic.auth.registration?.reachable && diagnostic.auth.login?.reachable;
      
      diagnostic.overall = (backendHealthy && authHealthy) ? 'healthy' : 'issues';
      
    } catch (error) {
      diagnostic.overall = 'error';
      diagnostic.error = error.message;
    }
    
    return diagnostic;
  }
  
  getStatus() {
    return {
      healthy: this.isHealthy,
      lastCheck: this.lastCheck,
      errors: this.errors
    };
  }
}

export default new IntegrationMonitor();
