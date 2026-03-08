import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { colors, theme, shadows } from '../theme';
import { useAuth } from '../context/AuthContext';
import type { ProductSale } from '../types';

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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  dash: { width: 16, height: 2, backgroundColor: D.gold, borderRadius: 1 },
  line: { flex: 1, height: 1, backgroundColor: D.border },
  text: { color: D.gold, fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
});

// ─── Avatar initials ──────────────────────────────────────────────────────────
const Avatar = ({ name, size = 36 }: { name: string; size?: number }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <View style={[av.box, { width: size, height: size, borderRadius: size / 4 }]}>
      <Text style={[av.text, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
};
const av = StyleSheet.create({
  box: { backgroundColor: D.goldMuted, borderWidth: 1, borderColor: D.goldBorder, alignItems: 'center', justifyContent: 'center' },
  text: { color: D.gold, fontWeight: '800' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const AdminProductSalesScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers } = useAuth();
  const { getProductSales } = useData();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [allSales, setAllSales] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const sales = await getProductSales(selectedStaffId ? { staffId: selectedStaffId } : undefined);
        setAllSales(sales);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getProductSales, selectedStaffId]);

  const totalRevenue = useMemo(() => allSales.reduce((s, sale) => s + sale.totalPrice, 0), [allSales]);
  const totalUnits = useMemo(() => allSales.reduce((s, sale) => s + sale.quantity, 0), [allSales]);

  // Top selling product
  const topProduct = useMemo(() => {
    if (!allSales.length) return null;
    const map: Record<string, { name: string; total: number }> = {};
    allSales.forEach(s => {
      if (!map[s.productName]) map[s.productName] = { name: s.productName, total: 0 };
      map[s.productName].total += s.totalPrice;
    });
    return Object.values(map).sort((a, b) => b.total - a.total)[0];
  }, [allSales]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  if (!user || user.role !== 'admin') {
    return (
      <View style={[s.center, { flex: 1, backgroundColor: D.bg }]}>
        <Text style={{ color: D.red }}>Admin access required.</Text>
      </View>
    );
  }

  const renderSale = ({ item, index }: { item: ProductSale; index: number }) => (
    <View style={s.card}>
      {/* Gold left stripe */}
      <View style={s.cardStripe} />

      <View style={s.cardInner}>
        {/* Top row */}
        <View style={s.cardTop}>
          <View style={s.cardIconBox}>
            <MaterialCommunityIcons name="package-variant" size={20} color={D.purple} />
          </View>

          <View style={s.cardNameWrap}>
            <Text style={s.cardProduct} numberOfLines={1}>{item.productName}</Text>
            <View style={s.qtyChip}>
              <MaterialCommunityIcons name="cube-outline" size={12} color={D.textMuted} />
              <Text style={s.qtyChipText}>{item.quantity} × ₹{item.unitPrice}</Text>
            </View>
          </View>

          <View style={s.cardAmountCol}>
            <Text style={s.cardAmount}>₹{item.totalPrice.toFixed(0)}</Text>
            <Text style={s.cardAmountLabel}>total</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Meta row */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <MaterialCommunityIcons name="account-outline" size={13} color={D.textMuted} />
            <Text style={s.metaText}>{item.staffName}</Text>
          </View>
          <View style={s.metaDot} />
          <View style={s.metaItem}>
            <MaterialCommunityIcons name="account-heart-outline" size={13} color={D.textMuted} />
            <Text style={s.metaText}>{item.customerName || 'Walk-in'}</Text>
          </View>
          <View style={s.metaDot} />
          <View style={s.metaItem}>
            <MaterialCommunityIcons name="calendar-outline" size={13} color={D.textMuted} />
            <Text style={s.metaText}>{formatDate(item.date)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={D.text} />
        </TouchableOpacity>
        <View style={s.headerIconBox}>
          <MaterialCommunityIcons name="cart-outline" size={22} color={D.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Product Sales</Text>
          <Text style={s.headerSub}>{allSales.length} sales recorded</Text>
        </View>
      </View>

      {/* ── Stats Band ── */}
      <View style={s.statsBand}>
        <View style={[s.statCard, { borderColor: D.greenBorder }]}>
          <View style={[s.statIcon, { backgroundColor: D.greenMuted }]}>
            <MaterialCommunityIcons name="currency-inr" size={18} color={D.green} />
          </View>
          <Text style={s.statValue}>₹{(totalRevenue / 1000).toFixed(1)}k</Text>
          <Text style={s.statLabel}>Revenue</Text>
        </View>
        <View style={[s.statCard, { borderColor: D.blueBorder }]}>
          <View style={[s.statIcon, { backgroundColor: D.blueMuted }]}>
            <MaterialCommunityIcons name="cube-outline" size={18} color={D.blue} />
          </View>
          <Text style={s.statValue}>{totalUnits}</Text>
          <Text style={s.statLabel}>Units Sold</Text>
        </View>
        <View style={[s.statCard, { borderColor: D.purpleBorder, flex: 1.5 }]}>
          <View style={[s.statIcon, { backgroundColor: D.purpleMuted }]}>
            <MaterialCommunityIcons name="star-outline" size={18} color={D.purple} />
          </View>
          <Text style={s.statValue} numberOfLines={1}>{topProduct?.name ?? '—'}</Text>
          <Text style={s.statLabel}>Top Product</Text>
        </View>
      </View>

      {/* ── Staff Filter ── */}
      <View style={s.filterWrap}>
        <SectionLabel>FILTER BY STAFF</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {/* All Staff chip */}
          <TouchableOpacity
            style={[s.filterChip, selectedStaffId === null && s.filterChipActive]}
            onPress={() => setSelectedStaffId(null)}
            activeOpacity={0.75}
          >
            <View style={[s.filterChipIcon, selectedStaffId === null && s.filterChipIconActive]}>
              <MaterialCommunityIcons
                name={selectedStaffId === null ? 'check' : 'account-multiple-outline'}
                size={14}
                color={selectedStaffId === null ? '#FFF' : D.textMuted}
              />
            </View>
            <Text style={[s.filterChipText, selectedStaffId === null && s.filterChipTextActive]}>All Staff</Text>
          </TouchableOpacity>

          {staffMembers.map(staff => (
            <TouchableOpacity
              key={staff.id}
              style={[s.filterChip, selectedStaffId === staff.id && s.filterChipActive]}
              onPress={() => setSelectedStaffId(staff.id)}
              activeOpacity={0.75}
            >
              <Avatar name={staff.name} size={26} />
              <Text style={[s.filterChipText, selectedStaffId === staff.id && s.filterChipTextActive]}>
                {staff.name.split(' ')[0]}
              </Text>
              {selectedStaffId === staff.id && (
                <MaterialCommunityIcons name="check" size={13} color={D.gold} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={D.gold} />
          <Text style={[s.emptyHint, { marginTop: 12 }]}>Loading sales…</Text>
        </View>
      ) : allSales.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconBox}>
            <MaterialCommunityIcons name="cart-off" size={36} color={D.textMuted} />
          </View>
          <Text style={s.emptyTitle}>No sales found</Text>
          <Text style={s.emptyHint}>
            {selectedStaffId ? 'Try selecting a different staff member' : 'Sales will appear here once recorded'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={allSales}
          keyExtractor={item => item.id}
          renderItem={renderSale}
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ marginBottom: 4 }}>
              <SectionLabel>{`${allSales.length} SALES${selectedStaffId ? ' — FILTERED' : ''}`}</SectionLabel>
            </View>
          }
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    gap: 10,
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

  // Stats band
  statsBand: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: D.surfaceWarm,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  statCard: {
    flex: 1,
    backgroundColor: D.surface,
    borderRadius: D.radius.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 34, height: 34, borderRadius: D.radius.sm,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  statValue: { fontSize: 15, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  statLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },

  // Filter
  filterWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  filterScroll: { gap: 8, paddingBottom: 14 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: D.bg,
    borderRadius: D.radius.lg,
    borderWidth: 1.5,
    borderColor: D.border,
  },
  filterChipActive: {
    backgroundColor: D.goldMuted,
    borderColor: D.gold,
  },
  filterChipIcon: {
    width: 26, height: 26, borderRadius: D.radius.sm,
    backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
  },
  filterChipIconActive: {
    backgroundColor: D.gold, borderColor: D.gold,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: D.textSub },
  filterChipTextActive: { color: D.text },

  // Sale Card
  card: {
    flexDirection: 'row',
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: D.border,
    overflow: 'hidden',
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 2,
  },
  cardStripe: { width: 4, backgroundColor: D.gold },
  cardInner: { flex: 1, padding: 14 },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconBox: {
    width: 42, height: 42, borderRadius: D.radius.md,
    backgroundColor: D.purpleMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.purpleBorder,
  },
  cardNameWrap: { flex: 1 },
  cardProduct: { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 5 },
  qtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: D.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    borderColor: D.border,
    gap: 4,
  },
  qtyChipText: { fontSize: 11, color: D.textSub, fontWeight: '600' },

  cardAmountCol: { alignItems: 'flex-end' },
  cardAmount: { fontSize: 18, fontWeight: '800', color: D.green, letterSpacing: -0.5 },
  cardAmountLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3, marginTop: 1 },

  divider: { height: 1, backgroundColor: D.border, marginVertical: 10 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: D.textSub, fontWeight: '500' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: D.border },

  // Empty
  emptyIconBox: {
    width: 80, height: 80, borderRadius: D.radius.xl,
    backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border, marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: D.text, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: D.textMuted, textAlign: 'center', lineHeight: 20 },
});