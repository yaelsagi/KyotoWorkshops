// Progress: this screen is implemented and integrated in the current app flow.
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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { deleteUserPhotoFolder } from '../services/storageService';
import { deleteUserAccountWithPassword } from '../services/authService';

export default function DeleteAccountScreen() {
  const { currentUser } = useUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Submit account deletion
  const handleDeleteAccount = async () => {
    // Require current password
    if (!currentPassword) {
      Alert.alert('Missing Information', 'Please enter your current password.');
      return;
    }

    // Require explicit DELETE confirmation
    if (confirmText !== 'DELETE') {
      Alert.alert('Confirmation Required', 'Please type DELETE to confirm account deletion.');
      return;
    }

    setSubmitting(true);

    try {
      if (!currentUser?.uid) {
        throw new Error('User ID not found');
      }

      // Remove profile photos before account deletion
      try {
        await deleteUserPhotoFolder(currentUser.uid);
      } catch (error) {
        console.warn('Could not delete user photos:', error);
      }

      // Re-authenticate and delete account
      await deleteUserAccountWithPassword(currentUser.uid, currentPassword);
      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
    } catch (error) {
      Alert.alert('Delete Failed', error.message || 'Could not delete account. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
            <Text style={styles.title}>Delete Account</Text>
            <Text style={styles.subtitle}>This action is permanent and cannot be undone</Text>
          </View>

          {/* Security form */}
          <View>
            <Text style={styles.warningText}>
              To protect your account, confirm your current password and type DELETE.
            </Text>

            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputField}
                placeholder="Enter current password"
                placeholderTextColor="#999"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                editable={!submitting}
                accessibilityLabel="Current password"
                accessibilityHint="Enter your current password"
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide current password' : 'Show current password'}
                accessibilityHint="Toggles current password visibility"
              >
                <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Type DELETE to Confirm</Text>
            <TextInput
              style={styles.input}
              placeholder="DELETE"
              placeholderTextColor="#999"
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              editable={!submitting}
              accessibilityLabel="Delete confirmation"
              accessibilityHint="Type DELETE to confirm account deletion"
            />

            <Pressable
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={() => {
                // Confirm permanent deletion intent
                Alert.alert(
                  'Delete Account',
                  'Are you sure you want to permanently delete your account?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: handleDeleteAccount },
                  ]
                );
              }}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Delete account"
              accessibilityHint="Permanently deletes your account"
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Delete Account Permanently</Text>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#C1121F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  warningText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 18,
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
  input: {
    backgroundColor: '#FBFAF7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E6E2DA',
    color: '#1F1F1F',
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#C1121F',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
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

