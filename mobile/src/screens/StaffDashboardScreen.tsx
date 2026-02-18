import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { Attendance, Visit } from '../types';

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
    } catch (_e) {
      // Loading cleared in finally
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
    } catch (_e) {
      // Loading cleared in finally
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
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

  const renderVisit = ({ item }: { item: Visit }) => (
    <TouchableOpacity
      style={styles.visitCard}
      onPress={() => navigation.navigate('BillView', { visitId: item.id })}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.visitCustomer}>{item.customerName}</Text>
        <Text style={styles.visitServices} numberOfLines={1}>
          {item.services.map(s => s.serviceName).join(', ')}
          {item.products.length > 0 && ` + ${item.products.length} product(s)`}
        </Text>
      </View>
      <Text style={styles.visitAmount}>₹ {item.total.toFixed(0)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Hi, {user.name}</Text>
          <Text style={styles.headerSubtitle}>Here is your performance for today</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
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
        <View style={[styles.statCard, { marginRight: 6 }]}>
          <Text style={styles.statLabel}>Today Revenue</Text>
          <Text style={styles.statValue}>₹ {totalRevenue.toFixed(0)}</Text>
        </View>
        <View style={[styles.statCard, { marginLeft: 6 }]}>
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
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('CustomerList')}
        >
          <Text style={styles.quickActionText}>📋 Customers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('InventoryView')}
        >
          <Text style={styles.quickActionText}>📦 Inventory</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Today&apos;s Customers</Text>

      {visits.length === 0 ? (
        <Text style={styles.emptyText}>No customers recorded yet today.</Text>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={item => item.id}
          renderItem={renderVisit}
          contentContainerStyle={{ paddingBottom: 32 }}
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
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
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
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#020617',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  statLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22c55e',
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 10,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  visitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 10,
  },
  visitCustomer: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  visitServices: {
    color: '#6b7280',
    fontSize: 12,
  },
  visitAmount: {
    color: '#f97316',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  errorText: {
    color: 'red',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  quickActionText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
  },
  attendanceCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  attendanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
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
    color: '#9ca3af',
    marginBottom: 4,
  },
  attendanceTimeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22c55e',
  },
  attendanceActions: {
    marginTop: 8,
  },
  attendanceButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkInButton: {
    backgroundColor: '#22c55e',
  },
  checkOutButton: {
    backgroundColor: '#f97316',
  },
  attendanceButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  attendanceComplete: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1f2937',
    alignItems: 'center',
  },
  attendanceCompleteText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
});

