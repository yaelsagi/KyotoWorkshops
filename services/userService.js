// User service
// Handles Firestore user profile operations

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

// Get user profile from Firestore
export async function getUserProfile(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      console.warn('User profile not found:', uid);
      return null;
    }
    
    return {
      uid,
      ...userDoc.data(),
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw new Error('Could not load user profile');
  }
}

// Update user profile fields
export async function updateUserProfile(uid, data) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Could not update profile');
  }
}

// Update user roles (learner/host/translator)
export async function updateUserRoles(uid, roles) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      roles,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating user roles:', error);
    throw new Error('Could not update roles');
  }
}

// Update user supported languages
export async function updateUserLanguages(uid, languages) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      languages,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating user languages:', error);
    throw new Error('Could not update languages');
  }
}

/**
 * Update the user's profile photo URL in Firestore
 * Pass null to remove the photo
 */
export async function updateUserPhotoURL(uid, photoURL) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      photoURL: photoURL || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating user photo:', error);
    throw new Error('Could not update profile photo');
  }
}

