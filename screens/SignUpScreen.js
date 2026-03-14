// Sign up screen for new users
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import FormInput from '../components/FormInput';
import PasswordInput from '../components/PasswordInput';
import { signUpWithEmail } from '../services/authService';
import { getPasswordValidationError, PASSWORD_REQUIREMENTS_TEXT } from '../utils/passwordValidation';
import { COLORS } from '../styles/colors';

export default function SignUpScreen({ navigation, route }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    // Validate that all required fields are filled in
    if (!displayName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      Alert.alert('Invalid Password', passwordError);
      return;
    }

    setLoading(true);

    try {
      // Create a new user account with display name (required)
      await signUpWithEmail(
        email.trim(), 
        password, 
        displayName.trim()
      );
      const redirectTo = route?.params?.redirectTo;
      const redirectParams = route?.params?.redirectParams;

      if (redirectTo) {
        navigation.replace(redirectTo, redirectParams || {});
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Tabs');
      }
    } catch (error) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
        <View style={styles.header}>
          <Text style={styles.title}>京都 Kyoto Workshops</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <View style={styles.form}>
          <FormInput
            placeholder="Display Name *"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoComplete="name"
            disabled={loading}
          />

          <FormInput
            placeholder="Email *"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            disabled={loading}
          />

          <PasswordInput
            placeholder="Password *"
            value={password}
            onChangeText={setPassword}
            autoComplete="password-new"
            disabled={loading}
          />
          <Text style={styles.helperText}>{PASSWORD_REQUIREMENTS_TEXT}</Text>

          <PasswordInput
            placeholder="Confirm Password *"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoComplete="password-new"
            disabled={loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.secondaryText,
  },
  form: {
    width: '100%',
  },
  helperText: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginTop: -2,
    marginBottom: 16,
    lineHeight: 18,
  },
  button: {
    backgroundColor: COLORS.primaryText,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: COLORS.tertiaryText,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  linkTextBold: {
    color: COLORS.primaryText,
    fontWeight: '600',
  },
});
