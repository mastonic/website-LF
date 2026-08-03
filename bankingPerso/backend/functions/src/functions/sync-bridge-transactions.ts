import { logger } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Timestamp } from 'firebase-admin/firestore';
import { getUserAccessToken, listAllTransactionsSince } from '../lib/bridge-client';
import { BRIDGE_ACCOUNTS_COLLECTION, db, TRANSACTIONS_COLLECTION } from '../lib/firestore-admin';
import { decryptSecret, encryptSecret, type EncryptedSecret } from '../lib/token-crypto';
import type { BridgeTransaction } from '../types';

const FIRST_SYNC_LOOKBACK_DAYS = 90;
const FIRESTORE_BATCH_SIZE = 450;

interface BridgeAccountDoc {
  bridgeExternalUserId: string;
  accessToken: EncryptedSecret;
  accessTokenExpiresAt: Timestamp;
  lastSyncedAt?: Timestamp;
}

async function getFreshAccessToken(userId: string, account: BridgeAccountDoc): Promise<string> {
  const expiresAt = account.accessTokenExpiresAt?.toDate?.() ?? new Date(0);
  const hasTimeLeft = expiresAt.getTime() - Date.now() > 60_000; // keep at least 1 min of margin
  if (hasTimeLeft) {
    return decryptSecret(account.accessToken);
  }

  const refreshed = await getUserAccessToken(account.bridgeExternalUserId);
  await db.collection(BRIDGE_ACCOUNTS_COLLECTION).doc(userId).set(
    {
      accessToken: encryptSecret(refreshed.access_token),
      accessTokenExpiresAt: new Date(refreshed.expires_at),
      updatedAt: new Date(),
    },
    { merge: true },
  );
  return refreshed.access_token;
}

function normalizeTransaction(userId: string, tx: BridgeTransaction) {
  return {
    userId,
    amount: tx.amount,
    currency: tx.currency_code,
    date: Timestamp.fromDate(new Date(tx.booking_date ?? tx.date)),
    rawLabel: tx.provider_description ?? tx.clean_description ?? tx.raw_description ?? '',
    category: tx.category_id != null ? String(tx.category_id) : 'uncategorized',
    merchant: tx.merchant?.name ?? null,
    bankAccountId: String(tx.account_id),
    source: 'bridge' as const,
    syncedAt: Timestamp.now(),
  };
}

/**
 * Fetches every Bridge transaction updated since the user's last sync,
 * upserts each one into `transactions/bridge_{bridgeTransactionId}` (a
 * deterministic doc id, so re-running never creates duplicates), and
 * advances `bridgeAccounts/{userId}.lastSyncedAt`.
 */
export async function syncTransactionsForUser(userId: string): Promise<number> {
  const accountRef = db.collection(BRIDGE_ACCOUNTS_COLLECTION).doc(userId);
  const snapshot = await accountRef.get();
  if (!snapshot.exists) {
    throw new Error(`No Bridge account linked for user ${userId}`);
  }
  const account = snapshot.data() as BridgeAccountDoc;

  const accessToken = await getFreshAccessToken(userId, account);

  const since = account.lastSyncedAt
    ? account.lastSyncedAt.toDate().toISOString()
    : new Date(Date.now() - FIRST_SYNC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const transactions = await listAllTransactionsSince({ accessToken, since });

  for (let i = 0; i < transactions.length; i += FIRESTORE_BATCH_SIZE) {
    const batch = db.batch();
    for (const tx of transactions.slice(i, i + FIRESTORE_BATCH_SIZE)) {
      const docRef = db.collection(TRANSACTIONS_COLLECTION).doc(`bridge_${tx.id}`);
      batch.set(docRef, normalizeTransaction(userId, tx), { merge: true });
    }
    await batch.commit();
  }

  await accountRef.set({ lastSyncedAt: Timestamp.now() }, { merge: true });

  logger.info('Bridge sync complete', { userId, count: transactions.length });
  return transactions.length;
}

/**
 * Manual/test trigger for a single user. Guarded by a shared secret (header
 * x-sync-secret, env SYNC_TRIGGER_SECRET) since there is no frontend/auth
 * flow yet to scope this to "the caller's own account" — fails closed if the
 * secret isn't configured. Tighten further (IAM invoker, App Check, or
 * removal) before this is reachable from anywhere but your own tests.
 */
export const syncBridgeTransactions = onRequest({ cors: false }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const expectedSecret = process.env.SYNC_TRIGGER_SECRET;
  if (!expectedSecret) {
    logger.error('SYNC_TRIGGER_SECRET is not configured; refusing the manual sync request.');
    res.status(500).json({ error: 'Server misconfigured: SYNC_TRIGGER_SECRET missing' });
    return;
  }
  if (req.header('x-sync-secret') !== expectedSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { userId } = req.body ?? {};
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const count = await syncTransactionsForUser(userId);
    res.status(200).json({ userId, synced: count });
  } catch (error) {
    logger.error('syncBridgeTransactions failed', { userId, error: String(error) });
    res.status(502).json({ error: 'Sync failed', details: String(error) });
  }
});

/** Daily Cloud Scheduler job (provisioned automatically by Firebase on deploy). */
export const syncBridgeTransactionsDaily = onSchedule('every day 03:00', async () => {
  const accounts = await db.collection(BRIDGE_ACCOUNTS_COLLECTION).get();
  logger.info(`Starting daily Bridge sync for ${accounts.size} account(s)`);

  for (const accountDoc of accounts.docs) {
    try {
      const count = await syncTransactionsForUser(accountDoc.id);
      logger.info('Synced user', { userId: accountDoc.id, count });
    } catch (error) {
      logger.error('Daily sync failed for user', { userId: accountDoc.id, error: String(error) });
    }
  }
});
