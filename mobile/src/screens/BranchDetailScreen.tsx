import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
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

  amber: "#B8742A",
  amberMuted: "rgba(184,116,42,0.10)",
  amberBorder: "rgba(184,116,42,0.25)",

  blue: "#1B5FA6",
  blueMuted: "rgba(27,95,166,0.10)",
  blueBorder: "rgba(27,95,166,0.25)",

  purple: "#7C3AED",
  purpleMuted: "rgba(124,58,237,0.10)",

  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 },
};

const { width: W } = Dimensions.get("window");
const DEFAULT_BRANCH_ID = "00000000-0000-0000-0000-000000000001";

interface Props {
  navigation?: any;
  route?: { params?: { branchId?: string; branchName?: string } };
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

// ─── Avatar helpers ───────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#1E3A5F", "#0D9488", "#059669", "#2563EB", "#7C3AED"];
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

// ─── BarRow component ─────────────────────────────────────────────────────────
const BarRow = ({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) => (
  <View style={br.row}>
    <Text style={br.label} numberOfLines={1}>
      {label}
    </Text>
    <View style={br.track}>
      <View
        style={[
          br.fill,
          {
            width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` as any,
          },
        ]}
      />
    </View>
    <Text style={br.val}>₹{value.toFixed(0)}</Text>
  </View>
);

const br = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  label: {
    fontSize: 12,
    color: D.textSub,
    fontWeight: "600",
    width: 64,
    textAlign: "right",
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: D.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3, backgroundColor: D.green },
  val: {
    fontSize: 12,
    fontWeight: "700",
    color: D.text,
    width: 56,
    textAlign: "right",
  },
});

// ─── ActivityRow component ────────────────────────────────────────────────────
const ActivityRow = ({
  title,
  meta,
  amount,
  isLast = false,
}: {
  title: string;
  meta: string;
  amount: string;
  isLast?: boolean;
}) => (
  <View style={[ar.row, isLast && ar.rowLast]}>
    <View style={ar.dot} />
    <View style={ar.content}>
      <Text style={ar.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={ar.meta} numberOfLines={1}>
        {meta}
      </Text>
    </View>
    <Text style={ar.amount}>{amount}</Text>
  </View>
);

const ar = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F4",
  },
  rowLast: { borderBottomWidth: 0 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: D.green,
    flexShrink: 0,
  },
  content: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "600", color: D.text },
  meta: { fontSize: 11, color: D.textMuted, marginTop: 1 },
  amount: { fontSize: 14, fontWeight: "700", color: D.green, flexShrink: 0 },
});

// ─── Simple Donut Chart Component (without external SVG deps) ─────────────────
const SimpleDonutChart = ({ data, total }: { data: any[]; total: number }) => {
  const size = 180;
  const strokeWidth = 25;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let currentOffset = 0;
  const segments = data.map((item) => {
    const percentage = item.value / total;
    const strokeDasharray = circumference * percentage;
    const strokeDashoffset = circumference - currentOffset;
    currentOffset += strokeDasharray;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      percentage: percentage * 100,
    };
  });

  return (
    <View style={donut.container}>
      <View style={donut.chartWrapper}>
        <View style={donut.chartContainer}>
          {segments.map((segment, index) => (
            <View
              key={segment.key}
              style={[
                donut.segment,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: strokeWidth,
                  borderColor: segment.svg.fill,
                  transform: [{ rotate: `${segment.strokeDashoffset}deg` }],
                },
              ]}
            />
          ))}
          <View style={donut.center}>
            <Text style={donut.centerTotal}>₹{total.toFixed(0)}</Text>
            <Text style={donut.centerLabel}>Total</Text>
          </View>
        </View>
      </View>
      <View style={donut.legendRow}>
        {segments.map((item) => (
          <View key={item.key} style={donut.legendItem}>
            <View style={[donut.legendColor, { backgroundColor: item.svg.fill }]} />
            <Text style={donut.legendLabel}>{item.label}</Text>
            <Text style={donut.legendValue}>
              ₹{item.value.toFixed(0)} ({item.percentage.toFixed(0)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const donut = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  chartContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  segment: {
    position: "absolute",
    borderStyle: "solid",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: D.surface,
  },
  centerTotal: {
    fontSize: 20,
    fontWeight: "800",
    color: D.text,
    letterSpacing: -0.5,
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: D.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: D.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: D.radius.pill,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: D.textSub,
  },
  legendValue: {
    fontSize: 11,
    fontWeight: "700",
    color: D.text,
  },
});

export const BranchDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { inventory, getBranchSummary, getProductSales } = useData();
  const branchId = route?.params?.branchId ?? "";
  const branchName = route?.params?.branchName ?? "";

  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getProductSales({ branchId })
      .then((data) => {
        if (!cancelled) setProductSales(data);
      })
      .finally(() => {
        if (!cancelled) setSalesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, getProductSales]);

  if (!user || user.role !== "admin") {
    return (
      <View style={s.center}>
        <View style={s.restrictedIcon}>
          <MaterialCommunityIcons name="shield-alert-outline" size={28} color={D.textMuted} />
        </View>
        <Text style={s.restrictedTitle}>Admin Access Required</Text>
        <Text style={s.restrictedText}>You need admin privileges to access this page.</Text>
      </View>
    );
  }

  const summary = useMemo(() => getBranchSummary(branchId), [getBranchSummary, branchId]);

  // Prepare donut chart data
  const pieData = useMemo(() => {
    const { cash = 0, upi = 0, card = 0, udhaar = 0 } = summary.paymentBreakdown || {};
    const total = cash + upi + card + udhaar;
    if (total === 0) return [];
    
    return [
      {
        key: "cash",
        value: cash,
        svg: { fill: D.green },
        label: "Cash",
      },
      {
        key: "upi",
        value: upi,
        svg: { fill: D.blue },
        label: "UPI",
      },
      {
        key: "card",
        value: card,
        svg: { fill: D.purple },
        label: "Card",
      },
      {
        key: "udhaar",
        value: udhaar,
        svg: { fill: D.amber },
        label: "Udhaar",
      },
    ].filter((item) => item.value > 0);
  }, [summary.paymentBreakdown]);

  const lowStockItems = useMemo(
    () =>
      inventory.filter(
        (item) =>
          (item.branchId ?? DEFAULT_BRANCH_ID) === branchId &&
          item.quantity <= item.minThreshold,
      ),
    [inventory, branchId]
  );

  const recentSales = useMemo(() => productSales.slice(0, 4), [productSales]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  const maxStaff = Math.max(...summary.byStaffToday.map((s: any) => s.total), 1);
  const paymentTotal = Object.values(summary.paymentBreakdown || {}).reduce((a: number, b: number) => a + b, 0);

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Bar ── */}
        <View style={s.topBar}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation?.goBack()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={D.text} />
          </TouchableOpacity>
          <View style={s.topBarIcon}>
            <MaterialCommunityIcons name="office-building-outline" size={18} color={D.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.topBarTitle}>{branchName}</Text>
            <Text style={s.topBarSub}>Branch Details</Text>
          </View>
        </View>

        {/* ── Hero Revenue Card (Unified like AdminDashboard) ── */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroEyebrow}>TODAY'S REVENUE</Text>
              <Text style={s.heroAmount}>₹{summary.todayTotal.toFixed(0)}</Text>
            </View>
            <View style={s.heroIcon}>
              <MaterialCommunityIcons name="trending-up" size={20} color="#fff" />
            </View>
          </View>
          <View style={s.heroDivider} />
          <View style={s.heroSub}>
            <View style={s.heroSubCol}>
              <Text style={s.heroSubLabel}>THIS MONTH</Text>
              <Text style={s.heroSubVal}>₹{summary.monthlyTotal.toFixed(0)}</Text>
            </View>
            <View style={s.heroSubSep} />
            <View style={s.heroSubCol}>
              <Text style={s.heroSubLabel}>THIS YEAR</Text>
              <Text style={s.heroSubVal}>₹{summary.yearlyTotal.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* ── Payment Breakdown with Donut Chart ── */}
        <SectionLabel>PAYMENT BREAKDOWN</SectionLabel>
        <View style={s.pieCard}>
          {pieData.length === 0 ? (
            <View style={s.emptyInline}>
              <MaterialCommunityIcons
                name="chart-pie"
                size={24}
                color={D.textMuted}
              />
              <Text style={s.emptyInlineText}>No payment data available</Text>
            </View>
          ) : (
            <SimpleDonutChart data={pieData} total={paymentTotal} />
          )}
        </View>

        {/* ── Staff Revenue Today ── */}
        <SectionLabel>STAFF REVENUE TODAY</SectionLabel>
        <View style={s.card}>
          {summary.byStaffToday.filter((s: any) => s.total > 0).length === 0 ? (
            <View style={s.emptyInline}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={24}
                color={D.textMuted}
              />
              <Text style={s.emptyInlineText}>No staff revenue today</Text>
            </View>
          ) : (
            summary.byStaffToday.map((st: any) => (
              <BarRow
                key={st.staffId}
                label={st.staffName}
                value={st.total}
                max={maxStaff}
              />
            ))
          )}
        </View>

        {/* ── Low Stock Items ── */}
        <SectionLabel>LOW STOCK ITEMS</SectionLabel>
        {lowStockItems.length === 0 ? (
          <View style={s.emptyBlock}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={26}
              color={D.textMuted}
            />
            <Text style={s.emptyText}>All items well stocked</Text>
          </View>
        ) : (
          <View style={s.listCard}>
            {lowStockItems.map((item, i) => {
              const out = item.quantity === 0;
              return (
                <View
                  key={item.id}
                  style={[s.stockRow, i === lowStockItems.length - 1 && s.stockRowLast]}
                >
                  <View style={s.stockDot} />
                  <Text style={s.stockName}>{item.name}</Text>
                  <View style={[s.stockTag, out && s.stockTagOut]}>
                    <Text style={[s.stockTagText, out && s.stockTagTextOut]}>
                      {out ? "Out of stock" : `${item.quantity} left`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Recent Product Sales ── */}
        <SectionLabel>RECENT PRODUCT SALES</SectionLabel>
        {salesLoading ? (
          <View style={s.centerInline}>
            <ActivityIndicator size="small" color={D.green} />
          </View>
        ) : recentSales.length === 0 ? (
          <View style={s.emptyBlock}>
            <MaterialCommunityIcons
              name="shopping-outline"
              size={26}
              color={D.textMuted}
            />
            <Text style={s.emptyText}>No product sales yet</Text>
          </View>
        ) : (
          <View style={s.listCard}>
            {recentSales.map((item: ProductSale, i: number) => (
              <ActivityRow
                key={item.id || i}
                title={item.productName}
                meta={`${item.quantity} × ₹${item.unitPrice} · ${item.staffName} · ${formatDate(item.date)}`}
                amount={`₹${item.totalPrice.toFixed(0)}`}
                isLast={i === recentSales.length - 1}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  // Center / Restricted
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: D.bg,
    paddingHorizontal: 40,
  },
  restrictedIcon: {
    width: 68,
    height: 68,
    borderRadius: D.radius.xl,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  restrictedTitle: { fontSize: 17, fontWeight: "700", color: D.text, marginBottom: 8 },
  restrictedText: { fontSize: 13, color: D.textMuted, textAlign: "center", lineHeight: 20 },
  centerInline: { alignItems: "center", paddingVertical: 20 },

  // Top Bar
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
  topBarIcon: {
    width: 36,
    height: 36,
    borderRadius: D.radius.md,
    backgroundColor: D.greenMuted,
    borderWidth: 1,
    borderColor: D.greenBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: { fontSize: 16, fontWeight: "700", color: D.text, letterSpacing: -0.3 },
  topBarSub: { fontSize: 11, color: D.textMuted, marginTop: 1 },

  // Hero Card (Unified Revenue Card)
  heroCard: {
    backgroundColor: D.green,
    borderRadius: D.radius.xxl,
    padding: 20,
    margin: 16,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.60)",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1.5,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: D.radius.md,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 16,
  },
  heroSub: { flexDirection: "row" },
  heroSubCol: { flex: 1 },
  heroSubSep: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 16,
  },
  heroSubLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.60)",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  heroSubVal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },

  // Pie Chart Card
  pieCard: {
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    borderWidth: 1,
    borderColor: D.border,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
  },

  // Card
  card: {
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    borderWidth: 1,
    borderColor: D.border,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },

  // List Card
  listCard: {
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    borderWidth: 1,
    borderColor: D.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginHorizontal: 16,
    marginBottom: 16,
  },

  // Empty states
  emptyBlock: {
    backgroundColor: D.surface,
    borderRadius: D.radius.lg,
    borderWidth: 1,
    borderColor: D.border,
    paddingVertical: 32,
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyText: { fontSize: 13, color: D.textMuted, fontWeight: "600" },
  emptyInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
  },
  emptyInlineText: { fontSize: 13, color: D.textMuted },

  // Stock rows
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F4",
  },
  stockRowLast: { borderBottomWidth: 0 },
  stockDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: D.amber,
    flexShrink: 0,
  },
  stockName: { flex: 1, fontSize: 14, fontWeight: "600", color: D.text },
  stockTag: {
    backgroundColor: D.amberMuted,
    borderRadius: D.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: D.amberBorder,
  },
  stockTagText: { fontSize: 11, fontWeight: "700", color: D.amber },
  stockTagOut: { backgroundColor: D.redMuted, borderColor: D.redBorder },
  stockTagTextOut: { color: D.red },
});