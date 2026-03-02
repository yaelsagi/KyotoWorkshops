// Workshop data service
// Handles all workshop-related database operations with proper error handling

import { collection, getDocs, doc, getDoc, query, where, addDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { database, storage } from '../config/firebase';

// Firebase-only image strategy:
// 1) Use Firebase download URLs as source of truth.
// 2) Cache remote files on device for faster repeat views.
// 3) Keep URL metadata in AsyncStorage to restore cache hints between app sessions.
const IMAGE_CACHE_PREFIX = 'kyoto_workshop_images_';
const IMAGE_FILE_CACHE_DIR = `${FileSystem.cacheDirectory}workshop-images/`;

// Checks if a workshop object has all required fields
// Returns an object with {valid: boolean, errors: string[]}
function validateWorkshopData(workshop) {
  const errors = [];
  
  // These fields are required for the app to work properly
  if (!workshop.id || typeof workshop.id !== 'string') {
    errors.push('Workshop must have a valid ID');
  }
  
  if (!workshop.title || workshop.title.trim() === '') {
    errors.push('Title cannot be empty');
  }
  
  if (!workshop.category) {
    errors.push('Category is required');
  }
  
  // Price needs to be a number and make sense (positive value)
  if (typeof workshop.priceYen !== 'number' || workshop.priceYen < 0) {
    errors.push('Price must be a positive number');
  }
  
  // Location coordinates so we can show it on the map
  if (typeof workshop.lat !== 'number' || typeof workshop.lng !== 'number') {
    errors.push('Location coordinates are missing or invalid');
  }
  
  // Check coordinates are actually in Kyoto area (rough bounds)
  if (workshop.lat < 34.9 || workshop.lat > 35.1 || workshop.lng < 135.6 || workshop.lng > 135.9) {
    errors.push('Workshop location must be within Kyoto');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Grabs all workshops from Firebase (single source of truth for production behavior).
export async function fetchWorkshops() {

  try {
    const workshopCollection = collection(database, 'workshops');
    const snapshot = await getDocs(workshopCollection);
    
    // No workshops in database yet
    if (snapshot.empty) {
      return [];
    }
    
    // Convert Firebase documents to plain objects
    const workshops = snapshot.docs.map(document => {
      const data = { id: document.id, ...document.data() };
      
      // Make sure each workshop has valid data before returning it
      const validation = validateWorkshopData(data);
      if (!validation.valid) {
        console.warn(`Workshop ${document.id} has issues:`, validation.errors);
        return null;
      }
      
      return data;
    });
    
    // Filter out any workshops that failed validation
    return workshops.filter(w => w !== null);
    
  } catch (error) {
    // Network error or Firebase unavailable
    console.log('Could not fetch from Firebase:', error.message);
    
    return [];
  }
}

// Gets one specific workshop by its ID
export async function fetchWorkshopById(workshopId) {
  if (!workshopId) {
    throw new Error('Workshop ID is required');
  }
  
  try {
    const workshopDoc = doc(database, 'workshops', workshopId);
    const snapshot = await getDoc(workshopDoc);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const workshopData = { id: snapshot.id, ...snapshot.data() };
    
    // Validate before returning
    const validation = validateWorkshopData(workshopData);
    if (!validation.valid) {
      console.warn('Workshop data validation failed:', validation.errors);
      return null;
    }
    
    return workshopData;
    
  } catch (error) {
    console.log('Error fetching workshop:', error.message);
    return null;
  }
}

// Search workshops by category, ward, or price range
export async function searchWorkshops(filters = {}) {
  try {
    let workshopQuery = collection(database, 'workshops');
    
    // Add filters if provided
    const constraints = [];
    
    if (filters.category && filters.category !== 'Any') {
      constraints.push(where('category', '==', filters.category));
    }
    
    if (filters.ward && filters.ward !== 'Any') {
      constraints.push(where('ward', '==', filters.ward));
    }
    
    if (filters.isTop) {
      constraints.push(where('isTop', '==', true));
    }
    
    // Build query with all constraints
    if (constraints.length > 0) {
      workshopQuery = query(workshopQuery, ...constraints);
    }
    
    const snapshot = await getDocs(workshopQuery);
    
    if (snapshot.empty) {
      return [];
    }
    
    // Convert and validate results
    const results = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(workshop => {
        const validation = validateWorkshopData(workshop);
        return validation.valid;
      });
    
    // Client-side price filtering (Firestore doesn't support multiple range queries easily)
    if (filters.minPrice || filters.maxPrice) {
      return results.filter(workshop => {
        if (filters.minPrice && workshop.priceYen < filters.minPrice) return false;
        if (filters.maxPrice && workshop.priceYen > filters.maxPrice) return false;
        return true;
      });
    }
    
    return results;
    
  } catch (error) {
    console.log('Search failed:', error.message);
    return [];
  }
}

// Host creates a new workshop
export async function createWorkshop(workshopData) {
  // Validate the data before sending to database
  const validation = validateWorkshopData(workshopData);
  
  if (!validation.valid) {
    throw new Error(`Invalid workshop data: ${validation.errors.join(', ')}`);
  }
  
  try {
    const workshopCollection = collection(database, 'workshops');
    const documentRef = await addDoc(workshopCollection, {
      ...workshopData,
      createdAt: new Date().toISOString(),
    });
    
    return { id: documentRef.id, ...workshopData };
    
  } catch (error) {
    console.error('Failed to create workshop:', error);
    throw new Error('Could not save workshop to database');
  }
}

// Update workshop details (for hosts managing their workshops)
export async function updateWorkshop(workshopId, updates) {
  if (!workshopId) {
    throw new Error('Workshop ID required for update');
  }
  
  try {
    const workshopDoc = doc(database, 'workshops', workshopId);
    
    await updateDoc(workshopDoc, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    
    return true;
    
  } catch (error) {
    console.error('Update failed:', error);
    throw new Error('Could not update workshop');
  }
}

// Get workshop image source from workshop.images
// Expected format is Firebase Storage download URLs stored in Firestore
export function getWorkshopImageUrl(workshop, imageIndex = 0) {
  try {
    if (!workshop?.images || !Array.isArray(workshop.images) || workshop.images.length === 0) {
      return null;
    }

    if (imageIndex >= workshop.images.length) {
      imageIndex = 0;
    }

    const imageUrl = workshop.images[imageIndex];
    
    // Remote image path (Firebase Storage URL) or cached local file URI
    if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
      return { uri: imageUrl };
    }

    if (typeof imageUrl === 'string' && imageUrl.startsWith('file://')) {
      return { uri: imageUrl };
    }

    return null;
  } catch (error) {
    console.log(`Could not load image for ${workshop?.id || 'unknown workshop'}:`, error.message);
    return null;
  }
}

// Get all workshop images as array
// Returns array of image sources ready for FlatList or carousel
export function getAllWorkshopImages(workshop) {
  if (!workshop.images || !Array.isArray(workshop.images) || workshop.images.length === 0) {
    return [];
  }

  return workshop.images
    .map((_, index) => getWorkshopImageUrl(workshop, index))
    .filter(Boolean);
}

async function cacheWorkshopImageUrls(workshopId, imageUrls) {
  // We cache only URL lists (not binary image data) to keep storage small and simple.
  if (!workshopId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return;
  }

  try {
    const payload = {
      imageUrls,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(`${IMAGE_CACHE_PREFIX}${workshopId}`, JSON.stringify(payload));
  } catch (error) {
    console.log('Could not cache workshop images:', error.message);
  }
}

async function getCachedWorkshopImageUrls(workshopId) {
  // Restores previously known remote URLs so screens can recover faster after relaunch.
  if (!workshopId) {
    return [];
  }

  try {
    const raw = await AsyncStorage.getItem(`${IMAGE_CACHE_PREFIX}${workshopId}`);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.imageUrls || !Array.isArray(parsed.imageUrls)) {
      return [];
    }

    return parsed.imageUrls;
  } catch (error) {
    console.log('Could not read cached workshop images:', error.message);
    return [];
  }
}

function getImageFileExtension(imageUrl) {
  const cleanUrl = String(imageUrl || '').split('?')[0];
  const match = cleanUrl.match(/\.(jpg|jpeg|png|webp)$/i);
  return match ? match[1].toLowerCase() : 'jpg';
}

function sanitizeWorkshopId(workshopId) {
  return String(workshopId || 'workshop').replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function ensureImageCacheDirectory() {
  try {
    const directoryInfo = await FileSystem.getInfoAsync(IMAGE_FILE_CACHE_DIR);
    if (!directoryInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGE_FILE_CACHE_DIR, { intermediates: true });
    }
  } catch (error) {
    console.log('Could not prepare image cache directory:', error.message);
  }
}

async function cacheRemoteWorkshopImage(workshopId, imageIndex, imageUrl) {
  try {
    await ensureImageCacheDirectory();
    const safeWorkshopId = sanitizeWorkshopId(workshopId);
    const extension = getImageFileExtension(imageUrl);
    const cachedFileUri = `${IMAGE_FILE_CACHE_DIR}${safeWorkshopId}_${imageIndex}.${extension}`;

    const fileInfo = await FileSystem.getInfoAsync(cachedFileUri);
    if (fileInfo.exists) {
      return cachedFileUri;
    }

    const downloadResult = await FileSystem.downloadAsync(imageUrl, cachedFileUri);
    return downloadResult?.uri || imageUrl;
  } catch (error) {
    console.log('Could not cache remote image file:', error.message);
    return imageUrl;
  }
}

// Resolves display-ready image sources and caches remote images on device storage.
// This is used by the workshop detail/gallery screens for real-app behavior.
export async function getAllWorkshopImagesForDisplay(workshop) {
  if (!workshop?.images || !Array.isArray(workshop.images) || workshop.images.length === 0) {
    return [];
  }

  const resolvedSources = await Promise.all(
    workshop.images.map(async (imageValue, index) => {
      if (typeof imageValue === 'string' && imageValue.startsWith('http')) {
        const localFileUri = await cacheRemoteWorkshopImage(workshop.id, index, imageValue);
        return { uri: localFileUri };
      }

      if (typeof imageValue === 'string' && imageValue.startsWith('file://')) {
        return { uri: imageValue };
      }

      return null;
    })
  );

  return resolvedSources.filter(Boolean);
}

export async function prefetchWorkshopImages(workshop) {
  if (!workshop?.id) {
    return;
  }

  // Pull out remote URLs only; these are downloaded and cached on-device.
  const remoteUrls = Array.isArray(workshop.images)
    ? workshop.images.filter((url) => typeof url === 'string' && url.startsWith('http'))
    : [];

  if (remoteUrls.length > 0) {
    // Warm both memory and file cache for faster repeat workshop views.
    await Promise.all(remoteUrls.map((url, index) =>
      cacheRemoteWorkshopImage(workshop.id, index, url)
    ));
    await Promise.all(remoteUrls.map((url) => Image.prefetch(url).catch(() => false)));
    await cacheWorkshopImageUrls(workshop.id, remoteUrls);
    return;
  }

  // If the workshop currently has no remote URLs, recover cached URL list as fallback.
  const cachedUrls = await getCachedWorkshopImageUrls(workshop.id);
  if (cachedUrls.length > 0) {
    // Mutating this in-memory object keeps downstream image selection logic unchanged.
    workshop.images = cachedUrls;
  }
}

// Upload one image file to Firebase Storage and attach URL to workshop document
// imageBlob is expected to come from file picker/camera processing
export async function uploadWorkshopImage(workshopId, imageBlob, fileExtension = 'jpg') {
  if (!workshopId) {
    throw new Error('Workshop ID is required');
  }

  if (!imageBlob) {
    throw new Error('Image file is required');
  }

  try {
    const timestamp = Date.now();
    const imageRef = ref(storage, `images/${workshopId}/image_${timestamp}.${fileExtension}`);
    await uploadBytes(imageRef, imageBlob);
    const downloadUrl = await getDownloadURL(imageRef);

    const workshopDoc = doc(database, 'workshops', workshopId);
    await updateDoc(workshopDoc, {
      images: arrayUnion(downloadUrl),
      updatedAt: new Date().toISOString(),
    });

    return downloadUrl;
  } catch (error) {
    console.error('Image upload failed:', error);
    throw new Error('Could not upload workshop image');
  }
}

export { validateWorkshopData };
