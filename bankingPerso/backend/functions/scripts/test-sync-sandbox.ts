// Env vars are loaded by the `--env-file=.env.local` flag on the npm script
// (see package.json) rather than a `dotenv` import here, so that they are
// guaranteed to be set before any of these modules run their top-level
// initialization code (e.g. firestore-admin.ts calling initializeApp()).
import { createBridgeUser, createConnectSession, getUserAccessToken } from '../src/lib/bridge-client';
import { syncTransactionsForUser } from '../src/functions/sync-bridge-transactions';
import { BRIDGE_ACCOUNTS_COLLECTION, db, TRANSACTIONS_COLLECTION } from '../src/lib/firestore-admin';
import { encryptSecret } from '../src/lib/token-crypto';

const TEST_USER_ID = process.env.BRIDGE_SANDBOX_TEST_USER_ID ?? 'sandbox-test-user';
const TEST_USER_EMAIL = process.env.BRIDGE_SANDBOX_TEST_EMAIL ?? 'sandbox-test-user@example.com';

async function main() {
  console.log(`\n[1/4] Ensuring Bridge sandbox user "${TEST_USER_ID}"...`);
  try {
    await createBridgeUser(TEST_USER_ID);
    console.log('  created a new Bridge user');
  } catch (error) {
    console.log(`  createBridgeUser failed (assuming "already exists" and continuing): ${error}`);
  }

  console.log('[2/4] Fetching a user access token...');
  const tokenResponse = await getUserAccessToken(TEST_USER_ID);

  await db.collection(BRIDGE_ACCOUNTS_COLLECTION).doc(TEST_USER_ID).set(
    {
      bridgeExternalUserId: TEST_USER_ID,
      bridgeUserUuid: tokenResponse.user.uuid,
      accessToken: encryptSecret(tokenResponse.access_token),
      accessTokenExpiresAt: new Date(tokenResponse.expires_at),
      updatedAt: new Date(),
    },
    { merge: true },
  );
  console.log(`  token stored in Firestore (${BRIDGE_ACCOUNTS_COLLECTION}/${TEST_USER_ID})`);

  console.log('[3/4] Creating a Connect session...');
  const session = await createConnectSession({ accessToken: tokenResponse.access_token, userEmail: TEST_USER_EMAIL });
  console.log(`  Connect URL: ${session.url}`);
  console.log('  -> If this sandbox test user has no linked bank yet, open the URL above, pick a');
  console.log('     Bridge sandbox test bank, complete the flow, then re-run this script.');

  console.log('[4/4] Running the sync logic (syncTransactionsForUser)...');
  const firstRunCount = await syncTransactionsForUser(TEST_USER_ID);
  console.log(`  synced ${firstRunCount} transaction(s) on this run`);

  const before = await db.collection(TRANSACTIONS_COLLECTION).where('userId', '==', TEST_USER_ID).get();
  await syncTransactionsForUser(TEST_USER_ID);
  const after = await db.collection(TRANSACTIONS_COLLECTION).where('userId', '==', TEST_USER_ID).get();

  if (before.size !== after.size) {
    throw new Error(
      `Duplicate detection failed: ${before.size} transaction doc(s) before re-sync, ${after.size} after.`,
    );
  }

  console.log(`\nOK: ${after.size} transaction doc(s) in Firestore for ${TEST_USER_ID}; re-sync created no duplicates.`);
  if (after.size === 0) {
    console.log('(0 is expected until you complete the Connect flow for this sandbox user at least once.)');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\ntest:sync-sandbox failed:', error);
    process.exit(1);
  });
