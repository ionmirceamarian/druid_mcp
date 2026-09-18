export const SAME = '=';

export function normText(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\r\n/g, '\n').trim();
  return s === '' ? null : s;
}

export function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stableJson(value[k])).join(',') + '}';
}

export function parseMeta(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return v;
  const s = String(v).trim();
  if (s === '') return null;
  try { return JSON.parse(s); } catch { return null; }
}

export function metaString(holder) {
  if (!holder) return null;
  if (typeof holder.stringMetadata === 'string' && holder.stringMetadata.trim() !== '') return holder.stringMetadata;
  if (typeof holder.metadata === 'string') return holder.metadata.trim() === '' ? null : holder.metadata;
  if (holder.metadata && typeof holder.metadata === 'object') return JSON.stringify(holder.metadata);
  return null;
}

export function normCode(v) {
  const t = normText(v);
  if (t === null) return null;
  const parsed = parseMeta(t);
  return parsed === null ? t : stableJson(parsed);
}

export function statusOf(defRaw, langRaw, norm) {
  const d = norm(defRaw);
  const l = norm(langRaw);
  if (l === null) return d === null ? null : 'missing';
  if (d === null) return 'extra';
  return l === d ? 'same' : 'differs';
}

export function truncate(v, max) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\r\n/g, '\n');
  if (max > 0 && s.length > max) return s.slice(0, max) + '…[' + s.length + ' chars]';
  return s;
}

export function langCell(defaultCode, otherCodes, defRaw, byLang, norm, max) {
  const cell = {};
  cell[defaultCode] = truncate(defRaw, max);
  for (const code of otherCodes) {
    const st = statusOf(defRaw, byLang[code], norm);
    if (st === null) continue;
    cell[code] = st === 'same' ? SAME : (st === 'missing' ? null : truncate(byLang[code], max));
  }
  return cell;
}

export function languagesOf(list, fallback) {
  const langs = Array.isArray(list) ? list.filter(Boolean) : [];
  let def = (langs.find(l => l.isDefault) || {}).name || fallback || 'en-US';
  const others = langs.map(l => l.name).filter(n => n && n !== def);
  return { defaultCode: def, otherCodes: others };
}

export function setVariablesOf(metaStr) {
  const m = parseMeta(metaStr);
  const list = m && Array.isArray(m.setVariables) ? m.setVariables : [];
  const out = {};
  const order = [];
  for (const v of list) {
    if (!v || v.left === null || v.left === undefined) continue;
    if (!(v.left in out)) order.push(v.left);
    out[v.left] = v.right === undefined ? null : v.right;
  }
  return { values: out, order };
}
