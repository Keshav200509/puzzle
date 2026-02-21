#!/usr/bin/env node

const required = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

const optional = ['NODE_ENV'];

let hasFailure = false;

console.log('== Logic Looper Production Preflight ==');
for (const key of required) {
  const present = Boolean(process.env[key]);
  if (!present) hasFailure = true;
  console.log(`${present ? '✅' : '❌'} ${key}`);
}

for (const key of optional) {
  const present = Boolean(process.env[key]);
  console.log(`${present ? '✅' : '⚠️'} ${key}${present ? '' : ' (optional)'}`);
}

if (hasFailure) {
  console.log('\nPreflight failed: missing required production environment variables.');
  process.exit(1);
}

console.log('\nPreflight passed.');
