// screens/WorkshopDetailsScreen.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function WorkshopDetailsScreen({ route }) {
  const workshop = route?.params?.workshop;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workshop Details</Text>
      <Text>{workshop ? workshop.title : "No workshop passed yet."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
});