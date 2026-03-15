// Progress: this service now handles address to coordinate geocoding.
import { normalizeWardName } from '../utils/normalizeWardName';
import { isWithinKyotoBounds } from '../utils/workshopValidation';

export const GEOCODING_FAILURE_MESSAGE = 'Could not find this address. Please check the address and try again.';
const GEOCODING_TIMEOUT_MS = 8000;

export async function geocodeWorkshopAddress(address, ward) {
  const normalizedAddress = String(address || '').trim();
  const normalizedWard = normalizeWardName(ward);

  if (!normalizedAddress || !normalizedWard) {
    throw new Error(GEOCODING_FAILURE_MESSAGE);
  }

  const queryText = `${normalizedAddress}, ${normalizedWard}, Kyoto, Japan`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=jp&q=${encodeURIComponent(queryText)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, GEOCODING_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const result = await response.json();
    const firstMatch = Array.isArray(result) ? result[0] : null;
    const latitude = Number(firstMatch?.lat);
    const longitude = Number(firstMatch?.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('Geocoding returned invalid coordinates');
    }

    if (!isWithinKyotoBounds(latitude, longitude)) {
      throw new Error('Geocoding returned coordinates outside Kyoto bounds');
    }

    return { latitude, longitude };
  } catch {
    throw new Error(GEOCODING_FAILURE_MESSAGE);
  } finally {
    clearTimeout(timeoutId);
  }
}
