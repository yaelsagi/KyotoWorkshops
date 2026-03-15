// workshop service tests
import { 
  fetchWorkshops, 
  fetchWorkshopById,
  searchWorkshops 
} from '../services/workshopService';
import { validateWorkshopData } from '../utils/workshopValidation';
import { getDocs, getDoc } from 'firebase/firestore';

jest.mock('firebase/firestore');
jest.mock('../firebase/firebase', () => ({ db: {} }));

describe('Workshop Data Validation', () => {
  
  test('accepts valid workshop data', () => {
    const validWorkshop = {
      id: 'workshop_test',
      title: 'Test Workshop',
      category: 'Pottery',
      priceYen: 5000,
      lat: 35.0116,
      lng: 135.7681,
      ward: 'Nakagyo'
    };
    
    const result = validateWorkshopData(validWorkshop);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
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
  
  test('rejects empty title', () => {
    const workshop = {
      id: 'workshop_test',
      title: '   ',
      category: 'Pottery',
      priceYen: 5000,
      lat: 35.0116,
      lng: 135.7681,
      ward: 'Nakagyo'
    };
    
    const result = validateWorkshopData(workshop);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title cannot be empty');
  });
  
  test('rejects negative price', () => {
    const workshop = {
      id: 'workshop_test',
      title: 'Test',
      category: 'Pottery',
      priceYen: -1000,
      lat: 35.0116,
      lng: 135.7681,
      ward: 'Nakagyo'
    };
    
    const result = validateWorkshopData(workshop);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Price must be a positive number');
  });
  
  test('rejects coordinates outside Kyoto', () => {
    const workshop = {
      id: 'workshop_test',
      title: 'Test',
      category: 'Pottery',
      priceYen: 5000,
      lat: 40.0,
      lng: 140.0,
      ward: 'Nakagyo'
    };
    
    const result = validateWorkshopData(workshop);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Workshop location must be within Kyoto');
  });
  
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
  
  test('loads workshops from Firestore successfully', async () => {
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
            ward: 'Higashiyama'
          })
        }
      ]
    });

    const workshopsPromise = fetchWorkshops();

    expect(workshopsPromise).toBeInstanceOf(Promise);

    const workshops = await workshopsPromise;

    expect(Array.isArray(workshops)).toBe(true);
    expect(workshops.length).toBeGreaterThan(0);
  });

  test('falls back to local data when Firebase is empty', async () => {
    getDocs.mockResolvedValue({
      empty: true,
      docs: []
    });
    
    const workshops = await fetchWorkshops();
    
    expect(Array.isArray(workshops)).toBe(true);
  });

  test('handles network errors gracefully', async () => {
    getDocs.mockRejectedValue(new Error('Network timeout'));
    
    const workshops = await fetchWorkshops();
    
    expect(Array.isArray(workshops)).toBe(true);
  });

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
            ward: 'Nakagyo'
          })
        },
        {
          id: 'bad_workshop',
          data: () => ({
            title: '',
            priceYen: -1000,
            lat: 999,
            lng: 999
          })
        }
      ]
    });
    
    const workshops = await fetchWorkshops();
    
    expect(workshops.length).toBe(1);
    expect(workshops[0].id).toBe('good_workshop');
  });
});

describe('Fetch Single Workshop', () => {

  test('throws error when ID is missing', async () => {
    await expect(fetchWorkshopById(null)).rejects.toThrow('Workshop ID is required');
    await expect(fetchWorkshopById('')).rejects.toThrow('Workshop ID is required');
  });
  
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
        ward: 'Higashiyama'
      })
    });
    
    const workshop = await fetchWorkshopById('workshop_kintsugi_basics');
    
    expect(workshop).not.toBeNull();
    expect(workshop.title).toBe('Kintsugi Basics');
  });
  
  test('returns null when workshop not found', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    
    const workshop = await fetchWorkshopById('nonexistent_workshop');
    
    expect(workshop).toBeNull();
  });
});

describe('Search Workshops', () => {

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
            ward: 'Higashiyama'
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
            ward: 'Nakagyo'
          })
        }
      ]
    });
    
    const results = await searchWorkshops({});
    
    expect(results.length).toBe(2);
  });
  
  test('returns empty array on search error', async () => {
    getDocs.mockRejectedValue(new Error('Search failed'));
    
    const results = await searchWorkshops({ category: 'Pottery' });
    
    expect(results).toEqual([]);
  });
});

