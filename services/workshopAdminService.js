// Progress: this service now handles workshop admin moderation and platform category management.
import { collection, getDocs, doc, getDoc, query, where, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { WORKSHOP_CATEGORIES } from '../constants/workshopCategories';
import {
  WORKSHOP_STATUS,
  CATEGORY_SUGGESTION_STATUS,
  normalizeWorkshop,
  normalizeCategoryLabel,
  normalizeCategoryComparisonKey,
} from '../utils/workshopNormalizer';
import { validateWorkshopData } from '../utils/workshopValidation';

export async function fetchAllWorkshopsForAdmin() {
  try {
    const snapshot = await getDocs(collection(db, 'workshops'));
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
    return workshops.filter((w) => w !== null);
  } catch (error) {
    console.log('Could not fetch all workshops for admin:', error.message);
    return [];
  }
}

export async function fetchPendingWorkshopsForReview() {
  try {
    const workshopsCollection = collection(db, 'workshops');
    const pendingQuery = query(workshopsCollection, where('status', '==', WORKSHOP_STATUS.PENDING));
    const querySnapshot = await getDocs(pendingQuery);

    return querySnapshot.docs.map((document) => normalizeWorkshop({
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

    const workshopSnap = await getDoc(workshopDoc);
    const suggestion = workshopSnap.exists() ? workshopSnap.data().customCategorySuggestion : null;
    const normalizedSuggestion = normalizeCategoryLabel(suggestion);

    await updateDoc(workshopDoc, {
      customCategorySuggestionStatus: nextStatus,
      updatedAt: new Date().toISOString(),
    });

    if (nextStatus === CATEGORY_SUGGESTION_STATUS.APPROVED && normalizedSuggestion) {
      const platformDoc = doc(db, 'platform', 'settings');
      const platformSnap = await getDoc(platformDoc);
      const existingCustomCategories = platformSnap.exists() ? (platformSnap.data().customCategories || []) : [];

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

export async function fetchPlatformCategories() {
  try {
    const platformDoc = doc(db, 'platform', 'settings');
    const snap = await getDoc(platformDoc);
    const customCategories = snap.exists() ? (snap.data().customCategories || []) : [];

    const mergedByKey = new Map();

    [...WORKSHOP_CATEGORIES, ...customCategories].forEach((category) => {
      const label = normalizeCategoryLabel(category);
      const key = normalizeCategoryComparisonKey(label);
      if (!label || !key || mergedByKey.has(key)) {
        return;
      }
      mergedByKey.set(key, label);
    });

    const merged = Array.from(mergedByKey.values())
      .sort((a, b) => a.localeCompare(b));
    return merged;
  } catch (error) {
    if (!String(error?.message || '').toLowerCase().includes('insufficient permissions')) {
      console.warn('Could not fetch platform categories, using defaults:', error.message);
    }
    return WORKSHOP_CATEGORIES
      .map(normalizeCategoryLabel)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }
}
