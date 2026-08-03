import { logger } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { createBridgeUser, createConnectSession, getUserAccessToken } from '../lib/bridge-client';
import { BRIDGE_ACCOUNTS_COLLECTION, db } from '../lib/firestore-admin';
import { encryptSecret } from '../lib/token-crypto';

async function ensureBridgeUser(externalUserId: string): Promise<void> {
  try {
    await createBridgeUser(externalUserId);
  } catch (error) {
    // Bridge rejects creation if a user with this external_user_id already exists;
    // authenticating below works regardless, so that specific case is not fatal.
    logger.info('createBridgeUser failed, assuming the user already exists and continuing', {
      externalUserId,
      error: String(error),
    });
  }
}

/**
 * Initiates Bridge Connect for the calling Firebase user: ensures a matching
 * Bridge user exists, fetches a user access token, opens a Connect session,
 * and stores the token + session info in `bridgeAccounts/{uid}` (a
 * Firestore collection with no client access — see firestore.rules).
 *
 * Auth: requires `Authorization: Bearer <Firebase ID token>`. The uid is
 * taken from the verified token, never from the request body, so a caller
 * can only ever connect their own account.
 */
export const connectBridgeAccount = onRequest({ cors: false }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const authHeader = req.header('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!idToken) {
    res.status(401).json({ error: 'Missing Authorization: Bearer <Firebase ID token>' });
    return;
  }

  let decodedToken;
  try {
    decodedToken = await getAuth().verifyIdToken(idToken);
  } catch (error) {
    logger.warn('connectBridgeAccount: invalid Firebase ID token', { error: String(error) });
    res.status(401).json({ error: 'Invalid Firebase ID token' });
    return;
  }

  const userId = decodedToken.uid;
  const userEmail = decodedToken.email ?? (req.body?.userEmail as string | undefined);
  if (!userEmail) {
    res.status(400).json({
      error: 'userEmail is required (not present on the Firebase user and not provided in the request body)',
    });
    return;
  }

  try {
    await ensureBridgeUser(userId);
    const tokenResponse = await getUserAccessToken(userId);
    const session = await createConnectSession({
      accessToken: tokenResponse.access_token,
      userEmail,
      callbackUrl: process.env.BRIDGE_CONNECT_CALLBACK_URL,
    });

    await db.collection(BRIDGE_ACCOUNTS_COLLECTION).doc(userId).set(
      {
        bridgeExternalUserId: userId,
        bridgeUserUuid: tokenResponse.user.uuid,
        accessToken: encryptSecret(tokenResponse.access_token),
        accessTokenExpiresAt: new Date(tokenResponse.expires_at),
        lastConnectSessionId: session.id,
        lastConnectSessionUrl: session.url,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    logger.info('Bridge Connect session created', { userId, sessionId: session.id });
    res.status(200).json({ connectUrl: session.url });
  } catch (error) {
    logger.error('connectBridgeAccount failed', { userId, error: String(error) });
    res.status(502).json({ error: 'Failed to initiate Bridge Connect', details: String(error) });
  }
});
