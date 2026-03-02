// components/PictureCard.js
import React from "react";
import { View, Image, StyleSheet } from "react-native";

export default function PictureCard({ source }) {
  return (
    <View style={styles.card}>
      <Image 
        source={source} 
        style={styles.image}
        resizeMode="cover"
        accessibilityLabel="Workshop image"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    height: 140,
    marginRight: 12,
    backgroundColor: "#F5F1E8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
