// screens/MapScreen.js
// Interactive map showing workshop locations in Kyoto with filtering and selection
//
// Image Prefetch Optimization:
// - When user taps a map marker, prefetchWorkshopImages() is called in onSelect handler
// - This starts downloading workshop images in background (non-blocking)
// - Image.prefetch() downloads images to expo-image's disk cache
// - When user navigates to WorkshopDetailsScreen, images already cached locally
// - Result: Images display instantly instead of 1-2 second download delay
//
// Technical Details:
// - prefetch runs asynchronously (Promise-based, no await blocking)
// - Multiple images fetched in parallel for performance
// - Cache persists across app restarts
// - Provides smooth UX: marker tap → instant image on details screen
//
// Data Loading:
// - Fetches workshops from Firebase on mount with AsyncStorage fallback
// - Favorites persisted in AsyncStorage (Set for fast lookups)
// - Search filtering done client-side on cached data
// - Filter modals control price, duration, difficulty display

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  Animated,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import MapView from "react-native-maps";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { HeartIcon, XMarkIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchWorkshops, prefetchWorkshopImages, fetchPlatformCategories } from "../services/workshopService";
import WorkshopMapMarker from "../components/WorkshopMapMarker";
import MapSearchBar from "../components/MapSearchBar";
import FiltersSheet from "../components/FiltersSheet";
import { ALL_OPTION } from "../constants/kyotoWards";
import { WORKSHOP_CATEGORIES } from "../constants/workshopCategories";
import { applyFilters, DEFAULT_FILTERS, deriveFilterOptions, normalizePriceRange } from "../utils/filters";
import { useFavourites } from "../context/FavouritesContext";

const KYOTO_REGION = {
  latitude: 35.0116,
  longitude: 135.7681,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Favourites from shared context (single source of truth)
  const { favourites, loadingFavourites, isFavourited, toggleFavourite } = useFavourites();

  // Workshop data fetched from Firebase (falls back to local JSON on error)
  const [workshops, setWorkshops] = useState([]);
  const [loadingWorkshops, setLoadingWorkshops] = useState(true);

  // Search bar text (updates live as user types)
  const [searchText, setSearchText] = useState("");

  // Used to prevent MapView's onPress from firing right after marker press.
  // On iOS, marker press can be followed by a map press event.
  const ignoreNextMapPressRef = useRef(false);

  // Selected workshop for bottom card preview.
  const [selected, setSelected] = useState(null);

  // Bottom card slide animation value: 140 = hidden, 0 = visible.
  const translateY = useRef(new Animated.Value(140)).current;
  const [cardVisible, setCardVisible] = useState(false);

  const [filtersVisible, setFiltersVisible] = useState(false);

  // These are the ONLY filters that affect the map.
  // They update ONLY when the user presses Apply.
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);

  // iOS MapView sometimes fails to redraw when markers are added back.
  // We bump this key ONLY on Apply to force a reliable redraw.
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

  // Platform category list (static defaults + admin-approved custom categories).
  // Initialised to static list so filters work immediately before the Firestore fetch completes.
  const [platformCategories, setPlatformCategories] = useState(WORKSHOP_CATEGORIES);

  // Fetch workshops from Firebase on mount
  useEffect(() => {
    const loadWorkshops = async () => {
      try {
        const data = await fetchWorkshops();
        setWorkshops(data);

        // Non-blocking optimization:
        // Start warming remote workshop images in background after list data arrives.
        // We do not await this, so map markers/card rendering stays responsive.
        Promise.allSettled(data.map((workshop) => prefetchWorkshopImages(workshop))).catch(() => { });
      } catch (error) {
        console.log("Failed to load workshops:", error.message);
        // Service is Firebase-only, so this indicates network/config issues.
      } finally {
        setLoadingWorkshops(false);
      }
    };
    loadWorkshops();
  }, []);

  // Fetch platform categories (includes admin-approved custom ones) separately.
  useEffect(() => {
    fetchPlatformCategories().then(setPlatformCategories).catch(() => { /* keep static defaults */ });
  }, []);

  const showCard = useCallback(() => {
    setCardVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const hideCard = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 140,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setCardVisible(false);
        setSelected(null);
      }
    });
  }, [translateY]);

  useEffect(() => {
    if (selected) showCard();
  }, [selected, showCard]);

  // Wrapper to add haptic feedback when toggling favourites
  const handleToggleFavourite = useCallback(async (workshopId) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // ignore safely
    }
    toggleFavourite(workshopId);
  }, [toggleFavourite]);

  // Pass platformCategories so admin-approved custom categories appear in the filter sheet.
  const filterOptions = useMemo(() => deriveFilterOptions(workshops, platformCategories), [workshops, platformCategories]);

  const handleApplyFilters = useCallback((draft) => {
    const normalizedRange = normalizePriceRange(draft.minPrice, draft.maxPrice);

    setAppliedFilters({
      ...DEFAULT_FILTERS,
      ...draft,
      ...normalizedRange,
      ward: draft.ward || ALL_OPTION,
      selectedCategories: Array.isArray(draft.selectedCategories) ? draft.selectedCategories : [],
    });

    // Force MapView redraw once (fixes iOS "markers only reappear after tap")
    setMapRefreshKey((k) => k + 1);

    setFiltersVisible(false);
  }, []);

  const handleClearFilters = useCallback(() => {
    setAppliedFilters(DEFAULT_FILTERS);
    setMapRefreshKey((k) => k + 1);
    setFiltersVisible(false);
  }, []);

  const removeAppliedFilter = useCallback((chip) => {
    setAppliedFilters((prev) => {
      const next = { ...prev };

      if (chip.type === "onlyFavourites") next.onlyFavourites = false;
      if (chip.type === "onlyTop") next.onlyTop = false;
      if (chip.type === "translatorAvailable") next.translatorAvailable = false;
      if (chip.type === "ward") next.ward = ALL_OPTION;
      if (chip.type === "category") {
        next.selectedCategories = (next.selectedCategories || []).filter((category) => category !== chip.value);
      }
      if (chip.type === "priceRange") {
        next.minPrice = null;
        next.maxPrice = null;
      }

      return next;
    });

    setMapRefreshKey((k) => k + 1);
  }, []);

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (appliedFilters.onlyFavourites) {
      chips.push({ key: "favourites", label: "Favourites", type: "onlyFavourites" });
    }

    if (appliedFilters.onlyTop) {
      chips.push({ key: "top", label: "Top workshops", type: "onlyTop" });
    }

    if (appliedFilters.translatorAvailable) {
      chips.push({ key: "translator", label: "Translator", type: "translatorAvailable" });
    }

    if (appliedFilters.ward && appliedFilters.ward !== ALL_OPTION) {
      chips.push({ key: `ward-${appliedFilters.ward}`, label: appliedFilters.ward, type: "ward" });
    }

    const categories = Array.isArray(appliedFilters.selectedCategories)
      ? appliedFilters.selectedCategories
      : [];
    categories.forEach((category) => {
      chips.push({ key: `cat-${category}`, label: category, type: "category", value: category });
    });

    if (appliedFilters.minPrice !== null || appliedFilters.maxPrice !== null) {
      const minLabel = appliedFilters.minPrice !== null ? `¥${Number(appliedFilters.minPrice).toLocaleString()}` : "Any";
      const maxLabel = appliedFilters.maxPrice !== null ? `¥${Number(appliedFilters.maxPrice).toLocaleString()}` : "Any";
      chips.push({
        key: "price-range",
        label: `${minLabel} - ${maxLabel}`,
        type: "priceRange",
      });
    }

    return chips;
  }, [appliedFilters]);

  // Convert context favourites array to Set for filter utility compatibility.
  const favouritesSet = useMemo(() => new Set(favourites), [favourites]);

  // Visible markers: searchText is live, appliedFilters only changes on Apply.
  const visibleWorkshops = useMemo(() => {
    return applyFilters({
      workshops,
      favouritesSet,
      filters: appliedFilters,
      query: searchText,
    });
  }, [workshops, searchText, appliedFilters, favouritesSet]);

  // Show loading indicator while data loads
  if (loadingWorkshops || loadingFavourites) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar overlay (absolute positioned above map) */}
      <MapSearchBar
        value={searchText}
        onChangeText={setSearchText}
        onPressFilters={() => {
          Keyboard.dismiss();
          setFiltersVisible(true);
        }}
      />

      {(activeFilterChips.length > 0) && (
        <View style={[styles.activeFiltersWrap, { top: insets.top + 72 }]} pointerEvents="box-none">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersRow}
            keyboardShouldPersistTaps="handled"
          >
            {activeFilterChips.map((chip) => (
              <View key={chip.key} style={styles.filterChip}>
                <Text style={styles.filterChipText} numberOfLines={1}>{chip.label}</Text>
                <Pressable
                  onPress={() => removeAppliedFilter(chip)}
                  style={styles.filterChipClose}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${chip.label} filter`}
                  accessibilityHint="Removes this filter and updates workshop results"
                >
                  <XMarkIcon size={12} color="#444" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filters sheet overlay (slides up from bottom) */}
      <FiltersSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        initialFilters={appliedFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        wards={filterOptions.wards}
        categories={filterOptions.categories}
        minAvailablePrice={filterOptions.minAvailablePrice}
        maxAvailablePrice={filterOptions.maxAvailablePrice}
        workshops={workshops}
        favourites={favouritesSet}
        searchText={searchText}
      />

      <MapView
        // Important: key changes only when Apply/Clear is pressed (not on every toggle)
        key={`map-${mapRefreshKey}`}
        style={StyleSheet.absoluteFillObject}
        initialRegion={KYOTO_REGION}
        onPress={() => {
          Keyboard.dismiss();

          if (ignoreNextMapPressRef.current) {
            ignoreNextMapPressRef.current = false;
            return;
          }

          if (cardVisible) hideCard();
        }}
      >
        {visibleWorkshops.map((w) => (
          <WorkshopMapMarker
            key={w.id}
            workshop={w}
            saved={isFavourited(w.id)}
            onSelect={(workshop) => {
              ignoreNextMapPressRef.current = true;
              Keyboard.dismiss();
              setSelected(workshop);
              // Prefetch workshop images when marker is tapped (optimization for report)
              prefetchWorkshopImages(workshop);
            }}
          />
        ))}
      </MapView>

      {selected && cardVisible && (
        <Animated.View style={[styles.card, { transform: [{ translateY }] }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {selected.title}
            </Text>

            <Pressable
              onPress={hideCard}
              accessibilityRole="button"
              accessibilityLabel="Close workshop preview"
              accessibilityHint="Closes the workshop preview card"
              style={styles.closeButton}
            >
              <XMarkIcon size={18} color="#1F1F1F" />
            </Pressable>
          </View>

          <Text style={styles.cardMeta}>
            {selected.category} · {selected.ward}
            {selected.isTop ? " · Top" : ""}
          </Text>

          <Text style={styles.cardPrice}>¥{selected.priceYen.toLocaleString()}</Text>

          <View style={styles.cardActionsRow}>
            <Pressable
              onPress={() => navigation.navigate("WorkshopDetails", { workshop: selected })}
              accessibilityRole="button"
              accessibilityLabel="Open workshop details"
              accessibilityHint="Opens the full workshop details screen"
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Details</Text>
            </Pressable>

            <Pressable
              onPress={() => handleToggleFavourite(selected.id)}
              accessibilityRole="button"
              accessibilityLabel={isFavourited(selected.id) ? "Remove from favourites" : "Save to favourites"}
              accessibilityHint="Toggles whether this workshop is saved"
              style={[styles.heartButton, isFavourited(selected.id) && styles.heartButtonActive]}
            >
              <HeartIcon size={20} color={isFavourited(selected.id) ? "#C1121F" : "#777"} />
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10, color: "#555" },

  activeFiltersWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 40,
    elevation: 40,
  },
  activeFiltersRow: {
    paddingRight: 8,
    gap: 8,
  },
  filterChip: {
    height: 34,
    maxWidth: 220,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },
  filterChipText: {
    color: "#1F1F1F",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 6,
    flexShrink: 1,
  },
  filterChipClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F5F1E8",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E2DA",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 6 },
    }),
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#1F1F1F" },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F1E8",
  },
  cardMeta: { marginTop: 6, fontSize: 13, color: "#555" },
  cardPrice: { marginTop: 8, fontSize: 15, fontWeight: "700", color: "#1F1F1F" },
  cardActionsRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#1F1F1F", alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F5F1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { fontWeight: "700", color: "#C1121F" },
  heartButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#F5F1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  heartButtonActive: {
    backgroundColor: "#FFE4E1",
  },
});
