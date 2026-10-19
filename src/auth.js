import fetch from 'node-fetch';
import { createHash } from 'node:crypto';
import { resolveConfig } from './tenants.js';

const tokenCache = new Map();
const pendingAuth = new Map();

export function resetToken() {
  tokenCache.clear();
}

export async function getToken() {
  const { baseUrl, username, password } = resolveConfig();
  const key = `${baseUrl}|${username}|${createHash('sha256').update(String(password)).digest('hex')}`;
  const cached = tokenCache.get(key);
  if (cached && Date.now() < cached.expiry) return cached.token;
  if (pendingAuth.has(key)) return pendingAuth.get(key);

  const p = (async () => {
    const response = await fetch(`${baseUrl}/api/TokenAuth/Authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userNameOrEmailAddress: username,
        password: password,
        rememberClient: false
      })
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const token = data.result?.accessToken;
    if (!token) throw new Error('No accessToken in auth response');
    tokenCache.set(key, { token, expiry: Date.now() + 23 * 60 * 60 * 1000 });
    return token;
  })();

  pendingAuth.set(key, p);
  try {
    return await p;
  } finally {
    pendingAuth.delete(key);
  }
}

export async function apiFetch(path, options = {}) {
  const token = await getToken();
  const { baseUrl } = resolveConfig();

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}
