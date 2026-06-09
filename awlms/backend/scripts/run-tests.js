#!/usr/bin/env node
/**
 * Collects *.test.js under backend/test and runs Node's built-in test runner.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function collectTestFiles(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) collectTestFiles(full, acc);
    else if (ent.isFile() && ent.name.endsWith('.test.js')) acc.push(full);
  }
  return acc;
}

const testRoot = path.join(__dirname, '..', 'test');
const files = collectTestFiles(testRoot).sort();

if (files.length === 0) {
  console.error('No *.test.js files found under', testRoot);
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});

process.exit(result.status ?? 1);
