import { readFile } from 'fs/promises';

async function run() {
  try {
    const errorJson = await readFile('mig.err', 'utf8');
    // The file might contain 'DATABASE_URL not set' warning before JSON
    const jsonStart = errorJson.indexOf('{');
    const jsonStr = errorJson.substring(jsonStart);
    const err = JSON.parse(jsonStr);
    
    console.log('--- ERROR DETAILS ---');
    console.log('Message:', err.message);
    console.log('Code:', err.code);
    console.log('Detail:', err.detail);
    console.log('Table:', err.table);
    console.log('Constraint:', err.constraint);
    console.log('Hint:', err.hint);
  } catch (e) {
    console.error('Failed to parse logs:', e);
    // Print raw just in case
    // console.log(await readFile('mig.err', 'utf8'));
  }
}

run();
