import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const label = process.argv[2];
const blob = readFileSync(0, 'utf8').trim();
if (!label || !/^[A-Za-z0-9_-]{20,}$/.test(blob)) { console.error('Usage: node scripts/save-2fa-remember.mjs "<LABEL>" with the rememberBlob on stdin'); process.exit(1); }
const envPath = fileURLToPath(new URL('../.env', import.meta.url));
const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);

let inBlock = false, start = -1, end = -1, existing = -1;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('#')) {
    const m = line.match(/^#+\s*(.*?)\s*#*$/);
    if (m && m[1]) {
      if (inBlock) break;
      inBlock = slug(m[1]) === slug(label);
      if (inBlock) start = i;
    }
    continue;
  }
  if (!inBlock) continue;
  if (/^API_2FA_REMEMBER=/.test(line)) existing = i;
  if (/^API_[A-Z0-9_]+=/.test(line)) end = i;
}
if (start < 0 || end < 0) { console.error(`Block "${label}" not found in .env`); process.exit(1); }
const entry = `API_2FA_REMEMBER=${blob}`;
if (existing >= 0) lines[existing] = entry; else lines.splice(end + 1, 0, entry);
writeFileSync(envPath, lines.join('\n'));
console.log(`${existing >= 0 ? 'Updated' : 'Saved'} API_2FA_REMEMBER for ${label}`);
