// Authentication service
// Handles user sign up, sign in, and sign out with Firebase Auth

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  deleteUser,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { getPasswordValidationError } from '../utils/passwordValidation';
import { DEFAULT_TRANSLATOR_APPLICATION, DEFAULT_TRANSLATOR_PROFILE } from '../constants/translatorOptions';

// Create a new user account with email, password, and display name
export async function signUpWithEmail(email, password, displayName) {
  // Validate required fields
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  if (!String(email).trim()) {
    throw new Error('Email cannot be empty');
  }

  if (!displayName || !displayName.trim()) {
    throw new Error('Display name is required');
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  const cleanedEmail = String(email).trim().toLowerCase();

  try {
    const existingSignInMethods = await fetchSignInMethodsForEmail(auth, cleanedEmail);
    if (existingSignInMethods.length > 0) {
      throw new Error('An account using this email already exists.');
    }

    // Create Firebase Auth user account
    const userCredential = await createUserWithEmailAndPassword(auth, cleanedEmail, password);
    const user = userCredential.user;

    // Update the user's display name in Firebase Auth
    await updateProfile(user, { displayName: displayName.trim() });

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      displayName: displayName.trim(),
      email: user.email,
      photoURL: null,
      roles: {
        admin: false,
        host: false,
        translator: false,
      },
      translatorApplication: DEFAULT_TRANSLATOR_APPLICATION,
      translatorProfile: DEFAULT_TRANSLATOR_PROFILE,
      languages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return user;
  } catch (error) {
    console.error('Sign up failed:', error);
    
    // Friendly error messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('An account using this email already exists.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak');
    }
    
    throw new Error('Could not create account. Please try again.');
  }
}

// Change current user password
export async function changeCurrentUserPassword(currentPassword, newPassword) {
  if (!currentPassword || !newPassword) {
    throw new Error('Current password and new password are required');
  }

  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to change your password');
  }

  if (!currentUser.email) {
    throw new Error('Your account email is unavailable');
  }

  const passwordError = getPasswordValidationError(newPassword);
  if (passwordError) {
    throw new Error(passwordError);
  }

  if (currentPassword === newPassword) {
    throw new Error('New password must be different from your current password.');
  }

  try {
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
    return true;
  } catch (error) {
    console.error('Password change failed:', error);

    if (
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/invalid-login-credentials'
    ) {
      throw new Error('Current password is incorrect');
    }

    if (error.code === 'auth/weak-password') {
      throw new Error('New password is too weak');
    }

    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Please sign out and sign in again before changing your password');
    }

    throw new Error(error.message || 'Could not change password. Please try again.');
  }
}

// Update current user display name in Firebase Auth
export async function updateCurrentUserDisplayName(nextDisplayName) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to update your profile');
  }

  const cleanedName = String(nextDisplayName || '').trim();

  if (!cleanedName) {
    throw new Error('Display name is required');
  }

  await updateProfile(currentUser, { displayName: cleanedName });
  return cleanedName;
}

// Re-authenticate current user with password
export async function reauthenticateCurrentUser(password) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to continue');
  }

  if (!currentUser.email) {
    throw new Error('Your account email is unavailable');
  }

  if (!password) {
    throw new Error('Current password is required');
  }

  try {
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);
    return true;
  } catch (error) {
    if (
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/invalid-login-credentials'
    ) {
      throw new Error('Current password is incorrect');
    }

    throw new Error(error.message || 'Could not verify your password. Please try again.');
  }
}

// Delete account after explicit password verification
export async function deleteUserAccountWithPassword(userId, currentPassword) {
  await reauthenticateCurrentUser(currentPassword);
  return deleteUserAccount(userId);
}

// Sign in existing user
export async function signInWithEmail(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  if (!String(email).trim()) {
    throw new Error('Email cannot be empty');
  }

  const cleanedEmail = String(email).trim().toLowerCase();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanedEmail, password);
    return userCredential.user;
  } catch (error) {
    console.error('Sign in failed:', error);
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled');
    }
    
    throw new Error('Could not sign in. Please try again.');
  }
}

// Sign out current user
export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out failed:', error);
    throw new Error('Could not sign out. Please try again.');
  }
}

// Get current auth user (synchronous)
export function getCurrentAuthUser() {
  return auth.currentUser;
}

// Delete the current user's account (Firestore doc + Auth user)
// Profile photos must be deleted separately via storageService before calling this
export async function deleteUserAccount(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const currentUser = auth.currentUser;
    
    // Only allow users to delete their own accounts
    if (!currentUser || currentUser.uid !== userId) {
      throw new Error('You can only delete your own account');
    }

    // Delete the user document from Firestore first
    const userDoc = doc(db, 'users', userId);
    await deleteDoc(userDoc);

    // Must be last — deleteUser signs the user out immediately
    await deleteUser(currentUser);

    return true;
  } catch (error) {
    console.error('Account deletion failed:', error);
    
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Please sign out and sign in again before deleting your account');
    }
    
    throw new Error(`Could not delete account: ${error.message}`);
  }
}
