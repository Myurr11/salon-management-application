import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, theme, shadows } from '../theme';

interface Props {
  navigation: any;
}

export const AdminStaffPerformanceScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { visits } = useData();
  const { staffMembers } = useAuth();

  const staffStats = useMemo(() => {
    const map: Record<
      string,
      { name: string; customers: number; revenue: number; servicesCount: number; productsCount: number }
    > = {};
    staffMembers.forEach(s => {
      map[s.id] = { name: s.name, customers: 0, revenue: 0, servicesCount: 0, productsCount: 0 };
    });
    visits.forEach(v => {
      if (map[v.staffId]) {
        map[v.staffId].customers += 1;
        map[v.staffId].revenue += v.total;
        map[v.staffId].servicesCount += v.services.length;
        map[v.staffId].productsCount += v.products.reduce((sum, p) => sum + p.quantity, 0);
      }
    });
    return Object.entries(map).map(([staffId, stats]) => ({
      staffId,
      ...stats,
      avgBill: stats.customers > 0 ? stats.revenue / stats.customers : 0,
    }));
  }, [visits, staffMembers]);

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
});
