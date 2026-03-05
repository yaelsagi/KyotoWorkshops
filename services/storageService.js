import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { storage, db } from '../firebase/firebase';

/**
 * Firebase Storage Service (Optional)
 * 
 * Workshop images were uploaded manually via Firebase Console.
 * These functions are available for future use cases:
 * - User-generated content uploads
 * - Dynamic image management
 * - Host self-service image updates
 */

/**
 * Upload image file to Firebase Storage under workshop folder
 * 
 * @param workshopId - e.g., "workshop_tea_ceremony"
 * @param imageFile - File object from document picker (has uri, name, type, size)
 * @returns {Promise<string>} - Download URL of uploaded image
 * 
 * Example: "workshop-images/workshop_tea_ceremony/image_1709734800000.jpg"
 */
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
    console.log(`Image uploaded to: ${snapshot.fullPath}`);

    // Get download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);
    console.log(`Download URL: ${downloadUrl}`);

    return downloadUrl;

  } catch (error) {
    console.error('Image upload failed:', error);
    throw new Error(`Could not upload image: ${error.message}`);
  }
}

/**
 * Upload multiple images and save URLs to Firestore workshop document
 * 
 * @param workshopId - e.g., "workshop_tea_ceremony"
 * @param imageFiles - Array of File objects
 * @returns {Promise<Array>} - Array of download URLs
 */
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
        console.log(`Uploading image ${i + 1}/${imageFiles.length}...`);
        const downloadUrl = await uploadWorkshopImage(workshopId, imageFiles[i]);
        uploadedUrls.push(downloadUrl);
      } catch (error) {
        errors.push(`Image ${i + 1}: ${error.message}`);
      }
    }

    // If at least one uploaded, save to Firestore
    if (uploadedUrls.length > 0) {
      await updateWorkshopImages(workshopId, uploadedUrls);
      console.log(`Successfully uploaded ${uploadedUrls.length} images`);
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

/**
 * Save image URLs to Firestore workshop document
 * Adds URLs to existing "images" array (doesn't replace, just appends)
 * 
 * @param workshopId - e.g., "workshop_tea_ceremony"
 * @param imageUrls - Array of download URLs to save
 */
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

    console.log(`Saved ${imageUrls.length} image URLs to workshop ${workshopId}`);
    return true;

  } catch (error) {
    console.error('Failed to update workshop images in Firestore:', error);
    throw new Error(`Could not save images to database: ${error.message}`);
  }
}

/**
 * Get all images for a workshop from Storage
 * Useful for listing what's already uploaded
 * 
 * @param workshopId - e.g., "workshop_tea_ceremony"
 * @returns {Promise<Array>} - Array of image filenames
 */
export async function listWorkshopImages(workshopId) {
  if (!workshopId) {
    throw new Error('Workshop ID required');
  }

  try {
    const workshopFolder = ref(storage, `workshop-images/${workshopId}`);
    const result = await listAll(workshopFolder);
    
    const imageNames = result.items.map(itemRef => itemRef.name);
    console.log(`Found ${imageNames.length} images in ${workshopId}`);
    
    return imageNames;

  } catch (error) {
    console.error('Failed to list images:', error);
    return [];
  }
}

/**
 * Delete an image from Storage
 * 
 * @param workshopId - e.g., "workshop_tea_ceremony"
 * @param imageName - filename e.g., "image_1709734800000_abc123.jpg"
 */
export async function deleteWorkshopImage(workshopId, imageName) {
  if (!workshopId || !imageName) {
    throw new Error('Workshop ID and image name required');
  }

  try {
    const imageRef = ref(storage, `workshop-images/${workshopId}/${imageName}`);
    await deleteObject(imageRef);
    console.log(`Deleted image: ${imageName}`);
    return true;

  } catch (error) {
    console.error('Failed to delete image:', error);
    throw new Error(`Could not delete image: ${error.message}`);
  }
}

/**
 * Get download URL for a specific image
 * Useful if you have the storage path and need the URL
 * 
 * @param workshopId - e.g., "workshop_tea_ceremony"
 * @param imageName - filename e.g., "image_1709734800000_abc123.jpg"
 */
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

export default {
  uploadWorkshopImage,
  uploadMultipleImagesToWorkshop,
  updateWorkshopImages,
  listWorkshopImages,
  deleteWorkshopImage,
  getWorkshopImageUrl,
};
