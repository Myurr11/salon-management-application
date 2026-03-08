import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import bcrypt from 'bcryptjs';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, theme } from '../theme';
import * as supabaseService from '../services/supabaseService';

// ─── Design Tokens (Light / White mode — matches Dashboard redesign) ──────────
const D = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceWarm: '#FFFDF9',
  border: '#E8E3DB',
  borderFocus: '#C9A84C',
  gold: '#C9A84C',
  goldLight: '#E8C96A',
  goldMuted: '#C9A84C18',
  goldBorder: '#C9A84C44',
  text: '#1A1814',
  textSub: '#6B6560',
  textMuted: '#A09A8F',
  green: '#2D9A5F',
  greenMuted: '#2D9A5F12',
  red: '#D94F4F',
  redMuted: '#D94F4F12',
  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

const MIN_PASSWORD_LENGTH = 6;

// ─── Step indicator pill ──────────────────────────────────────────────────────
const StepBadge = ({ n, label, active }: { n: number; label: string; active: boolean }) => (
  <View style={[sb.step, active && sb.stepActive]}>
    <View style={[sb.stepCircle, active && sb.stepCircleActive]}>
      <Text style={[sb.stepNum, active && sb.stepNumActive]}>{n}</Text>
    </View>
    <Text style={[sb.stepLabel, active && sb.stepLabelActive]}>{label}</Text>
  </View>
);

const sb = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepActive: {},
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: D.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: D.gold },
  stepNum: { fontSize: 12, fontWeight: '700', color: D.textMuted },
  stepNumActive: { color: '#FFF' },
  stepLabel: { fontSize: 12, color: D.textMuted, fontWeight: '500' },
  stepLabelActive: { color: D.gold, fontWeight: '700' },
});

// ─── Labelled Input ───────────────────────────────────────────────────────────
const FieldInput: React.FC<{
  label: string;
  hint?: string;
  icon: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  secure?: boolean;
  autoCapitalize?: 'none' | 'sentences';
  autoCorrect?: boolean;
  editable?: boolean;
  note?: string;
}> = ({ label, hint, icon, value, onChange, placeholder, secure, autoCapitalize, autoCorrect, editable = true, note }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fi.group}>
      <View style={fi.labelRow}>
        <Text style={fi.label}>{label}</Text>
        {hint && <Text style={fi.hint}>{hint}</Text>}
      </View>
      <View style={[fi.box, focused && fi.boxFocused, !editable && fi.boxDisabled]}>
        <View style={[fi.iconBox, focused && fi.iconBoxFocused]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={focused ? D.gold : D.textMuted} />
        </View>
        <TextInput
          style={fi.input}
          placeholder={placeholder}
          placeholderTextColor={D.textMuted}
          value={value}
          onChangeText={onChange}
          secureTextEntry={secure}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          autoCorrect={autoCorrect ?? true}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {value.length > 0 && (
          <View style={[fi.checkBox, { backgroundColor: D.greenMuted }]}>
            <MaterialCommunityIcons name="check" size={14} color={D.green} />
          </View>
        )}
      </View>
      {note && (
        <View style={fi.noteRow}>
          <MaterialCommunityIcons name="information-outline" size={13} color={D.textMuted} />
          <Text style={fi.noteText}>{note}</Text>
        </View>
      )}
    </View>
  );
};

const fi = StyleSheet.create({
  group: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: D.text, letterSpacing: 0.2 },
  hint: { fontSize: 11, color: D.textMuted },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.surface,
    borderRadius: D.radius.lg,
    borderWidth: 1.5,
    borderColor: D.border,
    overflow: 'hidden',
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  boxFocused: { borderColor: D.gold, shadowColor: D.gold, shadowOpacity: 0.15 },
  boxDisabled: { opacity: 0.55 },
  iconBox: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: D.bg,
    borderRightWidth: 1,
    borderRightColor: D.border,
  },
  iconBoxFocused: { backgroundColor: D.goldMuted, borderRightColor: D.goldBorder },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: D.text,
    fontWeight: '500',
  },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  noteText: { fontSize: 12, color: D.textMuted },
});

// ─── Section Divider label ────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: string }) => (
  <View style={sl.row}>
    <View style={sl.dash} />
    <Text style={sl.text}>{children}</Text>
    <View style={sl.dashLong} />
  </View>
);

const sl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: 8 },
  dash: { width: 16, height: 2, backgroundColor: D.gold, borderRadius: 1 },
  dashLong: { flex: 1, height: 1, backgroundColor: D.border },
  text: { color: D.gold, fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const AdminAddStaffScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, refreshStaffMembers } = useAuth();
  const { branches, refreshData } = useData();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Derive a simple progress state for the step bar
  const step = !name.trim() ? 1 : !username.trim() || !password ? 2 : 3;

  const handleSubmit = async () => {
    const nameTrim = name.trim();
    const usernameTrim = username.trim().toLowerCase();
    if (!nameTrim) { Alert.alert('Required', 'Please enter staff name.'); return; }
    if (!usernameTrim) { Alert.alert('Required', 'Please enter Staff ID.'); return; }
    if (usernameTrim.length < 3) { Alert.alert('Invalid', 'Staff ID must be at least 3 characters.'); return; }
    if (!password) { Alert.alert('Required', 'Please enter a password.'); return; }
    if (password.length < MIN_PASSWORD_LENGTH) { Alert.alert('Invalid', `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    if (password !== confirmPassword) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }

    setSaving(true);
    try {
      const passwordHash = bcrypt.hashSync(password, 10);
      await supabaseService.createStaffMember({ name: nameTrim, username: usernameTrim, passwordHash, branchId: branchId ?? undefined });
      await refreshStaffMembers();
      await refreshData();
      Alert.alert('Done', `${nameTrim} added! They can log in with Staff ID: ${usernameTrim}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      if (e.code === '23505') Alert.alert('Duplicate', 'This Staff ID is already taken. Choose another.');
      else Alert.alert('Error', e.message || 'Failed to add staff.');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={{ color: D.red }}>Admin access required.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── Page Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={D.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerIconBox}>
            <MaterialCommunityIcons name="account-plus" size={22} color={D.gold} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Add New Staff</Text>
            <Text style={styles.headerSub}>Create staff login credentials</Text>
          </View>
        </View>
      </View>

      {/* ── Progress Steps ── */}
      <View style={styles.stepBar}>
        <StepBadge n={1} label="Identity" active={step >= 1} />
        <View style={styles.stepLine} />
        <StepBadge n={2} label="Access" active={step >= 2} />
        <View style={styles.stepLine} />
        <StepBadge n={3} label="Branch" active={step >= 3} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity Section ── */}
        <SectionLabel>STAFF IDENTITY</SectionLabel>

        <FieldInput
          label="Full Name"
          icon="account-outline"
          value={name}
          onChange={setName}
          placeholder="e.g. Priya Sharma"
          editable={!saving}
        />

        <FieldInput
          label="Staff ID"
          hint="Used to log in"
          icon="card-account-details-outline"
          value={username}
          onChange={t => setUsername(t.toLowerCase().replace(/\s/g, '_'))}
          placeholder="e.g. priya_sharma or priya001"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!saving}
          note="No spaces allowed — underscores are added automatically"
        />

        {/* ── Access Section ── */}
        <SectionLabel>LOGIN ACCESS</SectionLabel>

        <FieldInput
          label="Password"
          hint={`Min ${MIN_PASSWORD_LENGTH} characters`}
          icon="lock-outline"
          value={password}
          onChange={setPassword}
          placeholder="Create a strong password"
          secure
          editable={!saving}
        />

        <FieldInput
          label="Confirm Password"
          icon="lock-check-outline"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Re-enter password"
          secure
          editable={!saving}
        />

        {/* Password match indicator */}
        {confirmPassword.length > 0 && (
          <View style={[styles.matchBanner, password === confirmPassword ? styles.matchOk : styles.matchErr]}>
            <MaterialCommunityIcons
              name={password === confirmPassword ? 'check-circle' : 'close-circle'}
              size={16}
              color={password === confirmPassword ? D.green : D.red}
            />
            <Text style={[styles.matchText, { color: password === confirmPassword ? D.green : D.red }]}>
              {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
            </Text>
          </View>
        )}

        {/* ── Branch Section ── */}
        <SectionLabel>BRANCH ASSIGNMENT</SectionLabel>

        <View style={styles.branchGrid}>
          {/* Unassigned chip */}
          <TouchableOpacity
            style={[styles.branchChip, branchId === null && styles.branchChipActive]}
            onPress={() => setBranchId(null)}
            activeOpacity={0.75}
          >
            <View style={[styles.branchChipIcon, branchId === null && styles.branchChipIconActive]}>
              <MaterialCommunityIcons
                name={branchId === null ? 'check' : 'circle-outline'}
                size={16}
                color={branchId === null ? '#FFF' : D.textMuted}
              />
            </View>
            <Text style={[styles.branchChipText, branchId === null && styles.branchChipTextActive]}>
              Unassigned
            </Text>
          </TouchableOpacity>

          {branches.map(b => (
            <TouchableOpacity
              key={b.id}
              style={[styles.branchChip, branchId === b.id && styles.branchChipActive]}
              onPress={() => setBranchId(b.id)}
              activeOpacity={0.75}
            >
              <View style={[styles.branchChipIcon, branchId === b.id && styles.branchChipIconActive]}>
                <MaterialCommunityIcons
                  name={branchId === b.id ? 'check' : 'office-building-outline'}
                  size={16}
                  color={branchId === b.id ? '#FFF' : D.textMuted}
                />
              </View>
              <Text style={[styles.branchChipText, branchId === b.id && styles.branchChipTextActive]}>
                {b.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Submit ── */}
        <View style={styles.submitWrap}>
          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <View style={styles.submitIconBox}>
                  <MaterialCommunityIcons name="account-plus" size={20} color={D.gold} />
                </View>
                <Text style={styles.submitBtnText}>Add Staff Member</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="rgba(255,255,255,0.6)" />
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.submitNote}>Staff can log in immediately after being added</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: D.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: D.radius.md,
    backgroundColor: D.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: D.border,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: D.radius.md,
    backgroundColor: D.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: D.goldBorder,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },

  // Step bar
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: D.surfaceWarm,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  stepLine: { flex: 1, height: 1, backgroundColor: D.border, marginHorizontal: 6 },

  // Scroll
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  // Password match banner
  matchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: D.radius.md,
    marginTop: -12,
    marginBottom: 20,
    borderWidth: 1,
  },
  matchOk: { backgroundColor: D.greenMuted, borderColor: '#2D9A5F33' },
  matchErr: { backgroundColor: D.redMuted, borderColor: '#D94F4F33' },
  matchText: { fontSize: 13, fontWeight: '600' },

  // Branch grid
  branchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: D.surface,
    borderRadius: D.radius.lg,
    borderWidth: 1.5,
    borderColor: D.border,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
  branchChipActive: {
    backgroundColor: D.goldMuted,
    borderColor: D.gold,
  },
  branchChipIcon: {
    width: 28,
    height: 28,
    borderRadius: D.radius.sm,
    backgroundColor: D.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: D.border,
  },
  branchChipIconActive: {
    backgroundColor: D.gold,
    borderColor: D.gold,
  },
  branchChipText: { fontSize: 14, color: D.textSub, fontWeight: '600' },
  branchChipTextActive: { color: D.text },

  // Submit
  submitWrap: { gap: 12 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: D.text,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: D.radius.xl,
    gap: 10,
    shadowColor: D.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitIconBox: {
    width: 32,
    height: 32,
    borderRadius: D.radius.sm,
    backgroundColor: D.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: D.goldBorder,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    letterSpacing: -0.2,
  },
  submitNote: {
    textAlign: 'center',
    fontSize: 12,
    color: D.textMuted,
  },
});