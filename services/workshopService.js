// Workshop data service
// Handles all workshop-related database operations with proper error handling
//
// Data Persistence & Offline Support:
// - Firebase Firestore is the primary data source (cloud-first architecture)
// - Images use expo-image with disk caching for fast repeat loads
// - AsyncStorage caches workshop data for offline fallback
// - If network fails, app uses cached data instead of crashing
// - Favorites are persisted in AsyncStorage (local device storage)
//
// Error Handling:
// - All network errors are caught and logged
// - Validation ensures data integrity before display
// - Graceful degradation: show cached data or empty state if network fails

import { collection, getDocs, doc, getDoc, query, where, addDoc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { db, storage } from '../firebase/firebase';
import { ALL_OPTION, KYOTO_WARDS } from '../constants/kyotoWards';
import { normalizeWardName } from '../utils/normalizeWardName';

function normalizeWorkshopLocation(workshop) {
  if (!workshop || typeof workshop !== 'object') {
    return workshop;
  }

  return {
    ...workshop,
    ward: normalizeWardName(workshop.ward),
  };
}

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

  const normalizedWard = normalizeWardName(workshop.ward);
  if (!normalizedWard) {
    errors.push('Ward is required');
  } else if (!KYOTO_WARDS.includes(normalizedWard)) {
    errors.push('Ward must be a valid Kyoto ward');
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
// Falls back to AsyncStorage cache if network error (offline support).
export async function fetchWorkshops() {
  const CACHE_KEY = 'kyoto_workshops_cache';

  try {
    const workshopCollection = collection(db, 'workshops');
    const snapshot = await getDocs(workshopCollection);
    
    // No workshops in database yet
    if (snapshot.empty) {
      return [];
    }
    
    // Convert Firebase documents to plain objects
    const workshops = snapshot.docs.map(document => {
      const data = normalizeWorkshopLocation({ id: document.id, ...document.data() });
      
      // Make sure each workshop has valid data before returning it
      const validation = validateWorkshopData(data);
      if (!validation.valid) {
        console.warn(`Workshop ${document.id} has issues:`, validation.errors);
        return null;
      }
      
      return data;
    });
    
    // Filter out any workshops that failed validation
    const filtered = workshops.filter(w => w !== null);
    
    // Cache successful fetch for offline use
    if (filtered.length > 0) {
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
      } catch (e) {
        console.log('Could not cache workshops:', e.message);
      }
    }
    
    return filtered;
    
  } catch (error) {
    // Network error or Firebase unavailable - try cached data
    console.log('Could not fetch from Firebase:', error.message);
    
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        console.log('Using cached workshop data for offline support');
        return Array.isArray(data) ? data : [];
      }
    } catch (e) {
      console.log('Could not retrieve cached workshops:', e.message);
    }
    
    return [];
  }
}

// Gets one specific workshop by its ID
export async function fetchWorkshopById(workshopId) {
  if (!workshopId) {
    throw new Error('Workshop ID is required');
  }
  
  try {
    const workshopDoc = doc(db, 'workshops', workshopId);
    const snapshot = await getDoc(workshopDoc);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const workshopData = normalizeWorkshopLocation({ id: snapshot.id, ...snapshot.data() });
    
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
    let workshopQuery = collection(db, 'workshops');
    
    // Add filters if provided
    const constraints = [];
    
    if (filters.category && filters.category !== 'Any') {
      constraints.push(where('category', '==', filters.category));
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
      .map(doc => normalizeWorkshopLocation({ id: doc.id, ...doc.data() }))
      .filter(workshop => {
        const validation = validateWorkshopData(workshop);
        return validation.valid;
      });

    const selectedWard = normalizeWardName(filters.ward);
    const hasWardFilter = Boolean(selectedWard) && selectedWard !== 'Any' && selectedWard !== ALL_OPTION;
    
    // Client-side price filtering (Firestore doesn't support multiple range queries easily)
    if (filters.minPrice || filters.maxPrice || hasWardFilter) {
      return results.filter(workshop => {
        if (hasWardFilter && workshop.ward !== selectedWard) return false;
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
export async function createWorkshop(workshopData, ownerId) {
  if (!ownerId) {
    throw new Error('Owner ID required to create workshop');
  }

  const normalizedWorkshopData = normalizeWorkshopLocation(workshopData);

  // Validate the data before sending to database
  const validation = validateWorkshopData(normalizedWorkshopData);
  
  if (!validation.valid) {
    throw new Error(`Invalid workshop data: ${validation.errors.join(', ')}`);
  }
  
  try {
    const workshopCollection = collection(db, 'workshops');
    const documentRef = await addDoc(workshopCollection, {
      ...normalizedWorkshopData,
      ownerId,
      createdAt: new Date().toISOString(),
    });
    
    return { id: documentRef.id, ...normalizedWorkshopData, ownerId };
    
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
    const workshopDoc = doc(db, 'workshops', workshopId);
    
    const normalizedUpdates = normalizeWorkshopLocation(updates);

    await updateDoc(workshopDoc, {
      ...normalizedUpdates,
      updatedAt: new Date().toISOString(),
    });
    
    return true;
    
  } catch (error) {
    console.error('Update failed:', error);
    throw new Error('Could not update workshop');
  }
}

// Delete workshop (only owner can delete)
export async function deleteWorkshop(workshopId) {
  if (!workshopId) {
    throw new Error('Workshop ID required for deletion');
  }
  
  try {
    const workshopDoc = doc(db, 'workshops', workshopId);
    await deleteDoc(workshopDoc);
    return true;
  } catch (error) {
    console.error('Delete failed:', error);
    throw new Error('Could not delete workshop');
  }
}

// Fetch workshops by owner ID (for "My Workshops" screen)
export async function fetchWorkshopsByOwner(ownerId) {
  if (!ownerId) {
    return [];
  }
  
  try {
    const workshopsCollection = collection(db, 'workshops');
    const q = query(workshopsCollection, where('ownerId', '==', ownerId));
    const querySnapshot = await getDocs(q);
    
    const workshops = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      workshops.push(normalizeWorkshopLocation({
        id: doc.id,
        ...data,
      }));
    });
    
    return workshops;
  } catch (error) {
    console.error('Error fetching owner workshops:', error);
    throw new Error('Could not load your workshops');
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

// Prefetch workshop images to warm up disk cache
// expo-image with cachePolicy="disk" automatically caches images
// This function uses Image.prefetch to start loading in the background
export async function prefetchWorkshopImages(workshop) {
  if (!workshop?.id || !workshop?.images || !Array.isArray(workshop.images)) {
    return;
  }

  // Extract remote URLs and prefetch them (no manual file caching needed)
  const remoteUrls = workshop.images.filter(
    (url) => typeof url === 'string' && url.startsWith('http')
  );

  if (remoteUrls.length > 0) {
    // Start prefetching in background - expo-image will handle disk caching
    Promise.all(remoteUrls.map((url) => Image.prefetch(url).catch(() => false))).catch(
      () => {}
    );
  }
}

// Simple mapping of workshop images with URL validation
// No manual file caching  - expo-image handles disk caching with cachePolicy="disk"
export async function getAllWorkshopImagesForDisplay(workshop) {
  if (!workshop?.images || !Array.isArray(workshop.images) || workshop.images.length === 0) {
    return [];
  }

  return workshop.images
    .filter((url) => typeof url === 'string' && (url.startsWith('http') || url.startsWith('file://')))
    .map((url) => ({ uri: url }));
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

    const workshopDoc = doc(db, 'workshops', workshopId);
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
