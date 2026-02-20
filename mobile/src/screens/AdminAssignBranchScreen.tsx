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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import bcrypt from 'bcryptjs';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, theme, shadows } from '../theme';
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="office-building" size={28} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Assign Branches</Text>
          <Text style={styles.headerSubtitle}>{staffList.length} staff members</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        <Text style={styles.pageSubtitle}>Set each staff member's branch and optionally their password.</Text>
        {staffList.map((staff) => (
          <View key={staff.id} style={[styles.card, shadows.sm]}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.accentPurple }]}>
                <Text style={styles.avatarText}>{getInitials(staff.name)}</Text>
              </View>
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{staff.name}</Text>
                {staff.username && (
                  <View style={styles.usernameChip}>
                    <MaterialCommunityIcons name="account" size={12} color={colors.textMuted} />
                    <Text style={styles.usernameText}>{staff.username}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>Branch Assignment</Text>
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
                  <MaterialCommunityIcons 
                    name={staff.selectedBranchId === b.id ? "check-circle" : "office-building-outline"} 
                    size={14} 
                    color={staff.selectedBranchId === b.id ? colors.textInverse : colors.textSecondary} 
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.branchChipText, staff.selectedBranchId === b.id && styles.branchChipTextActive]}>
                    {b.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.branchChip, staff.selectedBranchId === null && styles.branchChipActive]}
                onPress={() => updateBranch(staff.id, null)}
              >
                <MaterialCommunityIcons 
                  name={staff.selectedBranchId === null ? "check-circle" : "circle-outline"} 
                  size={14} 
                  color={staff.selectedBranchId === null ? colors.textInverse : colors.textSecondary} 
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.branchChipText, staff.selectedBranchId === null && styles.branchChipTextActive]}>
                  Unassigned
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>New Password (optional)</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Leave blank to keep current"
                placeholderTextColor={colors.textMuted}
                value={staff.newPassword}
                onChangeText={(v) => setPasswordField(staff.id, v)}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => saveStaff(staff)}
              disabled={savingId === staff.id}
              activeOpacity={0.8}
            >
              {savingId === staff.id ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save" size={18} color={colors.textInverse} />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
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
  listContent: { padding: theme.spacing.lg, paddingBottom: 20 },
  pageSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: theme.spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.textInverse },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  usernameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  usernameText: { fontSize: 12, color: colors.textMuted, marginLeft: 4 },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginBottom: theme.spacing.md,
  },
  sectionLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 10, fontWeight: '600' },
  branchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  branchChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  branchChipText: { fontSize: 13, color: colors.textSecondary },
  branchChipTextActive: { color: colors.textInverse, fontWeight: '600' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: theme.spacing.md,
  },
  inputIcon: { marginLeft: 12 },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    gap: 8,
  },
  saveBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});
