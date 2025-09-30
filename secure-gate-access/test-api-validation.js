// Test API Contract Validation
import { APIContractValidator } from './server/api-contract-validator.js';

async function runTest() {
  console.log('🚀 Running API Contract Validation Test...\n');
  
  const validator = new APIContractValidator();
  const result = await validator.runValidation();
  
  if (result) {
    console.log('\n✅ API Contract Validation completed successfully!');
  } else {
    console.log('\n❌ API Contract Validation failed');
  }
}

runTest().catch(console.error);