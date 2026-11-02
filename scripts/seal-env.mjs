import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { publicEncrypt, randomBytes, createCipheriv, constants } from 'node:crypto';

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const labels = process.argv.slice(2).map(slug);
const publicKey = readFileSync(0, 'utf8').trim();
if (!publicKey.includes('PUBLIC KEY')) { console.error('Pipe the get_registration_key publicKey PEM on stdin'); process.exit(1); }
const envPath = fileURLToPath(new URL('../.env', import.meta.url));

const out = [];
let block = null;
for (const raw of readFileSync(envPath, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
  const line = raw.trim();
  if (line.startsWith('#')) {
    const m = line.match(/^#+\s*(.*?)\s*#*$/);
    if (m && m[1]) block = { id: slug(m[1]), lines: [line] };
    continue;
  }
  if (block && /^API_(BASE_URL|USERNAME|PASSWORD)=/.test(line)) {
    block.lines.push(line);
    if (!out.includes(block)) out.push(block);
  }
}
const chosen = out.filter(b => !labels.length || labels.includes(b.id));
if (!chosen.length) { console.error('No matching tenant blocks'); process.exit(1); }
const envText = chosen.map(b => b.lines.join('\n')).join('\n\n');

const key = randomBytes(32);
const iv = randomBytes(12);
const c = createCipheriv('aes-256-gcm', key, iv);
const d = Buffer.concat([c.update(envText, 'utf8'), c.final()]);
const k = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key);
const sealed = { k: k.toString('base64'), iv: iv.toString('base64'), t: c.getAuthTag().toString('base64'), d: d.toString('base64') };
console.log(Buffer.from(JSON.stringify(sealed)).toString('base64'));
