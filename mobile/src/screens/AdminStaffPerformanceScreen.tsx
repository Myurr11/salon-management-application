import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, theme, shadows } from '../theme';
import { Button } from '../components/ui/Button';
import * as supabaseService from '../services/supabaseService';

interface Props {
  navigation: any;
}

export const AdminStaffPerformanceScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers, refreshStaffMembers } = useAuth();
  const { visits } = useData();
  
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [selectedStaffForGoal, setSelectedStaffForGoal] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const staffStats = useMemo(() => {
    const map: Record<
      string,
      { name: string; customers: number; revenue: number; servicesCount: number; productsCount: number; monthlyGoal: number }
    > = {};
    staffMembers.forEach(s => {
      map[s.id] = { name: s.name, customers: 0, revenue: 0, servicesCount: 0, productsCount: 0, monthlyGoal: s.monthlyGoal || 0 };
    });
    visits.forEach(v => {
      // Count visits for primary staff
      if (map[v.staffId]) {
        map[v.staffId].customers += 1;
        map[v.staffId].revenue += v.total;
        map[v.staffId].servicesCount += v.services.length;
        map[v.staffId].productsCount += v.products.reduce((sum, p) => sum + p.quantity, 0);
      }
      // Also count for attending staff (new format with revenue share)
      if (v.attendingStaff) {
        v.attendingStaff.forEach(staff => {
          if (map[staff.staffId] && staff.staffId !== v.staffId) {
            map[staff.staffId].customers += 1;
            map[staff.staffId].revenue += staff.revenueShare;
          }
        });
      }
    });
    return Object.entries(map).map(([staffId, stats]) => ({
      staffId,
      ...stats,
      avgBill: stats.customers > 0 ? stats.revenue / stats.customers : 0,
      goalProgress: stats.monthlyGoal > 0 ? Math.min(100, (stats.revenue / stats.monthlyGoal) * 100) : 0,
    }));
  }, [visits, staffMembers]);

  const openGoalModal = (staffId: string, currentGoal: number) => {
    setSelectedStaffForGoal(staffId);
    setGoalInput(currentGoal > 0 ? currentGoal.toString() : '');
    setGoalModalVisible(true);
  };

  const saveGoal = async () => {
    if (!selectedStaffForGoal) return;
    
    const goalValue = parseFloat(goalInput);
    if (isNaN(goalValue) || goalValue < 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid revenue goal amount');
      return;
    }

    setSavingGoal(true);
    try {
      // Update staff goal in database
      await supabaseService.updateStaffGoal(selectedStaffForGoal, goalValue);
      
      // Refresh staff members to get updated data
      await refreshStaffMembers();
      
      setGoalModalVisible(false);
      Alert.alert('Success', 'Goal updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update goal');
    } finally {
      setSavingGoal(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Admin access required.</Text>
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
          <MaterialCommunityIcons name="chart-bar" size={28} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Staff Performance</Text>
          <Text style={styles.headerSubtitle}>{staffStats.length} staff members</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {staffStats.map((s, index) => (
          <View key={s.staffId} style={[styles.card, shadows.sm]}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.accentBlue }]}>
                <Text style={styles.avatarText}>{getInitials(s.name)}</Text>
              </View>
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{s.name}</Text>
                <View style={styles.rankBadge}>
                  <MaterialCommunityIcons name="trophy" size={12} color={colors.chartAmber} />
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
              </View>
              <View style={styles.revenueContainer}>
                <Text style={styles.revenueLabel}>Revenue</Text>
                <Text style={styles.revenueValue}>₹{s.revenue.toFixed(0)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="account-group" size={20} color={colors.primary} />
                <Text style={styles.statValue}>{s.customers}</Text>
                <Text style={styles.statLabel}>Customers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="spa" size={20} color={colors.accent} />
                <Text style={styles.statValue}>{s.servicesCount}</Text>
                <Text style={styles.statLabel}>Services</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="package-variant" size={20} color={colors.success} />
                <Text style={styles.statValue}>{s.productsCount}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="cash" size={20} color={colors.chartPurple} />
                <Text style={styles.statValue}>₹{s.avgBill.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Avg Bill</Text>
              </View>
            </View>

            {/* Goal Section */}
            <View style={styles.divider} />
            <View style={styles.goalSection}>
              <View style={styles.goalHeader}>
                <View style={styles.goalInfo}>
                  <MaterialCommunityIcons name="target" size={16} color={colors.accent} />
                  <Text style={styles.goalLabel}>Monthly Revenue Goal</Text>
                </View>
                <TouchableOpacity 
                  style={styles.setGoalButton}
                  onPress={() => openGoalModal(s.staffId, s.monthlyGoal)}
                >
                  <MaterialCommunityIcons name="pencil" size={14} color={colors.primary} />
                  <Text style={styles.setGoalText}>{s.monthlyGoal > 0 ? 'Edit' : 'Set Goal'}</Text>
                </TouchableOpacity>
              </View>
              
              {s.monthlyGoal > 0 ? (
                <>
                  <View style={styles.goalProgressRow}>
                    <Text style={styles.goalAmount}>₹{s.revenue.toFixed(0)} / ₹{s.monthlyGoal}</Text>
                    <Text style={styles.goalPercent}>{Math.round(s.goalProgress)}%</Text>
                  </View>
                  <View style={styles.goalBarBg}>
                    <View 
                      style={[styles.goalBarFill, { width: `${Math.min(s.goalProgress, 100)}%` }]} 
                    />
                  </View>
                </>
              ) : (
                <Text style={styles.noGoalText}>No goal set</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Goal Setting Modal */}
      <Modal
        visible={goalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Monthly Revenue Goal</Text>
              <TouchableOpacity onPress={() => setGoalModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalLabel}>Target Revenue (₹)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Enter goal amount"
              placeholderTextColor={colors.textMuted}
              value={goalInput}
              onChangeText={setGoalInput}
            />
            
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setGoalModalVisible(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Save Goal"
                onPress={saveGoal}
                loading={savingGoal}
                disabled={savingGoal}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  card: {
    backgroundColor: colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
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
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentAmber,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  rankText: { fontSize: 12, fontWeight: '700', color: colors.chartAmber, marginLeft: 4 },
  revenueContainer: { alignItems: 'flex-end' },
  revenueLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  revenueValue: { fontSize: 18, fontWeight: '700', color: colors.success },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 40, backgroundColor: colors.border },
  statValue: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4 },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  goalSection: {
    marginTop: theme.spacing.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  setGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.primaryContainer,
    borderRadius: theme.radius.md,
  },
  setGoalText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  goalProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  goalAmount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  goalPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
  },
  goalBarBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: theme.radius.xs,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: theme.radius.xs,
  },
  noGoalText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: theme.spacing.md,
    fontSize: 16,
    color: colors.text,
    marginBottom: theme.spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
