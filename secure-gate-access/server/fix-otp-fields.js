import fs from 'fs';

const filePath = './tests/visitor.integration.test.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all debug_otp with debugOtp
const updatedContent = content.replace(/debug_otp/g, 'debugOtp');

fs.writeFileSync(filePath, updatedContent);

console.log('✅ Replaced all debug_otp with debugOtp');