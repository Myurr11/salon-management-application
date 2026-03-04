import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, theme, shadows } from '../theme';
import { Button } from '../components/ui/Button';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  navigation: any;
}

interface StaffReport {
  staffId: string;
  staffName: string;
  totalCustomers: number;
  totalRevenue: number;
  totalServices: number;
  totalProducts: number;
  avgBillValue: number;
  uniqueCustomers: string[];
}

export const StaffReportScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers } = useAuth();
  const { visits } = useData();

  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | 'all'>('all');

  const generateReport = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const reportMap: Record<string, StaffReport> = {};

    // Initialize all staff members
    staffMembers.forEach(staff => {
      reportMap[staff.id] = {
        staffId: staff.id,
        staffName: staff.name,
        totalCustomers: 0,
        totalRevenue: 0,
        totalServices: 0,
        totalProducts: 0,
        avgBillValue: 0,
        uniqueCustomers: [],
      };
    });

    // Process visits within date range
    visits.forEach(visit => {
      const visitDate = new Date(visit.date);
      if (visitDate < start || visitDate > end) return;

      // Count for attending staff
      if (visit.attendingStaff && visit.attendingStaff.length > 0) {
        visit.attendingStaff.forEach(staff => {
          if (reportMap[staff.staffId]) {
            const report = reportMap[staff.staffId];
            report.totalCustomers += 1;
            report.totalRevenue += staff.revenueShare;
            report.totalServices += visit.services.length;
            report.totalProducts += visit.products.reduce((sum, p) => sum + p.quantity, 0);
            if (!report.uniqueCustomers.includes(visit.customerId)) {
              report.uniqueCustomers.push(visit.customerId);
            }
          }
        });
      } else {
        // Fallback to primary staff
        if (reportMap[visit.staffId]) {
          const report = reportMap[visit.staffId];
          report.totalCustomers += 1;
          report.totalRevenue += visit.total;
          report.totalServices += visit.services.length;
          report.totalProducts += visit.products.reduce((sum, p) => sum + p.quantity, 0);
          if (!report.uniqueCustomers.includes(visit.customerId)) {
            report.uniqueCustomers.push(visit.customerId);
          }
        }
      }
    });

    // Calculate averages
    Object.values(reportMap).forEach(report => {
      report.avgBillValue = report.totalCustomers > 0 
        ? report.totalRevenue / report.totalCustomers 
        : 0;
    });

    return Object.values(reportMap).filter(r => r.totalCustomers > 0);
  }, [visits, staffMembers, startDate, endDate]);

  const filteredReport = useMemo(() => {
    if (selectedStaffId === 'all') return generateReport;
    return generateReport.filter(r => r.staffId === selectedStaffId);
  }, [generateReport, selectedStaffId]);

  const totals = useMemo(() => {
    return filteredReport.reduce(
      (acc, curr) => ({
        customers: acc.customers + curr.totalCustomers,
        revenue: acc.revenue + curr.totalRevenue,
        services: acc.services + curr.totalServices,
        products: acc.products + curr.totalProducts,
        uniqueCustomers: new Set([...acc.uniqueCustomers, ...curr.uniqueCustomers]),
      }),
      { customers: 0, revenue: 0, services: 0, products: 0, uniqueCustomers: new Set<string>() }
    );
  }, [filteredReport]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Admin access required.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="file-chart" size={28} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Staff Performance Report</Text>
          <Text style={styles.headerSubtitle}>Generate detailed reports</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Date Range Selection */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="calendar-start" size={20} color={colors.primary} />
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateLabel}>From</Text>
                <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
              </View>
            </TouchableOpacity>

            <MaterialCommunityIcons name="arrow-right" size={24} color={colors.textMuted} />

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="calendar-end" size={20} color={colors.primary} />
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateLabel}>To</Text>
                <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={onStartDateChange}
              maximumDate={endDate}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display="default"
              onChange={onEndDateChange}
              minimumDate={startDate}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* Staff Filter */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Filter by Staff</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, selectedStaffId === 'all' && styles.filterChipActive]}
              onPress={() => setSelectedStaffId('all')}
            >
              <Text style={[styles.filterChipText, selectedStaffId === 'all' && styles.filterChipTextActive]}>
                All Staff
              </Text>
            </TouchableOpacity>
            {staffMembers.map(staff => (
              <TouchableOpacity
                key={staff.id}
                style={[styles.filterChip, selectedStaffId === staff.id && styles.filterChipActive]}
                onPress={() => setSelectedStaffId(staff.id)}
              >
                <Text style={[styles.filterChipText, selectedStaffId === staff.id && styles.filterChipTextActive]}>
                  {staff.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, shadows.sm]}>
            <MaterialCommunityIcons name="account-group" size={24} color={colors.primary} />
            <Text style={styles.summaryValue}>{totals.customers}</Text>
            <Text style={styles.summaryLabel}>Total Customers</Text>
          </View>
          <View style={[styles.summaryCard, shadows.sm]}>
            <MaterialCommunityIcons name="currency-inr" size={24} color={colors.success} />
            <Text style={styles.summaryValue}>₹{totals.revenue.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, shadows.sm]}>
            <MaterialCommunityIcons name="spa" size={24} color={colors.accent} />
            <Text style={styles.summaryValue}>{totals.services}</Text>
            <Text style={styles.summaryLabel}>Services</Text>
          </View>
          <View style={[styles.summaryCard, shadows.sm]}>
            <MaterialCommunityIcons name="package-variant" size={24} color={colors.chartPurple} />
            <Text style={styles.summaryValue}>{totals.products}</Text>
            <Text style={styles.summaryLabel}>Products</Text>
          </View>
        </View>

        {/* Unique Customers */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.uniqueCustomersHeader}>
            <MaterialCommunityIcons name="account-check" size={20} color={colors.success} />
            <Text style={styles.uniqueCustomersText}>
              {totals.uniqueCustomers.size} Unique Customers
            </Text>
          </View>
        </View>

        {/* Detailed Report */}
        <Text style={styles.reportTitle}>Detailed Report</Text>
        {filteredReport.length === 0 ? (
          <View style={[styles.emptyCard, shadows.sm]}>
            <MaterialCommunityIcons name="chart-line" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No data found for selected date range</Text>
          </View>
        ) : (
          filteredReport.map((report, index) => (
            <View key={report.staffId} style={[styles.reportCard, shadows.sm]}>
              <View style={styles.reportHeader}>
                <View style={[styles.staffAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.staffAvatarText}>{getInitials(report.staffName)}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{report.staffName}</Text>
                  <View style={styles.rankBadge}>
                    <MaterialCommunityIcons name="trophy" size={12} color={colors.chartAmber} />
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.reportStatsGrid}>
                <View style={styles.reportStat}>
                  <Text style={styles.reportStatValue}>{report.totalCustomers}</Text>
                  <Text style={styles.reportStatLabel}>Customers</Text>
                </View>
                <View style={styles.reportStat}>
                  <Text style={styles.reportStatValue}>₹{report.totalRevenue.toFixed(0)}</Text>
                  <Text style={styles.reportStatLabel}>Revenue</Text>
                </View>
                <View style={styles.reportStat}>
                  <Text style={styles.reportStatValue}>{report.totalServices}</Text>
                  <Text style={styles.reportStatLabel}>Services</Text>
                </View>
                <View style={styles.reportStat}>
                  <Text style={styles.reportStatValue}>{report.totalProducts}</Text>
                  <Text style={styles.reportStatLabel}>Products</Text>
                </View>
              </View>

              <View style={styles.avgBillRow}>
                <MaterialCommunityIcons name="cash-multiple" size={16} color={colors.textMuted} />
                <Text style={styles.avgBillText}>
                  Avg Bill: <Text style={styles.avgBillValue}>₹{report.avgBillValue.toFixed(0)}</Text>
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
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
  headerContent: {
    flex: 1,
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
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: theme.spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  dateTextContainer: {
    marginLeft: theme.spacing.sm,
  },
  dateLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: theme.spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: theme.spacing.sm,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  uniqueCustomersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uniqueCustomersText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
    marginLeft: theme.spacing.sm,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: theme.spacing.md,
  },
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  staffAvatar: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  staffInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentAmber,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    marginTop: 4,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.chartAmber,
    marginLeft: 4,
  },
  reportStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  reportStat: {
    alignItems: 'center',
  },
  reportStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  reportStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  avgBillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  avgBillText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  avgBillValue: {
    fontWeight: '700',
    color: colors.success,
  },
});
