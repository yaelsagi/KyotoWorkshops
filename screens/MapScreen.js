// screens/MapScreen.js
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  Animated,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import MapView from "react-native-maps";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { fetchWorkshops, prefetchWorkshopImages } from "../services/workshopService";
import WorkshopMapMarker from "../components/WorkshopMapMarker";
import MapSearchBar from "../components/MapSearchBar";
import FiltersSheet from "../components/FiltersSheet";

const FAV_KEY = "kyoto_favourites";

const KYOTO_REGION = {
  latitude: 35.0116,
  longitude: 135.7681,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen({ navigation }) {
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

  // In-memory Set for fast lookups; persisted as an array in AsyncStorage.
  const [favourites, setFavourites] = useState(() => new Set());
  const [loadingFavourites, setLoadingFavourites] = useState(true);

  // Bottom card slide animation value: 140 = hidden, 0 = visible.
  const translateY = useRef(new Animated.Value(140)).current;
  const [cardVisible, setCardVisible] = useState(false);

  const [filtersVisible, setFiltersVisible] = useState(false);

  // These are the ONLY filters that affect the map.
  // They update ONLY when the user presses Apply.
  const [appliedFilters, setAppliedFilters] = useState({
    favouritesOnly: false,
    topOnly: false,
  });

  // iOS MapView sometimes fails to redraw when markers are added back.
  // We bump this key ONLY on Apply to force a reliable redraw.
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  // Load favourites on mount (data persistence requirement).
  useEffect(() => {
    const loadFavourites = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAV_KEY);
        if (stored) {
          const arr = JSON.parse(stored);
          if (Array.isArray(arr)) setFavourites(new Set(arr));
        }
      } catch (e) {
        console.log("Failed to load favourites", e);
      } finally {
        setLoadingFavourites(false);
      }
    };
    loadFavourites();
  }, []);

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

  // Persist favourites whenever they change (after initial load).
  useEffect(() => {
    if (loadingFavourites) return;
    AsyncStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favourites))).catch(() => { });
  }, [favourites, loadingFavourites]);

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

  const isFavourited = useCallback((id) => favourites.has(id), [favourites]);

  const toggleFavourite = useCallback(async (workshopId) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // ignore safely
    }

    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(workshopId)) next.delete(workshopId);
      else next.add(workshopId);
      return next;
    });
  }, []);

  const handleApplyFilters = useCallback((draft) => {
    setAppliedFilters(draft);

    // Force MapView redraw once (fixes iOS "markers only reappear after tap")
    setMapRefreshKey((k) => k + 1);

    setFiltersVisible(false);
  }, []);

  const handleClearFilters = useCallback(() => {
    const cleared = { favouritesOnly: false, topOnly: false };
    setAppliedFilters(cleared);
    setMapRefreshKey((k) => k + 1);
    setFiltersVisible(false);
  }, []);

  // Visible markers: searchText is live, appliedFilters only changes on Apply.
  const visibleWorkshops = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return workshops.filter((w) => {
      // Search filter (live)
      if (q) {
        const haystack = `${w.title} ${w.category} ${w.ward}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // Applied filters (Apply button)
      if (appliedFilters.favouritesOnly && !favourites.has(w.id)) return false;
      if (appliedFilters.topOnly && !w.isTop) return false;

      return true;
    });
  }, [workshops, searchText, appliedFilters, favourites]);

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

      {/* Filters sheet overlay (slides up from bottom) */}
      <FiltersSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        initialFilters={appliedFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
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
              <Text style={styles.closeButtonText}>✕</Text>
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
              onPress={() => toggleFavourite(selected.id)}
              accessibilityRole="button"
              accessibilityLabel={isFavourited(selected.id) ? "Remove from favourites" : "Save to favourites"}
              accessibilityHint="Toggles whether this workshop is saved"
              style={[styles.heartButton, isFavourited(selected.id) && styles.heartButtonActive]}
            >
              <Text style={styles.heartIcon}>
                {isFavourited(selected.id) ? "❤️" : "🤍"}
              </Text>
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
  closeButtonText: { fontSize: 16, color: "#1F1F1F" },
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
  heartIcon: {
    fontSize: 24,
  },
});