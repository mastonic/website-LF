import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();

export const BRIDGE_ACCOUNTS_COLLECTION = 'bridgeAccounts';
export const ENABLE_BANKING_SESSIONS_COLLECTION = 'enableBankingSessions';
export const TRANSACTIONS_COLLECTION = 'transactions';
