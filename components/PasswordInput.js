// Progress: this component is implemented and currently stable in the app UI flow.
// Reusable password input with show/hide eye icon toggle
import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { EyeIcon, EyeSlashIcon } from 'react-native-heroicons/outline';

export default function PasswordInput({
  value,
  onChangeText,
  placeholder = 'Password',
  disabled = false,
  autoComplete = 'password',
  accessibilityLabel,
  accessibilityHint,
  // Optional style overrides for callers with different themes
  style,
  inputStyle,
}) {
  const [show, setShow] = useState(false);
  const label = accessibilityLabel ?? 'password';

  return (
    <View style={[styles.inputRow, style]}>
      <TextInput
        style={[styles.inputField, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoComplete={autoComplete}
        editable={!disabled}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      />
      {/* Toggle password visibility */}
      <Pressable
        onPress={() => setShow((prev) => !prev)}
        disabled={disabled}
        style={styles.eyeToggle}
        accessibilityRole="button"
        accessibilityLabel={show ? `Hide ${label} text` : `Show ${label} text`}
      >
        {show
          ? <EyeIcon size={20} color="#999" />
          : <EyeSlashIcon size={20} color="#999" />
        }
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingLeft: 16,
    paddingRight: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#2c3e50',
  },
  eyeToggle: {
    paddingLeft: 8,
    paddingVertical: 8,
  },
});

