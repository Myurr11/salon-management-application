import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, theme } from '../theme';
import DateTimePicker from '@react-native-community/datetimepicker';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  border: '#E8E3DB',

  green: '#2D9A5F',
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

// ─── Avatar helpers ───────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#1e3a5f', '#0d9488', '#059669', '#2563eb', '#7c3aed', '#d97706'];
const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Rank config ──────────────────────────────────────────────────────────────
const rankCfg = (rank: number) => {
  if (rank === 1) return { icon: 'trophy',       color: D.gold,   bg: D.goldMuted,   border: D.goldBorder,   label: '#1'  };
  if (rank === 2) return { icon: 'medal',         color: D.textSub,bg: D.bg,          border: D.border,       label: '#2'  };
  if (rank === 3) return { icon: 'medal-outline', color: D.amber,  bg: D.amberMuted,  border: D.amberBorder,  label: '#3'  };
  return               { icon: 'chevron-right',  color: D.textMuted, bg: D.bg,        border: D.border,       label: `#${rank}` };
};

// ─── Preset ranges ────────────────────────────────────────────────────────────
const PRESETS = [
  { label: 'Today',    days: 0  },
  { label: '7 Days',   days: 7  },
  { label: '30 Days',  days: 30 },
  { label: '90 Days',  days: 90 },
];

interface StaffReport {
  staffId: string; staffName: string;
  totalCustomers: number; totalRevenue: number;
  totalServices: number; totalProducts: number;
  avgBillValue: number; uniqueCustomers: string[];
}

interface Props { navigation: any; }

export const StaffReportScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers } = useAuth();
  const { visits } = useData();

  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 86400000));
  const [endDate, setEndDate]     = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker]     = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | 'all'>('all');
  const [activePreset, setActivePreset] = useState<number | null>(30);

  const applyPreset = (days: number) => {
    const end = new Date();
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

    visits.forEach(v => {
      const d = new Date(v.date);
      if (d < start || d > end) return;
      if (v.attendingStaff && v.attendingStaff.length > 0) {
        v.attendingStaff.forEach((st: any) => {
          if (!map[st.staffId]) return;
          const r = map[st.staffId];
          r.totalCustomers++;
          r.totalRevenue += st.revenueShare;
          r.totalServices += v.services.length;
          r.totalProducts += v.products.reduce((s: number, p: any) => s + p.quantity, 0);
          if (!r.uniqueCustomers.includes(v.customerId)) r.uniqueCustomers.push(v.customerId);
        });
      } else if (map[v.staffId]) {
        const r = map[v.staffId];
        r.totalCustomers++;
        r.totalRevenue += v.total;
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
      <View style={[s.center, { flex: 1, backgroundColor: D.bg }]}>
        <View style={s.restrictedBox}>
          <MaterialCommunityIcons name="shield-alert-outline" size={32} color={D.textMuted} />
        </View>
        <Text style={s.restrictedTitle}>Admin Access Required</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerGlow} />
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={D.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerIconBox}>
            <MaterialCommunityIcons name="chart-bar" size={22} color={D.green} />
          </View>
          <View>
            <Text style={s.headerTitle}>Staff Report</Text>
            <Text style={s.headerSub}>{fmtDate(startDate)} – {fmtDate(endDate)}</Text>
          </View>
        </View>
        <View style={s.headerRevBadge}>
          <Text style={s.headerRevLabel}>REVENUE</Text>
          <Text style={s.headerRevValue}>
            ₹{totals.revenue >= 1000 ? `${(totals.revenue / 1000).toFixed(1)}k` : totals.revenue.toFixed(0)}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Date range section ── */}
        <View style={s.sectionHeader}>
          <View style={s.sectionIconBox}><MaterialCommunityIcons name="calendar-range" size={14} color={D.green} /></View>
          <Text style={s.sectionLabel}>DATE RANGE</Text>
          <View style={s.sectionLine} />
        </View>

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

        {/* Custom date pickers */}
        <View style={s.dateRow}>
          <TouchableOpacity
            style={s.datePicker}
            onPress={() => { setShowStartPicker(true); setActivePreset(null); }}
            activeOpacity={0.8}
          >
            <View style={[s.datePickerIcon, { backgroundColor: D.greenMuted, borderColor: D.greenBorder }]}>
              <MaterialCommunityIcons name="calendar-start" size={16} color={D.green} />
            </View>
            <View>
              <Text style={s.datePickerLabel}>FROM</Text>
              <Text style={s.datePickerValue}>{fmtDate(startDate)}</Text>
            </View>
          </TouchableOpacity>

          <MaterialCommunityIcons name="arrow-right" size={16} color={D.border} />

          <TouchableOpacity
            style={s.datePicker}
            onPress={() => { setShowEndPicker(true); setActivePreset(null); }}
            activeOpacity={0.8}
          >
            <View style={[s.datePickerIcon, { backgroundColor: D.blueMuted, borderColor: D.blueBorder }]}>
              <MaterialCommunityIcons name="calendar-end" size={16} color={D.blue} />
            </View>
            <View>
              <Text style={s.datePickerLabel}>TO</Text>
              <Text style={s.datePickerValue}>{fmtDate(endDate)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {showStartPicker && (
          <DateTimePicker value={startDate} mode="date" display="default"
            onChange={(_, d) => { setShowStartPicker(Platform.OS === 'ios'); if (d) setStartDate(d); }}
            maximumDate={endDate}
          />
        )}
        {showEndPicker && (
          <DateTimePicker value={endDate} mode="date" display="default"
            onChange={(_, d) => { setShowEndPicker(Platform.OS === 'ios'); if (d) setEndDate(d); }}
            minimumDate={startDate} maximumDate={new Date()}
          />
        )}

        {/* ── Staff filter ── */}
        <View style={[s.sectionHeader, { marginTop: 20 }]}>
          <View style={s.sectionIconBox}><MaterialCommunityIcons name="account-filter-outline" size={14} color={D.green} /></View>
          <Text style={s.sectionLabel}>FILTER BY STAFF</Text>
          <View style={s.sectionLine} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.staffChips}>
          {[{ id: 'all', name: 'All Staff' }, ...staffMembers].map((st: any) => {
            const active = selectedStaffId === st.id;
            return (
              <TouchableOpacity
                key={st.id}
                style={[s.staffChip, active && s.staffChipActive]}
                onPress={() => setSelectedStaffId(st.id)}
                activeOpacity={0.8}
              >
                {st.id !== 'all' && (
                  <View style={[s.staffChipAvatar, { backgroundColor: active ? D.green : avatarColor(st.name) }]}>
                    <Text style={s.staffChipAvatarText}>{initials(st.name)}</Text>
                  </View>
                )}
                {st.id === 'all' && (
                  <MaterialCommunityIcons name="account-group-outline" size={14} color={active ? D.green : D.textMuted} />
                )}
                <Text style={[s.staffChipText, active && s.staffChipTextActive]}>
                  {st.id === 'all' ? 'All Staff' : st.name.split(' ')[0]}
                </Text>
                {active && <MaterialCommunityIcons name="check" size={12} color={D.green} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Summary cards ── */}
        <View style={[s.sectionHeader, { marginTop: 20 }]}>
          <View style={s.sectionIconBox}><MaterialCommunityIcons name="chart-box-outline" size={14} color={D.green} /></View>
          <Text style={s.sectionLabel}>SUMMARY</Text>
          <View style={s.sectionLine} />
        </View>

        <View style={s.summaryGrid}>
          {[
            { icon: 'account-group-outline',   label: 'Customers',       value: totals.customers,              color: D.blue,   bg: D.blueMuted,   border: D.blueBorder   },
            { icon: 'currency-inr',            label: 'Revenue',         value: `₹${totals.revenue.toFixed(0)}`, color: D.green,  bg: D.greenMuted,  border: D.greenBorder  },
            { icon: 'spa',                     label: 'Services',        value: totals.services,               color: D.purple, bg: D.purpleMuted, border: D.purpleBorder },
            { icon: 'package-variant',         label: 'Products Sold',   value: totals.products,               color: D.amber,  bg: D.amberMuted,  border: D.amberBorder  },
            { icon: 'account-check-outline',   label: 'Unique Clients',  value: totals.unique.size,            color: D.gold,   bg: D.goldMuted,   border: D.goldBorder   },
            { icon: 'cash-multiple',           label: 'Avg Bill',
              value: totals.customers > 0 ? `₹${(totals.revenue / totals.customers).toFixed(0)}` : '—',
              color: D.green, bg: D.greenMuted, border: D.greenBorder },
          ].map(stat => (
            <View key={stat.label} style={[s.summaryCard, { borderColor: stat.border }]}>
              <View style={[s.summaryCardIcon, { backgroundColor: stat.bg }]}>
                <MaterialCommunityIcons name={stat.icon as any} size={18} color={stat.color} />
              </View>
              <Text style={[s.summaryCardValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.summaryCardLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Detailed leaderboard ── */}
        <View style={[s.sectionHeader, { marginTop: 20 }]}>
          <View style={s.sectionIconBox}><MaterialCommunityIcons name="podium" size={14} color={D.green} /></View>
          <Text style={s.sectionLabel}>LEADERBOARD</Text>
          <View style={s.sectionLine} />
        </View>

        {filtered.length === 0 ? (
          <View style={s.emptyBlock}>
            <View style={s.emptyIconBox}>
              <MaterialCommunityIcons name="chart-line" size={36} color={D.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No data for this period</Text>
            <Text style={s.emptyHint}>Try adjusting the date range or staff filter</Text>
          </View>
        ) : (
          filtered.map((r, i) => {
            const rank = rankCfg(i + 1);
            const color = avatarColor(r.staffName);
            const maxRev = filtered[0].totalRevenue;
            const pct = maxRev > 0 ? (r.totalRevenue / maxRev) * 100 : 0;

            return (
              <View key={r.staffId} style={s.reportCard}>
                {/* Left stripe */}
                <View style={[s.reportStripe, { backgroundColor: color }]} />

                <View style={s.reportInner}>
                  {/* Header row */}
                  <View style={s.reportCardHeader}>
                    <View style={[s.reportAvatar, { backgroundColor: color }]}>
                      <Text style={s.reportAvatarText}>{initials(r.staffName)}</Text>
                    </View>
                    <View style={s.reportNameBlock}>
                      <Text style={s.reportName}>{r.staffName}</Text>
                      <Text style={s.reportCustomerCount}>{r.totalCustomers} customers · {r.uniqueCustomers.length} unique</Text>
                    </View>
                    {/* Rank badge */}
                    <View style={[s.rankBadge, { backgroundColor: rank.bg, borderColor: rank.border }]}>
                      <MaterialCommunityIcons name={rank.icon as any} size={13} color={rank.color} />
                      <Text style={[s.rankBadgeText, { color: rank.color }]}>{rank.label}</Text>
                    </View>
                  </View>

                  {/* Revenue progress bar */}
                  <View style={s.revenueBarRow}>
                    <Text style={s.revenueBarLabel}>₹{r.totalRevenue.toFixed(0)}</Text>
                    <Text style={s.revenueBarPct}>{Math.round(pct)}%</Text>
                  </View>
                  <View style={s.revenueBarBg}>
                    <View style={[s.revenueBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                  </View>

                  {/* Stats row */}
                  <View style={s.statsRow}>
                    {[
                      { icon: 'account-outline',   label: 'Customers', value: r.totalCustomers,           color: D.blue   },
                      { icon: 'spa',               label: 'Services',  value: r.totalServices,            color: D.purple },
                      { icon: 'package-variant',   label: 'Products',  value: r.totalProducts,            color: D.amber  },
                      { icon: 'cash-multiple',     label: 'Avg Bill',  value: `₹${r.avgBillValue.toFixed(0)}`, color: D.green  },
                    ].map((stat, si) => (
                      <View key={stat.label} style={[s.statBlock, si < 3 && { borderRightWidth: 1, borderRightColor: D.border }]}>
                        <MaterialCommunityIcons name={stat.icon as any} size={13} color={stat.color} />
                        <Text style={[s.statBlockValue, { color: stat.color }]}>{stat.value}</Text>
                        <Text style={s.statBlockLabel}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })
        )}

      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  restrictedBox: { width: 72, height: 72, borderRadius: D.radius.xl, backgroundColor: D.surface, borderWidth: 1, borderColor: D.border, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  restrictedTitle: { fontSize: 16, fontWeight: '700', color: D.text },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.surface, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: D.border, overflow: 'hidden', position: 'relative',
  },
  headerGlow: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: D.greenMuted },
  backBtn: { width: 40, height: 40, borderRadius: D.radius.md, backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.border },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBox: { width: 44, height: 44, borderRadius: D.radius.md, backgroundColor: D.greenMuted, borderWidth: 1, borderColor: D.greenBorder, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: D.text, letterSpacing: -0.4 },
  headerSub: { fontSize: 11, color: D.textMuted, marginTop: 1 },
  headerRevBadge: { alignItems: 'flex-end', backgroundColor: D.greenMuted, borderRadius: D.radius.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: D.greenBorder },
  headerRevLabel: { fontSize: 9, fontWeight: '700', color: D.green, letterSpacing: 1.5 },
  headerRevValue: { fontSize: 16, fontWeight: '800', color: D.green, letterSpacing: -0.3 },

  // Scroll
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionIconBox: { width: 24, height: 24, borderRadius: 12, backgroundColor: D.greenMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.greenBorder },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: D.green, letterSpacing: 2.5 },
  sectionLine: { flex: 1, height: 1, backgroundColor: D.border },

  // Presets
  presetsRow: { gap: 8, marginBottom: 12 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: D.surface, borderRadius: D.radius.pill, borderWidth: 1, borderColor: D.border },
  presetChipActive: { backgroundColor: D.greenMuted, borderColor: D.green },
  presetChipText: { fontSize: 12, fontWeight: '600', color: D.textMuted },
  presetChipTextActive: { color: D.green },

  // Date pickers
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  datePicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: D.surface, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.border, padding: 12,
  },
  datePickerIcon: { width: 36, height: 36, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  datePickerLabel: { fontSize: 9, fontWeight: '700', color: D.textMuted, letterSpacing: 1, marginBottom: 2 },
  datePickerValue: { fontSize: 13, fontWeight: '700', color: D.text },

  // Staff chips
  staffChips: { gap: 8, paddingBottom: 4 },
  staffChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: D.surface, borderRadius: D.radius.pill, borderWidth: 1, borderColor: D.border },
  staffChipActive: { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  staffChipAvatar: { width: 22, height: 22, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  staffChipAvatarText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  staffChipText: { fontSize: 12, fontWeight: '600', color: D.textMuted },
  staffChipTextActive: { color: D.green },

  // Summary grid
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: { width: '30.5%', alignItems: 'center', backgroundColor: D.surface, borderRadius: D.radius.lg, borderWidth: 1, padding: 12 },
  summaryCardIcon: { width: 36, height: 36, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  summaryCardValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3, marginBottom: 3, textAlign: 'center' },
  summaryCardLabel: { fontSize: 9, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },

  // Report cards
  reportCard: { flexDirection: 'row', backgroundColor: D.surface, borderRadius: D.radius.xl, borderWidth: 1, borderColor: D.border, marginBottom: 10, overflow: 'hidden', shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 },
  reportStripe: { width: 4 },
  reportInner: { flex: 1, padding: 14 },
  reportCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  reportAvatar: { width: 46, height: 46, borderRadius: D.radius.md, alignItems: 'center', justifyContent: 'center' },
  reportAvatarText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  reportNameBlock: { flex: 1 },
  reportName: { fontSize: 15, fontWeight: '800', color: D.text, letterSpacing: -0.2, marginBottom: 3 },
  reportCustomerCount: { fontSize: 11, color: D.textMuted, fontWeight: '500' },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: D.radius.pill, borderWidth: 1 },
  rankBadgeText: { fontSize: 11, fontWeight: '800' },

  // Revenue bar
  revenueBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
  revenueBarLabel: { fontSize: 13, fontWeight: '800', color: D.text },
  revenueBarPct: { fontSize: 11, fontWeight: '700', color: D.textMuted },
  revenueBarBg: { height: 6, backgroundColor: D.border, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  revenueBarFill: { height: '100%', borderRadius: 3 },

  // Stats row
  statsRow: { flexDirection: 'row', backgroundColor: D.bg, borderRadius: D.radius.md, overflow: 'hidden', borderWidth: 1, borderColor: D.border },
  statBlock: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 },
  statBlockValue: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  statBlockLabel: { fontSize: 9, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3 },

  // Empty
  emptyBlock: { alignItems: 'center', paddingVertical: 48 },
  emptyIconBox: { width: 80, height: 80, borderRadius: D.radius.xl, backgroundColor: D.surface, borderWidth: 1, borderColor: D.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: D.text, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: D.textMuted, textAlign: 'center' },
});