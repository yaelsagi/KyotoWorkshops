import React from "react";
import { View, Text, StyleSheet } from "react-native";

const toneMap = {
  learner: { bg: "#E8F0FE", text: "#1A4DBE" },
  host: { bg: "#EAF7ED", text: "#1F7A3E" },
  translator: { bg: "#FFF3E8", text: "#9A4E00" },
};

export default function ModeBadge({ mode = "learner", label = "Learner" }) {
  const tones = toneMap[mode] || toneMap.learner;

  return (
    <View style={[styles.badge, { backgroundColor: tones.bg }]}> 
      <Text style={[styles.text, { color: tones.text }]} numberOfLines={1}>
        {label} mode
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
  },
});