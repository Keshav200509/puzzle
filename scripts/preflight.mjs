#!/usr/bin/env node

const required = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

const optional = ['NODE_ENV'];

const hasValue = (value) => Boolean(value && value.trim() && value !== 'undefined' && value !== 'null');
const hasAuthSecret = hasValue(process.env.NEXTAUTH_SECRET) || hasValue(process.env.AUTH_SECRET);

let hasFailure = false;

console.log('== Logic Looper Production Preflight ==');
for (const key of required) {
  const present = hasValue(process.env[key]);
  if (!present) hasFailure = true;
  console.log(`${present ? '✅' : '❌'} ${key}`);
}

console.log(`${hasAuthSecret ? '✅' : '❌'} NEXTAUTH_SECRET or AUTH_SECRET`);
if (!hasAuthSecret) hasFailure = true;

for (const key of optional) {
  const present = hasValue(process.env[key]);
  console.log(`${present ? '✅' : '⚠️'} ${key}${present ? '' : ' (optional)'}`);
}

if (hasFailure) {
  console.log('\nPreflight failed: missing required production environment variables.');
  process.exit(1);
}

console.log('\nPreflight passed.');
