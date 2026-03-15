// Progress: booking display helpers for shaping booking data in UI-friendly format.
import { normalizeWardName } from './normalizeWardName';

export function getPrimaryWorkshopImage(workshop) {
  if (!workshop?.images || !Array.isArray(workshop.images) || workshop.images.length === 0) {
    return null;
  }

  const firstImage = workshop.images[0];
  if (typeof firstImage === 'string' && (firstImage.startsWith('http') || firstImage.startsWith('file://'))) {
    return firstImage;
  }

  return null;
}

export function normalizeBookingForDisplay(booking, workshopLookup = new Map()) {
  const workshop = workshopLookup.get(booking.workshopId);

  const priceFromBooking = Number(booking.priceYen);
  const workshopPrice = Number(workshop?.priceYen);

  return {
    ...booking,
    title: booking.title || workshop?.title || 'Workshop',
    category: booking.category || workshop?.category || 'Workshop',
    ward: normalizeWardName(booking.ward || workshop?.ward || ''),
    priceYen: Number.isFinite(priceFromBooking)
      ? priceFromBooking
      : (Number.isFinite(workshopPrice) ? workshopPrice : 0),
    workshopImage: booking.workshopImage || getPrimaryWorkshopImage(workshop),
    lat: typeof booking.lat === 'number' ? booking.lat : workshop?.lat,
    lng: typeof booking.lng === 'number' ? booking.lng : workshop?.lng,
  };
}