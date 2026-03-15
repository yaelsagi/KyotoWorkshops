// Progress: this component is implemented and currently stable in the app UI flow.
import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { COLORS } from "../styles/colors";

export default function TopWorkshopTag({ label = "Top Workshop", style }) {
  return (
    <View style={[styles.tag, style]}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tagText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primaryText,
    letterSpacing: 0.3,
  },
});

