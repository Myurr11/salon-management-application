import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { colors, theme, shadows } from '../theme';
import { Button } from '../components/ui/Button';
import type { AppointmentStatus } from '../types';

interface Props {
  navigation?: any;
  route?: { params?: { customerId?: string; appointmentId?: string } };
}

export const BookAppointmentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customers, services, appointments, createAppointment, updateAppointment, addOrUpdateCustomer } = useData();
  const { user, staffMembers } = useAuth();
  
  const editingAppointmentId = route?.params?.appointmentId;
  const editingAppointment = editingAppointmentId 
    ? appointments.find(a => a.id === editingAppointmentId)
    : null;
  const preselectedCustomerId = route?.params?.customerId;

  const [customerId, setCustomerId] = useState<string>(editingAppointment?.customerId || preselectedCustomerId || '');
  const [staffId, setStaffId] = useState<string>(editingAppointment?.staffId || '');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(editingAppointment?.serviceIds || []);
  const [appointmentDate, setAppointmentDate] = useState<Date>(() => {
    if (editingAppointment) {
      return new Date(editingAppointment.appointmentTime);
    }
    const now = new Date();
    now.setMinutes(0);
    now.setHours(now.getHours() + 1);
    return now;
  });
  const [notes, setNotes] = useState<string>(editingAppointment?.notes || '');
  const [status, setStatus] = useState<AppointmentStatus>(editingAppointment?.status || 'scheduled');
  const [submitting, setSubmitting] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New customer modal state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers.slice(0, 20);
    const query = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.phone?.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [customers, searchQuery]);

  const selectedCustomer = customers.find((c: { id: string }) => c.id === customerId);
  const selectedStaff = staffMembers.find((s: { id: string }) => s.id === staffId);
  const totalDuration = useMemo(() => {
    // Estimate 30 minutes per service
    return selectedServiceIds.length * 30;
  }, [selectedServiceIds]);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setPickerMode(null);
      return;
    }
    if (selectedDate) {
      const newDate = new Date(appointmentDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setAppointmentDate(newDate);
    }
    setPickerMode(null);
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (event.type === 'dismissed') {
      setPickerMode(null);
      return;
    }
    if (selectedTime) {
      const newDate = new Date(appointmentDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setAppointmentDate(newDate);
    }
    setPickerMode(null);
  };

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }
    
    setAddingCustomer(true);
    try {
      const newCustomer = await addOrUpdateCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
      });
      setCustomerId(newCustomer.id);
      setShowAddCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      Alert.alert('Success', 'Customer added successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add customer');
    } finally {
      setAddingCustomer(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSubmit = async () => {
    if (!customerId) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }
    if (!staffId) {
      Alert.alert('Error', 'Please select a staff member');
      return;
    }
    if (selectedServiceIds.length === 0) {
      Alert.alert('Error', 'Please select at least one service');
      return;
    }

    setSubmitting(true);
    try {
      const appointmentData = {
        customerId,
        customerName: selectedCustomer?.name || '',
        staffId,
        staffName: selectedStaff?.name || '',
        serviceIds: selectedServiceIds,
        appointmentTime: appointmentDate.toISOString(),
        status,
        notes: notes.trim() || undefined,
      };

      if (editingAppointmentId) {
        await updateAppointment(editingAppointmentId, appointmentData);
        Alert.alert('Success', 'Appointment updated successfully');
      } else {
        await createAppointment(appointmentData);
        Alert.alert('Success', 'Appointment booked successfully');
      }
      
      navigation?.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save appointment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editingAppointmentId ? 'Edit Appointment' : 'Book Appointment'}
          </Text>
        </View>

        {/* Customer Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Customer</Text>
          {!customerId ? (
            <>
              <View style={styles.searchContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search customer by name or phone"
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <ScrollView style={styles.customerList} nestedScrollEnabled>
                {filteredCustomers.map(customer => (
                  <TouchableOpacity
                    key={customer.id}
                    style={styles.customerItem}
                    onPress={() => {
                      setCustomerId(customer.id);
                      setSearchQuery('');
                    }}
                  >
                    <View style={styles.customerAvatar}>
                      <Text style={styles.customerAvatarText}>
                        {customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>{customer.name}</Text>
                      {customer.phone && (
                        <Text style={styles.customerPhone}>{customer.phone}</Text>
                      )}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity 
                style={styles.addCustomerButton}
                onPress={() => setShowAddCustomer(true)}
              >
                <MaterialCommunityIcons name="account-plus" size={20} color={colors.primary} />
                <Text style={styles.addCustomerText}>Add New Customer</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.selectedCustomerCard}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerAvatarText}>
                  {selectedCustomer?.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{selectedCustomer?.name}</Text>
                {selectedCustomer?.phone && (
                  <Text style={styles.customerPhone}>{selectedCustomer.phone}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setCustomerId('')}>
                <MaterialCommunityIcons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Staff Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Staff</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffList}>
            {staffMembers.map((staff: { id: string; name: string; branchName?: string | null }) => (
              <TouchableOpacity
                key={staff.id}
                style={[
                  styles.staffCard,
                  staffId === staff.id && styles.staffCardSelected,
                ]}
                onPress={() => setStaffId(staff.id)}
              >
                <View style={[styles.staffAvatar, staffId === staff.id && styles.staffAvatarSelected]}>
                  <Text style={[styles.staffAvatarText, staffId === staff.id && styles.staffAvatarTextSelected]}>
                    {staff.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <Text style={[styles.staffName, staffId === staff.id && styles.staffNameSelected]}>
                  {staff.name}
                </Text>
                {staff.branchName && (
                  <Text style={styles.staffBranch}>{staff.branchName}</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Services Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Services</Text>
          <View style={styles.servicesGrid}>
            {services.map(service => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  selectedServiceIds.includes(service.id) && styles.serviceCardSelected,
                ]}
                onPress={() => toggleService(service.id)}
              >
                <View style={styles.serviceHeader}>
                  <Text style={[styles.serviceName, selectedServiceIds.includes(service.id) && styles.serviceNameSelected]}>
                    {service.name}
                  </Text>
                  {selectedServiceIds.includes(service.id) && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.servicePrice}>₹{service.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedServiceIds.length > 0 && (
            <Text style={styles.durationText}>
              Estimated duration: {totalDuration} minutes
            </Text>
          )}
        </View>

        {/* Date & Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity style={styles.dateTimeButtonHalf} onPress={() => setPickerMode('date')}>
              <MaterialCommunityIcons name="calendar" size={18} color={colors.primary} />
              <Text style={styles.dateTimeText}>{formatDate(appointmentDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateTimeButtonHalf} onPress={() => setPickerMode('time')}>
              <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primary} />
              <Text style={styles.dateTimeText}>{formatTime(appointmentDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date/Time Picker Inline */}
        {pickerMode !== null && (
          <View style={styles.inlinePickerContainer}>
            <View style={styles.inlinePickerHeader}>
              <Text style={styles.inlinePickerTitle}>
                {pickerMode === 'date' ? 'Select Date' : 'Select Time'}
              </Text>
              <TouchableOpacity onPress={() => setPickerMode(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={appointmentDate}
              mode={pickerMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={pickerMode === 'date' ? new Date() : undefined}
              onChange={pickerMode === 'date' ? onDateChange : onTimeChange}
              style={styles.dateTimePicker}
            />
            <Button
              title="Done"
              onPress={() => setPickerMode(null)}
              fullWidth
              style={styles.inlinePickerButton}
            />
          </View>
        )}

        {/* Status (for editing) */}
        {editingAppointmentId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.statusContainer}>
              {(['scheduled', 'completed', 'cancelled'] as AppointmentStatus[]).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusButton,
                    status === s && styles.statusButtonActive,
                    s === 'scheduled' && styles.statusScheduled,
                    s === 'completed' && styles.statusCompleted,
                    s === 'cancelled' && styles.statusCancelled,
                  ]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[
                    styles.statusText,
                    status === s && styles.statusTextActive,
                  ]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any special requests or notes..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <Button
            title={editingAppointmentId ? 'Update Appointment' : 'Book Appointment'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting || !customerId || !staffId || selectedServiceIds.length === 0}
            fullWidth
            icon={editingAppointmentId ? 'content-save' : 'calendar-check'}
          />
        </View>
      </ScrollView>

      {/* Add Customer Modal */}
      <Modal
        visible={showAddCustomer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddCustomer(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.centeredOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoidingView}
            >
              <View style={styles.centeredModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Customer</Text>
                  <TouchableOpacity onPress={() => setShowAddCustomer(false)}>
                    <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalBody}>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="account" size={20} color={colors.textMuted} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Customer Name *"
                      placeholderTextColor={colors.textMuted}
                      value={newCustomerName}
                      onChangeText={setNewCustomerName}
                      autoFocus
                    />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="phone" size={20} color={colors.textMuted} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Phone Number (Optional)"
                      placeholderTextColor={colors.textMuted}
                      value={newCustomerPhone}
                      onChangeText={setNewCustomerPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.modalFooter}>
                  <Button
                    title="Cancel"
                    onPress={() => setShowAddCustomer(false)}
                    variant="outline"
                    style={styles.modalButton}
                  />
                  <Button
                    title="Add Customer"
                    onPress={handleAddCustomer}
                    loading={addingCustomer}
                    disabled={addingCustomer || !newCustomerName.trim()}
                    style={styles.modalButton}
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
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
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: theme.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: 15,
    color: colors.text,
    marginLeft: theme.spacing.sm,
  },
  customerList: {
    maxHeight: 200,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  customerInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  customerPhone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectedCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: theme.spacing.md,
  },
  staffList: {
    flexDirection: 'row',
  },
  staffCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: theme.spacing.md,
    marginRight: theme.spacing.md,
    minWidth: 100,
  },
  staffCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  staffAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  staffAvatarSelected: {
    backgroundColor: colors.primary,
  },
  staffAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  staffAvatarTextSelected: {
    color: colors.textInverse,
  },
  staffName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  staffNameSelected: {
    color: colors.primary,
  },
  staffBranch: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  serviceCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: theme.spacing.md,
  },
  serviceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  serviceNameSelected: {
    color: colors.primary,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  durationText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  dateTimeButtonHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: theme.spacing.md,
  },
  dateTimeText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: theme.spacing.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statusButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statusButtonActive: {
    borderWidth: 2,
  },
  statusScheduled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  statusCompleted: {
    borderColor: colors.success,
    backgroundColor: colors.success + '15',
  },
  statusCancelled: {
    borderColor: colors.error,
    backgroundColor: colors.error + '15',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusTextActive: {
    color: colors.text,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: theme.spacing.md,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
  },
  submitSection: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  addCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  addCustomerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: theme.spacing.sm,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pickerButton: {
    marginTop: theme.spacing.md,
  },
  inlinePickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  inlinePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  inlinePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dateTimePicker: {
    height: 200,
  },
  inlinePickerButton: {
    marginTop: theme.spacing.md,
  },
  centeredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  keyboardAvoidingView: {
    width: '100%',
    maxWidth: 400,
  },
  centeredModal: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    marginBottom: theme.spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  modalInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    color: colors.text,
    marginLeft: theme.spacing.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
