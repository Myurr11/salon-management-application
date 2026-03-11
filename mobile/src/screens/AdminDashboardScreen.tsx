import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BarChartCard } from '../components/BarChartCard';
import { RevenueBarChart } from '../components/RevenueBarChart';
import type { ProductSale, StaffMember } from '../types';
import { updateStaffGoal } from '../services/supabaseService';

// ─── Design Tokens ────────────────────────────────────────────────────────────
// Warm white, high contrast, friendly & legible for non-technical workers
const D = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  primary: '#1A6B3C',
  primaryLight: '#E8F5EE',
  amber: '#E07B2A',
  amberLight: '#FEF3E8',
  blue: '#1E6FA8',
  blueLight: '#E8F2FB',
  rose: '#C0392B',
  roseLight: '#FDECEA',
  purple: '#6B3FA0',
  purpleLight: '#F0EAFB',
  text: '#111111',
  textSub: '#444444',
  textMuted: '#888888',
  border: '#E2DDD8',
  green: '#1A6B3C',
  greenLight: '#E8F5EE',
  red: '#C0392B',
  orange: '#E07B2A',
  orangeLight: '#FEF3E8',
  r: { sm: 10, md: 14, lg: 18, xl: 24, pill: 100 },
};

const { width: W } = Dimensions.get('window');
const TILE_W = (W - 40 - 12) / 2;

interface Props { navigation: any }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Divider = () => <View style={{ height: 1, backgroundColor: '#FFFFFF33', marginVertical: 0 }} />;

const SectionHead = ({ icon, label, color = D.primary }: { icon: string; label: string; color?: string }) => (
  <View style={sh.row}>
    <View style={[sh.bar, { backgroundColor: color }]} />
    <MaterialCommunityIcons name={icon as any} size={20} color={color} />
    <Text style={sh.text}>{label}</Text>
  </View>
);
const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: 6 },
  bar: { width: 4, height: 22, borderRadius: 2 },
  text: { fontSize: 18, fontWeight: '800', color: '#111111', letterSpacing: -0.3 },
});

const ActionBtn = ({ icon, label, color, bg, onPress }: { icon: string; label: string; color: string; bg: string; onPress: () => void }) => (
  <TouchableOpacity style={[ab.btn, { width: TILE_W }]} onPress={onPress} activeOpacity={0.7}>
    <View style={[ab.iconWrap, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={icon as any} size={30} color={color} />
    </View>
    <Text style={ab.label}>{label}</Text>
    <View style={[ab.arrow, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name="arrow-right" size={14} color={color} />
    </View>
  </TouchableOpacity>
);
const ab = StyleSheet.create({
  btn: { backgroundColor: '#FFFFFF', borderRadius: D.r.xl, padding: 18, borderWidth: 1.5, borderColor: '#E2DDD8', gap: 10 },
  iconWrap: { width: 56, height: 56, borderRadius: D.r.md, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '800', color: '#111111', lineHeight: 20 },
  arrow: { width: 28, height: 28, borderRadius: D.r.sm, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
});

const ActivityRow = ({ icon, iconColor, iconBg, title, meta, amount, amountColor }: { icon: string; iconColor: string; iconBg: string; title: string; meta: string; amount: string; amountColor?: string }) => (
  <View style={ar.row}>
    <View style={[ar.icon, { backgroundColor: iconBg }]}>
      <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
    </View>
    <View style={ar.content}>
      <Text style={ar.title} numberOfLines={1}>{title}</Text>
      <Text style={ar.meta} numberOfLines={1}>{meta}</Text>
    </View>
    <Text style={[ar.amount, { color: amountColor || D.primary }]}>{amount}</Text>
  </View>
);
const ar = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: D.r.lg, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#E2DDD8', gap: 12 },
  icon: { width: 48, height: 48, borderRadius: D.r.md, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#111111', marginBottom: 3 },
  meta: { fontSize: 12, color: '#888888', fontWeight: '500' },
  amount: { fontSize: 16, fontWeight: '900' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, staffMembers, refreshStaffMembers } = useAuth();
  const { getAdminRevenueSummary, productSales, inventory, visits, refreshData } = useData();

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [goalAmount, setGoalAmount] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => refreshData());
    return unsub;
  }, [navigation, refreshData]);

  const openGoalModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setGoalAmount(staff.monthlyGoal?.toString() || '');
    setGoalModalVisible(true);
  };

  const closeGoalModal = () => {
    setGoalModalVisible(false);
    setSelectedStaff(null);
    setGoalAmount('');
  };

  const handleSaveGoal = async () => {
    if (!selectedStaff) return;
    const amount = parseFloat(goalAmount);
    if (isNaN(amount) || amount < 0) return;
    setSavingGoal(true);
    try {
      await updateStaffGoal(selectedStaff.id, amount);
      await refreshStaffMembers();
      closeGoalModal();
    } catch (e) { console.error(e); }
    finally { setSavingGoal(false); }
  };

  if (!user || user.role !== 'admin') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: D.bg }}>
        <Text style={{ color: D.red, fontSize: 16, fontWeight: '700' }}>Admin access required.</Text>
      </View>
    );
  }

  const rev = useMemo(() => getAdminRevenueSummary(), [getAdminRevenueSummary]);
  const recentSales = useMemo(() => productSales.slice(0, 4), [productSales]);
  const recentServices = useMemo(
    () => visits
      .filter((v: any) => v.services?.length > 0)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4),
    [visits],
  );
  const lowStock = useMemo(() => inventory.filter((i: any) => i.quantity <= i.minThreshold), [inventory]);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const todayStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 52 }} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>A</Text>
          </View>
          <View>
            <Text style={s.headerDate}>{todayStr}</Text>
            <Text style={s.headerTitle}>Admin Dashboard</Text>
          </View>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.75}>
          <MaterialCommunityIcons name="logout" size={20} color={D.red} />
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ── Hero Revenue Card ── */}
      <View style={s.heroCard}>
        <View style={s.heroTopRow}>
          <View>
            <Text style={s.heroEyebrow}>💰  TODAY'S TOTAL</Text>
            <Text style={s.heroAmount}>₹{rev.todayTotal.toFixed(0)}</Text>
          </View>
          <View style={s.heroIcon}>
            <MaterialCommunityIcons name="trending-up" size={22} color="#FFFFFF" />
          </View>
        </View>
        <Divider />
        <View style={s.heroSubRow}>
          <View style={s.heroSubCol}>
            <Text style={s.heroSubLabel}>This Month</Text>
            <Text style={s.heroSubVal}>₹{rev.monthlyTotal.toFixed(0)}</Text>
          </View>
          <View style={s.heroSubSep} />
          <View style={s.heroSubCol}>
            <Text style={s.heroSubLabel}>This Year</Text>
            <Text style={s.heroSubVal}>₹{rev.yearlyTotal.toFixed(0)}</Text>
          </View>
        </View>
      </View>

      {/* ── Payment Breakdown ── */}
      {rev.paymentBreakdown && (
        <View style={s.payRow}>
          {[
            { label: 'Cash',   icon: 'cash',                val: rev.paymentBreakdown.cash   || 0, color: D.green,  bg: D.greenLight },
            { label: 'UPI',    icon: 'contactless-payment', val: rev.paymentBreakdown.upi    || 0, color: D.blue,   bg: D.blueLight },
            { label: 'Card',   icon: 'credit-card',         val: rev.paymentBreakdown.card   || 0, color: D.amber,  bg: D.amberLight },
            { label: 'Udhaar', icon: 'handshake',           val: rev.paymentBreakdown.udhaar || 0, color: D.rose,   bg: D.roseLight },
          ].map(p => (
            <View key={p.label} style={[s.payPill, { backgroundColor: p.bg, borderColor: p.color + '55' }]}>
              <MaterialCommunityIcons name={p.icon as any} size={18} color={p.color} />
              <Text style={[s.payAmt, { color: p.color }]}>₹{p.val.toFixed(0)}</Text>
              <Text style={s.payLabel}>{p.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Staff Revenue Chart ── */}
      <View style={s.chartBlock}>
        <SectionHead icon="account-group" label="Staff Revenue Today" color={D.primary} />
        <BarChartCard
          title=""
          items={rev.byStaffToday.map((st: any) => ({ label: st.staffName, value: st.total }))}
          formatValue={(v: number) => `₹${v.toFixed(0)}`}
        />
      </View>

            {/* ── Quick Actions ── */}
      <SectionHead icon="apps" label="Quick Actions" color={D.primary} />
      <View style={s.actionsGrid}>
        {[
          { icon: 'package-variant',         label: 'Inventory',         color: D.purple, bg: D.purpleLight, nav: 'AdminInventory' },
          { icon: 'spa',                      label: 'Services',          color: D.green,  bg: D.greenLight,  nav: 'AdminServices' },
          { icon: 'percent',                 label: 'Offers',            color: D.amber,  bg: D.amberLight,   nav: 'AdminOffers' },
          { icon: 'cart-outline',             label: 'Product Sales',     color: D.blue,   bg: D.blueLight,   nav: 'AdminProductSales' },
          { icon: 'clipboard-check-outline',  label: 'Attendance',        color: D.green,  bg: D.greenLight,  nav: 'AdminAttendance' },
          { icon: 'credit-card-outline',      label: 'Udhaar',            color: D.rose,   bg: D.roseLight,   nav: 'AdminUdhaar' },
          { icon: 'chart-bar',                label: 'Staff Performance', color: D.amber,  bg: D.amberLight,  nav: 'AdminStaffPerformance' },
          { icon: 'account-group',            label: 'Manage Staff',      color: D.green,  bg: D.greenLight,  nav: 'AdminManageStaff' },
          { icon: 'office-building-outline',  label: 'Assign Branch',     color: D.primary,bg: D.primaryLight,nav: 'AdminAssignBranch' },
          { icon: 'calendar-clock',           label: 'Appointments',      color: D.blue,   bg: D.blueLight,   nav: 'AppointmentsList' },
          { icon: 'file-chart',               label: 'Staff Report',      color: D.purple, bg: D.purpleLight, nav: 'StaffReport' },
        ].map(a => (
          <ActionBtn key={a.nav} icon={a.icon} label={a.label} color={a.color} bg={a.bg} onPress={() => navigation.navigate(a.nav)} />
        ))}
      </View>

      {/* ── Branch chart ── */}
      {rev.byBranch?.length > 0 && (
        <View style={s.chartBlock}>
          <SectionHead icon="office-building" label="Branch Revenue Today" color={D.blue} />
          <BarChartCard
            title=""
            items={rev.byBranch.map((b: any) => ({ label: b.branchName, value: b.todayTotal }))}
            formatValue={(v: number) => `₹${v.toFixed(0)}`}
            TouchableWrapper={({ onPress, children }: any) => (
              <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{children}</TouchableOpacity>
            )}
            onPressItem={(i: number) => {
              const b = rev.byBranch?.[i];
              if (b?.branchId && b.branchId !== 'default') {
                navigation.navigate('BranchDetail', { branchId: b.branchId, branchName: b.branchName });
              }
            }}
          />
        </View>
      )}

      {/* ── Staff Goals ── */}
      <View style={s.section}>
        <View style={s.sectionRow}>
          <SectionHead icon="target" label="Staff Goals" color={D.amber} />
          <TouchableOpacity style={s.manageBtn} onPress={() => navigation.navigate('AdminStaffPerformance')}>
            <Text style={s.manageBtnText}>Manage</Text>
          </TouchableOpacity>
        </View>

        {staffMembers.map((staff: StaffMember) => {
          let earned = 0;
          visits.forEach((v: any) => {
            const d = new Date(v.date);
            if (d.getMonth() !== curMonth || d.getFullYear() !== curYear) return;
            if (v.attendingStaff?.length > 0) {
              const rec = v.attendingStaff.find((s: any) => s.staffId === staff.id);
              if (rec) earned += rec.revenueShare;
            } else if (v.staffId === staff.id) {
              earned += v.total;
            }
          });

          const goal = staff.monthlyGoal || 0;
          const pct = goal > 0 ? Math.min(100, (earned / goal) * 100) : 0;
          const initials = staff.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
          const barColor = pct >= 100 ? D.amber : pct >= 60 ? D.green : D.blue;

          return (
            <View key={staff.id} style={s.goalCard}>
              <View style={s.goalTopRow}>
                <View style={s.goalAvatar}>
                  <Text style={s.goalInitials}>{initials}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.goalName}>{staff.name}</Text>
                  {goal > 0 ? (
                    <Text style={s.goalNumbers}>
                      <Text style={{ color: barColor, fontWeight: '800' }}>₹{earned.toFixed(0)}</Text>
                      <Text style={{ color: D.textMuted }}> / ₹{goal}</Text>
                    </Text>
                  ) : (
                    <Text style={{ color: D.textMuted, fontSize: 13, fontWeight: '500' }}>No goal set yet</Text>
                  )}
                </View>
                <TouchableOpacity style={s.editBtn} onPress={() => openGoalModal(staff)}>
                  <MaterialCommunityIcons name="pencil" size={16} color={D.amber} />
                  <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
              {goal > 0 && (
                <View style={s.goalBarTrack}>
                  <View style={[s.goalBarFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
                </View>
              )}
              {goal === 0 && (
                <TouchableOpacity style={s.setGoalBanner} onPress={() => openGoalModal(staff)}>
                  <MaterialCommunityIcons name="target" size={18} color={D.amber} />
                  <Text style={s.setGoalBannerText}>Tap to set a monthly goal</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* ── Low Stock ── */}
      <View style={s.section}>
        <View style={s.sectionRow}>
          <SectionHead icon="alert-circle" label="Low Stock Items" color={D.orange} />
          {lowStock.length > 0 && (
            <View style={s.warnBadge}>
              <Text style={s.warnBadgeText}>{lowStock.length} item{lowStock.length > 1 ? 's' : ''}</Text>
            </View>
          )}
          <TouchableOpacity style={s.manageBtn} onPress={() => navigation.navigate('AdminInventory')}>
            <Text style={s.manageBtnText}>Manage</Text>
          </TouchableOpacity>
        </View>

        {lowStock.length === 0 ? (
          <View style={s.emptyBlock}>
            <Text style={s.emptyEmoji}>✅</Text>
            <Text style={s.emptyText}>All items are well stocked</Text>
          </View>
        ) : (
          lowStock.map((item: any) => (
            <View key={item.id} style={s.stockRow}>
              <View style={[s.stockIcon, { backgroundColor: item.quantity === 0 ? D.roseLight : D.amberLight }]}>
                <MaterialCommunityIcons name="package-variant" size={22} color={item.quantity === 0 ? D.red : D.amber} />
              </View>
              <Text style={s.stockName}>{item.name}</Text>
              <View style={[s.stockTag, { backgroundColor: item.quantity === 0 ? D.roseLight : D.amberLight, borderColor: (item.quantity === 0 ? D.red : D.amber) + '55' }]}>
                <Text style={[s.stockTagText, { color: item.quantity === 0 ? D.red : D.amber }]}>
                  {item.quantity === 0 ? 'OUT OF STOCK' : `${item.quantity} left`}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Recent Services ── */}
      <View style={s.section}>
        <SectionHead icon="spa" label="Recent Services" color={D.purple} />
        {recentServices.length === 0 ? (
          <View style={s.emptyBlock}>
            <Text style={s.emptyEmoji}>💆</Text>
            <Text style={s.emptyText}>No services recorded yet</Text>
          </View>
        ) : (
          recentServices.map((item: any, i: number) => {
            const staffName = item.attendingStaff?.length > 0
              ? item.attendingStaff.map((st: any) => st.staffName).join(', ')
              : item.staffName || 'Unknown';
            const total = item.services.reduce((acc: number, sv: any) => acc + (sv.price || 0), 0);
            const names = item.services.map((sv: any) => sv.name || sv.serviceName).filter(Boolean).join(', ');
            return (
              <ActivityRow
                key={item.id || i}
                icon="spa"
                iconColor={D.purple}
                iconBg={D.purpleLight}
                title={names || 'Service Visit'}
                meta={`${item.customerName || 'Walk-in'}  •  ${staffName}  •  ${fmtDate(item.date)}`}
                amount={`₹${total.toFixed(0)}`}
                amountColor={D.purple}
              />
            );
          })
        )}
      </View>

      {/* ── Recent Product Sales ── */}
      <View style={s.section}>
        <SectionHead icon="shopping" label="Recent Product Sales" color={D.blue} />
        {recentSales.length === 0 ? (
          <View style={s.emptyBlock}>
            <Text style={s.emptyEmoji}>🛍️</Text>
            <Text style={s.emptyText}>No product sales yet</Text>
          </View>
        ) : (
          recentSales.map((item: ProductSale, i: number) => (
            <ActivityRow
              key={item.id || i}
              icon="package-variant"
              iconColor={D.blue}
              iconBg={D.blueLight}
              title={item.productName}
              meta={`${item.quantity} × ₹${item.unitPrice}  •  ${item.staffName}  •  ${fmtDate(item.date)}`}
              amount={`₹${item.totalPrice.toFixed(0)}`}
              amountColor={D.blue}
            />
          ))
        )}
      </View>

      {/* ── Goal Modal ── */}
      <Modal visible={goalModalVisible} transparent animationType="slide" onRequestClose={closeGoalModal}>
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handle} />
            <Text style={m.title}>Set Monthly Goal</Text>
            {selectedStaff && (
              <View style={m.staffRow}>
                <View style={m.staffAvatar}>
                  <Text style={m.staffInitials}>
                    {selectedStaff.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <Text style={m.staffName}>{selectedStaff.name}</Text>
              </View>
            )}
            <Text style={m.inputLabel}>Target amount in Rupees (₹)</Text>
            <View style={m.inputWrap}>
              <Text style={m.rupeeSign}>₹</Text>
              <TextInput
                style={m.input}
                value={goalAmount}
                onChangeText={setGoalAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={D.textMuted}
                selectionColor={D.primary}
              />
            </View>
            <TouchableOpacity
              style={[m.saveBtn, savingGoal && { opacity: 0.6 }]}
              onPress={handleSaveGoal}
              disabled={savingGoal}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="check-circle" size={22} color="#fff" />
              <Text style={m.saveBtnText}>{savingGoal ? 'Saving...' : 'Save Goal'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={m.cancelBtn} onPress={closeGoalModal}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

// ─── Main Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F7F5F2', paddingTop: 52, paddingHorizontal: 20 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#1A6B3C', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  headerDate: { fontSize: 11, color: '#888888', fontWeight: '600', marginBottom: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#111111', letterSpacing: -0.5 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FDECEA', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: '#C0392B44' },
  logoutText: { color: '#C0392B', fontSize: 14, fontWeight: '800' },

  // Hero
  heroCard: { backgroundColor: '#1A6B3C', borderRadius: 24, padding: 22, marginBottom: 16 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  heroEyebrow: { color: '#FFFFFF99', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  heroAmount: { color: '#FFFFFF', fontSize: 40, fontWeight: '900', letterSpacing: -1.5 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF22', alignItems: 'center', justifyContent: 'center' },
  heroSubRow: { flexDirection: 'row', paddingTop: 16 },
  heroSubCol: { flex: 1 },
  heroSubSep: { width: 1, backgroundColor: '#FFFFFF33', marginHorizontal: 16 },
  heroSubLabel: { color: '#FFFFFFAA', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  heroSubVal: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },

  // Payment pills
  payRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  payPill: { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1.5, gap: 3 },
  payAmt: { fontSize: 13, fontWeight: '900' },
  payLabel: { fontSize: 10, color: '#888888', fontWeight: '700' },

  // Chart block
  chartBlock: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, marginBottom: 20, borderWidth: 1.5, borderColor: '#E2DDD8' },

  // Actions grid
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },

  // Section
  section: { marginBottom: 28 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  manageBtn: { backgroundColor: '#E8F5EE', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: '#1A6B3C44', marginBottom: 14 },
  manageBtnText: { color: '#1A6B3C', fontSize: 13, fontWeight: '800' },

  // Goal card
  goalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: '#E2DDD8' },
  goalTopRow: { flexDirection: 'row', alignItems: 'center' },
  goalAvatar: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1A6B3C44' },
  goalInitials: { color: '#1A6B3C', fontSize: 16, fontWeight: '900' },
  goalName: { fontSize: 16, fontWeight: '800', color: '#111111', marginBottom: 2 },
  goalNumbers: { fontSize: 14 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3E8', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: '#E07B2A55' },
  editBtnText: { color: '#E07B2A', fontSize: 13, fontWeight: '800' },
  goalBarTrack: { height: 8, backgroundColor: '#E2DDD8', borderRadius: 4, overflow: 'hidden', marginTop: 14 },
  goalBarFill: { height: '100%', borderRadius: 4 },
  setGoalBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3E8', borderRadius: 14, padding: 12, marginTop: 12, borderWidth: 1.5, borderColor: '#E07B2A55' },
  setGoalBannerText: { color: '#E07B2A', fontSize: 14, fontWeight: '700' },

  // Stock
  warnBadge: { backgroundColor: '#FEF3E8', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1.5, borderColor: '#E07B2A55', marginBottom: 14, marginLeft: -4 },
  warnBadgeText: { color: '#E07B2A', fontSize: 12, fontWeight: '800' },
  stockRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#E2DDD8', gap: 12 },
  stockIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stockName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111111' },
  stockTag: { borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5 },
  stockTagText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },

  // Empty
  emptyBlock: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1.5, borderColor: '#E2DDD8' },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#888888', fontWeight: '600' },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40, borderWidth: 1.5, borderColor: '#E2DDD8', borderBottomWidth: 0 },
  handle: { width: 44, height: 5, backgroundColor: '#E2DDD8', borderRadius: 3, alignSelf: 'center', marginBottom: 22 },
  title: { fontSize: 22, fontWeight: '900', color: '#111111', marginBottom: 16, letterSpacing: -0.5 },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#E8F5EE', borderRadius: 18, padding: 14, marginBottom: 22, borderWidth: 1.5, borderColor: '#1A6B3C33' },
  staffAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#1A6B3C', alignItems: 'center', justifyContent: 'center' },
  staffInitials: { color: '#fff', fontSize: 15, fontWeight: '900' },
  staffName: { fontSize: 16, fontWeight: '800', color: '#111111' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#444444', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F5F2', borderRadius: 18, borderWidth: 2, borderColor: '#1A6B3C', paddingHorizontal: 16, marginBottom: 22 },
  rupeeSign: { fontSize: 26, fontWeight: '800', color: '#1A6B3C', marginRight: 6 },
  input: { flex: 1, fontSize: 32, fontWeight: '900', color: '#111111', paddingVertical: 16 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#1A6B3C', borderRadius: 18, paddingVertical: 18, marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { color: '#888888', fontSize: 15, fontWeight: '700' },
});