import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { ProductSale } from '../types';

interface Props {
  navigation: any;
}

export const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { getAdminRevenueSummary, productSales, inventory } = useData();

  const handleLogout = () => {
    logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'RoleSelection' }],
    });
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
    <View style={styles.saleCard}>
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
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Today Revenue</Text>
          <Text style={styles.statValue}>₹{revenueSummary.todayTotal.toFixed(0)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Monthly Revenue</Text>
          <Text style={styles.statValue}>₹{revenueSummary.monthlyTotal.toFixed(0)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Yearly Revenue</Text>
          <Text style={styles.statValue}>₹{revenueSummary.yearlyTotal.toFixed(0)}</Text>
        </View>
      </View>

      {revenueSummary.byBranch && revenueSummary.byBranch.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue by Branch</Text>
          {revenueSummary.byBranch.map(b => (
            <View key={b.branchId} style={styles.staffRevenueRow}>
              <Text style={styles.staffName}>{b.branchName}</Text>
              <Text style={styles.staffAmount}>₹{b.todayTotal.toFixed(0)} today</Text>
            </View>
          ))}
          <View style={[styles.staffRevenueRow, { borderTopWidth: 1, borderTopColor: '#1f2937', marginTop: 8, paddingTop: 8 }]}>
            <Text style={[styles.staffName, { fontWeight: '700' }]}>Combined</Text>
            <Text style={styles.staffAmount}>₹{revenueSummary.todayTotal.toFixed(0)}</Text>
          </View>
        </View>
      ) : null}

      {revenueSummary.paymentBreakdown ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Payment Breakdown</Text>
          <View style={styles.staffRevenueRow}>
            <Text style={styles.staffName}>Cash</Text>
            <Text style={styles.staffAmount}>₹{(revenueSummary.paymentBreakdown.cash || 0).toFixed(0)}</Text>
          </View>
          <View style={styles.staffRevenueRow}>
            <Text style={styles.staffName}>UPI</Text>
            <Text style={styles.staffAmount}>₹{(revenueSummary.paymentBreakdown.upi || 0).toFixed(0)}</Text>
          </View>
          <View style={styles.staffRevenueRow}>
            <Text style={styles.staffName}>Card</Text>
            <Text style={styles.staffAmount}>₹{(revenueSummary.paymentBreakdown.card || 0).toFixed(0)}</Text>
          </View>
          <View style={styles.staffRevenueRow}>
            <Text style={styles.staffName}>Udhaar</Text>
            <Text style={styles.staffAmount}>₹{(revenueSummary.paymentBreakdown.udhaar || 0).toFixed(0)}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today&apos;s Revenue by Staff</Text>
        {revenueSummary.byStaffToday.map(staff => (
          <View key={staff.staffId} style={styles.staffRevenueRow}>
            <Text style={styles.staffName}>{staff.staffName}</Text>
            <Text style={styles.staffAmount}>₹{staff.total.toFixed(0)}</Text>
          </View>
        ))}
      </View>

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
            <View key={item.id} style={styles.lowStockItem}>
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
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AdminInventory')}
        >
          <Text style={styles.actionButtonText}>Manage Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AdminProductSales')}
        >
          <Text style={styles.actionButtonText}>View All Product Sales</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AdminAttendance')}
        >
          <Text style={styles.actionButtonText}>View Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AdminUdhaar')}
        >
          <Text style={styles.actionButtonText}>Udhaar (Credit)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AdminStaffPerformance')}
        >
          <Text style={styles.actionButtonText}>Staff Performance</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  statLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 12,
  },
  manageLink: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  staffRevenueRow: {
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
  staffName: {
    fontSize: 14,
    color: '#e5e7eb',
    fontWeight: '500',
  },
  staffAmount: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  lowStockItem: {
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
  lowStockName: {
    fontSize: 14,
    color: '#fca5a5',
    fontWeight: '500',
  },
  lowStockQty: {
    fontSize: 14,
    color: '#fca5a5',
    fontWeight: '600',
  },
  saleCard: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  saleProduct: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  saleAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22c55e',
  },
  saleDetails: {
    gap: 4,
  },
  saleDetail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
  actions: {
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});
