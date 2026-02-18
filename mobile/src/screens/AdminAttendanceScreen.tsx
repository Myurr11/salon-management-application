import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
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
        return { backgroundColor: '#22c55e20', borderColor: '#22c55e' };
      case 'late':
        return { backgroundColor: '#f9731620', borderColor: '#f97316' };
      case 'half_day':
        return { backgroundColor: '#3b82f620', borderColor: '#3b82f6' };
      case 'absent':
        return { backgroundColor: '#ef444420', borderColor: '#ef4444' };
      default:
        return { backgroundColor: '#6b728020', borderColor: '#6b7280' };
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
          <TextInput
            style={styles.dateInput}
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#6b7280"
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
    backgroundColor: '#020617',
    paddingTop: 60,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: 'white',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
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
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  attendanceCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
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
    color: '#e5e7eb',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
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
    color: '#9ca3af',
  },
  detailValue: {
    fontSize: 13,
    color: '#e5e7eb',
    fontWeight: '500',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});
