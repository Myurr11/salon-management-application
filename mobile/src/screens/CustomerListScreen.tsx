import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useData } from "../context/DataContext";
import type { Customer } from "../types";

// ─── Design Tokens ────────────────────────────────────────────────────────────
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

  blue: "#1B5FA6",
  blueMuted: "rgba(27,95,166,0.10)",
  blueBorder: "rgba(27,95,166,0.25)",

  gold: "#B8742A",
  goldMuted: "rgba(184,116,42,0.10)",
  goldBorder: "rgba(184,116,42,0.25)",

  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const formatDate = (d?: string | null) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ─── Tier config ──────────────────────────────────────────────────────────────
const getTier = (spend: number) => {
  if (spend >= 10000)
    return {
      label: "VIP",
      color: D.gold,
      bg: D.goldMuted,
      border: D.goldBorder,
      icon: "crown",
    };
  if (spend >= 3000)
    return {
      label: "Regular",
      color: D.green,
      bg: D.greenMuted,
      border: D.greenBorder,
      icon: "star-circle",
    };
  if (spend > 0)
    return {
      label: "New",
      color: D.blue,
      bg: D.blueMuted,
      border: D.blueBorder,
      icon: "account-check",
    };
  return {
    label: "Inactive",
    color: D.textMuted,
    bg: D.surfaceAlt,
    border: D.border,
    icon: "account-outline",
  };
};

type SortKey = "name" | "spend" | "recent";

interface Props {
  navigation: any;
}

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

export const CustomerListScreen: React.FC<Props> = ({ navigation }) => {
  const { customers, visits } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  // Per-customer stats
  const customerStats = useMemo(() => {
    const map: Record<
      string,
      { totalSpend: number; visitCount: number; lastVisitDate: string | null }
    > = {};
    customers.forEach((c) => {
      map[c.id] = { totalSpend: 0, visitCount: 0, lastVisitDate: null };
    });
    visits.forEach((v) => {
      if (map[v.customerId]) {
        map[v.customerId].totalSpend += v.total;
        map[v.customerId].visitCount += 1;
        if (
          !map[v.customerId].lastVisitDate ||
          v.date > map[v.customerId].lastVisitDate!
        ) {
          map[v.customerId].lastVisitDate = v.date;
        }
      }
    });
    return map;
  }, [customers, visits]);

  // Summary
  const summary = useMemo(() => {
    const vip = customers.filter(
      (c) => (customerStats[c.id]?.totalSpend ?? 0) >= 10000,
    ).length;
    const active = customers.filter(
      (c) => (customerStats[c.id]?.visitCount ?? 0) > 0,
    ).length;
    const newClients = customers.filter((c) => {
      const s = customerStats[c.id];
      return s && s.visitCount > 0 && s.totalSpend < 3000;
    }).length;
    return { total: customers.length, vip, active, newClients };
  }, [customers, customerStats]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...customers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q),
      );
    }
    if (sortKey === "name")
      list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortKey === "spend")
      list.sort(
        (a, b) =>
          (customerStats[b.id]?.totalSpend ?? 0) -
          (customerStats[a.id]?.totalSpend ?? 0),
      );
    if (sortKey === "recent")
      list.sort((a, b) => {
        const da = customerStats[a.id]?.lastVisitDate ?? "";
        const db = customerStats[b.id]?.lastVisitDate ?? "";
        return db.localeCompare(da);
      });
    return list;
  }, [customers, searchQuery, sortKey, customerStats]);

  // ── Render customer row ──
  const renderItem = ({ item, index }: { item: Customer; index: number }) => {
    const stats = customerStats[item.id] ?? {
      totalSpend: 0,
      visitCount: 0,
      lastVisitDate: null,
    };
    const tier = getTier(stats.totalSpend);
    const lastDate = formatDate(stats.lastVisitDate);
    const isFirst = index === 0;
    const isLast = index === filtered.length - 1;

    return (
      <TouchableOpacity
        style={[cr.row, isFirst && cr.rowFirst, isLast && cr.rowLast]}
        onPress={() =>
          navigation.navigate("CustomerDetail", { customerId: item.id })
        }
        activeOpacity={0.8}
      >
        {/* Avatar — uniform green */}
        <View style={cr.avatar}>
          <Text style={cr.avatarText}>{getInitials(item.name)}</Text>
        </View>

        {/* Info */}
        <View style={cr.body}>
          <View style={cr.nameRow}>
            <Text style={cr.name} numberOfLines={1}>
              {item.name}
            </Text>
            {stats.totalSpend >= 3000 && (
              <View
                style={[
                  cr.tierPill,
                  { backgroundColor: tier.bg, borderColor: tier.border },
                ]}
              >
                <MaterialCommunityIcons
                  name={tier.icon as any}
                  size={10}
                  color={tier.color}
                />
                <Text style={[cr.tierPillText, { color: tier.color }]}>
                  {tier.label}
                </Text>
              </View>
            )}
          </View>

          <View style={cr.metaRow}>
            {item.phone ? (
              <>
                <View style={cr.metaItem}>
                  <MaterialCommunityIcons
                    name="phone-outline"
                    size={11}
                    color={D.textMuted}
                  />
                  <Text style={cr.metaText} numberOfLines={1}>
                    {item.phone}
                  </Text>
                </View>
                {lastDate && <View style={cr.metaSep} />}
              </>
            ) : null}
            {lastDate && (
              <View style={cr.metaItem}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={11}
                  color={D.textMuted}
                />
                <Text style={cr.metaText}>{lastDate}</Text>
              </View>
            )}
            {!item.phone && !lastDate && (
              <View style={cr.metaItem}>
                <MaterialCommunityIcons
                  name="calendar-check-outline"
                  size={11}
                  color={D.textMuted}
                />
                <Text style={cr.metaText}>
                  {stats.visitCount} visit
                  {stats.visitCount !== 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Visit count + chevron */}
        <View style={cr.right}>
          <Text style={cr.spendVal}>{stats.visitCount}</Text>
          <Text style={cr.spendLabel}>
            visit{stats.visitCount !== 1 ? "s" : ""}
          </Text>
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={18}
          color={D.textMuted}
        />
      </TouchableOpacity>
    );
  };

  const SORT_OPTS: { key: SortKey; label: string; icon: string }[] = [
    { key: "name", label: "A–Z", icon: "sort-alphabetical-ascending" },
    { key: "spend", label: "Top Spend", icon: "currency-inr" },
    { key: "recent", label: "Recent", icon: "clock-outline" },
  ];

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
        <Text style={s.topBarTitle}>Clients</Text>
      </View>

      {/* ── Summary band ── */}
      <View style={s.statsRow}>
        <View style={s.statPill}>
          <Text style={s.statVal}>{summary.total}</Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statPill}>
          <Text style={[s.statVal, { color: D.green }]}>
            {summary.active}
          </Text>
          <Text style={s.statLabel}>Active</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statPill}>
          <Text style={[s.statVal, { color: D.gold }]}>{summary.vip}</Text>
          <Text style={s.statLabel}>VIP</Text>
        </View>
        {summary.newClients > 0 && (
          <>
            <View style={s.statDivider} />
            <View style={s.statPill}>
              <Text style={[s.statVal, { color: D.blue }]}>
                {summary.newClients}
              </Text>
              <Text style={s.statLabel}>New</Text>
            </View>
          </>
        )}
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <View style={s.searchBarIcon}>
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color={D.textMuted}
            />
          </View>
          <TextInput
            style={s.searchBarInput}
            placeholder="Search by name, phone or email…"
            placeholderTextColor={D.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={s.searchBarClear}
              onPress={() => setSearchQuery("")}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={16}
                color={D.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Sort row ── */}
      <View style={s.toolbarRow}>
        <Text style={s.toolbarLabel}>Sort by</Text>
        <View style={s.sortRow}>
          {SORT_OPTS.map((opt) => {
            const active = sortKey === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[s.sortBtn, active && s.sortBtnActive]}
                onPress={() => setSortKey(opt.key)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={opt.icon as any}
                  size={13}
                  color={active ? D.green : D.textMuted}
                />
                <Text
                  style={[s.sortBtnText, active && s.sortBtnTextActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <MaterialCommunityIcons
              name="account-off-outline"
              size={32}
              color={D.textMuted}
            />
          </View>
          <Text style={s.emptyTitle}>
            {searchQuery
              ? `No results for "${searchQuery}"`
              : "No clients yet"}
          </Text>
          <Text style={s.emptyHint}>
            {searchQuery
              ? "Try a different search term"
              : "Add your first client via a new visit"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

// ─── Customer row styles ──────────────────────────────────────────────────────
const cr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F4",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: D.border,
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: D.radius.xl,
    borderTopRightRadius: D.radius.xl,
  },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    borderBottomLeftRadius: D.radius.xl,
    borderBottomRightRadius: D.radius.xl,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: D.radius.md,
    backgroundColor: D.green,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  body: { flex: 1, minWidth: 0, gap: 4 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: D.text,
    flexShrink: 1,
  },
  tierPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    flexShrink: 0,
  },
  tierPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: D.textSub, fontWeight: "500" },
  metaSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: D.border,
  },
  right: { alignItems: "flex-end", flexShrink: 0 },
  spendVal: {
    fontSize: 16,
    fontWeight: "800",
    color: D.green,
    letterSpacing: -0.3,
  },
  spendLabel: {
    fontSize: 9,
    color: D.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 1,
  },
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
  topBarCount: {
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  topBarCountText: { fontSize: 12, fontWeight: "700", color: D.green },

  // Summary band
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  statPill: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: D.border },
  statVal: {
    fontSize: 16,
    fontWeight: "800",
    color: D.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: D.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Search
  searchWrap: {
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.lg,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
  },
  searchBarIcon: {
    width: 42,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: D.border,
  },
  searchBarInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: D.text,
  },
  searchBarClear: { paddingHorizontal: 10 },

  // Toolbar
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  toolbarLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: D.textSub,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sortRow: { flexDirection: "row", gap: 6 },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    borderColor: D.border,
  },
  sortBtnActive: { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  sortBtnText: { fontSize: 11, fontWeight: "600", color: D.textMuted },
  sortBtnTextActive: { color: D.green, fontWeight: "700" },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },

  // Empty
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: D.radius.xl,
    backgroundColor: D.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: D.border,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: D.text,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    color: D.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
