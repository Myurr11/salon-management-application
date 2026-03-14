import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { Attendance, Visit } from '../types';
import { colors, theme, shadows } from '../theme';

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

  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

interface Props { navigation: any; }

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel = ({ icon, children }: { icon: string; children: string }) => (
  <View style={sl.row}>
    <View style={sl.iconBox}>
      <MaterialCommunityIcons name={icon as any} size={14} color={D.green} />
    </View>
    <Text style={sl.text}>{children}</Text>
    <View style={sl.line} />
  </View>
);
const sl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  iconBox: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: D.greenMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.greenBorder,
  },
  text: { color: D.green, fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
  line: { flex: 1, height: 1, backgroundColor: D.border },
});

// ─── Avatar helper ────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#1e3a5f', '#0d9488', '#059669', '#2563eb', '#7c3aed'];
const getAvatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

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
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          {/* Staff avatar */}
          <View style={[s.headerAvatar, { backgroundColor: getAvatarColor(user.name) }]}>
            <Text style={s.headerAvatarText}>{initials(user.name)}</Text>
          </View>
          <View>
            <Text style={s.headerDate}>{today}</Text>
            <Text style={s.headerName}>{user.name}</Text>
            <View style={s.staffBadge}>
              <View style={s.staffBadgeDot} />
              <Text style={s.staffBadgeText}>On Duty</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <MaterialCommunityIcons name="logout-variant" size={18} color={D.red} />
        </TouchableOpacity>
      </View>

      {/* ── Today's Progress Card ── */}
      <View style={s.progressCard}>
        <View style={s.progressCardGlow} />
        <View style={s.progressCardTop}>
          <View style={s.progressCardLeft}>
            <Text style={s.progressCardLabel}>TODAY'S PROGRESS</Text>
            <View style={s.progressCountRow}>
              <Text style={s.progressCountBig}>{visits.length}</Text>
              <Text style={s.progressCountOf}> / 12</Text>
              <Text style={s.progressCountLabel}> customers</Text>
            </View>
          </View>
          <View style={s.progressPctBadge}>
            <Text style={s.progressPctText}>{Math.round(progressPct)}%</Text>
          </View>
        </View>
        <View style={s.progressBarBg}>
          <View style={[s.progressBarFill, { width: `${progressPct}%` as any }]} />
        </View>
        {progressPct >= 100 && (
          <View style={s.progressGoalBanner}>
            <MaterialCommunityIcons name="check-decagram" size={14} color={D.gold} />
            <Text style={s.progressGoalBannerText}>Target reached! Great work 🎉</Text>
          </View>
        )}
      </View>

      {/* ── Attendance (shared tablet only) ── */}
      {isSharedTablet && (
        <TouchableOpacity
          style={s.attendanceBtn}
          onPress={() => navigation.navigate('StaffAttendance')}
          activeOpacity={0.8}
        >
          <View style={[s.attendanceBtnIcon, { backgroundColor: D.amberMuted, borderColor: D.amberBorder }]}>
            <MaterialCommunityIcons name="clock-check-outline" size={22} color={D.amber} />
          </View>
          <View style={s.attendanceBtnText}>
            <Text style={s.attendanceBtnTitle}>Staff Attendance</Text>
            <Text style={s.attendanceBtnSub}>Mark check-in / check-out</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={D.textMuted} />
        </TouchableOpacity>
      )}

      {/* ── Stat Cards ── */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { borderColor: D.greenBorder }]}>
          <View style={[s.statIcon, { backgroundColor: D.greenMuted }]}>
            <MaterialCommunityIcons name="currency-inr" size={22} color={D.green} />
          </View>
          <Text style={s.statValue}>₹{totalRevenue.toFixed(0)}</Text>
          <Text style={s.statLabel}>Today's Revenue</Text>
        </View>
        <View style={[s.statCard, { borderColor: D.blueBorder }]}>
          <View style={[s.statIcon, { backgroundColor: D.blueMuted }]}>
            <MaterialCommunityIcons name="account-group-outline" size={22} color={D.blue} />
          </View>
          <Text style={s.statValue}>{customerCount}</Text>
          <Text style={s.statLabel}>Customers Today</Text>
        </View>
      </View>

      {/* ── Primary CTA — New Visit ── */}
      <TouchableOpacity
        style={s.newVisitBtn}
        onPress={() => navigation.navigate('StaffBilling')}
        activeOpacity={0.85}
      >
        <View style={s.newVisitBtnIcon}>
          <MaterialCommunityIcons name="plus" size={26} color={D.green} />
        </View>
        <View style={s.newVisitBtnTextWrap}>
          <Text style={s.newVisitBtnTitle}>New Customer Visit</Text>
          <Text style={s.newVisitBtnSub}>Start a new billing session</Text>
        </View>
        <MaterialCommunityIcons name="arrow-right" size={22} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      {/* ── Quick Actions ── */}
      <SectionLabel icon="lightning-bolt">QUICK ACTIONS</SectionLabel>
      <View style={s.quickGrid}>
        {[
          { icon: 'account-group-outline', label: 'Customers',    accent: D.blue,   bg: D.blueMuted,   border: D.blueBorder,   nav: 'CustomerList'      },
          { icon: 'package-variant',       label: 'Inventory',    accent: D.purple, bg: D.purpleMuted, border: D.purpleBorder, nav: 'InventoryView'     },
          { icon: 'calendar-clock',        label: 'Appointments', accent: D.green,  bg: D.greenMuted,  border: D.greenBorder,  nav: 'AppointmentsList'  },
        ].map(action => (
          <TouchableOpacity
            key={action.nav}
            style={s.quickTile}
            onPress={() => navigation.navigate(action.nav)}
            activeOpacity={0.8}
          >
            <View style={[s.quickTileIcon, { backgroundColor: action.bg, borderColor: action.border }]}>
              <MaterialCommunityIcons name={action.icon as any} size={26} color={action.accent} />
            </View>
            <Text style={s.quickTileLabel}>{action.label}</Text>
            <View style={[s.quickTileArrow, { backgroundColor: action.bg }]}>
              <MaterialCommunityIcons name="chevron-right" size={14} color={action.accent} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Today's Customers ── */}
      <View style={s.sectionHeaderRow}>
        <SectionLabel icon="account-multiple-outline">TODAY'S CUSTOMERS</SectionLabel>
        {visits.length > 0 && (
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{visits.length}</Text>
          </View>
        )}
      </View>

      {visits.length === 0 ? (
        <View style={s.emptyBlock}>
          <View style={s.emptyIconBox}>
            <MaterialCommunityIcons name="account-clock-outline" size={36} color={D.textMuted} />
          </View>
          <Text style={s.emptyTitle}>No customers yet today</Text>
          <Text style={s.emptyHint}>Tap "New Customer Visit" above to get started</Text>
        </View>
      ) : (
        visits.map((item: Visit) => {
          const serviceNames = item.services.map((sv: any) => sv.serviceName || sv.name).filter(Boolean).join(', ');
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
                <View style={s.visitTagsRow}>
                  {serviceNames.split(', ').slice(0, 2).map((sn, i) => (
                    <View key={i} style={s.visitTag}>
                      <Text style={s.visitTagText}>{sn}</Text>
                    </View>
                  ))}
                  {hasProducts && (
                    <View style={[s.visitTag, { backgroundColor: D.amberMuted, borderColor: D.amberBorder }]}>
                      <Text style={[s.visitTagText, { color: D.amber }]}>{item.products.length} product{item.products.length > 1 ? 's' : ''}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={s.visitRight}>
                <Text style={s.visitAmount}>₹{item.total.toFixed(0)}</Text>
                <View style={s.visitViewBtn}>
                  <Text style={s.visitViewBtnText}>Bill</Text>
                  <MaterialCommunityIcons name="chevron-right" size={11} color={D.green} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: D.bg,
    paddingTop: 20, paddingHorizontal: 20,
  },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerAvatar: {
    width: 52, height: 52, borderRadius: D.radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  headerDate: { fontSize: 11, color: D.textMuted, letterSpacing: 0.3, marginBottom: 2 },
  headerName: { fontSize: 20, fontWeight: '800', color: D.text, letterSpacing: -0.5, marginBottom: 4 },
  staffBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: D.greenMuted, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: D.radius.pill, borderWidth: 1, borderColor: D.greenBorder,
  },
  staffBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: D.green },
  staffBadgeText: { fontSize: 11, fontWeight: '700', color: D.green },
  logoutBtn: {
    width: 40, height: 40, borderRadius: D.radius.md,
    backgroundColor: D.redMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.red + '33',
  },

  // Progress card
  progressCard: {
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    padding: 20, marginBottom: 16, borderWidth: 1, borderColor: D.greenBorder,
    overflow: 'hidden',
    shadowColor: D.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  progressCardGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 120, height: 120, borderRadius: 60, backgroundColor: D.greenMuted,
  },
  progressCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  progressCardLeft: {},
  progressCardLabel: { fontSize: 10, fontWeight: '700', color: D.green, letterSpacing: 2, marginBottom: 6 },
  progressCountRow: { flexDirection: 'row', alignItems: 'baseline' },
  progressCountBig: { fontSize: 38, fontWeight: '800', color: D.text, letterSpacing: -2 },
  progressCountOf: { fontSize: 20, fontWeight: '700', color: D.textMuted },
  progressCountLabel: { fontSize: 14, color: D.textMuted, fontWeight: '500' },
  progressPctBadge: {
    backgroundColor: D.greenMuted, borderRadius: D.radius.lg,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: D.greenBorder,
  },
  progressPctText: { fontSize: 20, fontWeight: '800', color: D.green },
  progressBarBg: {
    height: 8, backgroundColor: D.border, borderRadius: 4, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: D.green, borderRadius: 4 },
  progressGoalBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 12, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: D.goldMuted, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.goldBorder,
  },
  progressGoalBannerText: { fontSize: 13, fontWeight: '700', color: D.gold },

  // Stat cards
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: D.surface, borderRadius: D.radius.xl,
    padding: 16, alignItems: 'center', borderWidth: 1,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  statIcon: {
    width: 44, height: 44, borderRadius: D.radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: D.text, letterSpacing: -0.5, marginBottom: 4 },
  statLabel: { fontSize: 11, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },

  // New Visit CTA
  newVisitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: D.green, borderRadius: D.radius.xl,
    paddingVertical: 18, paddingHorizontal: 20, marginBottom: 12,
    shadowColor: D.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  newVisitBtnIcon: {
    width: 46, height: 46, borderRadius: D.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  newVisitBtnTextWrap: { flex: 1 },
  newVisitBtnTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: -0.3 },
  newVisitBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  // Attendance btn
  attendanceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    paddingVertical: 14, paddingHorizontal: 16, marginBottom: 24,
    borderWidth: 1, borderColor: D.amberBorder,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1,
  },
  attendanceBtnIcon: {
    width: 44, height: 44, borderRadius: D.radius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  attendanceBtnText: { flex: 1 },
  attendanceBtnTitle: { fontSize: 15, fontWeight: '700', color: D.text },
  attendanceBtnSub: { fontSize: 12, color: D.textMuted, marginTop: 2 },

  // Quick actions
  quickGrid: {
    flexDirection: 'row', gap: 10, marginBottom: 24,
  },
  quickTile: {
    flex: 1, backgroundColor: D.surface, borderRadius: D.radius.xl,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: D.border,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  quickTileIcon: {
    width: 52, height: 52, borderRadius: D.radius.lg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 10,
  },
  quickTileLabel: { fontSize: 12, fontWeight: '700', color: D.text, textAlign: 'center', marginBottom: 8 },
  quickTileArrow: {
    width: 24, height: 24, borderRadius: D.radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },

  // Section header
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countBadge: {
    backgroundColor: D.greenMuted, borderRadius: D.radius.pill,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: D.greenBorder, marginBottom: 14,
  },
  countBadgeText: { fontSize: 12, fontWeight: '800', color: D.green },

  // Empty
  emptyBlock: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 40,
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border,
  },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: D.radius.xl,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border, marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: D.textMuted, textAlign: 'center', paddingHorizontal: 24 },

  // Visit cards
  visitCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: D.border,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  visitAvatar: {
    width: 46, height: 46, borderRadius: D.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  visitAvatarText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  visitContent: { flex: 1 },
  visitName: { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 6 },
  visitTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  visitTag: {
    backgroundColor: D.purpleMuted, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: D.radius.pill, borderWidth: 1, borderColor: D.purpleBorder,
  },
  visitTagText: { fontSize: 11, fontWeight: '600', color: D.purple },
  visitRight: { alignItems: 'flex-end', gap: 6 },
  visitAmount: { fontSize: 17, fontWeight: '800', color: D.green, letterSpacing: -0.3 },
  visitViewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: D.greenMuted, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: D.radius.pill, borderWidth: 1, borderColor: D.greenBorder,
  },
  visitViewBtnText: { fontSize: 11, fontWeight: '700', color: D.green },
});