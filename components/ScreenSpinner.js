// Progress: this component is implemented and currently stable in the app UI flow.
// Full-screen loading spinner for data-fetching states
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function ScreenSpinner({ color = '#1F1F1F', style }) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

