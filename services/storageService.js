import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { storage, db } from '../firebase/firebase';

/**
 * Firebase Storage Service
 *
 * Handles image uploads for workshops, user profiles, and translator documents.
 * Workshop images were seeded manually via Firebase Console —
 * these functions are used for user-generated uploads.
 */

// Upload a single image to a workshop's storage folder, returns its download URL
export async function uploadWorkshopImage(workshopId, imageFile) {
  if (!workshopId) {
    throw new Error('Workshop ID required');
  }
  if (!imageFile) {
    throw new Error('Image file required');
  }

  try {
    // Generate unique filename using timestamp + random
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileExtension = imageFile.name ? imageFile.name.split('.').pop() : 'jpg';
    const filename = `image_${timestamp}_${random}.${fileExtension}`;

    // Create storage path
    const storagePath = `workshop-images/${workshopId}/${filename}`;
    const storageRef = ref(storage, storagePath);

    // Convert URI to blob for upload
    const blob = await fetch(imageFile.uri).then(res => res.blob());
    
    // Upload to Storage
    const snapshot = await uploadBytes(storageRef, blob);

    const downloadUrl = await getDownloadURL(snapshot.ref);

    return downloadUrl;

  } catch (error) {
    console.error('Image upload failed:', error);
    throw new Error(`Could not upload image: ${error.message}`);
  }
}

// Upload multiple images and save all URLs to the workshop's Firestore document
export async function uploadMultipleImagesToWorkshop(workshopId, imageFiles) {
  if (!workshopId) {
    throw new Error('Workshop ID required');
  }
  if (!imageFiles || imageFiles.length === 0) {
    throw new Error('At least one image required');
  }

  const uploadedUrls = [];
  const errors = [];

  try {
    // Upload each image
    for (let i = 0; i < imageFiles.length; i++) {
      try {
        const downloadUrl = await uploadWorkshopImage(workshopId, imageFiles[i]);
        uploadedUrls.push(downloadUrl);
      } catch (error) {
        errors.push(`Image ${i + 1}: ${error.message}`);
      }
    }

    // If at least one uploaded, save to Firestore
    if (uploadedUrls.length > 0) {
      await updateWorkshopImages(workshopId, uploadedUrls);
    }

    // Warn about any failures
    if (errors.length > 0) {
      console.warn('Some uploads failed:', errors);
    }

    return uploadedUrls;

  } catch (error) {
    console.error('Batch upload failed:', error);
    throw new Error(`Could not upload images: ${error.message}`);
  }
}

// Append image URLs to a workshop's Firestore document (does not replace existing)
export async function updateWorkshopImages(workshopId, imageUrls) {
  if (!workshopId) {
    throw new Error('Workshop ID required');
  }
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('At least one image URL required');
  }

  try {
    const workshopDoc = doc(db, 'workshops', workshopId);
    
    // Add each URL to the images array
    // Using arrayUnion to avoid duplicates
    for (const url of imageUrls) {
      await updateDoc(workshopDoc, {
        images: arrayUnion(url),
        updatedAt: new Date().toISOString(),
      });
    }

    return true;

  } catch (error) {
    console.error('Failed to update workshop images in Firestore:', error);
    throw new Error(`Could not save images to database: ${error.message}`);
  }
}

// List all image filenames in a workshop's storage folder
export async function listWorkshopImages(workshopId) {
  if (!workshopId) {
    throw new Error('Workshop ID required');
  }

  try {
    const workshopFolder = ref(storage, `workshop-images/${workshopId}`);
    const result = await listAll(workshopFolder);
    
    const imageNames = result.items.map(itemRef => itemRef.name);
    return imageNames;

  } catch (error) {
    console.error('Failed to list images:', error);
    return [];
  }
}

// Delete a specific image from a workshop's storage folder
export async function deleteWorkshopImage(workshopId, imageName) {
  if (!workshopId || !imageName) {
    throw new Error('Workshop ID and image name required');
  }

  try {
    const imageRef = ref(storage, `workshop-images/${workshopId}/${imageName}`);
    await deleteObject(imageRef);
    return true;

  } catch (error) {
    console.error('Failed to delete image:', error);
    throw new Error(`Could not delete image: ${error.message}`);
  }
}

// Get the download URL for a specific image in a workshop's folder
export async function getWorkshopImageUrl(workshopId, imageName) {
  if (!workshopId || !imageName) {
    throw new Error('Workshop ID and image name required');
  }

  try {
    const imageRef = ref(storage, `workshop-images/${workshopId}/${imageName}`);
    const downloadUrl = await getDownloadURL(imageRef);
    return downloadUrl;

  } catch (error) {
    console.error('Failed to get image URL:', error);
    throw new Error(`Could not get image URL: ${error.message}`);
  }
}

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
  uploadWorkshopImage,
  uploadMultipleImagesToWorkshop,
  updateWorkshopImages,
  listWorkshopImages,
  deleteWorkshopImage,
  getWorkshopImageUrl,
  uploadUserProfilePhoto,
  deleteUserProfilePhoto,
  deleteUserPhotoFolder,
  uploadTranslatorProofDocument,
};
