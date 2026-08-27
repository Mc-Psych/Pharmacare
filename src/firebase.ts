import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  initializeFirestore,
  doc,
  getDocFromServer,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Suppress internal Firestore connection probes from spamming console
setLogLevel('error');

const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore using configured database ID with forced long polling for optimal connection stability in web/iframe sandbox
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

export async function ensureAuth() {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch {
    return null;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const isOfflineOrUnavailable = error instanceof Error && (
    error.message.includes('unavailable') ||
    error.message.includes('offline') ||
    error.message.includes('Failed to get document because the client is offline') ||
    error.message.includes('Could not reach Cloud Firestore backend')
  );

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };

  if (isOfflineOrUnavailable) {
    console.warn(`[Firestore Offline Cache] ${operationType.toUpperCase()} on "${path || 'collection'}": operating in resilient local mode.`);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  return errInfo;
}

// Connection test
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'settings', 'global'));
    return true;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('client is offline') || error.message.includes('unavailable'))) {
      console.warn('Firebase Firestore client is operating in offline mode.');
      return false;
    }
    return true;
  }
}

