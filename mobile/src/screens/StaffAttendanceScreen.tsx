import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, theme, shadows } from '../theme';
import { Button } from '../components/ui/Button';
import type { Attendance } from '../types';

interface Props {
  navigation: any;
}

type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent';

export const StaffAttendanceScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers, selectedStaffId, setSelectedStaff, isSharedTabletMode, getEffectiveStaffId } = useAuth();
  const { checkIn, checkOut, getTodayAttendance, refreshData } = useData();
  
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('present');

  // In individual login mode, only show the logged-in staff member
  // In shared tablet mode, show all staff members
  const displayableStaffMembers = useMemo(() => {
    if (isSharedTabletMode) {
      return staffMembers;
    }
    // Individual login mode - only show self
    return staffMembers.filter(s => s.id === user?.id);
  }, [staffMembers, user?.id, isSharedTabletMode]);

  const effectiveStaffId = getEffectiveStaffId();
  const selectedStaff = staffMembers.find(s => s.id === effectiveStaffId);

  useEffect(() => {
    if (effectiveStaffId) {
      loadAttendance();
    }
  }, [effectiveStaffId]);

  const loadAttendance = async () => {
    if (!selectedStaffId) return;
    const attendance = await getTodayAttendance(selectedStaffId);
    setTodayAttendance(attendance);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (index: number) => {
    const colors = ['#1e3a5f', '#0d9488', '#059669', '#2563eb', '#7c3aed', '#d97706'];
    return colors[index % colors.length];
  };

  const handleStaffSelect = (staffId: string) => {
    // Only allow selection in shared tablet mode
    if (isSharedTabletMode) {
      setSelectedStaff(staffId);
    }
  };

  const handleCheckIn = async () => {
    const staffId = getEffectiveStaffId();
    if (!staffId) {
      Alert.alert('Error', 'No staff member selected.');
      return;
    }
    setLoading(true);
    try {
      await checkIn(staffId);
      await refreshData();
      await loadAttendance();
      Alert.alert('Success', 'Check-in recorded successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check in.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    const staffId = getEffectiveStaffId();
    if (!staffId) {
      Alert.alert('Error', 'No staff member selected.');
      return;
    }
    setLoading(true);
    try {
      await checkOut(staffId);
      await refreshData();
      await loadAttendance();
      Alert.alert('Success', 'Check-out recorded successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check out.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--:--';
    return new Date(timeString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'present': return colors.success;
      case 'late': return colors.warning;
      case 'half_day': return colors.info;
      case 'absent': return colors.error;
      default: return colors.textMuted;
    }
  };

  const getStatusIcon = (status?: string): keyof typeof MaterialCommunityIcons.glyphMap => {
    switch (status) {
      case 'present': return 'check-circle';
      case 'late': return 'clock-alert';
      case 'half_day': return 'circle-half-full';
      case 'absent': return 'close-circle';
      default: return 'help-circle';
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="clock-check" size={32} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Mark Attendance</Text>
          <Text style={styles.headerSubtitle}>
            {isSharedTabletMode 
              ? 'Select your name and mark attendance' 
              : 'Mark your attendance for today'}
          </Text>
        </View>

        {/* Staff Selection - Only show in shared tablet mode */}
        {isSharedTabletMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Staff Member</Text>
            <View style={styles.staffGrid}>
              {displayableStaffMembers.map((staff, index) => (
                <TouchableOpacity
                  key={staff.id}
                  style={[
                    styles.staffCard,
                    shadows.sm,
                    effectiveStaffId === staff.id && styles.staffCardSelected,
                  ]}
                  onPress={() => handleStaffSelect(staff.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.staffAvatar, { backgroundColor: getAvatarColor(index) }]}>
                    <Text style={styles.staffAvatarText}>{getInitials(staff.name)}</Text>
                  </View>
                  <Text style={styles.staffName} numberOfLines={2}>
                    {staff.name}
                  </Text>
                  {effectiveStaffId === staff.id && (
                    <View style={styles.selectedIndicator}>
                      <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Selected Staff Info */}
        {selectedStaff && (
          <View style={[styles.selectedStaffCard, shadows.md]}>
            <View style={styles.selectedStaffHeader}>
              <View style={[styles.selectedStaffAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.selectedStaffAvatarText}>
                  {getInitials(selectedStaff.name)}
                </Text>
              </View>
              <View style={styles.selectedStaffInfo}>
                <Text style={styles.selectedStaffName}>{selectedStaff.name}</Text>
                {selectedStaff.branchName && (
                  <View style={styles.branchChip}>
                    <MaterialCommunityIcons name="office-building" size={12} color={colors.textMuted} />
                    <Text style={styles.branchText}>{selectedStaff.branchName}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Attendance Status */}
            {todayAttendance?.checkInTime ? (
              <View style={styles.attendanceStatus}>
                <View style={styles.timeRow}>
                  <View style={styles.timeItem}>
                    <MaterialCommunityIcons name="login" size={20} color={colors.success} />
                    <Text style={styles.timeLabel}>Check In</Text>
                    <Text style={styles.timeValue}>{formatTime(todayAttendance.checkInTime)}</Text>
                  </View>
                  <View style={styles.timeDivider} />
                  <View style={styles.timeItem}>
                    <MaterialCommunityIcons 
                      name={todayAttendance.checkOutTime ? "logout" : "timelapse"} 
                      size={20} 
                      color={todayAttendance.checkOutTime ? colors.textSecondary : colors.warning} 
                    />
                    <Text style={styles.timeLabel}>Check Out</Text>
                    <Text style={[styles.timeValue, !todayAttendance.checkOutTime && { color: colors.warning }]}>
                      {formatTime(todayAttendance.checkOutTime) || 'Pending'}
                    </Text>
                  </View>
                </View>

                {todayAttendance.checkOutTime ? (
                  <View style={styles.completedBadge}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                    <Text style={styles.completedText}>Attendance Complete</Text>
                  </View>
                ) : (
                  <Button
                    title={loading ? 'Processing...' : 'Check Out'}
                    onPress={handleCheckOut}
                    disabled={loading}
                    variant="secondary"
                    icon="logout-variant"
                    fullWidth
                    style={{ marginTop: theme.spacing.md }}
                  />
                )}
              </View>
            ) : (
              <View style={styles.checkInSection}>
                <Text style={styles.checkInPrompt}>Not checked in yet today</Text>
                <Button
                  title={loading ? 'Processing...' : 'Check In Now'}
                  onPress={handleCheckIn}
                  disabled={loading}
                  variant="primary"
                  icon="login-variant"
                  fullWidth
                />
              </View>
            )}
          </View>
        )}

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.primary} />
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: theme.spacing.md,
  },
  staffGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  staffCard: {
    width: '30%',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  staffCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primaryContainer,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  staffAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textInverse,
  },
  staffName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  selectedStaffCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedStaffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedStaffAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  selectedStaffAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textInverse,
  },
  selectedStaffInfo: {
    flex: 1,
  },
  selectedStaffName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
  },
  branchText: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 4,
  },
  attendanceStatus: {
    paddingTop: theme.spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.md,
  },
  timeItem: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  timeDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successLight,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: 8,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  checkInSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  checkInPrompt: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});
