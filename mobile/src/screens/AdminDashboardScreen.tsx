import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Modal, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BarChartCard } from '../components/BarChartCard';
import { RevenueBarChart } from '../components/RevenueBarChart';
import type { ProductSale, StaffMember } from '../types';
import { colors, theme, shadows } from '../theme';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { updateStaffGoal } from '../services/supabaseService';

interface Props {
  navigation: any;
}

export const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, staffMembers, refreshStaffMembers } = useAuth();
  const { getAdminRevenueSummary, productSales, inventory, visits, refreshData } = useData();
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [goalAmount, setGoalAmount] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const handleLogout = () => {
    logout();
  };

  // Refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshData();
    });
    return unsubscribe;
  }, [navigation, refreshData]);



  const openGoalModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setGoalAmount(staff.monthlyGoal?.toString() || '');
    setGoalModalVisible(true);
  };

  const closeGoalModal = () => {
    setGoalModalVisible(false);
    setSelectedStaff(null);
    setGoalAmount('');
  };

  const handleSaveGoal = async () => {
    if (!selectedStaff) return;
    const amount = parseFloat(goalAmount);
    if (isNaN(amount) || amount < 0) return;
    
    setSavingGoal(true);
    try {
      await updateStaffGoal(selectedStaff.id, amount);
      await refreshStaffMembers();
      closeGoalModal();
    } catch (error) {
      console.error('Failed to save goal:', error);
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

  const revenueSummary = useMemo(() => getAdminRevenueSummary(), [getAdminRevenueSummary]);
  const recentProductSales = useMemo(() => productSales.slice(0, 4), [productSales]);
  const recentServices = useMemo(() => {
    // Get recent visits with services, sorted by date (most recent first)
    return visits
      .filter(v => v.services && v.services.length > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }, [visits]);

  const lowStockItems = useMemo(
    () => inventory.filter(item => item.quantity <= item.minThreshold),
    [inventory],
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  const renderProductSale = ({ item }: { item: ProductSale }) => (
    <View style={[styles.recentItemCard, shadows.sm]}>
      <View style={[styles.recentItemIcon, { backgroundColor: colors.accentGreen }]}>
        <MaterialCommunityIcons name="package-variant" size={20} color={colors.success} />
      </View>
      <View style={styles.recentItemContent}>
        <View style={styles.recentItemHeader}>
          <Text style={styles.recentItemName} numberOfLines={1}>{item.productName}</Text>
          <Text style={styles.recentItemAmount}>₹{item.totalPrice.toFixed(0)}</Text>
        </View>
        <View style={styles.recentItemMeta}>
          <Text style={styles.recentItemMetaText}>{item.quantity} × ₹{item.unitPrice}</Text>
          <Text style={styles.recentItemDot}>•</Text>
          <Text style={styles.recentItemMetaText}>{item.staffName}</Text>
          <Text style={styles.recentItemDot}>•</Text>
          <Text style={styles.recentItemMetaText}>{formatDate(item.date)}</Text>
        </View>
      </View>
    </View>
  );

  const renderServiceItem = ({ item }: { item: any }) => {
    const staffName = item.attendingStaff && item.attendingStaff.length > 0
      ? item.attendingStaff.map((s: any) => s.staffName).join(', ')
      : item.staffName || 'Unknown';
    const totalServices = item.services.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
    
    // Get service names - handle both 'name' and 'serviceName' properties
    const serviceNames = item.services
      .map((s: any) => s.name || s.serviceName || 'Service')
      .filter((name: string) => name && name !== 'Service')
      .join(', ');
    
    return (
      <View style={[styles.recentItemCard, shadows.sm]}>
        <View style={[styles.recentItemIcon, { backgroundColor: colors.accentBlue }]}>
          <MaterialCommunityIcons name="spa" size={20} color={colors.chartBlue} />
        </View>
        <View style={styles.recentItemContent}>
          <View style={styles.recentItemHeader}>
            <Text style={styles.recentItemName} numberOfLines={1}>
              {serviceNames || 'Service Visit'}
            </Text>
            <Text style={styles.recentItemAmount}>₹{totalServices.toFixed(0)}</Text>
          </View>
          <View style={styles.recentItemMeta}>
            <Text style={styles.recentItemMetaText}>{item.customerName || 'Walk-in'}</Text>
            <Text style={styles.recentItemDot}>•</Text>
            <Text style={styles.recentItemMetaText}>{staffName}</Text>
            <Text style={styles.recentItemDot}>•</Text>
            <Text style={styles.recentItemMetaText}>{formatDate(item.date)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[theme.typography.bodySmall, { color: colors.textMuted }]}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <Text style={theme.typography.h2}>Admin Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCardWrapper}>
          <StatCard
            title="Today's Revenue"
            value={`₹${revenueSummary.todayTotal.toFixed(0)}`}
            icon="cash-multiple"
            iconColor={colors.primary}
            iconBgColor={colors.primaryContainer}
          />
        </View>
        <View style={styles.statCardWrapper}>
          <StatCard
            title="Monthly Revenue"
            value={`₹${revenueSummary.monthlyTotal.toFixed(0)}`}
            icon="calendar-month"
            iconColor={colors.accent}
            iconBgColor={colors.accentMuted}
          />
        </View>
        <View style={styles.statCardWrapper}>
          <StatCard
            title="Yearly Revenue"
            value={`₹${revenueSummary.yearlyTotal.toFixed(0)}`}
            icon="chart-line"
            iconColor={colors.success}
            iconBgColor={colors.successMuted}
          />
        </View>
      </View>

      <BarChartCard
        title="Today's Revenue by Staff"
        items={revenueSummary.byStaffToday.map((s) => ({
          label: s.staffName,
          value: s.total,
        }))}
        formatValue={(v) => `₹${v.toFixed(0)}`}
      />

      <View style={styles.actions}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionWidget, styles.widgetLavender, shadows.sm]}
            onPress={() => navigation.navigate('AdminInventory')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="package-variant" size={28} color={colors.primary} style={styles.actionWidgetIcon} />
            <Text style={styles.actionWidgetText}>Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionWidget, styles.widgetBlue, shadows.sm]}
            onPress={() => navigation.navigate('AdminProductSales')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="cart-outline" size={28} color={colors.chartBlue} style={styles.actionWidgetIcon} />
            <Text style={styles.actionWidgetText}>Product Sales</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionWidget, styles.widgetTeal, shadows.sm]}
            onPress={() => navigation.navigate('AdminAttendance')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="clipboard-check-outline" size={28} color={colors.success} style={styles.actionWidgetIcon} />
            <Text style={styles.actionWidgetText}>Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionWidget, styles.widgetPink, shadows.sm]}
            onPress={() => navigation.navigate('AdminUdhaar')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="credit-card-outline" size={28} color={colors.chartPurple} style={styles.actionWidgetIcon} />
            <Text style={styles.actionWidgetText}>Udhaar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionWidget, styles.widgetAmber, shadows.sm]}
            onPress={() => navigation.navigate('AdminStaffPerformance')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="chart-bar" size={28} color={colors.chartAmber} style={styles.actionWidgetIcon} />
            <Text style={styles.actionWidgetText}>Staff Performance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionWidget, styles.widgetLavender, shadows.sm]}
            onPress={() => navigation.navigate('AdminAssignBranch')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="office-building-outline" size={28} color={colors.primary} style={styles.actionWidgetIcon} />
            <Text style={styles.actionWidgetText}>Assign Branch</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionWidget, styles.widgetTeal, shadows.sm]}
            onPress={() => navigation.navigate('AdminAddStaff')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="account-plus-outline" size={28} color={colors.success} style={styles.actionWidgetIcon} />
            <Text style={styles.actionWidgetText}>Add Staff</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionWidget, styles.widgetBlue, shadows.sm]}
            onPress={() => navigation.navigate('AppointmentsList')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="calendar-clock" size={28} color={colors.chartBlue} style={styles.actionWidgetIcon} />
            <Text style={styles.actionWidgetText}>Appointments</Text>
          </TouchableOpacity>
        </View>
          <TouchableOpacity
            style={[styles.actionWidget, styles.widgetPink, shadows.sm]}
            onPress={() => navigation.navigate('StaffReport')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="file-chart" size={28} color={colors.chartPurple} style={styles.actionWidgetIcon} />
            <Text style={styles.actionWidgetText}>Staff Report</Text>
          </TouchableOpacity>
      </View>

      <RevenueBarChart
        today={revenueSummary.todayTotal}
        monthly={revenueSummary.monthlyTotal}
        yearly={revenueSummary.yearlyTotal}
      />

      {revenueSummary.byBranch && revenueSummary.byBranch.length > 0 ? (
        <BarChartCard
          title="Revenue by Branch (today) — tap for details"
          items={revenueSummary.byBranch.map((b) => ({
            label: b.branchName,
            value: b.todayTotal,
          }))}
          formatValue={(v) => `₹${v.toFixed(0)}`}
          TouchableWrapper={({ onPress, children }) => (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
              {children}
            </TouchableOpacity>
          )}
          onPressItem={(index) => {
            const b = revenueSummary.byBranch?.[index];
            if (b && b.branchId && b.branchId !== 'default') {
              navigation.navigate('BranchDetail', { branchId: b.branchId, branchName: b.branchName });
            }
          }}
        />
      ) : null}

      {revenueSummary.paymentBreakdown ? (
        <BarChartCard
          title="Today's Payment Breakdown"
          items={[
            { label: 'Cash', value: revenueSummary.paymentBreakdown.cash || 0, color: colors.chartGreen },
            { label: 'UPI', value: revenueSummary.paymentBreakdown.upi || 0, color: colors.chartBlue },
            { label: 'Card', value: revenueSummary.paymentBreakdown.card || 0, color: colors.chartAmber },
            { label: 'Udhaar', value: revenueSummary.paymentBreakdown.udhaar || 0, color: colors.chartRed },
          ]}
          formatValue={(v) => `₹${v.toFixed(0)}`}
        />
      ) : null}

      {/* Staff Goals Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="target" size={18} color={colors.primary} />
            <Text style={[theme.typography.h4, { marginLeft: theme.spacing.sm }]}>Staff Goals</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('AdminStaffPerformance')}>
            <Text style={[theme.typography.bodySmall, { color: colors.primary }]}>Manage Goals</Text>
          </TouchableOpacity>
        </View>
        {staffMembers.map(staff => {
          // Calculate monthly revenue for this staff
          const now = new Date();
          const month = now.getMonth();
          const year = now.getFullYear();
          let staffRevenue = 0;
          
          visits.forEach((v: any) => {
            const visitDate = new Date(v.date);
            if (visitDate.getMonth() !== month || visitDate.getFullYear() !== year) return;
            
            // Check if staff attended this visit and add their revenue share
            if (v.attendingStaff && Array.isArray(v.attendingStaff) && v.attendingStaff.length > 0) {
              const staffRecord = v.attendingStaff.find((s: any) => s.staffId === staff.id);
              if (staffRecord) {
                staffRevenue += staffRecord.revenueShare;
              }
            } else {
              if (v.staffId === staff.id) {
                staffRevenue += v.total;
              }
            }
          });
          
          const monthlyGoal = staff.monthlyGoal || 0;
          const progress = monthlyGoal > 0 ? Math.min(100, (staffRevenue / monthlyGoal) * 100) : 0;
          const isGoalSet = monthlyGoal > 0;
          
          return (
            <View key={staff.id} style={[styles.goalCard, shadows.sm]}>
              <View style={styles.goalHeader}>
                <View style={[styles.goalAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.goalAvatarText}>
                    {staff.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.goalInfo}>
                  <Text style={theme.typography.body} numberOfLines={1}>{staff.name}</Text>
                </View>
                {isGoalSet ? (
                  <TouchableOpacity 
                    style={styles.goalStatusButton}
                    onPress={() => openGoalModal(staff)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.goalStatusText}>
                      <Text style={{ color: colors.success, fontWeight: '700' }}>₹{staffRevenue.toFixed(0)}</Text>
                      <Text style={{ color: colors.textMuted }}> / ₹{monthlyGoal}</Text>
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.setGoalButtonSmall}
                    onPress={() => openGoalModal(staff)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="target" size={14} color={colors.primary} />
                    <Text style={styles.setGoalButtonTextSmall}>Set Goal</Text>
                  </TouchableOpacity>
                )}
              </View>
              {isGoalSet && (
                <View style={styles.goalProgressContainer}>
                  <View style={styles.goalProgressBg}>
                    <View style={[styles.goalProgressFill, { width: `${progress}%` }]} />
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={colors.warning} />
            <Text style={[theme.typography.h4, { marginLeft: theme.spacing.sm }]}>Low Stock Items</Text>
            {lowStockItems.length > 0 && (
              <Badge text={`${lowStockItems.length}`} variant="warning" size="sm" style={{ marginLeft: theme.spacing.sm }} />
            )}
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('AdminInventory')}>
            <Text style={[theme.typography.bodySmall, { color: colors.primary }]}>Manage</Text>
          </TouchableOpacity>
        </View>
        {lowStockItems.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="check-circle" size={32} color={colors.success} />
            <Text style={[theme.typography.bodySmall, { color: colors.textMuted, marginTop: theme.spacing.sm }]}>
              All items are well stocked
            </Text>
          </View>
        ) : (
          lowStockItems.map(item => (
            <View key={item.id} style={[styles.lowStockItem, shadows.sm]}>
              <View style={styles.lowStockInfo}>
                <MaterialCommunityIcons name="package-variant" size={18} color={colors.textSecondary} />
                <Text style={[theme.typography.bodySmall, { marginLeft: theme.spacing.sm }]}>{item.name}</Text>
              </View>
              <Badge 
                text={`${item.quantity} left`} 
                variant={item.quantity === 0 ? 'error' : 'warning'} 
                size="sm" 
              />
            </View>
          ))
        )}
      </View>

      {/* Recent Activity Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Services</Text>
        {recentServices.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="spa" size={32} color={colors.border} />
            <Text style={styles.emptyCardText}>No services yet</Text>
          </View>
        ) : (
          <View style={styles.recentList}>
            {recentServices.map((item, index) => (
              <View key={item.id || index}>{renderServiceItem({ item })}</View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Product Sales</Text>
        {recentProductSales.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="package-variant" size={32} color={colors.border} />
            <Text style={styles.emptyCardText}>No product sales yet</Text>
          </View>
        ) : (
          <View style={styles.recentList}>
            {recentProductSales.map((item, index) => (
              <View key={item.id || index}>{renderProductSale({ item })}</View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 16,
    paddingHorizontal: theme.spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  logoutButton: {
    backgroundColor: colors.errorMuted,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  logoutButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.xl,
  },
  statCardWrapper: {
    flex: 1,
    minWidth: 0,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  manageLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  staffRevenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  staffName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  staffAmount: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
  },
  lowStockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lowStockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  saleProduct: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  saleAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  saleDetails: {
    gap: 4,
  },
  saleDetail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  actionWidget: {
    flex: 1,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
  },
  widgetLavender: {
    backgroundColor: colors.accentPurple,
  },
  widgetBlue: {
    backgroundColor: colors.accentBlue,
  },
  widgetPink: {
    backgroundColor: colors.accentRose,
  },
  widgetAmber: {
    backgroundColor: colors.accentAmber,
  },
  widgetTeal: {
    backgroundColor: colors.accentGreen,
  },
  actionWidgetPlaceholder: {
    flex: 1,
    minHeight: 88,
  },
  actionWidgetIcon: {
    marginBottom: 8,
  },
  actionWidgetText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
  // Goal tracking styles
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalAvatar: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalAvatarText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  goalInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  goalAmount: {
    alignItems: 'flex-end',
  },
  goalProgressContainer: {
    marginTop: theme.spacing.md,
  },
  goalProgressBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: theme.radius.sm,
  },
  // Goal Status Button (shows X / Y customers)
  goalStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: theme.radius.md,
  },
  goalStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Set Goal Button (small version for when no goal is set)
  setGoalButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: theme.radius.md,
  },
  setGoalButtonTextSmall: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  goalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.background,
    marginBottom: theme.spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
  },
  // Recent Activity Section Styles
  recentList: {
    gap: theme.spacing.sm,
  },
  recentItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentItemIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  recentItemContent: {
    flex: 1,
  },
  recentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recentItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  recentItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  recentItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  recentItemMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  recentItemDot: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: 6,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCardText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: theme.spacing.sm,
  },
});
