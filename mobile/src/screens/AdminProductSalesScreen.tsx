import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { ProductSale } from '../types';

interface Props {
  navigation: any;
}

export const AdminProductSalesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { getProductSales, staffMembers } = useData();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Admin access required.</Text>
      </View>
    );
  }

  const [allSales, setAllSales] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSales = async () => {
      try {
        setLoading(true);
        const sales = await getProductSales(selectedStaffId ? { staffId: selectedStaffId } : undefined);
        setAllSales(sales);
      } catch (error) {
        console.error('Error loading product sales:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSales();
  }, [getProductSales, selectedStaffId]);

  const totalRevenue = useMemo(
    () => allSales.reduce((sum, sale) => sum + sale.totalPrice, 0),
    [allSales],
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderSale = ({ item }: { item: ProductSale }) => (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <Text style={styles.saleProduct}>{item.productName}</Text>
        <Text style={styles.saleAmount}>₹{item.totalPrice.toFixed(0)}</Text>
      </View>
      <View style={styles.saleDetails}>
        <Text style={styles.saleDetail}>
          Quantity: {item.quantity} × ₹{item.unitPrice}
        </Text>
        <Text style={styles.saleDetail}>Sold by: {item.staffName}</Text>
        <Text style={styles.saleDetail}>Customer: {item.customerName}</Text>
        <Text style={styles.saleDetail}>Date: {formatDate(item.date)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Staff:</Text>
        <View style={styles.staffFilter}>
          <TouchableOpacity
            style={[styles.filterChip, selectedStaffId === null ? styles.filterChipActive : null]}
            onPress={() => setSelectedStaffId(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedStaffId === null ? styles.filterChipTextActive : null,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {staffMembers.map(staff => (
            <TouchableOpacity
              key={staff.id}
              style={[
                styles.filterChip,
                selectedStaffId === staff.id ? styles.filterChipActive : null,
              ]}
              onPress={() => setSelectedStaffId(staff.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStaffId === staff.id ? styles.filterChipTextActive : null,
                ]}
              >
                {staff.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total Revenue:</Text>
        <Text style={styles.summaryValue}>₹{totalRevenue.toFixed(0)}</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Product Sales</Text>
        <Text style={styles.headerSubtitle}>{allSales.length} sale(s)</Text>
      </View>

      {allSales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No product sales found.</Text>
        </View>
      ) : (
        <FlatList
          data={allSales}
          keyExtractor={item => item.id}
          renderItem={renderSale}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: 60,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  staffFilter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#111827',
  },
  filterChipActive: {
    backgroundColor: '#22c55e33',
    borderColor: '#22c55e',
  },
  filterChipText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  filterChipTextActive: {
    color: '#bbf7d0',
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#111827',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  saleCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  saleProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
  },
  saleDetails: {
    gap: 6,
  },
  saleDetail: {
    fontSize: 13,
    color: '#9ca3af',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});
