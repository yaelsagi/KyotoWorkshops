import React, { useMemo, useRef, useState, useEffect } from "react";
import { StyleSheet, View, Text, Pressable, Platform, Animated } from "react-native";
import MapView, { Marker } from "react-native-maps";
import workshopsData from "../data/workshops.json";

const KYOTO_REGION = {
  latitude: 35.0116,
  longitude: 135.7681,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen() {
  const workshops = useMemo(() => workshopsData, []);
  const ignoreNextMapPressRef = useRef(false);

  const [selected, setSelected] = useState(null);
  const [cardVisible, setCardVisible] = useState(false);

  // Animated translateY for card: start hidden (down)
  const translateY = useRef(new Animated.Value(140)).current;

  const showCard = () => {
    setCardVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const hideCard = () => {
    // slide down first, then remove from state
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
  };

  // If selected becomes non-null (marker tapped), show the card
  useEffect(() => {
    if (selected) showCard();
  }, [selected]);

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={KYOTO_REGION}
        onPress={() => {
          if (ignoreNextMapPressRef.current) {
            ignoreNextMapPressRef.current = false;
            return;
          }
          if (cardVisible) hideCard();
        }}
      >
        {workshops.map((w) => (
          <Marker
            key={w.id}
            coordinate={{ latitude: w.lat, longitude: w.lng }}
            onPress={() => {
              ignoreNextMapPressRef.current = true;
              setSelected(w);
            }}
            accessibilityLabel={`Workshop pin: ${w.title}`}
            accessibilityHint="Opens workshop preview"
          >
            <Pin isTop={w.isTop} />
          </Marker>
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
              onPress={() => alert(`Open details for: ${selected.title}`)}
              accessibilityRole="button"
              accessibilityLabel="Open workshop details"
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Details</Text>
            </Pressable>

            <Pressable
              onPress={() => alert("Saved to favourites (next step)")}
              accessibilityRole="button"
              accessibilityLabel="Save to favourites"
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>♡ Save</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function Pin({ isTop }) {
  return (
    <View
      style={[
        styles.pin,
        isTop ? styles.pinTop : styles.pinNormal,
        isTop ? styles.pinTopSize : styles.pinNormalSize,
      ]}
      accessible={false}
    >
      <View style={[styles.pinDot, isTop ? styles.pinDotTop : styles.pinDotNormal]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Pin styles
  pin: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  pinNormal: {
    backgroundColor: "#F5F1E8",
    borderColor: "#7A5C3D",
  },
  pinTop: {
    backgroundColor: "#F2E6C9",
    borderColor: "#B08A2E",
  },
  pinNormalSize: { width: 22, height: 22 },
  pinTopSize: { width: 30, height: 30 },
  pinDot: { borderRadius: 999 },
  pinDotNormal: { width: 8, height: 8, backgroundColor: "#7A5C3D" },
  pinDotTop: { width: 10, height: 10, backgroundColor: "#B08A2E" },

  // Bottom card
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
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 6 },
    }),
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
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
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#1F1F1F",
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F5F1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { color: "#1F1F1F", fontWeight: "700" },
});
