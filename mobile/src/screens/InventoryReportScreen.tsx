import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { colors, theme, shadows } from '../theme';
import * as supabaseService from '../services/supabaseService';
import type { InventoryAnalytics, StockPurchase } from '../types';

interface Props {
  navigation: any;
}

type ReportPeriod = 'all' | 'month' | 'quarter' | 'year';

export const InventoryReportScreen: React.FC<Props> = ({ navigation }) => {
  const { inventory } = useData();
  const [analytics, setAnalytics] = useState<InventoryAnalytics[]>([]);
  const [purchases, setPurchases] = useState<StockPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<ReportPeriod>('all');

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Calculate date range based on period
      const endDate = new Date().toISOString().split('T')[0];
      let startDate: string | undefined;
      
      const now = new Date();
      if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      } else if (period === 'quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
      } else if (period === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      }

      const [analyticsData, purchasesData] = await Promise.all([
        supabaseService.getInventoryAnalytics(),
        supabaseService.getStockPurchases({ startDate, endDate }),
      ]);

      setAnalytics(analyticsData);
      setPurchases(purchasesData);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load inventory report');
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const retailItems = analytics.filter(a => a.itemType === 'retail');
    
    const totalPurchaseCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
    const totalRevenue = retailItems.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalProfit = retailItems.reduce((sum, item) => sum + item.totalProfit, 0);
    const totalUnitsPurchased = purchases.reduce((sum, p) => sum + p.quantity, 0);
    const totalUnitsSold = retailItems.reduce((sum, item) => sum + item.totalUnitsSold, 0);
    
    const avgMargin = retailItems.length > 0
      ? retailItems.reduce((sum, item) => sum + item.marginPercent, 0) / retailItems.length
      : 0;

    return {
      totalPurchaseCost,
      totalRevenue,
      totalProfit,
      totalUnitsPurchased,
      totalUnitsSold,
      avgMargin,
      roi: totalPurchaseCost > 0 ? ((totalProfit / totalPurchaseCost) * 100) : 0,
    };
  }, [analytics, purchases]);

  const topPerformers = useMemo(() => {
    return [...analytics]
      .filter(a => a.itemType === 'retail' && a.totalRevenue > 0)
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 5);
  }, [analytics]);

  const lowPerformers = useMemo(() => {
    return [...analytics]
      .filter(a => a.itemType === 'retail' && a.totalRevenue > 0)
      .sort((a, b) => a.marginPercent - b.marginPercent)
      .slice(0, 5);
  }, [analytics]);

  const renderPeriodButton = (key: ReportPeriod, label: string) => (
    <TouchableOpacity
      style={[styles.periodButton, period === key && styles.periodButtonActive]}
      onPress={() => setPeriod(key)}
    >
      <Text style={[styles.periodButtonText, period === key && styles.periodButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading report...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="chart-bar" size={28} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Inventory Report</Text>
          <Text style={styles.headerSubtitle}>Purchase vs Revenue Analysis</Text>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodContainer}>
        {renderPeriodButton('all', 'All Time')}
        {renderPeriodButton('month', 'This Month')}
        {renderPeriodButton('quarter', 'This Quarter')}
        {renderPeriodButton('year', 'This Year')}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: colors.accentBlue }]}>
          <MaterialCommunityIcons name="cash-minus" size={24} color={colors.textInverse} />
          <Text style={styles.summaryValue}>₹{summary.totalPurchaseCost.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Purchase Cost</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.accentGreen }]}>
          <MaterialCommunityIcons name="cash-plus" size={24} color={colors.textInverse} />
          <Text style={styles.summaryValue}>₹{summary.totalRevenue.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Revenue Generated</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: summary.totalProfit >= 0 ? colors.accentPurple : colors.accentRose }]}>
          <MaterialCommunityIcons name="trending-up" size={24} color={colors.textInverse} />
          <Text style={styles.summaryValue}>₹{summary.totalProfit.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Net Profit</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.accentAmber }]}>
          <MaterialCommunityIcons name="percent" size={24} color={colors.textInverse} />
          <Text style={styles.summaryValue}>{summary.roi.toFixed(1)}%</Text>
          <Text style={styles.summaryLabel}>ROI</Text>
        </View>
      </View>

      {/* Stock Movement */}
      <View style={[styles.sectionCard, shadows.sm]}>
        <Text style={styles.sectionTitle}>Stock Movement</Text>
        <View style={styles.movementRow}>
          <View style={styles.movementItem}>
            <View style={[styles.movementIcon, { backgroundColor: colors.successMuted }]}>
              <MaterialCommunityIcons name="arrow-down" size={20} color={colors.success} />
            </View>
            <View>
              <Text style={styles.movementValue}>{summary.totalUnitsPurchased}</Text>
              <Text style={styles.movementLabel}>Units Purchased</Text>
            </View>
          </View>
          <View style={styles.movementDivider} />
          <View style={styles.movementItem}>
            <View style={[styles.movementIcon, { backgroundColor: colors.infoMuted }]}>
              <MaterialCommunityIcons name="arrow-up" size={20} color={colors.info} />
            </View>
            <View>
              <Text style={styles.movementValue}>{summary.totalUnitsSold}</Text>
              <Text style={styles.movementLabel}>Units Sold</Text>
            </View>
          </View>
        </View>
        {summary.totalUnitsPurchased > 0 && (
          <View style={styles.stockProgress}>
            <View style={styles.stockProgressBar}>
              <View 
                style={[
                  styles.stockProgressFill, 
                  { 
                    width: `${Math.min((summary.totalUnitsSold / summary.totalUnitsPurchased) * 100, 100)}%`,
                    backgroundColor: summary.totalUnitsSold >= summary.totalUnitsPurchased * 0.8 ? colors.success : colors.warning
                  }
                ]} 
              />
            </View>
            <Text style={styles.stockProgressText}>
              {((summary.totalUnitsSold / summary.totalUnitsPurchased) * 100).toFixed(1)}% stock sold
            </Text>
          </View>
        )}
      </View>

      {/* Top Performing Products */}
      {topPerformers.length > 0 && (
        <View style={[styles.sectionCard, shadows.sm]}>
          <Text style={styles.sectionTitle}>Top Performing Products</Text>
          {topPerformers.map((item, index) => (
            <View key={item.id} style={styles.productRow}>
              <View style={[styles.rankBadge, { backgroundColor: index < 3 ? colors.accentAmber : colors.border }]}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productDetail}>
                  Sold: {item.totalUnitsSold} units · Margin: {item.marginPercent.toFixed(0)}%
                </Text>
              </View>
              <View style={styles.productProfit}>
                <Text style={styles.profitValue}>₹{item.totalProfit.toFixed(0)}</Text>
                <Text style={styles.profitLabel}>profit</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Low Margin Products */}
      {lowPerformers.length > 0 && (
        <View style={[styles.sectionCard, shadows.sm]}>
          <Text style={styles.sectionTitle}>Low Margin Products</Text>
          <Text style={styles.sectionSubtitle}>Consider adjusting prices or costs</Text>
          {lowPerformers.map((item) => (
            <View key={item.id} style={styles.productRow}>
              <View style={[styles.marginIndicator, { backgroundColor: item.marginPercent < 20 ? colors.error : colors.warning }]}>
                <Text style={styles.marginText}>{item.marginPercent.toFixed(0)}%</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productDetail}>
                  Cost: ₹{item.costPrice} · Sale: ₹{item.salePrice}
                </Text>
              </View>
              <View style={styles.productProfit}>
                <Text style={[styles.profitValue, { color: item.marginPercent < 20 ? colors.error : colors.warning }]}>
                  ₹{item.totalProfit.toFixed(0)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recent Purchases */}
      {purchases.length > 0 && (
        <View style={[styles.sectionCard, shadows.sm]}>
          <Text style={styles.sectionTitle}>Recent Stock Purchases</Text>
          {purchases.slice(0, 5).map((purchase) => (
            <View key={purchase.id} style={styles.purchaseRow}>
              <View style={styles.purchaseIcon}>
                <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
              </View>
              <View style={styles.purchaseInfo}>
                <Text style={styles.purchaseItem}>{purchase.itemName}</Text>
                <Text style={styles.purchaseDetail}>
                  {purchase.quantity} units @ ₹{purchase.unitCost} each
                </Text>
                {purchase.supplier && (
                  <Text style={styles.purchaseSupplier}>from {purchase.supplier}</Text>
                )}
              </View>
              <View style={styles.purchaseTotal}>
                <Text style={styles.purchaseAmount}>₹{purchase.totalCost.toFixed(0)}</Text>
                <Text style={styles.purchaseDate}>{purchase.purchaseDate}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* All Products Table */}
      <View style={[styles.sectionCard, shadows.sm]}>
        <Text style={styles.sectionTitle}>All Products Summary</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Product</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Stock</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Revenue</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Profit</Text>
        </View>
        {analytics
          .filter(a => a.itemType === 'retail')
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .map(item => (
            <View key={item.id} style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.tableProductName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.tableMargin}>Margin: {item.marginPercent.toFixed(0)}%</Text>
              </View>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>₹{item.totalRevenue.toFixed(0)}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: item.totalProfit >= 0 ? colors.success : colors.error }]}>
                ₹{item.totalProfit.toFixed(0)}
              </Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  periodButtonTextActive: {
    color: colors.textInverse,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textInverse,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textInverse,
    opacity: 0.9,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.md,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movementItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  movementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movementValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  movementLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  movementDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginHorizontal: theme.spacing.md,
  },
  stockProgress: {
    marginTop: theme.spacing.md,
  },
  stockProgressBar: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  stockProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  stockProgressText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  marginIndicator: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  marginText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  productDetail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  productProfit: {
    alignItems: 'flex-end',
  },
  profitValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  profitLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  purchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  purchaseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  purchaseInfo: {
    flex: 1,
  },
  purchaseItem: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  purchaseDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  purchaseSupplier: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  purchaseTotal: {
    alignItems: 'flex-end',
  },
  purchaseAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  purchaseDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  tableMargin: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  tableCell: {
    fontSize: 13,
    color: colors.text,
  },
});
