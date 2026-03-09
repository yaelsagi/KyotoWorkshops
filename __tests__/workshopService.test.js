// Tests for workshop service
// Covers data validation, async operations, and error handling

import { 
  validateWorkshopData, 
  fetchWorkshops, 
  fetchWorkshopById,
  searchWorkshops 
} from '../services/workshopService';
import { getDocs, getDoc } from 'firebase/firestore';

// Mock Firestore functions
jest.mock('firebase/firestore');
jest.mock('../firebase/firebase', () => ({ db: {} }));

describe('Workshop Data Validation', () => {
  
  // Should accept workshop when all required fields are present and valid
  test('accepts valid workshop data', () => {
    const validWorkshop = {
      id: 'workshop_test',
      title: 'Test Workshop',
      category: 'Pottery',
      priceYen: 5000,
      lat: 35.0116,
      lng: 135.7681,
      ward: '中京区'
    };
    
    const result = validateWorkshopData(validWorkshop);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  // Should catch missing ID
  test('rejects workshop without ID', () => {
    const invalidWorkshop = {
      title: 'Test Workshop',
      category: 'Pottery',
      priceYen: 5000,
      lat: 35.0116,
      lng: 135.7681
    };
    
    const result = validateWorkshopData(invalidWorkshop);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Workshop must have a valid ID');
  });
  
  // Title can't be empty or just whitespace
  test('rejects empty title', () => {
    const workshop = {
      id: 'workshop_test',
      title: '   ',
      category: 'Pottery',
      priceYen: 5000,
      lat: 35.0116,
      lng: 135.7681,
      ward: '中京区'
    };
    
    const result = validateWorkshopData(workshop);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title cannot be empty');
  });
  
  // Price must be a positive number
  test('rejects negative price', () => {
    const workshop = {
      id: 'workshop_test',
      title: 'Test',
      category: 'Pottery',
      priceYen: -1000,
      lat: 35.0116,
      lng: 135.7681,
      ward: '中京区'
    };
    
    const result = validateWorkshopData(workshop);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Price must be a positive number');
  });
  
  // Coordinates should be in Kyoto area
  test('rejects coordinates outside Kyoto', () => {
    const workshop = {
      id: 'workshop_test',
      title: 'Test',
      category: 'Pottery',
      priceYen: 5000,
      lat: 40.0,
      lng: 140.0,
      ward: '中京区'
    };
    
    const result = validateWorkshopData(workshop);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Workshop location must be within Kyoto');
  });
  
  // Should catch multiple errors at once
  test('catches multiple validation errors', () => {
    const badWorkshop = {
      id: '',
      title: '',
      priceYen: -500,
      lat: 'invalid',
      lng: 'invalid'
    };
    
    const result = validateWorkshopData(badWorkshop);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(2);
  });
});

describe('Fetching Workshops - Async Loading States', () => {
  
  // Test that we handle the "loading" state properly
  test('handles loading state when fetching workshops', async () => {
    // Mock Firebase returning some workshops
    getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'workshop_1',
          data: () => ({
            title: 'Kintsugi',
            category: 'Pottery',
            priceYen: 12000,
            lat: 35.0037,
            lng: 135.7788,
            ward: '東山区'
          })
        }
      ]
    });
    
    // Start fetching (loading begins)
    const workshopsPromise = fetchWorkshops();
    
    // At this point, the function is still running (async state)
    expect(workshopsPromise).toBeInstanceOf(Promise);
    
    // Wait for it to finish
    const workshops = await workshopsPromise;
    
    // Should have received workshops
    expect(workshops).toBeDefined();
    expect(workshops.length).toBeGreaterThan(0);
  });
  
  // When database is empty, fall back to local JSON
  test('falls back to local data when Firebase is empty', async () => {
    getDocs.mockResolvedValue({
      empty: true,
      docs: []
    });
    
    const workshops = await fetchWorkshops();
    
    // Should still return workshops from local file
    expect(workshops).toBeDefined();
    expect(Array.isArray(workshops)).toBe(true);
  });
  
  // Network error shouldn't crash the app
  test('handles network errors gracefully', async () => {
    getDocs.mockRejectedValue(new Error('Network timeout'));
    
    const workshops = await fetchWorkshops();
    
    // Should return local data instead of throwing error
    expect(workshops).toBeDefined();
    expect(Array.isArray(workshops)).toBe(true);
  });
  
  // Filters out workshops with bad data
  test('filters invalid workshops from results', async () => {
    getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'good_workshop',
          data: () => ({
            title: 'Good Workshop',
            category: 'Pottery',
            priceYen: 5000,
            lat: 35.0116,
            lng: 135.7681,
            ward: '中京区'
          })
        },
        {
          id: 'bad_workshop',
          data: () => ({
            title: '',
            priceYen: -1000,  // Invalid
            lat: 999,  // Invalid
            lng: 999   // Invalid
          })
        }
      ]
    });
    
    const workshops = await fetchWorkshops();
    
    // Should only have the valid workshop
    expect(workshops.length).toBe(1);
    expect(workshops[0].id).toBe('good_workshop');
  });
});

describe('Fetch Single Workshop', () => {
  
  // Should throw error if no ID provided
  test('throws error when ID is missing', async () => {
    await expect(fetchWorkshopById(null)).rejects.toThrow('Workshop ID is required');
    await expect(fetchWorkshopById('')).rejects.toThrow('Workshop ID is required');
  });
  
  // Returns workshop when found
  test('returns workshop when it exists', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      id: 'workshop_kintsugi_basics',
      data: () => ({
        title: 'Kintsugi Basics',
        category: 'Kintsugi',
        priceYen: 12000,
        lat: 35.0037,
        lng: 135.7788,
        ward: '東山区'
      })
    });
    
    const workshop = await fetchWorkshopById('workshop_kintsugi_basics');
    
    expect(workshop).not.toBeNull();
    expect(workshop.title).toBe('Kintsugi Basics');
  });
  
  // Returns null for non-existent workshop (not in Firebase or local)
  test('returns null when workshop not found', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    
    const workshop = await fetchWorkshopById('nonexistent_workshop');
    
    // Should check local data as fallback, but won't find it
    expect(workshop).toBeNull();
  });
});

describe('Search Workshops', () => {
  
  // Empty filters should return all workshops
  test('returns all workshops when no filters applied', async () => {
    getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'w1',
          data: () => ({
            title: 'Workshop 1',
            category: 'Pottery',
            priceYen: 5000,
            lat: 35.0,
            lng: 135.7,
            ward: '東山区'
          })
        },
        {
          id: 'w2',
          data: () => ({
            title: 'Workshop 2',
            category: 'Painting',
            priceYen: 8000,
            lat: 35.0,
            lng: 135.7,
            ward: '中京区'
          })
        }
      ]
    });
    
    const results = await searchWorkshops({});
    
    expect(results.length).toBe(2);
  });
  
  // Handles search errors without crashing
  test('returns empty array on search error', async () => {
    getDocs.mockRejectedValue(new Error('Search failed'));
    
    const results = await searchWorkshops({ category: 'Pottery' });
    
    expect(results).toEqual([]);
  });
});
