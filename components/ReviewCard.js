// components/ReviewCard.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ReviewCard({ name, rating, text }) {
  const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.rating}>{stars}</Text>
      </View>
      <Text style={styles.text} numberOfLines={4}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 12,
    backgroundColor: "#FBFAF7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E2DA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  rating: {
    fontSize: 11,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    color: "#555",
  },
});
