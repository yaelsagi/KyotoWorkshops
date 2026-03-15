//helper script to makes booking data consistent for UI display.

import { normalizeWardName } from './normalizeWardName';

// return the first usable workshop image URL
// used as fallback when displaying workshop or booking cards
export function getPrimaryWorkshopImage(workshop) {

  // no available images
  if (!workshop?.images || !Array.isArray(workshop.images) || workshop.images.length === 0) {
    return null;
  }

  const firstImage = workshop.images[0];

  // accept remote or local URLs
  if (typeof firstImage === 'string' && (firstImage.startsWith('http') || firstImage.startsWith('file://'))) {
    return firstImage;
  }

  return null;
}

// prepare booking data for UI display
// booking stores workshop details; if missing, fall back to workshop data
export function normalizeBookingForDisplay(booking, workshopLookup = new Map()) {

  const workshop = workshopLookup.get(booking.workshopId);

  const priceFromBooking = Number(booking.priceYen);
  const workshopPrice = Number(workshop?.priceYen);

  return {
    ...booking,

    // prefer values stored in booking, otherwise use workshop data
    title: booking.title || workshop?.title || 'Workshop',
    category: booking.category || workshop?.category || 'Workshop',

    // normalize ward name for consistent display
    ward: normalizeWardName(booking.ward || workshop?.ward || ''),

    // use booking price if available, otherwise workshop price    priceYen: Number.isFinite(priceFromBooking)
      ? priceFromBooking
      : (Number.isFinite(workshopPrice) ? workshopPrice : 0),

    // image fallback
    workshopImage: booking.workshopImage || getPrimaryWorkshopImage(workshop),

    // coordinates fallback
    lat: typeof booking.lat === 'number' ? booking.lat : workshop?.lat,
    lng: typeof booking.lng === 'number' ? booking.lng : workshop?.lng,
  };
}