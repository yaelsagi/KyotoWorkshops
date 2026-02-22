// components/MapSearchBar.js
import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from "react-native";

export default function MapSearchBar({
  value,
  onChangeText,
  onPressFilters,
  placeholder = "Search workshops (title, category, ward)…",
}) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.bar}>
        <Text style={styles.icon} accessibilityElementsHidden>
          🔍
        </Text>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#777"
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Search workshops"
          accessibilityHint="Type to filter workshops by title, category, or ward"
        />

        {value.length > 0 && (
          <Pressable
            onPress={() => onChangeText("")}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        )}

        <Pressable
          onPress={onPressFilters}
          style={styles.filtersButton}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          accessibilityHint="Opens filter options such as favourites, top workshops, ward, and price range"
        >
          <Text style={styles.filtersText}>Filters</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    top: Platform.OS === "ios" ? 60 : 18, // simple safe-ish top spacing
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E2DA",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 4 },
    }),
  },
  icon: { marginRight: 8, fontSize: 16 },
  input: { flex: 1, fontSize: 14, color: "#1F1F1F", paddingVertical: 0 },
  clearButton: { marginLeft: 6, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  clearText: { fontSize: 14, color: "#444" },
  filtersButton: {
    marginLeft: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F5F1E8",
  },
  filtersText: { fontSize: 12, fontWeight: "700", color: "#1F1F1F" },
});