import { cp, mkdir, rm, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = join(projectRoot, 'node_modules', 'pdfjs-dist');
const targetRoot = join(projectRoot, 'public', 'vendor', 'pdfjs');

const workerSource = join(packageRoot, 'build', 'pdf.worker.min.mjs');
const wasmSource = join(packageRoot, 'wasm');

await rm(targetRoot, { recursive: true, force: true });
await mkdir(join(targetRoot, 'wasm'), { recursive: true });
await copyFile(workerSource, join(targetRoot, 'pdf.worker.min.mjs'));
await cp(wasmSource, join(targetRoot, 'wasm'), { recursive: true });

console.log('Synchronized local PDF.js worker and WASM assets.');
