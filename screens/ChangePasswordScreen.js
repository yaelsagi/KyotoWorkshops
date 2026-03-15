// Progress: this screen is implemented and integrated in the current app flow.
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PasswordInput from '../components/PasswordInput';
import { changeCurrentUserPassword } from '../services/authService';
import { getPasswordRuleChecks, getPasswordValidationError, PASSWORD_REQUIREMENTS_TEXT } from '../utils/passwordValidation';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          {/* Screen header */}
          <View style={styles.header}>
            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>Update your password securely</Text>
          </View>

          {/* Password form */}
          <View style={styles.form}>
            <Text style={styles.label}>Current Password</Text>
            <PasswordInput
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              autoComplete="password"
              disabled={submitting}
              accessibilityLabel="Current password"
              accessibilityHint="Enter your current password"
              style={styles.passwordInputContainer}
              inputStyle={styles.passwordInputText}
            />
            {currentPasswordError ? <Text style={styles.errorText}>{currentPasswordError}</Text> : null}

            <Text style={styles.label}>New Password</Text>
            <PasswordInput
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              autoComplete="password-new"
              disabled={submitting}
              accessibilityLabel="New password"
              accessibilityHint="Enter your new password"
              style={styles.passwordInputContainer}
              inputStyle={styles.passwordInputText}
            />
            <Text style={styles.helperText}>{PASSWORD_REQUIREMENTS_TEXT}</Text>
            <View style={styles.ruleList}>
              <Text style={[styles.ruleItem, passwordRuleChecks.hasMinimumLength && styles.ruleItemPassed]}>
                ג€¢ At least 8 characters
              </Text>
              <Text style={[styles.ruleItem, passwordRuleChecks.hasLetter && styles.ruleItemPassed]}>
                ג€¢ Contains a letter
              </Text>
              <Text style={[styles.ruleItem, passwordRuleChecks.hasNumber && styles.ruleItemPassed]}>
                ג€¢ Contains a number
              </Text>
            </View>
            {newPasswordError ? <Text style={styles.errorText}>{newPasswordError}</Text> : null}
            {samePasswordError ? <Text style={styles.errorText}>{samePasswordError}</Text> : null}

            <Text style={styles.label}>Confirm New Password</Text>
            <PasswordInput
              placeholder="Confirm new password"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              autoComplete="password-new"
              disabled={submitting}
              accessibilityLabel="Confirm new password"
              accessibilityHint="Confirm your new password"
              style={styles.passwordInputContainer}
              inputStyle={styles.passwordInputText}
            />
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
      </TouchableWithoutFeedback>
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
  // Style overrides passed to PasswordInput to match this screen's theme
  passwordInputContainer: {
    backgroundColor: '#FBFAF7',
    borderRadius: 12,
    borderColor: '#E6E2DA',
    minHeight: 52,
    marginBottom: 12,
  },
  passwordInputText: {
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F1F1F',
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
