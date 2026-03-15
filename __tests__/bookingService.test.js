// Booking service tests:

import {
  createBooking,
  fetchUserBookings,
  updateBookingStatus,
  cancelBooking
} from '../services/bookingService';
import { validateBooking, BOOKING_STATUSES } from '../utils/bookingValidation';
import { getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as workshopService from '../services/workshopService';

jest.mock('firebase/firestore');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../firebase/firebase', () => ({ db: {} }));
jest.mock('../services/workshopService', () => ({
  fetchWorkshopById: jest.fn(),
  fetchWorkshops: jest.fn(),
}));

describe('Booking Validation', () => {

  test('accepts a valid booking payload', () => {
    const validBooking = {
      workshopId: 'workshop_test',
      userId: 'user_123',
      status: 'confirmed',
      translatorRequested: true,
      requestedLanguage: 'English',
      translatorStatus: 'requested',
      priceYen: 8000
    };
    
    const result = validateBooking(validBooking);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  test('rejects unknown booking status', () => {
    const booking = {
      workshopId: 'w1',
      userId: 'u1',
      status: 'processing',
      priceYen: 5000
    };
    
    const result = validateBooking(booking);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.includes('Status must be one of'))).toBe(true);
  });
  
  test('rejects negative price values', () => {
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
  
  test('rejects invalid requestedLanguage when translator is requested', () => {
    const booking = {
      workshopId: 'w1',
      userId: 'u1',
      status: 'confirmed',
      translatorRequested: true,
      requestedLanguage: 'Klingon',
      priceYen: 8000
    };
    
    const result = validateBooking(booking);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.includes('translator language'))).toBe(true);
  });
  
  test('requires workshopId and userId', () => {
    const bookingNoWorkshop = { userId: 'u1', status: 'pending', priceYen: 5000 };
    const bookingNoUser = { workshopId: 'w1', status: 'pending', priceYen: 5000 };
    
    expect(validateBooking(bookingNoWorkshop).valid).toBe(false);
    expect(validateBooking(bookingNoUser).valid).toBe(false);
  });
});

describe('Creating Bookings - Async Operations', () => {

  beforeEach(() => {
    AsyncStorage.setItem.mockClear();
    getDocs.mockResolvedValue({ docs: [] });
    addDoc.mockResolvedValue({ id: 'booking_new_123' });
    doc.mockReturnValue('mock_doc_ref');

    workshopService.fetchWorkshopById.mockResolvedValue({
      id: 'workshop_kintsugi',
      title: 'Kintsugi Basics',
      category: 'Kintsugi',
      ward: 'Nakagyo',
      priceYen: 6500,
      images: ['https://example.com/workshop.jpg'],
      lat: 35.01,
      lng: 135.76,
      sessions: [{ id: 'session_1', date: '2026-05-01', time: '10:00' }],
    });
  });
  
  test('creates booking in Firebase and writes to AsyncStorage', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    
    const bookingData = {
      workshopId: 'workshop_kintsugi',
      userId: 'user_sarah',
      sessionId: 'session_1',
      status: 'pending',
      translatorRequested: false,
      priceYen: 6500
    };
    
    const result = await createBooking(bookingData);
    
    expect(result.id).toBe('booking_new_123');
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  test('throws for invalid booking data before write', async () => {
    const badBooking = {
      workshopId: 'w1',
      userId: '',
      status: 'invalid_status',
      priceYen: -100
    };
    
    await expect(createBooking(badBooking)).rejects.toThrow('Invalid booking');
  });
  
  test('returns a friendly error when Firebase write fails', async () => {
    addDoc.mockRejectedValue(new Error('Database connection failed'));
    
    const booking = {
      workshopId: 'w1',
      userId: 'u1',
      status: 'pending',
      priceYen: 5000
    };
    
    await expect(createBooking(booking)).rejects.toThrow('Could not complete your booking');
  });

  test('sets translatorStatus to assigned when translatorId is present', async () => {
    addDoc.mockResolvedValue({ id: 'booking_with_translator' });
    AsyncStorage.getItem.mockResolvedValue(null);

    const bookingData = {
      workshopId: 'workshop_kintsugi',
      userId: 'user_with_translator',
      sessionId: 'session_1',
      status: 'confirmed',
      translatorRequested: true,
      requestedLanguage: 'English',
      translatorId: 'translator_lorem_01',
      priceYen: 6500,
    };

    const saved = await createBooking(bookingData);

    expect(saved.translatorStatus).toBe('assigned');
    expect(saved.translatorId).toBe('translator_lorem_01');
  });

  test('sets translatorStatus to requested when no translator is assigned', async () => {
    addDoc.mockResolvedValue({ id: 'booking_translator_requested' });
    AsyncStorage.getItem.mockResolvedValue(null);

    const bookingData = {
      workshopId: 'workshop_kintsugi',
      userId: 'user_waiting_for_match',
      sessionId: 'session_1',
      status: 'confirmed',
      translatorRequested: true,
      requestedLanguage: 'French',
      priceYen: 6500,
    };

    const saved = await createBooking(bookingData);

    expect(saved.translatorStatus).toBe('requested');
    expect(saved.translatorId).toBeNull();
  });

  test('prevents booking when the selected session is already booked', async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({ status: 'confirmed' }),
        },
      ],
    });

    await expect(
      createBooking({
        workshopId: 'workshop_kintsugi',
        userId: 'user_double_book',
        sessionId: 'session_1',
        status: 'confirmed',
        priceYen: 6500,
      })
    ).rejects.toThrow('This session is already booked');
  });

  test('prevents booking when workshop session is marked unavailable', async () => {
    getDocs.mockResolvedValue({ docs: [] });
    workshopService.fetchWorkshopById.mockResolvedValue({
      id: 'workshop_kintsugi',
      title: 'Kintsugi Basics',
      category: 'Kintsugi',
      ward: 'Nakagyo',
      priceYen: 6500,
      images: ['https://example.com/workshop.jpg'],
      lat: 35.01,
      lng: 135.76,
      sessions: [{ id: 'session_1', date: '2026-05-01', time: '10:00', availabilityStatus: 'booked' }],
    });

    await expect(
      createBooking({
        workshopId: 'workshop_kintsugi',
        userId: 'user_unavailable_session',
        sessionId: 'session_1',
        status: 'confirmed',
        priceYen: 6500,
      })
    ).rejects.toThrow('This session is already booked');
  });
});

describe('Fetching User Bookings - Loading States', () => {

  test('loads bookings from Firebase', async () => {
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
  
  test('falls back to AsyncStorage when Firebase is unavailable', async () => {
    getDocs.mockRejectedValue(new Error('No internet connection'));

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
    
    expect(bookings).toHaveLength(1);
    expect(bookings[0].id).toBe('cached_booking');
  });

  test('returns an empty array when user has no bookings', async () => {
    getDocs.mockResolvedValue({
      empty: true,
      docs: []
    });
    AsyncStorage.getItem.mockResolvedValue(null);
    
    const bookings = await fetchUserBookings('new_user');
    
    expect(bookings).toEqual([]);
  });
  
  test('filters invalid bookings from fetched results', async () => {
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
            status: 'invalid',
            priceYen: -100
          })
        }
      ]
    });
    
    const bookings = await fetchUserBookings('u1');
    
    expect(bookings).toHaveLength(1);
    expect(bookings[0].id).toBe('good_booking');
  });
});

describe('Updating Booking Status', () => {

  test('updates booking status in Firebase', async () => {
    doc.mockReturnValue('mock_doc_ref');
    updateDoc.mockResolvedValue(undefined);
    
    await updateBookingStatus('booking_123', 'confirmed');
    
    expect(updateDoc).toHaveBeenCalledWith(
      'mock_doc_ref',
      expect.objectContaining({ status: 'confirmed' })
    );
  });
  
  test('throws for invalid status', async () => {
    await expect(
      updateBookingStatus('booking_123', 'unknown_status')
    ).rejects.toThrow('Invalid status');
  });
  
  test('handles database update errors', async () => {
    doc.mockReturnValue('mock_doc_ref');
    updateDoc.mockRejectedValue(new Error('Update failed'));
    
    await expect(
      updateBookingStatus('booking_123', 'confirmed')
    ).rejects.toThrow('Could not update booking status');
  });
});

describe('Cancelling Bookings', () => {

  test('sets status to cancelled', async () => {
    doc.mockReturnValue('mock_doc_ref');
    updateDoc.mockResolvedValue(undefined);
    
    await cancelBooking('booking_123');
    
    expect(updateDoc).toHaveBeenCalledWith(
      'mock_doc_ref',
      expect.objectContaining({ status: 'cancelled' })
    );
  });
  
  test('handles cancellation errors', async () => {
    doc.mockReturnValue('mock_doc_ref');
    updateDoc.mockRejectedValue(new Error('Cancellation failed'));
    
    await expect(cancelBooking('booking_123')).rejects.toThrow('Could not update booking status');
  });
});

describe('Booking Constants', () => {

  test('includes all expected booking statuses', () => {
    expect(BOOKING_STATUSES).toContain('pending');
    expect(BOOKING_STATUSES).toContain('confirmed');
    expect(BOOKING_STATUSES).toContain('cancelled');
    expect(BOOKING_STATUSES).toContain('completed');
  });
});

