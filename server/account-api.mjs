import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { validateSnapshot as validateJourneySnapshot } from '../cloud-save.mjs';

const AUTH_BODY_LIMIT = 4096;
const BACKUP_BODY_LIMIT = 530 * 1024;
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const ROUTES = new Map([
  ['/api/v1/account', ['GET']],
  ['/api/v1/auth/otp', ['POST']],
  ['/api/v1/auth/verify', ['POST']],
  ['/api/v1/auth/logout', ['POST']],
  ['/api/v1/journey', ['GET', 'PUT', 'DELETE']],
]);

class ApiError extends Error {
  constructor(status, code, message) { super(message); Object.assign(this, { status, code }); }
}
const failure = (status, code, message) => { throw new ApiError(status, code, message); };
const invalidSession = error => [401, 403].includes(error?.status) || [
  'refresh_token_not_found', 'refresh_token_already_used', 'session_not_found',
  'user_not_found', 'bad_jwt', 'invalid_jwt', 'session_expired',
].includes(error?.code);
const validEmail = email => typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function configuration(request, env) {
  let origin;
  try { origin = new URL(env.APP_ORIGIN); } catch { failure(503, 'account_unavailable', 'Account service is not configured.'); }
  const local = env.ALLOW_INSECURE_LOCAL_AUTH === 'true' && origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if (origin.origin !== env.APP_ORIGIN || (!local && origin.protocol !== 'https:')) failure(503, 'account_unavailable', 'Account service is not configured.');
  if (new URL(request.url).origin !== origin.origin) failure(403, 'origin_rejected', 'Use the configured game origin.');
  return { origin: origin.origin, local, prefix: local ? 'mythseal-local-' : '__Host-mythseal-' };
}

function response(body, status, cookies) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

function cookieValue(request, name) {
  const matches = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${name}=`));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(name.length + 1);
  return /^[A-Za-z0-9._~-]{1,6000}$/.test(value) ? value : null;
}

function sessionCookies(config, session = null) {
  const values = session ? [session.access_token, session.refresh_token] : ['', ''];
  if (session && (!values.every(value => typeof value === 'string' && /^[A-Za-z0-9._~-]+$/.test(value)) || values[0].length > 3500 || values[1].length > 1024)) {
    failure(502, 'account_unavailable', 'The account session could not be stored.');
  }
  return ['access', 'refresh'].map((name, index) => `${config.prefix}${name}=${values[index]}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${session ? SESSION_SECONDS : 0}${config.local ? '' : '; Secure'}`);
}

async function jsonBody(request, maximum, config) {
  if (request.headers.get('origin') !== config.origin) failure(403, 'origin_rejected', 'The request origin was rejected.');
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') failure(415, 'json_required', 'Send a JSON request.');
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum)) failure(413, 'request_too_large', 'The request is too large.');
  const reader = request.body?.getReader();
  if (!reader) failure(400, 'invalid_request', 'A JSON object is required.');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); failure(413, 'request_too_large', 'The request is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let body;
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch { failure(400, 'invalid_request', 'A valid JSON object is required.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) failure(400, 'invalid_request', 'A JSON object is required.');
  return body;
}

async function rateLimit(binding, key) {
  if (typeof binding?.limit !== 'function') failure(503, 'account_unavailable', 'Account protection is not configured.');
  let result;
  try { result = await binding.limit({ key }); } catch { failure(503, 'account_unavailable', 'Account protection is temporarily unavailable.'); }
  if (result?.success !== true) failure(429, 'rate_limited', 'Please wait before trying again.');
}

function safeUser(user) {
  if (!user || typeof user.id !== 'string' || !validEmail(user.email)) failure(502, 'account_unavailable', 'The account could not be verified.');
  return { id: user.id, email: user.email };
}

export function createAccountHandler({ createClient = createSupabaseClient, validateSnapshot = validateJourneySnapshot } = {}) {
  return async function handleAccount(request, env) {
    let cookies = [];
    let sessionContext = null;
    let unsubscribe = () => {};
    const reply = (body, status) => {
      const context = sessionContext;
      sessionContext = null;
      if (context?.verified && context.latest && (context.latest.access_token !== context.access || context.latest.refresh_token !== context.refresh)) {
        cookies = sessionCookies(context.config, context.latest);
      }
      return response(body, status, cookies);
    };
    try {
      const path = new URL(request.url).pathname;
      const methods = ROUTES.get(path);
      if (!methods) failure(404, 'not_found', 'This account endpoint does not exist.');
      if (!methods.includes(request.method)) failure(405, 'method_not_allowed', 'This request method is not supported.');
      const config = configuration(request, env);
      const emailEnabled = env.OTP_ENABLED === 'true' && typeof env.AUTH_RATE_LIMIT?.limit === 'function' && Boolean(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY);
      const client = () => {
        if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) failure(503, 'account_unavailable', 'Account service is not configured.');
        return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
        });
      };
      const authenticate = async ({ optional = false } = {}) => {
        const access = cookieValue(request, `${config.prefix}access`);
        const refresh = cookieValue(request, `${config.prefix}refresh`);
        const absent = () => {
          sessionContext = null;
          cookies = sessionCookies(config);
          if (optional) return null;
          failure(401, 'sign_in_required', 'Please sign in to access your cloud journey.');
        };
        if (!access || !refresh) {
          if (!access && !refresh && optional) return null;
          return absent();
        }
        const supabase = client();
        const context = sessionContext = { config, access, refresh, latest: null, verified: false };
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          // Capture only. Calling SDK methods from this callback can deadlock.
          if (session) context.latest = session;
        });
        unsubscribe = () => listener.subscription.unsubscribe();
        const restored = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
        if (restored.error) {
          if (invalidSession(restored.error)) return absent();
          failure(503, 'account_unavailable', 'Your account could not be checked. Please retry.');
        }
        const verified = await supabase.auth.getUser();
        if (verified.error) {
          if (invalidSession(verified.error)) return absent();
          failure(503, 'account_unavailable', 'Your account could not be checked. Please retry.');
        }
        const user = safeUser(verified.data?.user);
        if (!restored.data?.session) failure(503, 'account_unavailable', 'Your account session could not be refreshed.');
        context.latest ??= restored.data.session;
        context.verified = true;
        return { supabase, user };
      };

      if (path === '/api/v1/account') {
        const account = await authenticate({ optional: true });
        return reply({ authenticated: Boolean(account), user: account?.user ?? null, emailEnabled }, 200);
      }
      if (path === '/api/v1/auth/logout') {
        await jsonBody(request, AUTH_BODY_LIMIT, config);
        try {
          const account = await authenticate({ optional: true });
          if (account) {
            const result = await account.supabase.auth.signOut({ scope: 'local' });
            if (result.error && !invalidSession(result.error)) failure(503, 'sign_out_incomplete', 'This browser was signed out; remote session revocation could not be confirmed.');
          }
        } catch (error) {
          sessionContext = null;
          cookies = sessionCookies(config);
          if (error instanceof ApiError && error.status === 401) return reply({ authenticated: false }, 200);
          return reply({ error: { code: 'sign_out_incomplete', message: 'This browser was signed out; remote session revocation could not be confirmed.' } }, 503);
        }
        sessionContext = null;
        cookies = sessionCookies(config);
        return reply({ authenticated: false }, 200);
      }
      if (path === '/api/v1/auth/otp' || path === '/api/v1/auth/verify') {
        const body = await jsonBody(request, AUTH_BODY_LIMIT, config);
        if (!emailEnabled) failure(503, 'email_unavailable', 'Email sign-in is being prepared. Your local journey is still available.');
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : body.email;
        if (!validEmail(email)) failure(400, 'invalid_email', 'Enter a valid email address.');
        const ip = request.headers.get('cf-connecting-ip') || (config.local ? 'loopback' : null);
        if (!ip) failure(503, 'account_unavailable', 'Account protection is temporarily unavailable.');
        await rateLimit(env.AUTH_RATE_LIMIT, `auth:${ip}`);
        const supabase = client();
        if (path.endsWith('/otp')) {
          const result = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
          if (result.error) {
            if (result.error.status === 429) failure(429, 'rate_limited', 'Please wait before requesting another code.');
            failure(503, 'email_unavailable', 'The sign-in email could not be requested. Please retry later.');
          }
          return reply({ sent: true }, 200);
        }
        if (typeof body.token !== 'string' || !/^\d{6}$/.test(body.token)) failure(400, 'invalid_code', 'Enter the six-digit email code.');
        const result = await supabase.auth.verifyOtp({ email, token: body.token, type: 'email' });
        if (result.error) {
          if (result.error.status === 429) failure(429, 'rate_limited', 'Please wait before trying another code.');
          if (result.error.status >= 500 || !result.error.status) failure(503, 'account_unavailable', 'Sign-in could not be checked. Please retry.');
          failure(400, 'invalid_code', 'That code is invalid or expired. Request another code.');
        }
        const user = safeUser(result.data?.user);
        if (!result.data?.session) failure(502, 'account_unavailable', 'The sign-in session could not be created.');
        cookies = sessionCookies(config, result.data?.session);
        return reply({ authenticated: true, user, emailEnabled }, 200);
      }

      let body;
      if (request.method !== 'GET') {
        body = await jsonBody(request, request.method === 'PUT' ? BACKUP_BODY_LIMIT : AUTH_BODY_LIMIT, config);
        if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0 || body.expectedRevision >= Number.MAX_SAFE_INTEGER) failure(400, 'invalid_revision', 'A valid cloud revision is required.');
      }
      const account = await authenticate();
      // This is a stale-tab guard, never an ownership selector. The verified
      // Supabase session remains the sole source of the database identity.
      if (request.headers.get('x-mythseal-account') !== account.user.id) {
        failure(401, 'account_changed', 'The account changed in another tab. Sign in again before changing your journey.');
      }
      if (request.method !== 'GET') await rateLimit(env.BACKUP_RATE_LIMIT, `backup:${account.user.id}`);
      if (request.method === 'PUT') {
        try { body.snapshot = validateSnapshot(body.snapshot); } catch { failure(400, 'invalid_snapshot', 'The journey snapshot is invalid or too large.'); }
      }
      const operation = { GET: 'read', PUT: 'write', DELETE: 'delete' }[request.method];
      const parameters = request.method === 'PUT' ? { p_expected_revision: body.expectedRevision, p_snapshot: body.snapshot } : request.method === 'DELETE' ? { p_expected_revision: body.expectedRevision } : {};
      const result = await account.supabase.rpc(`mythseal_backup_${operation}`, parameters);
      if (result.error) {
        if (result.error.code === 'PT409' || result.error.code === '40001') failure(409, 'revision_conflict', 'Your cloud journey changed. Load its current version before saving again.');
        if (result.error.code === '22023') failure(400, 'invalid_snapshot', 'The journey snapshot is invalid or too large.');
        if (result.error.code === '42501') failure(401, 'sign_in_required', 'Please sign in again.');
        failure(503, 'cloud_unavailable', 'Your cloud journey is temporarily unavailable.');
      }
      const backup = result.data;
      if (backup !== null) {
        if (!backup || !Number.isSafeInteger(backup.revision) || backup.revision < 1 || typeof backup.updatedAt !== 'string') failure(502, 'cloud_unavailable', 'The cloud journey response was invalid.');
        if (backup.snapshot !== null) {
          try { validateSnapshot(backup.snapshot); } catch { failure(502, 'cloud_unavailable', 'The cloud journey response was invalid.'); }
        }
      } else if (request.method !== 'GET') failure(502, 'cloud_unavailable', 'The cloud change could not be confirmed.');
      if (request.method === 'PUT' && backup.snapshot === null) failure(502, 'cloud_unavailable', 'The cloud save could not be confirmed.');
      if (request.method === 'DELETE' && backup.snapshot !== null) failure(502, 'cloud_unavailable', 'The cloud deletion could not be confirmed.');
      return reply({ backup: backup?.snapshot === null ? null : backup, revision: backup?.revision ?? 0 }, 200);
    } catch (error) {
      const problem = error instanceof ApiError ? error : new ApiError(503, 'account_unavailable', 'The account service is temporarily unavailable.');
      return reply({ error: { code: problem.code, message: problem.message } }, problem.status);
    } finally {
      unsubscribe();
    }
  };
}

const handleAccount = createAccountHandler();
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/')) return handleAccount(request, env);
    return env.ASSETS.fetch(request);
  },
};
