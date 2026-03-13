// components/ReviewCard.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { StarIcon } from "react-native-heroicons/outline";
import { COLORS } from "../styles/colors";

// Review card used in horizontal scroll (WorkshopDetails) and full list (AllReviews)
// Pass cardStyle to override width/margin for vertical list layouts
// Pass maxLines to control text truncation (defaults to 4; pass 0 or undefined for no limit)
export default function ReviewCard({ name, rating, text, cardStyle, maxLines = 4 }) {
  return (
    <View style={[styles.card, cardStyle]}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.ratingRow}>
          {Array.from({ length: rating }).map((_, index) => (
            <StarIcon key={`rating-star-${index}`} size={12} color={COLORS.rating} />
          ))}
        </View>
      </View>
      <Text style={styles.text} numberOfLines={maxLines || undefined}>
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
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.primaryText,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.secondaryText,
  },
});
