#!/usr/bin/env node
/**
 * Restores awlms/** files from Cursor agent transcript JSONL (tool_use Write payloads).
 * Usage (from backend folder): node scripts/restore-from-transcript.js <path-to.jsonl> [...]
 * Defaults to known transcript paths under ~/.cursor/projects if no args.
 */
const fs = require('fs');
const path = require('path');

/** Project root: awlms/ (parent of backend/) */
const AWLMS_ROOT = path.resolve(__dirname, '..', '..');

function normWin(p) {
  if (!p) return null;
  const s = String(p).replace(/\\/g, '/');
  const lower = s.toLowerCase();
  const marker = '/awlms/';
  const idx = lower.indexOf(marker);
  if (idx >= 0) return s.slice(idx + 1);
  return null;
}

const defaultTranscripts = [
  path.join(
    process.env.USERPROFILE || '',
    '.cursor/projects/c-Users-kiman-OneDrive-Documents-Figma/agent-transcripts/7f7fbe48-cbe4-4abd-885d-daf2c447d2b5/7f7fbe48-cbe4-4abd-885d-daf2c447d2b5.jsonl'
  ),
  path.join(
    process.env.USERPROFILE || '',
    '.cursor/projects/c-Users-kiman-OneDrive-Documents-Figma/agent-transcripts/654e5751-11ea-4090-8d79-6a0c4e423544/654e5751-11ea-4090-8d79-6a0c4e423544.jsonl'
  ),
];

const transcripts = process.argv.slice(2).filter(Boolean);
const files = transcripts.length ? transcripts : defaultTranscripts.filter((f) => fs.existsSync(f));

if (!files.length) {
  console.error('No transcript files found. Pass .jsonl paths as arguments.');
  process.exit(1);
}

const writes = [];
for (const tp of files) {
  for (const line of fs.readFileSync(tp, 'utf8').split(/\n/)) {
    if (!line.trim()) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    const tc = o.message?.content;
    if (!Array.isArray(tc)) continue;
    for (const c of tc) {
      if (c.type !== 'tool_use' || c.name !== 'Write' || !c.input?.path) continue;
      const np = normWin(c.input.path);
      if (!np || !np.startsWith('awlms/')) continue;
      if (typeof c.input.contents !== 'string') continue;
      writes.push({ path: np, contents: c.input.contents });
    }
  }
}

const lastByPath = new Map();
for (const w of writes) lastByPath.set(w.path, w);

for (const [rel, w] of lastByPath) {
  const stripped = rel.replace(/^awlms\//, '');
  const full = path.join(AWLMS_ROOT, ...stripped.split('/'));
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, w.contents, 'utf8');
}

console.log(`Restored ${lastByPath.size} unique files (${writes.length} write events) → ${AWLMS_ROOT}`);
