// tests for review service
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

  test('accepts a valid review', () => {
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
  
  test('rejects ratings outside the allowed range', () => {
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
  
  test('rejects review text that is too short', () => {
    const review = {
      workshopId: 'w1',
      name: 'Test User',
      rating: 4,
      text: 'Too short'
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
      text: 'A'.repeat(1001)
    };
    
    const result = validateReview(review);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Review text is too long (maximum 1000 characters)');
  });
  
  test('requires reviewer name', () => {
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

  test('fetches reviews for a workshop', async () => {
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
  
  test('returns an empty array when no reviews exist', async () => {
    getDocs.mockResolvedValue({
      empty: true,
      docs: []
    });
    
    const reviews = await fetchReviewsForWorkshop('workshop_new');
    
    expect(reviews).toEqual([]);
  });
  
  test('handles fetch errors gracefully', async () => {
    getDocs.mockRejectedValue(new Error('Connection timeout'));
    
    const reviews = await fetchReviewsForWorkshop('workshop_test');
    
    expect(reviews).toEqual([]);
  });

  test('filters invalid reviews from fetched results', async () => {
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
            rating: 10,
            text: 'Bad'
          })
        }
      ]
    });
    
    const reviews = await fetchReviewsForWorkshop('w1');
    
    expect(reviews).toHaveLength(1);
    expect(reviews[0].id).toBe('good_review');
  });
});

describe('Submitting Reviews', () => {

  test('submits a valid review to the database', async () => {
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
  
  test('throws for invalid review data', async () => {
    const badReview = {
      workshopId: 'w1',
      name: '',
      rating: 0,
      text: 'Too short'
    };
    
    await expect(submitReview(badReview)).rejects.toThrow('Cannot submit review');
  });
  
  test('throws when database write fails', async () => {
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

  test('calculates the correct average rating', () => {
    const reviews = [
      { rating: 5 },
      { rating: 4 },
      { rating: 5 },
      { rating: 3 }
    ];
    
    const average = calculateAverageRating(reviews);
    
    expect(average).toBe('4.3');
  });
  
  test('returns 0 for an empty review array', () => {
    const average = calculateAverageRating([]);
    
    expect(average).toBe(0);
  });
  
  test('handles null or undefined input', () => {
    expect(calculateAverageRating(null)).toBe(0);
    expect(calculateAverageRating(undefined)).toBe(0);
  });
});

