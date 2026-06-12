import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { Appointment, AppointmentStatus } from '../types';

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

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  scheduled: { label: 'Scheduled', icon: 'calendar-clock',    color: D.blue,  bg: D.blueMuted,  border: D.blueBorder  },
  completed: { label: 'Completed', icon: 'check-circle',      color: D.green, bg: D.greenMuted, border: D.greenBorder },
  cancelled: { label: 'Cancelled', icon: 'close-circle',      color: D.red,   bg: D.redMuted,   border: D.redBorder   },
} as const;

const statusCfg = (status: AppointmentStatus) =>
  STATUS_CFG[status] ?? { label: status, icon: 'help-circle', color: D.textMuted, bg: D.surfaceAlt, border: D.border };

// ─── SectionLabel ─────────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: string }) => (
  <View style={sl.row}>
    <View style={sl.line} />
    <Text style={sl.text}>{children}</Text>
    <View style={sl.line} />
  </View>
);
const sl = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  line: { flex: 1, height: 1, backgroundColor: D.border },
  text: { fontSize: 10, fontWeight: '700', color: D.textSub, letterSpacing: 2, textTransform: 'uppercase' },
});

interface Props {
  navigation?: any;
  route?: { params?: { customerId?: string } };
}

export const AppointmentsListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { appointments, deleteAppointment, refreshData, loading } = useData();
  const { user, staffMembers } = useAuth();

  const [refreshing, setRefreshing]     = useState(false);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('all');
  const [filterStaff, setFilterStaff]   = useState<string>('all');

  const customerIdFilter = route?.params?.customerId;

  const filteredAppointments = useMemo(() => {
    let f = [...appointments];
    if (customerIdFilter) f = f.filter(a => a.customerId === customerIdFilter);
    if (filterStatus !== 'all') f = f.filter(a => a.status === filterStatus);
    if (filterStaff  !== 'all') f = f.filter(a => a.staffId  === filterStaff);
    return f.sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime());
  }, [appointments, filterStatus, filterStaff, customerIdFilter]);

  const now      = new Date().toISOString();
  const upcoming = useMemo(() => filteredAppointments.filter(a => a.appointmentTime >= now && a.status === 'scheduled'), [filteredAppointments]);
  const past     = useMemo(() => filteredAppointments.filter(a => a.appointmentTime < now  || a.status !== 'scheduled'),  [filteredAppointments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleDelete = (a: Appointment) => {
    Alert.alert('Delete Appointment', `Delete appointment for ${a.customerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteAppointment(a.id); }
        catch (e: any) { Alert.alert('Error', e.message || 'Failed to delete'); }
      }},
    ]);
  };

  const formatDate = (ds: string) => {
    const d = new Date(ds);
    const today    = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString())    return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const formatTime = (ds: string) =>
    new Date(ds).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // ── Appointment Row ──────────────────────────────────────────────────────────
  const AppointmentRow = ({ appointment: a, isLast }: { appointment: Appointment; isLast: boolean }) => {
    const cfg        = statusCfg(a.status);
    const isUpcoming = a.status === 'scheduled' && a.appointmentTime >= now;
    const dateLabel  = formatDate(a.appointmentTime);
    const isToday    = dateLabel === 'Today';

    return (
      <View style={[ar.row, isLast && ar.rowLast]}>

        {/* Left — date + time column */}
        <View style={ar.dateCol}>
          <Text style={[ar.dateLabel, isToday && { color: D.green, fontWeight: '700' }]}>{dateLabel}</Text>
          <Text style={ar.timeLabel}>{formatTime(a.appointmentTime)}</Text>
        </View>

        {/* Vertical rule */}
        <View style={[ar.vLine, { backgroundColor: isUpcoming ? D.green : D.border }]} />

        {/* Right — main content */}
        <View style={ar.content}>
          {/* Customer + staff */}
          <View style={ar.nameRow}>
            <Text style={ar.customerName} numberOfLines={1}>{a.customerName}</Text>
            <View style={[ar.statusPill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <View style={[ar.statusDot, { backgroundColor: cfg.color }]} />
              <Text style={[ar.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          <Text style={ar.staffName} numberOfLines={1}>{a.staffName}</Text>

          {/* Services */}
          {a.serviceNames && a.serviceNames.length > 0 && (
            <Text style={ar.services} numberOfLines={1}>{a.serviceNames.join(' · ')}</Text>
          )}

          {/* Notes */}
          {a.notes && (
            <Text style={ar.notes} numberOfLines={1}>{a.notes}</Text>
          )}

          {/* Advance */}
          {a.advanceAmount && a.advanceAmount > 0 && (
            <View style={ar.advancePill}>
              <MaterialCommunityIcons name="cash" size={11} color={D.amber} />
              <Text style={ar.advanceText}>Advance ₹{a.advanceAmount}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={ar.actions}>
            {isUpcoming && (
              <>
                <TouchableOpacity
                  style={[ar.actionBtn, ar.actionBtnGreen]}
                  onPress={() => navigation?.navigate('StaffBilling', {
                    customerId: a.customerId, customerName: a.customerName, appointmentId: a.id,
                  })}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="check" size={13} color={D.green} />
                  <Text style={[ar.actionBtnText, { color: D.green }]}>Complete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ar.actionBtn, ar.actionBtnNeutral]}
                  onPress={() => navigation?.navigate('BookAppointment', { appointmentId: a.id })}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={13} color={D.textSub} />
                  <Text style={ar.actionBtnText}>Edit</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[ar.actionBtn, ar.actionBtnRed]}
              onPress={() => handleDelete(a)}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="delete-outline" size={13} color={D.red} />
              <Text style={[ar.actionBtnText, { color: D.red }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const STATUS_FILTERS: { key: AppointmentStatus | 'all'; label: string; icon: string }[] = [
    { key: 'all',       label: 'All',       icon: 'calendar-blank-outline'  },
    { key: 'scheduled', label: 'Upcoming',  icon: 'calendar-clock'          },
    { key: 'completed', label: 'Done',      icon: 'check-circle-outline'    },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline'    },
  ];

  const statusCount = (key: AppointmentStatus | 'all') => {
    if (key === 'all') return filteredAppointments.length;
    return filteredAppointments.filter(a => a.status === key).length;
  };

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.root}>

        {/* ── Top Bar ── */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={D.text} />
          </TouchableOpacity>
          <Text style={s.topBarTitle}>Appointments</Text>
          <TouchableOpacity
            style={s.bookBtn}
            onPress={() => navigation?.navigate('BookAppointment')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="plus" size={16} color="#fff" />
            <Text style={s.bookBtnText}>Book</Text>
          </TouchableOpacity>
        </View>

        {/* ── Summary strip ── */}
        <View style={s.summaryStrip}>
          <View style={s.stripStat}>
            <Text style={[s.stripVal, { color: D.blue }]}>{upcoming.length}</Text>
            <Text style={s.stripLabel}>Upcoming</Text>
          </View>
          <View style={s.stripDivider} />
          <View style={s.stripStat}>
            <Text style={s.stripVal}>{filteredAppointments.length}</Text>
            <Text style={s.stripLabel}>Total</Text>
          </View>
          <View style={s.stripDivider} />
          <View style={s.stripStat}>
            <Text style={[s.stripVal, { color: D.green }]}>
              {filteredAppointments.filter(a => a.status === 'completed').length}
            </Text>
            <Text style={s.stripLabel}>Completed</Text>
          </View>
          <View style={s.stripDivider} />
          <View style={s.stripStat}>
            <Text style={[s.stripVal, { color: D.red }]}>
              {filteredAppointments.filter(a => a.status === 'cancelled').length}
            </Text>
            <Text style={s.stripLabel}>Cancelled</Text>
          </View>
        </View>

        {/* ── Filters ── */}
        <View style={s.filtersPanel}>

          {/* Segmented status control */}
          <View style={s.segWrap}>
            <View style={s.seg}>
              {STATUS_FILTERS.map(f => {
                const active = filterStatus === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[s.segBtn, active && s.segBtnActive]}
                    onPress={() => setFilterStatus(f.key)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={f.icon as any}
                      size={16}
                      color={active ? D.green : D.textMuted}
                    />
                    <Text style={[s.segLabel, active && s.segLabelActive]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Staff avatar chips — admin only */}
          {user?.role === 'admin' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.staffRow}
            >
              {/* All staff chip */}
              <TouchableOpacity
                style={[s.staffChip, filterStaff === 'all' && s.staffChipActive]}
                onPress={() => setFilterStaff('all')}
                activeOpacity={0.8}
              >
                <View style={s.staffChipAllIcon}>
                  <MaterialCommunityIcons
                    name="account-multiple-outline"
                    size={13}
                    color={filterStaff === 'all' ? D.green : D.textMuted}
                  />
                </View>
                <Text style={[s.staffChipText, filterStaff === 'all' && s.staffChipTextActive]}>
                  All Staff
                </Text>
              </TouchableOpacity>

              {staffMembers.map((st: any) => {
                const active = filterStaff === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[s.staffChip, active && s.staffChipActive]}
                    onPress={() => setFilterStaff(st.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.staffAvatar, active && s.staffAvatarActive]}>
                      <Text style={s.staffAvatarText}>{initials(st.name)}</Text>
                    </View>
                    <Text style={[s.staffChipText, active && s.staffChipTextActive]}>
                      {st.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── List ── */}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.green} colors={[D.green]} />
          }
        >
          {loading && !refreshing ? (
            <View style={s.centerWrap}>
              <ActivityIndicator size="large" color={D.green} />
              <Text style={s.loadingText}>Loading appointments…</Text>
            </View>
          ) : filteredAppointments.length === 0 ? (
            <View style={s.centerWrap}>
              <View style={s.emptyIcon}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={28} color={D.textMuted} />
              </View>
              <Text style={s.emptyTitle}>No appointments found</Text>
              <Text style={s.emptyHint}>
                {filterStatus !== 'all'
                  ? `No ${filterStatus} appointments`
                  : 'Book your first appointment to get started'}
              </Text>
              <TouchableOpacity
                style={s.emptyBookBtn}
                onPress={() => navigation?.navigate('BookAppointment')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="calendar-plus" size={16} color="#fff" />
                <Text style={s.emptyBookBtnText}>Book Appointment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {upcoming.length > 0 && (
                <>
                  <SectionLabel>{`UPCOMING — ${upcoming.length}`}</SectionLabel>
                  <View style={s.listCard}>
                    {upcoming.map((a, i) => (
                      <AppointmentRow key={a.id} appointment={a} isLast={i === upcoming.length - 1} />
                    ))}
                  </View>
                </>
              )}
              {past.length > 0 && (
                <>
                  <SectionLabel>{`PAST — ${past.length}`}</SectionLabel>
                  <View style={s.listCard}>
                    {past.map((a, i) => (
                      <AppointmentRow key={a.id} appointment={a} isLast={i === past.length - 1} />
                    ))}
                  </View>
                </>
              )}
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Bottom add button ── */}
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={s.bottomBookBtn}
            onPress={() => navigation?.navigate('BookAppointment')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="calendar-plus" size={20} color="#fff" />
            <Text style={s.bottomBookBtnText}>Book Appointment</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
};

// ─── Appointment row styles ───────────────────────────────────────────────────
const ar = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 14, paddingHorizontal: 14,
    backgroundColor: D.surface,
    borderBottomWidth: 1, borderBottomColor: '#F0F2F4',
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: D.border,
  },
  rowLast: {
    borderBottomWidth: 1, borderBottomColor: D.border,
    borderBottomLeftRadius: D.radius.xl, borderBottomRightRadius: D.radius.xl,
  },

  // Date column
  dateCol:  { width: 56, alignItems: 'center', paddingTop: 2, flexShrink: 0 },
  dateLabel:{ fontSize: 12, fontWeight: '600', color: D.textSub, textAlign: 'center' },
  timeLabel:{ fontSize: 11, color: D.textMuted, marginTop: 3, textAlign: 'center' },

  // Vertical rule
  vLine: { width: 2, borderRadius: 1, alignSelf: 'stretch', marginTop: 4, flexShrink: 0 },

  // Content
  content:      { flex: 1, minWidth: 0, gap: 4 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  customerName: { fontSize: 14, fontWeight: '700', color: D.text, flex: 1 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: D.radius.pill, borderWidth: 1, flexShrink: 0,
  },
  statusDot:  { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  staffName:  { fontSize: 12, color: D.textSub, fontWeight: '500' },
  services:   { fontSize: 12, color: D.green, fontWeight: '600' },
  notes: { fontSize: 11, color: D.textMuted, fontStyle: 'italic' },
  advancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: D.amberMuted, borderRadius: D.radius.pill,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: D.amberBorder,
  },
  advanceText: { fontSize: 11, fontWeight: '600', color: D.amber },

  // Actions
  actions:       { flexDirection: 'row', gap: 6, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: D.radius.md, borderWidth: 1,
  },
  actionBtnGreen:   { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  actionBtnNeutral: { backgroundColor: D.surfaceAlt, borderColor: D.border },
  actionBtnRed:     { backgroundColor: D.redMuted,   borderColor: D.redBorder  },
  actionBtnText:    { fontSize: 11, fontWeight: '700', color: D.textSub },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: D.bg,
    marginTop: -8, // Fixes empty white space at the top
  },
  root: { 
    flex: 1, 
    backgroundColor: D.bg,
  },

  // Top bar
  topBar: {
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -30,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: D.radius.md,
    backgroundColor: D.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: D.text, letterSpacing: -0.3 },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: D.green, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: D.radius.pill,
  },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Summary strip
  summaryStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  stripStat:    { flex: 1, alignItems: 'center', gap: 2 },
  stripDivider: { width: 1, height: 28, backgroundColor: D.border },
  stripVal:     { fontSize: 18, fontWeight: '800', color: D.text, letterSpacing: -0.5 },
  stripLabel:   { fontSize: 10, color: D.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Filters panel
  filtersPanel: {
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
  },

  // Segmented status control
  segWrap: { padding: 10, paddingBottom: 8 },
  seg: {
    flexDirection: 'row', backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.lg, padding: 3, gap: 3,
  },
  segBtn: {
    flex: 1, alignItems: 'center', gap: 3,
    paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: D.radius.md, backgroundColor: 'transparent',
  },
  segBtnActive: {
    backgroundColor: D.surface,
    shadowColor: 'rgba(0,0,0,0.10)', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1, shadowRadius: 3, elevation: 2,
  },
  segLabel:          { fontSize: 10, fontWeight: '600', color: D.textMuted },
  segLabelActive:    { color: D.green, fontWeight: '700' },
  segCount: {
    backgroundColor: D.surfaceAlt, borderRadius: D.radius.pill,
    paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center',
  },
  segCountActive:    { backgroundColor: D.greenMuted },
  segCountText:      { fontSize: 11, fontWeight: '800', color: D.textMuted },
  segCountTextActive:{ color: D.green },

  // Staff chips
  staffRow: { paddingHorizontal: 12, paddingBottom: 10, gap: 8, flexDirection: 'row' },
  staffChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, paddingRight: 10, paddingLeft: 5,
    backgroundColor: D.surfaceAlt, borderRadius: D.radius.pill,
    borderWidth: 1, borderColor: D.border,
  },
  staffChipActive:    { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  staffChipAllIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center',
  },
  staffAvatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center',
  },
  staffAvatarActive:  { backgroundColor: D.green },
  staffAvatarText:    { color: '#fff', fontSize: 8, fontWeight: '700' },
  staffChipText:      { fontSize: 12, fontWeight: '600', color: D.textSub },
  staffChipTextActive:{ color: D.green, fontWeight: '700' },

  // Scroll
  scroll:      { flex: 1 },
  listContent: { padding: 16, paddingBottom: 48 },

  // White card wrapping rows
  listCard: {
    backgroundColor: D.surface,
    borderTopWidth: 1, borderTopColor: D.border,
    borderTopLeftRadius: D.radius.xl, borderTopRightRadius: D.radius.xl,
    overflow: 'hidden', marginBottom: 16,
  },

  // Center / empty
  centerWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText:{ fontSize: 13, color: D.textMuted, marginTop: 12 },
  emptyIcon: {
    width: 68, height: 68, borderRadius: D.radius.xl,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle:   { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 6 },
  emptyHint:    { fontSize: 13, color: D.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.green, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: D.radius.pill,
  },
  emptyBookBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Bottom bar
  bottomBar: {
    backgroundColor: D.surface, borderTopWidth: 1, borderTopColor: D.border,
    paddingHorizontal: 16, paddingTop: 10,
    paddingBottom: Platform.select({ ios: 32, android: 14, default: 14 }),
  },
  bottomBookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: D.green, borderRadius: D.radius.pill, paddingVertical: 14,
  },
  bottomBookBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});