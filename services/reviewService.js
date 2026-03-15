// Review service
// Manages reading and writing workshop reviews with validation
//
// Data Persistence:
// - Reviews are fetched from Firebase Firestore (primary source)
// - Each workshop's reviews are cached in AsyncStorage per workshopId
// - Cache key format: 'kyoto_reviews_{workshopId}'
// - On network error, app shows cached reviews instead of empty
// - Validation ensures only high-quality reviews are displayed
//
// Offline Support:
// - If user opens a workshop they've viewed before, old reviews load from cache
// - Cache persists across app sessions
// - When network returns, fresh data automatically replaces cache

import { collection, getDocs, addDoc, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase/firebase';

function sortReviewsByCreatedAtDesc(reviews) {
  return [...reviews].sort((left, right) => {
    const leftTime = Date.parse(left?.createdAt || '');
    const rightTime = Date.parse(right?.createdAt || '');

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
      return 0;
    }

    if (Number.isNaN(leftTime)) {
      return 1;
    }

    if (Number.isNaN(rightTime)) {
      return -1;
    }

    return rightTime - leftTime;
  });
}

// Makes sure review data is complete before saving
function validateReview(review) {
  const errors = [];
  
  if (!review.workshopId || typeof review.workshopId !== 'string') {
    errors.push('Review must be linked to a workshop');
  }
  
  if (!review.name || review.name.trim() === '') {
    errors.push('Reviewer name is required');
  }
  
  // Rating should be 1-5 stars only
  if (typeof review.rating !== 'number' || review.rating < 1 || review.rating > 5) {
    errors.push('Rating must be between 1 and 5');
  }
  
  if (!review.text || review.text.trim() === '') {
    errors.push('Review text cannot be empty');
  }
  
  // Keep reviews reasonable length (not too short or too long)
  if (review.text.length < 10) {
    errors.push('Review text is too short (minimum 10 characters)');
  }
  
  if (review.text.length > 1000) {
    errors.push('Review text is too long (maximum 1000 characters)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Fetch all reviews for a specific workshop
// Supports offline mode: caches reviews in AsyncStorage, falls back to cache on network error
export async function fetchReviewsForWorkshop(workshopId) {
  if (!workshopId) {
    throw new Error('Workshop ID is required to fetch reviews');
  }
  
  const CACHE_KEY = `kyoto_reviews_${workshopId}`;

  try {
    // Firebase-only source for production consistency across devices
    const reviewsCollection = collection(db, 'reviews');

    let snapshot;
    try {
      const indexedQuery = query(
        reviewsCollection,
        where('workshopId', '==', workshopId),
        orderBy('createdAt', 'desc')
      );
      snapshot = await getDocs(indexedQuery);
    } catch (queryError) {
      const fallbackQuery = query(
        reviewsCollection,
        where('workshopId', '==', workshopId)
      );
      snapshot = await getDocs(fallbackQuery);
      console.log('Reviews query fallback (no index):', queryError.message);
    }
    
    if (snapshot.empty) {
      return [];
    }
    
    // Convert documents and validate each one
    const reviews = sortReviewsByCreatedAtDesc(snapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    })));
    
    // Filter out any reviews with corrupt data
    const filtered = reviews.filter(review => {
      const validation = validateReview(review);
      if (!validation.valid) {
        console.warn(`Review ${review.id} is invalid:`, validation.errors);
        return false;
      }
      return true;
    });
    
    // Cache successful fetch for offline use
    if (filtered.length > 0) {
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
      } catch (e) {
        console.log('Could not cache reviews:', e.message);
      }
    }
    
    return filtered;
    
  } catch (error) {
    // Network error or Firebase unavailable - try cached data
    console.log('Could not load reviews:', error.message);
    
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        console.log(`Using cached reviews for workshop ${workshopId} (offline mode)`);
        return Array.isArray(data) ? data : [];
      }
    } catch (e) {
      console.log('Could not retrieve cached reviews:', e.message);
    }
    
    // Return empty array instead of crashing the app
    return [];
  }
}

// Get all reviews across workshops (for analytics or admin dashboard)
export async function fetchAllReviews() {
  try {
    const reviewsCollection = collection(db, 'reviews');
    const reviewQuery = query(reviewsCollection, orderBy('createdAt', 'desc'));
    
    const snapshot = await getDocs(reviewQuery);
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(review => validateReview(review).valid);
    
  } catch (error) {
    console.log('Failed to fetch all reviews:', error.message);
    return [];
  }
}

// User submits a new review for a workshop
export async function submitReview(reviewData) {
  // Check data quality before sending to database
  const validation = validateReview(reviewData);
  
  if (!validation.valid) {
    throw new Error(`Cannot submit review: ${validation.errors.join(', ')}`);
  }
  
  try {
    const reviewsCollection = collection(db, 'reviews');
    
    // Add timestamp when review was created
    const reviewWithTimestamp = {
      ...reviewData,
      createdAt: new Date().toISOString(),
    };
    
    const documentRef = await addDoc(reviewsCollection, reviewWithTimestamp);
    
    return {
      id: documentRef.id,
      ...reviewWithTimestamp
    };
    
  } catch (error) {
    console.error('Review submission failed:', error);
    throw new Error('Could not save your review. Please try again.');
  }
}

// Remove a review (for users deleting their own reviews)
export async function deleteReview(reviewId) {
  if (!reviewId) {
    throw new Error('Review ID required');
  }
  
  try {
    const reviewDoc = doc(db, 'reviews', reviewId);
    await deleteDoc(reviewDoc);
    
    return true;
    
  } catch (error) {
    console.error('Could not delete review:', error);
    throw new Error('Failed to delete review');
  }
}

// Calculate average rating for a workshop
export function calculateAverageRating(reviews) {
  if (!reviews || reviews.length === 0) {
    return 0;
  }
  
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return (total / reviews.length).toFixed(1);
}

export { validateReview };
