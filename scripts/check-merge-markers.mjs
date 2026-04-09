#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(['.git', 'node_modules', '.next', 'coverage', 'dist']);
const TEXT_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.css', '.yml', '.yaml']);

const badFiles = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
      continue;
    }

    const dot = entry.lastIndexOf('.');
    const ext = dot >= 0 ? entry.slice(dot) : '';
    if (!TEXT_EXTS.has(ext) && entry !== 'Dockerfile') continue;

    const content = readFileSync(full, 'utf8');
    if (/^(<{7}|={7}|>{7})/m.test(content)) {
      badFiles.push(full.replace(`${ROOT}/`, ''));
    }
  }
}

walk(ROOT);

if (badFiles.length > 0) {
  console.error('❌ Merge conflict markers detected in:');
  for (const file of badFiles) console.error(` - ${file}`);
  process.exit(1);
}

console.log('✅ No merge conflict markers detected.');
