import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/firebase';

/**
 * Firebase Storage Service
 *
 * Handles user profile photos and translator proof document uploads.
 */

// Upload or replace a user's profile photo
export async function uploadUserProfilePhoto(userId, imageFile) {
  if (!userId) {
    throw new Error('User ID is required to upload profile photo');
  }
  if (!imageFile || !imageFile.uri) {
    throw new Error('Valid image file with URI is required');
  }

  try {
    // Use a consistent filename so new uploads replace old ones
    const filename = 'profile.jpg';
    const storagePath = `user-photos/${userId}/${filename}`;
    const storageRef = ref(storage, storagePath);

    // Convert URI to blob for upload
    const response = await fetch(imageFile.uri);
    const blob = await response.blob();

    const snapshot = await uploadBytes(storageRef, blob);
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return downloadUrl;

  } catch (error) {
    console.error('Profile photo upload failed:', error);
    throw new Error(`Could not upload profile photo: ${error.message}`);
  }
}

// Delete a user's profile photo from storage
export async function deleteUserProfilePhoto(userId) {
  if (!userId) {
    throw new Error('User ID is required to delete profile photo');
  }

  try {
    const filename = 'profile.jpg';
    const storagePath = `user-photos/${userId}/${filename}`;
    const imageRef = ref(storage, storagePath);
    
    await deleteObject(imageRef);
    return true;

  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      return true;
    }
    console.error('Failed to delete profile photo:', error);
    throw new Error(`Could not delete profile photo: ${error.message}`);
  }
}

// Delete all files in a user's photo folder (called before account deletion)
export async function deleteUserPhotoFolder(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const userPhotoFolder = ref(storage, `user-photos/${userId}`);
    const result = await listAll(userPhotoFolder);

    for (const fileRef of result.items) {
      try {
        await deleteObject(fileRef);
      } catch (error) {
        console.warn(`Failed to delete file ${fileRef.name}:`, error);
      }
    }

    return true;

  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      return true;
    }
    console.error('Failed to delete user photo folder:', error);
    throw new Error(`Could not delete user photos: ${error.message}`);
  }
}

// Upload translator proof document
export async function uploadTranslatorProofDocument(userId, asset, prefix = 'proof') {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!asset?.uri) {
    throw new Error('Document asset is required');
  }

  const extension = (asset.fileName || asset.uri || '').split('.').pop() || 'jpg';
  const filename = `${prefix}_${Date.now()}.${extension}`;
  const storagePath = `translator-docs/${userId}/${filename}`;

  const fileRef = ref(storage, storagePath);
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  await uploadBytes(fileRef, blob);
  const url = await getDownloadURL(fileRef);
  return url;
}

export default {
  uploadUserProfilePhoto,
  deleteUserProfilePhoto,
  deleteUserPhotoFolder,
  uploadTranslatorProofDocument,
};
