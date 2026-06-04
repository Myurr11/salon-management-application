import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { Visit } from '../types';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  // Backgrounds
  bg:           '#F7F9FB',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F2F4F6',

  // Brand green (primary)
  green:        '#166534',
  greenMuted:   'rgba(22,101,52,0.10)',
  greenBorder:  'rgba(22,101,52,0.25)',

  // Neutrals
  border:       '#E8EAEC',
  borderDash:   '#D4D9D3',

  // Text
  text:         '#191C1E',
  textSub:      '#707A6F',
  textMuted:    '#9AA09E',

  // Semantic
  red:          '#BA1A1A',
  redMuted:     'rgba(186,26,26,0.08)',
  redBorder:    'rgba(186,26,26,0.20)',

  purple:       '#7C5CBF',
  purpleMuted:  'rgba(124,92,191,0.10)',
  purpleBorder: 'rgba(124,92,191,0.20)',

  amber:        '#B8742A',
  amberMuted:   'rgba(212,135,42,0.10)',
  amberBorder:  'rgba(212,135,42,0.20)',

  greenOnWhite: '#15803D',

  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 },
};

// Avatar colour pool — deterministic from name
const AVATAR_COLORS = ['#1E3A5F', '#0D9488', '#059669', '#2563EB', '#7C3AED'];
const getAvatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

// ─── Section divider label ────────────────────────────────────────────────────
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

// ─── SVG-less progress ring (pure RN View trick) ──────────────────────────────
// We approximate the ring using a border-based approach.
// On RN without SVG installed, this is the cleanest option.
const ProgressRing = ({ pct }: { pct: number }) => {
  // Use a simple bordered circle with clipping to show progress
  // We overlay two arcs: bg arc (full) and fill arc (partial)
  const SIZE = 64;
  const STROKE = 5;
  const R = (SIZE - STROKE) / 2;
  const CIRCUM = 2 * Math.PI * R;
  const filled = CIRCUM * (pct / 100);

  // RN doesn't have SVG natively — use react-native-svg if available;
  // fall back to a simple bordered indicator.
  return (
    <View style={pr.wrap}>
      {/* Background ring */}
      <View style={pr.bgRing} />
      {/* Percentage text */}
      <Text style={pr.label}>{Math.round(pct)}%</Text>
      {/* Progress indicator dots arranged in a circle (RN-safe approximation) */}
      <View style={[pr.fillArc, { borderColor: pct > 0 ? '#fff' : 'transparent' }]} />
    </View>
  );
};
const pr = StyleSheet.create({
  wrap:    { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bgRing:  {
    position: 'absolute', width: 64, height: 64, borderRadius: 32,
    borderWidth: 5, borderColor: 'rgba(255,255,255,0.20)',
  },
  fillArc: {
    position: 'absolute', width: 64, height: 64, borderRadius: 32,
    borderWidth: 5, borderColor: '#fff',
    // Clip all but top-right quadrant; rotate to track progress
    // For a full animated ring, use react-native-svg <Circle> with strokeDashoffset
  },
  label:   { fontSize: 11, fontWeight: '800', color: '#fff' },
});

interface Props { navigation: any; }

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const StaffDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { getStaffTodayStats } = useData();
  const isSharedTablet = user?.id === 'shared-tablet';

  if (!user || user.role !== 'staff') {
    return (
      <View style={[s.center, { flex: 1, backgroundColor: D.bg }]}>
        <Text style={{ color: D.red }}>No staff user selected.</Text>
      </View>
    );
  }

  const { totalRevenue, customerCount, visits } = useMemo(
    () => getStaffTodayStats('all'),
    [getStaffTodayStats],
  );

  const progressPct = Math.min(100, (visits.length / 12) * 100);
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Profile Row ── */}
        <View style={s.profile}>
          <View style={s.profileLeft}>
            <View style={[s.avatar, { backgroundColor: getAvatarColor(user.name) }]}>
              <Text style={s.avatarText}>{initials(user.name)}</Text>
              <View style={s.avatarDot} />
            </View>
            <View>
              <Text style={s.profileDate}>{today}</Text>
              <Text style={s.profileName}>{user.name}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <MaterialCommunityIcons name="logout-variant" size={18} color={D.red} />
          </TouchableOpacity>
        </View>

        {/* ── Progress Card ── */}
        <View style={s.progressCard}>
          {/* Top row */}
          <View style={s.progressTop}>
            <View style={s.progressTopLeft}>
              {/* Ring */}
              <View style={s.ringWrap}>
                <View style={s.ringBg} />
                {/* Simple filled-border hack for progress indication */}
                <View style={[
                  s.ringFill,
                  { borderColor: progressPct > 0 ? '#fff' : 'transparent' },
                ]} />
                <Text style={s.ringLabel}>{Math.round(progressPct)}%</Text>
              </View>
              {/* Count */}
              <View>
                <Text style={s.progressSectionLabel}>TODAY'S PROGRESS</Text>
                <Text style={s.progressCount}>
                  {visits.length}{' '}
                  <Text style={s.progressCountMuted}>/ 12 Customers</Text>
                </Text>
              </View>
            </View>
            <View style={s.trendBox}>
              <MaterialCommunityIcons name="trending-up" size={20} color="#fff" />
            </View>
          </View>

          {/* Divider */}
          <View style={s.progressDivider} />

          {/* Stats grid */}
          <View style={s.progressStatsRow}>
            <View style={s.progressStat}>
              <Text style={s.progressStatLabel}>TODAY'S REVENUE</Text>
              <Text style={s.progressStatValue}>₹{totalRevenue.toFixed(0)}</Text>
            </View>
            <View style={[s.progressStat, s.progressStatBorderLeft]}>
              <Text style={s.progressStatLabel}>CUSTOMERS TODAY</Text>
              <Text style={s.progressStatValue}>{customerCount}</Text>
            </View>
          </View>
        </View>

        {/* ── Attendance (shared tablet) ── */}
        {isSharedTablet && (
          <TouchableOpacity
            style={s.attendanceCard}
            onPress={() => navigation.navigate('StaffAttendance')}
            activeOpacity={0.8}
          >
            <View style={s.attIcon}>
              <MaterialCommunityIcons name="clock-outline" size={22} color={D.textSub} />
            </View>
            <View style={s.attText}>
              <Text style={s.attTitle}>Staff Attendance</Text>
              <Text style={s.attSub}>Mark your check-in / check-out</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={D.textMuted} />
          </TouchableOpacity>
        )}

        {/* ── New Visit CTA ── */}
        <TouchableOpacity
          style={s.newVisitBtn}
          onPress={() => navigation.navigate('StaffBilling')}
          activeOpacity={0.85}
        >
          <View style={s.nvIcon}>
            <MaterialCommunityIcons name="plus" size={26} color="#fff" />
          </View>
          <View style={s.nvText}>
            <Text style={s.nvTitle}>New Customer Visit</Text>
            <Text style={s.nvSub}>Start a new billing session</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* ── Quick Actions ── */}
        <SectionLabel>QUICK ACTIONS</SectionLabel>
        <View style={s.quickGrid}>
          {([
            { icon: 'account-group-outline', label: 'Customers',    nav: 'CustomerList'     },
            { icon: 'package-variant',       label: 'Inventory',    nav: 'InventoryView'    },
            { icon: 'calendar-clock',        label: 'Booking',      nav: 'AppointmentsList' },
          ] as const).map(action => (
            <TouchableOpacity
              key={action.nav}
              style={s.quickTile}
              onPress={() => navigation.navigate(action.nav)}
              activeOpacity={0.8}
            >
              <View style={s.qtIcon}>
                <MaterialCommunityIcons name={action.icon} size={22} color={D.textSub} />
              </View>
              <Text style={s.qtLabel}>{action.label}</Text>
              <View style={s.qtArrow}>
                <MaterialCommunityIcons name="chevron-right" size={12} color={D.textSub} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Today's Customers ── */}
        <SectionLabel>TODAY'S CUSTOMERS</SectionLabel>

        {visits.length === 0 ? (
          <View style={s.emptyBlock}>
            <View style={s.emptyIcon}>
              <MaterialCommunityIcons name="account-plus-outline" size={32} color={D.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No customers yet today</Text>
            <Text style={s.emptyHint}>
              Tap "New Customer Visit" above to get started with your first client.
            </Text>
          </View>
        ) : (
          <View style={s.visitList}>
            {visits.map((item: Visit) => {
              const serviceNames = item.services
                .map((sv: any) => sv.serviceName || sv.name)
                .filter(Boolean);
              const hasProducts = item.products && item.products.length > 0;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={s.visitCard}
                  onPress={() => navigation.navigate('BillView', { visitId: item.id })}
                  activeOpacity={0.8}
                >
                  <View style={[s.visitAvatar, { backgroundColor: getAvatarColor(item.customerName) }]}>
                    <Text style={s.visitAvatarText}>{initials(item.customerName)}</Text>
                  </View>

                  <View style={s.visitContent}>
                    <Text style={s.visitName} numberOfLines={1}>{item.customerName}</Text>
                    <View style={s.visitTags}>
                      {serviceNames.slice(0, 2).map((sn, i) => (
                        <View key={i} style={s.visitTag}>
                          <Text style={s.visitTagText}>{sn}</Text>
                        </View>
                      ))}
                      {hasProducts && (
                        <View style={[s.visitTag, s.visitTagAmber]}>
                          <Text style={[s.visitTagText, s.visitTagTextAmber]}>
                            {item.products.length} product{item.products.length > 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={s.visitRight}>
                    <Text style={s.visitAmount}>₹{item.total.toFixed(0)}</Text>
                    <View style={s.billBtn}>
                      <Text style={s.billBtnText}>Bill</Text>
                      <MaterialCommunityIcons name="chevron-right" size={11} color={D.green} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: D.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Top bar
  topBar: {
    backgroundColor: D.surface,
    borderBottomWidth: 1, borderBottomColor: D.border,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...Platform.select({ ios: { paddingTop: 56 }, android: { paddingTop: 14 } }),
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: D.text, letterSpacing: -0.3 },
  topBarBtn: {
    width: 36, height: 36, borderRadius: D.radius.md,
    backgroundColor: D.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48, gap: 16 },

  // Profile
  profile:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56, height: 56, borderRadius: D.radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  avatarDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: D.bg,
  },
  profileDate: { fontSize: 10, fontWeight: '700', color: D.textSub, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  profileName: { fontSize: 20, fontWeight: '800', color: D.text, letterSpacing: -0.5, marginBottom: 4 },
  onDuty:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onDutyDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  onDutyText:  { fontSize: 11, fontWeight: '700', color: D.greenOnWhite },
  logoutBtn: {
    width: 40, height: 40, borderRadius: D.radius.md,
    backgroundColor: D.redMuted, borderWidth: 1, borderColor: D.redBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  // Progress card
  progressCard: {
    backgroundColor: D.green, borderRadius: D.radius.xxl, padding: 20,
  },
  progressTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  progressTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  // Ring (pure RN — swap for react-native-svg <Circle> for animated version)
  ringWrap: {
    width: 64, height: 64, alignItems: 'center',
    justifyContent: 'center', position: 'relative',
  },
  ringBg: {
    position: 'absolute', width: 64, height: 64, borderRadius: 32,
    borderWidth: 5, borderColor: 'rgba(255,255,255,0.20)',
  },
  ringFill: {
    position: 'absolute', width: 64, height: 64, borderRadius: 32,
    borderWidth: 5,
    // For a real progress arc, use react-native-svg with stroke-dashoffset
  },
  ringLabel: { fontSize: 11, fontWeight: '800', color: '#fff' },

  progressSectionLabel: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 4,
  },
  progressCount: { fontSize: 20, fontWeight: '800', color: '#fff' },
  progressCountMuted: { fontSize: 14, fontWeight: '400', color: 'rgba(255,255,255,0.65)' },

  trendBox: {
    width: 40, height: 40, borderRadius: D.radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },

  progressDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 18 },

  progressStatsRow: { flexDirection: 'row' },
  progressStat:    { flex: 1 },
  progressStatBorderLeft: {
    borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)', paddingLeft: 16,
  },
  progressStatLabel: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
  },
  progressStatValue: { fontSize: 24, fontWeight: '800', color: '#fff' },

  // Attendance
  attendanceCard: {
    backgroundColor: D.surface, borderRadius: D.radius.lg,
    borderWidth: 1, borderColor: D.border,
    paddingVertical: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  attIcon: {
    width: 48, height: 48, borderRadius: D.radius.md,
    backgroundColor: D.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  attText:  { flex: 1 },
  attTitle: { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 2 },
  attSub:   { fontSize: 12, color: D.textSub },

  // New Visit
  newVisitBtn: {
    backgroundColor: D.green, borderRadius: D.radius.lg,
    paddingVertical: 18, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  nvIcon: {
    width: 48, height: 48, borderRadius: D.radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  nvText:  { flex: 1 },
  nvTitle: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginBottom: 2 },
  nvSub:   { fontSize: 12, color: 'rgba(255,255,255,0.65)' },

  // Quick Actions
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickTile: {
    flex: 1, backgroundColor: D.surface, borderRadius: D.radius.lg,
    borderWidth: 1, borderColor: D.border,
    paddingVertical: 14, paddingHorizontal: 10,
    alignItems: 'center', gap: 8,
  },
  qtIcon: {
    width: 44, height: 44, borderRadius: D.radius.md,
    backgroundColor: D.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  qtLabel: { fontSize: 11, fontWeight: '700', color: D.text, textAlign: 'center' },
  qtArrow: {
    width: 24, height: 24, borderRadius: D.radius.pill,
    backgroundColor: D.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },

  // Empty state
  emptyBlock: {
    backgroundColor: D.surface, borderRadius: D.radius.xxl,
    borderWidth: 2, borderStyle: 'dashed', borderColor: D.borderDash,
    paddingVertical: 40, paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: D.radius.xl,
    backgroundColor: D.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 6 },
  emptyHint:  { fontSize: 13, color: D.textSub, textAlign: 'center', lineHeight: 20 },

  // Visit list + cards
  visitList: { gap: 10 },
  visitCard: {
    backgroundColor: D.surface, borderRadius: D.radius.lg,
    borderWidth: 1, borderColor: D.border,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  visitAvatar: {
    width: 46, height: 46, borderRadius: D.radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  visitAvatarText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  visitContent:    { flex: 1, minWidth: 0 },
  visitName:       { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 6 },
  visitTags:       { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  visitTag: {
    backgroundColor: D.purpleMuted, borderWidth: 1, borderColor: D.purpleBorder,
    borderRadius: D.radius.pill, paddingHorizontal: 8, paddingVertical: 3,
  },
  visitTagText:      { fontSize: 11, fontWeight: '600', color: D.purple },
  visitTagAmber:     { backgroundColor: D.amberMuted, borderColor: D.amberBorder },
  visitTagTextAmber: { color: D.amber },
  visitRight:        { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  visitAmount:       { fontSize: 17, fontWeight: '800', color: D.green, letterSpacing: -0.3 },
  billBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: D.greenMuted, borderWidth: 1, borderColor: D.greenBorder,
    borderRadius: D.radius.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  billBtnText: { fontSize: 11, fontWeight: '700', color: D.green },
});