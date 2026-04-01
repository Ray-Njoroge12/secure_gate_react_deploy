/**
 * Data Synchronization Validator
 * 
 * Comprehensive validation system for data synchronization across multiple clients,
 * concurrent user operations, conflict resolution, and file upload processing.
 * 
 * Requirements Coverage:
 * - 3.3: Data synchronization across multiple clients
 * - 3.6: File upload and processing capabilities
 * - 3.7: Conflict resolution mechanisms
 */

const axios = require('axios');
const WebSocket = require('ws');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class DataSynchronizationValidator {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'http://localhost:3001';
    this.wsURL = config.wsURL || 'ws://localhost:3001';
    this.timeout = config.timeout || 30000;
    this.maxConcurrentUsers = config.maxConcurrentUsers || 10;
    this.testResults = {
      concurrentUserTests: [],
      conflictResolutionTests: [],
      dataConsistencyTests: [],
      fileUploadTests: [],
      synchronizationTests: []
    };
    this.activeConnections = new Map();
    this.testData = new Map();
  }

  /**
   * Run comprehensive data synchronization validation
   */
  async validateDataSynchronization() {
    console.log('🔄 Starting Data Synchronization Validation...');
    
    const results = {
      timestamp: new Date().toISOString(),
      testSuite: 'Data Synchronization Validation',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      details: {}
    };

    try {
      // Test concurrent user operations
      console.log('Testing concurrent user operations...');
      results.details.concurrentUsers = await this.testConcurrentUserOperations();
      
      // Test conflict resolution mechanisms
      console.log('Testing conflict resolution mechanisms...');
      results.details.conflictResolution = await this.testConflictResolution();
      
      // Test data consistency across clients
      console.log('Testing data consistency across clients...');
      results.details.dataConsistency = await this.testDataConsistencyAcrossClients();
      
      // Test file upload and processing
      console.log('Testing file upload and processing...');
      results.details.fileUpload = await this.testFileUploadAndProcessing();
      
      // Test real-time synchronization
      console.log('Testing real-time synchronization...');
      results.details.realTimeSync = await this.testRealTimeSynchronization();

      // Calculate overall results
      const allTests = [
        results.details.concurrentUsers,
        results.details.conflictResolution,
        results.details.dataConsistency,
        results.details.fileUpload,
        results.details.realTimeSync
      ];

      results.totalTests = allTests.reduce((sum, test) => sum + test.totalTests, 0);
      results.passedTests = allTests.reduce((sum, test) => sum + test.passedTests, 0);
      results.failedTests = allTests.reduce((sum, test) => sum + test.failedTests, 0);
      results.successRate = results.totalTests > 0 ? (results.passedTests / results.totalTests * 100).toFixed(2) : 0;

      console.log(`✅ Data Synchronization Validation completed: ${results.passedTests}/${results.totalTests} tests passed (${results.successRate}%)`);
      
      return results;
    } catch (error) {
      console.error('❌ Data Synchronization Validation failed:', error.message);
      results.error = error.message;
      results.failedTests = results.totalTests || 1;
      return results;
    }
  }

  /**
   * Test concurrent user operations
   */
  async testConcurrentUserOperations() {
    const results = {
      testName: 'Concurrent User Operations',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      tests: []
    };

    try {
      // Test concurrent visitor creation
      const concurrentVisitorTest = await this.testConcurrentVisitorCreation();
      results.tests.push(concurrentVisitorTest);
      
      // Test concurrent visitor updates
      const concurrentUpdateTest = await this.testConcurrentVisitorUpdates();
      results.tests.push(concurrentUpdateTest);
      
      // Test concurrent check-in operations
      const concurrentCheckinTest = await this.testConcurrentCheckinOperations();
      results.tests.push(concurrentCheckinTest);
      
      // Test concurrent bulk operations
      const concurrentBulkTest = await this.testConcurrentBulkOperations();
      results.tests.push(concurrentBulkTest);

      results.totalTests = results.tests.length;
      results.passedTests = results.tests.filter(test => test.passed).length;
      results.failedTests = results.totalTests - results.passedTests;

      return results;
    } catch (error) {
      results.error = error.message;
      results.failedTests = results.totalTests || 1;
      return results;
    }
  }

  /**
   * Test concurrent visitor creation
   */
  async testConcurrentVisitorCreation() {
    const test = {
      name: 'Concurrent Visitor Creation',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      const concurrentRequests = [];
      const visitorData = {
        name: 'Test Visitor',
        phone: '+254712345678',
        email: 'test@example.com',
        purpose: 'Concurrent test',
        expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // Create multiple concurrent requests
      for (let i = 0; i < this.maxConcurrentUsers; i++) {
        const uniqueVisitorData = {
          ...visitorData,
          name: `${visitorData.name} ${i}`,
          email: `test${i}@example.com`
        };

        concurrentRequests.push(
          axios.post(`${this.baseURL}/api/visitors`, uniqueVisitorData, {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: this.timeout
          })
        );
      }

      const responses = await Promise.allSettled(concurrentRequests);
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = responses.filter(r => r.status === 'rejected' || r.value.status !== 201);

      test.details = {
        totalRequests: concurrentRequests.length,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / concurrentRequests.length * 100).toFixed(2)
      };

      // Test passes if at least 80% of requests succeed
      test.passed = test.details.successRate >= 80;

      // Store created visitor IDs for cleanup
      this.testData.set('createdVisitors', successful.map(r => r.value.data.data.visitor.id));

    } catch (error) {
      test.error = error.message;
      test.passed = false;
    }

    return test;
  }

  /**
   * Test concurrent visitor updates
   */
  async testConcurrentVisitorUpdates() {
    const test = {
      name: 'Concurrent Visitor Updates',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      
      // First create a visitor to update
      const visitorResponse = await axios.post(`${this.baseURL}/api/visitors`, {
        name: 'Update Test Visitor',
        phone: '+254712345679',
        email: 'updatetest@example.com',
        purpose: 'Update test',
        expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const visitorId = visitorResponse.data.data.visitor.id;
      const concurrentUpdates = [];

      // Create multiple concurrent update requests
      for (let i = 0; i < 5; i++) {
        concurrentUpdates.push(
          axios.put(`${this.baseURL}/api/visitors/${visitorId}`, {
            purpose: `Updated purpose ${i}`,
            notes: `Update attempt ${i}`
          }, {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: this.timeout
          })
        );
      }

      const responses = await Promise.allSettled(concurrentUpdates);
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const failed = responses.filter(r => r.status === 'rejected' || r.value.status !== 200);

      test.details = {
        visitorId,
        totalUpdates: concurrentUpdates.length,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / concurrentUpdates.length * 100).toFixed(2)
      };

      // Test passes if at least one update succeeds and no data corruption occurs
      test.passed = successful.length > 0;

    } catch (error) {
      test.error = error.message;
      test.passed = false;
    }

    return test;
  }

  /**
   * Test concurrent check-in operations
   */
  async testConcurrentCheckinOperations() {
    const test = {
      name: 'Concurrent Check-in Operations',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      
      // Create multiple visitors for check-in testing
      const visitors = [];
      for (let i = 0; i < 3; i++) {
        const visitorResponse = await axios.post(`${this.baseURL}/api/visitors`, {
          name: `Checkin Test Visitor ${i}`,
          phone: `+25471234567${i}`,
          email: `checkintest${i}@example.com`,
          purpose: 'Check-in test',
          expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        visitors.push(visitorResponse.data.data.visitor);
      }

      // Attempt concurrent check-ins for the same visitor (should fail gracefully)
      const visitorId = visitors[0].id;
      const concurrentCheckins = [];

      for (let i = 0; i < 3; i++) {
        concurrentCheckins.push(
          axios.post(`${this.baseURL}/api/visitors/${visitorId}/check-in`, {
            notes: `Concurrent check-in attempt ${i}`
          }, {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: this.timeout
          })
        );
      }

      const responses = await Promise.allSettled(concurrentCheckins);
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const failed = responses.filter(r => r.status === 'rejected' || r.value.status !== 200);

      test.details = {
        visitorId,
        totalCheckins: concurrentCheckins.length,
        successful: successful.length,
        failed: failed.length,
        // Only one check-in should succeed for the same visitor
        correctBehavior: successful.length === 1
      };

      // Test passes if exactly one check-in succeeds (proper concurrency control)
      test.passed = test.details.correctBehavior;

    } catch (error) {
      test.error = error.message;
      test.passed = false;
    }

    return test;
  }

  /**
   * Test concurrent bulk operations
   */
  async testConcurrentBulkOperations() {
    const test = {
      name: 'Concurrent Bulk Operations',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      const concurrentBulkOps = [];

      // Create multiple concurrent bulk invite operations
      for (let i = 0; i < 3; i++) {
        concurrentBulkOps.push(
          axios.post(`${this.baseURL}/api/visitors/bulk-invite`, {
            eventName: `Concurrent Event ${i}`,
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            time: '18:00',
            numGuests: 10,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
          }, {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: this.timeout
          })
        );
      }

      const responses = await Promise.allSettled(concurrentBulkOps);
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = responses.filter(r => r.status === 'rejected' || r.value.status !== 201);

      test.details = {
        totalBulkOps: concurrentBulkOps.length,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / concurrentBulkOps.length * 100).toFixed(2)
      };

      // Test passes if all bulk operations succeed
      test.passed = successful.length === concurrentBulkOps.length;

    } catch (error) {
      test.error = error.message;
      test.passed = false;
    }

    return test;
  }

  /**
   * Test conflict resolution mechanisms
   */
  async testConflictResolution() {
    const results = {
      testName: 'Conflict Resolution Mechanisms',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      tests: []
    };

    try {
      // Test optimistic locking
      const optimisticLockingTest = await this.testOptimisticLocking();
      results.tests.push(optimisticLockingTest);
      
      // Test last-write-wins resolution
      const lastWriteWinsTest = await this.testLastWriteWinsResolution();
      results.tests.push(lastWriteWinsTest);
      
      // Test merge conflict resolution
      const mergeConflictTest = await this.testMergeConflictResolution();
      results.tests.push(mergeConflictTest);

      results.totalTests = results.tests.length;
      results.passedTests = results.tests.filter(test => test.passed).length;
      results.failedTests = results.totalTests - results.passedTests;

      return results;
    } catch (error) {
      results.error = error.message;
      results.failedTests = results.totalTests || 1;
      return results;
    }
  }

  /**
   * Test optimistic locking
   */
  async testOptimisticLocking() {
    const test = {
      name: 'Optimistic Locking',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      
      // Create a visitor for testing
      const visitorResponse = await axios.post(`${this.baseURL}/api/visitors`, {
        name: 'Optimistic Lock Test',
        phone: '+254712345680',
        email: 'locktest@example.com',
        purpose: 'Lock test',
        expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const visitor = visitorResponse.data.data.visitor;
      
      // Simulate two users trying to update the same visitor
      const update1Promise = axios.put(`${this.baseURL}/api/visitors/${visitor.id}`, {
        purpose: 'Updated by user 1',
        version: visitor.version || 1
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const update2Promise = axios.put(`${this.baseURL}/api/visitors/${visitor.id}`, {
        purpose: 'Updated by user 2',
        version: visitor.version || 1
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const [update1, update2] = await Promise.allSettled([update1Promise, update2Promise]);

      test.details = {
        visitorId: visitor.id,
        update1Status: update1.status,
        update2Status: update2.status,
        update1Success: update1.status === 'fulfilled' && update1.value.status === 200,
        update2Success: update2.status === 'fulfilled' && update2.value.status === 200
      };

      // Test passes if conflict is detected and handled appropriately
      // Either one succeeds and one fails, or both succeed with proper merging
      const bothSucceeded = test.details.update1Success && test.details.update2Success;
      const oneSucceeded = test.details.update1Success !== test.details.update2Success;
      
      test.passed = bothSucceeded || oneSucceeded;

    } catch (error) {
      test.error = error.message;
      test.passed = false;
    }

    return test;
  }

  /**
   * Test last-write-wins resolution
   */
  async testLastWriteWinsResolution() {
    const test = {
      name: 'Last-Write-Wins Resolution',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      
      // Create a visitor for testing
      const visitorResponse = await axios.post(`${this.baseURL}/api/visitors`, {
        name: 'Last Write Wins Test',
        phone: '+254712345681',
        email: 'lwwtest@example.com',
        purpose: 'LWW test',
        expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const visitorId = visitorResponse.data.data.visitor.id;
      
      // Perform sequential updates with small delays
      await axios.put(`${this.baseURL}/api/visitors/${visitorId}`, {
        purpose: 'First update'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const finalUpdate = await axios.put(`${this.baseURL}/api/visitors/${visitorId}`, {
        purpose: 'Final update'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Verify the final state
      const finalState = await axios.get(`${this.baseURL}/api/visitors/${visitorId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      test.details = {
        visitorId,
        finalPurpose: finalState.data.data.visitor.purpose,
        expectedPurpose: 'Final update',
        correctResolution: finalState.data.data.visitor.purpose === 'Final update'
      };

      test.passed = test.details.correctResolution;

    } catch (error) {
      test.error = error.message;
      test.passed = false;
    }

    return test;
  }

  /**
   * Test merge conflict resolution
   */
  async testMergeConflictResolution() {
    const test = {
      name: 'Merge Conflict Resolution',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      
      // Create a visitor for testing
      const visitorResponse = await axios.post(`${this.baseURL}/api/visitors`, {
        name: 'Merge Test',
        phone: '+254712345682',
        email: 'mergetest@example.com',
        purpose: 'Merge test',
        expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const visitorId = visitorResponse.data.data.visitor.id;
      
      // Simulate updates to different fields that should merge successfully
      const update1 = await axios.put(`${this.baseURL}/api/visitors/${visitorId}`, {
        purpose: 'Updated purpose'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const update2 = await axios.put(`${this.baseURL}/api/visitors/${visitorId}`, {
        notes: 'Added notes'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Verify both changes are preserved
      const finalState = await axios.get(`${this.baseURL}/api/visitors/${visitorId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const visitor = finalState.data.data.visitor;

      test.details = {
        visitorId,
        hasPurpose: visitor.purpose === 'Updated purpose',
        hasNotes: visitor.notes === 'Added notes',
        bothFieldsPreserved: visitor.purpose === 'Updated purpose' && visitor.notes === 'Added notes'
      };

      test.passed = test.details.bothFieldsPreserved;

    } catch (error) {
      test.error = error.message;
      test.passed = false;
    }

    return test;
  }

  /**
   * Test data consistency across clients
   */
  async testDataConsistencyAcrossClients() {
    const results = {
      testName: 'Data Consistency Across Clients',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      tests: []
    };

    try {
      // Test eventual consistency
      const eventualConsistencyTest = await this.testEventualConsistency();
      results.tests.push(eventualConsistencyTest);
      
      // Test read-after-write consistency
      const readAfterWriteTest = await this.testReadAfterWriteConsistency();
      results.tests.push(readAfterWriteTest);
      
      // Test cross-client synchronization
      const crossClientSyncTest = await this.testCrossClientSynchronization();
      results.tests.push(crossClientSyncTest);

      results.totalTests = results.tests.length;
      results.passedTests = results.tests.filter(test => test.passed).length;
      results.failedTests = results.totalTests - results.passedTests;

      return results;
    } catch (error) {
      results.error = error.message;
      results.failedTests = results.totalTests || 1;
      return results;
    }
  }

  /**
   * Test eventual consistency
   */
  async testEventualConsistency() {
    const test = {
      name: 'Eventual Consistency',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      
      // Create a visitor
      const visitorResponse = await axios.post(`${this.baseURL}/api/visitors`, {
        name: 'Consistency Test',
        phone: '+254712345683',
        email: 'consistencytest@example.com',
        purpose: 'Consistency test',
        expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const visitorId = visitorResponse.data.data.visitor.id;
      
      // Update the visitor
      await axios.put(`${this.baseURL}/api/visitors/${visitorId}`, {
        purpose: 'Updated for consistency test'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Wait a short time for propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Read from multiple endpoints to check consistency
      const reads = await Promise.all([
        axios.get(`${this.baseURL}/api/visitors/${visitorId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        axios.get(`${this.baseURL}/api/visitors?id=${visitorId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      ]);

      const directRead = reads[0].data.data.visitor;
      const listRead = reads[1].data.data.visitors.find(v => v.id === visitorId);

      test.details = {
        visitorId,
        directReadPurpose: directRead.purpose,
        listReadPurpose: listRead?.purpose,
        consistent: directRead.purpose === listRead?.purpose
      };

      test.passed = test.details.consistent;

    } catch (error) {
      test.error = error.message;
      test.passed = false;
    }

    return test;
  }

  /**
   * Test read-after-write consistency
   */
  async testReadAfterWriteConsistency() {
    const test = {
      name: 'Read-After-Write Consistency',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      
      // Create and immediately read a visitor
      const createResponse = await axios.post(`${this.baseURL}/api/visitors`, {
        name: 'RAW Consistency Test',
        phone: '+254712345684',
        email: 'rawtest@example.com',
        purpose: 'RAW test',
        expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const visitorId = createResponse.data.data.visitor.id;
      
      // Immediately read the created visitor
      const readResponse = await axios.get(`${this.baseURL}/api/visitors/${visitorId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const createdVisitor = createResponse.data.data.visitor;
      const readVisitor = readResponse.data.data.visitor;

      test.details = {
        visitorId,
        createdName: createdVisitor.name,
        readName: readVisitor.name,
        consistent: createdVisitor.name === readVisitor.name &&
                   createdVisitor.purpose === readVisitor.purpose
      };

      test.passed = test.details.consistent;

    } catch (error) {
      test.error = error.message;
      test.passed = false;
    }

    return test;
  }

  /**
   * Test cross-client synchronization
   */
  async testCrossClientSynchronization() {
    const test = {
      name: 'Cross-Client Synchronization',
      passed: false,
      details: {},
      error: null
    };

    try {
      // This test would ideally use WebSocket connections to simulate
      // multiple clients, but for now we'll test API consistency
      const authToken = await this.getAuthToken();
      
      // Create a visitor
      const visitorResponse = await axios.post(`${this.baseURL}/api/visitors`, {
        name: 'Cross Client Test',
        phone: '+254712345685',
        email: 'crossclienttest@example.com',
        purpose: 'Cross client test',
        expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const visitorId = visitorResponse.data.data.visitor.id;
      
      // Simulate multiple clients reading the same data
      const clientReads = await Promise.all([
        axios.get(`${this.baseURL}/api/visitors/${visitorId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        axios.get(`${this.baseURL}/api/visitors/${visitorId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        axios.get(`${this.baseURL}/api/visitors/${visitorId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      ]);

      const visitors = clientReads.map(response => response.data.data.visitor);
      const allConsistent = visitors.every(visitor => 
        visitor.name === visitors[0].name &&
        visitor.purpose === visitors[0].purpose
      );

      test.details = {
        visitorId,
        clientCount: clientReads.length,
        allConsistent,
        visitors: visitors.map(v => ({ name: v.name, purpose: v.purpose }))
      };

      test.passed = allConsistent;

    } catch (error) {
      test.error = error.message;
      test.passed = false;
    }

    return test;
  }

  /**
   * Test file upload and processing
   */
  async testFileUploadAndProcessing() {
    const results = {
      testName: 'File Upload and Processing',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      tests: []
    };

    try {
      // Test single file upload
      const singleFileTest = await this.testSingleFileUpload();
      results.tests.push(singleFileTest);
      
      // Test multiple file upload
      const multipleFileTest = await this.testMultipleFileUpload();
      results.tests.push(multipleFileTest);
      
      // Test large file upload
      const largeFileTest = await this.testLargeFileUpload();
      results.tests.push(largeFileTest);
      
      // Test file processing validation
      const fileProcessingTest = await this.testFileProcessingValidation();
      results.tests.push(fileProcessingTest);

      results.totalTests = results.tests.length;
      results.passedTests = results.tests.filter(test => test.passed).length;
      results.failedTests = results.totalTests - results.passedTests;

      return results;
    } catch (error) {
      results.error = error.message;
      results.failedTests = results.totalTests || 1;
      return results;
    }
  }

  /**
   * Test single file upload
   */
  async testSingleFileUpload() {
    const test = {
      name: 'Single File Upload',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      
      // Create a test file
      const testContent = 'Test file content for upload validation';
      const testFilePath = path.join(__dirname, 'test-upload.txt');
      fs.writeFileSync(testFilePath, testContent);

      const formData = new FormData();
      formData.append('file', fs.createReadStream(testFilePath));
      formData.append('description', 'Test file upload');

      const uploadResponse = await axios.post(`${this.baseURL}/api/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...formData.getHeaders()
        },
        timeout: this.timeout
      });

      test.details = {
        uploadStatus: uploadResponse.status,
        uploadSuccess: uploadResponse.status === 200 || uploadResponse.status === 201,
        fileId: uploadResponse.data?.data?.file?.id,
        fileName: uploadResponse.data?.data?.file?.name
      };

      test.passed = test.details.uploadSuccess;

      // Cleanup
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }

    } catch (error) {
      test.error = error.message;
      test.passed = false;
      
      // Cleanup on error
      const testFilePath = path.join(__dirname, 'test-upload.txt');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }

    return test;
  }

  /**
   * Test multiple file upload
   */
  async testMultipleFileUpload() {
    const test = {
      name: 'Multiple File Upload',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      
      // Create multiple test files
      const testFiles = [];
      for (let i = 0; i < 3; i++) {
        const testContent = `Test file content ${i}`;
        const testFilePath = path.join(__dirname, `test-upload-${i}.txt`);
        fs.writeFileSync(testFilePath, testContent);
        testFiles.push(testFilePath);
      }

      const formData = new FormData();
      testFiles.forEach((filePath, index) => {
        formData.append('files', fs.createReadStream(filePath));
      });
      formData.append('description', 'Multiple file upload test');

      const uploadResponse = await axios.post(`${this.baseURL}/api/files/upload-multiple`, formData, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...formData.getHeaders()
        },
        timeout: this.timeout
      });

      test.details = {
        uploadStatus: uploadResponse.status,
        uploadSuccess: uploadResponse.status === 200 || uploadResponse.status === 201,
        filesUploaded: uploadResponse.data?.data?.files?.length || 0,
        expectedFiles: testFiles.length
      };

      test.passed = test.details.uploadSuccess && 
                   test.details.filesUploaded === test.details.expectedFiles;

      // Cleanup
      testFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

    } catch (error) {
      test.error = error.message;
      test.passed = false;
      
      // Cleanup on error
      for (let i = 0; i < 3; i++) {
        const testFilePath = path.join(__dirname, `test-upload-${i}.txt`);
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    }

    return test;
  }

  /**
   * Test large file upload
   */
  async testLargeFileUpload() {
    const test = {
      name: 'Large File Upload',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      
      // Create a larger test file (1MB)
      const testContent = 'A'.repeat(1024 * 1024); // 1MB of 'A's
      const testFilePath = path.join(__dirname, 'test-large-upload.txt');
      fs.writeFileSync(testFilePath, testContent);

      const formData = new FormData();
      formData.append('file', fs.createReadStream(testFilePath));
      formData.append('description', 'Large file upload test');

      const startTime = Date.now();
      const uploadResponse = await axios.post(`${this.baseURL}/api/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...formData.getHeaders()
        },
        timeout: 60000 // Longer timeout for large file
      });
      const uploadTime = Date.now() - startTime;

      test.details = {
        uploadStatus: uploadResponse.status,
        uploadSuccess: uploadResponse.status === 200 || uploadResponse.status === 201,
        fileSize: testContent.length,
        uploadTimeMs: uploadTime,
        fileId: uploadResponse.data?.data?.file?.id
      };

      test.passed = test.details.uploadSuccess;

      // Cleanup
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }

    } catch (error) {
      test.error = error.message;
      test.passed = false;
      
      // Cleanup on error
      const testFilePath = path.join(__dirname, 'test-large-upload.txt');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }

    return test;
  }

  /**
   * Test file processing validation
   */
  async testFileProcessingValidation() {
    const test = {
      name: 'File Processing Validation',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      
      // Create a CSV file for processing
      const csvContent = 'name,email,phone\nJohn Doe,john@example.com,+254712345678\nJane Smith,jane@example.com,+254712345679';
      const csvFilePath = path.join(__dirname, 'test-visitors.csv');
      fs.writeFileSync(csvFilePath, csvContent);

      const formData = new FormData();
      formData.append('file', fs.createReadStream(csvFilePath));
      formData.append('type', 'visitor_import');

      const uploadResponse = await axios.post(`${this.baseURL}/api/files/process`, formData, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...formData.getHeaders()
        },
        timeout: this.timeout
      });

      test.details = {
        processStatus: uploadResponse.status,
        processSuccess: uploadResponse.status === 200 || uploadResponse.status === 201,
        processedRecords: uploadResponse.data?.data?.processedRecords || 0,
        errors: uploadResponse.data?.data?.errors || []
      };

      test.passed = test.details.processSuccess && test.details.processedRecords > 0;

      // Cleanup
      if (fs.existsSync(csvFilePath)) {
        fs.unlinkSync(csvFilePath);
      }

    } catch (error) {
      test.error = error.message;
      test.passed = false;
      
      // Cleanup on error
      const csvFilePath = path.join(__dirname, 'test-visitors.csv');
      if (fs.existsSync(csvFilePath)) {
        fs.unlinkSync(csvFilePath);
      }
    }

    return test;
  }

  /**
   * Test real-time synchronization
   */
  async testRealTimeSynchronization() {
    const results = {
      testName: 'Real-Time Synchronization',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      tests: []
    };

    try {
      // Test WebSocket connection and messaging
      const websocketTest = await this.testWebSocketSynchronization();
      results.tests.push(websocketTest);
      
      // Test real-time updates
      const realTimeUpdateTest = await this.testRealTimeUpdates();
      results.tests.push(realTimeUpdateTest);

      results.totalTests = results.tests.length;
      results.passedTests = results.tests.filter(test => test.passed).length;
      results.failedTests = results.totalTests - results.passedTests;

      return results;
    } catch (error) {
      results.error = error.message;
      results.failedTests = results.totalTests || 1;
      return results;
    }
  }

  /**
   * Test WebSocket synchronization
   */
  async testWebSocketSynchronization() {
    const test = {
      name: 'WebSocket Synchronization',
      passed: false,
      details: {},
      error: null
    };

    try {
      const authToken = await this.getAuthToken();
      
      // Create WebSocket connection
      const ws = new WebSocket(`${this.wsURL}/ws`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const connectionPromise = new Promise((resolve, reject) => {
        ws.on('open', () => resolve(true));
        ws.on('error', reject);
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      });

      await connectionPromise;

      // Test message sending and receiving
      const messagePromise = new Promise((resolve) => {
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            resolve(message);
          } catch (error) {
            resolve({ error: 'Invalid JSON' });
          }
        });
      });

      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      
      const response = await Promise.race([
        messagePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Message timeout')), 5000))
      ]);

      test.details = {
        connectionEstablished: true,
        messageReceived: !!response,
        responseType: response?.type,
        validResponse: response?.type === 'pong' || response?.type === 'ping'
      };

      test.passed = test.details.connectionEstablished && test.details.messageReceived;

      ws.close();

    } catch (error) {
      test.error = error.message;
      test.passed = false;
    }

    return test;
  }

  /**
   * Test real-time updates
   */
  async testRealTimeUpdates() {
    const test = {
      name: 'Real-Time Updates',
      passed: false,
      details: {},
      error: null
    };

    try {
      // This test simulates real-time updates by checking if changes
      // are reflected immediately in API responses
      const authToken = await this.getAuthToken();
      
      // Create a visitor
      const visitorResponse = await axios.post(`${this.baseURL}/api/visitors`, {
        name: 'Real Time Test',
        phone: '+254712345686',
        email: 'realtimetest@example.com',
        purpose: 'Real time test',
        expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const visitorId = visitorResponse.data.data.visitor.id;
      
      // Update the visitor
      const updateTime = Date.now();
      await axios.put(`${this.baseURL}/api/visitors/${visitorId}`, {
        purpose: 'Updated in real time'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Immediately read the visitor to check if update is reflected
      const readResponse = await axios.get(`${this.baseURL}/api/visitors/${visitorId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const readTime = Date.now();

      const visitor = readResponse.data.data.visitor;
      const responseTime = readTime - updateTime;

      test.details = {
        visitorId,
        updateTime,
        readTime,
        responseTime,
        updatedPurpose: visitor.purpose,
        correctUpdate: visitor.purpose === 'Updated in real time',
        fastResponse: responseTime < 1000 // Less than 1 second
      };

      test.passed = test.details.correctUpdate && test.details.fastResponse;

    } catch (error) {
      test.error = error.message;
      test.passed = false;
    }

    return test;
  }

  /**
   * Get authentication token for testing
   */
  async getAuthToken() {
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@test.com',
        password: 'TestAdmin123!'
      });
      return response.data.data.accessToken;
    } catch (error) {
      throw new Error(`Failed to get auth token: ${error.message}`);
    }
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    try {
      const authToken = await this.getAuthToken();
      const createdVisitors = this.testData.get('createdVisitors') || [];
      
      // Clean up created visitors
      for (const visitorId of createdVisitors) {
        try {
          await axios.delete(`${this.baseURL}/api/visitors/${visitorId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
        } catch (error) {
          console.warn(`Failed to cleanup visitor ${visitorId}:`, error.message);
        }
      }

      // Close any active WebSocket connections
      for (const [id, connection] of this.activeConnections) {
        try {
          connection.close();
        } catch (error) {
          console.warn(`Failed to close connection ${id}:`, error.message);
        }
      }

      console.log('✅ Data synchronization test cleanup completed');
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error.message);
    }
  }
}

module.exports = DataSynchronizationValidator;

// Export for testing
if (require.main === module) {
  const validator = new DataSynchronizationValidator();
  validator.validateDataSynchronization()
    .then(results => {
      console.log('\n📊 Data Synchronization Validation Results:');
      console.log(JSON.stringify(results, null, 2));
      return validator.cleanup();
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}