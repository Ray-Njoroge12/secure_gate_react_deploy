import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appJsPath = path.join(__dirname, 'src/app.js');
const content = fs.readFileSync(appJsPath, 'utf8');
const importLines = content.match(/import .* from ['"](.*)['"];/g);

console.log(`Checking ${importLines.length} imports...`);

importLines.forEach(line => {
  if (line.trim().startsWith('//')) return;
  const match = line.match(/from ['"](.*)['"]/);
  if (match) {
    let importPath = match[1];
    if (importPath.startsWith('.')) {
      const fullPath = path.resolve(__dirname, 'src', importPath);
      if (!fs.existsSync(fullPath) && !fs.existsSync(fullPath + '.js') && !fs.existsSync(fullPath + '/index.js')) {
         console.error(`MISSING: ${importPath} -> ${fullPath}`);
      }
    }
  }
});
