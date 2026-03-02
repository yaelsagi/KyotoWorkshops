// screens/AllPicturesScreen.js
import React from "react";
import { View, Text, StyleSheet, Platform, FlatList, Image } from "react-native";

export default function AllPicturesScreen({ route }) {
  const images = route?.params?.images || [];

  const renderPicture = ({ item }) => (
    <View style={styles.pictureCard}>
      {item ? (
        <Image 
          source={item} 
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel="Workshop image"
        />
      ) : (
        <Text style={styles.emoji}>📸</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workshop Photos</Text>
        <Text style={styles.count}>{images.length} photo{images.length !== 1 ? "s" : ""}</Text>
      </View>

      <FlatList
        data={images}
        keyExtractor={(_, index) => `workshop-image-${index}`}
        renderItem={renderPicture}
        contentContainerStyle={styles.grid}
        numColumns={2}
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
  grid: {
    padding: 12,
  },
  pictureCard: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 12,
    aspectRatio: 1,
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
  emoji: {
    fontSize: 56,
  },
});
