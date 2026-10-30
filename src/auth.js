import fetch from 'node-fetch';
import { createHash } from 'node:crypto';
import { resolveConfig } from './tenants.js';

const tokenCache = new Map();
const pendingAuth = new Map();
const rememberTokens = new Map();
const twoFactorPending = new Map();
const RESEND_AFTER_MS = 3 * 60 * 1000;

export function resetToken() {
  tokenCache.clear();
}

function authKey(cfg) {
  return `${cfg.baseUrl}|${cfg.username}|${createHash('sha256').update(String(cfg.password)).digest('hex')}`;
}

async function authenticate(cfg, key, extra = {}) {
  const response = await fetch(`${cfg.baseUrl}/api/TokenAuth/Authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userNameOrEmailAddress: cfg.username,
      password: cfg.password,
      rememberClient: true,
      twoFactorRememberClientToken: rememberTokens.get(key) || null,
      ...extra
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth failed: ${response.status} ${response.statusText} ${text}`);
  }

  const data = await response.json();
  return data.result || {};
}

function storeToken(key, result) {
  if (!result.accessToken) throw new Error('No accessToken in auth response');
  if (result.twoFactorRememberClientToken) rememberTokens.set(key, result.twoFactorRememberClientToken);
  twoFactorPending.delete(key);
  tokenCache.set(key, { token: result.accessToken, expiry: Date.now() + 23 * 60 * 60 * 1000 });
  return result.accessToken;
}

async function requestSecondFactor(cfg, key, result) {
  const label = cfg.id || cfg.baseUrl;
  if (result.requiresTwoFactorAuthenticator) {
    throw new Error(`User ${cfg.username} on ${label} must first set up an authenticator app in the Druid portal before the MCP can log in.`);
  }
  const providers = result.twoFactorAuthProviders || [];
  const usesApp = providers.includes('GoogleAuthenticator');
  const provider = usesApp ? 'GoogleAuthenticator' : providers[0];
  const prev = twoFactorPending.get(key);

  if (!usesApp && provider && !(prev && Date.now() - prev.sentAt < RESEND_AFTER_MS)) {
    const res = await fetch(`${cfg.baseUrl}/api/TokenAuth/SendTwoFactorAuthCode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: result.userId, provider })
    });
    if (!res.ok) throw new Error(`SendTwoFactorAuthCode failed: ${res.status} ${await res.text()}`);
    twoFactorPending.set(key, { provider, sentAt: Date.now() });
  } else if (!prev) {
    twoFactorPending.set(key, { provider, sentAt: Date.now() });
  }

  const how = usesApp ? 'Get the current code from the authenticator app' : `A code was sent via ${provider}`;
  throw new Error(`Two-factor verification required for ${cfg.username} on ${label}. ${how}, then call verify_two_factor with "code" and the same tenant.`);
}

export async function getToken() {
  const cfg = resolveConfig();
  const key = authKey(cfg);
  const cached = tokenCache.get(key);
  if (cached && Date.now() < cached.expiry) return cached.token;
  if (pendingAuth.has(key)) return pendingAuth.get(key);

  const p = (async () => {
    const result = await authenticate(cfg, key);
    if (result.requiresTwoFactorVerification || result.requiresTwoFactorAuthenticator) {
      await requestSecondFactor(cfg, key, result);
    }
    return storeToken(key, result);
  })();

  pendingAuth.set(key, p);
  try {
    return await p;
  } finally {
    pendingAuth.delete(key);
  }
}

export const verifyTwoFactorTool = {
  name: 'verify_two_factor',
  description:
    'Complete a Druid login that requires two-factor verification. Call it after another tool fails with "Two-factor verification required", ' +
    'passing the code the user received (email/SMS) or from their authenticator app, and the same tenant. ' +
    'On success the session is cached and the device is remembered, so later logins for that user skip 2FA while the server runs.',
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'The two-factor verification code' }
    },
    required: ['code']
  },
  async execute(args) {
    const cfg = resolveConfig();
    const key = authKey(cfg);
    let result;
    try {
      result = await authenticate(cfg, key, { twoFactorVerificationCode: String(args.code).trim() });
    } catch (err) {
      twoFactorPending.delete(key);
      throw err;
    }
    if (!result.accessToken) {
      twoFactorPending.delete(key);
      throw new Error(result.requiresTwoFactorVerification ? 'Invalid or expired code. Request a new one by retrying the original tool.' : 'No accessToken in auth response');
    }
    storeToken(key, result);
    return {
      success: true,
      tenant: cfg.id || cfg.baseUrl,
      username: cfg.username,
      rememberedDevice: Boolean(result.twoFactorRememberClientToken)
    };
  }
};

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
