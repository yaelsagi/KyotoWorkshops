// Progress: this utility module is implemented and currently used by app features.
// utils/filters.js
import {
  ALL_OPTION,
  KYOTO_WARDS,
} from "../constants/kyotoWards";
import { WORKSHOP_CATEGORIES } from "../constants/workshopCategories";
import { normalizeWardName } from "./normalizeWardName";

export const FILTERS_KEY = "kyoto_last_filters";

export const DEFAULT_FILTERS = {
  onlyFavourites: false,
  onlyTop: false,
  selectedWards: [],
  selectedCategories: [],
  minPrice: null,
  maxPrice: null,
  translatorAvailable: false,
};

function normalizePrice(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function normalizePriceRange(minPrice, maxPrice) {
  const min = normalizePrice(minPrice);
  const max = normalizePrice(maxPrice);

  if (min === null && max === null) {
    return { minPrice: null, maxPrice: null };
  }

  if (min === null) {
    return { minPrice: null, maxPrice: max };
  }

  if (max === null) {
    return { minPrice: min, maxPrice: null };
  }

  if (min > max) {
    return { minPrice: max, maxPrice: min };
  }

  return { minPrice: min, maxPrice: max };
}

export function applyFilters({ workshops, favouritesSet, filters, query = "" }) {
  const loweredQuery = String(query).trim().toLowerCase();
  const selectedWards = Array.isArray(filters?.selectedWards)
    ? filters.selectedWards.filter((ward) => ward && ward !== ALL_OPTION)
    : [];
  const selectedCategories = Array.isArray(filters?.selectedCategories)
    ? filters.selectedCategories
    : [];

  const { minPrice, maxPrice } = normalizePriceRange(filters?.minPrice, filters?.maxPrice);

  return workshops.filter((workshop) => {
    if (filters?.onlyFavourites && !favouritesSet.has(workshop.id)) return false;
    if (filters?.onlyTop && !workshop.isTop) return false;

    if (selectedWards.length > 0) {
      if (!selectedWards.includes(normalizeWardName(workshop.ward))) return false;
    }

    if (selectedCategories.length > 0) {
      if (!selectedCategories.includes(workshop.category)) return false;
    }

    if (filters?.translatorAvailable && workshop.translatorAvailable !== true) {
      return false;
    }

    const workshopPrice = Number(workshop.priceYen ?? 0);
    if (minPrice !== null && workshopPrice < minPrice) return false;
    if (maxPrice !== null && workshopPrice > maxPrice) return false;

    if (loweredQuery) {
      const searchText = `${workshop.title} ${workshop.category} ${normalizeWardName(workshop.ward)}`.toLowerCase();
      if (!searchText.includes(loweredQuery)) return false;
    }

    return true;
  });
}

// platformCategories: pass the full list from fetchPlatformCategories() so admin-approved
// custom categories appear in the filter UI alongside the static defaults.
export function deriveFilterOptions(workshops, platformCategories = WORKSHOP_CATEGORIES) {
  const workshopCategories = Array.from(
    new Set(workshops.map((workshop) => workshop.category).filter(Boolean))
  ).sort();

  const categories = Array.from(
    new Set([...platformCategories, ...workshopCategories])
    // Always show category filters in Aג†’Z order.
  ).sort((a, b) => a.localeCompare(b));

  const normalizedWards = workshops
    .map((workshop) => normalizeWardName(workshop.ward))
    .filter(Boolean);

  const wards = Array.from(new Set([...KYOTO_WARDS, ...normalizedWards]));

  const prices = workshops
    .map((workshop) => Number(workshop.priceYen))
    .filter((price) => !Number.isNaN(price));

  return {
    wards: [ALL_OPTION, ...wards],
    categories,
    minAvailablePrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxAvailablePrice: prices.length > 0 ? Math.max(...prices) : 20000,
  };
}
