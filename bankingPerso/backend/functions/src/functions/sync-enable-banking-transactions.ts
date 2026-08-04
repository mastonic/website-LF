import { createHash } from 'crypto';
import { logger } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Timestamp } from 'firebase-admin/firestore';
import { listAllTransactionsSince } from '../lib/enable-banking-client';
import { db, ENABLE_BANKING_SESSIONS_COLLECTION, TRANSACTIONS_COLLECTION } from '../lib/firestore-admin';
import type { EnableBankingTransaction } from '../types';

const FIRST_SYNC_LOOKBACK_DAYS = 90;
const FIRESTORE_BATCH_SIZE = 450;

interface EnableBankingSessionDoc {
  sessionId: string;
  accounts: { uid: string; iban?: string; name?: string }[];
  lastSyncedAt?: Timestamp;
}

/**
 * Enable Banking's own blog notes some ASPSPs don't supply a stable
 * `transaction_id`. When absent, we derive a deterministic key from fields
 * that identify the same movement (account + reference + date + amount +
 * direction + remittance text), so re-syncing still upserts instead of
 * duplicating.
 */
function stableTransactionKey(accountUid: string, tx: EnableBankingTransaction): string {
  if (tx.transaction_id) return tx.transaction_id;

  const seed = [
    accountUid,
    tx.entry_reference ?? '',
    tx.booking_date ?? tx.value_date ?? tx.transaction_date ?? '',
    tx.transaction_amount.amount,
    tx.transaction_amount.currency,
    tx.credit_debit_indicator,
    (tx.remittance_information ?? []).join('|'),
  ].join('::');

  return createHash('sha256').update(seed).digest('hex').slice(0, 32);
}

function normalizeTransaction(userId: string, accountUid: string, tx: EnableBankingTransaction) {
  const amountValue = Number(tx.transaction_amount.amount);
  const signedAmount = tx.credit_debit_indicator === 'DBIT' ? -Math.abs(amountValue) : Math.abs(amountValue);

  // For an outgoing payment (DBIT) the counterparty is the creditor (who got
  // paid); for an incoming one (CRDT) it's the debtor (who paid you).
  const counterparty =
    tx.credit_debit_indicator === 'DBIT' ? tx.creditor?.name ?? tx.debtor?.name : tx.debtor?.name ?? tx.creditor?.name;

  const dateStr = tx.booking_date ?? tx.value_date ?? tx.transaction_date;

  return {
    userId,
    amount: signedAmount,
    currency: tx.transaction_amount.currency,
    date: Timestamp.fromDate(new Date(dateStr ?? Date.now())),
    rawLabel: (tx.remittance_information ?? []).join(' ') || tx.entry_reference || '',
    // Enable Banking does not categorize transactions (unlike Bridge) —
    // "uncategorized" until a categorization step is built separately.
    category: 'uncategorized',
    merchant: counterparty ?? null,
    bankAccountId: accountUid,
    source: 'enablebanking' as const,
    syncedAt: Timestamp.now(),
  };
}

/**
 * Fetches every booked transaction since the user's last sync for each
 * account in their stored Enable Banking session, and upserts them into
 * `transactions/enablebanking_{accountUid}_{stableKey}` — a deterministic
 * doc id, so re-running never creates duplicates.
 */
export async function syncEnableBankingTransactionsForUser(userId: string): Promise<number> {
  const sessionRef = db.collection(ENABLE_BANKING_SESSIONS_COLLECTION).doc(userId);
  const snapshot = await sessionRef.get();
  if (!snapshot.exists) {
    throw new Error(
      `No Enable Banking session linked for user ${userId}. Run scripts/bootstrap-enable-banking-session.ts once first.`,
    );
  }
  const sessionDoc = snapshot.data() as EnableBankingSessionDoc;

  const dateFrom = sessionDoc.lastSyncedAt
    ? sessionDoc.lastSyncedAt.toDate().toISOString().slice(0, 10)
    : new Date(Date.now() - FIRST_SYNC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let totalSynced = 0;

  for (const account of sessionDoc.accounts) {
    const transactions = await listAllTransactionsSince({ accountUid: account.uid, dateFrom });

    for (let i = 0; i < transactions.length; i += FIRESTORE_BATCH_SIZE) {
      const batch = db.batch();
      for (const tx of transactions.slice(i, i + FIRESTORE_BATCH_SIZE)) {
        const key = stableTransactionKey(account.uid, tx);
        const docRef = db.collection(TRANSACTIONS_COLLECTION).doc(`enablebanking_${account.uid}_${key}`);
        batch.set(docRef, normalizeTransaction(userId, account.uid, tx), { merge: true });
      }
      await batch.commit();
    }

    totalSynced += transactions.length;
  }

  await sessionRef.set({ lastSyncedAt: Timestamp.now() }, { merge: true });

  logger.info('Enable Banking sync complete', { userId, count: totalSynced });
  return totalSynced;
}

/**
 * Manual/test trigger. Guarded by the same shared secret as
 * syncBridgeTransactions (header x-sync-secret, env SYNC_TRIGGER_SECRET) —
 * fails closed if unconfigured. There is no sandbox for this provider: every
 * call reaches a real linked bank account.
 */
export const syncEnableBankingTransactions = onRequest({ cors: false }, async (req, res) => {
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
    const count = await syncEnableBankingTransactionsForUser(userId);
    res.status(200).json({ userId, synced: count });
  } catch (error) {
    logger.error('syncEnableBankingTransactions failed', { userId, error: String(error) });
    res.status(502).json({ error: 'Sync failed', details: String(error) });
  }
});

/** Daily Cloud Scheduler job — offset an hour from the Bridge sync to avoid both running at once. */
export const syncEnableBankingTransactionsDaily = onSchedule('every day 04:00', async () => {
  const sessions = await db.collection(ENABLE_BANKING_SESSIONS_COLLECTION).get();
  logger.info(`Starting daily Enable Banking sync for ${sessions.size} account(s)`);

  for (const sessionDoc of sessions.docs) {
    try {
      const count = await syncEnableBankingTransactionsForUser(sessionDoc.id);
      logger.info('Synced user', { userId: sessionDoc.id, count });
    } catch (error) {
      logger.error('Daily sync failed for user', { userId: sessionDoc.id, error: String(error) });
    }
  }
});
