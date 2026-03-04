import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Platform, Modal, KeyboardAvoidingView,
  Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { colors, theme } from '../theme';
import type { AppointmentStatus } from '../types';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceWarm: '#FFFDF9',
  border: '#E8E3DB',

  green: '#2D9A5F',
  greenLight: '#38B872',
  greenMuted: '#2D9A5F15',
  greenBorder: '#2D9A5F40',

  gold: '#C9A84C',
  goldMuted: '#C9A84C18',
  goldBorder: '#C9A84C44',

  text: '#1A1814',
  textSub: '#6B6560',
  textMuted: '#A09A8F',

  blue: '#3A7EC8',
  blueMuted: '#3A7EC815',
  blueBorder: '#3A7EC833',

  purple: '#7C5CBF',
  purpleMuted: '#7C5CBF15',
  purpleBorder: '#7C5CBF33',

  amber: '#D4872A',
  amberMuted: '#D4872A15',
  amberBorder: '#D4872A33',

  red: '#D94F4F',
  redMuted: '#D94F4F15',
  redBorder: '#D94F4F33',

  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

interface Props {
  navigation?: any;
  route?: { params?: { customerId?: string; appointmentId?: string } };
}

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel = ({ n, children }: { n: number; children: string }) => (
  <View style={sl.row}>
    <View style={sl.numBox}>
      <Text style={sl.num}>{n}</Text>
    </View>
    <Text style={sl.text}>{children}</Text>
    <View style={sl.line} />
  </View>
);
const sl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 4 },
  numBox: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: D.green, alignItems: 'center', justifyContent: 'center',
  },
  num: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  text: { color: D.text, fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  line: { flex: 1, height: 1, backgroundColor: D.border },
});

// ─── Focusable input ──────────────────────────────────────────────────────────
const FInput: React.FC<{
  icon: string; placeholder: string; value: string;
  onChange: (t: string) => void; keyboard?: any; multiline?: boolean;
  autoFocus?: boolean; hint?: string;
}> = ({ icon, placeholder, value, onChange, keyboard, multiline, autoFocus, hint }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fi.group}>
      <View style={[fi.box, focused && fi.boxFocused]}>
        <View style={[fi.iconBox, focused && fi.iconFocused]}>
          <MaterialCommunityIcons name={icon as any} size={18} color={focused ? D.green : D.textMuted} />
        </View>
        <TextInput
          style={[fi.input, multiline && { minHeight: 80, textAlignVertical: 'top', paddingTop: 14 }]}
          placeholder={placeholder}
          placeholderTextColor={D.textMuted}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboard}
          multiline={multiline}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {hint && (
        <View style={fi.hintRow}>
          <MaterialCommunityIcons name="information-outline" size={12} color={D.textMuted} />
          <Text style={fi.hint}>{hint}</Text>
        </View>
      )}
    </View>
  );
};
const fi = StyleSheet.create({
  group: { marginBottom: 12 },
  box: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderRadius: D.radius.md,
    borderWidth: 1.5, borderColor: D.border, overflow: 'hidden',
  },
  boxFocused: { borderColor: D.green },
  iconBox: {
    width: 46, height: 50, alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.bg, borderRightWidth: 1, borderRightColor: D.border,
  },
  iconFocused: { backgroundColor: D.greenMuted, borderRightColor: D.greenBorder },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: D.text, fontWeight: '500' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  hint: { fontSize: 11, color: D.textMuted },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const BookAppointmentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customers, services, appointments, createAppointment, updateAppointment, addOrUpdateCustomer } = useData();
  const { user, staffMembers } = useAuth();

  const editingId = route?.params?.appointmentId;
  const editingAppt = editingId ? appointments.find(a => a.id === editingId) : null;
  const preselectedCustomerId = route?.params?.customerId;

  const [customerId, setCustomerId] = useState(editingAppt?.customerId || preselectedCustomerId || '');
  const [staffId, setStaffId] = useState(editingAppt?.staffId || '');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(editingAppt?.serviceIds || []);
  const [appointmentDate, setAppointmentDate] = useState<Date>(() => {
    if (editingAppt) return new Date(editingAppt.appointmentTime);
    const d = new Date(); d.setMinutes(0); d.setHours(d.getHours() + 1);
    return d;
  });
  const [notes, setNotes] = useState(editingAppt?.notes || '');
  const [status, setStatus] = useState<AppointmentStatus>(editingAppt?.status || 'scheduled');
  const [submitting, setSubmitting] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return customers.filter((c: any) =>
      c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [customers, searchQuery]);

  const selectedCustomer = customers.find((c: any) => c.id === customerId);
  const selectedStaff = staffMembers.find((s: any) => s.id === staffId);
  const totalDuration = selectedServiceIds.length * 30;
  const totalPrice = useMemo(() =>
    services.filter((sv: any) => selectedServiceIds.includes(sv.id)).reduce((s: number, sv: any) => s + sv.price, 0),
    [services, selectedServiceIds],
  );

  const toggleService = (id: string) =>
    setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const onDateChange = (event: any, date?: Date) => {
    if (event.type === 'dismissed') { setPickerMode(null); return; }
    if (date) {
      const d = new Date(appointmentDate);
      d.setFullYear(date.getFullYear()); d.setMonth(date.getMonth()); d.setDate(date.getDate());
      setAppointmentDate(d);
    }
    setPickerMode(null);
  };

  const onTimeChange = (event: any, time?: Date) => {
    if (event.type === 'dismissed') { setPickerMode(null); return; }
    if (time) {
      const d = new Date(appointmentDate);
      d.setHours(time.getHours()); d.setMinutes(time.getMinutes());
      setAppointmentDate(d);
    }
    setPickerMode(null);
  };

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) { Alert.alert('Error', 'Please enter a customer name.'); return; }
    setAddingCustomer(true);
    try {
      const c = await addOrUpdateCustomer({ name: newCustomerName.trim(), phone: newCustomerPhone.trim() || undefined });
      setCustomerId(c.id);
      setShowAddCustomer(false);
      setNewCustomerName(''); setNewCustomerPhone('');
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to add customer.'); }
    finally { setAddingCustomer(false); }
  };

  const handleSubmit = async () => {
    if (!customerId) { Alert.alert('Required', 'Please select a customer.'); return; }
    if (!staffId) { Alert.alert('Required', 'Please select a staff member.'); return; }
    if (selectedServiceIds.length === 0) { Alert.alert('Required', 'Please select at least one service.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        customerId, customerName: selectedCustomer?.name || '',
        staffId, staffName: selectedStaff?.name || '',
        serviceIds: selectedServiceIds,
        appointmentTime: appointmentDate.toISOString(),
        status, notes: notes.trim() || undefined,
      };
      if (editingId) {
        await updateAppointment(editingId, payload);
        Alert.alert('Updated', 'Appointment updated successfully.');
      } else {
        await createAppointment(payload);
        Alert.alert('Booked!', 'Appointment booked successfully.');
      }
      navigation?.goBack();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to save.'); }
    finally { setSubmitting(false); }
  };

  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const isFormComplete = !!customerId && !!staffId && selectedServiceIds.length > 0;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={D.text} />
          </TouchableOpacity>
          <View style={s.headerIconBox}>
            <MaterialCommunityIcons name={editingId ? 'calendar-edit' : 'calendar-plus'} size={22} color={D.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{editingId ? 'Edit Appointment' : 'Book Appointment'}</Text>
            <Text style={s.headerSub}>Fill in the details below</Text>
          </View>
        </View>

        {/* ── Progress Tracker ── */}
        <View style={s.progressBar}>
          {[
            { label: 'Customer', done: !!customerId },
            { label: 'Staff',    done: !!staffId },
            { label: 'Services', done: selectedServiceIds.length > 0 },
            { label: 'Date',     done: true },
          ].map((step, i) => (
            <View key={i} style={s.progressStep}>
              <View style={[s.progressDot, step.done && s.progressDotDone]}>
                {step.done
                  ? <MaterialCommunityIcons name="check" size={12} color="#FFF" />
                  : <Text style={s.progressDotNum}>{i + 1}</Text>
                }
              </View>
              <Text style={[s.progressLabel, step.done && s.progressLabelDone]}>{step.label}</Text>
              {i < 3 && <View style={[s.progressLine, step.done && s.progressLineDone]} />}
            </View>
          ))}
        </View>

        <View style={s.body}>

          {/* ── 1. Customer ── */}
          <SectionLabel n={1}>SELECT CUSTOMER</SectionLabel>

          {!customerId ? (
            <View style={s.card}>
              {/* Search */}
              <View style={s.searchBox}>
                <View style={s.searchIcon}>
                  <MaterialCommunityIcons name="magnify" size={18} color={D.textMuted} />
                </View>
                <TextInput
                  style={s.searchInput}
                  placeholder="Search by name or phone…"
                  placeholderTextColor={D.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity style={s.searchClear} onPress={() => setSearchQuery('')}>
                    <MaterialCommunityIcons name="close-circle" size={16} color={D.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Results */}
              <ScrollView style={{ maxHeight: 210 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {filteredCustomers.map((c: any, i: number) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.customerRow, i < filteredCustomers.length - 1 && { borderBottomWidth: 1, borderBottomColor: D.border }]}
                    onPress={() => { setCustomerId(c.id); setSearchQuery(''); }}
                    activeOpacity={0.75}
                  >
                    <View style={s.customerAvatar}>
                      <Text style={s.customerAvatarText}>{initials(c.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.customerName}>{c.name}</Text>
                      {c.phone && <Text style={s.customerPhone}>{c.phone}</Text>}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={D.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Add new */}
              <TouchableOpacity
                style={s.addCustomerBtn}
                onPress={() => setShowAddCustomer(true)}
                activeOpacity={0.8}
              >
                <View style={s.addCustomerIcon}>
                  <MaterialCommunityIcons name="account-plus" size={18} color={D.green} />
                </View>
                <Text style={s.addCustomerText}>Add New Customer</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={D.green} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.selectedCard}>
              <View style={[s.selectedCardStripe, { backgroundColor: D.green }]} />
              <View style={s.selectedCardInner}>
                <View style={s.selectedAvatar}>
                  <Text style={s.selectedAvatarText}>{initials(selectedCustomer?.name ?? '?')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.selectedName}>{selectedCustomer?.name}</Text>
                  {selectedCustomer?.phone && <Text style={s.selectedSub}>{selectedCustomer.phone}</Text>}
                </View>
                <TouchableOpacity
                  style={s.selectedChangeBtn}
                  onPress={() => setCustomerId('')}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="swap-horizontal" size={15} color={D.green} />
                  <Text style={s.selectedChangeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── 2. Staff ── */}
          <SectionLabel n={2}>SELECT STAFF</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
            {staffMembers.map((staff: any) => {
              const active = staffId === staff.id;
              return (
                <TouchableOpacity
                  key={staff.id}
                  style={[s.staffCard, active && s.staffCardActive]}
                  onPress={() => setStaffId(staff.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.staffAvatar, active && s.staffAvatarActive]}>
                    <Text style={[s.staffAvatarText, active && { color: '#FFF' }]}>
                      {initials(staff.name)}
                    </Text>
                  </View>
                  <Text style={[s.staffName, active && s.staffNameActive]} numberOfLines={1}>
                    {staff.name.split(' ')[0]}
                  </Text>
                  {staff.branchName && (
                    <Text style={s.staffBranch} numberOfLines={1}>{staff.branchName}</Text>
                  )}
                  {active && (
                    <View style={s.staffCheckBadge}>
                      <MaterialCommunityIcons name="check" size={11} color={D.green} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── 3. Services ── */}
          <SectionLabel n={3}>SELECT SERVICES</SectionLabel>
          <View style={s.servicesGrid}>
            {services.map((sv: any) => {
              const active = selectedServiceIds.includes(sv.id);
              return (
                <TouchableOpacity
                  key={sv.id}
                  style={[s.serviceCard, active && s.serviceCardActive]}
                  onPress={() => toggleService(sv.id)}
                  activeOpacity={0.8}
                >
                  <View style={s.serviceTop}>
                    <Text style={[s.serviceName, active && s.serviceNameActive]} numberOfLines={2}>
                      {sv.name}
                    </Text>
                    <View style={[s.serviceCheck, active && s.serviceCheckActive]}>
                      {active && <MaterialCommunityIcons name="check" size={12} color="#FFF" />}
                    </View>
                  </View>
                  <Text style={[s.servicePrice, active && { color: D.green }]}>₹{sv.price}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected services summary */}
          {selectedServiceIds.length > 0 && (
            <View style={s.servicesSummary}>
              <View style={s.servicesSummaryLeft}>
                <MaterialCommunityIcons name="spa" size={15} color={D.green} />
                <Text style={s.servicesSummaryText}>
                  {selectedServiceIds.length} service{selectedServiceIds.length > 1 ? 's' : ''} · ~{totalDuration} min
                </Text>
              </View>
              <Text style={s.servicesSummaryPrice}>₹{totalPrice}</Text>
            </View>
          )}

          {/* ── 4. Date & Time ── */}
          <SectionLabel n={4}>DATE & TIME</SectionLabel>
          <View style={s.dateTimeRow}>
            <TouchableOpacity
              style={s.dateTimeBtn}
              onPress={() => setPickerMode('date')}
              activeOpacity={0.8}
            >
              <View style={[s.dateTimeBtnIcon, { backgroundColor: D.greenMuted, borderColor: D.greenBorder }]}>
                <MaterialCommunityIcons name="calendar" size={18} color={D.green} />
              </View>
              <View>
                <Text style={s.dateTimeBtnLabel}>Date</Text>
                <Text style={s.dateTimeBtnValue}>{formatDate(appointmentDate)}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.dateTimeBtn}
              onPress={() => setPickerMode('time')}
              activeOpacity={0.8}
            >
              <View style={[s.dateTimeBtnIcon, { backgroundColor: D.blueMuted, borderColor: D.blueBorder }]}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={D.blue} />
              </View>
              <View>
                <Text style={s.dateTimeBtnLabel}>Time</Text>
                <Text style={s.dateTimeBtnValue}>{formatTime(appointmentDate)}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Date/Time Picker inline */}
          {pickerMode && (
            <View style={s.pickerBox}>
              <View style={s.pickerBoxHeader}>
                <View style={[s.pickerBoxIcon, { backgroundColor: pickerMode === 'date' ? D.greenMuted : D.blueMuted }]}>
                  <MaterialCommunityIcons
                    name={pickerMode === 'date' ? 'calendar' : 'clock-outline'}
                    size={16}
                    color={pickerMode === 'date' ? D.green : D.blue}
                  />
                </View>
                <Text style={s.pickerBoxTitle}>Select {pickerMode === 'date' ? 'Date' : 'Time'}</Text>
                <TouchableOpacity style={s.pickerCloseBtn} onPress={() => setPickerMode(null)}>
                  <MaterialCommunityIcons name="close" size={18} color={D.textSub} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={appointmentDate}
                mode={pickerMode}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={pickerMode === 'date' ? new Date() : undefined}
                onChange={pickerMode === 'date' ? onDateChange : onTimeChange}
                style={{ height: 180 }}
              />
              <TouchableOpacity style={s.pickerDoneBtn} onPress={() => setPickerMode(null)}>
                <Text style={s.pickerDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── 5. Status (editing only) ── */}
          {editingId && (
            <>
              <SectionLabel n={5}>STATUS</SectionLabel>
              <View style={s.statusRow}>
                {(['scheduled', 'completed', 'cancelled'] as AppointmentStatus[]).map(st => {
                  const cfg = {
                    scheduled: { color: D.blue,  bg: D.blueMuted,  border: D.blueBorder,  icon: 'calendar-clock'  },
                    completed: { color: D.green, bg: D.greenMuted, border: D.greenBorder, icon: 'check-circle'    },
                    cancelled: { color: D.red,   bg: D.redMuted,   border: D.redBorder,   icon: 'close-circle'    },
                  }[st];
                  const active = status === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[s.statusChip, active && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                      onPress={() => setStatus(st)}
                      activeOpacity={0.75}
                    >
                      <MaterialCommunityIcons name={cfg.icon as any} size={16} color={active ? cfg.color : D.textMuted} />
                      <Text style={[s.statusChipText, active && { color: cfg.color }]}>
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Notes ── */}
          <SectionLabel n={editingId ? 6 : 5}>NOTES</SectionLabel>
          <FInput
            icon="note-text-outline"
            placeholder="Any special requests or notes… (optional)"
            value={notes}
            onChange={setNotes}
            multiline
          />

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[s.submitBtn, (!isFormComplete || submitting) && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isFormComplete || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <View style={s.submitBtnIcon}>
                  <MaterialCommunityIcons name={editingId ? 'content-save' : 'calendar-check'} size={20} color={D.green} />
                </View>
                <Text style={s.submitBtnText}>
                  {editingId ? 'Save Changes' : 'Book Appointment'}
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="rgba(255,255,255,0.6)" />
              </>
            )}
          </TouchableOpacity>
          {!isFormComplete && (
            <Text style={s.submitHint}>Please complete customer, staff, and services to continue</Text>
          )}
        </View>
      </ScrollView>

      {/* ── Add Customer Modal ── */}
      <Modal visible={showAddCustomer} transparent animationType="fade" onRequestClose={() => setShowAddCustomer(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', maxWidth: 420 }}>
              <View style={s.modalSheet}>
                <View style={s.modalGlow} />

                <View style={s.modalHead}>
                  <View style={[s.modalHeadIcon, { backgroundColor: D.greenMuted, borderColor: D.greenBorder }]}>
                    <MaterialCommunityIcons name="account-plus" size={20} color={D.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle}>Add New Customer</Text>
                    <Text style={s.modalSub}>They'll be saved for future visits</Text>
                  </View>
                  <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowAddCustomer(false)}>
                    <MaterialCommunityIcons name="close" size={20} color={D.textSub} />
                  </TouchableOpacity>
                </View>

                <FInput
                  icon="account-outline"
                  placeholder="Full Name *"
                  value={newCustomerName}
                  onChange={setNewCustomerName}
                  autoFocus
                />
                <FInput
                  icon="phone-outline"
                  placeholder="Phone Number (optional)"
                  value={newCustomerPhone}
                  onChange={setNewCustomerPhone}
                  keyboard="phone-pad"
                />

                <View style={s.modalBtnRow}>
                  <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowAddCustomer(false)}>
                    <Text style={s.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.modalSaveBtn, (!newCustomerName.trim() || addingCustomer) && { opacity: 0.5 }]}
                    onPress={handleAddCustomer}
                    disabled={!newCustomerName.trim() || addingCustomer}
                    activeOpacity={0.85}
                  >
                    {addingCustomer
                      ? <ActivityIndicator color="#FFF" size="small" />
                      : <>
                          <MaterialCommunityIcons name="check" size={18} color="#FFF" />
                          <Text style={s.modalSaveText}>Add Customer</Text>
                        </>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: D.bg },
  container: { flex: 1, backgroundColor: D.bg },
  body: { paddingHorizontal: 20, paddingBottom: 20 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border, gap: 10,
    marginBottom: 0,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: D.radius.md,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
  },
  headerIconBox: {
    width: 44, height: 44, borderRadius: D.radius.md,
    backgroundColor: D.greenMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.greenBorder,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },

  // Progress bar
  progressBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
    marginBottom: 20,
  },
  progressStep: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: D.border, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: D.border,
  },
  progressDotDone: { backgroundColor: D.green, borderColor: D.green },
  progressDotNum: { fontSize: 10, fontWeight: '700', color: D.textMuted },
  progressLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600' },
  progressLabelDone: { color: D.green },
  progressLine: { flex: 1, height: 2, backgroundColor: D.border, borderRadius: 1 },
  progressLineDone: { backgroundColor: D.green },

  // Customer card
  card: {
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border, overflow: 'hidden', marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  searchIcon: {
    width: 46, height: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.bg, borderRightWidth: 1, borderRightColor: D.border,
  },
  searchInput: { flex: 1, paddingHorizontal: 14, fontSize: 15, color: D.text },
  searchClear: { paddingHorizontal: 12 },
  customerRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10,
  },
  customerAvatar: {
    width: 38, height: 38, borderRadius: D.radius.sm,
    backgroundColor: D.greenMuted, borderWidth: 1, borderColor: D.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  customerAvatarText: { fontSize: 13, fontWeight: '800', color: D.green },
  customerName: { fontSize: 14, fontWeight: '700', color: D.text },
  customerPhone: { fontSize: 12, color: D.textMuted, marginTop: 1 },
  addCustomerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderTopWidth: 1, borderTopColor: D.border,
    backgroundColor: D.greenMuted,
  },
  addCustomerIcon: {
    width: 32, height: 32, borderRadius: D.radius.sm,
    backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.greenBorder,
  },
  addCustomerText: { flex: 1, fontSize: 14, fontWeight: '700', color: D.green },

  // Selected card
  selectedCard: {
    flexDirection: 'row', backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.greenBorder, overflow: 'hidden', marginBottom: 20,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  selectedCardStripe: { width: 4 },
  selectedCardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  selectedAvatar: {
    width: 44, height: 44, borderRadius: D.radius.md,
    backgroundColor: D.greenMuted, borderWidth: 1, borderColor: D.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedAvatarText: { fontSize: 15, fontWeight: '800', color: D.green },
  selectedName: { fontSize: 15, fontWeight: '700', color: D.text },
  selectedSub: { fontSize: 12, color: D.textMuted, marginTop: 2 },
  selectedChangeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: D.greenMuted, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.greenBorder,
  },
  selectedChangeBtnText: { fontSize: 12, fontWeight: '700', color: D.green },

  // Staff cards
  staffCard: {
    alignItems: 'center', backgroundColor: D.surface, borderRadius: D.radius.lg,
    borderWidth: 1.5, borderColor: D.border, padding: 12, minWidth: 90,
    position: 'relative',
  },
  staffCardActive: { borderColor: D.green, backgroundColor: D.greenMuted },
  staffAvatar: {
    width: 48, height: 48, borderRadius: D.radius.md,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border, marginBottom: 8,
  },
  staffAvatarActive: { backgroundColor: D.green, borderColor: D.green },
  staffAvatarText: { fontSize: 16, fontWeight: '800', color: D.textSub },
  staffName: { fontSize: 12, fontWeight: '700', color: D.text, textAlign: 'center' },
  staffNameActive: { color: D.green },
  staffBranch: { fontSize: 10, color: D.textMuted, marginTop: 2, textAlign: 'center' },
  staffCheckBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: D.greenMuted, borderWidth: 1, borderColor: D.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  // Services
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  serviceCard: {
    flexBasis: '47%', flex: 1, backgroundColor: D.surface, borderRadius: D.radius.lg,
    borderWidth: 1.5, borderColor: D.border, padding: 12,
  },
  serviceCardActive: { borderColor: D.green, backgroundColor: D.greenMuted },
  serviceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  serviceName: { flex: 1, fontSize: 13, fontWeight: '600', color: D.text, lineHeight: 18 },
  serviceNameActive: { color: D.green },
  serviceCheck: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: D.border,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  serviceCheckActive: { backgroundColor: D.green, borderColor: D.green },
  servicePrice: { fontSize: 14, fontWeight: '800', color: D.textSub },
  servicesSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: D.greenMuted, borderRadius: D.radius.md,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: D.greenBorder,
    marginBottom: 20,
  },
  servicesSummaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  servicesSummaryText: { fontSize: 13, color: D.green, fontWeight: '600' },
  servicesSummaryPrice: { fontSize: 16, fontWeight: '800', color: D.green },

  // Date/time
  dateTimeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  dateTimeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: D.surface, borderRadius: D.radius.lg,
    borderWidth: 1, borderColor: D.border, padding: 12,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3, elevation: 1,
  },
  dateTimeBtnIcon: {
    width: 36, height: 36, borderRadius: D.radius.sm,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  dateTimeBtnLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3 },
  dateTimeBtnValue: { fontSize: 13, fontWeight: '700', color: D.text, marginTop: 2 },
  pickerBox: {
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border, padding: 16, marginBottom: 20,
  },
  pickerBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  pickerBoxIcon: {
    width: 32, height: 32, borderRadius: D.radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerBoxTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: D.text },
  pickerCloseBtn: {
    width: 30, height: 30, borderRadius: D.radius.sm,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
  },
  pickerDoneBtn: {
    marginTop: 8, backgroundColor: D.green, borderRadius: D.radius.lg,
    paddingVertical: 12, alignItems: 'center',
  },
  pickerDoneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // Status chips
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statusChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: D.radius.lg,
    backgroundColor: D.surface, borderWidth: 1.5, borderColor: D.border,
  },
  statusChipText: { fontSize: 13, fontWeight: '700', color: D.textMuted },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18, borderRadius: D.radius.xl,
    backgroundColor: D.green, marginTop: 8,
    shadowColor: D.green, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnIcon: {
    width: 32, height: 32, borderRadius: D.radius.sm,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  submitBtnText: { flex: 1, color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  submitHint: { textAlign: 'center', fontSize: 12, color: D.textMuted, marginTop: 10 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalSheet: {
    backgroundColor: D.surface, borderRadius: D.radius.xl, padding: 24,
    width: '100%', borderWidth: 1, borderColor: D.border, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
  },
  modalGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 120, height: 120, borderRadius: 60, backgroundColor: D.greenMuted,
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  modalHeadIcon: {
    width: 44, height: 44, borderRadius: D.radius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  modalSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: D.radius.sm,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: D.radius.lg,
    backgroundColor: D.bg, alignItems: 'center', borderWidth: 1, borderColor: D.border,
  },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: D.textSub },
  modalSaveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: D.radius.lg, backgroundColor: D.green,
    shadowColor: D.green, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  modalSaveText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});