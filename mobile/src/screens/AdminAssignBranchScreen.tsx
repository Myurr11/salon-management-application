import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import bcrypt from 'bcryptjs';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, theme } from '../theme';
import * as supabaseService from '../services/supabaseService';
import type { Branch, StaffMember } from '../types';

interface StaffWithBranch extends StaffMember {
  selectedBranchId: string | null;
  newPassword: string;
}

export const AdminAssignBranchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { branches, refreshData } = useData();
  const [staffList, setStaffList] = useState<StaffWithBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const members = await supabaseService.getStaffMembers();
        setStaffList(
          members.map((m) => ({
            ...m,
            selectedBranchId: m.branchId ?? null,
            newPassword: '',
          })),
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateBranch = (staffId: string, branchId: string | null) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, selectedBranchId: branchId } : s)),
    );
  };

  const setPasswordField = (staffId: string, value: string) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, newPassword: value } : s)),
    );
  };

  const saveStaff = async (staff: StaffWithBranch) => {
    if (!user || user.role !== 'admin') return;
    setSavingId(staff.id);
    try {
      await supabaseService.updateStaffBranch(staff.id, staff.selectedBranchId);
      if (staff.newPassword.trim().length >= 6) {
        const hash = bcrypt.hashSync(staff.newPassword.trim(), 10);
        await supabaseService.updateStaffPassword(staff.id, hash);
        setStaffList((prev) =>
          prev.map((s) => (s.id === staff.id ? { ...s, newPassword: '' } : s)),
        );
      }
      await refreshData();
      Alert.alert('Saved', 'Branch and password updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save.');
    } finally {
      setSavingId(null);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Admin access required.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Assign staff to branches</Text>
      <Text style={styles.subtitle}>Set each staff member's branch and optionally their password.</Text>
      {staffList.map((staff) => (
        <View key={staff.id} style={styles.card}>
          <Text style={styles.staffName}>{staff.name}</Text>
          {staff.username ? (
            <Text style={styles.username}>Username: {staff.username}</Text>
          ) : null}
          <Text style={styles.label}>Branch</Text>
          <View style={styles.branchRow}>
            {branches.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[
                  styles.branchChip,
                  staff.selectedBranchId === b.id && styles.branchChipActive,
                ]}
                onPress={() => updateBranch(staff.id, b.id)}
              >
                <Text
                  style={[
                    styles.branchChipText,
                    staff.selectedBranchId === b.id && styles.branchChipTextActive,
                  ]}
                >
                  {b.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.branchChip,
                staff.selectedBranchId === null && styles.branchChipActive,
              ]}
              onPress={() => updateBranch(staff.id, null)}
            >
              <Text
                style={[
                  styles.branchChipText,
                  staff.selectedBranchId === null && styles.branchChipTextActive,
                ]}
              >
                Unassigned
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>New password (optional, min 6 chars)</Text>
          <TextInput
            style={styles.input}
            placeholder="Leave blank to keep current"
            placeholderTextColor="#64748b"
            value={staff.newPassword}
            onChangeText={(v) => setPasswordField(staff.id, v)}
            secureTextEntry
          />
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => saveStaff(staff)}
            disabled={savingId === staff.id}
          >
            {savingId === staff.id ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 16, paddingHorizontal: theme.spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.error, fontSize: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: 18,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  staffName: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  username: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' },
  branchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  branchChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  branchChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  branchChipText: { fontSize: 13, color: colors.textSecondary },
  branchChipTextActive: { color: colors.textInverse, fontWeight: '600' },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  saveBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});
