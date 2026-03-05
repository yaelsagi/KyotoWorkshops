// Tests for review service
// Tests data validation, async operations, error handling

import {
  validateReview,
  fetchReviewsForWorkshop,
  submitReview,
  calculateAverageRating
} from '../services/reviewService';
import { getDocs, addDoc } from 'firebase/firestore';

jest.mock('firebase/firestore');
jest.mock('../firebase/firebase', () => ({ db: {} }));

describe('Review Validation', () => {
  
  // Valid review should pass all checks
  test('accepts valid review', () => {
    const validReview = {
      workshopId: 'workshop_test',
      userId: 'user_123',
      name: 'John D.',
      rating: 5,
      text: 'Great experience! Really enjoyed learning the techniques.'
    };
    
    const result = validateReview(validReview);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  // Rating must be between 1 and 5
  test('rejects invalid rating values', () => {
    const reviews = [
      { workshopId: 'w1', name: 'Test', rating: 0, text: 'Too low rating' },
      { workshopId: 'w1', name: 'Test', rating: 6, text: 'Too high rating' },
      { workshopId: 'w1', name: 'Test', rating: 'five', text: 'Not a number' }
    ];
    
    reviews.forEach(review => {
      const result = validateReview(review);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rating must be between 1 and 5');
    });
  });
  
  // Review text has minimum and maximum length
  test('rejects review text that is too short', () => {
    const review = {
      workshopId: 'w1',
      name: 'Test User',
      rating: 4,
      text: 'Too short'  // Only 9 characters
    };
    
    const result = validateReview(review);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Review text is too short (minimum 10 characters)');
  });
  
  test('rejects review text that is too long', () => {
    const review = {
      workshopId: 'w1',
      name: 'Test User',
      rating: 4,
      text: 'A'.repeat(1001)  // More than 1000 characters
    };
    
    const result = validateReview(review);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Review text is too long (maximum 1000 characters)');
  });
  
  // Name is required
  test('rejects review without name', () => {
    const review = {
      workshopId: 'w1',
      name: '',
      rating: 5,
      text: 'This is a valid length review text'
    };
    
    const result = validateReview(review);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Reviewer name is required');
  });
});

describe('Fetching Reviews - Async Operations', () => {
  
  // Should handle multiple reviews for one workshop
  test('fetches reviews for workshop successfully', async () => {
    getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'review_1',
          data: () => ({
            workshopId: 'workshop_kintsugi',
            name: 'Sarah M.',
            rating: 5,
            text: 'Amazing workshop! Learned so much.',
            createdAt: '2026-02-15T10:30:00Z'
          })
        },
        {
          id: 'review_2',
          data: () => ({
            workshopId: 'workshop_kintsugi',
            name: 'James K.',
            rating: 4,
            text: 'Great experience overall.',
            createdAt: '2026-02-10T14:20:00Z'
          })
        }
      ]
    });
    
    const reviews = await fetchReviewsForWorkshop('workshop_kintsugi');
    
    expect(reviews).toHaveLength(2);
    expect(reviews[0].name).toBe('Sarah M.');
  });
  
  // Empty result when workshop has no reviews yet
  test('returns empty array when no reviews exist', async () => {
    getDocs.mockResolvedValue({
      empty: true,
      docs: []
    });
    
    const reviews = await fetchReviewsForWorkshop('workshop_new');
    
    expect(reviews).toEqual([]);
  });
  
  // Network errors shouldn't crash app
  test('handles fetch errors gracefully', async () => {
    getDocs.mockRejectedValue(new Error('Connection timeout'));
    
    const reviews = await fetchReviewsForWorkshop('workshop_test');
    
    // Should return empty array, not throw error
    expect(reviews).toEqual([]);
  });
  
  // Filters out reviews with corrupt data
  test('filters invalid reviews from results', async () => {
    getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'good_review',
          data: () => ({
            workshopId: 'w1',
            name: 'Good Reviewer',
            rating: 5,
            text: 'This is a valid review with enough text.'
          })
        },
        {
          id: 'bad_review',
          data: () => ({
            workshopId: 'w1',
            name: '',
            rating: 10,  // Invalid rating
            text: 'Bad'  // Too short
          })
        }
      ]
    });
    
    const reviews = await fetchReviewsForWorkshop('w1');
    
    // Should only return the valid review
    expect(reviews).toHaveLength(1);
    expect(reviews[0].id).toBe('good_review');
  });
});

describe('Submitting Reviews', () => {
  
  // Should successfully save valid review
  test('submits valid review to database', async () => {
    addDoc.mockResolvedValue({ id: 'new_review_id' });
    
    const reviewData = {
      workshopId: 'workshop_test',
      userId: 'user_123',
      name: 'Test User',
      rating: 5,
      text: 'Excellent workshop, highly recommend to everyone!'
    };
    
    const result = await submitReview(reviewData);
    
    expect(result.id).toBe('new_review_id');
    expect(addDoc).toHaveBeenCalled();
  });
  
  // Should reject invalid review before sending to database
  test('throws error for invalid review data', async () => {
    const badReview = {
      workshopId: 'w1',
      name: '',
      rating: 0,
      text: 'Too short'
    };
    
    await expect(submitReview(badReview)).rejects.toThrow('Cannot submit review');
  });
  
  // Should handle database errors
  test('throws error when database write fails', async () => {
    addDoc.mockRejectedValue(new Error('Write failed'));
    
    const review = {
      workshopId: 'w1',
      name: 'Test',
      rating: 5,
      text: 'Valid review text here'
    };
    
    await expect(submitReview(review)).rejects.toThrow('Could not save your review');
  });
});

describe('Average Rating Calculation', () => {
  
  // Calculate average from multiple ratings
  test('calculates correct average rating', () => {
    const reviews = [
      { rating: 5 },
      { rating: 4 },
      { rating: 5 },
      { rating: 3 }
    ];
    
    const average = calculateAverageRating(reviews);
    
    expect(average).toBe('4.3');
  });
  
  // Returns 0 for workshops with no reviews
  test('returns 0 for empty review array', () => {
    const average = calculateAverageRating([]);
    
    expect(average).toBe(0);
  });
  
  // Handles null or undefined input
  test('handles null reviews gracefully', () => {
    expect(calculateAverageRating(null)).toBe(0);
    expect(calculateAverageRating(undefined)).toBe(0);
  });
});
