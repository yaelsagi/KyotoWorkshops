// screens/AllReviewsScreen.js
import React from "react";
import { View, Text, StyleSheet, Platform, FlatList } from "react-native";
import ReviewCard from "../components/ReviewCard";
import { COLORS } from "../styles/colors";

export default function AllReviewsScreen({ route }) {
  const reviews = route?.params?.reviews || [];

  // Render full-width card for vertical list (override horizontal-scroll defaults)
  const renderReview = ({ item }) => (
    <ReviewCard
      name={item.name}
      rating={item.rating}
      text={item.text}
      cardStyle={styles.reviewCardOverride}
      maxLines={0}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reviews</Text>
        <Text style={styles.count}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</Text>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={renderReview}
        contentContainerStyle={styles.list}
        scrollEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  count: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  list: {
    padding: 16,
  },
  // Override ReviewCard defaults for vertical full-width list layout
  reviewCardOverride: {
    width: undefined,
    marginRight: 0,
    marginBottom: 12,
  },
});
