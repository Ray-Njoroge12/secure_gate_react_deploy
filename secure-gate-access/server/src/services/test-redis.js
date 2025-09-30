// Test script for Redis service with fallback
import RedisService from './redisService.js';

async function testRedisService() {
  console.log('🧪 Testing Redis Service with fallback...\n');

  const redis = new RedisService();
  
  try {
    // Initialize (should fallback to memory cache)
    console.log('1. Initializing Redis service...');
    await redis.initialize();
    
    // Test basic operations
    console.log('\n2. Testing cache operations...');
    
    // Set a value
    console.log('Setting test value...');
    await redis.set('test:key', { message: 'Hello Redis!', timestamp: Date.now() }, 300);
    
    // Get the value
    console.log('Getting test value...');
    const value = await redis.get('test:key');
    console.log('Retrieved value:', value);
    
    // Check if key exists
    console.log('Checking if key exists...');
    const exists = await redis.exists('test:key');
    console.log('Key exists:', exists);
    
    // Delete the key
    console.log('Deleting key...');
    const deleted = await redis.delete('test:key');
    console.log('Key deleted:', deleted);
    
    // Check again
    console.log('Checking if key exists after deletion...');
    const existsAfter = await redis.exists('test:key');
    console.log('Key exists after deletion:', existsAfter);
    
    // Test pattern operations
    console.log('\n3. Testing pattern operations...');
    await redis.set('test:pattern:1', { id: 1 });
    await redis.set('test:pattern:2', { id: 2 });
    await redis.set('test:pattern:3', { id: 3 });
    
    const patternDeleted = await redis.deletePattern('test:pattern:*');
    console.log('Pattern deleted count:', patternDeleted);
    
    // Get stats
    console.log('\n4. Cache statistics:');
    const stats = redis.getStats();
    console.log(JSON.stringify(stats, null, 2));
    
    // Health check
    console.log('\n5. Health check:');
    const health = await redis.healthCheck();
    console.log(JSON.stringify(health, null, 2));
    
    console.log('\n✅ Redis service test completed successfully!');
    
  } catch (error) {
    console.error('❌ Redis service test failed:', error);
  } finally {
    await redis.close();
  }
}

// Run the test
testRedisService().catch(console.error);