import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BarChartCard } from '../components/BarChartCard';
import { colors, theme, shadows } from '../theme';
import { RevenueBarChart } from '../components/RevenueBarChart';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import type { ProductSale } from '../types';

const DEFAULT_BRANCH_ID = '00000000-0000-0000-0000-000000000001';

interface Props {
  navigation?: any;
  route?: { params?: { branchId?: string; branchName?: string } };
}

export const BranchDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { inventory, getBranchSummary, getProductSales } = useData();
  const branchId = route?.params?.branchId ?? '';
  const branchName = route?.params?.branchName ?? '';

  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getProductSales({ branchId })
      .then((data) => {
        if (!cancelled) setProductSales(data);
      })
      .finally(() => {
        if (!cancelled) setSalesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, getProductSales]);

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Admin access required.</Text>
      </View>
    );
  }

  const summary = useMemo(() => getBranchSummary(branchId), [getBranchSummary, branchId]);

  const lowStockItems = useMemo(
    () =>
      inventory.filter(
        (item) =>
          (item.branchId ?? DEFAULT_BRANCH_ID) === branchId &&
          item.quantity <= item.minThreshold,
      ),
    [inventory, branchId],
  );

  const recentSales = useMemo(() => productSales.slice(0, 4), [productSales]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[theme.typography.bodySmall, { color: colors.textMuted }]}>Branch</Text>
            <Text style={theme.typography.h2}>{branchName}</Text>
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCardWrapper}>
          <StatCard
            title="Today's Revenue"
            value={`₹${summary.todayTotal.toFixed(0)}`}
            icon="cash-multiple"
            iconColor={colors.primary}
            iconBgColor={colors.primaryContainer}
          />
        </View>
        <View style={styles.statCardWrapper}>
          <StatCard
            title="Monthly Revenue"
            value={`₹${summary.monthlyTotal.toFixed(0)}`}
            icon="calendar-month"
            iconColor={colors.accent}
            iconBgColor={colors.accentMuted}
          />
        </View>
        <View style={styles.statCardWrapper}>
          <StatCard
            title="Yearly Revenue"
            value={`₹${summary.yearlyTotal.toFixed(0)}`}
            icon="chart-line"
            iconColor={colors.success}
            iconBgColor={colors.successMuted}
          />
        </View>
      </View>

      <RevenueBarChart
        today={summary.todayTotal}
        monthly={summary.monthlyTotal}
        yearly={summary.yearlyTotal}
      />

      <BarChartCard
        title="Today's Payment Breakdown"
        items={[
          { label: 'Cash', value: summary.paymentBreakdown.cash || 0, color: colors.chartGreen },
          { label: 'UPI', value: summary.paymentBreakdown.upi || 0, color: colors.chartBlue },
          { label: 'Card', value: summary.paymentBreakdown.card || 0, color: colors.chartAmber },
          { label: 'Udhaar', value: summary.paymentBreakdown.udhaar || 0, color: colors.chartRed },
        ]}
        formatValue={(v) => `₹${v.toFixed(0)}`}
      />

      {/* Staff Revenue Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="account-group" size={18} color={colors.primary} />
            <Text style={[theme.typography.h4, { marginLeft: theme.spacing.sm }]}>
              Today's Revenue by Staff
            </Text>
          </View>
        </View>
        {summary.byStaffToday.filter((s) => s.total > 0).length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="account-off" size={32} color={colors.border} />
            <Text style={styles.emptyCardText}>No staff revenue today</Text>
          </View>
        ) : (
          <View style={styles.staffList}>
            {summary.byStaffToday
              .filter((s) => s.total > 0)
              .map((staff, index) => (
                <View key={staff.staffId} style={[styles.staffCard, shadows.sm]}>
                  <View style={[styles.staffRank, { backgroundColor: index < 3 ? colors.accentAmber : colors.background }]}>
                    <Text style={[styles.staffRankText, { color: index < 3 ? colors.chartAmber : colors.textMuted }]}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{staff.staffName}</Text>
                  </View>
                  <Text style={styles.staffAmount}>₹{staff.total.toFixed(0)}</Text>
                </View>
              ))}
          </View>
        )}
      </View>

      {/* Low Stock Section */}
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
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="check-circle" size={32} color={colors.success} />
            <Text style={styles.emptyCardText}>All items well stocked</Text>
          </View>
        ) : (
          lowStockItems.map((item) => (
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

      {/* Recent Sales Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="cart-outline" size={18} color={colors.success} />
            <Text style={[theme.typography.h4, { marginLeft: theme.spacing.sm }]}>Recent Product Sales</Text>
          </View>
        </View>
        {salesLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
        ) : recentSales.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="package-variant" size={32} color={colors.border} />
            <Text style={styles.emptyCardText}>No product sales yet</Text>
          </View>
        ) : (
          <View style={styles.salesList}>
            {recentSales.map((sale) => (
              <View key={sale.id} style={[styles.saleCard, shadows.sm]}>
                <View style={[styles.saleIcon, { backgroundColor: colors.accentGreen }]}>
                  <MaterialCommunityIcons name="package-variant" size={20} color={colors.success} />
                </View>
                <View style={styles.saleContent}>
                  <View style={styles.saleHeader}>
                    <Text style={styles.saleProduct} numberOfLines={1}>{sale.productName}</Text>
                    <Text style={styles.saleAmount}>₹{sale.totalPrice.toFixed(0)}</Text>
                  </View>
                  <View style={styles.saleMeta}>
                    <Text style={styles.saleMetaText}>{sale.quantity} × ₹{sale.unitPrice}</Text>
                    <Text style={styles.saleMetaDot}>•</Text>
                    <Text style={styles.saleMetaText}>{sale.staffName}</Text>
                    <Text style={styles.saleMetaDot}>•</Text>
                    <Text style={styles.saleMetaText}>{formatDate(sale.date)}</Text>
                  </View>
                </View>
              </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
  // Header Styles
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  statCardWrapper: {
    flex: 1,
  },
  // Section Styles
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Staff List Styles
  staffList: {
    gap: theme.spacing.sm,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  staffRank: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  staffRankText: {
    fontSize: 12,
    fontWeight: '700',
  },
  staffInfo: {
    flex: 1,
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
  // Low Stock Styles
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
  // Sales List Styles
  salesList: {
    gap: theme.spacing.sm,
  },
  saleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saleIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  saleContent: {
    flex: 1,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  saleProduct: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  saleAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  saleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  saleMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  saleMetaDot: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: 6,
  },
  // Empty State Styles
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
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
