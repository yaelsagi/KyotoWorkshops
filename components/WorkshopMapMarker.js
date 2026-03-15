// Progress: this component is implemented and currently stable in the app UI flow.
// components/WorkshopMapMarker.js
import React from "react";
import { Marker } from "react-native-maps";
import { View, StyleSheet } from "react-native";
import { HeartIcon, MapIcon } from "react-native-heroicons/outline";
import { StarIcon } from "react-native-heroicons/solid";
import { COLORS } from "../styles/colors";

const WorkshopMapMarker = React.memo(function WorkshopMapMarker({
  workshop,
  saved,
  selected,
  onSelect,
}) {
  // Use icon color by favourite and top state
  const iconColor = saved
    ? COLORS.favourite
    : workshop.isTop
    ? COLORS.topWorkshop
    : COLORS.defaultMapPin;

  // Enlarge selected marker icon for clear focus
  const iconSize = selected ? 34 : 28;

  // Match icon shape to workshop state
  const MarkerIcon = saved ? HeartIcon : workshop.isTop ? StarIcon : MapIcon;

  return (
    <Marker
      coordinate={{
        latitude: workshop.lat,
        longitude: workshop.lng,
      }}
      tracksViewChanges={false}
      onPress={() => onSelect(workshop)}
      accessibilityLabel={`Workshop pin: ${workshop.title}`}
      accessibilityHint="Opens workshop preview"
    >
      <View style={[styles.markerWrap, selected && styles.markerWrapSelected]}>
        <MarkerIcon size={iconSize} color={iconColor} />
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  markerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  markerWrapSelected: {
    transform: [{ scale: 1.08 }],
  },
});

export default WorkshopMapMarker;

