import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import DateTimePicker from '@react-native-community/datetimepicker';

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

  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 },
};

// ─── Avatar helpers ───────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#1E3A5F', '#0D9488', '#059669', '#2563EB', '#7C3AED', '#D97706'];
const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

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

// ─── Preset date ranges ───────────────────────────────────────────────────────
const PRESETS = [
  { label: 'Today',   days: 0  },
  { label: '7 Days',  days: 7  },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

interface StaffReport {
  staffId: string; staffName: string;
  totalCustomers: number; totalRevenue: number;
  totalServices: number; totalProducts: number;
  avgBillValue: number; uniqueCustomers: string[];
}
interface Props { navigation: any }

export const StaffReportScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers } = useAuth();
  const { visits } = useData();

  const [startDate, setStartDate]             = useState<Date>(new Date(Date.now() - 30 * 86400000));
  const [endDate, setEndDate]                 = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker]     = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | 'all'>('all');
  const [activePreset, setActivePreset]       = useState<number | null>(30);

  const applyPreset = (days: number) => {
    const end   = new Date();
    const start = days === 0 ? new Date() : new Date(Date.now() - days * 86400000);
    start.setHours(0, 0, 0, 0);
    setStartDate(start);
    setEndDate(end);
    setActivePreset(days);
  };

  const report = useMemo(() => {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);

    const map: Record<string, StaffReport> = {};
    staffMembers.forEach(s => {
      map[s.id] = {
        staffId: s.id, staffName: s.name,
        totalCustomers: 0, totalRevenue: 0,
        totalServices: 0, totalProducts: 0,
        avgBillValue: 0, uniqueCustomers: [],
      };
    });

    visits.forEach((v: any) => {
      const d = new Date(v.date);
      if (d < start || d > end) return;
      if (v.attendingStaff && v.attendingStaff.length > 0) {
        v.attendingStaff.forEach((st: any) => {
          if (!map[st.staffId]) return;
          const r = map[st.staffId];
          r.totalCustomers++;
          r.totalRevenue  += st.revenueShare;
          r.totalServices += v.services.length;
          r.totalProducts += v.products.reduce((s: number, p: any) => s + p.quantity, 0);
          if (!r.uniqueCustomers.includes(v.customerId)) r.uniqueCustomers.push(v.customerId);
        });
      } else if (map[v.staffId]) {
        const r = map[v.staffId];
        r.totalCustomers++;
        r.totalRevenue  += v.total;
        r.totalServices += v.services.length;
        r.totalProducts += v.products.reduce((s: number, p: any) => s + p.quantity, 0);
        if (!r.uniqueCustomers.includes(v.customerId)) r.uniqueCustomers.push(v.customerId);
      }
    });

    return Object.values(map)
      .filter(r => r.totalCustomers > 0)
      .map(r => ({ ...r, avgBillValue: r.totalRevenue / r.totalCustomers }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [visits, staffMembers, startDate, endDate]);

  const filtered = useMemo(() =>
    selectedStaffId === 'all' ? report : report.filter(r => r.staffId === selectedStaffId),
    [report, selectedStaffId],
  );

  const totals = useMemo(() =>
    filtered.reduce(
      (acc, r) => ({
        customers: acc.customers + r.totalCustomers,
        revenue:   acc.revenue   + r.totalRevenue,
        services:  acc.services  + r.totalServices,
        products:  acc.products  + r.totalProducts,
        unique: new Set([...acc.unique, ...r.uniqueCustomers]),
      }),
      { customers: 0, revenue: 0, services: 0, products: 0, unique: new Set<string>() },
    ), [filtered],
  );

  if (!user || user.role !== 'admin') {
    return (
      <View style={s.center}>
        <View style={s.emptyIcon}>
          <MaterialCommunityIcons name="shield-alert-outline" size={28} color={D.textMuted} />
        </View>
        <Text style={s.emptyTitle}>Admin Access Required</Text>
      </View>
    );
  }

  const rankEmoji = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

  return (
    <View style={s.root}>

      {/* ── Top Bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={D.text} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Staff Report</Text>
        {totals.revenue > 0 && (
          <View style={s.revBadge}>
            <Text style={s.revBadgeLabel}>Revenue</Text>
            <Text style={s.revBadgeVal}>
              ₹{totals.revenue >= 1000
                ? `${(totals.revenue / 1000).toFixed(1)}k`
                : totals.revenue.toFixed(0)}
            </Text>
          </View>
        )}
      </View>

      {/* ── Summary strip ── */}
      {totals.customers > 0 && (
        <View style={s.summaryStrip}>
          <View style={s.stripStat}>
            <Text style={s.stripVal}>{totals.customers}</Text>
            <Text style={s.stripLabel}>Customers</Text>
          </View>
          <View style={s.stripDivider} />
          <View style={s.stripStat}>
            <Text style={s.stripVal}>{totals.services}</Text>
            <Text style={s.stripLabel}>Services</Text>
          </View>
          <View style={s.stripDivider} />
          <View style={s.stripStat}>
            <Text style={s.stripVal}>{totals.products}</Text>
            <Text style={s.stripLabel}>Products</Text>
          </View>
          <View style={s.stripDivider} />
          <View style={s.stripStat}>
            <Text style={s.stripVal}>
              {totals.customers > 0 ? `₹${(totals.revenue / totals.customers).toFixed(0)}` : '—'}
            </Text>
            <Text style={s.stripLabel}>Avg Bill</Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Date range ── */}
        <SectionLabel>DATE RANGE</SectionLabel>

        {/* Preset chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.presetsRow}>
          {PRESETS.map(p => (
            <TouchableOpacity
              key={p.days}
              style={[s.presetChip, activePreset === p.days && s.presetChipActive]}
              onPress={() => applyPreset(p.days)}
              activeOpacity={0.8}
            >
              <Text style={[s.presetChipText, activePreset === p.days && s.presetChipTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Custom date row */}
        <View style={s.dateRow}>
          <TouchableOpacity
            style={s.datePicker}
            onPress={() => { setShowStartPicker(true); setActivePreset(null); }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="calendar-start" size={15} color={D.green} />
            <View>
              <Text style={s.datePickerLabel}>FROM</Text>
              <Text style={s.datePickerValue}>{fmtDate(startDate)}</Text>
            </View>
          </TouchableOpacity>

          <MaterialCommunityIcons name="arrow-right" size={16} color={D.textMuted} />

          <TouchableOpacity
            style={s.datePicker}
            onPress={() => { setShowEndPicker(true); setActivePreset(null); }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="calendar-end" size={15} color={D.green} />
            <View>
              <Text style={s.datePickerLabel}>TO</Text>
              <Text style={s.datePickerValue}>{fmtDate(endDate)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={startDate} mode="date" display="default"
            onChange={(_, d) => { setShowStartPicker(Platform.OS === 'ios'); if (d) setStartDate(d); }}
            maximumDate={endDate}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate} mode="date" display="default"
            onChange={(_, d) => { setShowEndPicker(Platform.OS === 'ios'); if (d) setEndDate(d); }}
            minimumDate={startDate} maximumDate={new Date()}
          />
        )}

        {/* ── Staff filter ── */}
        <SectionLabel>FILTER BY STAFF</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.staffRow}>
          {[{ id: 'all', name: 'All Staff' }, ...staffMembers].map((st: any) => {
            const active = selectedStaffId === st.id;
            return (
              <TouchableOpacity
                key={st.id}
                style={[s.staffChip, active && s.staffChipActive]}
                onPress={() => setSelectedStaffId(st.id)}
                activeOpacity={0.8}
              >
                {st.id === 'all' ? (
                  <View style={s.staffChipAllIcon}>
                    <MaterialCommunityIcons
                      name="account-group-outline" size={13}
                      color={active ? D.green : D.textMuted}
                    />
                  </View>
                ) : (
                  <View style={[s.staffAvatar, active && s.staffAvatarActive, { backgroundColor: active ? D.green : avatarColor(st.name) }]}>
                    <Text style={s.staffAvatarText}>{initials(st.name)}</Text>
                  </View>
                )}
                <Text style={[s.staffChipText, active && s.staffChipTextActive]}>
                  {st.id === 'all' ? 'All Staff' : st.name.split(' ')[0]}
                </Text>
                {active && <MaterialCommunityIcons name="check" size={11} color={D.green} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Leaderboard ── */}
        <SectionLabel>LEADERBOARD</SectionLabel>

        {filtered.length === 0 ? (
          <View style={s.emptyBlock}>
            <View style={s.emptyIcon}>
              <MaterialCommunityIcons name="chart-line" size={28} color={D.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No data for this period</Text>
            <Text style={s.emptyHint}>Try adjusting the date range or staff filter</Text>
          </View>
        ) : (
          <View style={s.listCard}>
            {filtered.map((r, i) => {
              const color  = avatarColor(r.staffName);
              const maxRev = filtered[0].totalRevenue;
              const pct    = maxRev > 0 ? (r.totalRevenue / maxRev) * 100 : 0;
              const emoji  = rankEmoji(i);
              const isLast = i === filtered.length - 1;

              return (
                <View key={r.staffId} style={[s.reportRow, isLast && s.reportRowLast]}>

                  {/* Avatar + name */}
                  <View style={s.reportTop}>
                    <View style={[s.reportAvatar, { backgroundColor: color }]}>
                      <Text style={s.reportAvatarText}>{initials(r.staffName)}</Text>
                    </View>
                    <View style={s.reportNameBlock}>
                      <View style={s.reportNameRow}>
                        <Text style={s.reportName}>{r.staffName}</Text>
                        {emoji && <Text style={s.rankEmoji}>{emoji}</Text>}
                      </View>
                      <Text style={s.reportMeta}>
                        {r.totalCustomers} customers · {r.uniqueCustomers.length} unique
                      </Text>
                    </View>
                    <View style={s.reportRevCol}>
                      <Text style={s.reportRevVal}>₹{r.totalRevenue.toFixed(0)}</Text>
                      <Text style={s.reportRevLabel}>revenue</Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={s.barRow}>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${pct}%` as any }]} />
                    </View>
                    <Text style={s.barPct}>{Math.round(pct)}%</Text>
                  </View>

                  {/* Mini stats */}
                  <View style={s.miniStats}>
                    <View style={s.miniStat}>
                      <Text style={s.miniStatVal}>{r.totalServices}</Text>
                      <Text style={s.miniStatLabel}>Services</Text>
                    </View>
                    <View style={s.miniStatDivider} />
                    <View style={s.miniStat}>
                      <Text style={s.miniStatVal}>{r.totalProducts}</Text>
                      <Text style={s.miniStatLabel}>Products</Text>
                    </View>
                    <View style={s.miniStatDivider} />
                    <View style={s.miniStat}>
                      <Text style={s.miniStatVal}>₹{r.avgBillValue.toFixed(0)}</Text>
                      <Text style={s.miniStatLabel}>Avg Bill</Text>
                    </View>
                    <View style={s.miniStatDivider} />
                    <View style={s.miniStat}>
                      <Text style={s.miniStatVal}>{r.uniqueCustomers.length}</Text>
                      <Text style={s.miniStatLabel}>Unique</Text>
                    </View>
                  </View>
                </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },

  // Top bar
  topBar: {
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...Platform.select({ ios: { paddingTop: 56 }, android: { paddingTop: 14 } }),
  },
  backBtn: {
    width: 36, height: 36, borderRadius: D.radius.md,
    backgroundColor: D.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: D.text, letterSpacing: -0.3 },
  revBadge: {
    backgroundColor: D.greenMuted, borderRadius: D.radius.pill,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: D.greenBorder, alignItems: 'center',
  },
  revBadgeLabel: { fontSize: 9, fontWeight: '700', color: D.green, textTransform: 'uppercase', letterSpacing: 1 },
  revBadgeVal:   { fontSize: 13, fontWeight: '800', color: D.green },

  // Summary strip
  summaryStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  stripStat:    { flex: 1, alignItems: 'center', gap: 2 },
  stripDivider: { width: 1, height: 28, backgroundColor: D.border },
  stripVal:     { fontSize: 16, fontWeight: '800', color: D.text, letterSpacing: -0.5 },
  stripLabel:   { fontSize: 10, color: D.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Scroll
  scrollContent: { padding: 16, paddingBottom: 52, gap: 12 },

  // Preset chips
  presetsRow: { gap: 8 },
  presetChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: D.surfaceAlt, borderRadius: D.radius.pill,
    borderWidth: 1, borderColor: D.border,
  },
  presetChipActive:     { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  presetChipText:       { fontSize: 12, fontWeight: '600', color: D.textSub },
  presetChipTextActive: { color: D.green, fontWeight: '700' },

  // Date row
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  datePicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: D.surface, borderRadius: D.radius.lg,
    borderWidth: 1, borderColor: D.border, padding: 12,
  },
  datePickerLabel: { fontSize: 9, fontWeight: '700', color: D.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  datePickerValue: { fontSize: 13, fontWeight: '700', color: D.text },

  // Staff chips — same as AppointmentsListScreen
  staffRow: { gap: 8 },
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
    alignItems: 'center', justifyContent: 'center',
  },
  staffAvatarActive:  { backgroundColor: D.green },
  staffAvatarText:    { color: '#fff', fontSize: 8, fontWeight: '700' },
  staffChipText:      { fontSize: 12, fontWeight: '600', color: D.textSub },
  staffChipTextActive:{ color: D.green, fontWeight: '700' },

  // Single white listCard — same pattern throughout
  listCard: {
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border,
  },

  // Report rows inside the card
  reportRow: {
    paddingVertical: 14, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F2F4',
    gap: 10,
  },
  reportRowLast: { borderBottomWidth: 0 },

  reportTop:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportAvatar:    { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  reportAvatarText:{ color: '#fff', fontSize: 13, fontWeight: '700' },
  reportNameBlock: { flex: 1, minWidth: 0 },
  reportNameRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reportName:      { fontSize: 14, fontWeight: '700', color: D.text },
  rankEmoji:       { fontSize: 14 },
  reportMeta:      { fontSize: 11, color: D.textMuted, fontWeight: '500', marginTop: 1 },
  reportRevCol:    { alignItems: 'flex-end', flexShrink: 0 },
  reportRevVal:    { fontSize: 14, fontWeight: '800', color: D.green, letterSpacing: -0.3 },
  reportRevLabel:  { fontSize: 10, color: D.textMuted, fontWeight: '600', marginTop: 1 },

  // Progress bar
  barRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barBg:   { flex: 1, height: 5, backgroundColor: D.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: D.green },
  barPct:  { fontSize: 11, fontWeight: '700', color: D.textMuted, width: 32, textAlign: 'right' },

  // Mini stats — same surfaceAlt bar as staff performance
  miniStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surfaceAlt, borderRadius: D.radius.md, paddingVertical: 9,
  },
  miniStat:        { flex: 1, alignItems: 'center', gap: 2 },
  miniStatDivider: { width: 1, height: 24, backgroundColor: D.border },
  miniStatVal:     { fontSize: 13, fontWeight: '800', color: D.text },
  miniStatLabel:   { fontSize: 9, color: D.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Empty
  emptyBlock: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: {
    width: 68, height: 68, borderRadius: D.radius.xl,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 6 },
  emptyHint:  { fontSize: 13, color: D.textMuted, textAlign: 'center' },
});