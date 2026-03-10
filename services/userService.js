// User service
// Handles Firestore user profile operations

import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const HOST_APPLICATION_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

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

export async function submitHostApplication(uid) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      hostApplicationStatus: HOST_APPLICATION_STATUS.PENDING,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error submitting host application:', error);
    throw new Error('Could not submit host application');
  }
}

export async function fetchPendingHostApplications() {
  try {
    const usersRef = collection(db, 'users');
    const pendingQuery = query(usersRef, where('hostApplicationStatus', '==', HOST_APPLICATION_STATUS.PENDING));
    const snapshot = await getDocs(pendingQuery);

    return snapshot.docs.map((document) => ({
      uid: document.id,
      ...document.data(),
    }));
  } catch (error) {
    console.error('Error fetching pending host applications:', error);
    throw new Error('Could not load host applications');
  }
}

export async function reviewHostApplication(uid, approved) {
  try {
    const userDoc = doc(db, 'users', uid);
    const currentProfile = await getDoc(userDoc);
    if (!currentProfile.exists()) {
      throw new Error('User not found');
    }

    const profileData = currentProfile.data();
    const currentRoles = profileData.roles || { learner: true, host: false, translator: false };

    await updateDoc(userDoc, {
      hostApplicationStatus: approved ? HOST_APPLICATION_STATUS.APPROVED : HOST_APPLICATION_STATUS.REJECTED,
      roles: {
        ...currentRoles,
        learner: true,
        host: approved,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error reviewing host application:', error);
    throw new Error('Could not review host application');
  }
}

export { HOST_APPLICATION_STATUS };
