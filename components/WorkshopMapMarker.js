// components/WorkshopMapMarker.js
import React from "react";
import { Marker } from "react-native-maps";
import { Platform } from "react-native";
import { COLORS } from "../styles/colors";

const WorkshopMapMarker = React.memo(function WorkshopMapMarker({
  workshop,
  saved,
  onSelect,
}) {
  // Set pin color by save and top state
  const pinColor = saved
    ? COLORS.favourite
    : workshop.isTop
    ? COLORS.topWorkshop
    : COLORS.defaultMapPin;

  return (
    <Marker
      coordinate={{
        latitude: workshop.lat,
        longitude: workshop.lng,
      }}
      pinColor={pinColor}
      tracksViewChanges={Platform.OS === "ios"}
      onPress={() => onSelect(workshop)}
      accessibilityLabel={`Workshop pin: ${workshop.title}`}
      accessibilityHint="Opens workshop preview"
    />
  );
});

export default WorkshopMapMarker;
