import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, theme, shadows } from '../theme';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  border: '#E8E3DB',

  green: '#2D9A5F',
  greenLight: '#38B872',
  greenMuted: '#2D9A5F15',
  greenBorder: '#2D9A5F40',
  greenDeep: '#1E7A48',

  gold: '#C9A84C',
  goldMuted: '#C9A84C18',
  goldBorder: '#C9A84C44',

  text: '#1A1814',
  textSub: '#6B6560',
  textMuted: '#A09A8F',

  red: '#D94F4F',
  redMuted: '#D94F4F12',
  redBorder: '#D94F4F33',

  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

const { width: W, height: H } = Dimensions.get('window');

interface Props { navigation: any; }

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, loading: authLoading, loginError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Top illustration panel ── */}
        <View style={s.illustrationPanel}>
          {/* Decorative blobs */}
          <View style={s.blobTopRight} />
          <View style={s.blobBottomLeft} />

          {/* Brand mark */}
          <View style={s.brandRow}>
            <View style={s.brandIconBox}>
              <MaterialCommunityIcons name="content-cut" size={16} color={D.green} />
            </View>
            <Text style={s.brandName}>SalonOS</Text>
          </View>

          {/* Illustration */}
          <Image
            source={require('../../assets/salon-illustration.png')}
            style={s.illustration}
            resizeMode="contain"
          />

          {/* Headline overlay at bottom */}
          <View style={s.illustrationFooter}>
            <Text style={s.illustrationHeadline}>Your salon,{'\n'}beautifully managed.</Text>
            {/* Dot indicators */}
            <View style={s.dotsRow}>
              <View style={[s.dot, s.dotActive]} />
              <View style={s.dot} />
              <View style={s.dot} />
            </View>
          </View>
        </View>

        {/* ── Form panel ── */}
        <View style={s.formPanel}>
          {/* Title */}
          <View style={s.formHeader}>
            <Text style={s.formTitle}>Welcome back</Text>
            <Text style={s.formSubtitle}>Sign in to your account to continue</Text>
          </View>

          {/* Username */}
          <View style={[s.inputBox, usernameFocused && s.inputBoxFocused]}>
            <View style={[s.inputIconBox, usernameFocused && s.inputIconBoxFocused]}>
              <MaterialCommunityIcons name="account-outline" size={18} color={usernameFocused ? D.green : D.textMuted} />
            </View>
            <TextInput
              style={s.inputField}
              placeholder="Username"
              placeholderTextColor={D.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              onFocus={() => setUsernameFocused(true)}
              onBlur={() => setUsernameFocused(false)}
            />
            {username.length > 0 && (
              <View style={s.inputCheckBox}>
                <MaterialCommunityIcons name="check" size={13} color={D.green} />
              </View>
            )}
          </View>

          {/* Password */}
          <View style={[s.inputBox, passwordFocused && s.inputBoxFocused]}>
            <View style={[s.inputIconBox, passwordFocused && s.inputIconBoxFocused]}>
              <MaterialCommunityIcons name="lock-outline" size={18} color={passwordFocused ? D.green : D.textMuted} />
            </View>
            <TextInput
              style={s.inputField}
              placeholder="Password"
              placeholderTextColor={D.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              editable={!submitting}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <TouchableOpacity style={s.inputEye} onPress={() => setPasswordVisible(v => !v)}>
              <MaterialCommunityIcons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={D.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Error */}
          {loginError ? (
            <View style={s.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color={D.red} />
              <Text style={s.errorText}>{loginError}</Text>
            </View>
          ) : null}

          {/* Login button */}
          <TouchableOpacity
            style={[s.loginBtn, (submitting || !username || !password) && s.loginBtnDim]}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={s.loginBtnText}>Sign In</Text>
                <View style={s.loginBtnArrow}>
                  <MaterialCommunityIcons name="arrow-right" size={18} color={D.green} />
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Hint pills */}
          <View style={s.hintRow}>
            <View style={s.hintPill}>
              <MaterialCommunityIcons name="tablet" size={12} color={D.textMuted} />
              <Text style={s.hintText}>Shared tablet: <Text style={{ fontWeight: '700' }}>salon / salon123</Text></Text>
            </View>
            <View style={s.hintPill}>
              <MaterialCommunityIcons name="shield-account-outline" size={12} color={D.textMuted} />
              <Text style={s.hintText}>Admin: use your credentials</Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: D.surface },

  // Illustration panel
  illustrationPanel: {
    height: H * 0.44,
    backgroundColor: D.bg,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderColor: D.border,
  },
  blobTopRight: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: D.greenMuted,
  },
  blobBottomLeft: {
    position: 'absolute', bottom: -40, left: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#C9A84C18',
  },
  brandRow: {
    position: 'absolute', top: 18, left: 24,
    flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 2,
  },
  brandIconBox: {
    width: 32, height: 32, borderRadius: D.radius.sm,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.greenBorder,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  brandName: { fontSize: 16, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  illustration: {
    width: W * 1,
    height: H * 0.40,
    marginTop: 20,
  },
  illustrationFooter: {
    position: 'absolute', bottom: 22, left: 28,
  },
  illustrationHeadline: {
    fontSize: 20, fontWeight: '800', color: D.text,
    letterSpacing: -0.5, lineHeight: 26, marginBottom: 10,
  },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: D.border },
  dotActive: { width: 20, backgroundColor: D.green },

  // Form panel
  formPanel: {
    flex: 1, backgroundColor: D.surface,
    paddingHorizontal: 28, paddingTop: 28,
  },
  formHeader: { marginBottom: 22 },
  formTitle: { fontSize: 26, fontWeight: '800', color: D.text, letterSpacing: -0.5, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: D.textMuted, fontWeight: '500' },

  // Inputs
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.bg, borderRadius: D.radius.md,
    borderWidth: 1.5, borderColor: D.border,
    overflow: 'hidden', marginBottom: 12,
  },
  inputBoxFocused: { borderColor: D.green, backgroundColor: D.surface },
  inputIconBox: {
    width: 46, height: 50, alignItems: 'center', justifyContent: 'center',
    borderRightWidth: 1, borderRightColor: D.border,
    backgroundColor: D.bg,
  },
  inputIconBoxFocused: { backgroundColor: D.greenMuted, borderRightColor: D.greenBorder },
  inputField: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: D.text },
  inputCheckBox: { paddingHorizontal: 12 },
  inputEye: { paddingHorizontal: 12 },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.redMuted, borderRadius: D.radius.md,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: D.redBorder, marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 13, color: D.red, fontWeight: '500' },

  // Login button
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.green, borderRadius: D.radius.xl,
    paddingVertical: 16, marginBottom: 20, gap: 12,
    shadowColor: D.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 14, elevation: 8,
  },
  loginBtnDim: { opacity: 0.65, shadowOpacity: 0.1 },
  loginBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: 0.2 },
  loginBtnArrow: {
    width: 30, height: 30, borderRadius: D.radius.sm,
    backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center',
  },

  // Hints
  hintRow: { gap: 8 },
  hintPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: D.bg, borderRadius: D.radius.md,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: D.border,
  },
  hintText: { fontSize: 12, color: D.textMuted },
});