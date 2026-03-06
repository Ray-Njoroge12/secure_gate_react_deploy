
const fs = require('fs');
const path = require('path');

const filesToTest = [
    '/Users/raynj/Desktop/secure-gate-react-express-fresh/secure-gate-access/client/src/components/Sidebar.jsx',
    '/Users/raynj/Desktop/secure-gate-react-express-fresh/secure-gate-access/client/src/components/collaboration/TeamCoordination.jsx'
];

async function test() {
    for (const file of filesToTest) {
        console.log(`\nAnalyzing ${path.basename(file)}...`);
        const content = fs.readFileSync(file, 'utf-8');
        const nonInteractiveClick = /<div[^>]*onClick=[^>]*>/g;
        let match;
        while ((match = nonInteractiveClick.exec(content)) !== null) {
            const matchString = match[0];
            const hasRole = matchString.includes('role="button"') || matchString.includes('role="presentation"');
            
            console.log(`FOUND DIV WITH ONCLICK:`);
            console.log('--------------------------------------------------');
            console.log(matchString);
            console.log('--------------------------------------------------');
            console.log(`Has role="button" or "presentation"? ${hasRole}`);
            
            if (!hasRole) {
                console.log('❌ FAIL: This block would be flagged as an error.');
            } else {
                console.log('✅ PASS: This block is valid.');
            }
        }
    }
}

test();
