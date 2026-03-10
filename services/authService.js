// Authentication service
// Handles user sign up, sign in, and sign out with Firebase Auth

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  deleteUser
} from 'firebase/auth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

/**
 * Create a new user account with email, password, and display name
 * All three fields are required to ensure proper user identification
 */
export async function signUpWithEmail(email, password, displayName) {
  // Make sure we have all the required information before proceeding
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  if (!displayName || !displayName.trim()) {
    throw new Error('Display name is required');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  try {
    // Create Firebase Auth user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update the user's display name in Firebase Auth
    await updateProfile(user, { displayName: displayName.trim() });

    // Create a detailed user profile document in Firestore with the chosen display name
    await setDoc(doc(db, 'users', user.uid), {
      displayName: displayName.trim(),
      email: user.email,
      roles: {
        learner: true,
        host: false,
        translator: false,
      },
      hostApplicationStatus: 'none',
      translatorApplicationStatus: 'none',
      languages: [],
      photoURL: null, // profile photo will be added later
      createdAt: new Date().toISOString(),
    });

    return user;
  } catch (error) {
    console.error('Sign up failed:', error);
    
    // Friendly error messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak');
    }
    
    throw new Error('Could not create account. Please try again.');
  }
}

// Sign in existing user
export async function signInWithEmail(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
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

/**
 * Delete the current user's account completely
 * Removes: user document from Firestore, Firebase Auth user account
 * Note: User deletes own profile photos separately from storageService
 * 
 * @param userId - The user's UID
 */
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
    console.log(`User document deleted from Firestore: ${userId}`);

    // Delete the Firebase Auth account
    // This must be done last because deleteUser will sign the user out
    await deleteUser(currentUser);
    console.log(`Firebase Auth user deleted: ${userId}`);

    return true;
  } catch (error) {
    console.error('Account deletion failed:', error);
    
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Please sign out and sign in again before deleting your account');
    }
    
    throw new Error(`Could not delete account: ${error.message}`);
  }
}
