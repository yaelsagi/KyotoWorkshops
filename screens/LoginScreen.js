// Progress: this screen is implemented and integrated in the current app flow.
// Login screen for existing users
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
import { signInWithEmail } from '../services/authService';
import { COLORS } from '../styles/colors';

export default function LoginScreen({ navigation, route }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Information', 'Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      await signInWithEmail(email.trim(), password);
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
      Alert.alert('Sign In Failed', error.message);
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
          <Text style={styles.title}>ה÷¬יƒ½ Kyoto Workshops</Text>
          <Text style={styles.subtitle}>Welcome back</Text>
        </View>

        <View style={styles.form}>
          <FormInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            disabled={loading}
          />

          <PasswordInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            autoComplete="password"
            disabled={loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() =>
              navigation.navigate('SignUp', {
                redirectTo: route?.params?.redirectTo,
                redirectParams: route?.params?.redirectParams,
              })
            }
            disabled={loading}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
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

