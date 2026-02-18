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
import bcrypt from 'bcryptjs';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add new staff</Text>
        <Text style={styles.hint}>Set the Staff ID and password they will use to log in.</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor="#64748b"
          value={name}
          onChangeText={setName}
          editable={!saving}
        />

        <Text style={styles.label}>Staff ID (username for login)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. john_smith or john001"
          placeholderTextColor="#64748b"
          value={username}
          onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, '_'))}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!saving}
        />

        <Text style={styles.label}>Password (min {MIN_PASSWORD_LENGTH} characters)</Text>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!saving}
        />

        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          placeholder="Re-enter password"
          placeholderTextColor="#64748b"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!saving}
        />

        <Text style={styles.label}>Branch (optional)</Text>
        <View style={styles.branchRow}>
          <TouchableOpacity
            style={[styles.chip, branchId === null && styles.chipActive]}
            onPress={() => setBranchId(null)}
          >
            <Text style={[styles.chipText, branchId === null && styles.chipTextActive]}>
              None
            </Text>
          </TouchableOpacity>
          {branches.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={[styles.chip, branchId === b.id && styles.chipActive]}
              onPress={() => setBranchId(b.id)}
            >
              <Text style={[styles.chipText, branchId === b.id && styles.chipTextActive]}>
                {b.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#0f172a" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Add staff</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ef4444', fontSize: 16 },
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#f8fafc', marginBottom: 6 },
  hint: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#e2e8f0', marginBottom: 8 },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f8fafc',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  branchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  chipText: { fontSize: 14, color: '#94a3b8' },
  chipTextActive: { color: '#0f172a', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
});
