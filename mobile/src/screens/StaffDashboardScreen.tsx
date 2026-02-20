import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { Attendance, Visit } from '../types';
import { colors, theme, shadows } from '../theme';

interface Props {
  navigation: any;
}

export const StaffDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { getStaffTodayStats, getTodayAttendance, checkIn, checkOut, refreshData } = useData();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    if (user?.id && user?.role === 'staff') {
      getTodayAttendance(user.id).then(setTodayAttendance);
    } else {
      setTodayAttendance(null);
    }
  }, [user?.id, user?.role, getTodayAttendance]);

  const handleCheckIn = async () => {
    if (!user?.id) return;
    setAttendanceLoading(true);
    try {
      await checkIn(user.id);
      await refreshData();
      const next = await getTodayAttendance(user.id);
      setTodayAttendance(next);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user?.id) return;
    setAttendanceLoading(true);
    try {
      await checkOut(user.id);
      await refreshData();
      const next = await getTodayAttendance(user.id);
      setTodayAttendance(next);
    } finally {
      setAttendanceLoading(false);
    }
  };

  if (!user || user.role !== 'staff') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No staff user selected.</Text>
      </View>
    );
  }

  const { totalRevenue, customerCount, visits } = useMemo(() => {
    if (!user?.id) return { totalRevenue: 0, customerCount: 0, visits: [] };
    return getStaffTodayStats(user.id);
  }, [getStaffTodayStats, user?.id]);

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--';
    return new Date(timeString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const progressPercent = visits.length > 0 ? Math.min(100, (visits.length / 12) * 100) : 0;

  const renderVisit = ({ item }: { item: Visit }) => (
    <TouchableOpacity
      style={[styles.visitCard, shadows.sm]}
      onPress={() => navigation.navigate('BillView', { visitId: item.id })}
    >
      <View style={styles.visitIcon}>
        <Text style={styles.visitIconText}>👤</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.visitCustomer}>{item.customerName}</Text>
        <Text style={styles.visitServices} numberOfLines={1}>
          {item.services.map(s => s.serviceName).join(', ')}
          {item.products.length > 0 && ` + ${item.products.length} product(s)`}
        </Text>
      </View>
      <Text style={styles.visitAmount}>₹{item.total.toFixed(0)}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Welcome Back,</Text>
          <Text style={styles.headerTitle}>{user.name}!</Text>
          <Text style={styles.headerSubtitle}>Here is your performance for today</Text>
        </View>
        <TouchableOpacity style={[styles.logoutButton, shadows.sm]} onPress={logout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Progress card - Material U style */}
      <View style={[styles.progressCard, shadows.md]}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressIcon}>📊</Text>
          <Text style={styles.progressTitle}>Your progress now</Text>
        </View>
        <Text style={styles.progressText}>
          {visits.length}/12 Task Complete · {Math.round(progressPercent)}%
        </Text>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(progressPercent, 100)}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.attendanceCard}>
        <Text style={styles.attendanceTitle}>Attendance</Text>
        <View style={styles.attendanceTimes}>
          <View style={styles.attendanceTimeItem}>
            <Text style={styles.attendanceTimeLabel}>Check In</Text>
            <Text style={styles.attendanceTimeValue}>
              {formatTime(todayAttendance?.checkInTime)}
            </Text>
          </View>
          <View style={styles.attendanceTimeItem}>
            <Text style={styles.attendanceTimeLabel}>Check Out</Text>
            <Text style={styles.attendanceTimeValue}>
              {formatTime(todayAttendance?.checkOutTime)}
            </Text>
          </View>
        </View>
        <View style={styles.attendanceActions}>
          {!todayAttendance?.checkInTime ? (
            <TouchableOpacity
              style={[styles.attendanceButton, styles.checkInButton]}
              onPress={handleCheckIn}
              disabled={attendanceLoading}
            >
              <Text style={styles.attendanceButtonText}>
                {attendanceLoading ? 'Processing...' : 'Check In'}
              </Text>
            </TouchableOpacity>
          ) : !todayAttendance?.checkOutTime ? (
            <TouchableOpacity
              style={[styles.attendanceButton, styles.checkOutButton]}
              onPress={handleCheckOut}
              disabled={attendanceLoading}
            >
              <Text style={styles.attendanceButtonText}>
                {attendanceLoading ? 'Processing...' : 'Check Out'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.attendanceComplete}>
              <Text style={styles.attendanceCompleteText}>✓ Attendance Complete</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statCardLeft, shadows.sm]}>
          <Text style={styles.statLabel}>Today Revenue</Text>
          <Text style={styles.statValue}>₹{totalRevenue.toFixed(0)}</Text>
        </View>
        <View style={[styles.statCard, styles.statCardRight, shadows.sm]}>
          <Text style={styles.statLabel}>Customers</Text>
          <Text style={styles.statValue}>{customerCount}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('StaffBilling')}
      >
        <Text style={styles.primaryButtonText}>Add New Customer Visit</Text>
      </TouchableOpacity>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, shadows.sm]}
          onPress={() => navigation.navigate('CustomerList')}
        >
          <Text style={styles.quickActionText}>📋 Customers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionButton, shadows.sm]}
          onPress={() => navigation.navigate('InventoryView')}
        >
          <Text style={styles.quickActionText}>📦 Inventory</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Today&apos;s Customers</Text>

      {visits.length === 0 ? (
        <Text style={styles.emptyText}>No customers recorded yet today.</Text>
      ) : (
        <View style={{ paddingBottom: 32 }}>
          {visits.map(item => (
            <View key={item.id}>{renderVisit({ item })}</View>
          ))}
        </View>
      )}
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
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  logoutButton: {
    backgroundColor: colors.errorMuted,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
  },
  logoutButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  progressCard: {
    backgroundColor: colors.accentLavender,
    borderRadius: theme.radius.xxl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(103, 80, 164, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  attendanceCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    ...shadows.sm,
  },
  attendanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  attendanceTimes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  attendanceTimeItem: {
    alignItems: 'center',
  },
  attendanceTimeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  attendanceTimeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  attendanceActions: {
    marginTop: 8,
  },
  attendanceButton: {
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
  },
  checkInButton: {
    backgroundColor: colors.success,
  },
  checkOutButton: {
    backgroundColor: colors.warning,
  },
  attendanceButtonText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  attendanceComplete: {
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.successMuted,
    alignItems: 'center',
  },
  attendanceCompleteText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  statCardLeft: { marginRight: 6 },
  statCardRight: { marginLeft: 6 },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
  visitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  visitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitIconText: {
    fontSize: 18,
  },
  visitCustomer: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  visitServices: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  visitAmount: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: colors.error,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.xl,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
  },
  quickActionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
});
