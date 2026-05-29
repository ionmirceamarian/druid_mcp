import fetch from 'node-fetch';

let cachedToken = null;
let tokenExpiry = null;

export function resetToken() {
  cachedToken = null;
  tokenExpiry = null;
}

export async function getToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const baseUrl = (process.env.API_BASE_URL || '').replace(/\/+$/, '');
  const username = process.env.API_USERNAME;
  const password = process.env.API_PASSWORD;

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
  cachedToken = data.result?.accessToken;
  // Cache for 23 hours (tokens typically last 24h)
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;

  if (!cachedToken) throw new Error('No accessToken in auth response');
  return cachedToken;
}

export async function apiFetch(path, options = {}) {
  const token = await getToken();
  const baseUrl = (process.env.API_BASE_URL || '').replace(/\/+$/, '');

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
