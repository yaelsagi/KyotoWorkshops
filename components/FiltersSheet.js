import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Modal, View, Text, StyleSheet, Pressable, Switch, Platform, ScrollView } from "react-native";
import { XMarkIcon } from "react-native-heroicons/outline";
import { LinearGradient } from "expo-linear-gradient";
import { ALL_OPTION } from "../constants/kyotoWards";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { applyFilters } from "../utils/filters";
import { COLORS } from "../styles/colors";

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
  const selectedWards = useMemo(() => (
    Array.isArray(draft.selectedWards) ? draft.selectedWards : []
  ), [draft.selectedWards]);
  const allWardsSelected = selectedWards.length === 0;

  const allCategoriesSelected = !Array.isArray(draft.selectedCategories) || draft.selectedCategories.length === 0;

  const toggleWard = useCallback((ward) => {
    setDraft((prev) => {
      const selected = Array.isArray(prev.selectedWards) ? prev.selectedWards : [];
      if (selected.includes(ward)) {
        return {
          ...prev,
          selectedWards: selected.filter((item) => item !== ward),
        };
      }
      return { ...prev, selectedWards: [...selected, ward] };
    });
  }, []);

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
              <XMarkIcon size={18} color={COLORS.primaryText} />
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
              <Text style={styles.help}>Select one or more wards</Text>
              <View style={styles.chipsWrap}>
                <Pressable
                  onPress={() => set({ selectedWards: [] })}
                  style={[styles.chip, allWardsSelected && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel="Show all wards"
                  accessibilityHint="Clears ward filters"
                >
                  <Text style={[styles.chipText, allWardsSelected && styles.chipTextSelected]}>{ALL_OPTION}</Text>
                </Pressable>

                {wardsList.map((ward) => {
                  if (ward === ALL_OPTION) {
                    return null;
                  }

                  const selected = selectedWards.includes(ward);
                  return (
                    <Pressable
                      key={ward}
                      onPress={() => toggleWard(ward)}
                      style={[styles.chip, selected && styles.chipSelected]}
                      accessibilityRole="button"
                      accessibilityLabel={`Toggle ward ${ward}`}
                      accessibilityHint="Adds or removes this ward from filter"
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

//styles:
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
  backdropTap: { flex: 1 },

  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  title: { flex: 1, fontSize: 16, fontWeight: "800", color: COLORS.primaryText },
  close: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.imagePlaceholderBackground,
  },

  scrollArea: {
    flex: 1,
    position: "relative",
  },

  content: { paddingHorizontal: 14, paddingBottom: 8 },

  block: { marginTop: 14 },

  label: { fontSize: 13, fontWeight: "700", color: COLORS.primaryText },
  help: { fontSize: 12, color: COLORS.secondaryText, marginTop: 2 },

  switchRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderColor: COLORS.strongBorder,
    backgroundColor: COLORS.white,
  },
  chipSelected: {
    backgroundColor: COLORS.primaryText,
    borderColor: COLORS.primaryText,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.primaryText,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: COLORS.white,
  },

  sliderHint: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.secondaryText,
  },

  rangeSliderWrap: {
    marginTop: 12,
    paddingHorizontal: 6,
    minHeight: 40,
  },

  multiSliderSelectedTrack: {
    backgroundColor: COLORS.primaryText,
    height: 4,
  },
  multiSliderUnselectedTrack: {
    backgroundColor: COLORS.strongBorder,
    height: 4,
  },
  multiSliderMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primaryText,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  multiSliderMarkerPressed: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryText,
  },

  sliderLabel: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primaryText,
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
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },

  actionsRow: { flexDirection: "row", gap: 10 },
  clearBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  clearText: { fontWeight: "800", color: COLORS.primaryText },

  applyBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryText,
  },
  applyText: { fontWeight: "800", color: COLORS.white },
});
