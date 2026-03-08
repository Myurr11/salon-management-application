import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import type { Customer } from '../types';
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

  purple: '#7C5CBF',
  purpleMuted: '#7C5CBF15',
  purpleBorder: '#7C5CBF33',

  amber: '#D4872A',
  amberMuted: '#D4872A15',
  amberBorder: '#D4872A33',

  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#1e3a5f', '#0d9488', '#059669', '#2563eb', '#7c3aed'];
const getAvatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const formatDate = (d?: string | null) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Tier config ──────────────────────────────────────────────────────────────
const getTier = (spend: number) => {
  if (spend >= 10000) return { label: 'VIP',    color: D.gold,   bg: D.goldMuted,   border: D.goldBorder,   icon: 'crown'             };
  if (spend >= 3000)  return { label: 'Regular', color: D.green,  bg: D.greenMuted,  border: D.greenBorder,  icon: 'star-circle'       };
  if (spend > 0)      return { label: 'New',     color: D.blue,   bg: D.blueMuted,   border: D.blueBorder,   icon: 'account-check'     };
  return                     { label: 'No visits', color: D.textMuted, bg: D.bg, border: D.border,   icon: 'account-outline'   };
};

type SortKey = 'name' | 'spend' | 'recent';

interface Props { navigation: any; }

export const CustomerListScreen: React.FC<Props> = ({ navigation }) => {
  const { customers, visits } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  // Per-customer stats
  const customerStats = useMemo(() => {
    const map: Record<string, { totalSpend: number; visitCount: number; lastVisitDate: string | null }> = {};
    customers.forEach(c => { map[c.id] = { totalSpend: 0, visitCount: 0, lastVisitDate: null }; });
    visits.forEach(v => {
      if (map[v.customerId]) {
        map[v.customerId].totalSpend += v.total;
        map[v.customerId].visitCount += 1;
        if (!map[v.customerId].lastVisitDate || v.date > map[v.customerId].lastVisitDate!) {
          map[v.customerId].lastVisitDate = v.date;
        }
      }
    });
    return map;
  }, [customers, visits]);

  // Summary
  const summary = useMemo(() => {
    const vip     = customers.filter(c => (customerStats[c.id]?.totalSpend ?? 0) >= 10000).length;
    const active  = customers.filter(c => (customerStats[c.id]?.visitCount  ?? 0) > 0).length;
    return { total: customers.length, vip, active };
  }, [customers, customerStats]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...customers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q),
      );
    }
    if (sortKey === 'name')   list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortKey === 'spend')  list.sort((a, b) => (customerStats[b.id]?.totalSpend ?? 0) - (customerStats[a.id]?.totalSpend ?? 0));
    if (sortKey === 'recent') list.sort((a, b) => {
      const da = customerStats[a.id]?.lastVisitDate ?? '';
      const db = customerStats[b.id]?.lastVisitDate ?? '';
      return db.localeCompare(da);
    });
    return list;
  }, [customers, searchQuery, sortKey, customerStats]);

  const renderItem = ({ item, index }: { item: Customer; index: number }) => {
    const stats = customerStats[item.id] ?? { totalSpend: 0, visitCount: 0, lastVisitDate: null };
    const tier  = getTier(stats.totalSpend);
    const lastDate = formatDate(stats.lastVisitDate);

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        <View style={[s.cardAvatar, { backgroundColor: getAvatarColor(item.name) }]}>
          <Text style={s.cardAvatarText}>{getInitials(item.name)}</Text>
          {/* Tier badge overlaid */}
          {stats.totalSpend >= 3000 && (
            <View style={[s.avatarTierBadge, { backgroundColor: tier.bg, borderColor: tier.border }]}>
              <MaterialCommunityIcons name={tier.icon as any} size={9} color={tier.color} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={s.cardInfo}>
          <View style={s.cardNameRow}>
            <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
            {stats.totalSpend >= 3000 && (
              <View style={[s.tierPill, { backgroundColor: tier.bg, borderColor: tier.border }]}>
                <Text style={[s.tierPillText, { color: tier.color }]}>{tier.label}</Text>
              </View>
            )}
          </View>

          <View style={s.cardMeta}>
            {item.phone ? (
              <View style={s.metaItem}>
                <MaterialCommunityIcons name="phone-outline" size={11} color={D.textMuted} />
                <Text style={s.metaText}>{item.phone}</Text>
              </View>
            ) : (
              <View style={s.metaItem}>
                <MaterialCommunityIcons name="calendar-check-outline" size={11} color={D.textMuted} />
                <Text style={s.metaText}>{stats.visitCount} visit{stats.visitCount !== 1 ? 's' : ''}</Text>
              </View>
            )}
            {lastDate && (
              <View style={s.metaItem}>
                <MaterialCommunityIcons name="clock-outline" size={11} color={D.textMuted} />
                <Text style={s.metaText}>{lastDate}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Visit count + chevron */}
        <View style={s.cardRight}>
          <Text style={s.cardSpend}>{stats.visitCount}</Text>
          <Text style={s.cardSpendLabel}>visit{stats.visitCount !== 1 ? 's' : ''}</Text>
        </View>

        <View style={s.cardChevron}>
          <MaterialCommunityIcons name="chevron-right" size={18} color={D.border} />
        </View>
      </TouchableOpacity>
    );
  };

  const SORT_OPTS: { key: SortKey; label: string; icon: string }[] = [
    { key: 'name',   label: 'A–Z',     icon: 'sort-alphabetical-ascending' },
    { key: 'spend',  label: 'Top Spend', icon: 'currency-inr'              },
    { key: 'recent', label: 'Recent',  icon: 'clock-outline'               },
  ];

  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerGlow} />
        <View style={s.headerLeft}>
          <View style={s.headerIconBox}>
            <MaterialCommunityIcons name="account-group-outline" size={22} color={D.green} />
          </View>
          <View>
            <Text style={s.headerTitle}>Clients</Text>
            <Text style={s.headerSub}>{summary.total} total · {summary.active} active</Text>
          </View>
        </View>
      </View>

      {/* ── Summary band ── */}
      <View style={s.summaryBand}>
        {[
          { icon: 'account-group-outline', label: 'Total',    value: summary.total,  color: D.blue,  bg: D.blueMuted,  border: D.blueBorder  },
          { icon: 'account-check-outline', label: 'Active',   value: summary.active, color: D.green, bg: D.greenMuted, border: D.greenBorder },
          { icon: 'crown-outline',         label: 'VIP',      value: summary.vip,    color: D.gold,  bg: D.goldMuted,  border: D.goldBorder  },
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

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <View style={s.searchBarIcon}>
            <MaterialCommunityIcons name="magnify" size={18} color={D.textMuted} />
          </View>
          <TextInput
            style={s.searchBarInput}
            placeholder="Search by name, phone or email…"
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

      {/* ── Sort + count row ── */}
      <View style={s.toolbarRow}>
        <Text style={s.toolbarCount}>
          {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
          {searchQuery ? ` for "${searchQuery}"` : ''}
        </Text>
        <View style={s.sortRow}>
          {SORT_OPTS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[s.sortBtn, sortKey === opt.key && s.sortBtnActive]}
              onPress={() => setSortKey(opt.key)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={opt.icon as any} size={13}
                color={sortKey === opt.key ? D.green : D.textMuted}
              />
              <Text style={[s.sortBtnText, sortKey === opt.key && s.sortBtnTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <View style={s.emptyBlock}>
          <View style={s.emptyIconBox}>
            <MaterialCommunityIcons name="account-off-outline" size={36} color={D.textMuted} />
          </View>
          <Text style={s.emptyTitle}>
            {searchQuery ? `No results for "${searchQuery}"` : 'No clients yet'}
          </Text>
          <Text style={s.emptyHint}>
            {searchQuery ? 'Try a different search term' : 'Add your first client via a new visit'}
          </Text>
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
  summaryLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3 },

  // Search
  searchWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.border, overflow: 'hidden',
  },
  searchBarIcon: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: D.border },
  searchBarInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: D.text },
  searchBarClear: { paddingHorizontal: 10 },

  // Toolbar
  toolbarRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 10,
  },
  toolbarCount: { fontSize: 12, color: D.textMuted, fontWeight: '500' },
  sortRow: { flexDirection: 'row', gap: 6 },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: D.surface, borderRadius: D.radius.pill,
    borderWidth: 1, borderColor: D.border,
  },
  sortBtnActive: { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  sortBtnText: { fontSize: 11, fontWeight: '600', color: D.textMuted },
  sortBtnTextActive: { color: D.green },

  // List
  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border, padding: 14, marginBottom: 10,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  cardAvatar: {
    width: 48, height: 48, borderRadius: D.radius.md,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, position: 'relative',
  },
  cardAvatarText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  avatarTierBadge: {
    position: 'absolute', bottom: -3, right: -3,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: D.surface,
  },

  // Card info
  cardInfo: { flex: 1, marginRight: 8 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  cardName: { fontSize: 15, fontWeight: '700', color: D.text, flexShrink: 1 },
  tierPill: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: D.radius.pill, borderWidth: 1,
  },
  tierPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: D.textMuted, fontWeight: '500' },

  // Card right
  cardRight: { alignItems: 'flex-end', marginRight: 4 },
  cardSpend: { fontSize: 16, fontWeight: '800', color: D.green, letterSpacing: -0.3 },
  cardSpendLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', marginTop: 2 },
  cardChevron: { width: 20, alignItems: 'center' },

  // Empty
  emptyBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: D.radius.xl,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: D.text, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: D.textMuted, textAlign: 'center' },
});