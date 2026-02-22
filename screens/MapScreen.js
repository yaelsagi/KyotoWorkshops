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
import workshopsData from "../data/workshops.json";
import WorkshopMapMarker from "../components/WorkshopMapMarker";

// ///--- ADDED ---///
import MapSearchBar from "../components/MapSearchBar";
// ///--- END ADDED ---///

const FAV_KEY = "kyoto_favourites";

const KYOTO_REGION = {
  latitude: 35.0116,
  longitude: 135.7681,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen({ navigation }) {
  const workshops = useMemo(() => workshopsData, []);

  // Used to prevent the map's onPress from immediately closing the card
  // right after a marker press (marker press often triggers map press too).
  const ignoreNextMapPressRef = useRef(false);

  const [selected, setSelected] = useState(null);

  // Search input state (we’ll use it soon to filter markers).
  const [searchText, setSearchText] = useState("");

  // In-memory Set for fast lookups; persisted as an array in AsyncStorage.
  const [favourites, setFavourites] = useState(() => new Set());
  const [loadingFavourites, setLoadingFavourites] = useState(true);

  // Bottom card animation value:
  // 140 = hidden below the screen, 0 = visible.
  const translateY = useRef(new Animated.Value(140)).current;

  // Track whether the card is on-screen (so we don't hide it unnecessarily).
  const [cardVisible, setCardVisible] = useState(false);

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

  // Persist favourites whenever they change (after initial load).
  useEffect(() => {
    if (loadingFavourites) return;
    AsyncStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favourites))).catch(() => {});
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
    } catch (e) {}

    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(workshopId)) next.delete(workshopId);
      else next.add(workshopId);
      return next;
    });
  }, []);

  if (loadingFavourites) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={KYOTO_REGION}
        onPress={() => {
          // Tap outside search bar -> dismiss keyboard.
          Keyboard.dismiss();

          if (ignoreNextMapPressRef.current) {
            ignoreNextMapPressRef.current = false;
            return;
          }

          if (cardVisible) hideCard();
        }}
      >
        {workshops.map((w) => (
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

      // ///--- FIXED ---///
      // Render the search bar AFTER the MapView so it appears on top.
      // Also give the wrapper a zIndex/elevation (in styles below).
      // ///--- END FIXED ---///
      <View style={styles.searchOverlay} pointerEvents="box-none">
        <MapSearchBar
          value={searchText}
          onChangeText={setSearchText}
          onPressFilters={() => {
            Keyboard.dismiss();
            alert("Filters UI (next step).");
          }}
        />
      </View>

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
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                {isFavourited(selected.id) ? "♥ Saved" : "♥ Save"}
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

  // ///--- ADDED ---///
  // Ensures the search bar sits above the MapView on both iOS and Android.
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
  },
  // ///--- END ADDED ---///

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
});