// components/WorkshopMapMarker.js
import React from "react";
import { Marker } from "react-native-maps";

const WorkshopMapMarker = React.memo(function WorkshopMapMarker({
  workshop,
  saved,
  onSelect,
}) {
  const pinColor = saved
    ? "#C1121F"          // red when saved
    : workshop.isTop
    ? "#B08A2E"          // gold for top workshops
    : "#7A5C3D";         // default brown

  return (
    <Marker
      coordinate={{
        latitude: workshop.lat,
        longitude: workshop.lng,
      }}
      pinColor={pinColor}
      onPress={() => onSelect(workshop)}
      accessibilityLabel={`Workshop pin: ${workshop.title}`}
      accessibilityHint="Opens workshop preview"
    />
  );
});

export default WorkshopMapMarker;



// If You REALLY Want Bigger Saved Pins

// There is one stable way:

// Instead of animating a child View, use:
// <Marker
//   coordinate={{ ... }}
//   anchor={{ x: 0.5, y: 0.5 }}
// >
//   <Image
//     source={saved ? require("../assets/pin_saved.png") : require("../assets/pin_normal.png")}
//     style={{ width: saved ? 34 : 26, height: saved ? 34 : 26 }}
//   />
// </Marker>