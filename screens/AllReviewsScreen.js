// screens/AllReviewsScreen.js
import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform, FlatList } from "react-native";

export default function AllReviewsScreen({ route }) {
  const reviews = route?.params?.reviews || [];

  const renderReview = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewName}>{item.name}</Text>
        <Text style={styles.reviewRating}>{"⭐".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</Text>
      </View>
      <Text style={styles.reviewText}>{item.text}</Text>
    </View>
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
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E6E2DA",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  count: {
    fontSize: 14,
    color: "#666",
  },
  list: {
    padding: 16,
  },
  reviewCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: "#FBFAF7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E2DA",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  reviewRating: {
    fontSize: 12,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
  },
});
