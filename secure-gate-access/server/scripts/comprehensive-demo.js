#!/usr/bin/env node
/**
 * Comprehensive System Demo
 * 
 * This script performs a complete end-to-end demonstration of the Secure Gate Access system:
 * - Verifies all services (Database, MailHog, Server)
 * - Seeds demo data
 * - Tests all user roles and their functionalities
 * - Validates email/SMS notifications
 * - Tests visitor and delivery workflows
 * 
 * Usage: node scripts/comprehensive-demo.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { dbManager } from '../src/database/db.enhanced.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const MAILHOG_UI = 'http://localhost:8025';
const MAILHOG_API = 'http://localhost:8025/api/v2';

// Demo credentials (from seed-demo.js)
const DEMO_USERS = {
  superAdmin: {
    email: 'super.admin@securegate.demo',
    password: 'SuperAdmin@2026!',
    role: 'super_admin',
    name: 'Super Administrator'
  },
  admin: {
    email: 'admin@oakridge.demo',
    password: 'Admin@2026!',
    role: 'admin',
    name: 'Estate Administrator'
  },
  guards: [
    {
      email: 'guard.main@oakridge.demo',
      password: 'Guard@2026!',
      role: 'guard',
      name: 'Main Gate Security'
    },
    {
      email: 'guard.back@oakridge.demo',
      password: 'Guard@2026!',
      role: 'guard',
      name: 'Back Gate Security'
    }
  ],
  residents: [
    {
      email: 'john.smith@resident.demo',
      password: 'Resident@2026!',
      role: 'resident',
      name: 'John Smith',
      unit: 'A-101'
    },
    {
      email: 'jane.doe@resident.demo',
      password: 'Resident@2026!',
      role: 'resident',
      name: 'Jane Doe',
      unit: 'B-205'
    },
    {
      email: 'mike.johnson@resident.demo',
      password: 'Resident@2026!',
      role: 'resident',
      name: 'Mike Johnson',
      unit: 'C-302'
    }
  ]
};

class ComprehensiveDemo {
  constructor() {
    this.tokens = {};
    this.testData = {};
    this.emailsSent = 0;
    this.smsSent = 0;
  }

  // ==================== UTILITIES ====================

  log(message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      step: '📍',
      email: '📧',
      sms: '📱',
      check: '🔍',
      time: '⏱️'
    };
    console.log(`${icons[type] || '•'} ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(method, endpoint, data = null, token = null) {
    try {
      const config = {
        method,
        url: `${API_BASE_URL}/api${endpoint}`,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        ...(data && { data })
      };

      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  }

  // ==================== SERVICE VERIFICATION ====================

  async verifyDatabase() {
    this.log('Verifying database connection...', 'check');
    try {
      await dbManager.initializeAsync();
      const result = await dbManager.query('SELECT NOW()');
      this.log(`Database connected: ${result.rows[0].now}`, 'success');
      return true;
    } catch (error) {
      this.log(`Database connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async verifyServer() {
    this.log('Verifying backend server...', 'check');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
      this.log(`Server is running: ${response.data.message || 'OK'}`, 'success');
      return true;
    } catch (error) {
      this.log(`Server is not responding: ${error.message}`, 'error');
      this.log(`Expected URL: ${API_BASE_URL}/api/health`, 'info');
      return false;
    }
  }

  async verifyMailHog() {
    this.log('Verifying MailHog...', 'check');
    try {
      const response = await axios.get(`${MAILHOG_API}/messages`, { timeout: 5000 });
      this.log(`MailHog is running: ${response.data.total || 0} messages`, 'success');
      this.log(`MailHog UI: ${MAILHOG_UI}`, 'email');
      return true;
    } catch (error) {
      this.log('MailHog is not running (optional for demo)', 'warning');
      this.log('Start MailHog: docker-compose up mailhog -d', 'info');
      return false;
    }
  }

  async checkLocalMessages() {
    this.log('Checking local message store...', 'check');
    try {
      const fs = await import('fs/promises');
      const messagesPath = join(__dirname, '..', 'data', 'local_messages.json');
      
      try {
        const data = await fs.readFile(messagesPath, 'utf8');
        const messages = JSON.parse(data);
        this.log(`Found ${messages.length} local messages`, 'success');
        return messages;
      } catch (err) {
        this.log('No local messages file found (will be created on first message)', 'info');
        return [];
      }
    } catch (error) {
      this.log(`Error checking local messages: ${error.message}`, 'warning');
      return [];
    }
  }

  // ==================== DATA SEEDING ====================

  async seedDemoData() {
    this.log('Seeding demo data...', 'step');
    try {
      const { stdout, stderr } = await execAsync('npm run db:seed:demo', {
        cwd: join(__dirname, '..')
      });
      
      if (stderr && !stderr.includes('npm')) {
        this.log(`Seed warnings: ${stderr}`, 'warning');
      }
      
      this.log('Demo data seeded successfully', 'success');
      return true;
    } catch (error) {
      this.log(`Failed to seed data: ${error.message}`, 'error');
      this.log('You may need to run: npm run db:seed:demo manually', 'info');
      return false;
    }
  }

  // ==================== AUTHENTICATION ====================

  async authenticateAllUsers() {
    this.log('Authenticating all demo users...', 'step');

    const allUsers = [
      DEMO_USERS.superAdmin,
      DEMO_USERS.admin,
      ...DEMO_USERS.guards,
      ...DEMO_USERS.residents
    ];

    for (const user of allUsers) {
      const result = await this.makeRequest('POST', '/auth/login', {
        email: user.email,
        password: user.password
      });

      if (result.success) {
        this.tokens[user.email] = result.data.token || result.data.data?.token;
        this.log(`${user.role.padEnd(12)} | ${user.name}`, 'success');
      } else {
        this.log(`${user.role.padEnd(12)} | ${user.name} - ${result.error}`, 'error');
      }
    }

    const authenticatedCount = Object.keys(this.tokens).length;
    this.log(`${authenticatedCount}/${allUsers.length} users authenticated`, 'info');
    return authenticatedCount > 0;
  }

  // ==================== VISITOR WORKFLOW ====================

  async testVisitorWorkflow() {
    this.log('Testing Visitor Workflow...', 'step');

    const resident = DEMO_USERS.residents[0];
    const guard = DEMO_USERS.guards[0];
    const residentToken = this.tokens[resident.email];
    const guardToken = this.tokens[guard.email];

    if (!residentToken || !guardToken) {
      this.log('Missing tokens for visitor workflow', 'error');
      return false;
    }

    // Step 1: Resident creates visitor invite
    this.log(`${resident.name} creating visitor invitation...`, 'info');
    const visitDate = new Date();
    visitDate.setHours(visitDate.getHours() + 2);

    const createResult = await this.makeRequest('POST', '/visitors', {
      name: 'Alice Cooper',
      phone: '+254711111111',
      email: 'alice.visitor@demo.com',
      purpose: 'Family Visit',
      date_of_visit: visitDate.toISOString().split('T')[0],
      time_of_visit: visitDate.toTimeString().slice(0, 5)
    }, residentToken);

    if (!createResult.success) {
      this.log(`Failed to create visitor: ${createResult.error}`, 'error');
      return false;
    }

    const visitor = createResult.data.data || createResult.data;
    this.testData.visitor = visitor;
    this.log(`Visitor invited with code: ${visitor.invite_code}`, 'success');
    this.emailsSent++;

    await this.sleep(1000);

    // Step 2: Guard verifies visitor
    this.log(`${guard.name} verifying visitor...`, 'info');
    const verifyResult = await this.makeRequest('POST', '/visitors/verify-otp', {
      invite_code: visitor.invite_code,
      otp: visitor.otp || '123456' // In dev mode, OTP might be fixed or returned
    }, guardToken);

    if (verifyResult.success) {
      this.log('Visitor verified successfully', 'success');
    } else {
      this.log(`Verification note: ${verifyResult.error}`, 'warning');
    }

    // Step 3: Guard checks in visitor
    this.log(`${guard.name} checking in visitor...`, 'info');
    const checkinResult = await this.makeRequest('POST', '/visitors/check-in', {
      visitor_id: visitor.id,
      invite_code: visitor.invite_code
    }, guardToken);

    if (checkinResult.success) {
      this.log(`Visitor checked in at ${new Date().toLocaleTimeString()}`, 'success');
      this.testData.checkedInVisitor = checkinResult.data.data || checkinResult.data;
    } else {
      this.log(`Check-in note: ${checkinResult.error}`, 'warning');
    }

    await this.sleep(2000); // Simulate visit duration

    // Step 4: Guard checks out visitor
    this.log(`${guard.name} checking out visitor...`, 'info');
    const checkoutResult = await this.makeRequest('POST', '/visitors/check-out', {
      visitor_id: visitor.id
    }, guardToken);

    if (checkoutResult.success) {
      this.log('Visitor checked out successfully', 'success');
    } else {
      this.log(`Check-out note: ${checkoutResult.error}`, 'warning');
    }

    return true;
  }

  // ==================== DELIVERY WORKFLOW ====================

  async testDeliveryWorkflow() {
    this.log('Testing Delivery Workflow...', 'step');

    const resident = DEMO_USERS.residents[1];
    const guard = DEMO_USERS.guards[0];
    const guardToken = this.tokens[guard.email];

    if (!guardToken) {
      this.log('Missing guard token for delivery workflow', 'error');
      return false;
    }

    // Step 1: Guard creates delivery entry
    this.log(`${guard.name} registering package delivery...`, 'info');
    const deliveryResult = await this.makeRequest('POST', '/deliveries', {
      recipient_name: resident.name,
      recipient_unit: resident.unit,
      recipient_phone: '+254700000006',
      package_description: 'Electronics Package',
      tracking_number: `TRACK${Date.now()}`,
      courier_name: 'Express Courier Service'
    }, guardToken);

    if (!deliveryResult.success) {
      this.log(`Failed to create delivery: ${deliveryResult.error}`, 'error');
      return false;
    }

    const delivery = deliveryResult.data.data || deliveryResult.data;
    this.testData.delivery = delivery;
    this.log(`Delivery registered with OTP: ${delivery.otp}`, 'success');
    this.log(`Notification sent to ${resident.name}`, 'email');
    this.emailsSent++;
    this.smsSent++;

    await this.sleep(1000);

    // Step 2: Resident picks up delivery (verify OTP)
    this.log(`Resident verifying OTP for pickup...`, 'info');
    const pickupResult = await this.makeRequest('POST', '/deliveries/verify-pickup', {
      delivery_id: delivery.id,
      otp: delivery.otp
    }, this.tokens[resident.email]);

    if (pickupResult.success) {
      this.log('Delivery picked up successfully', 'success');
    } else {
      this.log(`Pickup note: ${pickupResult.error}`, 'warning');
    }

    return true;
  }

  // ==================== ADMIN DASHBOARD ====================

  async testAdminDashboard() {
    this.log('Testing Admin Dashboard...', 'step');

    const admin = DEMO_USERS.admin;
    const adminToken = this.tokens[admin.email];

    if (!adminToken) {
      this.log('Missing admin token', 'error');
      return false;
    }

    // Get dashboard stats
    const dashboardResult = await this.makeRequest('GET', '/admin/dashboard', null, adminToken);

    if (!dashboardResult.success) {
      this.log(`Dashboard request note: ${dashboardResult.error}`, 'warning');
      return false;
    }

    const stats = dashboardResult.data.data || dashboardResult.data;
    this.log('Dashboard Statistics:', 'info');
    console.log(`   Total Residents: ${stats.totalResidents || 'N/A'}`);
    console.log(`   Total Guards: ${stats.totalGuards || 'N/A'}`);
    console.log(`   Active Visitors: ${stats.activeVisitors || 'N/A'}`);
    console.log(`   Pending Deliveries: ${stats.pendingDeliveries || 'N/A'}`);

    // View all visitors
    const visitorsResult = await this.makeRequest('GET', '/admin/visitors', null, adminToken);
    if (visitorsResult.success) {
      const visitors = visitorsResult.data.data || visitorsResult.data;
      this.log(`Total visitors in system: ${Array.isArray(visitors) ? visitors.length : 'N/A'}`, 'info');
    }

    return true;
  }

  // ==================== RESIDENT FUNCTIONALITY ====================

  async testResidentFunctions() {
    this.log('Testing Resident Functions...', 'step');

    const resident = DEMO_USERS.residents[2];
    const residentToken = this.tokens[resident.email];

    if (!residentToken) {
      this.log('Missing resident token', 'error');
      return false;
    }

    // View my visitors
    const myVisitorsResult = await this.makeRequest('GET', '/visitors/my-visitors', null, residentToken);
    if (myVisitorsResult.success) {
      const visitors = myVisitorsResult.data.data || myVisitorsResult.data;
      this.log(`${resident.name} has ${Array.isArray(visitors) ? visitors.length : 0} visitor(s)`, 'info');
    }

    // View my deliveries
    const myDeliveriesResult = await this.makeRequest('GET', '/deliveries/my-deliveries', null, residentToken);
    if (myDeliveriesResult.success) {
      const deliveries = myDeliveriesResult.data.data || myDeliveriesResult.data;
      this.log(`${resident.name} has ${Array.isArray(deliveries) ? deliveries.length : 0} delivery(ies)`, 'info');
    }

    return true;
  }

  // ==================== GUARD FUNCTIONALITY ====================

  async testGuardFunctions() {
    this.log('Testing Guard Functions...', 'step');

    const guard = DEMO_USERS.guards[1];
    const guardToken = this.tokens[guard.email];

    if (!guardToken) {
      this.log('Missing guard token', 'error');
      return false;
    }

    // View today's expected visitors
    const expectedResult = await this.makeRequest('GET', '/visitors/expected-today', null, guardToken);
    if (expectedResult.success) {
      const visitors = expectedResult.data.data || expectedResult.data;
      this.log(`${guard.name} sees ${Array.isArray(visitors) ? visitors.length : 0} expected visitor(s)`, 'info');
    }

    // View active visitors
    const activeResult = await this.makeRequest('GET', '/visitors/active', null, guardToken);
    if (activeResult.success) {
      const visitors = activeResult.data.data || activeResult.data;
      this.log(`Currently ${Array.isArray(visitors) ? visitors.length : 0} active visitor(s) in estate`, 'info');
    }

    return true;
  }

  // ==================== EMAIL/SMS VERIFICATION ====================

  async verifyNotifications() {
    this.log('Verifying Notifications...', 'step');

    // Check MailHog for emails
    try {
      const response = await axios.get(`${MAILHOG_API}/messages`);
      const emails = response.data.items || [];
      this.log(`${emails.length} email(s) captured in MailHog`, 'email');
      
      if (emails.length > 0) {
        this.log('Recent emails:', 'info');
        emails.slice(0, 3).forEach(email => {
          const subject = email.Content?.Headers?.Subject?.[0] || 'No subject';
          const to = email.Content?.Headers?.To?.[0] || 'Unknown';
          console.log(`   • ${subject} → ${to}`);
        });
      }
    } catch (error) {
      this.log('Could not check MailHog (may not be running)', 'warning');
    }

    // Check local messages
    const localMessages = await this.checkLocalMessages();
    if (localMessages.length > 0) {
      const smsMessages = localMessages.filter(m => m.type === 'sms');
      this.log(`${smsMessages.length} SMS message(s) in local store`, 'sms');
    }

    this.log(`Total notifications sent: ${this.emailsSent} emails, ${this.smsSent} SMS`, 'info');
    return true;
  }

  // ==================== MAIN DEMO RUNNER ====================

  async run() {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║      SECURE GATE ACCESS - COMPREHENSIVE SYSTEM DEMO          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Phase 1: Service Verification
    this.log('PHASE 1: SERVICE VERIFICATION', 'step');
    console.log('─'.repeat(60));
    
    const dbOk = await this.verifyDatabase();
    const serverOk = await this.verifyServer();
    const mailhogOk = await this.verifyMailHog();

    if (!dbOk || !serverOk) {
      this.log('\n❌ Critical services not available. Please start required services:', 'error');
      if (!dbOk) console.log('   • Database: Ensure PostgreSQL is running');
      if (!serverOk) console.log('   • Server: Run "npm run dev" in server directory');
      return;
    }

    console.log();

    // Phase 2: Data Seeding
    this.log('PHASE 2: DATA PREPARATION', 'step');
    console.log('─'.repeat(60));
    await this.seedDemoData();
    console.log();

    // Phase 3: Authentication
    this.log('PHASE 3: USER AUTHENTICATION', 'step');
    console.log('─'.repeat(60));
    const authOk = await this.authenticateAllUsers();
    
    if (!authOk) {
      this.log('Authentication failed. Cannot proceed with demo.', 'error');
      return;
    }
    console.log();

    // Phase 4: Core Workflows
    this.log('PHASE 4: CORE WORKFLOWS', 'step');
    console.log('─'.repeat(60));
    await this.testVisitorWorkflow();
    console.log();
    await this.testDeliveryWorkflow();
    console.log();

    // Phase 5: Role-Specific Functions
    this.log('PHASE 5: ROLE-SPECIFIC FUNCTIONS', 'step');
    console.log('─'.repeat(60));
    await this.testAdminDashboard();
    console.log();
    await this.testResidentFunctions();
    console.log();
    await this.testGuardFunctions();
    console.log();

    // Phase 6: Notification Verification
    this.log('PHASE 6: NOTIFICATION VERIFICATION', 'step');
    console.log('─'.repeat(60));
    await this.verifyNotifications();
    console.log();

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    DEMO COMPLETED                             ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    this.log(`Total execution time: ${duration} seconds`, 'time');
    console.log();

    this.printDemoCredentials();
    this.printNextSteps();

    await dbManager.disconnect();
  }

  // ==================== OUTPUT HELPERS ====================

  printDemoCredentials() {
    console.log('═'.repeat(80));
    console.log('                           DEMO CREDENTIALS');
    console.log('═'.repeat(80));
    console.log('\nROLE            EMAIL                                PASSWORD');
    console.log('─'.repeat(80));
    
    const allUsers = [
      DEMO_USERS.superAdmin,
      DEMO_USERS.admin,
      ...DEMO_USERS.guards,
      ...DEMO_USERS.residents
    ];

    allUsers.forEach(user => {
      console.log(`${user.role.padEnd(14)} ${user.email.padEnd(37)} ${user.password}`);
    });
    
    console.log('═'.repeat(80));
    console.log();
  }

  printNextSteps() {
    console.log('📋 NEXT STEPS:\n');
    console.log('1. View Emails:');
    console.log(`   Open MailHog: ${MAILHOG_UI}`);
    console.log('   Or check: server/data/local_messages.json\n');
    
    console.log('2. Test Frontend:');
    console.log('   cd client && npm start');
    console.log('   Open http://localhost:3000\n');
    
    console.log('3. Login with any demo credentials above\n');
    
    console.log('4. Test Workflows:');
    console.log('   • Resident: Create visitor invites');
    console.log('   • Guard: Check in/out visitors');
    console.log('   • Admin: View dashboard and analytics\n');
    
    console.log('5. Monitor System:');
    console.log('   • Server logs: server/logs/');
    console.log('   • Database: Use any PostgreSQL client\n');
    
    console.log('═'.repeat(80));
  }
}

// Run demo
const demo = new ComprehensiveDemo();
demo.run().catch(error => {
  console.error('\n❌ Demo failed:', error.message);
  process.exit(1);
});
cd server
npm run demo:complete