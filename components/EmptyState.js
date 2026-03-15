// components/EmptyState.js
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { COLORS } from "../styles/colors";

// Reusable centered empty / guest state with icon, title, message, and optional CTA button
export default function EmptyState({ icon, title, message, buttonLabel, onButtonPress }) {
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {buttonLabel && onButtonPress ? (
        <Pressable
          style={styles.button}
          onPress={onButtonPress}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
        >
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: COLORS.white,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primaryText,
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: COLORS.secondaryText,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: COLORS.primaryText,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
});

