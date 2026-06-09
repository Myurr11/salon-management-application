import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import type { StaffMember } from "../types";
import * as supabaseService from "../services/supabaseService";

// ─── Design Tokens — shared system ───────────────────────────────────────────
const D = {
  bg: "#F7F9FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F2F4F6",

  green: "#166534",
  greenMuted: "rgba(22,101,52,0.10)",
  greenBorder: "rgba(22,101,52,0.25)",

  border: "#E8EAEC",

  text: "#191C1E",
  textSub: "#707A6F",
  textMuted: "#9AA09E",

  red: "#BA1A1A",
  redMuted: "rgba(186,26,26,0.08)",
  redBorder: "rgba(186,26,26,0.20)",

  amber: "#B8742A",
  amberMuted: "rgba(184,116,42,0.10)",
  amberBorder: "rgba(184,116,42,0.25)",

  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 },
};

// ─── Avatar helpers ───────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#1E3A5F",
  "#0D9488",
  "#059669",
  "#2563EB",
  "#7C3AED",
  "#D97706",
];
const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// ─── SectionLabel ─────────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: string }) => (
  <View style={sl.row}>
    <View style={sl.line} />
    <Text style={sl.text}>{children}</Text>
    <View style={sl.line} />
  </View>
);
const sl = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  line: { flex: 1, height: 1, backgroundColor: D.border },
  text: {
    fontSize: 10,
    fontWeight: "700",
    color: D.textSub,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});

interface Props {
  navigation: any;
}
type SortKey = "name" | "goal";

export const AdminManageStaffScreen: React.FC<Props> = ({ navigation }) => {
  const { staffMembers, refreshStaffMembers } = useAuth();
  const { refreshData } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...staffMembers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.username?.toLowerCase().includes(q) ||
          s.branchName?.toLowerCase().includes(q),
      );
    }
    if (sortKey === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortKey === "goal")
      list.sort((a, b) => (b.monthlyGoal ?? 0) - (a.monthlyGoal ?? 0));
    return list;
  }, [staffMembers, searchQuery, sortKey]);

  const withGoal = staffMembers.filter(
    (s) => s.monthlyGoal && s.monthlyGoal > 0,
  ).length;
  const withBranch = staffMembers.filter((s) => s.branchName).length;

  const handleDelete = (staff: StaffMember) => {
    Alert.alert(
      "Remove Staff Member",
      `Remove "${staff.name}"? This will archive their account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await supabaseService.deleteStaffMember(staff.id);
              await refreshStaffMembers();
              await refreshData();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "Failed to remove staff member",
              );
            }
          },
        },
      ],
    );
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: StaffMember;
    index: number;
  }) => {
    const isExpanded = expandedId === item.id;
    const color = avatarColor(item.name);
    const isFirst = index === 0;
    const isLast = index === filtered.length - 1;

    return (
      <View
        style={[
          ic.row,
          isFirst && ic.rowFirst,
          isLast && !isExpanded && ic.rowLast,
        ]}
      >
        {/* Collapsed main row */}
        <TouchableOpacity
          style={ic.main}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.8}
        >
          {/* Avatar */}
          <View style={[ic.avatar, { backgroundColor: color }]}>
            <Text style={ic.avatarText}>{initials(item.name)}</Text>
          </View>

          {/* Info */}
          <View style={ic.info}>
            <Text style={ic.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={ic.metaRow}>
              {item.username && <Text style={ic.meta}>@{item.username}</Text>}
              {item.username && item.branchName && (
                <Text style={ic.metaDot}>·</Text>
              )}
              {item.branchName && (
                <Text style={ic.meta}>{item.branchName}</Text>
              )}
            </View>
          </View>

          {/* Right */}
          <View style={ic.right}>
            {item.monthlyGoal ? (
              <View style={ic.goalPill}>
                <Text style={ic.goalPillText}>
                  ₹
                  {item.monthlyGoal >= 1000
                    ? `${(item.monthlyGoal / 1000).toFixed(0)}k`
                    : item.monthlyGoal}
                </Text>
              </View>
            ) : null}
            <MaterialCommunityIcons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={D.textMuted}
            />
          </View>
        </TouchableOpacity>

        {/* Expanded panel */}
        {isExpanded && (
          <View style={[ic.expandedPanel, isLast && ic.expandedPanelLast]}>
            <View style={ic.expandedDivider} />

            {/* Detail rows */}
            <View style={ic.detailBlock}>
              {item.username && (
                <View style={ic.detailRow}>
                  <MaterialCommunityIcons
                    name="at"
                    size={14}
                    color={D.textMuted}
                  />
                  <Text style={ic.detailLabel}>Username</Text>
                  <Text style={ic.detailValue}>@{item.username}</Text>
                </View>
              )}
              {item.branchName && (
                <View style={ic.detailRow}>
                  <MaterialCommunityIcons
                    name="office-building-outline"
                    size={14}
                    color={D.textMuted}
                  />
                  <Text style={ic.detailLabel}>Branch</Text>
                  <Text style={ic.detailValue}>{item.branchName}</Text>
                </View>
              )}
              {item.monthlyGoal ? (
                <View style={ic.detailRow}>
                  <MaterialCommunityIcons
                    name="target"
                    size={14}
                    color={D.textMuted}
                  />
                  <Text style={ic.detailLabel}>Monthly Goal</Text>
                  <Text style={[ic.detailValue, { color: D.green }]}>
                    ₹{item.monthlyGoal.toLocaleString()}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Action row */}
            <View style={ic.actionRow}>
              <TouchableOpacity
                style={ic.actionBtn}
                onPress={() =>
                  Alert.alert(
                    "Edit Staff",
                    `To edit "${item.name}", use Admin Dashboard → Assign Branch.`,
                  )
                }
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={14}
                  color={D.textSub}
                />
                <Text style={ic.actionBtnText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[ic.actionBtn, ic.actionBtnGreen]}
                onPress={() =>
                  navigation.navigate("AdminAddStaff", { staffId: item.id })
                }
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="target"
                  size={14}
                  color={D.green}
                />
                <Text style={[ic.actionBtnText, { color: D.green }]}>
                  Set Goal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[ic.actionBtn, ic.actionBtnRed]}
                onPress={() => handleDelete(item)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={14}
                  color={D.red}
                />
                <Text style={[ic.actionBtnText, { color: D.red }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.root}>
      {/* ── Top Bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={D.text} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Manage Staff</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate("AdminAddStaff")}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={16} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Summary strip ── */}
      <View style={s.summaryStrip}>
        <View style={s.stripStat}>
          <Text style={s.stripVal}>{staffMembers.length}</Text>
          <Text style={s.stripLabel}>Total</Text>
        </View>
        <View style={s.stripDivider} />
        <View style={s.stripStat}>
          <Text style={s.stripVal}>{withBranch}</Text>
          <Text style={s.stripLabel}>With Branch</Text>
        </View>
        <View style={s.stripDivider} />
        <View style={s.stripStat}>
          <Text style={s.stripVal}>{withGoal}</Text>
          <Text style={s.stripLabel}>Have Goal</Text>
        </View>
      </View>

      {/* ── Search + Sort ── */}
      <View style={s.toolbarWrap}>
        <View style={s.searchBar}>
          <MaterialCommunityIcons
            name="magnify"
            size={18}
            color={D.textMuted}
            style={{ marginLeft: 12 }}
          />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name, username or branch…"
            placeholderTextColor={D.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={{ paddingHorizontal: 12 }}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={16}
                color={D.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={s.sortRow}>
          <Text style={s.sortCount}>
            {filtered.length} member{filtered.length !== 1 ? "s" : ""}
          </Text>
          <View style={s.sortBtns}>
            {[
              {
                key: "name" as SortKey,
                label: "A–Z",
                icon: "sort-alphabetical-ascending",
              },
              { key: "goal" as SortKey, label: "Goal", icon: "target" },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[s.sortBtn, sortKey === opt.key && s.sortBtnActive]}
                onPress={() => setSortKey(opt.key)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={opt.icon as any}
                  size={12}
                  color={sortKey === opt.key ? D.green : D.textMuted}
                />
                <Text
                  style={[
                    s.sortBtnText,
                    sortKey === opt.key && s.sortBtnTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <MaterialCommunityIcons
              name="account-off-outline"
              size={28}
              color={D.textMuted}
            />
          </View>
          <Text style={s.emptyTitle}>
            {searchQuery
              ? `No results for "${searchQuery}"`
              : "No staff members yet"}
          </Text>
          <Text style={s.emptyHint}>
            {searchQuery
              ? "Try a different search term"
              : 'Tap "Add" above to add your first member'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={s.emptyAddBtn}
              onPress={() => navigation.navigate("AdminAddStaff")}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
              <Text style={s.emptyAddBtnText}>Add Staff Member</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<SectionLabel>TEAM MEMBERS</SectionLabel>}
        />
      )}
    </View>
  );
};

// ─── Item row styles ───────────────────────────────────────────────────────────
const ic = StyleSheet.create({
  row: {
    backgroundColor: D.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: D.border,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F4",
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: D.radius.xl,
    borderTopRightRadius: D.radius.xl,
  },
  rowLast: {
    borderBottomColor: D.border,
    borderBottomLeftRadius: D.radius.xl,
    borderBottomRightRadius: D.radius.xl,
  },

  // Collapsed main row
  main: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: "700", color: D.text, marginBottom: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { fontSize: 11, color: D.textMuted, fontWeight: "500" },
  metaDot: { fontSize: 11, color: D.textMuted },
  right: { alignItems: "flex-end", gap: 5, flexShrink: 0 },
  goalPill: {
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  goalPillText: { fontSize: 11, fontWeight: "700", color: D.green },

  // Expanded
  expandedPanel: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  expandedPanelLast: {
    borderBottomLeftRadius: D.radius.xl,
    borderBottomRightRadius: D.radius.xl,
  },
  expandedDivider: { height: 1, backgroundColor: D.border, marginBottom: 12 },

  // Detail rows
  detailBlock: { gap: 8, marginBottom: 14 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { fontSize: 12, color: D.textMuted, fontWeight: "500", flex: 1 },
  detailValue: { fontSize: 13, fontWeight: "700", color: D.text },

  // Action row
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: D.radius.md,
    backgroundColor: D.surfaceAlt,
    borderWidth: 1,
    borderColor: D.border,
  },
  actionBtnGreen: { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  actionBtnRed: { backgroundColor: D.redMuted, borderColor: D.redBorder },
  actionBtnText: { fontSize: 12, fontWeight: "700", color: D.textSub },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },

  // Top bar
  topBar: {
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...Platform.select({
      ios: { paddingTop: 56 },
      android: { paddingTop: 14 },
    }),
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: D.radius.md,
    backgroundColor: D.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: D.text,
    letterSpacing: -0.3,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: D.green,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: D.radius.pill,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Summary strip
  summaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  stripStat: { flex: 1, alignItems: "center", gap: 2 },
  stripDivider: { width: 1, height: 28, backgroundColor: D.border },
  stripVal: {
    fontSize: 18,
    fontWeight: "800",
    color: D.text,
    letterSpacing: -0.5,
  },
  stripLabel: {
    fontSize: 10,
    color: D.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Toolbar
  toolbarWrap: {
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.lg,
    borderWidth: 1,
    borderColor: D.border,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 11,
    fontSize: 14,
    color: D.text,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sortCount: { fontSize: 12, color: D.textMuted, fontWeight: "500" },
  sortBtns: { flexDirection: "row", gap: 6 },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    borderColor: D.border,
  },
  sortBtnActive: { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  sortBtnText: { fontSize: 11, fontWeight: "600", color: D.textMuted },
  sortBtnTextActive: { color: D.green, fontWeight: "700" },

  // List
  listContent: { padding: 16, paddingBottom: 52 },

  // Empty
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: D.radius.xl,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: D.text,
    marginBottom: 6,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 13,
    color: D.textMuted,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: D.green,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: D.radius.pill,
  },
  emptyAddBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
