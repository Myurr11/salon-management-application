import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import type { ProductSale } from "../types";

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

  blue: "#3A7EC8",
  blueMuted: "rgba(58,126,200,0.10)",
  blueBorder: "rgba(58,126,200,0.20)",

  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 },
};

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

// ─── Avatar Component ────────────────────────────────────────────────────────
const Avatar = ({ name, size = 28 }: { name: string; size?: number }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <View
      style={[
        av.box,
        {
          width: size,
          height: size,
          borderRadius: size / 3,
        },
      ]}
    >
      <Text style={[av.text, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
};

const av = StyleSheet.create({
  box: {
    backgroundColor: D.greenMuted,
    borderWidth: 1,
    borderColor: D.greenBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { color: D.green, fontWeight: "800" },
});

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
        const sales = await getProductSales(
          selectedStaffId ? { staffId: selectedStaffId } : undefined,
        );
        setAllSales(sales);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getProductSales, selectedStaffId]);

  const totalRevenue = useMemo(
    () => allSales.reduce((s, sale) => s + sale.totalPrice, 0),
    [allSales],
  );
  const totalUnits = useMemo(
    () => allSales.reduce((s, sale) => s + sale.quantity, 0),
    [allSales],
  );

  // Top selling product
  const topProduct = useMemo(() => {
    if (!allSales.length) return null;
    const map: Record<string, { name: string; total: number }> = {};
    allSales.forEach((s) => {
      if (!map[s.productName])
        map[s.productName] = { name: s.productName, total: 0 };
      map[s.productName].total += s.totalPrice;
    });
    return Object.values(map).sort((a, b) => b.total - a.total)[0];
  }, [allSales]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  if (!user || user.role !== "admin") {
    return (
      <View style={[s.center, { flex: 1, backgroundColor: D.bg }]}>
        <Text style={{ color: D.red }}>Admin access required.</Text>
      </View>
    );
  }

  const renderSale = ({
    item,
    index,
  }: {
    item: ProductSale;
    index: number;
  }) => {
    const isFirst = index === 0;
    const isLast = index === allSales.length - 1;

    return (
      <View style={[s.row, isFirst && s.rowFirst, isLast && s.rowLast]}>
        {/* Icon - using cart/shopping icon for product sales */}
        <View style={s.rowIcon}>
          <MaterialCommunityIcons
            name="shopping-outline"
            size={18}
            color={D.green}
          />
        </View>

        {/* Content */}
        <View style={s.rowBody}>
          <Text style={s.rowName} numberOfLines={1}>
            {item.productName}
          </Text>
          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <MaterialCommunityIcons
                name="account-outline"
                size={12}
                color={D.textMuted}
              />
              <Text style={s.metaText}>{item.staffName}</Text>
            </View>
            <View style={s.metaDot} />
            <View style={s.metaItem}>
              <MaterialCommunityIcons
                name="account-heart-outline"
                size={12}
                color={D.textMuted}
              />
              <Text style={s.metaText} numberOfLines={1}>
                {item.customerName || "Walk-in"}
              </Text>
            </View>
            <View style={s.metaDot} />
            <View style={s.metaItem}>
              <MaterialCommunityIcons
                name="calendar-outline"
                size={12}
                color={D.textMuted}
              />
              <Text style={s.metaText}>{formatDate(item.date)}</Text>
            </View>
          </View>
          <View style={s.qtyChip}>
            <MaterialCommunityIcons
              name="cube-outline"
              size={11}
              color={D.textMuted}
            />
            <Text style={s.qtyChipText}>
              {item.quantity} × ₹{item.unitPrice}
            </Text>
          </View>
        </View>

        {/* Amount */}
        <View style={s.rowAmount}>
          <Text style={s.amountValue}>₹{item.totalPrice.toFixed(0)}</Text>
          <Text style={s.amountLabel}>total</Text>
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
          <MaterialCommunityIcons name="arrow-left" size={20} color={D.text} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Product Sales</Text>
        <View style={s.topBarCount}>
          <Text style={s.topBarCountText}>{allSales.length}</Text>
        </View>
      </View>

      {/* ── Stats Row ── */}
      <View style={s.statsRow}>
        <View style={s.statPill}>
          <Text style={s.statVal}>₹{(totalRevenue / 1000).toFixed(1)}k</Text>
          <Text style={s.statLabel}>Revenue</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statPill}>
          <Text style={s.statVal}>{totalUnits}</Text>
          <Text style={s.statLabel}>Units Sold</Text>
        </View>
        <View style={s.statDivider} />
        <View style={[s.statPill, { flex: 1.5 }]}>
          <Text style={s.statVal} numberOfLines={1}>
            {topProduct?.name ?? "—"}
          </Text>
          <Text style={s.statLabel}>Top Product</Text>
        </View>
      </View>

      {/* ── Staff Filter ── */}
      <View style={s.filterWrap}>
        <SectionLabel>FILTER BY STAFF</SectionLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScroll}
        >
          {/* All Staff chip */}
          <TouchableOpacity
            style={[
              s.filterChip,
              selectedStaffId === null && s.filterChipActive,
            ]}
            onPress={() => setSelectedStaffId(null)}
            activeOpacity={0.75}
          >
            <View
              style={[
                s.filterChipIcon,
                selectedStaffId === null && s.filterChipIconActive,
              ]}
            >
              <MaterialCommunityIcons
                name={
                  selectedStaffId === null
                    ? "check"
                    : "account-multiple-outline"
                }
                size={14}
                color={selectedStaffId === null ? "#FFF" : D.textMuted}
              />
            </View>
            <Text
              style={[
                s.filterChipText,
                selectedStaffId === null && s.filterChipTextActive,
              ]}
            >
              All Staff
            </Text>
          </TouchableOpacity>

          {staffMembers.map((staff) => (
            <TouchableOpacity
              key={staff.id}
              style={[
                s.filterChip,
                selectedStaffId === staff.id && s.filterChipActive,
              ]}
              onPress={() => setSelectedStaffId(staff.id)}
              activeOpacity={0.75}
            >
              <Avatar name={staff.name} size={24} />
              <Text
                style={[
                  s.filterChipText,
                  selectedStaffId === staff.id && s.filterChipTextActive,
                ]}
              >
                {staff.name.split(" ")[0]}
              </Text>
              {selectedStaffId === staff.id && (
                <MaterialCommunityIcons
                  name="check"
                  size={12}
                  color={D.green}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={D.green} />
          <Text style={[s.emptyHint, { marginTop: 12 }]}>Loading sales…</Text>
        </View>
      ) : allSales.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <MaterialCommunityIcons
              name="cart-off"
              size={32}
              color={D.textMuted}
            />
          </View>
          <Text style={s.emptyTitle}>No sales found</Text>
          <Text style={s.emptyHint}>
            {selectedStaffId
              ? "Try selecting a different staff member"
              : "Sales will appear here once recorded"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={allSales}
          keyExtractor={(item) => item.id}
          renderItem={renderSale}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ marginBottom: 4 }}>
              <SectionLabel>
                {`${allSales.length} SALE${allSales.length > 1 ? "S" : ""}${
                  selectedStaffId ? " — FILTERED" : ""
                }`}
              </SectionLabel>
            </View>
          }
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },

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
    fontSize: 14,
    fontWeight: "800",
    color: D.text,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: D.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Filter
  filterWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  filterScroll: { gap: 8, paddingBottom: 14 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.lg,
    borderWidth: 1,
    borderColor: D.border,
  },
  filterChipActive: {
    backgroundColor: D.greenMuted,
    borderColor: D.green,
  },
  filterChipIcon: {
    width: 24,
    height: 24,
    borderRadius: D.radius.sm,
    backgroundColor: D.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: D.border,
  },
  filterChipIconActive: {
    backgroundColor: D.green,
    borderColor: D.green,
  },
  filterChipText: { fontSize: 12, fontWeight: "600", color: D.textSub },
  filterChipTextActive: { color: D.green },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },

  // Sale rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
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
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: D.radius.md,
    backgroundColor: D.greenMuted,
    borderWidth: 1,
    borderColor: D.greenBorder,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 4 },
  rowName: { fontSize: 14, fontWeight: "700", color: D.text },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: D.textSub, fontWeight: "500" },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: D.border,
  },
  qtyChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: D.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    borderColor: D.border,
  },
  qtyChipText: { fontSize: 10, color: D.textSub, fontWeight: "600" },
  rowAmount: { alignItems: "flex-end", flexShrink: 0 },
  amountValue: {
    fontSize: 16,
    fontWeight: "800",
    color: D.green,
    letterSpacing: -0.5,
  },
  amountLabel: {
    fontSize: 9,
    color: D.textMuted,
    fontWeight: "600",
    marginTop: 1,
  },

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
