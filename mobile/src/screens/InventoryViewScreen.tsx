import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import type { InventoryItem } from '../types';
import { colors, theme, shadows } from '../theme';

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

  amber: '#D4872A',
  amberMuted: '#D4872A15',
  amberBorder: '#D4872A33',

  red: '#D94F4F',
  redMuted: '#D94F4F15',
  redBorder: '#D94F4F33',

  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

// ─── Stock config ─────────────────────────────────────────────────────────────
const getStockCfg = (item: InventoryItem) => {
  if (item.quantity === 0)
    return { label: 'Out of Stock', color: D.red,   bg: D.redMuted,   border: D.redBorder,   icon: 'package-variant-closed', barColor: D.red   };
  if (item.quantity <= item.minThreshold)
    return { label: 'Low Stock',    color: D.amber, bg: D.amberMuted, border: D.amberBorder, icon: 'alert-circle-outline',   barColor: D.amber };
  return   { label: 'In Stock',     color: D.green, bg: D.greenMuted, border: D.greenBorder, icon: 'package-variant',        barColor: D.green };
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'in_stock' | 'low' | 'out';
const TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: 'all',      label: 'All',       icon: 'view-grid-outline'         },
  { key: 'in_stock', label: 'In Stock',  icon: 'package-variant'           },
  { key: 'low',      label: 'Low Stock', icon: 'alert-circle-outline'      },
  { key: 'out',      label: 'Out',       icon: 'package-variant-closed'    },
];

interface Props { navigation: any; }

export const InventoryViewScreen: React.FC<Props> = ({ navigation }) => {
  const { inventory } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const summary = useMemo(() => {
    const inStock = inventory.filter(i => i.quantity > i.minThreshold).length;
    const low     = inventory.filter(i => i.quantity > 0 && i.quantity <= i.minThreshold).length;
    const out     = inventory.filter(i => i.quantity === 0).length;
    return { inStock, low, out };
  }, [inventory]);

  const filtered = useMemo(() => {
    let list = [...inventory];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q));
    }
    if (activeTab === 'in_stock') list = list.filter(i => i.quantity > i.minThreshold);
    if (activeTab === 'low')      list = list.filter(i => i.quantity > 0 && i.quantity <= i.minThreshold);
    if (activeTab === 'out')      list = list.filter(i => i.quantity === 0);
    return list;
  }, [inventory, searchQuery, activeTab]);

  const tabCount = (key: FilterTab) => {
    if (key === 'all')      return inventory.length;
    if (key === 'in_stock') return summary.inStock;
    if (key === 'low')      return summary.low;
    if (key === 'out')      return summary.out;
    return 0;
  };

  const tabColor = (key: FilterTab) => {
    if (key === 'in_stock') return { color: D.green,  bg: D.greenMuted,  border: D.greenBorder  };
    if (key === 'low')      return { color: D.amber,  bg: D.amberMuted,  border: D.amberBorder  };
    if (key === 'out')      return { color: D.red,    bg: D.redMuted,    border: D.redBorder    };
    return                         { color: D.blue,   bg: D.blueMuted,   border: D.blueBorder   };
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const cfg = getStockCfg(item);
    const maxQty = Math.max(item.minThreshold * 3, item.quantity, 1);
    const pct = Math.min((item.quantity / maxQty) * 100, 100);

    return (
      <View style={s.card}>
        {/* Left accent stripe */}
        <View style={[s.cardStripe, { backgroundColor: cfg.barColor }]} />

        <View style={s.cardInner}>
          {/* Top row */}
          <View style={s.cardTop}>
            <View style={[s.cardIconBox, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <MaterialCommunityIcons name={cfg.icon as any} size={22} color={cfg.color} />
            </View>
            <View style={s.cardMainInfo}>
              <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
            </View>
            <View style={[s.statusPill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <View style={[s.statusDot, { backgroundColor: cfg.color }]} />
              <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          {/* Stock bar */}
          <View style={s.barSection}>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: cfg.barColor }]} />
            </View>
            <View style={s.barLabels}>
              <View style={s.barQtyRow}>
                <Text style={[s.barQtyBig, { color: cfg.color }]}>{item.quantity}</Text>
                <Text style={s.barQtyOf}> units in stock</Text>
              </View>
              <Text style={s.barPct}>{Math.round(pct)}%</Text>
            </View>
          </View>

          {/* Bottom chips */}
          <View style={s.cardChips}>
            <View style={s.chip}>
              <MaterialCommunityIcons name="arrow-down-circle-outline" size={12} color={D.textMuted} />
              <Text style={s.chipText}>Min threshold: <Text style={{ color: D.text, fontWeight: '700' }}>{item.minThreshold}</Text></Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerGlow} />
        <View style={s.headerLeft}>
          <View style={s.headerIconBox}>
            <MaterialCommunityIcons name="package-variant" size={22} color={D.green} />
          </View>
          <View>
            <Text style={s.headerTitle}>Inventory</Text>
            <Text style={s.headerSub}>{inventory.length} products tracked</Text>
          </View>
        </View>
      </View>

      {/* ── Summary band ── */}
      <View style={s.summaryBand}>
        {[
          { label: 'In Stock',  value: summary.inStock, color: D.green,  bg: D.greenMuted, border: D.greenBorder, icon: 'package-variant'        },
          { label: 'Low Stock', value: summary.low,     color: D.amber,  bg: D.amberMuted, border: D.amberBorder, icon: 'alert-circle-outline'   },
          { label: 'Out',       value: summary.out,     color: D.red,    bg: D.redMuted,   border: D.redBorder,   icon: 'package-variant-closed' },
        ].map(stat => (
          <View key={stat.label} style={[s.summaryCard, { borderColor: stat.border }]}>
            <View style={[s.summaryIcon, { backgroundColor: stat.bg }]}>
              <MaterialCommunityIcons name={stat.icon as any} size={16} color={stat.color} />
            </View>
            <Text style={[s.summaryValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={s.summaryLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Search bar ── */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <View style={s.searchBarIcon}>
            <MaterialCommunityIcons name="magnify" size={18} color={D.textMuted} />
          </View>
          <TextInput
            style={s.searchBarInput}
            placeholder="Search products…"
            placeholderTextColor={D.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={s.searchBarClear} onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color={D.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter tabs ── */}
      <View style={s.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            const tc = tabColor(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, active && { backgroundColor: tc.bg, borderColor: tc.color }]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={tab.icon as any} size={14}
                  color={active ? tc.color : D.textMuted}
                />
                <Text style={[s.tabText, active && { color: tc.color }]} numberOfLines={1}>{tab.label}</Text>
                <View style={[s.tabBadge, active && { backgroundColor: tc.color }]}>
                  <Text style={[s.tabBadgeText, active && { color: '#FFF' }]} numberOfLines={1}>{tabCount(tab.key)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <View style={s.emptyBlock}>
          <View style={s.emptyIconBox}>
            <MaterialCommunityIcons name="package-variant-closed" size={36} color={D.textMuted} />
          </View>
          <Text style={s.emptyTitle}>
            {searchQuery ? `No results for "${searchQuery}"` : 'No items in this category'}
          </Text>
          <Text style={s.emptyHint}>Try a different filter or search term</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: D.surface, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: D.border, overflow: 'hidden', position: 'relative',
  },
  headerGlow: {
    position: 'absolute', top: -50, right: -50,
    width: 160, height: 160, borderRadius: 80, backgroundColor: D.greenMuted,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBox: {
    width: 44, height: 44, borderRadius: D.radius.md,
    backgroundColor: D.greenMuted, borderWidth: 1, borderColor: D.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: D.text, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },

  // Summary
  summaryBand: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
  },
  summaryCard: {
    flex: 1, alignItems: 'center', backgroundColor: D.bg,
    borderRadius: D.radius.lg, borderWidth: 1, padding: 12,
  },
  summaryIcon: { width: 34, height: 34, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  summaryValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  summaryLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },

  // Search
  searchWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.border, overflow: 'hidden',
  },
  searchBarIcon: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: D.border },
  searchBarInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: D.text },
  searchBarClear: { paddingHorizontal: 10 },

  // Tabs
  tabsContainer: {
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10,
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
  },
  tabsRow: { gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: D.surface, borderRadius: D.radius.pill,
    borderWidth: 1, borderColor: D.border,
    height: 38,
  },
  tabText: { fontSize: 12, fontWeight: '700', color: D.text },
  tabBadge: {
    minWidth: 22, height: 22,
    backgroundColor: D.bg, borderRadius: D.radius.pill,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
    paddingHorizontal: 6,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: D.text },

  // List
  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },

  // Card
  card: {
    flexDirection: 'row', backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border, marginBottom: 10, overflow: 'hidden',
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  cardStripe: { width: 4 },
  cardInner: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardIconBox: {
    width: 42, height: 42, borderRadius: D.radius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  cardMainInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 3 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: D.radius.pill, borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  // Bar
  barSection: { marginBottom: 12 },
  barBg: { height: 7, backgroundColor: D.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', borderRadius: 4 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  barQtyRow: { flexDirection: 'row', alignItems: 'baseline' },
  barQtyBig: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  barQtyOf: { fontSize: 12, color: D.textMuted, fontWeight: '500' },
  barPct: { fontSize: 12, fontWeight: '700', color: D.textMuted },

  // Chips
  cardChips: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: D.border,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: D.bg, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: D.radius.pill, borderWidth: 1, borderColor: D.border,
  },
  chipText: { fontSize: 11, color: D.textMuted, fontWeight: '500' },

  // Empty
  emptyBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIconBox: { width: 80, height: 80, borderRadius: D.radius.xl, backgroundColor: D.surface, borderWidth: 1, borderColor: D.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: D.text, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: D.textMuted },
});