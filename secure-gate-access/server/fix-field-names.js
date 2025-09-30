import fs from 'fs';

const filePath = './tests/visitor.integration.test.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all occurrences of inv.invite_code with inv.inviteCode
content = content.replace(/inv\.invite_code/g, 'inv.inviteCode');

fs.writeFileSync(filePath, content);
console.log('✅ Replaced all inv.invite_code with inv.inviteCode');