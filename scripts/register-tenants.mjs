import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const url = (process.env.DRUID_MCP_URL || '').replace(/\/+$/, '');
if (!url) { console.error('Set DRUID_MCP_URL (e.g. https://<service>.onrender.com)'); process.exit(1); }
const labels = process.argv.slice(2).map(s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
const envPath = fileURLToPath(new URL('../.env', import.meta.url));

const out = [];
let block = null;
for (const raw of readFileSync(envPath, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
  const line = raw.trim();
  if (line.startsWith('#')) {
    const m = line.match(/^#+\s*(.*?)\s*#*$/);
    if (m && m[1]) block = { label: m[1], id: m[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''), lines: [line] };
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

const res = await fetch(`${url}/mcp`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'register_tenants', arguments: { envText } } })
});
const body = await res.text();
const data = body.includes('data:') ? body.split('\n').filter(l => l.startsWith('data:')).map(l => JSON.parse(l.slice(5))).pop() : JSON.parse(body);
if (data.error) { console.error(JSON.stringify(data.error)); process.exit(1); }
const text = data.result?.content?.map(c => c.text).join('\n') || '';
if (data.result?.isError) { console.error(text); process.exit(1); }
const parsed = JSON.parse(text);
for (const t of (Array.isArray(parsed) ? parsed : [parsed])) console.log(JSON.stringify({ tenant: t.tenant, baseUrl: t.baseUrl, environment: t.environment }));
