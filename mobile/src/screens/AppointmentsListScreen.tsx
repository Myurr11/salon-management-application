import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { colors, theme, shadows } from '../theme';
import type { Appointment, AppointmentStatus } from '../types';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceWarm: '#FFFDF9',
  border: '#E8E3DB',

  // Green is primary accent
  green: '#2D9A5F',
  greenLight: '#38B872',
  greenMuted: '#2D9A5F15',
  greenBorder: '#2D9A5F40',
  greenDeep: '#1E7A48',

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
  route?: { params?: { customerId?: string } };
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  scheduled: { label: 'Scheduled', icon: 'calendar-clock', color: D.blue,   bg: D.blueMuted,   border: D.blueBorder },
  completed:  { label: 'Completed', icon: 'check-circle',   color: D.green,  bg: D.greenMuted,  border: D.greenBorder },
  cancelled:  { label: 'Cancelled', icon: 'close-circle',   color: D.red,    bg: D.redMuted,    border: D.redBorder },
} as const;

const statusCfg = (status: AppointmentStatus) =>
  STATUS_CFG[status] ?? { label: status, icon: 'help-circle', color: D.textMuted, bg: D.border, border: D.border };

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: string }) => (
  <View style={sl.row}>
    <View style={sl.dash} />
    <Text style={sl.text}>{children}</Text>
    <View style={sl.line} />
  </View>
);
const sl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 },
  dash: { width: 16, height: 2, backgroundColor: D.green, borderRadius: 1 },
  line: { flex: 1, height: 1, backgroundColor: D.border },
  text: { color: D.green, fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
});

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 36 }: { name: string; size?: number }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: D.greenMuted, borderWidth: 1, borderColor: D.greenBorder, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.36, color: D.green, fontWeight: '800' }}>{initials}</Text>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const AppointmentsListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { appointments, deleteAppointment, refreshData, loading } = useData();
  const { user, staffMembers } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('all');
  const [filterStaff, setFilterStaff] = useState<string>('all');

  const customerIdFilter = route?.params?.customerId;

  const filteredAppointments = useMemo(() => {
    let f = [...appointments];
    if (customerIdFilter) f = f.filter(a => a.customerId === customerIdFilter);
    if (filterStatus !== 'all') f = f.filter(a => a.status === filterStatus);
    if (filterStaff !== 'all') f = f.filter(a => a.staffId === filterStaff);
    return f.sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime());
  }, [appointments, filterStatus, filterStaff, customerIdFilter]);

  const now = new Date().toISOString();
  const upcoming = useMemo(() => filteredAppointments.filter(a => a.appointmentTime >= now && a.status === 'scheduled'), [filteredAppointments]);
  const past     = useMemo(() => filteredAppointments.filter(a => a.appointmentTime < now || a.status !== 'scheduled'),  [filteredAppointments]);

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
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const formatTime = (ds: string) =>
    new Date(ds).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // ── Appointment Card ────────────────────────────────────────────────────────
  const AppointmentCard = ({ appointment: a }: { appointment: Appointment }) => {
    const cfg = statusCfg(a.status);
    const isUpcoming = a.status === 'scheduled' && a.appointmentTime >= now;
    const dateLabel = formatDate(a.appointmentTime);
    const isToday = dateLabel === 'Today';

    return (
      <View style={s.card}>
        {/* Green left stripe for upcoming, muted otherwise */}
        <View style={[s.cardStripe, { backgroundColor: isUpcoming ? D.green : D.border }]} />

        <View style={s.cardInner}>
          {/* ── Top row: status + date/time ── */}
          <View style={s.cardTopRow}>
            <View style={[s.statusChip, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <MaterialCommunityIcons name={cfg.icon as any} size={13} color={cfg.color} />
              <Text style={[s.statusChipText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <View style={s.dateTimeBox}>
              <View style={[s.dateBadge, isToday && { backgroundColor: D.greenMuted, borderColor: D.greenBorder }]}>
                <MaterialCommunityIcons name="calendar-outline" size={12} color={isToday ? D.green : D.textMuted} />
                <Text style={[s.dateText, isToday && { color: D.green, fontWeight: '700' }]}>{dateLabel}</Text>
              </View>
              <View style={s.timeBadge}>
                <MaterialCommunityIcons name="clock-outline" size={12} color={D.textMuted} />
                <Text style={s.timeText}>{formatTime(a.appointmentTime)}</Text>
              </View>
            </View>
          </View>

          {/* ── Customer + Staff ── */}
          <View style={s.peopleRow}>
            <View style={s.personItem}>
              <View style={[s.personIconBox, { backgroundColor: D.greenMuted, borderColor: D.greenBorder }]}>
                <MaterialCommunityIcons name="account" size={16} color={D.green} />
              </View>
              <View>
                <Text style={s.personLabel}>Customer</Text>
                <Text style={s.personName}>{a.customerName}</Text>
              </View>
            </View>
            <View style={s.personDivider} />
            <View style={s.personItem}>
              <View style={[s.personIconBox, { backgroundColor: D.purpleMuted, borderColor: D.purpleBorder }]}>
                <MaterialCommunityIcons name="account-tie" size={16} color={D.purple} />
              </View>
              <View>
                <Text style={s.personLabel}>Staff</Text>
                <Text style={s.personName}>{a.staffName}</Text>
              </View>
            </View>
          </View>

          {/* ── Services ── */}
          {a.serviceNames && a.serviceNames.length > 0 && (
            <View style={s.servicesWrap}>
              <MaterialCommunityIcons name="spa" size={14} color={D.green} style={{ marginTop: 1 }} />
              <Text style={s.servicesText}>{a.serviceNames.join(' · ')}</Text>
            </View>
          )}

          {/* ── Notes ── */}
          {a.notes && (
            <View style={s.notesWrap}>
              <MaterialCommunityIcons name="note-text-outline" size={14} color={D.textMuted} style={{ marginTop: 1 }} />
              <Text style={s.notesText}>{a.notes}</Text>
            </View>
          )}

          {/* ── Advance Amount ── */}
          {a.advanceAmount && a.advanceAmount > 0 && (
            <View style={s.advanceWrap}>
              <MaterialCommunityIcons name="cash" size={14} color={D.gold} style={{ marginTop: 1 }} />
              <Text style={[s.advanceText, { color: D.gold }]}>Advance Paid: ₹{a.advanceAmount}</Text>
            </View>
          )}

          {/* ── Actions ── */}
          <View style={s.actionsRow}>
            {isUpcoming && (
              <>
                <TouchableOpacity
                  style={[s.actionBtn, s.actionBtnGreen]}
                  onPress={() => navigation?.navigate('StaffBilling', {
                    customerId: a.customerId, customerName: a.customerName, appointmentId: a.id,
                  })}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="check" size={15} color={D.green} />
                  <Text style={[s.actionBtnText, { color: D.green }]}>Complete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionBtn, s.actionBtnBlue]}
                  onPress={() => navigation?.navigate('BookAppointment', { appointmentId: a.id })}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={15} color={D.blue} />
                  <Text style={[s.actionBtnText, { color: D.blue }]}>Edit</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[s.actionBtn, s.actionBtnRed]}
              onPress={() => handleDelete(a)}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="delete-outline" size={15} color={D.red} />
              <Text style={[s.actionBtnText, { color: D.red }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const statusFilters: { key: AppointmentStatus | 'all'; label: string; icon: string }[] = [
    { key: 'all',       label: 'All',       icon: 'calendar-multiple' },
    { key: 'scheduled', label: 'Scheduled', icon: 'calendar-clock' },
    { key: 'completed', label: 'Completed', icon: 'check-circle-outline' },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={D.text} />
          </TouchableOpacity>
          <View style={s.headerIconBox}>
            <MaterialCommunityIcons name="calendar-clock" size={22} color={D.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Appointments</Text>
            <Text style={s.headerSub}>{upcoming.length} upcoming · {past.length} past</Text>
          </View>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => navigation?.navigate('BookAppointment')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
            <Text style={s.addBtnText}>Book</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats Band ── */}
        <View style={s.statsBand}>
          <View style={[s.statCard, { borderColor: D.greenBorder }]}>
            <View style={[s.statIcon, { backgroundColor: D.greenMuted }]}>
              <MaterialCommunityIcons name="calendar-clock" size={17} color={D.green} />
            </View>
            <Text style={s.statValue}>{upcoming.length}</Text>
            <Text style={s.statLabel}>Upcoming</Text>
          </View>
          <View style={[s.statCard, { borderColor: D.blueBorder }]}>
            <View style={[s.statIcon, { backgroundColor: D.blueMuted }]}>
              <MaterialCommunityIcons name="calendar-multiple" size={17} color={D.blue} />
            </View>
            <Text style={s.statValue}>{filteredAppointments.length}</Text>
            <Text style={s.statLabel}>Total</Text>
          </View>
          <View style={[s.statCard, { borderColor: D.amberBorder }]}>
            <View style={[s.statIcon, { backgroundColor: D.amberMuted }]}>
              <MaterialCommunityIcons name="check-circle-outline" size={17} color={D.amber} />
            </View>
            <Text style={s.statValue}>
              {filteredAppointments.filter(a => a.status === 'completed').length}
            </Text>
            <Text style={s.statLabel}>Completed</Text>
          </View>
          <View style={[s.statCard, { borderColor: D.redBorder }]}>
            <View style={[s.statIcon, { backgroundColor: D.redMuted }]}>
              <MaterialCommunityIcons name="close-circle-outline" size={17} color={D.red} />
            </View>
            <Text style={s.statValue}>
              {filteredAppointments.filter(a => a.status === 'cancelled').length}
            </Text>
            <Text style={s.statLabel}>Cancelled</Text>
          </View>
        </View>

        {/* ── Filters ── */}
        <View style={s.filtersWrap}>
          {/* Status row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
            {statusFilters.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[s.filterChip, filterStatus === f.key && s.filterChipActive]}
                onPress={() => setFilterStatus(f.key)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons
                  name={f.icon as any}
                  size={14}
                  color={filterStatus === f.key ? D.green : D.textMuted}
                />
                <Text style={[s.filterChipText, filterStatus === f.key && s.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Staff row (admin only) */}
          {user?.role === 'admin' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.filterScroll, { paddingTop: 0, paddingBottom: 12 }]}>
              <TouchableOpacity
                style={[s.filterChip, filterStaff === 'all' && s.filterChipActive]}
                onPress={() => setFilterStaff('all')}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name="account-multiple-outline" size={14} color={filterStaff === 'all' ? D.green : D.textMuted} />
                <Text style={[s.filterChipText, filterStaff === 'all' && s.filterChipTextActive]}>All Staff</Text>
              </TouchableOpacity>
              {staffMembers.map((st: any) => (
                <TouchableOpacity
                  key={st.id}
                  style={[s.filterChip, filterStaff === st.id && s.filterChipActive]}
                  onPress={() => setFilterStaff(st.id)}
                  activeOpacity={0.75}
                >
                  <Avatar name={st.name} size={22} />
                  <Text style={[s.filterChipText, filterStaff === st.id && s.filterChipTextActive]}>
                    {st.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── List ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.green} colors={[D.green]} />}
        >
          {loading && !refreshing ? (
            <View style={s.centerWrap}>
              <ActivityIndicator size="large" color={D.green} />
              <Text style={s.loadingText}>Loading appointments…</Text>
            </View>
          ) : filteredAppointments.length === 0 ? (
            <View style={s.centerWrap}>
              <View style={s.emptyIconBox}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={36} color={D.textMuted} />
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
                <MaterialCommunityIcons name="calendar-plus" size={18} color="#FFF" />
                <Text style={s.emptyBookBtnText}>Book Appointment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {upcoming.length > 0 && (
                <>
                  <SectionLabel>{`UPCOMING — ${upcoming.length}`}</SectionLabel>
                  {upcoming.map(a => <AppointmentCard key={a.id} appointment={a} />)}
                </>
              )}
              {past.length > 0 && (
                <>
                  <SectionLabel>{`PAST — ${past.length}`}</SectionLabel>
                  {past.map(a => <AppointmentCard key={a.id} appointment={a} />)}
                </>
              )}
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── FAB ── */}
        <TouchableOpacity
          style={s.fab}
          onPress={() => navigation?.navigate('BookAppointment')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="calendar-plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: D.bg },
  container: { flex: 1, backgroundColor: D.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: -50,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20,
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border, gap: 10,
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
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: D.green, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: D.radius.pill,
    shadowColor: D.green, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Stats band
  statsBand: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: D.surfaceWarm, borderBottomWidth: 1, borderBottomColor: D.border,
  },
  statCard: {
    flex: 1, backgroundColor: D.surface, borderRadius: D.radius.lg,
    padding: 10, alignItems: 'center', borderWidth: 1,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 3, elevation: 1,
  },
  statIcon: {
    width: 30, height: 30, borderRadius: D.radius.sm,
    alignItems: 'center', justifyContent: 'center', marginBottom: 5,
  },
  statValue: { fontSize: 15, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  statLabel: { fontSize: 9, color: D.textMuted, fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },

  // Filters
  filtersWrap: {
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
  },
  filterScroll: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: D.bg, borderRadius: D.radius.pill,
    borderWidth: 1.5, borderColor: D.border,
  },
  filterChipActive: { backgroundColor: D.greenMuted, borderColor: D.green },
  filterChipText: { fontSize: 13, fontWeight: '600', color: D.textSub },
  filterChipTextActive: { color: D.green },

  // List
  listContent: { paddingHorizontal: 20, paddingTop: 16 },
  centerWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 14, color: D.textMuted, marginTop: 12 },

  // Empty state
  emptyIconBox: {
    width: 80, height: 80, borderRadius: D.radius.xl,
    backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border, marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: D.text, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: D.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.green, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: D.radius.xl,
    shadowColor: D.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  emptyBookBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Appointment Card
  card: {
    flexDirection: 'row', backgroundColor: D.surface, borderRadius: D.radius.xl,
    marginBottom: 12, borderWidth: 1, borderColor: D.border, overflow: 'hidden',
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  cardStripe: { width: 4 },
  cardInner: { flex: 1, padding: 14 },

  // Card top row
  cardTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: D.radius.pill, borderWidth: 1,
  },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  dateTimeBox: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.bg, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: D.radius.sm, borderWidth: 1, borderColor: D.border,
  },
  dateText: { fontSize: 12, fontWeight: '600', color: D.textSub },
  timeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.bg, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: D.radius.sm, borderWidth: 1, borderColor: D.border,
  },
  timeText: { fontSize: 12, fontWeight: '600', color: D.textSub },

  // People row
  peopleRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.bg, borderRadius: D.radius.md,
    padding: 10, marginBottom: 10, borderWidth: 1, borderColor: D.border,
  },
  personItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  personIconBox: {
    width: 32, height: 32, borderRadius: D.radius.sm,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  personLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3 },
  personName: { fontSize: 13, fontWeight: '700', color: D.text, marginTop: 1 },
  personDivider: { width: 1, height: 32, backgroundColor: D.border, marginHorizontal: 8 },

  // Services
  servicesWrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: D.greenMuted, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.greenBorder,
    marginBottom: 10,
  },
  servicesText: { flex: 1, fontSize: 12, color: D.green, fontWeight: '600', lineHeight: 18 },

  // Notes
  notesWrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: D.bg, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.border, marginBottom: 10,
  },
  notesText: { flex: 1, fontSize: 12, color: D.textSub, fontStyle: 'italic', lineHeight: 18 },

  // Advance amount
  advanceWrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: D.goldMuted, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.goldBorder, marginBottom: 10,
  },
  advanceText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 18 },

  // Actions
  actionsRow: {
    flexDirection: 'row', gap: 8, marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, paddingHorizontal: 14,
    borderRadius: D.radius.md, borderWidth: 1,
  },
  actionBtnGreen: { backgroundColor: D.greenMuted, borderColor: D.greenBorder, flex: 1 },
  actionBtnBlue:  { backgroundColor: D.blueMuted,  borderColor: D.blueBorder,  flex: 1 },
  actionBtnRed:   { backgroundColor: D.redMuted,   borderColor: D.redBorder },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: D.green, alignItems: 'center', justifyContent: 'center',
    shadowColor: D.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
});