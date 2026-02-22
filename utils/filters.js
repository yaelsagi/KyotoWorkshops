// utils/filters.js
export const FILTERS_KEY = "kyoto_last_filters";

export const DEFAULT_FILTERS = {
  query: "",
  onlyFavourites: false,
  onlyTop: false,
  ward: "Any",
  category: "Any",
  minPrice: "",
  maxPrice: "",
};

export function applyFilters({ workshops, favouritesSet, filters }) {
  const q = (filters.query || "").trim().toLowerCase();

  return workshops.filter((w) => {
    if (filters.onlyFavourites && !favouritesSet.has(w.id)) return false;
    if (filters.onlyTop && !w.isTop) return false;

    if (filters.ward !== "Any" && w.ward !== filters.ward) return false;
    if (filters.category !== "Any" && w.category !== filters.category) return false;

    const price = Number(w.priceYen ?? 0);

    if (filters.minPrice !== "") {
      const min = Number(filters.minPrice);
      if (!Number.isNaN(min) && price < min) return false;
    }
    if (filters.maxPrice !== "") {
      const max = Number(filters.maxPrice);
      if (!Number.isNaN(max) && price > max) return false;
    }

    if (q) {
      const hay = `${w.title} ${w.category} ${w.ward}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

export function deriveFilterOptions(workshops) {
  const wards = Array.from(new Set(workshops.map((w) => w.ward))).sort();
  const categories = Array.from(new Set(workshops.map((w) => w.category))).sort();
  return {
    wards: ["Any", ...wards],
    categories: ["Any", ...categories],
  };
}