const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../public');
const outFile = path.join(outDir, 'touchheat.min.js');

// Ensure public directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

esbuild
  .build({
    entryPoints: [path.join(__dirname, '../snippet/src/snippet.ts')],
    bundle: true,
    minify: true,
    format: 'iife',
    outfile: outFile,
    target: ['es2015'],
    legalComments: 'none',
    treeShaking: true,
  })
  .then(() => {
    const stats = fs.statSync(outFile);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`✓ Built touchheat.min.js (${sizeKB} KB)`);
    
    if (stats.size > 5 * 1024) {
      console.warn(`⚠ Warning: Snippet size (${sizeKB} KB) exceeds 5KB target`);
    }
  })
  .catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });

