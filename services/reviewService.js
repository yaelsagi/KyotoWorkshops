// Review service
// Manages reading and writing workshop reviews with validation

import { collection, getDocs, addDoc, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { database } from '../config/firebase';

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
export async function fetchReviewsForWorkshop(workshopId) {
  if (!workshopId) {
    throw new Error('Workshop ID is required to fetch reviews');
  }
  
  try {
    // Firebase-only source for production consistency across devices
    const reviewsCollection = collection(database, 'reviews');
    
    // Get reviews for this workshop only, newest first
    const reviewQuery = query(
      reviewsCollection,
      where('workshopId', '==', workshopId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(reviewQuery);
    
    if (snapshot.empty) {
      return [];
    }
    
    // Convert documents and validate each one
    const reviews = snapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    }));
    
    // Filter out any reviews with corrupt data
    return reviews.filter(review => {
      const validation = validateReview(review);
      if (!validation.valid) {
        console.warn(`Review ${review.id} is invalid:`, validation.errors);
        return false;
      }
      return true;
    });
    
  } catch (error) {
    console.log('Could not load reviews:', error.message);
    // Return empty array instead of crashing the app
    return [];
  }
}

// Get all reviews across workshops (for analytics or admin dashboard)
export async function fetchAllReviews() {
  try {
    const reviewsCollection = collection(database, 'reviews');
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
    const reviewsCollection = collection(database, 'reviews');
    
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
    const reviewDoc = doc(database, 'reviews', reviewId);
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
