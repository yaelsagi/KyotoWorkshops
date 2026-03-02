// Tests for booking service
// Tests validation, status updates, async operations, AsyncStorage sync

import {
  validateBooking,
  createBooking,
  fetchUserBookings,
  updateBookingStatus,
  cancelBooking,
  BOOKING_STATUSES
} from '../services/bookingService';
import { getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('firebase/firestore');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../config/firebase', () => ({ database: {} }));

describe('Booking Validation', () => {
  
  // Valid booking should pass all checks
  test('accepts valid booking', () => {
    const validBooking = {
      workshopId: 'workshop_test',
      userId: 'user_123',
      status: 'confirmed',
      translator: 'Yes',
      translatorLanguage: 'English',
      priceYen: 8000
    };
    
    const result = validateBooking(validBooking);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  // Status must be one of the allowed values
  test('rejects invalid status values', () => {
    const booking = {
      workshopId: 'w1',
      userId: 'u1',
      status: 'processing',  // Not in BOOKING_STATUSES
      priceYen: 5000
    };
    
    const result = validateBooking(booking);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.includes('Status must be one of'))).toBe(true);
  });
  
  // Price must be positive
  test('rejects negative price', () => {
    const booking = {
      workshopId: 'w1',
      userId: 'u1',
      status: 'pending',
      priceYen: -500
    };
    
    const result = validateBooking(booking);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Price must be a valid positive number');
  });
  
  // Translator language must be valid if translator is requested
  test('rejects invalid translator language', () => {
    const booking = {
      workshopId: 'w1',
      userId: 'u1',
      status: 'confirmed',
      translatorRequested: true,  // Use boolean instead of string
      translatorLanguage: 'Klingon',  // Not a valid language
      priceYen: 8000
    };
    
    const result = validateBooking(booking);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.includes('translator language'))).toBe(true);
  });
  
  // Workshop ID and User ID are required
  test('rejects booking without required IDs', () => {
    const bookingNoWorkshop = { userId: 'u1', status: 'pending', priceYen: 5000 };
    const bookingNoUser = { workshopId: 'w1', status: 'pending', priceYen: 5000 };
    
    expect(validateBooking(bookingNoWorkshop).valid).toBe(false);
    expect(validateBooking(bookingNoUser).valid).toBe(false);
  });
});

describe('Creating Bookings - Async Operations', () => {
  
  beforeEach(() => {
    // Clear AsyncStorage for each test
    AsyncStorage.setItem.mockClear();
  });
  
  // Should save to Firebase and AsyncStorage
  test('creates booking successfully in Firebase and AsyncStorage', async () => {
    addDoc.mockResolvedValue({ id: 'booking_new_123' });
    AsyncStorage.getItem.mockResolvedValue(null);  // No existing bookings
    
    const bookingData = {
      workshopId: 'workshop_kintsugi',
      userId: 'user_sarah',
      status: 'pending',
      translator: 'No',
      priceYen: 6500
    };
    
    const result = await createBooking(bookingData);
    
    // Should return the new booking ID
    expect(result.id).toBe('booking_new_123');
    
    // Should save to AsyncStorage for offline access
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
  
  // Should reject invalid booking before database write
  test('throws error for invalid booking data', async () => {
    const badBooking = {
      workshopId: 'w1',
      userId: '',  // Missing user ID
      status: 'invalid_status',
      priceYen: -100
    };
    
    await expect(createBooking(badBooking)).rejects.toThrow('Invalid booking');
  });
  
  // Should handle database errors gracefully
  test('handles Firebase write errors', async () => {
    addDoc.mockRejectedValue(new Error('Database connection failed'));
    
    const booking = {
      workshopId: 'w1',
      userId: 'u1',
      status: 'pending',
      priceYen: 5000
    };
    
    await expect(createBooking(booking)).rejects.toThrow('Could not complete your booking');
  });
});

describe('Fetching User Bookings - Loading States', () => {
  
  // Should load bookings from Firebase first
  test('fetches bookings from Firebase successfully', async () => {
    getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'booking_1',
          data: () => ({
            workshopId: 'workshop_tea',
            userId: 'user_john',
            status: 'confirmed',
            priceYen: 7000
          })
        },
        {
          id: 'booking_2',
          data: () => ({
            workshopId: 'workshop_kintsugi',
            userId: 'user_john',
            status: 'pending',
            priceYen: 6500
          })
        }
      ]
    });
    
    const bookings = await fetchUserBookings('user_john');
    
    expect(bookings).toHaveLength(2);
    expect(bookings[0].status).toBe('confirmed');
  });
  
  // Should fall back to AsyncStorage when Firebase fails
  test('falls back to AsyncStorage when Firebase unavailable', async () => {
    getDocs.mockRejectedValue(new Error('No internet connection'));
    
    // Mock AsyncStorage with cached data
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([
      {
        id: 'cached_booking',
        workshopId: 'w1',
        userId: 'u1',
        status: 'confirmed',
        priceYen: 5000
      }
    ]));
    
    const bookings = await fetchUserBookings('u1');
    
    // Should return cached bookings
    expect(bookings).toHaveLength(1);
    expect(bookings[0].id).toBe('cached_booking');
  });
  
  // Should handle empty results
  test('returns empty array when user has no bookings', async () => {
    getDocs.mockResolvedValue({
      empty: true,
      docs: []
    });
    AsyncStorage.getItem.mockResolvedValue(null); // No cached bookings
    
    const bookings = await fetchUserBookings('new_user');
    
    expect(bookings).toEqual([]);
  });
  
  // Should filter out invalid bookings
  test('filters invalid bookings from results', async () => {
    getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'good_booking',
          data: () => ({
            workshopId: 'w1',
            userId: 'u1',
            status: 'confirmed',
            priceYen: 5000
          })
        },
        {
          id: 'bad_booking',
          data: () => ({
            workshopId: '',  // Missing workshop ID
            userId: 'u1',
            status: 'invalid',  // Invalid status
            priceYen: -100  // Negative price
          })
        }
      ]
    });
    
    const bookings = await fetchUserBookings('u1');
    
    // Should only return valid booking
    expect(bookings).toHaveLength(1);
    expect(bookings[0].id).toBe('good_booking');
  });
});

describe('Updating Booking Status', () => {
  
  // Should update status in Firebase
  test('updates booking status successfully', async () => {
    doc.mockReturnValue('mock_doc_ref');
    updateDoc.mockResolvedValue(undefined);
    
    await updateBookingStatus('booking_123', 'confirmed');
    
    expect(updateDoc).toHaveBeenCalledWith(
      'mock_doc_ref',
      expect.objectContaining({ status: 'confirmed' })
    );
  });
  
  // Should reject invalid status
  test('throws error for invalid status', async () => {
    await expect(
      updateBookingStatus('booking_123', 'unknown_status')
    ).rejects.toThrow('Invalid status');
  });
  
  // Should handle update errors
  test('handles database update errors', async () => {
    doc.mockReturnValue('mock_doc_ref');
    updateDoc.mockRejectedValue(new Error('Update failed'));
    
    await expect(
      updateBookingStatus('booking_123', 'confirmed')
    ).rejects.toThrow('Could not update booking status');
  });
});

describe('Cancelling Bookings', () => {
  
  // Should change status to cancelled
  test('cancels booking by setting status to cancelled', async () => {
    doc.mockReturnValue('mock_doc_ref');
    updateDoc.mockResolvedValue(undefined);
    
    await cancelBooking('booking_123');
    
    expect(updateDoc).toHaveBeenCalledWith(
      'mock_doc_ref',
      expect.objectContaining({ status: 'cancelled' })
    );
  });
  
  // Should handle cancellation errors
  test('handles cancellation errors', async () => {
    doc.mockReturnValue('mock_doc_ref');
    updateDoc.mockRejectedValue(new Error('Cancellation failed'));
    
    await expect(cancelBooking('booking_123')).rejects.toThrow('Could not update booking status');
  });
});

describe('Booking Constants', () => {
  
  // Ensure status constant is properly exported
  test('BOOKING_STATUSES contains all expected values', () => {
    expect(BOOKING_STATUSES).toContain('pending');
    expect(BOOKING_STATUSES).toContain('confirmed');
    expect(BOOKING_STATUSES).toContain('cancelled');
    expect(BOOKING_STATUSES).toContain('completed');
  });
});
