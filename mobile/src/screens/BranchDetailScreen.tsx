import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BarChartCard } from '../components/BarChartCard';
import { RevenueBarChart } from '../components/RevenueBarChart';
import type { ProductSale } from '../types';

const DEFAULT_BRANCH_ID = '00000000-0000-0000-0000-000000000001';

interface Props {
  navigation: any;
  route: { params: { branchId: string; branchName: string } };
}

export const BranchDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { inventory, getBranchSummary, getProductSales } = useData();
  const { branchId, branchName } = route.params;

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

  const recentSales = useMemo(() => productSales.slice(0, 10), [productSales]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{branchName}</Text>
        <Text style={styles.headerSubtitle}>Branch analytics</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Today</Text>
          <Text style={styles.statValue}>₹{summary.todayTotal.toFixed(0)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Monthly</Text>
          <Text style={styles.statValue}>₹{summary.monthlyTotal.toFixed(0)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Yearly</Text>
          <Text style={styles.statValue}>₹{summary.yearlyTotal.toFixed(0)}</Text>
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
          { label: 'Cash', value: summary.paymentBreakdown.cash || 0, color: '#22c55e' },
          { label: 'UPI', value: summary.paymentBreakdown.upi || 0, color: '#3b82f6' },
          { label: 'Card', value: summary.paymentBreakdown.card || 0, color: '#f59e0b' },
          { label: 'Udhaar', value: summary.paymentBreakdown.udhaar || 0, color: '#ef4444' },
        ]}
        formatValue={(v) => `₹${v.toFixed(0)}`}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Revenue by Staff (this branch)</Text>
        {summary.byStaffToday
          .filter((s) => s.total > 0)
          .map((staff) => (
            <View key={staff.staffId} style={styles.row}>
              <Text style={styles.rowLabel}>{staff.staffName}</Text>
              <Text style={styles.rowValue}>₹{staff.total.toFixed(0)}</Text>
            </View>
          ))}
        {summary.byStaffToday.every((s) => s.total === 0) && (
          <Text style={styles.emptyText}>No staff revenue today for this branch.</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Low Stock (this branch)</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminInventory')}>
            <Text style={styles.manageLink}>Manage</Text>
          </TouchableOpacity>
        </View>
        {lowStockItems.length === 0 ? (
          <Text style={styles.emptyText}>All items well stocked.</Text>
        ) : (
          lowStockItems.map((item) => (
            <View key={item.id} style={styles.lowStockRow}>
              <Text style={styles.lowStockName}>{item.name}</Text>
              <Text style={styles.lowStockQty}>
                {item.quantity} / {item.minThreshold}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Product Sales (this branch)</Text>
        {salesLoading ? (
          <ActivityIndicator size="small" color="#22c55e" style={{ marginVertical: 12 }} />
        ) : recentSales.length === 0 ? (
          <Text style={styles.emptyText}>No product sales yet.</Text>
        ) : (
          recentSales.map((sale) => (
            <View key={sale.id} style={styles.saleRow}>
              <View>
                <Text style={styles.saleProduct}>{sale.productName}</Text>
                <Text style={styles.saleMeta}>
                  {sale.staffName} · {sale.customerName} · {formatDate(sale.date)}
                </Text>
              </View>
              <Text style={styles.saleAmount}>₹{sale.totalPrice.toFixed(0)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backButtonText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22c55e',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 12,
  },
  manageLink: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#111827',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  rowLabel: { fontSize: 14, color: '#e5e7eb', fontWeight: '500' },
  rowValue: { fontSize: 14, color: '#22c55e', fontWeight: '600' },
  lowStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#7f1d1d',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#991b1b',
  },
  lowStockName: { fontSize: 14, color: '#fca5a5', fontWeight: '500' },
  lowStockQty: { fontSize: 14, color: '#fca5a5', fontWeight: '600' },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#111827',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  saleProduct: { fontSize: 14, fontWeight: '600', color: '#e5e7eb' },
  saleMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  saleAmount: { fontSize: 14, fontWeight: '700', color: '#22c55e' },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
