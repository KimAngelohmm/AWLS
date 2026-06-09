/**
 * Loads every .js file under backend/src except server.js (server calls listen()).
 * Run: node scripts/verify-src-modules.js
 */
const fs = require('fs');
const path = require('path');

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.isFile() && ent.name.endsWith('.js') && ent.name !== 'server.js') acc.push(p);
  }
  return acc;
}

const backendRoot = path.join(__dirname, '..');
const srcRoot = path.join(backendRoot, 'src');

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.isFile() && ent.name.endsWith('.js') && ent.name !== 'server.js') acc.push(p);
  }
  return acc;
}

const files = walk(srcRoot).sort();
const failures = [];

for (const file of files) {
  const rel = path.relative(backendRoot, file).split(path.sep).join('/');
  try {
    require(path.join(backendRoot, rel));
  } catch (e) {
    failures.push({ rel, error: e.message });
  }
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, count: files.length, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, loaded: files.length }, null, 2));
process.exit(0);
