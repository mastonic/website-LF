// One-time interactive step: opens Enable Banking's consent flow for YOUR
// OWN account, exchanges the resulting authorization code for a session, and
// stores it in Firestore (enableBankingSessions/{userId}) so
// syncEnableBankingTransactions has an account list + session id to use.
//
// Needed once per linked account, and again whenever the consent expires
// (PSD2 caps non-PSU-present consent at 180 days) or is revoked.
//
// Requires ENABLE_BANKING_ASPSP_NAME, ENABLE_BANKING_ASPSP_COUNTRY and
// ENABLE_BANKING_REDIRECT_URL to be set in .env.local — the redirect URL
// must be one registered in your Enable Banking application settings.
//
// This makes a REAL call against your real linked account. Confirm before
// running it — see the safety gate in scripts/test-sync-enablebanking.ts for
// the same concern; this script doesn't gate on it because *you* are the one
// invoking it interactively, on purpose, to link your own account.
import readline from 'readline/promises';
import { assertPrivateKeyExists, createSession, startAuthorization } from '../src/lib/enable-banking-client';
import { db, ENABLE_BANKING_SESSIONS_COLLECTION } from '../src/lib/firestore-admin';

const USER_ID = process.env.ENABLE_BANKING_TARGET_USER_ID ?? 'me';
const CONSENT_DAYS = 90;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env.local before running this script.`);
  return value;
}

async function main() {
  // Checked first, and separately from the other env vars below, so a
  // missing .pem always produces this specific message rather than a
  // generic "missing env var" or a cryptic failure deep inside JWT signing.
  assertPrivateKeyExists();

  const aspspName = requireEnv('ENABLE_BANKING_ASPSP_NAME');
  const aspspCountry = requireEnv('ENABLE_BANKING_ASPSP_COUNTRY');
  const redirectUrl = requireEnv('ENABLE_BANKING_REDIRECT_URL');

  const validUntil = new Date(Date.now() + CONSENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { url } = await startAuthorization({ aspspName, aspspCountry, redirectUrl, validUntil });

  console.log(`\nOpen this URL in a browser and complete the consent flow for your ${aspspName} account:\n`);
  console.log(`  ${url}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const redirectedTo = await rl.question('Paste the full URL you were redirected to afterwards: ');
  rl.close();

  const code = new URL(redirectedTo.trim()).searchParams.get('code');
  if (!code) throw new Error('No "code" query parameter found in the pasted URL.');

  const session = await createSession(code);
  if (!session.session_id) throw new Error('Enable Banking did not return a session_id.');

  await db.collection(ENABLE_BANKING_SESSIONS_COLLECTION).doc(USER_ID).set({
    sessionId: session.session_id,
    accounts: session.accounts.map((a) => ({ uid: a.uid, iban: a.account_id?.iban, name: a.name })),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`\nStored session for ${session.accounts.length} account(s) under ${ENABLE_BANKING_SESSIONS_COLLECTION}/${USER_ID}:`);
  for (const account of session.accounts) {
    console.log(`  - ${account.name ?? '(unnamed)'} · ${account.account_id?.iban ?? account.uid}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nbootstrap-enable-banking-session failed:', error);
    process.exit(1);
  });
