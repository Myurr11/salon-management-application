import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { DatePickerField } from '../components/DatePickerField';
import { useData } from '../context/DataContext';
import { colors, theme, shadows } from '../theme';
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

  const getStatusIcon = (status: string): keyof typeof MaterialCommunityIcons.glyphMap => {
    switch (status) {
      case 'present': return 'check-circle';
      case 'late': return 'clock-alert';
      case 'half_day': return 'circle-half-full';
      case 'absent': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const renderAttendance = ({ item }: { item: Attendance }) => {
    const statusStyle = getStatusStyle(item.status);
    return (
      <View style={[styles.attendanceCard, shadows.sm]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatarCircle, { backgroundColor: statusStyle.backgroundColor }]}>
            <MaterialCommunityIcons name={getStatusIcon(item.status)} size={22} color={statusStyle.borderColor} />
          </View>
          <View style={styles.staffInfo}>
            <Text style={styles.staffName} numberOfLines={1}>{item.staffName}</Text>
            <View style={[styles.statusPill, { backgroundColor: statusStyle.backgroundColor, borderColor: statusStyle.borderColor }]}>
              <Text style={[styles.statusText, { color: statusStyle.borderColor }]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.hoursContainer}>
            <Text style={styles.hoursLabel}>Hours</Text>
            <Text style={styles.hoursValue}>{calculateHours(item.checkInTime, item.checkOutTime)}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.timeGrid}>
          <View style={styles.timeItem}>
            <MaterialCommunityIcons name="login-variant" size={16} color={colors.success} />
            <Text style={styles.timeLabel}>Check In</Text>
            <Text style={styles.timeValue}>{formatTime(item.checkInTime)}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeItem}>
            <MaterialCommunityIcons name="logout-variant" size={16} color={colors.error} />
            <Text style={styles.timeLabel}>Check Out</Text>
            <Text style={styles.timeValue}>{formatTime(item.checkOutTime)}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeItem}>
            <MaterialCommunityIcons name="calendar" size={16} color={colors.primary} />
            <Text style={styles.timeLabel}>Date</Text>
            <Text style={styles.timeValue}>{formatDate(item.attendanceDate)}</Text>
          </View>
        </View>
      </View>
    );
  };

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

      {loading ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="loading" size={32} color={colors.textMuted} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : attendanceRecords.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="clipboard-text-clock" size={64} color={colors.border} />
          <Text style={styles.emptyText}>No attendance records found</Text>
        </View>
      ) : (
        <FlatList
          data={attendanceRecords}
          keyExtractor={item => item.id}
          renderItem={renderAttendance}
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
    paddingHorizontal: 40,
  },
  filters: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
    fontWeight: '600',
  },
  dateInput: {
    backgroundColor: colors.background,
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
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 20,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: theme.spacing.md,
  },
  attendanceCard: {
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
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  staffInfo: { flex: 1 },
  staffName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  hoursContainer: { alignItems: 'flex-end' },
  hoursLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  hoursValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: theme.spacing.md,
  },
  timeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  timeItem: {
    alignItems: 'center',
    flex: 1,
  },
  timeDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  timeLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  timeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
});
