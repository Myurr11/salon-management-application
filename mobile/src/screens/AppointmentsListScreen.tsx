import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { colors, theme, shadows } from '../theme';
import { Button } from '../components/ui/Button';
import type { Appointment, AppointmentStatus } from '../types';

interface Props {
  navigation?: any;
  route?: { params?: { customerId?: string } };
}

export const AppointmentsListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { appointments, deleteAppointment, refreshData, loading } = useData();
  const { user, staffMembers } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('all');
  const [filterStaff, setFilterStaff] = useState<string>('all');

  const customerIdFilter = route?.params?.customerId;

  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    // Filter by customer if provided
    if (customerIdFilter) {
      filtered = filtered.filter(a => a.customerId === customerIdFilter);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === filterStatus);
    }

    // Filter by staff
    if (filterStaff !== 'all') {
      filtered = filtered.filter(a => a.staffId === filterStaff);
    }

    // Sort by appointment time (upcoming first)
    return filtered.sort((a, b) => 
      new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime()
    );
  }, [appointments, filterStatus, filterStaff, customerIdFilter]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date().toISOString();
    return filteredAppointments.filter(a => 
      a.appointmentTime >= now && a.status === 'scheduled'
    );
  }, [filteredAppointments]);

  const pastAppointments = useMemo(() => {
    const now = new Date().toISOString();
    return filteredAppointments.filter(a => 
      a.appointmentTime < now || a.status !== 'scheduled'
    );
  }, [filteredAppointments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleDelete = (appointment: Appointment) => {
    Alert.alert(
      'Delete Appointment',
      `Are you sure you want to delete the appointment for ${appointment.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAppointment(appointment.id);
              Alert.alert('Success', 'Appointment deleted successfully');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete appointment');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (appointment: Appointment) => {
    navigation?.navigate('BookAppointment', { appointmentId: appointment.id });
  };

  const handleComplete = async (appointment: Appointment) => {
    try {
      navigation?.navigate('StaffBilling', {
        customerId: appointment.customerId,
        customerName: appointment.customerName,
        appointmentId: appointment.id,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete appointment');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'scheduled': return colors.primary;
      case 'completed': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.textMuted;
    }
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case 'scheduled': return 'calendar-clock';
      case 'completed': return 'check-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
    const isUpcoming = appointment.status === 'scheduled' && appointment.appointmentTime >= new Date().toISOString();

    return (
      <View style={[styles.appointmentCard, shadows.sm]}>
        <View style={styles.appointmentHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '15' }]}>
            <MaterialCommunityIcons 
              name={getStatusIcon(appointment.status)} 
              size={14} 
              color={getStatusColor(appointment.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Text>
          </View>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.dateText}>{formatDate(appointment.appointmentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(appointment.appointmentTime)}</Text>
          </View>
        </View>

        <View style={styles.appointmentBody}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={18} color={colors.primary} />
            <Text style={styles.customerName}>{appointment.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-tie" size={18} color={colors.accent} />
            <Text style={styles.staffName}>{appointment.staffName}</Text>
          </View>
          {appointment.serviceNames && appointment.serviceNames.length > 0 && (
            <View style={styles.servicesRow}>
              <MaterialCommunityIcons name="spa" size={18} color={colors.textMuted} />
              <Text style={styles.servicesText}>
                {appointment.serviceNames.join(', ')}
              </Text>
            </View>
          )}
          {appointment.notes && (
            <View style={styles.notesRow}>
              <MaterialCommunityIcons name="note-text" size={18} color={colors.textMuted} />
              <Text style={styles.notesText}>{appointment.notes}</Text>
            </View>
          )}
        </View>

        <View style={styles.appointmentActions}>
          {isUpcoming && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.completeButton]} 
                onPress={() => handleComplete(appointment)}
              >
                <MaterialCommunityIcons name="check" size={18} color={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>Complete</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton]} 
                onPress={() => handleEdit(appointment)}
              >
                <MaterialCommunityIcons name="pencil" size={18} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={() => handleDelete(appointment)}
          >
            <MaterialCommunityIcons name="delete" size={18} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointments</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation?.navigate('BookAppointment')}
          >
            <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters}>
            {(['all', 'scheduled', 'completed', 'cancelled'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  filterStatus === status && styles.filterChipActive,
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[
                  styles.filterChipText,
                  filterStatus === status && styles.filterChipTextActive,
                ]}>
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {user?.role === 'admin' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffFilters}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterStaff === 'all' && styles.filterChipActive,
                ]}
                onPress={() => setFilterStaff('all')}
              >
                <Text style={[
                  styles.filterChipText,
                  filterStaff === 'all' && styles.filterChipTextActive,
                ]}>
                  All Staff
                </Text>
              </TouchableOpacity>
              {staffMembers.map((staff: { id: string; name: string }) => (
                <TouchableOpacity
                  key={staff.id}
                  style={[
                    styles.filterChip,
                    filterStaff === staff.id && styles.filterChipActive,
                  ]}
                  onPress={() => setFilterStaff(staff.id)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterStaff === staff.id && styles.filterChipTextActive,
                  ]}>
                    {staff.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Appointments List */}
        <ScrollView 
          style={styles.appointmentsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading appointments...</Text>
            </View>
          ) : filteredAppointments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-blank" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>No appointments found</Text>
              <Text style={styles.emptySubtext}>
                {filterStatus !== 'all' 
                  ? `No ${filterStatus} appointments` 
                  : 'Book your first appointment to get started'}
              </Text>
              <Button
                title="Book Appointment"
                onPress={() => navigation?.navigate('BookAppointment')}
                icon="calendar-plus"
                style={styles.emptyButton}
              />
            </View>
          ) : (
            <>
              {upcomingAppointments.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Upcoming ({upcomingAppointments.length})</Text>
                  {upcomingAppointments.map(appointment => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </>
              )}

              {pastAppointments.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Past ({pastAppointments.length})</Text>
                  {pastAppointments.map(appointment => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </>
              )}
            </>
          )}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Floating Add Button */}
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation?.navigate('BookAppointment')}
        >
          <MaterialCommunityIcons name="plus" size={28} color={colors.textInverse} />
        </TouchableOpacity>
      </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    backgroundColor: colors.surface,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusFilters: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  staffFilters: {
    paddingHorizontal: theme.spacing.lg,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },
  appointmentsList: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  appointmentCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  dateTimeContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  timeText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  appointmentBody: {
    padding: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: theme.spacing.sm,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.sm,
  },
  servicesText: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: theme.spacing.sm,
    flex: 1,
    flexWrap: 'wrap',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  notesText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: theme.spacing.sm,
    flex: 1,
    fontStyle: 'italic',
  },
  appointmentActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
  },
  completeButton: {
    backgroundColor: colors.success + '10',
  },
  editButton: {
    backgroundColor: colors.primary + '10',
  },
  deleteButton: {
    backgroundColor: colors.error + '10',
    borderRightWidth: 0,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: theme.spacing.lg,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyButton: {
    marginTop: theme.spacing.xl,
  },
  bottomPadding: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
