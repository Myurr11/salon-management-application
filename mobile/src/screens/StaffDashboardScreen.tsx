import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { Attendance, Visit } from '../types';
import { colors, theme, shadows } from '../theme';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface Props {
  navigation: any;
}

export const StaffDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { getStaffTodayStats, getTodayAttendance, checkIn, checkOut, refreshData } = useData();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Staff dashboard is now shared - no individual staff tracking here
  const effectiveStaffId = user?.id;

  useEffect(() => {
    if (effectiveStaffId) {
      getTodayAttendance(effectiveStaffId).then(setTodayAttendance);
    } else {
      setTodayAttendance(null);
    }
  }, [effectiveStaffId, getTodayAttendance]);

  const isSharedTablet = user?.id === 'shared-tablet';

  const handleCheckIn = async () => {
    if (!effectiveStaffId || isSharedTablet) return;
    setAttendanceLoading(true);
    try {
      await checkIn(effectiveStaffId);
      await refreshData();
      const next = await getTodayAttendance(effectiveStaffId);
      setTodayAttendance(next);
    } catch (error: any) {
      // Silently ignore errors for shared tablet
      if (!isSharedTablet) {
        console.error('Check-in error:', error);
      }
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!effectiveStaffId || isSharedTablet) return;
    setAttendanceLoading(true);
    try {
      await checkOut(effectiveStaffId);
      await refreshData();
      const next = await getTodayAttendance(effectiveStaffId);
      setTodayAttendance(next);
    } catch (error: any) {
      // Silently ignore errors for shared tablet
      if (!isSharedTablet) {
        console.error('Check-out error:', error);
      }
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

  // Get all visits for today (shared dashboard shows all salon activity)
  const { totalRevenue, customerCount, visits } = useMemo(() => {
    return getStaffTodayStats('all');
  }, [getStaffTodayStats]);

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--';
    return new Date(timeString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const progressPercent = visits.length > 0 ? Math.min(100, (visits.length / 12) * 100) : 0;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const avatarColors = ['#1e3a5f', '#0d9488', '#059669', '#2563eb', '#7c3aed'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  const renderVisit = ({ item }: { item: Visit }) => (
    <TouchableOpacity
      style={[styles.visitCard, shadows.sm]}
      onPress={() => navigation.navigate('BillView', { visitId: item.id })}
      activeOpacity={0.8}
    >
      <View style={[styles.visitAvatar, { backgroundColor: getAvatarColor(item.customerName) }]}>
        <Text style={styles.visitAvatarText}>{getInitials(item.customerName)}</Text>
      </View>
      <View style={styles.visitContent}>
        <Text style={theme.typography.body} numberOfLines={1}>
          {item.customerName}
        </Text>
        <Text style={[theme.typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
          {item.services.map(s => s.serviceName).join(', ')}
          {item.products.length > 0 && ` + ${item.products.length} product(s)`}
        </Text>
      </View>
      <View style={styles.visitAmountContainer}>
        <Text style={[theme.typography.caption, { color: colors.textMuted }]}>Bill Amount</Text>
        <Text style={[theme.typography.h4, { color: colors.success }]}>
          ₹{item.total.toFixed(0)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={styles.headerContent}>
          <Text style={[theme.typography.bodySmall, { color: colors.textMuted }]}>
            Welcome back,
          </Text>
          <Text style={theme.typography.h2}>
            {user.name}
          </Text>
          <Text style={[theme.typography.caption, { color: colors.accent }]}>
            Staff Dashboard
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
            <MaterialCommunityIcons name="logout" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.progressCard, shadows.md]}>
        <View style={styles.progressHeader}>
          <MaterialCommunityIcons name="chart-line" size={20} color={colors.primary} />
          <Text style={[theme.typography.label, { marginLeft: theme.spacing.sm }]}>
            Today's Progress
          </Text>
        </View>
        <View style={styles.progressRow}>
          <Text style={theme.typography.bodySmall}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{visits.length}</Text>
            <Text style={{ color: colors.textMuted }}> / 12 customers</Text>
          </Text>
          <Text style={[theme.typography.caption, { color: colors.primary }]}>
            {Math.round(progressPercent)}%
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(progressPercent, 100)}%` },
            ]}
          />
        </View>
      </View>

      {/* Attendance section - hidden for shared tablet */}
      {!isSharedTablet && (
        <View style={[styles.attendanceCard, shadows.sm]}>
          <View style={styles.attendanceHeader}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={colors.textSecondary} />
            <Text style={[theme.typography.label, { marginLeft: theme.spacing.sm }]}>
              Attendance
            </Text>
          </View>
          <View style={styles.attendanceTimes}>
            <View style={styles.attendanceTimeItem}>
              <Text style={[theme.typography.caption, { color: colors.textMuted }]}>Check In</Text>
              <Text style={[theme.typography.h3, { color: todayAttendance?.checkInTime ? colors.success : colors.textMuted }]}>
                {formatTime(todayAttendance?.checkInTime)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.attendanceTimeItem}>
              <Text style={[theme.typography.caption, { color: colors.textMuted }]}>Check Out</Text>
              <Text style={[theme.typography.h3, { color: todayAttendance?.checkOutTime ? colors.textSecondary : colors.textMuted }]}>
                {formatTime(todayAttendance?.checkOutTime)}
              </Text>
            </View>
          </View>
          <View style={styles.attendanceActions}>
            {!todayAttendance?.checkInTime ? (
              <Button
                title={attendanceLoading ? 'Processing...' : 'Check In'}
                onPress={handleCheckIn}
                disabled={attendanceLoading}
                variant="primary"
                icon="login-variant"
                fullWidth
              />
            ) : !todayAttendance?.checkOutTime ? (
              <Button
                title={attendanceLoading ? 'Processing...' : 'Check Out'}
                onPress={handleCheckOut}
                disabled={attendanceLoading}
                variant="secondary"
                icon="logout-variant"
                fullWidth
              />
            ) : (
              <View style={styles.attendanceComplete}>
                <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                <Text style={[theme.typography.bodySmall, { color: colors.success, marginLeft: theme.spacing.xs }]}>
                  Attendance Complete
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={[styles.statCard, shadows.sm]}>
          <View style={styles.statIconContainer}>
            <MaterialCommunityIcons name="currency-inr" size={20} color={colors.primary} />
          </View>
          <Text style={[theme.typography.caption, { color: colors.textMuted }]}>Today's Revenue</Text>
          <Text style={[theme.typography.h2, { marginTop: theme.spacing.xs }]}>
            ₹{totalRevenue.toFixed(0)}
          </Text>
        </View>
        <View style={[styles.statCard, shadows.sm]}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.accentGreen }]}>
            <MaterialCommunityIcons name="account-group" size={20} color={colors.success} />
          </View>
          <Text style={[theme.typography.caption, { color: colors.textMuted }]}>Customers</Text>
          <Text style={[theme.typography.h2, { marginTop: theme.spacing.xs }]}>
            {customerCount}
          </Text>
        </View>
      </View>

      <Button
        title="New Customer Visit"
        onPress={() => navigation.navigate('StaffBilling')}
        variant="primary"
        icon="plus"
        size="lg"
        fullWidth
      />

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, shadows.sm]}
          onPress={() => navigation.navigate('CustomerList')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="account-group" size={24} color={colors.primary} />
          <Text style={[theme.typography.bodySmall, { marginTop: theme.spacing.sm }]}>Customers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionButton, shadows.sm]}
          onPress={() => navigation.navigate('InventoryView')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="package-variant" size={24} color={colors.accent} />
          <Text style={[theme.typography.bodySmall, { marginTop: theme.spacing.sm }]}>Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionButton, shadows.sm]}
          onPress={() => navigation.navigate('AppointmentsList')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="calendar-clock" size={24} color={colors.success} />
          <Text style={[theme.typography.bodySmall, { marginTop: theme.spacing.sm }]}>Appointments</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={theme.typography.h3}>Today's Customers</Text>
        {visits.length > 0 && (
          <Badge text={`${visits.length}`} variant="info" size="sm" />
        )}
      </View>

      {visits.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="account-off" size={40} color={colors.border} />
          <Text style={[theme.typography.bodySmall, { color: colors.textMuted, marginTop: theme.spacing.md }]}>
            No customers recorded yet today
          </Text>
        </View>
      ) : (
        <View style={{ paddingBottom: theme.spacing.xxxl }}>
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
    paddingTop: theme.spacing.lg,
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
  headerContent: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: theme.radius.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: theme.radius.xs,
  },
  attendanceCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  attendanceTimes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  attendanceTimeItem: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  attendanceActions: {
    marginTop: theme.spacing.sm,
  },
  attendanceComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: theme.radius.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  visitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  visitAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitAvatarText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  visitContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  visitAmountContainer: {
    alignItems: 'flex-end',
  },
  errorText: {
    color: colors.error,
  },
  quickActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
