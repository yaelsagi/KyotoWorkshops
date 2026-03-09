// components/FiltersModal.js
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Switch,
  ScrollView,
  Platform,
} from "react-native";
import { XMarkIcon } from "react-native-heroicons/outline";

function SelectList({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.selectButton}
        accessibilityRole="button"
        accessibilityLabel={`${label} selector`}
        accessibilityHint="Opens list of options"
      >
        <Text style={styles.selectButtonText}>{value}</Text>
        <Text style={styles.chev}>{open ? "▲" : "▼"}</Text>
      </Pressable>

      {open && (
        <View style={styles.selectList}>
          <ScrollView style={{ maxHeight: 180 }}>
            {options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={[styles.selectItem, opt === value && styles.selectItemSelected]}
                accessibilityRole="button"
                accessibilityLabel={`Set ${label} to ${opt}`}
              >
                <Text style={styles.selectItemText}>{opt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function FiltersModal({
  visible,
  onClose,
  onApply,
  onClear,
  initialFilters,
  wards,
  categories,
}) {
  const [draft, setDraft] = useState(initialFilters);

  // reset draft when opened
  React.useEffect(() => {
    if (visible) setDraft(initialFilters);
  }, [visible, initialFilters]);

  const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropTap}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          accessibilityHint="Closes the filters panel"
        />

        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Search & Filters</Text>

            <Pressable
              onPress={onClose}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <XMarkIcon size={18} color="#333" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.block}>
              <Text style={styles.label}>Search</Text>
              <TextInput
                value={draft.query}
                onChangeText={(t) => set({ query: t })}
                placeholder="Workshop name, category, ward…"
                placeholderTextColor="#777"
                style={styles.input}
                accessibilityLabel="Search text"
                accessibilityHint="Filters workshops by matching text"
                returnKeyType="search"
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Only favourites</Text>
                <Text style={styles.help}>Show saved workshops only</Text>
              </View>
              <Switch
                value={draft.onlyFavourites}
                onValueChange={(v) => set({ onlyFavourites: v })}
                accessibilityLabel="Only favourites toggle"
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Only top workshops</Text>
                <Text style={styles.help}>Show highly rated / highlighted workshops</Text>
              </View>
              <Switch
                value={draft.onlyTop}
                onValueChange={(v) => set({ onlyTop: v })}
                accessibilityLabel="Only top workshops toggle"
              />
            </View>

            <SelectList
              label="Kyoto ward / area"
              value={draft.ward}
              options={wards}
              onChange={(ward) => set({ ward })}
            />

            <SelectList
              label="Category"
              value={draft.category}
              options={categories}
              onChange={(category) => set({ category })}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Min price (¥)</Text>
                <TextInput
                  value={draft.minPrice}
                  onChangeText={(t) => set({ minPrice: t.replace(/[^\d]/g, "") })}
                  keyboardType="number-pad"
                  placeholder="e.g. 3000"
                  placeholderTextColor="#777"
                  style={styles.input}
                  accessibilityLabel="Minimum price"
                />
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Max price (¥)</Text>
                <TextInput
                  value={draft.maxPrice}
                  onChangeText={(t) => set({ maxPrice: t.replace(/[^\d]/g, "") })}
                  keyboardType="number-pad"
                  placeholder="e.g. 12000"
                  placeholderTextColor="#777"
                  style={styles.input}
                  accessibilityLabel="Maximum price"
                />
              </View>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                onPress={onClear}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear filters"
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>

              <Pressable
                onPress={() => onApply(draft)}
                style={styles.applyBtn}
                accessibilityRole="button"
                accessibilityLabel="Apply filters"
              >
                <Text style={styles.applyText}>Apply</Text>
              </Pressable>
            </View>
          </ScrollView>
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
    maxHeight: "78%",
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

  content: { paddingHorizontal: 14, paddingBottom: 18 },

  block: { marginTop: 12 },
  label: { fontSize: 13, fontWeight: "700", color: "#1F1F1F", marginBottom: 6 },
  help: { fontSize: 12, color: "#666" },

  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    color: "#1F1F1F",
  },

  switchRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FBFAF7",
    borderWidth: 1,
    borderColor: "#E6E2DA",
  },

  row: { marginTop: 12, flexDirection: "row", alignItems: "flex-start" },

  selectButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  selectButtonText: { flex: 1, color: "#1F1F1F", fontWeight: "600" },
  chev: { color: "#444", marginLeft: 10 },

  selectList: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  selectItem: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  selectItemSelected: { backgroundColor: "#F5F1E8" },
  selectItemText: { color: "#1F1F1F" },

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