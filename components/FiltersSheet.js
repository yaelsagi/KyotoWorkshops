// components/FiltersSheet.js
import React, { useEffect, useState, useCallback } from "react";
import { Modal, View, Text, StyleSheet, Pressable, Switch, Platform } from "react-native";

export default function FiltersSheet({
  visible,
  onClose,
  initialFilters,
  onApply,
  onClear,
}) {
  // Draft filters: user edits these inside the sheet.
  const [draft, setDraft] = useState(initialFilters);

  // When the sheet opens, reset draft to the currently applied filters.
  useEffect(() => {
    if (visible) setDraft(initialFilters);
  }, [visible, initialFilters]);

  const set = useCallback((patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

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

          <View style={styles.content}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Only favourites</Text>
                <Text style={styles.help}>Show saved workshops only</Text>
              </View>
              <Switch
                value={draft.favouritesOnly}
                onValueChange={(v) => set({ favouritesOnly: v })}
                accessibilityLabel="Only favourites toggle"
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Only top workshops</Text>
                <Text style={styles.help}>Show highlighted workshops only</Text>
              </View>
              <Switch
                value={draft.topOnly}
                onValueChange={(v) => set({ topOnly: v })}
                accessibilityLabel="Only top workshops toggle"
              />
            </View>

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
                accessibilityLabel="Apply filters"
                accessibilityHint="Applies filters and closes the panel"
              >
                <Text style={styles.applyText}>Apply</Text>
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
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    maxHeight: "70%",
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

  content: { paddingHorizontal: 14, paddingBottom: 18 },

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

  actionsRow: { marginTop: 18, flexDirection: "row", gap: 10 },
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