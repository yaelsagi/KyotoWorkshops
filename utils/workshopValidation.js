// Progress: this utility module now validates workshop submission and document data.
import { KYOTO_WARDS } from '../constants/kyotoWards';
import { normalizeWardName } from './normalizeWardName';

export const KYOTO_COORDINATE_BOUNDS = Object.freeze({
  minLat: 34.9,
  maxLat: 35.1,
  minLng: 135.6,
  maxLng: 135.9,
});

export function isWithinKyotoBounds(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }

  return (
    lat >= KYOTO_COORDINATE_BOUNDS.minLat &&
    lat <= KYOTO_COORDINATE_BOUNDS.maxLat &&
    lng >= KYOTO_COORDINATE_BOUNDS.minLng &&
    lng <= KYOTO_COORDINATE_BOUNDS.maxLng
  );
}

export function validateWorkshopSubmission(workshop) {
  const errors = [];

  if (!workshop?.title || workshop.title.trim() === '') {
    errors.push('Title is required');
  }

  const categories = Array.isArray(workshop?.categories) ? workshop.categories : [];
  if (categories.length === 0) {
    errors.push('At least one category is required');
  }

  if (!workshop?.ward) {
    errors.push('Ward is required');
  }

  if (!workshop?.address || workshop.address.trim() === '') {
    errors.push('Address is required');
  }

  if (!workshop?.duration || workshop.duration.trim() === '') {
    errors.push('Duration is required');
  }

  if (!workshop?.description || workshop.description.trim() === '') {
    errors.push('Description is required');
  }

  if (typeof workshop?.priceYen !== 'number' || Number.isNaN(workshop.priceYen) || workshop.priceYen <= 0) {
    errors.push('Price must be a positive number');
  }

  if (!Number.isInteger(workshop?.maxParticipants) || workshop.maxParticipants <= 0) {
    errors.push('Maximum participants must be a positive integer');
  }

  if (!workshop?.coverImageAsset?.uri) {
    errors.push('Cover image is required');
  }

  if (!Array.isArray(workshop?.galleryImageAssets) || workshop.galleryImageAssets.length < 3) {
    errors.push('At least 3 gallery images are required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateWorkshopData(workshop) {
  const errors = [];

  if (!workshop.id || typeof workshop.id !== 'string') {
    errors.push('Workshop must have a valid ID');
  }

  if (!workshop.title || workshop.title.trim() === '') {
    errors.push('Title cannot be empty');
  }

  if (!workshop.category) {
    errors.push('Category is required');
  }

  const normalizedWard = normalizeWardName(workshop.ward);
  if (!normalizedWard) {
    errors.push('Ward is required');
  } else if (!KYOTO_WARDS.includes(normalizedWard)) {
    errors.push('Ward must be a valid Kyoto ward');
  }

  if (typeof workshop.priceYen !== 'number' || workshop.priceYen < 0) {
    errors.push('Price must be a positive number');
  }

  if (typeof workshop.lat !== 'number' || typeof workshop.lng !== 'number') {
    errors.push('Location coordinates are missing or invalid');
  }

  if (!isWithinKyotoBounds(workshop.lat, workshop.lng)) {
    errors.push('Workshop location must be within Kyoto');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
