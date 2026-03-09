// components/PictureCard.js
// Image card component for displaying workshop images in carousel
//
// Image Caching Strategy:
// - Uses expo-image library with cachePolicy="disk" for automatic caching
// - First load downloads image from Firebase Storage and caches to device
// - Subsequent loads served from local cache (<100ms vs 1-2 seconds)
// - Cache persists across app restarts
//
// Loading States:
// - Shows ActivityIndicator spinner while downloading
// - Spinner disappears on load complete (onLoadEnd)
// - Shows fallback emoji if download fails (error handling)
// - Improves perceived performance and signals to user that content is loading

import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { CameraIcon } from "react-native-heroicons/outline";

export default function PictureCard({ source }) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingFailed, setLoadingFailed] = useState(false);

  return (
    <View style={styles.card}>
      {isLoading && (
        <ActivityIndicator 
          size="small" 
          color="#8B7B6B" 
          style={StyleSheet.absoluteFill}
        />
      )}
      {!loadingFailed && (
        <Image 
          source={source} 
          style={styles.image}
          contentFit="cover"
          cachePolicy="disk"
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setLoadingFailed(true);
          }}
          accessibilityLabel="Workshop image"
          accessibilityRole="image"
        />
      )}
      {loadingFailed && <CameraIcon size={36} color="#8B7B6B" />}
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
