// Progress: this component is implemented and currently stable in the app UI flow.
import React from "react";
import PropTypes from "prop-types";
import {
  View,
  Text,
  Pressable,
  Platform,
  Keyboard,
  InputAccessoryView,
  StyleSheet,
} from "react-native";
import { COLORS } from "../styles/colors";

const IS_IOS = Platform.OS === "ios";

function KeyboardDoneBar({ nativeID }) {
  // Only render this bar on iOS
  // Android uses keyboard avoiding and dismiss interactions from screen wrappers
  if (!IS_IOS) {
    return null;
  }

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.keyboardAccessory}>
        <Pressable
          onPress={Keyboard.dismiss}
          style={styles.keyboardDoneButton}
          accessibilityRole="button"
          accessibilityLabel="Done editing"
        >
          <Text style={styles.keyboardDoneText}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

KeyboardDoneBar.propTypes = {
  nativeID: PropTypes.string.isRequired,
};

export default KeyboardDoneBar;

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

