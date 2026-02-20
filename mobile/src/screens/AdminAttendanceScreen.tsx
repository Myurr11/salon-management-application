import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { DatePickerField } from '../components/DatePickerField';
import { useData } from '../context/DataContext';
import { colors, theme } from '../theme';
import type { Attendance } from '../types';

interface Props {
  navigation: any;
}

export const AdminAttendanceScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers } = useAuth();
  const { getAttendance } = useData();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, [selectedStaffId, selectedDate]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const filters: any = { date: selectedDate };
      if (selectedStaffId) {
        filters.staffId = selectedStaffId;
      }
      const records = await getAttendance(filters);
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--';
    return new Date(timeString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateHours = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return '--';
    const inTime = new Date(checkIn);
    const outTime = new Date(checkOut);
    const diffMs = outTime.getTime() - inTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return `${diffHours.toFixed(1)} hrs`;
  };

  const renderAttendance = ({ item }: { item: Attendance }) => (
    <View style={styles.attendanceCard}>
      <View style={styles.attendanceHeader}>
        <Text style={styles.staffName}>{item.staffName}</Text>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.attendanceDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>{formatDate(item.attendanceDate)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Check In:</Text>
          <Text style={styles.detailValue}>{formatTime(item.checkInTime)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Check Out:</Text>
          <Text style={styles.detailValue}>{formatTime(item.checkOutTime)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Hours:</Text>
          <Text style={styles.detailValue}>{calculateHours(item.checkInTime, item.checkOutTime)}</Text>
        </View>
      </View>
    </View>
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'present':
        return { backgroundColor: `${colors.success}20`, borderColor: colors.success };
      case 'late':
        return { backgroundColor: `${colors.warning}20`, borderColor: colors.warning };
      case 'half_day':
        return { backgroundColor: `${colors.chartBlue}20`, borderColor: colors.chartBlue };
      case 'absent':
        return { backgroundColor: `${colors.error}20`, borderColor: colors.error };
      default:
        return { backgroundColor: `${colors.textMuted}20`, borderColor: colors.textMuted };
    }
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
      <View style={styles.filters}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Date:</Text>
          <DatePickerField
            value={selectedDate}
            onChange={setSelectedDate}
            placeholder="Select date"
            style={styles.dateInput}
          />
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Staff:</Text>
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
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance Records</Text>
        <Text style={styles.headerSubtitle}>{attendanceRecords.length} record(s)</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : attendanceRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No attendance records found for selected date.</Text>
        </View>
      ) : (
        <FlatList
          data={attendanceRecords}
          keyExtractor={item => item.id}
          renderItem={renderAttendance}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surface,
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
  header: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  attendanceCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  attendanceDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
});
