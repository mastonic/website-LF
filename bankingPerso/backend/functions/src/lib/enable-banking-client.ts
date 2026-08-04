import { readFileSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { setTimeout as sleep } from 'timers/promises';
import jwt from 'jsonwebtoken';
import type {
  EnableBankingAccount,
  EnableBankingSession,
  EnableBankingTransactionsResponse,
} from '../types';

// Endpoints, JWT shape and field names below come from Enable Banking's own
// official sample repo, a real third-party integration, and community schema
// files (see types.ts for the full source list) — this environment's network
// policy blocks direct access to docs.bridgeapi.io *and* enablebanking.com,
// so none of this was verified against a live fetch of the real reference
// doc. Sanity-check before production use.

const DEFAULT_BASE_URL = 'https://api.enablebanking.com';
const MAX_JWT_TTL_SECONDS = 86_400; // Enable Banking rejects exp further than 24h out.
const MAX_RETRY_ATTEMPTS = 5;

export class EnableBankingAuthError extends Error {}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

let cachedPrivateKey: string | null = null;

/** Reads the RSA private key from disk. Never logs its path's contents or any error text that could echo key material. */
function loadPrivateKey(): string {
  if (cachedPrivateKey) return cachedPrivateKey;
  const keyPath = requireEnv('ENABLE_BANKING_PRIVATE_KEY_PATH');
  const resolved = path.resolve(process.cwd(), keyPath);
  try {
    cachedPrivateKey = readFileSync(resolved, 'utf8');
  } catch {
    throw new Error(
      `Could not read the Enable Banking private key at "${keyPath}" (resolved: "${resolved}"). ` +
        'Place the .pem file there and check ENABLE_BANKING_PRIVATE_KEY_PATH.',
    );
  }
  return cachedPrivateKey;
}

/**
 * Signs a fresh app-level JWT (RS256, `kid` = client_id, `iss` = "enablebanking.com"),
 * matching enablebanking/enablebanking-api-samples exactly. Never log the return value in full.
 */
function generateAppJwt(): string {
  const clientId = requireEnv('ENABLE_BANKING_CLIENT_ID');
  const privateKey = loadPrivateKey();
  const ttlSeconds = Math.min(
    Number(process.env.ENABLE_BANKING_JWT_TTL_SECONDS) || 3600,
    MAX_JWT_TTL_SECONDS,
  );
  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    { iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + ttlSeconds },
    privateKey,
    // No `noTimestamp` here: that option deletes `iat` even when it's already
    // set on the payload, which silently dropped our explicit claim.
    { algorithm: 'RS256', header: { alg: 'RS256', typ: 'JWT', kid: clientId } },
  );
}

interface EnableBankingRequestOptions {
  method?: string;
  path: string;
  body?: unknown;
  searchParams?: Record<string, string | undefined>;
}

async function enableBankingRequest<T>(opts: EnableBankingRequestOptions, attempt = 1): Promise<T> {
  const baseUrl = process.env.ENABLE_BANKING_API_BASE_URL ?? DEFAULT_BASE_URL;
  const query = opts.searchParams
    ? Object.entries(opts.searchParams).filter(([, v]) => v !== undefined) as [string, string][]
    : [];
  const search = query.length ? `?${new URLSearchParams(query).toString()}` : '';
  const url = `${baseUrl}${opts.path}${search}`;

  const jwtToken = generateAppJwt();
  const response = await fetch(url, {
    method: opts.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (response.status === 401) {
    const text = await response.text().catch(() => '');
    throw new EnableBankingAuthError(
      `Enable Banking rejected the request as unauthorized on ${opts.path} (expired/invalid app JWT, ` +
        `or an expired/revoked session that needs re-authorization): ${text}`,
    );
  }

  if (response.status === 429 || response.status >= 500) {
    if (attempt >= MAX_RETRY_ATTEMPTS) {
      throw new Error(`Enable Banking API ${response.status} after ${attempt} attempts on ${opts.path}`);
    }
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;
    // Backoff schedule (1s, 2s, 4s, ... capped at 60s) mirrors the retry
    // guidance found for this API: exponential backoff with jitter, capped,
    // respecting Retry-After when present.
    const backoffMs = retryAfterMs ?? Math.min(2 ** attempt * 1000, 60_000);
    const jitterMs = Math.random() * 300;
    await sleep(backoffMs + jitterMs);
    return enableBankingRequest<T>(opts, attempt + 1);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Enable Banking API error ${response.status} on ${opts.path}: ${text}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Starts the interactive consent flow. Returns a URL for the PSU (you) to open and complete in a browser. */
export async function startAuthorization(params: {
  aspspName: string;
  aspspCountry: string;
  redirectUrl: string;
  validUntil: string;
  psuType?: 'personal' | 'business';
}): Promise<{ url: string; id: string }> {
  return enableBankingRequest({
    method: 'POST',
    path: '/auth',
    body: {
      access: { valid_until: params.validUntil },
      aspsp: { name: params.aspspName, country: params.aspspCountry },
      state: randomUUID(),
      redirect_url: params.redirectUrl,
      psu_type: params.psuType ?? 'personal',
    },
  });
}

/** Exchanges the authorization code (from the redirect URL) for a session. */
export async function createSession(code: string): Promise<EnableBankingSession> {
  return enableBankingRequest({ method: 'POST', path: '/sessions', body: { code } });
}

export async function getSession(sessionId: string): Promise<EnableBankingSession> {
  return enableBankingRequest({ path: `/sessions/${sessionId}` });
}

/** Lists the accounts accessible under an established session. */
export async function listAccounts(sessionId: string): Promise<EnableBankingAccount[]> {
  const session = await getSession(sessionId);
  return session.accounts;
}

async function listTransactionsPage(params: {
  accountUid: string;
  dateFrom?: string;
  dateTo?: string;
  continuationKey?: string;
}): Promise<EnableBankingTransactionsResponse> {
  return enableBankingRequest({
    path: `/accounts/${params.accountUid}/transactions`,
    searchParams: {
      date_from: params.dateFrom,
      date_to: params.dateTo,
      continuation_key: params.continuationKey,
    },
  });
}

/** Follows `continuation_key` until exhausted, returning every booked transaction since `dateFrom`. */
export async function listAllTransactionsSince(params: {
  accountUid: string;
  dateFrom: string;
}): Promise<EnableBankingTransactionsResponse['transactions']> {
  const all: EnableBankingTransactionsResponse['transactions'] = [];
  let continuationKey: string | undefined;

  do {
    const page = await listTransactionsPage({
      accountUid: params.accountUid,
      dateFrom: params.dateFrom,
      continuationKey,
    });
    all.push(...page.transactions);
    continuationKey = page.continuation_key ?? undefined;
  } while (continuationKey);

  return all;
}
