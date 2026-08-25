import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { User, UserRole, PermissionKey } from '../types';

export const USERS_COLLECTION = 'users';

// Fallback staff emails and credentials for initial provisioning in Firebase Auth
export const DEFAULT_STAFF_ACCOUNTS: Array<{
  username: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string;
  defaultPassword: string;
}> = [
  {
    username: 'courage',
    email: 'courage@pharmacare.com',
    name: 'Courage Kay',
    role: 'admin',
    phone: '+233 24 019 9000',
    defaultPassword: 'AdminSecure@2026',
  },
  {
    username: 'kwesi',
    email: 'kwesi.mensah@pharmacare.com',
    name: 'Kwesi Mensah, MPharm',
    role: 'pharmacist',
    phone: '+233 20 441 2288',
    defaultPassword: 'PharmSecure@2026',
  },
  {
    username: 'abena',
    email: 'abena.osei@pharmacare.com',
    name: 'Abena Osei',
    role: 'cashier',
    phone: '+233 27 889 1100',
    defaultPassword: 'CashierSecure@2026',
  },
  {
    username: 'kofi',
    email: 'kofi.boateng@pharmacare.com',
    name: 'Kofi Boateng',
    role: 'dispensing_assistant',
    phone: '+233 54 332 9988',
    defaultPassword: 'DispenseSecure@2026',
  },
  {
    username: 'ama',
    email: 'ama.asante@pharmacare.com',
    name: 'Ama Asante',
    role: 'storekeeper',
    phone: '+233 24 991 3344',
    defaultPassword: 'StoreSecure@2026',
  },
];

/**
 * Sign in using Firebase Authentication with Email & Password.
 * Supports identifier as either email or username (resolves username to email).
 */
export async function loginWithFirebaseAuth(
  identifier: string,
  password?: string
): Promise<{ success: boolean; user?: User; error?: string; requiresPasswordChange?: boolean }> {
  try {
    const cleanId = identifier.trim().toLowerCase();
    
    // Resolve email from username or direct email
    let email = cleanId;
    const defaultStaff = DEFAULT_STAFF_ACCOUNTS.find(
      s => s.username.toLowerCase() === cleanId || s.email.toLowerCase() === cleanId
    );

    if (defaultStaff) {
      email = defaultStaff.email;
    } else if (!cleanId.includes('@')) {
      email = `${cleanId}@pharmacare.com`;
    }

    const effectivePassword = password && password.trim() ? password.trim() : (defaultStaff?.defaultPassword || 'Pharmacy@123');

    let fbUserCredential;
    try {
      fbUserCredential = await signInWithEmailAndPassword(auth, email, effectivePassword);
    } catch (authErr: any) {
      // If user does not exist in Firebase Auth yet and is one of the initial staff members, auto-provision
      if (
        (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') &&
        defaultStaff
      ) {
        try {
          fbUserCredential = await createUserWithEmailAndPassword(auth, email, defaultStaff.defaultPassword);
        } catch (createErr: any) {
          // If already exists, retry sign in with default staff password
          if (createErr.code === 'auth/email-already-in-use') {
            fbUserCredential = await signInWithEmailAndPassword(auth, email, defaultStaff.defaultPassword);
          } else {
            throw authErr;
          }
        }
      } else {
        throw authErr;
      }
    }

    const fbUser = fbUserCredential.user;
    if (!fbUser) {
      return { success: false, error: 'Authentication failed. No user record returned.' };
    }

    // Fetch user profile from Firestore /users/{uid}
    const userDocRef = doc(db, USERS_COLLECTION, fbUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    let appUser: User;
    if (userDocSnap.exists()) {
      const data = userDocSnap.data() as User;
      appUser = {
        ...data,
        id: fbUser.uid,
        email: fbUser.email || data.email,
      };

      // Check if suspended
      if (appUser.status === 'inactive' || appUser.isActive === false) {
        await signOut(auth);
        return { success: false, error: 'Account is deactivated. Please contact the administrator.' };
      }

      // Update lastLoginAt
      await updateDoc(userDocRef, {
        lastLogin: new Date().toISOString(),
        lastLoginAt: serverTimestamp(),
      });
    } else {
      // Create user profile in Firestore
      const role = defaultStaff ? defaultStaff.role : 'cashier';
      const name = defaultStaff ? defaultStaff.name : (fbUser.displayName || identifier);
      const username = defaultStaff ? defaultStaff.username : identifier.split('@')[0];
      const phone = defaultStaff ? defaultStaff.phone : '';

      appUser = {
        id: fbUser.uid,
        username,
        name,
        email: fbUser.email || email,
        role,
        phone,
        isActive: true,
        status: 'active',
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        mustChangePasswordOnLogin: false,
      };

      await setDoc(userDocRef, {
        ...appUser,
        createdAtServer: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    }

    return {
      success: true,
      user: appUser,
      requiresPasswordChange: Boolean(appUser.mustChangePasswordOnLogin),
    };
  } catch (error: any) {
    console.error('Firebase Auth Login Error:', error);
    let message = 'Authentication failed. Please verify your credentials.';
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      message = 'Invalid password or username. Please check your credentials.';
    } else if (error.code === 'auth/user-not-found') {
      message = 'No registered staff account found matching this identifier.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Access temporarily locked due to multiple failed login attempts. Please try again in a few minutes.';
    } else if (error.message) {
      message = error.message;
    }
    return { success: false, error: message };
  }
}

/**
 * Log out current Firebase Authentication session
 */
export async function logoutFirebaseAuth(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: `Password reset instructions sent to ${email}` };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return { success: false, message: error.message || 'Failed to send password reset email' };
  }
}

/**
 * Update authenticated user password
 */
export async function changeUserPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, error: 'No authenticated user session.' };
    }
    await updatePassword(currentUser, newPassword);

    // Update mustChangePasswordOnLogin flag in Firestore
    const userDocRef = doc(db, USERS_COLLECTION, currentUser.uid);
    await updateDoc(userDocRef, {
      mustChangePasswordOnLogin: false,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Change password error:', error);
    return { success: false, error: error.message || 'Failed to update password.' };
  }
}
