const fs = require('fs');
const path = require('path');

const transcripts = [
  path.join(process.env.USERPROFILE, '.cursor/projects/c-Users-kiman-OneDrive-Documents-Figma/agent-transcripts/7f7fbe48-cbe4-4abd-885d-daf2c447d2b5/7f7fbe48-cbe4-4abd-885d-daf2c447d2b5.jsonl'),
  path.join(process.env.USERPROFILE, '.cursor/projects/c-Users-kiman-OneDrive-Documents-Figma/agent-transcripts/654e5751-11ea-4090-8d79-6a0c4e423544/654e5751-11ea-4090-8d79-6a0c4e423544.jsonl'),
];

const figmaRoot = path.join(process.env.USERPROFILE, 'OneDrive', 'Documents', 'Figma');

function normWin(p) {
  if (!p) return null;
  const s = String(p).replace(/\\/g, '/');
  const idx = s.toLowerCase().indexOf('/awlms/');
  if (idx >= 0) return s.slice(idx + 1);
  return null;
}

const map = new Map();
for (const tp of transcripts) {
  if (!fs.existsSync(tp)) continue;
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
      const rel = normWin(c.input.path);
      if (!rel || !rel.startsWith('awlms/')) continue;
      if (typeof c.input.contents !== 'string') continue;
      map.set(rel, c.input.contents);
    }
  }
}

const missing = [];
for (const rel of map.keys()) {
  const full = path.join(figmaRoot, ...rel.split('/'));
  if (!fs.existsSync(full)) missing.push(rel);
}

console.log(JSON.stringify({ transcriptFiles: map.size, missing }, null, 2));
