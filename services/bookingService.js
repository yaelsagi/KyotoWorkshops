// Booking service
// Handles workshop bookings with validation and status tracking

import { collection, getDocs, addDoc, query, where, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { database } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKINGS_KEY = 'kyoto_bookings';
const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

// Check if booking data makes sense before saving
function validateBooking(booking) {
  const errors = [];
  
  if (!booking.workshopId || typeof booking.workshopId !== 'string') {
    errors.push('Booking must reference a valid workshop');
  }
  
  if (!booking.userId) {
    errors.push('User ID is required');
  }
  
  // Status should be one of the defined options
  if (booking.status && !BOOKING_STATUSES.includes(booking.status)) {
    errors.push(`Status must be one of: ${BOOKING_STATUSES.join(', ')}`);
  }
  
  // Check translator options if translator was requested
  if (booking.translatorRequested === true) {
    if (!booking.translatorLanguage) {
      errors.push('Language must be specified when requesting translator');
    }
    
    const validLanguages = ['English', 'Arabic', 'French', 'Spanish', 'Chinese'];
    if (!validLanguages.includes(booking.translatorLanguage)) {
      errors.push('Invalid translator language');
    }
  }
  
  // Price should be positive if it exists
  if (booking.priceYen !== undefined && (typeof booking.priceYen !== 'number' || booking.priceYen < 0)) {
    errors.push('Price must be a valid positive number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Get all bookings for a specific user
export async function fetchUserBookings(userId) {
  if (!userId) {
    throw new Error('User ID required to fetch bookings');
  }
  
  try {
    const bookingsCollection = collection(database, 'bookings');
    
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
    
    // Only return valid bookings
    return bookings.filter(booking => {
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
    const bookingsCollection = collection(database, 'bookings');
    
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
  // Make sure all the booking info is valid
  const validation = validateBooking(bookingData);
  
  if (!validation.valid) {
    throw new Error(`Invalid booking: ${validation.errors.join(', ')}`);
  }
  
  try {
    const bookingsCollection = collection(database, 'bookings');
    
    // Add creation timestamp and default status
    const completeBooking = {
      ...bookingData,
      status: bookingData.status || 'confirmed',
      bookedAt: new Date().toISOString(),
    };
    
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
    const bookingDoc = doc(database, 'bookings', bookingId);
    
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
    const bookingDoc = doc(database, 'bookings', bookingId);
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

export { validateBooking, BOOKING_STATUSES };
