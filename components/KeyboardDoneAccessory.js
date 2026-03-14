import React from "react";
import { View, Text, Pressable, Platform, Keyboard, InputAccessoryView, StyleSheet } from "react-native";
import { COLORS } from "../styles/colors";

export default function KeyboardDoneAccessory({ nativeID }) {
  // Show native keyboard accessory on iOS only
  // Android uses keyboard avoiding and dismiss interactions from screen wrappers
  if (Platform.OS !== "ios") {
    return null;
  }

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.keyboardAccessory}>
        <Pressable
          onPress={Keyboard.dismiss}
          style={styles.keyboardDoneButton}
          accessibilityRole="button"
          accessibilityLabel="Dismiss keyboard"
        >
          <Text style={styles.keyboardDoneText}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  keyboardAccessory: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: "flex-end",
  },
  keyboardDoneButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primaryText,
  },
  keyboardDoneText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
