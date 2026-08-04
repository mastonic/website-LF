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

// --- Enable Banking (enablebanking.com) ---
//
// Field names below were cross-checked against three independent sources
// found via web search + direct fetches of raw.githubusercontent.com
// (docs.bridgeapi.io-style direct doc access was blocked, but GitHub raw
// content was not):
//   1. Enable Banking's own official sample:
//      github.com/enablebanking/enablebanking-api-samples (python_example)
//   2. A real third-party integration: github.com/martinohansen/ynabber
//      (reader/enablebanking/{auth,enablebanking}.go)
//   3. Community-maintained schema files in github.com/api-evangelist/enable-banking
// These agree with each other, but none is Enable Banking's live reference
// doc — sanity-check against https://enablebanking.com/docs/api/reference/
// before relying on this in production (see README-enablebanking.md).

export interface EnableBankingAccountId {
  iban?: string;
  bban?: string;
  masked_pan?: string;
  other?: { identification?: string; scheme_name?: string; issuer?: string };
}

export interface EnableBankingAccount {
  uid: string;
  account_id: EnableBankingAccountId;
  currency?: string;
  name?: string;
}

export interface EnableBankingSession {
  session_id?: string;
  accounts: EnableBankingAccount[];
  access?: { valid_until?: string };
  createdAt?: string;
}

export interface EnableBankingAmount {
  currency: string;
  /** Decimal string per ISO 20022 (e.g. "45.90") — parse with Number() before storing. */
  amount: string;
}

export interface EnableBankingTransaction {
  entry_reference?: string;
  /** Enable Banking's own transaction id, when the ASPSP supplies a stable one. */
  transaction_id?: string;
  transaction_amount: EnableBankingAmount;
  credit_debit_indicator: 'CRDT' | 'DBIT';
  status?: 'BOOK' | 'PDNG' | 'INFO' | 'OTHR';
  booking_date?: string;
  value_date?: string;
  transaction_date?: string;
  remittance_information?: string[];
  creditor?: { name?: string } | null;
  debtor?: { name?: string } | null;
  merchant_category_code?: string;
}

export interface EnableBankingTransactionsResponse {
  transactions: EnableBankingTransaction[];
  pending?: EnableBankingTransaction[];
  continuation_key?: string | null;
}
