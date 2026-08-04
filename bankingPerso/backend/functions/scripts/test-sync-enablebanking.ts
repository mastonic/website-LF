// End-to-end test against a REAL linked bank account — there is no sandbox
// for Enable Banking restricted production. Requires:
//   1. keys/enablebanking-private-key.pem to exist (see README-enablebanking.md)
//   2. enableBankingSessions/{ENABLE_BANKING_TARGET_USER_ID} to already be
//      populated — run scripts/bootstrap-enable-banking-session.ts once first
//   3. I_UNDERSTAND_THIS_CALLS_PRODUCTION=yes set in .env.local, as an explicit
//      confirmation gate before this script will touch the real API.
import { listAccounts } from '../src/lib/enable-banking-client';
import { syncEnableBankingTransactionsForUser } from '../src/functions/sync-enable-banking-transactions';
import { db, ENABLE_BANKING_SESSIONS_COLLECTION, TRANSACTIONS_COLLECTION } from '../src/lib/firestore-admin';

const USER_ID = process.env.ENABLE_BANKING_TARGET_USER_ID ?? 'me';

function maskIban(iban: string | undefined): string {
  if (!iban) return '(no IBAN)';
  return iban.length <= 8 ? '****' : `${iban.slice(0, 4)}...${iban.slice(-4)}`;
}

async function main() {
  if (process.env.I_UNDERSTAND_THIS_CALLS_PRODUCTION !== 'yes') {
    throw new Error(
      'Refusing to run: this makes a real call against your real linked bank account (no sandbox exists ' +
        'for this provider). Set I_UNDERSTAND_THIS_CALLS_PRODUCTION=yes in .env.local once you have confirmed ' +
        'this is intended, to avoid burning through any restricted-production or ASPSP-side throttling.',
    );
  }

  console.log(`[1/3] Loading Enable Banking session for "${USER_ID}"...`);
  const sessionSnap = await db.collection(ENABLE_BANKING_SESSIONS_COLLECTION).doc(USER_ID).get();
  if (!sessionSnap.exists) {
    throw new Error(
      `No session found at ${ENABLE_BANKING_SESSIONS_COLLECTION}/${USER_ID}. ` +
        'Run scripts/bootstrap-enable-banking-session.ts once first.',
    );
  }
  const { sessionId } = sessionSnap.data() as { sessionId: string };

  console.log('[2/3] Listing accounts (GET /sessions/{id})...');
  const accounts = await listAccounts(sessionId);
  console.log(`  found ${accounts.length} account(s):`);
  for (const account of accounts) {
    console.log(`    - ${account.name ?? '(unnamed)'} · ${maskIban(account.account_id?.iban)} · ${account.currency ?? '?'}`);
  }

  const expectedIban = process.env.ENABLE_BANKING_EXPECTED_IBAN?.replace(/\s+/g, '');
  if (expectedIban) {
    const found = accounts.some((a) => a.account_id?.iban?.replace(/\s+/g, '') === expectedIban);
    console.log(found ? `  OK: expected account (${maskIban(expectedIban)}) is present.` : `  WARN: expected account (${maskIban(expectedIban)}) was NOT found among linked accounts.`);
  }

  console.log('[3/3] Running syncEnableBankingTransactionsForUser twice, checking for duplicates...');
  const firstRunCount = await syncEnableBankingTransactionsForUser(USER_ID);
  console.log(`  synced ${firstRunCount} transaction(s) on this run`);

  const before = await db.collection(TRANSACTIONS_COLLECTION).where('userId', '==', USER_ID).where('source', '==', 'enablebanking').get();
  await syncEnableBankingTransactionsForUser(USER_ID);
  const after = await db.collection(TRANSACTIONS_COLLECTION).where('userId', '==', USER_ID).where('source', '==', 'enablebanking').get();

  if (before.size !== after.size) {
    throw new Error(`Duplicate detection failed: ${before.size} doc(s) before re-sync, ${after.size} after.`);
  }

  console.log(`\nOK: ${after.size} Enable Banking transaction doc(s) in Firestore for ${USER_ID}; re-sync created no duplicates.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\ntest:sync-enablebanking failed:', error);
    process.exit(1);
  });
