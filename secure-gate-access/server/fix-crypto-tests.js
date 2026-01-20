
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const directory = path.join(__dirname, 'tests');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.js')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

const files = getAllFiles(directory);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.match(/import crypto from 'crypto';/)) {
        console.log(`Fixing ${file}`);
        content = content.replace(/import crypto from 'crypto';/g, "import * as crypto from 'crypto';");
        fs.writeFileSync(file, content, 'utf8');
    }
});
