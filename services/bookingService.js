// Booking service
// Handles workshop bookings with validation and status tracking

import { collection, getDocs, addDoc, query, where, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWorkshopById, fetchWorkshops } from './workshopService';
import { normalizeWardName } from '../utils/normalizeWardName';
import { BOOKING_STATUSES, validateBooking } from '../utils/bookingValidation';
import { getPrimaryWorkshopImage, normalizeBookingForDisplay } from '../utils/bookingNormalizer';
import { markWorkshopSessionAsBooked } from '../utils/sessionBookingUtils';

const BOOKINGS_KEY = 'kyoto_bookings';

// Get all bookings for a specific user
export async function fetchUserBookings(userId) {
  if (!userId) {
    throw new Error('User ID required to fetch bookings');
  }
  
  try {
    const bookingsCollection = collection(db, 'bookings');
    
    // Get this user's bookings, newest first
    const bookingQuery = query(
      bookingsCollection,
      where('userId', '==', userId),
      orderBy('bookedAt', 'desc')
    );
    
    const snapshot = await getDocs(bookingQuery);
    
    // If database is empty, try loading from local storage
    if (snapshot.empty) {
      const stored = await AsyncStorage.getItem(BOOKINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    }
    
    const bookings = snapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    }));

    let workshopLookup = new Map();
    try {
      const workshops = await fetchWorkshops();
      workshopLookup = new Map(workshops.map((workshop) => [workshop.id, workshop]));
    } catch {
      workshopLookup = new Map();
    }

    const enrichedBookings = bookings.map((booking) => normalizeBookingForDisplay(booking, workshopLookup));

    try {
      await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(enrichedBookings));
    } catch {
      // Cache write is optional
    }
    
    // Only return valid bookings
    return enrichedBookings.filter(booking => {
      const validation = validateBooking(booking);
      if (!validation.valid) {
        console.warn(`Booking ${booking.id} has issues:`, validation.errors);
        return false;
      }
      return true;
    });
    
  } catch (error) {
    console.log('Could not fetch user bookings:', error.message);
    
    // Try local storage as fallback
    try {
      const stored = await AsyncStorage.getItem(BOOKINGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

// Get bookings for a workshop (useful for hosts)
export async function fetchWorkshopBookings(workshopId) {
  if (!workshopId) {
    throw new Error('Workshop ID required');
  }
  
  try {
    const bookingsCollection = collection(db, 'bookings');
    
    const bookingQuery = query(
      bookingsCollection,
      where('workshopId', '==', workshopId),
      where('status', '!=', 'cancelled'),
      orderBy('status'),
      orderBy('bookedAt', 'desc')
    );
    
    const snapshot = await getDocs(bookingQuery);
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(booking => validateBooking(booking).valid);
    
  } catch (error) {
    console.log('Could not load workshop bookings:', error.message);
    return [];
  }
}

// User books a workshop
export async function createBooking(bookingData) {
  let workshop = null;
  try {
    workshop = await fetchWorkshopById(bookingData.workshopId);
  } catch {
    workshop = null;
  }

  const completeBookingDraft = {
    ...bookingData,
    title: bookingData.title || workshop?.title,
    category: bookingData.category || workshop?.category,
    ward: normalizeWardName(bookingData.ward || workshop?.ward || ''),
    priceYen: typeof bookingData.priceYen === 'number' ? bookingData.priceYen : Number(workshop?.priceYen),
    workshopImage: bookingData.workshopImage || getPrimaryWorkshopImage(workshop),
    lat: typeof bookingData.lat === 'number' ? bookingData.lat : workshop?.lat,
    lng: typeof bookingData.lng === 'number' ? bookingData.lng : workshop?.lng,
  };

  // Make sure all the booking info is valid
  const validation = validateBooking(completeBookingDraft);
  
  if (!validation.valid) {
    throw new Error(`Invalid booking: ${validation.errors.join(', ')}`);
  }
  
  try {
    const bookingsCollection = collection(db, 'bookings');
    const hasSessionSelection = Boolean(bookingData?.sessionId);

    // block duplicate active bookings for the same workshop session
    if (hasSessionSelection) {
      const existingSessionBookingsQuery = query(
        bookingsCollection,
        where('workshopId', '==', completeBookingDraft.workshopId),
        where('sessionId', '==', bookingData.sessionId)
      );
      const existingSessionBookingsSnapshot = await getDocs(existingSessionBookingsQuery);
      const alreadyBooked = existingSessionBookingsSnapshot.docs
        .map((document) => document.data())
        .some((booking) => booking?.status !== 'cancelled');

      if (alreadyBooked) {
        throw new Error('This session is already booked');
      }
    }
    
    // Add creation timestamp and default status
    const completeBooking = {
      ...completeBookingDraft,
      status: bookingData.status || 'confirmed',
      translatorRequested: bookingData.translatorRequested === true,
      requestedLanguage: bookingData.translatorRequested ? bookingData.requestedLanguage || null : null,
      translatorId: bookingData.translatorId || null,
      translatorStatus: bookingData.translatorRequested
        ? (bookingData.translatorId ? 'assigned' : 'requested')
        : 'none',
      bookedAt: new Date().toISOString(),
    };
    
    // update workshop session status before saving booking
    if (hasSessionSelection) {
      const latestWorkshop = await fetchWorkshopById(completeBookingDraft.workshopId);
      if (!latestWorkshop) {
        throw new Error('Workshop not found');
      }

      const nextSessions = markWorkshopSessionAsBooked(
        latestWorkshop.sessions,
        bookingData.sessionId,
        completeBooking.bookedAt
      );

      const workshopRef = doc(db, 'workshops', completeBookingDraft.workshopId);
      await updateDoc(workshopRef, {
        sessions: nextSessions,
        updatedAt: new Date().toISOString(),
      });
    }

    // save final booking record after session lock
    const documentRef = await addDoc(bookingsCollection, completeBooking);
    const savedBooking = {
      id: documentRef.id,
      ...completeBooking
    };
    
    // Also save locally for offline access
    try {
      const stored = await AsyncStorage.getItem(BOOKINGS_KEY);
      const bookings = stored ? JSON.parse(stored) : [];
      bookings.push(savedBooking);
      await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    } catch (storageError) {
      console.log('Could not save booking locally:', storageError.message);
      // Not critical, we already saved to Firebase
    }
    
    return savedBooking;
    
  } catch (error) {
    console.error('Booking creation failed:', error);
    // keep specific session-lock errors for clearer UI feedback
    if (error?.message === 'This session is already booked' || error?.message === 'Selected session is unavailable') {
      throw error;
    }
    throw new Error('Could not complete your booking. Please try again.');
  }
}

// Update booking status (confirm, cancel, complete)
export async function updateBookingStatus(bookingId, newStatus) {
  if (!bookingId) {
    throw new Error('Booking ID required');
  }
  
  if (!BOOKING_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status. Must be: ${BOOKING_STATUSES.join(', ')}`);
  }
  
  try {
    const bookingDoc = doc(db, 'bookings', bookingId);
    
    await updateDoc(bookingDoc, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
    
    // Update local storage too
    try {
      const stored = await AsyncStorage.getItem(BOOKINGS_KEY);
      if (stored) {
        const bookings = JSON.parse(stored);
        const updated = bookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus }
            : booking
        );
        await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(updated));
      }
    } catch {
      // Local update failed, not critical
    }
    
    return true;
    
  } catch (error) {
    console.error('Status update failed:', error);
    throw new Error('Could not update booking status');
  }
}

// Cancel a booking
export async function cancelBooking(bookingId) {
  return updateBookingStatus(bookingId, 'cancelled');
}

// Delete booking completely (for testing or admin)
export async function deleteBooking(bookingId) {
  if (!bookingId) {
    throw new Error('Booking ID required');
  }
  
  try {
    const bookingDoc = doc(db, 'bookings', bookingId);
    await deleteDoc(bookingDoc);
    
    // Remove from local storage
    try {
      const stored = await AsyncStorage.getItem(BOOKINGS_KEY);
      if (stored) {
        const bookings = JSON.parse(stored);
        const filtered = bookings.filter(b => b.id !== bookingId);
        await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(filtered));
      }
    } catch {
      // Not critical
    }
    
    return true;
    
  } catch (error) {
    console.error('Booking deletion failed:', error);
    throw new Error('Could not delete booking');
  }
}

// Check if a specific user already has an active (non-cancelled) booking for a workshop
export async function fetchUserBookingForWorkshop(userId, workshopId) {
  if (!userId || !workshopId) return null;

  try {
    const bookingsCollection = collection(db, 'bookings');
    const q = query(
      bookingsCollection,
      where('userId', '==', userId),
      where('workshopId', '==', workshopId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    // Return the first non-cancelled booking
    const active = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .find(b => b.status !== 'cancelled');

    return active || null;
  } catch (error) {
    console.log('Could not check existing booking:', error.message);
    return null;
  }
}

