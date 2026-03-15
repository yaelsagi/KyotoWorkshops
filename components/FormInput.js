// Progress: this component is implemented and currently stable in the app UI flow.
// Reusable plain text input for auth forms
import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

export default function FormInput({ style, disabled, ...props }) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor="#999"
      editable={!disabled}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    color: '#2c3e50',
  },
});

