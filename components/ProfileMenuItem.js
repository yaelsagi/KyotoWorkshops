// components/ProfileMenuItem.js
import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { COLORS } from "../styles/colors";

// Settings-style tappable row with a leading icon, a label, and a trailing arrow
// Pass danger={true} to render the red destructive variant
export default function ProfileMenuItem({ icon, label, onPress, danger = false }) {
  return (
    <Pressable
      style={[styles.item, danger && styles.itemDanger]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconWrapper}>{icon}</View>
      <Text style={[styles.label, danger && styles.labelDanger]}>{label}</Text>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  itemDanger: {
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.dangerBackground,
  },
  iconWrapper: {
    marginRight: 14,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primaryText,
  },
  labelDanger: {
    color: COLORS.danger,
  },
  arrow: {
    fontSize: 24,
    color: COLORS.tertiaryText,
  },
});
