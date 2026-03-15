// Progress: this service now handles user-facing workshop CRUD and search flows.
import { collection, getDocs, doc, getDoc, query, where, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../firebase/firebase';
import { ALL_OPTION } from '../constants/kyotoWards';
import {
  WORKSHOP_STATUS,
  CATEGORY_SUGGESTION_STATUS,
  normalizeWorkshop,
  normalizeWorkshopLocation,
  normalizeCategoryLabel,
} from '../utils/workshopNormalizer';
import { validateWorkshopSubmission, validateWorkshopData } from '../utils/workshopValidation';
import { geocodeWorkshopAddress, GEOCODING_FAILURE_MESSAGE } from './geocodingService';
import { uploadImageAsset, uploadImageAssetsWithConcurrency } from './workshopImageService';
// Demo workshop dataset is used as fallback in case Firebase and AsyncStorage cache both fail, so the app can be demonstrated offline.
import demoWorkshops from '../data/workshops.json';

// Grabs all workshops from Firebase (single source of truth for production behavior).
// Falls back to AsyncStorage cache if network error (offline support).
export async function fetchWorkshops() {
  const CACHE_KEY = 'kyoto_workshops_cache';

  try {
    const workshopQuery = query(collection(db, 'workshops'), where('status', '==', WORKSHOP_STATUS.APPROVED));
    const snapshot = await getDocs(workshopQuery);

    if (snapshot.empty) {
      return [];
    }

    const workshops = snapshot.docs.map((document) => {
      const data = normalizeWorkshop({ id: document.id, ...document.data() });

      const validation = validateWorkshopData(data);
      if (!validation.valid) {
        console.warn(`Workshop ${document.id} has issues:`, validation.errors);
        return null;
      }

      return data;
    });

    const filtered = workshops.filter((w) => w !== null);

    if (filtered.length > 0) {
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
      } catch (e) {
        console.log('Could not cache workshops:', e.message);
      }
    }

    return filtered;
  } catch (error) {
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

    const fallbackSource = Array.isArray(demoWorkshops) ? demoWorkshops : [];
    const normalizedFallback = fallbackSource
      .map((workshop) => normalizeWorkshop(workshop))
      .filter((workshop) => validateWorkshopData(workshop).valid);

    if (normalizedFallback.length > 0) {
      console.log('Using demo workshop fallback (offline mode)');
      return normalizedFallback;
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

    const workshopData = normalizeWorkshop({ id: snapshot.id, ...snapshot.data() });

    if (workshopData.status !== WORKSHOP_STATUS.APPROVED) {
      return null;
    }

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

    const results = snapshot.docs
      .map((item) => normalizeWorkshop({ id: item.id, ...item.data() }))
      .filter((workshop) => {
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

    const selectedWard = normalizeWorkshopLocation({ ward: filters.ward })?.ward;
    const hasWardFilter = Boolean(selectedWard) && selectedWard !== 'Any' && selectedWard !== ALL_OPTION;

    if (filters.minPrice || filters.maxPrice || hasWardFilter) {
      return results.filter((workshop) => {
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

  const authenticatedUserId = auth?.currentUser?.uid;
  if (!authenticatedUserId) {
    throw new Error('You need to sign in again before submitting a workshop');
  }

  if (authenticatedUserId !== ownerId) {
    throw new Error('Session mismatch detected. Please sign out and sign back in.');
  }

  const validation = validateWorkshopSubmission(workshopData);
  if (!validation.valid) {
    throw new Error(`Invalid workshop data: ${validation.errors.join(', ')}`);
  }

  try {
    const workshopCollection = collection(db, 'workshops');
    const workshopDoc = doc(workshopCollection);
    const workshopId = workshopDoc.id;

    const geocodedLocation = await geocodeWorkshopAddress(workshopData.address, workshopData.ward);

    const coverImageUrl = await uploadImageAsset(workshopId, workshopData.coverImageAsset, 'cover', 0);
    const galleryImageUrls = await uploadImageAssetsWithConcurrency(
      workshopId,
      workshopData.galleryImageAssets,
      'gallery'
    );

    const now = new Date().toISOString();
    const normalizedWard = normalizeWorkshopLocation({ ward: workshopData.ward })?.ward;
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
      lat: geocodedLocation.latitude,
      lng: geocodedLocation.longitude,
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
    throw new Error(error?.message || 'Could not save workshop to database');
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

    const existingWorkshop = normalizeWorkshop({
      id: existingSnapshot.id,
      ...existingSnapshot.data(),
    });

    const safeUpdates = updates && typeof updates === 'object' ? updates : {};
    const normalizedUpdates = normalizeWorkshopLocation(safeUpdates) || {};

    const mergedTitle =
      typeof normalizedUpdates.title === 'string'
        ? normalizedUpdates.title.trim()
        : String(existingWorkshop.title || '').trim();

    const mergedCategories =
      Array.isArray(normalizedUpdates.categories) && normalizedUpdates.categories.length > 0
        ? normalizedUpdates.categories
        : Array.isArray(existingWorkshop.categories) && existingWorkshop.categories.length > 0
          ? existingWorkshop.categories
          : (existingWorkshop.category ? [existingWorkshop.category] : []);

    const mergedCategory =
      mergedCategories.length > 0
        ? mergedCategories[0]
        : existingWorkshop.category;

    const mergedDuration =
      typeof normalizedUpdates.duration === 'string'
        ? normalizedUpdates.duration
        : existingWorkshop.duration;

    const mergedMaxParticipants =
      Number.isInteger(normalizedUpdates.maxParticipants) && normalizedUpdates.maxParticipants > 0
        ? normalizedUpdates.maxParticipants
        : existingWorkshop.maxParticipants;

    const mergedDescription =
      typeof normalizedUpdates.description === 'string'
        ? normalizedUpdates.description
        : existingWorkshop.description;

    const mergedWhatsIncluded =
      normalizedUpdates.whatsIncluded !== undefined
        ? normalizedUpdates.whatsIncluded || ''
        : existingWorkshop.whatsIncluded || '';

    const mergedPriceYen =
      typeof normalizedUpdates.priceYen === 'number' && Number.isFinite(normalizedUpdates.priceYen)
        ? normalizedUpdates.priceYen
        : existingWorkshop.priceYen;

    const incomingCustomCategorySuggestion =
      normalizedUpdates.customCategorySuggestion !== undefined
        ? normalizedUpdates.customCategorySuggestion
        : existingWorkshop.customCategorySuggestion;
    const normalizedCustomCategorySuggestion = normalizeCategoryLabel(incomingCustomCategorySuggestion);

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

    const cleanGallery = [];
    const newGalleryAssets = [];

    incomingGallery.forEach((imageAsset) => {
      if (typeof imageAsset === 'string' && imageAsset.startsWith('http')) {
        cleanGallery.push(imageAsset);
        return;
      }

      if (imageAsset?.uri && imageAsset.uri.startsWith('http')) {
        cleanGallery.push(imageAsset.uri);
        return;
      }

      if (imageAsset?.uri) {
        newGalleryAssets.push(imageAsset);
      }
    });

    const uploadedGalleryUrls = await uploadImageAssetsWithConcurrency(
      workshopId,
      newGalleryAssets,
      'gallery',
      cleanGallery.length
    );
    cleanGallery.push(...uploadedGalleryUrls);

    if (!coverImage || cleanGallery.length < 3) {
      throw new Error('Cover image and at least 3 gallery images are required');
    }

    const nextWard = normalizeWorkshopLocation({ ward: normalizedUpdates.ward || existingWorkshop.ward })?.ward;
    const nextAddress = String(
      typeof normalizedUpdates.address === 'string' ? normalizedUpdates.address : (existingWorkshop.address || '')
    ).trim();
    const previousWard = normalizeWorkshopLocation({ ward: existingWorkshop.ward })?.ward;
    const previousAddress = String(existingWorkshop.address || '').trim();
    const shouldRefreshCoordinates =
      nextWard !== previousWard ||
      nextAddress !== previousAddress ||
      !Number.isFinite(Number(existingWorkshop.lat)) ||
      !Number.isFinite(Number(existingWorkshop.lng));

    const geocodedLocation = shouldRefreshCoordinates
      ? await geocodeWorkshopAddress(nextAddress, nextWard)
      : {
          latitude: Number(existingWorkshop.lat),
          longitude: Number(existingWorkshop.lng),
        };

    const mergedWorkshopData = {
      id: workshopId,
      title: mergedTitle,
      category: mergedCategory,
      ward: nextWard,
      priceYen: mergedPriceYen,
      lat: geocodedLocation.latitude,
      lng: geocodedLocation.longitude,
    };

    const validation = validateWorkshopData(mergedWorkshopData);
    if (!validation.valid) {
      throw new Error(`Invalid workshop data: ${validation.errors.join(', ')}`);
    }

    await updateDoc(workshopDoc, {
      title: mergedTitle,
      categories: mergedCategories,
      category: mergedCategory,
      customCategorySuggestion: normalizedCustomCategorySuggestion || null,
      customCategorySuggestionStatus: normalizedCustomCategorySuggestion
        ? CATEGORY_SUGGESTION_STATUS.PENDING
        : CATEGORY_SUGGESTION_STATUS.NONE,
      ward: nextWard,
      address: nextAddress,
      duration: mergedDuration,
      maxParticipants: mergedMaxParticipants,
      description: mergedDescription,
      whatsIncluded: mergedWhatsIncluded,
      priceYen: mergedPriceYen,
      coverImage,
      images: [coverImage, ...cleanGallery],
      lat: geocodedLocation.latitude,
      lng: geocodedLocation.longitude,
      status: WORKSHOP_STATUS.PENDING,
      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Update failed:', error);
    if (error?.message === GEOCODING_FAILURE_MESSAGE) {
      throw new Error(GEOCODING_FAILURE_MESSAGE);
    }
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
    querySnapshot.forEach((item) => {
      const data = item.data();
      workshops.push(normalizeWorkshop({
        id: item.id,
        ...data,
      }));
    });

    return workshops;
  } catch (error) {
    console.error('Error fetching owner workshops:', error);
    throw new Error('Could not load your workshops');
  }
}
