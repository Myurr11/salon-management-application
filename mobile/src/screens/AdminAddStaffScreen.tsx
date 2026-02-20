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

const MIN_PASSWORD_LENGTH = 6;

export const AdminAddStaffScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, refreshStaffMembers } = useAuth();
  const { branches, refreshData } = useData();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const nameTrim = name.trim();
    const usernameTrim = username.trim().toLowerCase();
    if (!nameTrim) {
      Alert.alert('Required', 'Please enter staff name.');
      return;
    }
    if (!usernameTrim) {
      Alert.alert('Required', 'Please enter Staff ID (username).');
      return;
    }
    if (usernameTrim.length < 3) {
      Alert.alert('Invalid', 'Staff ID must be at least 3 characters.');
      return;
    }
    if (!password) {
      Alert.alert('Required', 'Please enter a password.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Invalid', `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Password and Confirm password do not match.');
      return;
    }

    setSaving(true);
    try {
      const passwordHash = bcrypt.hashSync(password, 10);
      await supabaseService.createStaffMember({
        name: nameTrim,
        username: usernameTrim,
        passwordHash,
        branchId: branchId ?? undefined,
      });
      await refreshStaffMembers();
      await refreshData();
      Alert.alert('Done', `${nameTrim} has been added. They can log in with Staff ID: ${usernameTrim}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setName('');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setBranchId(null);
    } catch (e: any) {
      if (e.code === '23505') {
        Alert.alert('Duplicate', 'This Staff ID is already in use. Please choose another.');
      } else {
        Alert.alert('Error', e.message || 'Failed to add staff.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Admin access required.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="account-plus" size={28} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Add New Staff</Text>
          <Text style={styles.headerSubtitle}>Create staff login credentials</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="account-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter staff name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              editable={!saving}
            />
          </View>
        </View>

        {/* Username Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Staff ID (Username)</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="card-account-details-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. john_smith or john001"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, '_'))}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />
          </View>
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password (min {MIN_PASSWORD_LENGTH} characters)</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Create password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!saving}
            />
          </View>
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock-check-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!saving}
            />
          </View>
        </View>

        {/* Branch Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Branch Assignment (Optional)</Text>
          <View style={styles.branchRow}>
            <TouchableOpacity
              style={[styles.chip, branchId === null && styles.chipActive]}
              onPress={() => setBranchId(null)}
            >
              <MaterialCommunityIcons 
                name={branchId === null ? "check-circle" : "circle-outline"} 
                size={14} 
                color={branchId === null ? colors.textInverse : colors.textSecondary} 
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.chipText, branchId === null && styles.chipTextActive]}>
                Unassigned
              </Text>
            </TouchableOpacity>
            {branches.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.chip, branchId === b.id && styles.chipActive]}
                onPress={() => setBranchId(b.id)}
              >
                <MaterialCommunityIcons 
                  name={branchId === b.id ? "check-circle" : "office-building-outline"} 
                  size={14} 
                  color={branchId === b.id ? colors.textInverse : colors.textSecondary} 
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.chipText, branchId === b.id && styles.chipTextActive]}>
                  {b.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="account-plus" size={20} color={colors.textInverse} />
              <Text style={styles.submitBtnText}>Add Staff Member</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.error, fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 14, color: colors.textSecondary },
  scroll: { padding: theme.spacing.lg, paddingBottom: 40 },
  inputGroup: { marginBottom: theme.spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: { marginLeft: theme.spacing.md },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  branchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.textSecondary },
  chipTextActive: { color: colors.textInverse, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: theme.radius.lg,
    gap: 8,
    marginTop: theme.spacing.md,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 16 },
});
