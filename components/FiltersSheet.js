// components/FiltersSheet.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Modal, View, Text, StyleSheet, Pressable, Switch, Platform, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ALL_OPTION } from "../constants/kyotoWards";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { applyFilters } from "../utils/filters";

export default function FiltersSheet({
  visible,
  onClose,
  initialFilters,
  onApply,
  onClear,
  wards,
  categories,
  minAvailablePrice,
  maxAvailablePrice,
  workshops,
  favourites,
  searchText,
}) {
  const MIN_PRICE_GAP = 1000;

  // Draft filters: user edits these inside the sheet.
  const [draft, setDraft] = useState(initialFilters);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [sliderLength, setSliderLength] = useState(280);

  // When the sheet opens, reset draft to the currently applied filters.
  useEffect(() => {
    if (visible) setDraft(initialFilters);
  }, [visible, initialFilters]);

  const set = useCallback((patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateBottomFade = useCallback((offsetY = 0, nextContentHeight = contentHeight, nextViewHeight = scrollViewHeight) => {
    if (nextContentHeight <= nextViewHeight + 4) {
      setShowBottomFade(false);
      return;
    }

    const reachedBottom = offsetY >= nextContentHeight - nextViewHeight - 8;
    setShowBottomFade(!reachedBottom);
  }, [contentHeight, scrollViewHeight]);

  const sliderMin = Number.isFinite(minAvailablePrice) ? minAvailablePrice : 0;
  const sliderMax = Number.isFinite(maxAvailablePrice) ? maxAvailablePrice : 20000;

  const currentMin = useMemo(() => {
    if (draft.minPrice === null || draft.minPrice === undefined) return sliderMin;
    return Math.max(sliderMin, Math.min(Number(draft.minPrice), sliderMax));
  }, [draft.minPrice, sliderMin, sliderMax]);

  const currentMax = useMemo(() => {
    if (draft.maxPrice === null || draft.maxPrice === undefined) return sliderMax;
    return Math.max(sliderMin, Math.min(Number(draft.maxPrice), sliderMax));
  }, [draft.maxPrice, sliderMin, sliderMax]);

  const safeMax = useMemo(() => {
    if (currentMax - currentMin < MIN_PRICE_GAP) {
      return Math.min(sliderMax, currentMin + MIN_PRICE_GAP);
    }
    return currentMax;
  }, [currentMin, currentMax, sliderMax]);

  const handlePriceRangeChange = useCallback((values) => {
    if (!Array.isArray(values) || values.length !== 2) return;
    const nextMin = Number(values[0]);
    const nextMax = Number(values[1]);

    if (Number.isNaN(nextMin) || Number.isNaN(nextMax)) return;

    if (nextMax - nextMin < MIN_PRICE_GAP) {
      return;
    }

    set({ minPrice: nextMin, maxPrice: nextMax });
  }, [set]);

  const wardsList = useMemo(() => (Array.isArray(wards) ? wards : [ALL_OPTION]), [wards]);
  const categoryList = useMemo(() => Array.from(new Set(categories || [])), [categories]);

  const allCategoriesSelected = !Array.isArray(draft.selectedCategories) || draft.selectedCategories.length === 0;

  const toggleCategory = useCallback((category) => {
    setDraft((prev) => {
      const selected = Array.isArray(prev.selectedCategories) ? prev.selectedCategories : [];
      if (selected.includes(category)) {
        return {
          ...prev,
          selectedCategories: selected.filter((item) => item !== category),
        };
      }
      return { ...prev, selectedCategories: [...selected, category] };
    });
  }, []);

  // Calculate matching workshop count based on draft filters
  const matchingCount = useMemo(() => {
    if (!Array.isArray(workshops) || workshops.length === 0) return 0;
    const favouritesSet = favourites instanceof Set ? favourites : new Set();
    const filtered = applyFilters({
      workshops,
      favouritesSet,
      filters: draft,
      query: searchText || "",
    });
    return filtered.length;
  }, [workshops, favourites, draft, searchText]);

  const applyButtonText = matchingCount === 0 
    ? "No matching workshops" 
    : `Show ${matchingCount} workshop${matchingCount === 1 ? "" : "s"}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Tap outside to close */}
        <Pressable
          style={styles.backdropTap}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          accessibilityHint="Closes the filters panel"
        />

        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Filters</Text>

            <Pressable
              onPress={onClose}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel="Close filters"
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.scrollArea}>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              onLayout={(event) => {
                const nextHeight = event.nativeEvent.layout.height;
                setScrollViewHeight(nextHeight);
                updateBottomFade(0, contentHeight, nextHeight);
              }}
              onContentSizeChange={(_, nextHeight) => {
                setContentHeight(nextHeight);
                updateBottomFade(0, nextHeight, scrollViewHeight);
              }}
              onScroll={(event) => {
                updateBottomFade(event.nativeEvent.contentOffset.y);
              }}
              scrollEventThrottle={16}
            >
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Only favourites</Text>
                <Text style={styles.help}>Show saved workshops only</Text>
              </View>
              <Switch
                value={draft.onlyFavourites}
                onValueChange={(v) => set({ onlyFavourites: v })}
                accessibilityLabel="Only favourites toggle"
                accessibilityHint="When enabled, shows only saved workshops"
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Only top workshops</Text>
                <Text style={styles.help}>Show highlighted workshops only</Text>
              </View>
              <Switch
                value={draft.onlyTop}
                onValueChange={(v) => set({ onlyTop: v })}
                accessibilityLabel="Only top workshops toggle"
                accessibilityHint="When enabled, shows only top workshops"
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Translator available</Text>
                <Text style={styles.help}>Show workshops with translator support</Text>
              </View>
              <Switch
                value={draft.translatorAvailable}
                onValueChange={(v) => set({ translatorAvailable: v })}
                accessibilityLabel="Translator available toggle"
                accessibilityHint="When enabled, shows workshops that provide translator support"
              />
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>Kyoto ward / area</Text>
              <View style={styles.chipsWrap}>
                {wardsList.map((ward) => {
                  const selected = draft.ward === ward;
                  return (
                    <Pressable
                      key={ward}
                      onPress={() => set({ ward })}
                      style={[styles.chip, selected && styles.chipSelected]}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter by ward ${ward}`}
                      accessibilityHint="Selects ward filter"
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{ward}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>Category / workshop type</Text>
              <View style={styles.chipsWrap}>
                <Pressable
                  onPress={() => set({ selectedCategories: [] })}
                  style={[styles.chip, allCategoriesSelected && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel="Show all categories"
                  accessibilityHint="Clears category filters"
                >
                  <Text style={[styles.chipText, allCategoriesSelected && styles.chipTextSelected]}>{ALL_OPTION}</Text>
                </Pressable>

                {categoryList.map((category) => {
                  const selected = Array.isArray(draft.selectedCategories)
                    ? draft.selectedCategories.includes(category)
                    : false;
                  return (
                    <Pressable
                      key={category}
                      onPress={() => toggleCategory(category)}
                      style={[styles.chip, selected && styles.chipSelected]}
                      accessibilityRole="button"
                      accessibilityLabel={`Toggle category ${category}`}
                      accessibilityHint="Adds or removes this category from filter"
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{category}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>Price range</Text>
              <Text style={styles.help}>¥{currentMin.toLocaleString()} - ¥{safeMax.toLocaleString()}</Text>

              <View
                style={styles.rangeSliderWrap}
                onLayout={(event) => {
                  const measured = Math.max(220, Math.floor(event.nativeEvent.layout.width - 12));
                  setSliderLength(measured);
                }}
              >
                <MultiSlider
                  values={[currentMin, safeMax]}
                  min={sliderMin}
                  max={sliderMax}
                  step={500}
                  sliderLength={sliderLength}
                  onValuesChange={handlePriceRangeChange}
                  selectedStyle={styles.multiSliderSelectedTrack}
                  unselectedStyle={styles.multiSliderUnselectedTrack}
                  markerStyle={styles.multiSliderMarker}
                  pressedMarkerStyle={styles.multiSliderMarkerPressed}
                  allowOverlap={false}
                  snapped
                />
              </View>
            </View>

            <View style={styles.scrollBottomSpacer} />
            </ScrollView>

            {showBottomFade && (
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.95)"]}
                style={styles.bottomFade}
              />
            )}
          </View>

          <View style={styles.footerActions}>
            <View style={styles.actionsRow}>
              <Pressable
                onPress={onClear}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear filters"
                accessibilityHint="Resets filters and closes the panel"
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>

              <Pressable
                onPress={() => onApply(draft)}
                style={styles.applyBtn}
                accessibilityRole="button"
                accessibilityLabel={applyButtonText}
                accessibilityHint="Applies filters and closes the panel"
              >
                <Text style={styles.applyText}>{applyButtonText}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
  backdropTap: { flex: 1 },

  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    height: "78%",
    minHeight: 420,
    maxHeight: "84%",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: { flex: 1, fontSize: 16, fontWeight: "800", color: "#1F1F1F" },
  close: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F1E8",
  },
  closeText: { fontSize: 16, color: "#1F1F1F" },

  scrollArea: {
    flex: 1,
    position: "relative",
  },

  content: { paddingHorizontal: 14, paddingBottom: 8 },

  block: { marginTop: 14 },

  label: { fontSize: 13, fontWeight: "700", color: "#1F1F1F" },
  help: { fontSize: 12, color: "#666", marginTop: 2 },

  switchRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FBFAF7",
    borderWidth: 1,
    borderColor: "#E6E2DA",
  },

  chipsWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D8D2C5",
    backgroundColor: "#FFFFFF",
  },
  chipSelected: {
    backgroundColor: "#1F1F1F",
    borderColor: "#1F1F1F",
  },
  chipText: {
    fontSize: 12,
    color: "#1F1F1F",
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },

  sliderHint: {
    marginTop: 6,
    fontSize: 11,
    color: "#666",
  },

  rangeSliderWrap: {
    marginTop: 12,
    paddingHorizontal: 6,
    minHeight: 40,
  },

  multiSliderSelectedTrack: {
    backgroundColor: "#1F1F1F",
    height: 4,
  },
  multiSliderUnselectedTrack: {
    backgroundColor: "#D8D2C5",
    height: 4,
  },
  multiSliderMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1F1F1F",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  multiSliderMarkerPressed: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1F1F1F",
  },

  sliderLabel: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },

  scrollBottomSpacer: {
    height: 8,
  },

  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 42,
  },

  footerActions: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 14 : 8,
    borderTopWidth: 1,
    borderTopColor: "#E6E2DA",
    backgroundColor: "#FFFFFF",
  },

  actionsRow: { flexDirection: "row", gap: 10 },
  clearBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  clearText: { fontWeight: "800", color: "#1F1F1F" },

  applyBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F1F1F",
  },
  applyText: { fontWeight: "800", color: "#FFFFFF" },
});