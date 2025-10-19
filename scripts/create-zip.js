#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');
const packageFile = path.join(rootDir, 'package.json');
const lockFile = path.join(rootDir, 'package-lock.json');

if (!fs.existsSync(distDir)) {
  console.error('No se encontró la carpeta dist. Ejecuta "npm run build" antes de empaquetar.');
  process.exit(1);
}

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir);
}

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-')
  .replace('T', '_')
  .split('Z')[0];

const outputPath = path.join(releaseDir, `texas-holdem-elite_${timestamp}.zip`);
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Paquete generado en ${outputPath} (${archive.pointer()} bytes).`);
});

archive.on('error', (error) => {
  throw error;
});

archive.pipe(output);
archive.directory(distDir, 'texas-holdem-elite');

if (fs.existsSync(packageFile)) {
  archive.file(packageFile, { name: 'texas-holdem-elite/package.json' });
}

if (fs.existsSync(lockFile)) {
  archive.file(lockFile, { name: 'texas-holdem-elite/package-lock.json' });
}

const readmePath = path.join(rootDir, 'README.md');
if (fs.existsSync(readmePath)) {
  archive.file(readmePath, { name: 'texas-holdem-elite/README.md' });
}

archive.finalize();
