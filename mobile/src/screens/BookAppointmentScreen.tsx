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
import type { AppointmentStatus } from '../types';

// ─── Design Tokens — shared system ───────────────────────────────────────────
const D = {
  bg:          '#F7F9FB',
  surface:     '#FFFFFF',
  surfaceAlt:  '#F2F4F6',

  green:       '#166534',
  greenMuted:  'rgba(22,101,52,0.10)',
  greenBorder: 'rgba(22,101,52,0.25)',

  border:      '#E8EAEC',

  text:        '#191C1E',
  textSub:     '#707A6F',
  textMuted:   '#9AA09E',

  red:         '#BA1A1A',
  redMuted:    'rgba(186,26,26,0.08)',
  redBorder:   'rgba(186,26,26,0.20)',

  amber:       '#B8742A',
  amberMuted:  'rgba(184,116,42,0.10)',
  amberBorder: 'rgba(184,116,42,0.25)',

  blue:        '#1B5FA6',
  blueMuted:   'rgba(27,95,166,0.10)',
  blueBorder:  'rgba(27,95,166,0.25)',

  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 },
};

interface Props {
  navigation?: any;
  route?: { params?: { customerId?: string; appointmentId?: string } };
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────
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
  row:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 20 },
  numBox: { width: 22, height: 22, borderRadius: 11, backgroundColor: D.green, alignItems: 'center', justifyContent: 'center' },
  num:    { color: '#fff', fontSize: 10, fontWeight: '800' },
  text:   { fontSize: 13, fontWeight: '700', color: D.text },
  line:   { flex: 1, height: 1, backgroundColor: D.border },
});

// ─── Focusable input ──────────────────────────────────────────────────────────
const FInput: React.FC<{
  icon: string; placeholder: string; value: string;
  onChange: (t: string) => void; keyboard?: any;
  multiline?: boolean; autoFocus?: boolean;
}> = ({ icon, placeholder, value, onChange, keyboard, multiline, autoFocus }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[fi.box, focused && fi.boxFocused]}>
      <MaterialCommunityIcons name={icon as any} size={17} color={focused ? D.green : D.textMuted} style={fi.icon} />
      <TextInput
        style={[fi.input, multiline && { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
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
  );
};
const fi = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surfaceAlt, borderRadius: D.radius.md,
    borderWidth: 1.5, borderColor: D.border, marginBottom: 10, overflow: 'hidden',
  },
  boxFocused: { borderColor: D.green, backgroundColor: D.surface },
  icon:  { marginLeft: 12 },
  input: { flex: 1, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14, color: D.text, fontWeight: '500' },
});

const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const AVATAR_COLORS = ['#1E3A5F', '#0D9488', '#059669', '#2563EB', '#7C3AED'];
const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

export const BookAppointmentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customers, services, appointments, createAppointment, updateAppointment, addOrUpdateCustomer } = useData();
  const { user, staffMembers } = useAuth();

  const editingId   = route?.params?.appointmentId;
  const editingAppt = editingId ? appointments.find(a => a.id === editingId) : null;
  const preselectedCustomerId = route?.params?.customerId;

  const [customerId, setCustomerId]           = useState(editingAppt?.customerId || preselectedCustomerId || '');
  const [staffId, setStaffId]                 = useState(editingAppt?.staffId || '');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(editingAppt?.serviceIds || []);
  const [appointmentDate, setAppointmentDate] = useState<Date>(() => {
    if (editingAppt) return new Date(editingAppt.appointmentTime);
    const d = new Date(); d.setMinutes(0); d.setHours(d.getHours() + 1);
    return d;
  });
  const [notes, setNotes]               = useState(editingAppt?.notes || '');
  const [status, setStatus]             = useState<AppointmentStatus>(editingAppt?.status || 'scheduled');
  const [advanceAmount, setAdvanceAmount] = useState<string>(editingAppt?.advanceAmount?.toString() || '0');
  const [submitting, setSubmitting]     = useState(false);
  const [pickerMode, setPickerMode]     = useState<'date' | 'time' | null>(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [addingCustomer, setAddingCustomer]   = useState(false);
  const [serviceSearch, setServiceSearch]     = useState('');

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return (customers as any[]).slice(0, 20);
    const q = searchQuery.toLowerCase();
    return (customers as any[]).filter(c =>
      c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [customers, searchQuery]);

  const SHOW_LIMIT = 5;
  const filteredServices = useMemo(() => {
    const all = services as any[];
    if (serviceSearch.trim()) {
      const q = serviceSearch.toLowerCase();
      return all.filter(sv => sv.name.toLowerCase().includes(q));
    }
    // Always show selected ones first, then fill up to SHOW_LIMIT with unselected
    const selected   = all.filter(sv => selectedServiceIds.includes(sv.id));
    const unselected = all.filter(sv => !selectedServiceIds.includes(sv.id));
    return [...selected, ...unselected.slice(0, Math.max(0, SHOW_LIMIT - selected.length))];
  }, [services, serviceSearch, selectedServiceIds]);

  const selectedCustomer = (customers as any[]).find(c => c.id === customerId);
  const selectedStaff    = staffMembers.find(s => s.id === staffId);
  const totalPrice = useMemo(() =>
    (services as any[]).filter(sv => selectedServiceIds.includes(sv.id)).reduce((s, sv) => s + sv.price, 0),
    [services, selectedServiceIds],
  );
  const totalDuration = selectedServiceIds.length * 30;

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
    if (!staffId)    { Alert.alert('Required', 'Please select a staff member.'); return; }
    if (selectedServiceIds.length === 0) { Alert.alert('Required', 'Please select at least one service.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        customerId, customerName: selectedCustomer?.name || '',
        staffId, staffName: selectedStaff?.name || '',
        serviceIds: selectedServiceIds,
        appointmentTime: appointmentDate.toISOString(),
        status, notes: notes.trim() || undefined,
        advanceAmount: parseFloat(advanceAmount) || 0,
      };
      if (editingId) {
        await updateAppointment(editingId, payload);
        Alert.alert('Updated', 'Appointment updated.');
      } else {
        await createAppointment(payload);
        Alert.alert('Booked!', 'Appointment booked.');
      }
      navigation?.goBack();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to save.'); }
    finally { setSubmitting(false); }
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const isFormComplete = !!customerId && !!staffId && selectedServiceIds.length > 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* ── Top Bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={D.text} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{editingId ? 'Edit Appointment' : 'Book Appointment'}</Text>
      </View>

      {/* ── Progress bar ── */}
      <View style={s.progressBar}>
        {[
          { label: 'Customer', done: !!customerId },
          { label: 'Staff',    done: !!staffId    },
          { label: 'Services', done: selectedServiceIds.length > 0 },
          { label: 'Date',     done: true },
        ].map((step, i) => (
          <View key={i} style={s.progressStep}>
            <View style={[s.progressDot, step.done && s.progressDotDone]}>
              {step.done
                ? <MaterialCommunityIcons name="check" size={11} color="#fff" />
                : <Text style={s.progressDotNum}>{i + 1}</Text>}
            </View>
            <Text style={[s.progressLabel, step.done && s.progressLabelDone]}>{step.label}</Text>
            {i < 3 && <View style={[s.progressLine, step.done && s.progressLineDone]} />}
          </View>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── 1. Customer ── */}
        <SectionLabel n={1}>SELECT CUSTOMER</SectionLabel>

        {!customerId ? (
          <View style={s.card}>
            {/* Search */}
            <View style={s.searchBox}>
              <MaterialCommunityIcons name="magnify" size={17} color={D.textMuted} style={{ marginLeft: 12 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by name or phone…"
                placeholderTextColor={D.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ paddingHorizontal: 12 }}>
                  <MaterialCommunityIcons name="close-circle" size={15} color={D.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Customer list */}
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {filteredCustomers.map((c: any, i: number) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.customerRow, i < filteredCustomers.length - 1 && s.customerRowBorder]}
                  onPress={() => { setCustomerId(c.id); setSearchQuery(''); }}
                  activeOpacity={0.75}
                >
                  <View style={[s.customerAvatar, { backgroundColor: avatarColor(c.name) }]}>
                    <Text style={s.customerAvatarText}>{initials(c.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.customerName}>{c.name}</Text>
                    {c.phone && <Text style={s.customerPhone}>{c.phone}</Text>}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={17} color={D.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Add new customer */}
            <TouchableOpacity style={s.addCustomerBtn} onPress={() => setShowAddCustomer(true)} activeOpacity={0.8}>
              <View style={s.addCustomerIcon}>
                <MaterialCommunityIcons name="account-plus" size={16} color={D.green} />
              </View>
              <Text style={s.addCustomerText}>Add New Customer</Text>
              <MaterialCommunityIcons name="chevron-right" size={15} color={D.green} />
            </TouchableOpacity>
          </View>
        ) : (
          // Selected customer row
          <View style={s.selectedRow}>
            <View style={[s.selectedAvatar, { backgroundColor: avatarColor(selectedCustomer?.name ?? '') }]}>
              <Text style={s.selectedAvatarText}>{initials(selectedCustomer?.name ?? '?')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.selectedName}>{selectedCustomer?.name}</Text>
              {selectedCustomer?.phone && <Text style={s.selectedSub}>{selectedCustomer.phone}</Text>}
            </View>
            <TouchableOpacity style={s.changeBtn} onPress={() => setCustomerId('')} activeOpacity={0.75}>
              <Text style={s.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 2. Staff ── */}
        <SectionLabel n={2}>SELECT STAFF</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.staffRow}>
          {staffMembers.map((staff: any) => {
            const active = staffId === staff.id;
            const color  = avatarColor(staff.name);
            return (
              <TouchableOpacity
                key={staff.id}
                style={[s.staffCard, active && s.staffCardActive]}
                onPress={() => setStaffId(staff.id)}
                activeOpacity={0.8}
              >
                <View style={[s.staffAvatar, { backgroundColor: active ? D.green : color }]}>
                  <Text style={s.staffAvatarText}>{initials(staff.name)}</Text>
                </View>
                <Text style={[s.staffName, active && s.staffNameActive]} numberOfLines={1}>
                  {staff.name.split(' ')[0]}
                </Text>
                {staff.branchName && (
                  <Text style={s.staffBranch} numberOfLines={1}>{staff.branchName}</Text>
                )}
                {active && (
                  <View style={s.staffCheckBadge}>
                    <MaterialCommunityIcons name="check" size={10} color={D.green} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── 3. Services ── */}
        <SectionLabel n={3}>SELECT SERVICES</SectionLabel>

        {/* Search bar */}
        <View style={s.serviceSearchBox}>
          <MaterialCommunityIcons name="magnify" size={16} color={D.textMuted} style={{ marginLeft: 12 }} />
          <TextInput
            style={s.serviceSearchInput}
            placeholder="Search services…"
            placeholderTextColor={D.textMuted}
            value={serviceSearch}
            onChangeText={setServiceSearch}
          />
          {serviceSearch.length > 0 && (
            <TouchableOpacity onPress={() => setServiceSearch('')} style={{ paddingHorizontal: 12 }}>
              <MaterialCommunityIcons name="close-circle" size={15} color={D.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Services grid */}
        <View style={s.servicesGrid}>
          {filteredServices.map(sv => {
            const active = selectedServiceIds.includes(sv.id);
            return (
              <TouchableOpacity
                key={sv.id}
                style={[s.serviceCard, active && s.serviceCardActive]}
                onPress={() => toggleService(sv.id)}
                activeOpacity={0.8}
              >
                <View style={s.serviceTop}>
                  <Text style={[s.serviceName, active && s.serviceNameActive]} numberOfLines={2}>{sv.name}</Text>
                  <View style={[s.serviceCheck, active && s.serviceCheckActive]}>
                    {active && <MaterialCommunityIcons name="check" size={11} color="#fff" />}
                  </View>
                </View>
                <Text style={[s.servicePrice, active && { color: D.green }]}>₹{sv.price}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Show more / count hint */}
        {!serviceSearch && (services as any[]).length > SHOW_LIMIT && (
          <TouchableOpacity
            style={s.showMoreBtn}
            onPress={() => setServiceSearch(' ')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="spa" size={14} color={D.green} />
            <Text style={s.showMoreText}>
              {(services as any[]).length - filteredServices.length > 0
                ? `+${(services as any[]).length - filteredServices.length} more services — search to find`
                : 'Search for more services'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Services summary */}
        {selectedServiceIds.length > 0 && (
          <View style={s.summaryCard}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>{selectedServiceIds.length} service{selectedServiceIds.length > 1 ? 's' : ''} · ~{totalDuration} min</Text>
              <Text style={s.summaryVal}>₹{totalPrice}</Text>
            </View>
            {(parseFloat(advanceAmount) || 0) > 0 && (
              <>
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { color: D.amber }]}>Advance paid</Text>
                  <Text style={[s.summaryVal, { color: D.amber }]}>- ₹{parseFloat(advanceAmount) || 0}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { color: D.green, fontWeight: '700' }]}>Balance due</Text>
                  <Text style={[s.summaryVal, { color: D.green }]}>₹{Math.max(0, totalPrice - (parseFloat(advanceAmount) || 0))}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── 4. Date & Time ── */}
        <SectionLabel n={4}>DATE & TIME</SectionLabel>
        <View style={s.dateTimeRow}>
          <TouchableOpacity style={s.dateTimeBtn} onPress={() => setPickerMode('date')} activeOpacity={0.8}>
            <MaterialCommunityIcons name="calendar" size={16} color={D.green} />
            <View>
              <Text style={s.dateTimeBtnLabel}>Date</Text>
              <Text style={s.dateTimeBtnVal}>{formatDate(appointmentDate)}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.dateTimeBtn} onPress={() => setPickerMode('time')} activeOpacity={0.8}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={D.green} />
            <View>
              <Text style={s.dateTimeBtnLabel}>Time</Text>
              <Text style={s.dateTimeBtnVal}>{formatTime(appointmentDate)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {pickerMode && (
          <View style={s.pickerBox}>
            <View style={s.pickerBoxHeader}>
              <Text style={s.pickerBoxTitle}>Select {pickerMode === 'date' ? 'Date' : 'Time'}</Text>
              <TouchableOpacity style={s.pickerCloseBtn} onPress={() => setPickerMode(null)}>
                <MaterialCommunityIcons name="close" size={17} color={D.textSub} />
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
                  scheduled: { color: D.blue,  bg: D.blueMuted,  border: D.blueBorder,  icon: 'calendar-clock'       },
                  completed: { color: D.green, bg: D.greenMuted, border: D.greenBorder, icon: 'check-circle-outline' },
                  cancelled: { color: D.red,   bg: D.redMuted,   border: D.redBorder,   icon: 'close-circle-outline' },
                }[st];
                const active = status === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[s.statusChip, active && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                    onPress={() => setStatus(st)}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons name={cfg.icon as any} size={15} color={active ? cfg.color : D.textMuted} />
                    <Text style={[s.statusChipText, active && { color: cfg.color, fontWeight: '700' }]}>
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
          placeholder="Special requests or notes… (optional)"
          value={notes}
          onChange={setNotes}
          multiline
        />

        {/* ── Advance Payment ── */}
        <SectionLabel n={editingId ? 7 : 6}>ADVANCE PAYMENT</SectionLabel>
        <View style={s.advanceBox}>
          <View style={s.advancePrefix}>
            <Text style={s.advancePrefixText}>₹</Text>
          </View>
          <TextInput
            style={s.advanceInput}
            placeholder="0"
            placeholderTextColor={D.textMuted}
            value={advanceAmount}
            onChangeText={setAdvanceAmount}
            keyboardType="numeric"
          />
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[s.submitBtn, (!isFormComplete || submitting) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isFormComplete || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons
                name={editingId ? 'content-save' : 'calendar-check'}
                size={20} color="#fff"
              />
              <Text style={s.submitBtnText}>
                {editingId ? 'Save Changes' : 'Book Appointment'}
              </Text>
              <MaterialCommunityIcons name="arrow-right" size={17} color="rgba(255,255,255,0.6)" />
            </>
          )}
        </TouchableOpacity>
        {!isFormComplete && (
          <Text style={s.submitHint}>Complete customer, staff and services to continue</Text>
        )}

      </ScrollView>

      {/* ── Add Customer Modal ── */}
      <Modal visible={showAddCustomer} transparent animationType="slide" onRequestClose={() => setShowAddCustomer(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              <View style={s.sheet}>
                <View style={s.handle} />
                <View style={s.sheetHeader}>
                  <View style={s.sheetIconBox}>
                    <MaterialCommunityIcons name="account-plus" size={18} color={D.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetTitle}>Add New Customer</Text>
                    <Text style={s.sheetSub}>Saved for future visits</Text>
                  </View>
                  <TouchableOpacity style={s.closeBtn} onPress={() => setShowAddCustomer(false)}>
                    <MaterialCommunityIcons name="close" size={18} color={D.textSub} />
                  </TouchableOpacity>
                </View>
                <FInput icon="account-outline" placeholder="Full Name *" value={newCustomerName} onChange={setNewCustomerName} autoFocus />
                <FInput icon="phone-outline" placeholder="Phone Number (optional)" value={newCustomerPhone} onChange={setNewCustomerPhone} keyboard="phone-pad" />
                <View style={s.sheetBtnRow}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAddCustomer(false)}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.saveBtn, (!newCustomerName.trim() || addingCustomer) && { opacity: 0.5 }]}
                    onPress={handleAddCustomer}
                    disabled={!newCustomerName.trim() || addingCustomer}
                    activeOpacity={0.85}
                  >
                    {addingCustomer
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <>
                          <MaterialCommunityIcons name="check" size={16} color="#fff" />
                          <Text style={s.saveBtnText}>Add Customer</Text>
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

  // Top bar
  topBar: {
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -40,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: D.radius.md,
    backgroundColor: D.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: D.text, letterSpacing: -0.3 },

  // Progress bar
  progressBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  progressStep:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressDot:      { width: 20, height: 20, borderRadius: 10, backgroundColor: D.surfaceAlt, borderWidth: 1.5, borderColor: D.border, alignItems: 'center', justifyContent: 'center' },
  progressDotDone:  { backgroundColor: D.green, borderColor: D.green },
  progressDotNum:   { fontSize: 9, fontWeight: '700', color: D.textMuted },
  progressLabel:    { fontSize: 10, fontWeight: '600', color: D.textMuted },
  progressLabelDone:{ color: D.green, fontWeight: '700' },
  progressLine:     { flex: 1, height: 2, backgroundColor: D.border, borderRadius: 1 },
  progressLineDone: { backgroundColor: D.green },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  // Customer card
  card: {
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border, overflow: 'hidden',
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  searchInput: {
    flex: 1, paddingHorizontal: 10, paddingVertical: 12,
    fontSize: 14, color: D.text,
  },
  customerRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  customerRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F2F4' },
  customerAvatar:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  customerAvatarText:{ color: '#fff', fontSize: 12, fontWeight: '700' },
  customerName:      { fontSize: 14, fontWeight: '700', color: D.text },
  customerPhone:     { fontSize: 11, color: D.textMuted, marginTop: 1 },
  addCustomerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderTopWidth: 1, borderTopColor: D.border,
    backgroundColor: D.greenMuted,
  },
  addCustomerIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.greenBorder,
  },
  addCustomerText: { flex: 1, fontSize: 13, fontWeight: '700', color: D.green },

  // Selected customer row
  selectedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.greenBorder,
    padding: 12,
  },
  selectedAvatar:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  selectedAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  selectedName:       { fontSize: 14, fontWeight: '700', color: D.text },
  selectedSub:        { fontSize: 11, color: D.textMuted, marginTop: 1 },
  changeBtn: {
    backgroundColor: D.greenMuted, borderRadius: D.radius.pill,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: D.greenBorder,
  },
  changeBtnText: { fontSize: 12, fontWeight: '700', color: D.green },

  // Staff row
  staffRow: { gap: 10, paddingBottom: 4 },
  staffCard: {
    alignItems: 'center', backgroundColor: D.surface,
    borderRadius: D.radius.lg, borderWidth: 1.5, borderColor: D.border,
    padding: 12, minWidth: 80, position: 'relative',
  },
  staffCardActive:   { borderColor: D.green, backgroundColor: D.greenMuted },
  staffAvatar:       { width: 44, height: 44, borderRadius: D.radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  staffAvatarText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  staffName:         { fontSize: 11, fontWeight: '700', color: D.text, textAlign: 'center' },
  staffNameActive:   { color: D.green },
  staffBranch:       { fontSize: 9, color: D.textMuted, marginTop: 2, textAlign: 'center' },
  staffCheckBadge: {
    position: 'absolute', top: 5, right: 5,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: D.greenMuted, borderWidth: 1, borderColor: D.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  // Services
  serviceSearchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surfaceAlt, borderRadius: D.radius.lg,
    borderWidth: 1, borderColor: D.border, marginBottom: 10,
  },
  serviceSearchInput: {
    flex: 1, paddingHorizontal: 10, paddingVertical: 11,
    fontSize: 14, color: D.text,
  },
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: D.greenMuted, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.greenBorder, marginBottom: 4,
  },
  showMoreText: { fontSize: 12, fontWeight: '600', color: D.green },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  serviceCard: {
    flexBasis: '47%', flex: 1, backgroundColor: D.surface,
    borderRadius: D.radius.lg, borderWidth: 1.5, borderColor: D.border, padding: 12,
  },
  serviceCardActive: { borderColor: D.green, backgroundColor: D.greenMuted },
  serviceTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  serviceName:       { flex: 1, fontSize: 13, fontWeight: '600', color: D.text, lineHeight: 18 },
  serviceNameActive: { color: D.green },
  serviceCheck: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: D.border,
    backgroundColor: D.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  serviceCheckActive:{ backgroundColor: D.green, borderColor: D.green },
  servicePrice:      { fontSize: 13, fontWeight: '800', color: D.textSub },

  // Summary card
  summaryCard: {
    backgroundColor: D.greenMuted, borderRadius: D.radius.md,
    padding: 12, borderWidth: 1, borderColor: D.greenBorder, marginBottom: 4,
  },
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  summaryDivider:{ height: 1, backgroundColor: D.greenBorder, marginVertical: 6 },
  summaryLabel:  { fontSize: 13, color: D.green, fontWeight: '600' },
  summaryVal:    { fontSize: 14, fontWeight: '800', color: D.green },

  // Date time row
  dateTimeRow: { flexDirection: 'row', gap: 10 },
  dateTimeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: D.surface, borderRadius: D.radius.lg,
    borderWidth: 1, borderColor: D.border, padding: 12,
  },
  dateTimeBtnLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateTimeBtnVal:   { fontSize: 13, fontWeight: '700', color: D.text, marginTop: 2 },

  // Picker
  pickerBox: {
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border, padding: 14, marginTop: 8,
  },
  pickerBoxHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pickerBoxTitle:  { fontSize: 14, fontWeight: '700', color: D.text },
  pickerCloseBtn: {
    width: 28, height: 28, borderRadius: D.radius.sm,
    backgroundColor: D.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  pickerDoneBtn: {
    marginTop: 8, backgroundColor: D.green,
    borderRadius: D.radius.lg, paddingVertical: 12, alignItems: 'center',
  },
  pickerDoneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Status chips
  statusRow:      { flexDirection: 'row', gap: 8 },
  statusChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: D.radius.lg,
    backgroundColor: D.surfaceAlt, borderWidth: 1.5, borderColor: D.border,
  },
  statusChipText: { fontSize: 12, fontWeight: '600', color: D.textMuted },

  // Advance
  advanceBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surfaceAlt, borderRadius: D.radius.md,
    borderWidth: 1.5, borderColor: D.border, overflow: 'hidden',
  },
  advancePrefix: {
    width: 44, height: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.surface, borderRightWidth: 1, borderRightColor: D.border,
  },
  advancePrefixText: { fontSize: 18, fontWeight: '700', color: D.green },
  advanceInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 18, fontWeight: '700', color: D.text,
  },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: D.radius.xl,
    backgroundColor: D.green, marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText:     { flex: 1, color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  submitHint:        { textAlign: 'center', fontSize: 12, color: D.textMuted, marginTop: 10 },

  // Modal / sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: D.surface,
    borderTopLeftRadius: D.radius.xxl, borderTopRightRadius: D.radius.xxl,
    padding: 20, paddingBottom: Platform.select({ ios: 36, android: 24, default: 24 }),
    borderTopWidth: 1, borderColor: D.border,
  },
  handle: {
    width: 36, height: 4, backgroundColor: D.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 18,
  },
  sheetHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sheetIconBox: {
    width: 40, height: 40, borderRadius: D.radius.md,
    backgroundColor: D.greenMuted, borderWidth: 1, borderColor: D.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetTitle:   { fontSize: 16, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  sheetSub:     { fontSize: 12, color: D.textMuted, marginTop: 1 },
  closeBtn: {
    width: 34, height: 34, borderRadius: D.radius.sm,
    backgroundColor: D.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  sheetBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: D.radius.lg,
    backgroundColor: D.surfaceAlt, alignItems: 'center',
    borderWidth: 1, borderColor: D.border,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: D.textSub },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: D.radius.lg, backgroundColor: D.green,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});