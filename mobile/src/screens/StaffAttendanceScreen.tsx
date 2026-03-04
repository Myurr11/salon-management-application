import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, theme, shadows } from '../theme';
import { Button } from '../components/ui/Button';
import type { Attendance, StaffMember } from '../types';
import * as supabaseService from '../services/supabaseService';
import bcrypt from 'bcryptjs';
import * as ImagePicker from 'expo-image-picker';
import * as attendancePhotoService from '../services/attendancePhotoService';

interface Props {
  navigation: any;
}

type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent';

export const StaffAttendanceScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers } = useAuth();
  const { attendance, checkIn, checkOut, refreshData } = useData();

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<'checkIn' | 'checkOut' | null>(null);

  const isSharedTablet = user?.id === 'shared-tablet';

  useEffect(() => {
    refreshData();
    attendancePhotoService.cleanupOldPhotos().catch(() => {});
  }, [refreshData]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todaysAttendanceByStaffId = useMemo(() => {
    const map = new Map<string, Attendance>();
    attendance
      .filter(record => record.attendanceDate === todayStr)
      .forEach(record => {
        map.set(record.staffId, record);
      });
    return map;
  }, [attendance, todayStr]);

  const displayableStaffMembers: StaffMember[] = useMemo(
    () => staffMembers,
    [staffMembers],
  );

  const selectedStaff = useMemo(
    () => displayableStaffMembers.find(s => s.id === selectedStaffId) || null,
    [displayableStaffMembers, selectedStaffId],
  );

  const selectedAttendance = selectedStaff
    ? todaysAttendanceByStaffId.get(selectedStaff.id) ?? null
    : null;

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
    setSelectedStaffId(staffId);
    setPassword('');
    setPendingAction(null);
  };

  const ensureCanPerformAction = (action: 'checkIn' | 'checkOut'): boolean => {
    if (!selectedStaff) {
      Alert.alert('Error', 'Please select a staff member first.');
      return false;
    }
    const record = todaysAttendanceByStaffId.get(selectedStaff.id);
    if (action === 'checkIn' && record?.checkInTime) {
      Alert.alert('Already Marked', 'Check-in has already been recorded for today.');
      return false;
    }
    if (action === 'checkOut') {
      if (!record?.checkInTime) {
        Alert.alert('Error', 'Please check in before checking out.');
        return false;
      }
      if (record.checkOutTime) {
        Alert.alert('Already Marked', 'Check-out has already been recorded for today.');
        return false;
      }
    }
    return true;
  };

  const openPasswordModal = (action: 'checkIn' | 'checkOut') => {
    if (!ensureCanPerformAction(action)) return;
    setPendingAction(action);
    setPassword('');
    setPasswordModalVisible(true);
  };

  const verifyStaffPassword = async (staffId: string, plainPassword: string): Promise<boolean> => {
    const staff = await supabaseService.getStaffById(staffId);
    if (!staff || !staff.password_hash) {
      return false;
    }
    return bcrypt.compare(plainPassword, staff.password_hash);
  };

  const handleConfirmPassword = async () => {
    if (!selectedStaff || !pendingAction) {
      setPasswordModalVisible(false);
      return;
    }
    if (!password) {
      Alert.alert('Required', 'Please enter the password.');
      return;
    }
    setLoading(true);
    try {
      const isValid = await verifyStaffPassword(selectedStaff.id, password);
      if (!isValid) {
        Alert.alert('Invalid Password', 'The password you entered is incorrect.');
        return;
      }

      // Ask for camera permission and capture photo
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to capture attendance photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.6,
        base64: false,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        Alert.alert('Cancelled', 'Photo was not captured. Attendance not updated.');
        return;
      }

      const asset = result.assets[0];

      // Save photo to local storage (2-day retention handled by service)
      try {
        await attendancePhotoService.savePhotoFromTempUri(asset.uri, {
          staffId: selectedStaff.id,
          staffName: selectedStaff.name,
          attendanceDate: todayStr,
          type: pendingAction,
        });
      } catch {
        // If photo saving fails, we still allow attendance to be marked
      }

      if (pendingAction === 'checkIn') {
        await checkIn(selectedStaff.id);
      } else {
        await checkOut(selectedStaff.id);
      }

      await refreshData();
      setPasswordModalVisible(false);
      setPassword('');
      setPendingAction(null);
      Alert.alert('Success', 'Attendance updated successfully.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update attendance.');
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

  if (!user || user.role !== 'staff' || !isSharedTablet) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>
            This attendance page is only available on the shared salon tablet login.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
            Select your name and mark attendance using your personal password
          </Text>
        </View>

        {/* Staff Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Staff Member</Text>
          <View style={styles.staffGrid}>
            {displayableStaffMembers.map((staff, index) => {
              const record = todaysAttendanceByStaffId.get(staff.id) || null;
              const isSelected = selectedStaffId === staff.id;
              return (
                <TouchableOpacity
                  key={staff.id}
                  style={[
                    styles.staffCard,
                    shadows.sm,
                    isSelected && styles.staffCardSelected,
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
                  <Text style={styles.staffStatusSmall}>
                    {record?.checkInTime
                      ? record.checkOutTime
                        ? 'Done for today'
                        : 'Checked in'
                      : 'Not marked'}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Staff Info & Actions */}
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
            {selectedAttendance?.checkInTime ? (
              <View style={styles.attendanceStatus}>
                <View style={styles.timeRow}>
                  <View style={styles.timeItem}>
                    <MaterialCommunityIcons name="login" size={20} color={colors.success} />
                    <Text style={styles.timeLabel}>Check In</Text>
                    <Text style={styles.timeValue}>{formatTime(selectedAttendance.checkInTime)}</Text>
                  </View>
                  <View style={styles.timeDivider} />
                  <View style={styles.timeItem}>
                    <MaterialCommunityIcons 
                      name={selectedAttendance.checkOutTime ? "logout" : "timelapse"} 
                      size={20} 
                      color={selectedAttendance.checkOutTime ? colors.textSecondary : colors.warning} 
                    />
                    <Text style={styles.timeLabel}>Check Out</Text>
                    <Text style={[styles.timeValue, !selectedAttendance.checkOutTime && { color: colors.warning }]}>
                      {formatTime(selectedAttendance.checkOutTime) || 'Pending'}
                    </Text>
                  </View>
                </View>

                {selectedAttendance.checkOutTime ? (
                  <View style={styles.completedBadge}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                    <Text style={styles.completedText}>Attendance Complete</Text>
                  </View>
                ) : (
                  <Button
                    title={loading ? 'Processing...' : 'Check Out'}
                    onPress={() => openPasswordModal('checkOut')}
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
                  onPress={() => openPasswordModal('checkIn')}
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
      {/* Password Modal */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!loading) {
            setPasswordModalVisible(false);
            setPassword('');
            setPendingAction(null);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {pendingAction === 'checkOut' ? 'Confirm Check Out' : 'Confirm Check In'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Enter password for {selectedStaff?.name ?? 'staff member'}
            </Text>
            <View style={styles.modalInputContainer}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={colors.textMuted}
                style={styles.modalInputIcon}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                editable={!loading}
                onChangeText={setPassword}
              />
            </View>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  if (!loading) {
                    setPasswordModalVisible(false);
                    setPassword('');
                    setPendingAction(null);
                  }
                }}
                disabled={loading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleConfirmPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  staffStatusSmall: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.xs,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: theme.spacing.lg,
  },
  modalInputIcon: {
    marginLeft: theme.spacing.md,
  },
  modalInput: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  modalButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
  },
  modalCancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalConfirmButton: {
    backgroundColor: colors.primary,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  modalConfirmText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
});
