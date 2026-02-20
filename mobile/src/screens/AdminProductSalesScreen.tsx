import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { colors, theme, shadows } from '../theme';
import { useAuth } from '../context/AuthContext';
import type { ProductSale } from '../types';

interface Props {
  navigation: any;
}

export const AdminProductSalesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { getProductSales } = useData();
  const { staffMembers } = useAuth();
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
    <View style={[styles.saleCard, shadows.sm]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: colors.accentMuted }]}>
          <MaterialCommunityIcons name="spray" size={22} color={colors.accent} />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.saleProduct} numberOfLines={1}>{item.productName}</Text>
          <View style={styles.quantityChip}>
            <MaterialCommunityIcons name="cube-outline" size={12} color={colors.textMuted} />
            <Text style={styles.quantityText}>{item.quantity} × ₹{item.unitPrice}</Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.saleAmount}>₹{item.totalPrice.toFixed(0)}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.saleDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="account-outline" size={14} color={colors.textMuted} />
          <Text style={styles.saleDetail}>{item.staffName}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="account-heart-outline" size={14} color={colors.textMuted} />
          <Text style={styles.saleDetail}>{item.customerName}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={styles.saleDetail}>{formatDate(item.date)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="cart-outline" size={28} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Product Sales</Text>
          <Text style={styles.headerSubtitle}>{allSales.length} sales • ₹{totalRevenue.toFixed(0)}</Text>
        </View>
      </View>

      {/* Staff Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Staff</Text>
        <View style={styles.staffFilter}>
          <TouchableOpacity
            style={[styles.filterChip, selectedStaffId === null ? styles.filterChipActive : null]}
            onPress={() => setSelectedStaffId(null)}
          >
            <Text style={[styles.filterChipText, selectedStaffId === null ? styles.filterChipTextActive : null]}>
              All Staff
            </Text>
          </TouchableOpacity>
          {staffMembers.map(staff => (
            <TouchableOpacity
              key={staff.id}
              style={[styles.filterChip, selectedStaffId === staff.id ? styles.filterChipActive : null]}
              onPress={() => setSelectedStaffId(staff.id)}
            >
              <Text style={[styles.filterChipText, selectedStaffId === staff.id ? styles.filterChipTextActive : null]}>
                {staff.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="loading" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : allSales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="cart-off" size={64} color={colors.border} />
          <Text style={styles.emptyText}>No product sales found</Text>
        </View>
      ) : (
        <FlatList
          data={allSales}
          keyExtractor={item => item.id}
          renderItem={renderSale}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  filterContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
    fontWeight: '600',
  },
  staffFilter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  saleCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  productInfo: { flex: 1 },
  saleProduct: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  quantityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  quantityText: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 4,
  },
  amountContainer: { alignItems: 'flex-end' },
  saleAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: theme.spacing.md,
  },
  saleDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
});
