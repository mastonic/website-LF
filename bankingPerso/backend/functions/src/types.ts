export interface BridgeTokenResponse {
  access_token: string;
  expires_at: string; // ISO date string
  user: {
    uuid: string;
    external_user_id?: string | null;
  };
}

export interface BridgeConnectSession {
  id: string;
  url: string;
}

// NOTE: field names below reflect Bridge API v3 (2025-01-15) as far as could
// be confirmed via search snippets of docs.bridgeapi.io — direct HTTPS access
// to docs.bridgeapi.io was blocked by this environment's network policy, so
// this was NOT verified against a live fetch. `merchant` in particular is
// unconfirmed. Double-check against the real docs before relying on this in
// production (see README-bridge.md).
export interface BridgeTransaction {
  id: number;
  amount: number;
  currency_code: string;
  date: string;
  booking_date?: string;
  clean_description?: string;
  provider_description?: string;
  raw_description?: string;
  category_id?: number | null;
  account_id: number;
  merchant?: { name?: string | null } | null;
  updated_at?: string;
  deleted?: boolean;
}

export interface BridgePaginatedResponse<T> {
  resources: T[];
  pagination: {
    next_uri?: string | null;
  };
}
