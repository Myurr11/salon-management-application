import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BarChartCard } from '../components/BarChartCard';
import { RevenueBarChart } from '../components/RevenueBarChart';
import type { ProductSale } from '../types';
import { colors, theme, shadows } from '../theme';

interface Props {
  navigation: any;
}

export const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { getAdminRevenueSummary, productSales, inventory } = useData();

  const handleLogout = () => {
    logout();
  };

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Admin access required.</Text>
      </View>
    );
  }

  const revenueSummary = useMemo(() => getAdminRevenueSummary(), [getAdminRevenueSummary]);
  const recentProductSales = useMemo(() => productSales.slice(0, 10), [productSales]);

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
    <View style={[styles.saleCard, shadows.sm]}>
      <View style={styles.saleHeader}>
        <Text style={styles.saleProduct}>{item.productName}</Text>
        <Text style={styles.saleAmount}>₹{item.totalPrice.toFixed(0)}</Text>
      </View>
      <View style={styles.saleDetails}>
        <Text style={styles.saleDetail}>Qty: {item.quantity} × ₹{item.unitPrice}</Text>
        <Text style={styles.saleDetail}>Staff: {item.staffName}</Text>
        <Text style={styles.saleDetail}>Customer: {item.customerName}</Text>
        <Text style={styles.saleDetail}>Date: {formatDate(item.date)}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity style={[styles.logoutButton, shadows.sm]} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, shadows.sm]}>
          <Text style={styles.statLabel}>Today Revenue</Text>
          <Text style={styles.statValue}>₹{revenueSummary.todayTotal.toFixed(0)}</Text>
        </View>
        <View style={[styles.statCard, shadows.sm]}>
          <Text style={styles.statLabel}>Monthly Revenue</Text>
          <Text style={styles.statValue}>₹{revenueSummary.monthlyTotal.toFixed(0)}</Text>
        </View>
        <View style={[styles.statCard, shadows.sm]}>
          <Text style={styles.statLabel}>Yearly Revenue</Text>
          <Text style={styles.statValue}>₹{revenueSummary.yearlyTotal.toFixed(0)}</Text>
        </View>
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

      <BarChartCard
        title="Today's Revenue by Staff"
        items={revenueSummary.byStaffToday.map((s) => ({
          label: s.staffName,
          value: s.total,
        }))}
        formatValue={(v) => `₹${v.toFixed(0)}`}
      />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Low Stock Items</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminInventory')}>
            <Text style={styles.manageLink}>Manage</Text>
          </TouchableOpacity>
        </View>
        {lowStockItems.length === 0 ? (
          <Text style={styles.emptyText}>All items are well stocked.</Text>
        ) : (
          lowStockItems.map(item => (
            <View key={item.id} style={[styles.lowStockItem, shadows.sm]}>
              <Text style={styles.lowStockName}>{item.name}</Text>
              <Text style={styles.lowStockQty}>
                {item.quantity} / {item.minThreshold} units
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Product Sales</Text>
        {recentProductSales.length === 0 ? (
          <Text style={styles.emptyText}>No product sales yet.</Text>
        ) : (
          <FlatList
            data={recentProductSales}
            keyExtractor={item => item.id}
            renderItem={renderProductSale}
            scrollEnabled={false}
          />
        )}
      </View>

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
            <MaterialCommunityIcons name="credit-card-outline" size={28} color={colors.chartPink} style={styles.actionWidgetIcon} />
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
          <View style={styles.actionWidgetPlaceholder} />
        </View>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
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
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: colors.accentPink,
    borderRadius: theme.radius.lg,
    marginBottom: 8,
  },
  lowStockName: {
    fontSize: 14,
    color: colors.chartPink,
    fontWeight: '500',
  },
  lowStockQty: {
    fontSize: 14,
    color: colors.chartPink,
    fontWeight: '600',
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
    backgroundColor: colors.accentLavender,
  },
  widgetBlue: {
    backgroundColor: colors.accentBlue,
  },
  widgetPink: {
    backgroundColor: colors.accentPink,
  },
  widgetAmber: {
    backgroundColor: colors.accentAmber,
  },
  widgetTeal: {
    backgroundColor: colors.accentTeal,
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
});
