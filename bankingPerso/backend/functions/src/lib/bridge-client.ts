import { setTimeout as sleep } from 'timers/promises';
import type {
  BridgeConnectSession,
  BridgePaginatedResponse,
  BridgeTokenResponse,
  BridgeTransaction,
} from '../types';

// Endpoint paths, headers and payload shapes below are based on web-search
// snippets of docs.bridgeapi.io (Bridge API v3, version header 2025-01-15) —
// this environment's network policy blocks direct access to
// docs.bridgeapi.io/api.bridgeapi.io, so none of this was verified against a
// live fetch. Sanity-check against the real docs before production use.

const DEFAULT_BASE_URL = 'https://api.bridgeapi.io/v3';
const MAX_RETRY_ATTEMPTS = 5;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

interface BridgeRequestOptions {
  method?: string;
  path: string;
  body?: unknown;
  accessToken?: string;
  /** When true, `path` is already a full URL (used to follow pagination.next_uri). */
  absoluteUrl?: boolean;
}

async function bridgeRequest<T>(opts: BridgeRequestOptions, attempt = 1): Promise<T> {
  const clientId = requireEnv('BRIDGE_CLIENT_ID');
  const clientSecret = requireEnv('BRIDGE_CLIENT_SECRET');
  const baseUrl = process.env.BRIDGE_API_BASE_URL ?? DEFAULT_BASE_URL;
  const bridgeVersion = process.env.BRIDGE_API_VERSION ?? '2025-01-15';
  const url = opts.absoluteUrl ? opts.path : `${baseUrl}${opts.path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Bridge-Version': bridgeVersion,
    'Client-Id': clientId,
    'Client-Secret': clientSecret,
  };
  if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;

  const response = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (response.status === 429 || response.status >= 500) {
    if (attempt >= MAX_RETRY_ATTEMPTS) {
      throw new Error(`Bridge API ${response.status} after ${attempt} attempts on ${opts.path}`);
    }
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;
    const backoffMs = retryAfterMs ?? Math.min(2 ** attempt * 500, 15_000);
    const jitterMs = Math.random() * 250;
    await sleep(backoffMs + jitterMs);
    return bridgeRequest<T>(opts, attempt + 1);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Bridge API error ${response.status} on ${opts.path}: ${text}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function createBridgeUser(
  externalUserId: string,
): Promise<{ uuid: string; external_user_id: string }> {
  return bridgeRequest({
    method: 'POST',
    path: '/aggregation/users',
    body: { external_user_id: externalUserId },
  });
}

/**
 * Bridge v3 has no separate refresh-token flow: re-calling this endpoint for
 * an existing external_user_id issues a fresh access_token, which is also how
 * we "refresh" a near-expiry token (see sync-bridge-transactions.ts).
 */
export async function getUserAccessToken(externalUserId: string): Promise<BridgeTokenResponse> {
  return bridgeRequest<BridgeTokenResponse>({
    method: 'POST',
    path: '/aggregation/authorization/token',
    body: { external_user_id: externalUserId },
  });
}

export async function createConnectSession(params: {
  accessToken: string;
  userEmail: string;
  callbackUrl?: string;
}): Promise<BridgeConnectSession> {
  return bridgeRequest({
    method: 'POST',
    path: '/aggregation/connect-sessions',
    accessToken: params.accessToken,
    body: {
      user_email: params.userEmail,
      ...(params.callbackUrl ? { callback_url: params.callbackUrl } : {}),
    },
  });
}

async function listTransactionsPage(params: {
  accessToken: string;
  since?: string;
  nextUri?: string;
}): Promise<BridgePaginatedResponse<BridgeTransaction>> {
  if (params.nextUri) {
    return bridgeRequest({ path: params.nextUri, accessToken: params.accessToken, absoluteUrl: true });
  }
  const search = new URLSearchParams({ limit: '200' });
  if (params.since) search.set('since', params.since);
  return bridgeRequest({ path: `/aggregation/transactions?${search.toString()}`, accessToken: params.accessToken });
}

/** Follows `pagination.next_uri` until exhausted, returning every transaction updated since `since`. */
export async function listAllTransactionsSince(params: {
  accessToken: string;
  since?: string;
}): Promise<BridgeTransaction[]> {
  const all: BridgeTransaction[] = [];
  let nextUri: string | undefined;

  do {
    const page = await listTransactionsPage({
      accessToken: params.accessToken,
      since: nextUri ? undefined : params.since,
      nextUri,
    });
    all.push(...page.resources);
    nextUri = page.pagination?.next_uri ?? undefined;
  } while (nextUri);

  return all;
}
