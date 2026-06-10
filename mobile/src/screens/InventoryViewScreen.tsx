import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useData } from "../context/DataContext";
import type { InventoryItem } from "../types";

// ─── Design Tokens — shared with AdminDashboard / StaffDashboard ──────────────
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

  blue: "#1B5FA6",
  blueMuted: "rgba(27,95,166,0.10)",
  blueBorder: "rgba(27,95,166,0.25)",

  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 },
};

// ─── Stock config ─────────────────────────────────────────────────────────────
const getStockCfg = (item: InventoryItem) => {
  if (item.quantity === 0)
    return {
      label: "Out of stock",
      color: D.red,
      bg: D.redMuted,
      border: D.redBorder,
      icon: "package-variant-closed",
      barColor: D.red,
    };
  if (item.quantity <= item.minThreshold)
    return {
      label: "Low stock",
      color: D.amber,
      bg: D.amberMuted,
      border: D.amberBorder,
      icon: "alert-circle-outline",
      barColor: D.amber,
    };
  return {
    label: "In stock",
    color: D.green,
    bg: D.greenMuted,
    border: D.greenBorder,
    icon: "package-variant",
    barColor: D.green,
  };
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────
type FilterTab = "all" | "in_stock" | "low" | "out";
const TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "view-grid-outline" },
  { key: "in_stock", label: "In Stock", icon: "package-variant" },
  { key: "low", label: "Low", icon: "alert-circle-outline" },
  { key: "out", label: "Out", icon: "package-variant-closed" },
];

interface Props {
  navigation: any;
}

export const InventoryViewScreen: React.FC<Props> = ({ navigation }) => {
  const { inventory } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const summary = useMemo(() => {
    const inStock = inventory.filter((i) => i.quantity > i.minThreshold).length;
    const low = inventory.filter(
      (i) => i.quantity > 0 && i.quantity <= i.minThreshold,
    ).length;
    const out = inventory.filter((i) => i.quantity === 0).length;
    return { inStock, low, out };
  }, [inventory]);

  const filtered = useMemo(() => {
    let list = [...inventory];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (activeTab === "in_stock")
      list = list.filter((i) => i.quantity > i.minThreshold);
    if (activeTab === "low")
      list = list.filter(
        (i) => i.quantity > 0 && i.quantity <= i.minThreshold,
      );
    if (activeTab === "out") list = list.filter((i) => i.quantity === 0);
    return list;
  }, [inventory, searchQuery, activeTab]);

  const tabCount = (key: FilterTab) => {
    if (key === "all") return inventory.length;
    if (key === "in_stock") return summary.inStock;
    if (key === "low") return summary.low;
    if (key === "out") return summary.out;
    return 0;
  };

  const tabColor = (key: FilterTab) => {
    if (key === "in_stock")
      return { color: D.green, bg: D.greenMuted, border: D.greenBorder };
    if (key === "low")
      return { color: D.amber, bg: D.amberMuted, border: D.amberBorder };
    if (key === "out")
      return { color: D.red, bg: D.redMuted, border: D.redBorder };
    return { color: D.blue, bg: D.blueMuted, border: D.blueBorder };
  };

  // ── Render inventory row ──
  const renderItem = ({
    item,
    index,
  }: {
    item: InventoryItem;
    index: number;
  }) => {
    const cfg = getStockCfg(item);
    const maxQty = Math.max(item.minThreshold * 3, item.quantity, 1);
    const pct = Math.min((item.quantity / maxQty) * 100, 100);
    const isFirst = index === 0;
    const isLast = index === filtered.length - 1;

    return (
      <View style={[ir.row, isFirst && ir.rowFirst, isLast && ir.rowLast]}>
        {/* Icon avatar — coloured by status */}
        <View
          style={[
            ir.avatar,
            { backgroundColor: cfg.bg, borderColor: cfg.border },
          ]}
        >
          <MaterialCommunityIcons
            name={cfg.icon as any}
            size={18}
            color={cfg.color}
          />
        </View>

        {/* Body */}
        <View style={ir.body}>
          <View style={ir.nameRow}>
            <Text style={ir.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View
              style={[
                ir.statusPill,
                { backgroundColor: cfg.bg, borderColor: cfg.border },
              ]}
            >
              <View
                style={[ir.statusDot, { backgroundColor: cfg.color }]}
              />
              <Text style={[ir.statusText, { color: cfg.color }]}>
                {cfg.label}
              </Text>
            </View>
          </View>

          {/* Stock bar */}
          <View style={ir.barBg}>
            <View
              style={[
                ir.barFill,
                {
                  width: `${pct}%` as any,
                  backgroundColor: cfg.barColor,
                },
              ]}
            />
          </View>

          {/* Meta row */}
          <View style={ir.metaRow}>
            <View style={ir.metaItem}>
              <Text style={[ir.qtyVal, { color: cfg.color }]}>
                {item.quantity}
              </Text>
              <Text style={ir.qtyUnit}>units</Text>
            </View>
            <View style={ir.metaSep} />
            <View style={ir.metaItem}>
              <MaterialCommunityIcons
                name="alert-outline"
                size={11}
                color={D.textMuted}
              />
              <Text style={ir.metaText}>
                Min <Text style={ir.metaStrong}>{item.minThreshold}</Text>
              </Text>
            </View>
            <View style={ir.metaSep} />
            <Text style={ir.pctText}>{Math.round(pct)}%</Text>
          </View>
        </View>
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
          <MaterialCommunityIcons
            name="arrow-left"
            size={20}
            color={D.text}
          />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Inventory</Text>
        <View style={s.topBarCount}>
          <Text style={s.topBarCountText}>{inventory.length}</Text>
        </View>
      </View>

      {/* ── Stats Row ── */}
      <View style={s.statsRow}>
        <View style={s.statPill}>
          <Text style={[s.statVal, { color: D.green }]}>
            {summary.inStock}
          </Text>
          <Text style={s.statLabel}>In Stock</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statPill}>
          <Text style={[s.statVal, { color: D.amber }]}>{summary.low}</Text>
          <Text style={s.statLabel}>Low Stock</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statPill}>
          <Text style={[s.statVal, { color: D.red }]}>{summary.out}</Text>
          <Text style={s.statLabel}>Out</Text>
        </View>
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
            placeholder="Search products…"
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

      {/* ── Filter Tabs ── */}
      <View style={s.tabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabsRow}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const tc = tabColor(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  s.tab,
                  active && {
                    backgroundColor: tc.bg,
                    borderColor: tc.border,
                  },
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={tab.icon as any}
                  size={13}
                  color={active ? tc.color : D.textMuted}
                />
                <Text
                  style={[
                    s.tabText,
                    active && { color: tc.color, fontWeight: "700" },
                  ]}
                >
                  {tab.label}
                </Text>
                <View
                  style={[
                    s.tabBadge,
                    active && { backgroundColor: tc.color, borderColor: tc.color },
                  ]}
                >
                  <Text
                    style={[
                      s.tabBadgeText,
                      active && { color: "#fff" },
                    ]}
                  >
                    {tabCount(tab.key)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={32}
              color={D.textMuted}
            />
          </View>
          <Text style={s.emptyTitle}>
            {searchQuery
              ? `No results for "${searchQuery}"`
              : "No items in this category"}
          </Text>
          <Text style={s.emptyHint}>
            Try a different filter or search term
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

// ─── Inventory row styles (compact) ───────────────────────────────────────────
const ir = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  body: { flex: 1, minWidth: 0, gap: 6 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: D.text,
    flexShrink: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },

  // Bar
  barBg: {
    height: 5,
    backgroundColor: D.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },

  // Meta row
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  metaItem: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  qtyVal: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  qtyUnit: { fontSize: 11, color: D.textMuted, fontWeight: "500" },
  metaText: { fontSize: 11, color: D.textMuted, fontWeight: "500" },
  metaStrong: { color: D.text, fontWeight: "700" },
  metaSep: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: D.border,
  },
  pctText: {
    fontSize: 11,
    color: D.textMuted,
    fontWeight: "700",
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

  // Stats row
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

  // Tabs
  tabsWrap: {
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingVertical: 10,
  },
  tabsRow: { paddingHorizontal: 16, gap: 8 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    borderColor: D.border,
  },
  tabText: { fontSize: 12, fontWeight: "600", color: D.textMuted },
  tabBadge: {
    minWidth: 22,
    height: 20,
    backgroundColor: D.surface,
    borderRadius: D.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: D.border,
    paddingHorizontal: 6,
  },
  tabBadgeText: { fontSize: 10, fontWeight: "800", color: D.textMuted },

  // List
  listContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 40 },

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