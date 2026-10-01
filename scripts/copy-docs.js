import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../dist');
const destDir = path.resolve(__dirname, '../docs');

if (!fs.existsSync(srcDir)) {
    console.error('Error: dist/ does not exist. Run "vite build" first.');
    process.exit(1);
}

// Clean and recreate docs/
if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir, { recursive: true });

// Copy dist into docs
fs.cpSync(srcDir, destDir, { recursive: true });

// Create .nojekyll in docs to disable Jekyll on GitHub Pages
fs.writeFileSync(path.join(destDir, '.nojekyll'), '', 'utf-8');

console.log('Successfully mirrored dist/ to docs/ with .nojekyll for GitHub Pages');

