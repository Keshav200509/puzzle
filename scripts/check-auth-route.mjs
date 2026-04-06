#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const routePath = resolve(process.cwd(), 'app/api/auth/[...nextauth]/route.ts');
const source = readFileSync(routePath, 'utf8');

const getCount = (source.match(/export\s+async\s+function\s+GET\s*\(/g) ?? []).length;
const postCount = (source.match(/export\s+async\s+function\s+POST\s*\(/g) ?? []).length;

let failed = false;

if (getCount !== 1) {
  console.error(`❌ Expected exactly 1 exported GET handler in ${routePath}, found ${getCount}.`);
  failed = true;
}

if (postCount !== 1) {
  console.error(`❌ Expected exactly 1 exported POST handler in ${routePath}, found ${postCount}.`);
  failed = true;
}

if (/<<<<<<<|=======|>>>>>>>/.test(source)) {
  console.error(`❌ Merge conflict markers detected in ${routePath}.`);
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log('✅ Auth route structural check passed.');
