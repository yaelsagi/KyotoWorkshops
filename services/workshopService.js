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

import { collection, getDocs, doc, getDoc, query, where, updateDoc, deleteDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { db, storage } from '../firebase/firebase';
import { ALL_OPTION, KYOTO_WARDS } from '../constants/kyotoWards';
import { normalizeWardName } from '../utils/normalizeWardName';
import { WORKSHOP_CATEGORIES } from '../constants/workshopCategories';

const KYOTO_DEFAULT_COORDINATES = {
  lat: 35.0116,
  lng: 135.7681,
};

const WORKSHOP_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const CATEGORY_SUGGESTION_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

function normalizeCategoryLabel(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const sanitized = value
    .replace(/[^A-Za-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!sanitized) {
    return '';
  }

  return sanitized
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

// Comparison-only key for duplicate checks.
// Keeps display labels untouched (e.g. "Wood Carving") but treats variants like
// "woodcarving", "wood-carving", and "wood carving" as the same key.
function normalizeCategoryComparisonKey(value) {
  const label = normalizeCategoryLabel(value);
  if (!label) {
    return '';
  }

  return label
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeWorkshopLocation(workshop) {
  if (!workshop || typeof workshop !== 'object') {
    return workshop;
  }

  return {
    ...workshop,
    ward: normalizeWardName(workshop.ward),
  };
}

function toWorkshopCategory(workshop) {
  if (workshop?.category) {
    return workshop.category;
  }

  if (Array.isArray(workshop?.categories) && workshop.categories.length > 0) {
    return workshop.categories[0];
  }

  return null;
}

function normalizeWorkshopRecord(workshop) {
  const normalized = normalizeWorkshopLocation(workshop);
  if (!normalized || typeof normalized !== 'object') {
    return normalized;
  }

  const normalizedCustomCategorySuggestion = normalizeCategoryLabel(normalized.customCategorySuggestion);

  const categories = Array.isArray(normalized.categories)
    ? normalized.categories.filter(Boolean)
    : (normalized.category ? [normalized.category] : []);

  return {
    ...normalized,
    categories,
    category: toWorkshopCategory({ ...normalized, categories }),
    status: normalized.status || WORKSHOP_STATUS.APPROVED,
    customCategorySuggestion: normalizedCustomCategorySuggestion || null,
    customCategorySuggestionStatus:
      normalized.customCategorySuggestionStatus ||
      (normalizedCustomCategorySuggestion ? CATEGORY_SUGGESTION_STATUS.PENDING : CATEGORY_SUGGESTION_STATUS.NONE),
  };
}

async function uploadImageAsset(workshopId, imageAsset, kind, index = 0) {
  if (!workshopId || !imageAsset?.uri) {
    throw new Error('Workshop ID and image asset are required');
  }

  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const extension = imageAsset?.fileName?.split('.').pop() || 'jpg';
  const imageRef = ref(storage, `images/${workshopId}/${kind}_${index}_${timestamp}_${random}.${extension}`);

  const blob = await fetch(imageAsset.uri).then((response) => response.blob());
  await uploadBytes(imageRef, blob);
  return getDownloadURL(imageRef);
}

function validateWorkshopSubmission(workshop) {
  const errors = [];

  if (!workshop?.title || workshop.title.trim() === '') {
    errors.push('Title is required');
  }

  const categories = Array.isArray(workshop?.categories) ? workshop.categories : [];
  if (categories.length === 0) {
    errors.push('At least one category is required');
  }

  if (!workshop?.ward) {
    errors.push('Ward is required');
  }

  if (!workshop?.address || workshop.address.trim() === '') {
    errors.push('Address is required');
  }

  if (!workshop?.duration || workshop.duration.trim() === '') {
    errors.push('Duration is required');
  }

  if (!workshop?.description || workshop.description.trim() === '') {
    errors.push('Description is required');
  }

  if (typeof workshop?.priceYen !== 'number' || Number.isNaN(workshop.priceYen) || workshop.priceYen <= 0) {
    errors.push('Price must be a positive number');
  }

  if (!Number.isInteger(workshop?.maxParticipants) || workshop.maxParticipants <= 0) {
    errors.push('Maximum participants must be a positive integer');
  }

  if (!workshop?.coverImageAsset?.uri) {
    errors.push('Cover image is required');
  }

  if (!Array.isArray(workshop?.galleryImageAssets) || workshop.galleryImageAssets.length < 3) {
    errors.push('At least 3 gallery images are required');
  }

  return {
    valid: errors.length === 0,
    errors,
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
      const data = normalizeWorkshopRecord({ id: document.id, ...document.data() });

      if (data.status !== WORKSHOP_STATUS.APPROVED) {
        return null;
      }
      
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
    
    const workshopData = normalizeWorkshopRecord({ id: snapshot.id, ...snapshot.data() });

    if (workshopData.status !== WORKSHOP_STATUS.APPROVED) {
      return null;
    }
    
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
    const snapshot = await getDocs(collection(db, 'workshops'));
    
    if (snapshot.empty) {
      return [];
    }
    
    // Convert and validate results
    const results = snapshot.docs
      .map(doc => normalizeWorkshopRecord({ id: doc.id, ...doc.data() }))
      .filter(workshop => {
        if (workshop.status !== WORKSHOP_STATUS.APPROVED) {
          return false;
        }

        if (filters.category && filters.category !== 'Any') {
          const categories = Array.isArray(workshop.categories) ? workshop.categories : [];
          if (!categories.includes(filters.category) && workshop.category !== filters.category) {
            return false;
          }
        }

        if (filters.isTop && workshop.isTop !== true) {
          return false;
        }

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

  const validation = validateWorkshopSubmission(workshopData);
  if (!validation.valid) {
    throw new Error(`Invalid workshop data: ${validation.errors.join(', ')}`);
  }
  
  try {
    const workshopCollection = collection(db, 'workshops');
    const workshopDoc = doc(workshopCollection);
    const workshopId = workshopDoc.id;

    const coverImageUrl = await uploadImageAsset(workshopId, workshopData.coverImageAsset, 'cover', 0);
    const galleryImageUrls = await Promise.all(
      workshopData.galleryImageAssets.map((imageAsset, index) => uploadImageAsset(workshopId, imageAsset, 'gallery', index))
    );

    const now = new Date().toISOString();
    const normalizedWard = normalizeWardName(workshopData.ward);
    // Before admin review, the suggestion text is normalised for clean storage and review.
    const normalizedCustomCategorySuggestion = normalizeCategoryLabel(workshopData.customCategorySuggestion);
    const normalizedWorkshopData = {
      ownerId,
      title: workshopData.title.trim(),
      categories: workshopData.categories,
      category: workshopData.categories[0],
      customCategorySuggestion: normalizedCustomCategorySuggestion || null,
      customCategorySuggestionStatus: normalizedCustomCategorySuggestion
        ? CATEGORY_SUGGESTION_STATUS.PENDING
        : CATEGORY_SUGGESTION_STATUS.NONE,
      ward: normalizedWard,
      address: workshopData.address.trim(),
      duration: workshopData.duration,
      maxParticipants: workshopData.maxParticipants,
      description: workshopData.description.trim(),
      whatsIncluded: workshopData.whatsIncluded || '',
      priceYen: workshopData.priceYen,
      coverImage: coverImageUrl,
      images: [coverImageUrl, ...galleryImageUrls],
      lat: KYOTO_DEFAULT_COORDINATES.lat,
      lng: KYOTO_DEFAULT_COORDINATES.lng,
      status: WORKSHOP_STATUS.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(workshopDoc, normalizedWorkshopData);

    const userDocRef = doc(db, 'users', ownerId);
    const userSnapshot = await getDoc(userDocRef);
    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      const currentRoles = userData?.roles || {};

      if (!currentRoles.host) {
        await updateDoc(userDocRef, {
          roles: {
            ...currentRoles,
            host: true,
          },
          updatedAt: now,
        });
      }
    }

    return { id: workshopId, ...normalizedWorkshopData };
    
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

    const existingSnapshot = await getDoc(workshopDoc);
    if (!existingSnapshot.exists()) {
      throw new Error('Workshop not found');
    }

    const existingWorkshop = normalizeWorkshopRecord({
      id: existingSnapshot.id,
      ...existingSnapshot.data(),
    });

    const normalizedUpdates = normalizeWorkshopLocation(updates);
  // Before admin review, the suggestion text is normalised for clean storage and review.
    const normalizedCustomCategorySuggestion = normalizeCategoryLabel(normalizedUpdates.customCategorySuggestion);

    const incomingCover = normalizedUpdates.coverImageAsset || existingWorkshop.coverImage;
    let coverImage = existingWorkshop.coverImage || null;
    if (typeof incomingCover === 'string' && incomingCover.startsWith('http')) {
      coverImage = incomingCover;
    } else if (incomingCover?.uri && incomingCover.uri.startsWith('http')) {
      coverImage = incomingCover.uri;
    } else if (incomingCover?.uri) {
      coverImage = await uploadImageAsset(workshopId, incomingCover, 'cover', 0);
    }

    const incomingGallery = Array.isArray(normalizedUpdates.galleryImageAssets)
      ? normalizedUpdates.galleryImageAssets
      : existingWorkshop.images?.slice(1) || [];

    const galleryImageUrls = await Promise.all(
      incomingGallery.map(async (imageAsset, index) => {
        if (typeof imageAsset === 'string' && imageAsset.startsWith('http')) {
          return imageAsset;
        }

        if (imageAsset?.uri && imageAsset.uri.startsWith('http')) {
          return imageAsset.uri;
        }

        if (imageAsset?.uri) {
          return uploadImageAsset(workshopId, imageAsset, 'gallery', index);
        }

        return null;
      })
    );

    const cleanGallery = galleryImageUrls.filter(Boolean);

    if (!coverImage || cleanGallery.length < 3) {
      throw new Error('Cover image and at least 3 gallery images are required');
    }

    await updateDoc(workshopDoc, {
      title: normalizedUpdates.title,
      categories: normalizedUpdates.categories,
      category: Array.isArray(normalizedUpdates.categories) && normalizedUpdates.categories.length > 0
        ? normalizedUpdates.categories[0]
        : existingWorkshop.category,
      customCategorySuggestion: normalizedCustomCategorySuggestion || null,
      customCategorySuggestionStatus: normalizedCustomCategorySuggestion
        ? CATEGORY_SUGGESTION_STATUS.PENDING
        : CATEGORY_SUGGESTION_STATUS.NONE,
      ward: normalizeWardName(normalizedUpdates.ward),
      address: normalizedUpdates.address,
      duration: normalizedUpdates.duration,
      maxParticipants: normalizedUpdates.maxParticipants,
      description: normalizedUpdates.description,
      whatsIncluded: normalizedUpdates.whatsIncluded || '',
      priceYen: normalizedUpdates.priceYen,
      coverImage,
      images: [coverImage, ...cleanGallery],
      status: WORKSHOP_STATUS.PENDING,
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
      workshops.push(normalizeWorkshopRecord({
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

export async function fetchPendingWorkshopsForReview() {
  try {
    const workshopsCollection = collection(db, 'workshops');
    const pendingQuery = query(workshopsCollection, where('status', '==', WORKSHOP_STATUS.PENDING));
    const querySnapshot = await getDocs(pendingQuery);

    return querySnapshot.docs.map((document) => normalizeWorkshopRecord({
      id: document.id,
      ...document.data(),
    }));
  } catch (error) {
    console.error('Error fetching pending workshops:', error);
    throw new Error('Could not load pending workshops');
  }
}

export async function reviewWorkshop(workshopId, nextStatus) {
  if (!workshopId) {
    throw new Error('Workshop ID is required');
  }

  if (![WORKSHOP_STATUS.APPROVED, WORKSHOP_STATUS.REJECTED].includes(nextStatus)) {
    throw new Error('Invalid workshop review status');
  }

  try {
    const workshopDoc = doc(db, 'workshops', workshopId);
    await updateDoc(workshopDoc, {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error reviewing workshop:', error);
    throw new Error('Could not review workshop');
  }
}

export async function reviewWorkshopCategorySuggestion(workshopId, nextStatus) {
  if (!workshopId) {
    throw new Error('Workshop ID is required');
  }

  if (![CATEGORY_SUGGESTION_STATUS.APPROVED, CATEGORY_SUGGESTION_STATUS.REJECTED].includes(nextStatus)) {
    throw new Error('Invalid category suggestion review status');
  }

  try {
    const workshopDoc = doc(db, 'workshops', workshopId);

    // Fetch the suggestion text before updating status
    const workshopSnap = await getDoc(workshopDoc);
    const suggestion = workshopSnap.exists() ? workshopSnap.data().customCategorySuggestion : null;
    const normalizedSuggestion = normalizeCategoryLabel(suggestion);

    // Mark the suggestion as approved/rejected on the workshop document.
    // The workshop's own categories array is intentionally NOT changed —
    // this is a platform-level category suggestion, not a self-assignment.
    await updateDoc(workshopDoc, {
      customCategorySuggestionStatus: nextStatus,
      updatedAt: new Date().toISOString(),
    });

    // If approved and a suggestion text exists, add it to the platform category list.
    if (nextStatus === CATEGORY_SUGGESTION_STATUS.APPROVED && normalizedSuggestion) {
      const platformDoc = doc(db, 'platform', 'settings');
      const platformSnap = await getDoc(platformDoc);
      const existingCustomCategories = platformSnap.exists() ? (platformSnap.data().customCategories || []) : [];

      // Before admin approval, duplicate-equivalence checks are applied to prevent
      // near-duplicate categories from entering the shared category list.
      // Build a comparison set from both default and approved custom categories.
      // We compare by normalized keys so punctuation/spacing variants are treated as duplicates.
      const existingComparisonKeys = new Set(
        [...WORKSHOP_CATEGORIES, ...existingCustomCategories]
          .map(normalizeCategoryComparisonKey)
          .filter(Boolean),
      );

      if (!existingComparisonKeys.has(normalizeCategoryComparisonKey(normalizedSuggestion))) {
        await setDoc(
          platformDoc,
          { customCategories: arrayUnion(normalizedSuggestion) },
          { merge: true },
        );
      }
    }
  } catch (error) {
    console.error('Error reviewing category suggestion:', error);
    throw new Error('Could not review category suggestion');
  }
}

// Returns the full category list: static defaults merged with admin-approved custom categories.
// Falls back to static list only if Firestore is unreachable.
export async function fetchPlatformCategories() {
  try {
    const platformDoc = doc(db, 'platform', 'settings');
    const snap = await getDoc(platformDoc);
    const customCategories = snap.exists() ? (snap.data().customCategories || []) : [];

    // Keyed map keeps one display label per normalized comparison key.
    // This prevents duplicate variants while preserving a readable label for UI.
    const mergedByKey = new Map();

    [...WORKSHOP_CATEGORIES, ...customCategories].forEach((category) => {
      const label = normalizeCategoryLabel(category);
      const key = normalizeCategoryComparisonKey(label);
      if (!label || !key || mergedByKey.has(key)) {
        return;
      }
      mergedByKey.set(key, label);
    });

    // Merge default + approved categories and keep final list alphabetically sorted.
    const merged = Array.from(mergedByKey.values())
      .sort((a, b) => a.localeCompare(b));
    return merged;
  } catch (error) {
    console.warn('Could not fetch platform categories, using defaults:', error.message);
    return WORKSHOP_CATEGORIES
      .map(normalizeCategoryLabel)
      .filter(Boolean)
      // Keep fallback list alphabetically ordered too.
      .sort((a, b) => a.localeCompare(b));
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
