import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, theme, shadows } from '../theme';

interface Props {
  navigation: any;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, loading: authLoading, loginError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      await login(username, password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <View style={[styles.logoCircle, shadows.md]}>
              <Text style={styles.logoIcon}>✂</Text>
            </View>
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>Sign in to continue to Salon Manager</Text>
          </View>

          <View style={[styles.card, shadows.md]}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!submitting}
            />
            {loginError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.loginButton, submitting && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Admin: use your admin credentials</Text>
            <Text style={styles.footerText}>Staff: use the username & password provided to you</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentLavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.2,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xxl,
    padding: theme.spacing.xl + 4,
    marginBottom: theme.spacing.xxl,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: theme.spacing.md,
  },
  errorBox: {
    backgroundColor: colors.errorMuted,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: theme.radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  loginButtonDisabled: {
    opacity: 0.8,
  },
  loginButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
});
