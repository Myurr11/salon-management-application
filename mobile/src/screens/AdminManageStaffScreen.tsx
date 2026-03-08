import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { StaffMember } from '../types';
import * as supabaseService from '../services/supabaseService';

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

interface Props { navigation: any; }

type SortKey = 'name' | 'goal';

export const AdminManageStaffScreen: React.FC<Props> = ({ navigation }) => {
  const { staffMembers, refreshStaffMembers } = useAuth();
  const { refreshData } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...staffMembers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.username?.toLowerCase().includes(q) ||
        s.branchName?.toLowerCase().includes(q),
      );
    }
    if (sortKey === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortKey === 'goal') list.sort((a, b) => (b.monthlyGoal ?? 0) - (a.monthlyGoal ?? 0));
    return list;
  }, [staffMembers, searchQuery, sortKey]);

  const withGoal    = staffMembers.filter(s => s.monthlyGoal && s.monthlyGoal > 0).length;
  const withBranch  = staffMembers.filter(s => s.branchName).length;

  const handleDelete = (staff: StaffMember) => {
    Alert.alert(
      'Remove Staff Member',
      `Are you sure you want to remove "${staff.name}"? This will archive their account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseService.deleteStaffMember(staff.id);
              await refreshStaffMembers();
              await refreshData();
              Alert.alert('Removed', `${staff.name} has been removed.`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove staff member');
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: StaffMember }) => {
    const isExpanded = expandedId === item.id;
    const color = avatarColor(item.name);

    return (
      <View style={s.card}>
        {/* Left stripe */}
        <View style={[s.cardStripe, { backgroundColor: color }]} />

        <View style={s.cardInner}>
          {/* Main row — always visible */}
          <TouchableOpacity
            style={s.cardMain}
            onPress={() => setExpandedId(isExpanded ? null : item.id)}
            activeOpacity={0.8}
          >
            {/* Avatar */}
            <View style={[s.cardAvatar, { backgroundColor: color }]}>
              <Text style={s.cardAvatarText}>{initials(item.name)}</Text>
            </View>

            {/* Info */}
            <View style={s.cardInfo}>
              <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
              <View style={s.cardMetaRow}>
                {item.username && (
                  <View style={s.cardMetaItem}>
                    <MaterialCommunityIcons name="at" size={11} color={D.textMuted} />
                    <Text style={s.cardMetaText}>{item.username}</Text>
                  </View>
                )}
                {item.branchName && (
                  <View style={s.cardMetaItem}>
                    <MaterialCommunityIcons name="office-building-outline" size={11} color={D.textMuted} />
                    <Text style={s.cardMetaText}>{item.branchName}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Right side */}
            <View style={s.cardRight}>
              {item.monthlyGoal ? (
                <View style={s.goalPill}>
                  <MaterialCommunityIcons name="target" size={11} color={D.gold} />
                  <Text style={s.goalPillText}>
                    ₹{item.monthlyGoal >= 1000
                      ? `${(item.monthlyGoal / 1000).toFixed(0)}k`
                      : item.monthlyGoal}
                  </Text>
                </View>
              ) : null}
              <MaterialCommunityIcons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={D.textMuted}
              />
            </View>
          </TouchableOpacity>

          {/* Expanded detail panel */}
          {isExpanded && (
            <View style={s.expandedPanel}>
              <View style={s.expandedDivider} />

              {/* Detail chips */}
              <View style={s.detailChips}>
                {item.username && (
                  <View style={s.detailChip}>
                    <View style={[s.detailChipIcon, { backgroundColor: D.blueMuted, borderColor: D.blueBorder }]}>
                      <MaterialCommunityIcons name="account-outline" size={13} color={D.blue} />
                    </View>
                    <View>
                      <Text style={s.detailChipLabel}>USERNAME</Text>
                      <Text style={s.detailChipValue}>@{item.username}</Text>
                    </View>
                  </View>
                )}
                {item.branchName && (
                  <View style={s.detailChip}>
                    <View style={[s.detailChipIcon, { backgroundColor: D.purpleMuted, borderColor: D.purpleBorder }]}>
                      <MaterialCommunityIcons name="office-building-outline" size={13} color={D.purple} />
                    </View>
                    <View>
                      <Text style={s.detailChipLabel}>BRANCH</Text>
                      <Text style={s.detailChipValue}>{item.branchName}</Text>
                    </View>
                  </View>
                )}
                {item.monthlyGoal ? (
                  <View style={s.detailChip}>
                    <View style={[s.detailChipIcon, { backgroundColor: D.goldMuted, borderColor: D.goldBorder }]}>
                      <MaterialCommunityIcons name="target" size={13} color={D.gold} />
                    </View>
                    <View>
                      <Text style={s.detailChipLabel}>MONTHLY GOAL</Text>
                      <Text style={[s.detailChipValue, { color: D.gold }]}>₹{item.monthlyGoal.toLocaleString()}</Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* Action buttons */}
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={s.actionBtnSecondary}
                  onPress={() => Alert.alert('Edit Staff', `To edit "${item.name}", use Admin Dashboard → Assign Branch.`)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={15} color={D.blue} />
                  <Text style={[s.actionBtnText, { color: D.blue }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.actionBtnSecondary}
                  onPress={() => navigation.navigate('AdminAddStaff', { staffId: item.id })}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="target" size={15} color={D.green} />
                  <Text style={[s.actionBtnText, { color: D.green }]}>Set Goal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.actionBtnSecondary, { backgroundColor: D.redMuted, borderColor: D.redBorder }]}
                  onPress={() => handleDelete(item)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="delete-outline" size={15} color={D.red} />
                  <Text style={[s.actionBtnText, { color: D.red }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

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
            <MaterialCommunityIcons name="account-group-outline" size={22} color={D.green} />
          </View>
          <View>
            <Text style={s.headerTitle}>Manage Staff</Text>
            <Text style={s.headerSub}>{staffMembers.length} team members</Text>
          </View>
        </View>
        <TouchableOpacity
          style={s.headerAddBtn}
          onPress={() => navigation.navigate('AdminAddStaff')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
          <Text style={s.headerAddBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Summary band ── */}
      <View style={s.summaryBand}>
        {[
          { icon: 'account-multiple-outline', label: 'Total Staff',     value: staffMembers.length, color: D.blue,   bg: D.blueMuted,   border: D.blueBorder   },
          { icon: 'office-building-outline',  label: 'With Branch',     value: withBranch,          color: D.purple, bg: D.purpleMuted, border: D.purpleBorder },
          { icon: 'target',                   label: 'Have Goal',       value: withGoal,            color: D.gold,   bg: D.goldMuted,   border: D.goldBorder   },
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

      {/* ── Search + Sort ── */}
      <View style={s.toolbarWrap}>
        <View style={s.searchBar}>
          <View style={s.searchBarIcon}>
            <MaterialCommunityIcons name="magnify" size={18} color={D.textMuted} />
          </View>
          <TextInput
            style={s.searchBarInput}
            placeholder="Search by name, username or branch…"
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

        <View style={s.sortRow}>
          <Text style={s.sortLabel}>{filtered.length} members</Text>
          <View style={s.sortBtns}>
            {([
              { key: 'name' as SortKey, label: 'A–Z',  icon: 'sort-alphabetical-ascending' },
              { key: 'goal' as SortKey, label: 'Goal',  icon: 'target'                     },
            ]).map(opt => (
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
      </View>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <View style={s.emptyBlock}>
          <View style={s.emptyIconBox}>
            <MaterialCommunityIcons name="account-off-outline" size={36} color={D.textMuted} />
          </View>
          <Text style={s.emptyTitle}>
            {searchQuery ? `No results for "${searchQuery}"` : 'No staff members yet'}
          </Text>
          <Text style={s.emptyHint}>
            {searchQuery ? 'Try a different search term' : 'Tap "Add" above to add your first staff member'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={s.emptyAddBtn}
              onPress={() => navigation.navigate('AdminAddStaff')}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#FFF" />
              <Text style={s.emptyAddBtnText}>Add Staff Member</Text>
            </TouchableOpacity>
          )}
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
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.surface, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: D.border, overflow: 'hidden', position: 'relative',
  },
  headerGlow: {
    position: 'absolute', top: -50, right: -50,
    width: 160, height: 160, borderRadius: 80, backgroundColor: D.greenMuted,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: D.radius.md,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBox: {
    width: 44, height: 44, borderRadius: D.radius.md,
    backgroundColor: D.greenMuted, borderWidth: 1, borderColor: D.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: D.text, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },
  headerAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: D.green, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: D.radius.pill,
    shadowColor: D.green, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  headerAddBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },

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

  // Toolbar
  toolbarWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.border, overflow: 'hidden', marginBottom: 10,
  },
  searchBarIcon: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: D.border },
  searchBarInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: D.text },
  searchBarClear: { paddingHorizontal: 10 },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sortLabel: { fontSize: 12, color: D.textMuted, fontWeight: '500' },
  sortBtns: { flexDirection: 'row', gap: 6 },
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
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },

  // Card
  card: {
    flexDirection: 'row', backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border, marginBottom: 10, overflow: 'hidden',
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  cardStripe: { width: 4 },
  cardInner: { flex: 1 },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  cardAvatar: { width: 50, height: 50, borderRadius: D.radius.md, alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '800', color: D.text, letterSpacing: -0.2, marginBottom: 5 },
  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 11, color: D.textMuted, fontWeight: '500' },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  goalPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.goldMuted, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: D.radius.pill, borderWidth: 1, borderColor: D.goldBorder,
  },
  goalPillText: { fontSize: 11, fontWeight: '700', color: D.gold },

  // Expanded panel
  expandedPanel: { paddingHorizontal: 14, paddingBottom: 14 },
  expandedDivider: { height: 1, backgroundColor: D.border, marginBottom: 14 },
  detailChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  detailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: D.bg, borderRadius: D.radius.lg,
    borderWidth: 1, borderColor: D.border, paddingHorizontal: 12, paddingVertical: 10,
  },
  detailChipIcon: { width: 30, height: 30, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  detailChipLabel: { fontSize: 9, fontWeight: '700', color: D.textMuted, letterSpacing: 1, marginBottom: 2 },
  detailChipValue: { fontSize: 13, fontWeight: '700', color: D.text },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: D.radius.md,
    backgroundColor: D.blueMuted, borderWidth: 1, borderColor: D.blueBorder,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  // Empty
  emptyBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: D.radius.xl,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: D.text, marginBottom: 6, textAlign: 'center' },
  emptyHint: { fontSize: 13, color: D.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 19 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.green, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: D.radius.pill,
    shadowColor: D.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  emptyAddBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});