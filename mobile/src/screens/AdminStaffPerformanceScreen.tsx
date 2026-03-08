import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, theme, shadows } from '../theme';
import * as supabaseService from '../services/supabaseService';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceWarm: '#FFFDF9',
  border: '#E8E3DB',
  gold: '#C9A84C',
  goldMuted: '#C9A84C18',
  goldBorder: '#C9A84C44',
  text: '#1A1814',
  textSub: '#6B6560',
  textMuted: '#A09A8F',
  green: '#2D9A5F',
  greenMuted: '#2D9A5F15',
  greenBorder: '#2D9A5F33',
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
const SectionLabel = ({ children }: { children: string }) => (
  <View style={sl.row}>
    <View style={sl.dash} />
    <Text style={sl.text}>{children}</Text>
    <View style={sl.line} />
  </View>
);
const sl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: 4 },
  dash: { width: 16, height: 2, backgroundColor: D.gold, borderRadius: 1 },
  line: { flex: 1, height: 1, backgroundColor: D.border },
  text: { color: D.gold, fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
});

// ─── Rank medal colours ───────────────────────────────────────────────────────
const RANK_COLORS = [
  { bg: '#FFF4D6', border: '#F5C842', text: '#A07800' },  // #1 gold
  { bg: '#F2F4F8', border: '#A8B4C4', text: '#4A5568' },  // #2 silver
  { bg: '#FFF0EB', border: '#E8A07A', text: '#8B4513' },  // #3 bronze
];
const rankColor = (i: number) => RANK_COLORS[i] ?? { bg: D.bg, border: D.border, text: D.textMuted };

// ─── Mini stat cell ───────────────────────────────────────────────────────────
const StatCell: React.FC<{ icon: string; iconColor: string; iconBg: string; value: string; label: string }> = ({
  icon, iconColor, iconBg, value, label,
}) => (
  <View style={sc.cell}>
    <View style={[sc.iconBox, { backgroundColor: iconBg }]}>
      <MaterialCommunityIcons name={icon as any} size={16} color={iconColor} />
    </View>
    <Text style={sc.value}>{value}</Text>
    <Text style={sc.label}>{label}</Text>
  </View>
);
const sc = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', gap: 4 },
  iconBox: { width: 32, height: 32, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 14, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  label: { fontSize: 10, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const AdminStaffPerformanceScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers, refreshStaffMembers } = useAuth();
  const { visits } = useData();
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [selectedStaffForGoal, setSelectedStaffForGoal] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalInputFocused, setGoalInputFocused] = useState(false);

  const staffStats = useMemo(() => {
    const map: Record<string, {
      name: string; customers: number; revenue: number;
      servicesCount: number; productsCount: number; monthlyGoal: number;
    }> = {};
    staffMembers.forEach(s => {
      map[s.id] = { name: s.name, customers: 0, revenue: 0, servicesCount: 0, productsCount: 0, monthlyGoal: s.monthlyGoal || 0 };
    });
    visits.forEach(v => {
      if (map[v.staffId]) {
        map[v.staffId].customers += 1;
        map[v.staffId].revenue += v.total;
        map[v.staffId].servicesCount += v.services.length;
        map[v.staffId].productsCount += v.products.reduce((sum: number, p: any) => sum + p.quantity, 0);
      }
      if (v.attendingStaff) {
        v.attendingStaff.forEach((staff: any) => {
          if (map[staff.staffId] && staff.staffId !== v.staffId) {
            map[staff.staffId].customers += 1;
            map[staff.staffId].revenue += staff.revenueShare;
          }
        });
      }
    });
    return Object.entries(map)
      .map(([staffId, stats]) => ({
        staffId,
        ...stats,
        avgBill: stats.customers > 0 ? stats.revenue / stats.customers : 0,
        goalProgress: stats.monthlyGoal > 0 ? Math.min(100, (stats.revenue / stats.monthlyGoal) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [visits, staffMembers]);

  const totalRevenue = useMemo(() => staffStats.reduce((s, st) => s + st.revenue, 0), [staffStats]);
  const totalCustomers = useMemo(() => staffStats.reduce((s, st) => s + st.customers, 0), [staffStats]);

  const openGoalModal = (staffId: string, name: string, currentGoal: number) => {
    setSelectedStaffForGoal(staffId);
    setSelectedStaffName(name);
    setGoalInput(currentGoal > 0 ? currentGoal.toString() : '');
    setGoalModalVisible(true);
  };

  const saveGoal = async () => {
    if (!selectedStaffForGoal) return;
    const goalValue = parseFloat(goalInput);
    if (isNaN(goalValue) || goalValue < 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid amount.');
      return;
    }
    setSavingGoal(true);
    try {
      await supabaseService.updateStaffGoal(selectedStaffForGoal, goalValue);
      await refreshStaffMembers();
      setGoalModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to update goal.');
    } finally {
      setSavingGoal(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <View style={[s.center, { flex: 1, backgroundColor: D.bg }]}>
        <Text style={{ color: D.red }}>Admin access required.</Text>
      </View>
    );
  }

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={D.text} />
        </TouchableOpacity>
        <View style={s.headerIconBox}>
          <MaterialCommunityIcons name="chart-bar" size={22} color={D.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Staff Performance</Text>
          <Text style={s.headerSub}>{staffStats.length} staff members</Text>
        </View>
      </View>

      {/* ── Summary Band ── */}
      <View style={s.summaryBand}>
        <View style={[s.summaryCard, { borderColor: D.greenBorder }]}>
          <View style={[s.summaryIcon, { backgroundColor: D.greenMuted }]}>
            <MaterialCommunityIcons name="currency-inr" size={18} color={D.green} />
          </View>
          <Text style={s.summaryValue}>₹{(totalRevenue / 1000).toFixed(1)}k</Text>
          <Text style={s.summaryLabel}>Total Revenue</Text>
        </View>
        <View style={[s.summaryCard, { borderColor: D.blueBorder }]}>
          <View style={[s.summaryIcon, { backgroundColor: D.blueMuted }]}>
            <MaterialCommunityIcons name="account-group-outline" size={18} color={D.blue} />
          </View>
          <Text style={s.summaryValue}>{totalCustomers}</Text>
          <Text style={s.summaryLabel}>Total Customers</Text>
        </View>
        <View style={[s.summaryCard, { borderColor: D.amberBorder }]}>
          <View style={[s.summaryIcon, { backgroundColor: D.amberMuted }]}>
            <MaterialCommunityIcons name="account-multiple-outline" size={18} color={D.amber} />
          </View>
          <Text style={s.summaryValue}>{staffStats.length}</Text>
          <Text style={s.summaryLabel}>Active Staff</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        <SectionLabel>PERFORMANCE RANKING</SectionLabel>

        {staffStats.map((st, index) => {
          const rc = rankColor(index);
          const progressColor = st.goalProgress >= 100 ? D.gold
            : st.goalProgress >= 60 ? D.green
            : D.blue;
          const isTop3 = index < 3;

          return (
            <View key={st.staffId} style={s.card}>
              {/* Rank stripe */}
              <View style={[s.rankStripe, { backgroundColor: rc.border }]} />

              <View style={s.cardInner}>
                {/* ── Card Header ── */}
                <View style={s.cardHead}>
                  {/* Avatar */}
                  <View style={[s.avatar, { backgroundColor: rc.bg, borderColor: rc.border }]}>
                    <Text style={[s.avatarText, { color: rc.text }]}>{getInitials(st.name)}</Text>
                  </View>

                  {/* Name + rank */}
                  <View style={s.cardHeadInfo}>
                    <Text style={s.staffName}>{st.name}</Text>
                    <View style={[s.rankBadge, { backgroundColor: rc.bg, borderColor: rc.border }]}>
                      {isTop3 && (
                        <MaterialCommunityIcons
                          name="trophy"
                          size={11}
                          color={rc.text}
                          style={{ marginRight: 3 }}
                        />
                      )}
                      <Text style={[s.rankBadgeText, { color: rc.text }]}>Rank #{index + 1}</Text>
                    </View>
                  </View>

                  {/* Revenue */}
                  <View style={s.revenueCol}>
                    <Text style={s.revenueValue}>₹{st.revenue.toFixed(0)}</Text>
                    <Text style={s.revenueLabel}>revenue</Text>
                  </View>
                </View>

                {/* ── Stat Grid ── */}
                <View style={s.divider} />
                <View style={s.statGrid}>
                  <StatCell
                    icon="account-group-outline"
                    iconColor={D.blue}
                    iconBg={D.blueMuted}
                    value={String(st.customers)}
                    label="Customers"
                  />
                  <View style={s.statSep} />
                  <StatCell
                    icon="spa"
                    iconColor={D.purple}
                    iconBg={D.purpleMuted}
                    value={String(st.servicesCount)}
                    label="Services"
                  />
                  <View style={s.statSep} />
                  <StatCell
                    icon="package-variant"
                    iconColor={D.green}
                    iconBg={D.greenMuted}
                    value={String(st.productsCount)}
                    label="Products"
                  />
                  <View style={s.statSep} />
                  <StatCell
                    icon="cash-multiple"
                    iconColor={D.amber}
                    iconBg={D.amberMuted}
                    value={`₹${st.avgBill.toFixed(0)}`}
                    label="Avg Bill"
                  />
                </View>

                {/* ── Goal Section ── */}
                <View style={s.divider} />
                <View style={s.goalBlock}>
                  <View style={s.goalTopRow}>
                    <View style={s.goalLabelRow}>
                      <MaterialCommunityIcons name="target" size={15} color={D.gold} />
                      <Text style={s.goalTitle}>Monthly Goal</Text>
                    </View>
                    <TouchableOpacity
                      style={s.goalEditBtn}
                      onPress={() => openGoalModal(st.staffId, st.name, st.monthlyGoal)}
                      activeOpacity={0.75}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={14} color={D.gold} />
                      <Text style={s.goalEditText}>{st.monthlyGoal > 0 ? 'Edit' : 'Set Goal'}</Text>
                    </TouchableOpacity>
                  </View>

                  {st.monthlyGoal > 0 ? (
                    <>
                      <View style={s.goalAmountRow}>
                        <Text style={s.goalCurrent}>
                          <Text style={{ color: progressColor, fontWeight: '800' }}>
                            ₹{st.revenue.toFixed(0)}
                          </Text>
                          <Text style={{ color: D.textMuted }}> of ₹{st.monthlyGoal}</Text>
                        </Text>
                        <View style={[s.goalPctBadge, { backgroundColor: progressColor + '20', borderColor: progressColor + '44' }]}>
                          <Text style={[s.goalPctText, { color: progressColor }]}>
                            {Math.round(st.goalProgress)}%
                          </Text>
                        </View>
                      </View>
                      <View style={s.barBg}>
                        <View
                          style={[s.barFill, {
                            width: `${Math.min(st.goalProgress, 100)}%` as any,
                            backgroundColor: progressColor,
                          }]}
                        />
                      </View>
                      {st.goalProgress >= 100 && (
                        <View style={s.goalAchievedBanner}>
                          <MaterialCommunityIcons name="check-decagram" size={14} color={D.gold} />
                          <Text style={s.goalAchievedText}>Goal achieved! 🎉</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <TouchableOpacity
                      style={s.noGoalBtn}
                      onPress={() => openGoalModal(st.staffId, st.name, 0)}
                      activeOpacity={0.75}
                    >
                      <MaterialCommunityIcons name="target" size={16} color={D.textMuted} />
                      <Text style={s.noGoalText}>Tap to set a monthly goal</Text>
                      <MaterialCommunityIcons name="chevron-right" size={16} color={D.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Goal Modal ── */}
      <Modal visible={goalModalVisible} transparent animationType="fade" onRequestClose={() => setGoalModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            {/* Glow blob */}
            <View style={s.modalGlow} />

            <View style={s.modalHead}>
              <View style={s.modalTitleIconBox}>
                <MaterialCommunityIcons name="target" size={20} color={D.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Monthly Goal</Text>
                <Text style={s.modalSub}>{selectedStaffName}</Text>
              </View>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setGoalModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color={D.textSub} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalInputLabel}>TARGET AMOUNT (₹)</Text>
            <View style={[s.modalInputBox, goalInputFocused && s.modalInputBoxFocused]}>
              <View style={[s.modalInputIcon, goalInputFocused && s.modalInputIconFocused]}>
                <MaterialCommunityIcons name="currency-inr" size={20} color={goalInputFocused ? D.gold : D.textMuted} />
              </View>
              <TextInput
                style={s.modalInput}
                keyboardType="numeric"
                placeholder="e.g. 50000"
                placeholderTextColor={D.textMuted}
                value={goalInput}
                onChangeText={setGoalInput}
                onFocus={() => setGoalInputFocused(true)}
                onBlur={() => setGoalInputFocused(false)}
                selectionColor={D.gold}
              />
            </View>

            {/* Live preview */}
            {goalInput && !isNaN(+goalInput) && +goalInput > 0 && (
              <View style={s.modalPreview}>
                <MaterialCommunityIcons name="information-outline" size={14} color={D.gold} />
                <Text style={s.modalPreviewText}>
                  Goal set to <Text style={{ color: D.text, fontWeight: '800' }}>₹{(+goalInput).toLocaleString('en-IN')}</Text>
                </Text>
              </View>
            )}

            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setGoalModalVisible(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSaveBtn, savingGoal && { opacity: 0.6 }]}
                onPress={saveGoal}
                disabled={savingGoal}
                activeOpacity={0.85}
              >
                {savingGoal
                  ? <ActivityIndicator size="small" color={D.bg} />
                  : <>
                      <MaterialCommunityIcons name="check" size={18} color={D.bg} />
                      <Text style={s.modalSaveText}>Save Goal</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border, gap: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: D.radius.md,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
  },
  headerIconBox: {
    width: 44, height: 44, borderRadius: D.radius.md,
    backgroundColor: D.goldMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.goldBorder,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },

  // Summary band
  summaryBand: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: D.surfaceWarm, borderBottomWidth: 1, borderBottomColor: D.border,
  },
  summaryCard: {
    flex: 1, backgroundColor: D.surface, borderRadius: D.radius.lg,
    padding: 12, alignItems: 'center', borderWidth: 1,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  summaryIcon: {
    width: 34, height: 34, borderRadius: D.radius.sm,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  summaryValue: { fontSize: 16, fontWeight: '800', color: D.text, letterSpacing: -0.5 },
  summaryLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },

  // List
  list: { paddingHorizontal: 20, paddingTop: 20 },

  // Card
  card: {
    flexDirection: 'row', backgroundColor: D.surface, borderRadius: D.radius.xl,
    marginBottom: 14, borderWidth: 1, borderColor: D.border, overflow: 'hidden',
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  rankStripe: { width: 5 },
  cardInner: { flex: 1, padding: 16 },

  // Card head
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 48, height: 48, borderRadius: D.radius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  avatarText: { fontSize: 17, fontWeight: '800' },
  cardHeadInfo: { flex: 1 },
  staffName: { fontSize: 16, fontWeight: '800', color: D.text, marginBottom: 5, letterSpacing: -0.2 },
  rankBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: D.radius.pill, borderWidth: 1,
  },
  rankBadgeText: { fontSize: 11, fontWeight: '700' },
  revenueCol: { alignItems: 'flex-end' },
  revenueValue: { fontSize: 18, fontWeight: '800', color: D.green, letterSpacing: -0.5 },
  revenueLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3, marginTop: 2 },

  // Stat grid
  divider: { height: 1, backgroundColor: D.border, marginVertical: 14 },
  statGrid: { flexDirection: 'row', alignItems: 'center' },
  statSep: { width: 1, height: 36, backgroundColor: D.border, marginHorizontal: 4 },

  // Goal block
  goalBlock: {},
  goalTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  goalLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalTitle: { fontSize: 13, fontWeight: '700', color: D.text },
  goalEditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: D.goldMuted, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.goldBorder,
  },
  goalEditText: { fontSize: 12, fontWeight: '700', color: D.gold },
  goalAmountRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  goalCurrent: { fontSize: 14 },
  goalPctBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: D.radius.pill, borderWidth: 1,
  },
  goalPctText: { fontSize: 12, fontWeight: '800' },
  barBg: {
    height: 6, backgroundColor: D.border, borderRadius: 3, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  goalAchievedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: D.goldMuted, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.goldBorder,
  },
  goalAchievedText: { fontSize: 13, fontWeight: '700', color: D.gold },
  noGoalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: D.bg, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.border, borderStyle: 'dashed',
  },
  noGoalText: { flex: 1, fontSize: 13, color: D.textMuted, fontWeight: '500' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    padding: 24, width: '100%', maxWidth: 420,
    borderWidth: 1, borderColor: D.border, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
  },
  modalGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 120, height: 120, borderRadius: 60, backgroundColor: D.goldMuted,
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  modalTitleIconBox: {
    width: 44, height: 44, borderRadius: D.radius.md,
    backgroundColor: D.goldMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.goldBorder,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  modalSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: D.radius.sm,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
  },
  modalInputLabel: {
    color: D.gold, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8,
  },
  modalInputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.bg, borderRadius: D.radius.md,
    borderWidth: 1.5, borderColor: D.border, overflow: 'hidden', marginBottom: 14,
  },
  modalInputBoxFocused: { borderColor: D.gold },
  modalInputIcon: {
    width: 46, height: 52, alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.surface, borderRightWidth: 1, borderRightColor: D.border,
  },
  modalInputIconFocused: { backgroundColor: D.goldMuted, borderRightColor: D.goldBorder },
  modalInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 20, color: D.text, fontWeight: '700',
  },
  modalPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.goldMuted, borderRadius: D.radius.md,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: D.goldBorder, marginBottom: 20,
  },
  modalPreviewText: { fontSize: 13, color: D.textSub, fontWeight: '600' },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 15, borderRadius: D.radius.lg,
    backgroundColor: D.bg, alignItems: 'center', borderWidth: 1, borderColor: D.border,
  },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: D.textSub },
  modalSaveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: D.radius.lg, backgroundColor: D.text,
    shadowColor: D.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  modalSaveText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});