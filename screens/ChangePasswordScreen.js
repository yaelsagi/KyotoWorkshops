import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { changeCurrentUserPassword } from '../services/authService';
import { getPasswordRuleChecks, getPasswordValidationError, PASSWORD_REQUIREMENTS_TEXT } from '../utils/passwordValidation';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Submit password change
  const handleSubmit = async () => {
    setHasSubmitted(true);

    if (!currentPassword) {
      Alert.alert('Missing Information', 'Please enter your current password.');
      return;
    }

    const passwordError = getPasswordValidationError(newPassword);
    if (passwordError) {
      Alert.alert('Invalid Password', passwordError);
      return;
    }

    if (confirmNewPassword !== newPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      Alert.alert('Invalid Password', 'New password must be different from your current password.');
      return;
    }

    setSubmitting(true);

    try {
      await changeCurrentUserPassword(currentPassword, newPassword);
      Alert.alert('Password Updated', 'Your password has been changed successfully.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Change Password Failed', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Check new password rules
  const passwordRuleChecks = getPasswordRuleChecks(newPassword);

  // Build inline field errors
  const currentPasswordError = hasSubmitted && !currentPassword
    ? 'Please enter your current password.'
    : '';

  const newPasswordError = hasSubmitted
    ? getPasswordValidationError(newPassword)
    : '';

  const confirmPasswordError = hasSubmitted && confirmNewPassword !== newPassword
    ? 'Passwords do not match.'
    : '';

  const samePasswordError = hasSubmitted && newPassword && currentPassword && newPassword === currentPassword
    ? 'New password must be different from your current password.'
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Screen header */}
          <View style={styles.header}>
            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>Update your password securely</Text>
          </View>

          {/* Password form */}
          <View style={styles.form}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputField}
                placeholder="Enter current password"
                placeholderTextColor="#999"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                autoComplete="password"
                editable={!submitting}
                accessibilityLabel="Current password"
                accessibilityHint="Enter your current password"
              />
              <Pressable
                onPress={() => setShowCurrentPassword((prev) => !prev)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                accessibilityHint="Toggles current password visibility"
              >
                <Text style={styles.toggleText}>{showCurrentPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            {currentPasswordError ? <Text style={styles.errorText}>{currentPasswordError}</Text> : null}

            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputField}
                placeholder="Enter new password"
                placeholderTextColor="#999"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoComplete="password-new"
                editable={!submitting}
                accessibilityLabel="New password"
                accessibilityHint="Enter your new password"
              />
              <Pressable
                onPress={() => setShowNewPassword((prev) => !prev)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
                accessibilityHint="Toggles new password visibility"
              >
                <Text style={styles.toggleText}>{showNewPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            <Text style={styles.helperText}>{PASSWORD_REQUIREMENTS_TEXT}</Text>
            <View style={styles.ruleList}>
              <Text style={[styles.ruleItem, passwordRuleChecks.hasMinimumLength && styles.ruleItemPassed]}>
                • At least 8 characters
              </Text>
              <Text style={[styles.ruleItem, passwordRuleChecks.hasLetter && styles.ruleItemPassed]}>
                • Contains a letter
              </Text>
              <Text style={[styles.ruleItem, passwordRuleChecks.hasNumber && styles.ruleItemPassed]}>
                • Contains a number
              </Text>
            </View>
            {newPasswordError ? <Text style={styles.errorText}>{newPasswordError}</Text> : null}
            {samePasswordError ? <Text style={styles.errorText}>{samePasswordError}</Text> : null}

            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputField}
                placeholder="Confirm new password"
                placeholderTextColor="#999"
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry={!showConfirmNewPassword}
                autoCapitalize="none"
                autoComplete="password-new"
                editable={!submitting}
                accessibilityLabel="Confirm new password"
                accessibilityHint="Confirm your new password"
              />
              <Pressable
                onPress={() => setShowConfirmNewPassword((prev) => !prev)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel={showConfirmNewPassword ? 'Hide confirm new password' : 'Show confirm new password'}
                accessibilityHint="Toggles confirm password visibility"
              >
                <Text style={styles.toggleText}>{showConfirmNewPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

            <Pressable
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Update password"
              accessibilityHint="Updates your account password"
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Update Password</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1F1F',
    marginBottom: 8,
  },
  inputRow: {
    backgroundColor: '#FBFAF7',
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 12,
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#E6E2DA',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputField: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F1F1F',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1F1F',
    paddingLeft: 12,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginTop: -2,
    marginBottom: 8,
    lineHeight: 18,
  },
  ruleList: {
    marginBottom: 10,
  },
  ruleItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  ruleItemPassed: {
    color: '#0D7A3E',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    color: '#C1121F',
    marginTop: -2,
    marginBottom: 12,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});