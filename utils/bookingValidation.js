// Progress: booking validation rules and status constants used by booking flows.
import { SUPPORTED_LANGUAGES } from '../constants/supportedLanguages';

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];
export const TRANSLATOR_BOOKING_STATUSES = ['none', 'requested', 'assigned', 'completed'];

// Check if booking data makes sense before saving
export function validateBooking(booking) {
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
    if (!booking.requestedLanguage) {
      errors.push('Language must be specified when requesting translator');
    }

    if (!SUPPORTED_LANGUAGES.includes(booking.requestedLanguage)) {
      errors.push('Invalid translator language');
    }
  }

  if (booking.translatorStatus && !TRANSLATOR_BOOKING_STATUSES.includes(booking.translatorStatus)) {
    errors.push(`Translator status must be one of: ${TRANSLATOR_BOOKING_STATUSES.join(', ')}`);
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