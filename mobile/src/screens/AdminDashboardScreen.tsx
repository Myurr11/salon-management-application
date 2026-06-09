import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import type { ProductSale, StaffMember } from "../types";
import { updateStaffGoal } from "../services/supabaseService";

// ─── Design Tokens — identical to StaffDashboardScreen ───────────────────────
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

const { width: W } = Dimensions.get("window");
const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

interface Props {
  navigation: any;
}

// ─── SectionLabel — same as StaffDashboardScreen ─────────────────────────────
const SectionLabel = ({ children }: { children: string }) => (
  <View style={sl.row}>
    <View style={sl.line} />
    <Text style={sl.text}>{children}</Text>
    <View style={sl.line} />
  </View>
);
const sl = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  line: { flex: 1, height: 1, backgroundColor: D.border },
  text: {
    fontSize: 10,
    fontWeight: "700",
    color: D.textSub,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
// ─── Flat bar row for revenue chart ──────────────────────────────────────────
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
            width:
              `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` as any,
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

// ─── Flat activity row — same pattern as visit rows in StaffDashboardScreen ──
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
// ─── Main Screen ──────────────────────────────────────────────────────────────
export const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, staffMembers, refreshStaffMembers } = useAuth();
  const {
    getAdminRevenueSummary,
    productSales,
    inventory,
    visits,
    refreshData,
  } = useData();

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [goalAmount, setGoalAmount] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => refreshData());
    return unsub;
  }, [navigation, refreshData]);

  const openGoalModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setGoalAmount(staff.monthlyGoal?.toString() || "");
    setGoalModalVisible(true);
  };
  const closeGoalModal = () => {
    setGoalModalVisible(false);
    setSelectedStaff(null);
    setGoalAmount("");
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
    } catch (e) {
      console.error(e);
    } finally {
      setSavingGoal(false);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: D.bg,
        }}
      >
        <Text style={{ color: D.red, fontSize: 15, fontWeight: "700" }}>
          Admin access required.
        </Text>
      </View>
    );
  }

  const rev = useMemo(() => getAdminRevenueSummary(), [getAdminRevenueSummary]);
  const recentSales = useMemo(() => productSales.slice(0, 4), [productSales]);
  const recentServices = useMemo(
    () =>
      visits
        .filter((v: any) => v.services?.length > 0)
        .sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        )
        .slice(0, 4),
    [visits],
  );
  const lowStock = useMemo(
    () => inventory.filter((i: any) => i.quantity <= i.minThreshold),
    [inventory],
  );

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const todayStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const maxStaff = Math.max(...rev.byStaffToday.map((s: any) => s.total), 1);

  const ACTION_GROUPS = [
    {
      category: "Salon",
      actions: [
        { icon: "spa", label: "Services", nav: "AdminServices" },
        { icon: "percent", label: "Offers", nav: "AdminOffers" },
        { icon: "package-variant", label: "Inventory", nav: "AdminInventory" },
      ],
    },
    {
      category: "Finance",
      actions: [
        {
          icon: "cart-outline",
          label: "Product Sales",
          nav: "AdminProductSales",
        },
        { icon: "credit-card-outline", label: "Udhaar", nav: "AdminUdhaar" },
        {
          icon: "calendar-clock",
          label: "Appointments",
          nav: "AppointmentsList",
        },
      ],
    },
    {
      category: "Team",
      actions: [
        {
          icon: "clipboard-check-outline",
          label: "Attendance",
          nav: "AdminAttendance",
        },
        {
          icon: "account-group",
          label: "Manage Staff",
          nav: "AdminManageStaff",
        },
        {
          icon: "office-building-outline",
          label: "Branches",
          nav: "AdminAssignBranch",
        },
      ],
    },
    {
      category: "Insights",
      actions: [
        {
          icon: "chart-bar",
          label: "Performance",
          nav: "AdminStaffPerformance",
        },
        { icon: "file-chart", label: "Staff Report", nav: "StaffReport" },
      ],
    },
  ] as const;

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Row — same as StaffDashboardScreen ── */}
        <View style={s.profile}>
          <View style={s.profileLeft}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>A</Text>
            </View>
            <View>
              <Text style={s.profileDate}>{todayStr}</Text>
              <Text style={s.profileName}>{user.name} Dashboard</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={logout}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="logout-variant"
              size={18}
              color={D.red}
            />
          </TouchableOpacity>
        </View>

        {/* ── Hero Revenue Card — same green card as staff progress ── */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroEyebrow}>TODAY'S TOTAL</Text>
              <Text style={s.heroAmount}>₹{rev.todayTotal.toFixed(0)}</Text>
            </View>
            <View style={s.heroIcon}>
              <MaterialCommunityIcons
                name="trending-up"
                size={20}
                color="#fff"
              />
            </View>
          </View>
          <View style={s.heroDivider} />
          <View style={s.heroSub}>
            <View style={s.heroSubCol}>
              <Text style={s.heroSubLabel}>THIS MONTH</Text>
              <Text style={s.heroSubVal}>₹{rev.monthlyTotal.toFixed(0)}</Text>
            </View>
            <View style={s.heroSubSep} />
            <View style={s.heroSubCol}>
              <Text style={s.heroSubLabel}>THIS YEAR</Text>
              <Text style={s.heroSubVal}>₹{rev.yearlyTotal.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* ── Payment Breakdown ── */}
        {rev.paymentBreakdown && (
          <View style={s.payRow}>
            {(
              [
                {
                  label: "Cash",
                  icon: "cash",
                  val: rev.paymentBreakdown.cash || 0,
                },
                {
                  label: "UPI",
                  icon: "contactless-payment",
                  val: rev.paymentBreakdown.upi || 0,
                },
                {
                  label: "Card",
                  icon: "credit-card",
                  val: rev.paymentBreakdown.card || 0,
                },
                {
                  label: "Udhaar",
                  icon: "handshake",
                  val: rev.paymentBreakdown.udhaar || 0,
                },
              ] as const
            ).map((p) => (
              <View key={p.label} style={s.payPill}>
                <MaterialCommunityIcons
                  name={p.icon as any}
                  size={16}
                  color={D.green}
                />
                <Text style={s.payAmt}>₹{p.val.toFixed(0)}</Text>
                <Text style={s.payLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Staff Revenue Chart ── */}
        <View style={s.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <SectionLabel>STAFF REVENUE TODAY</SectionLabel>
          </View>
        </View>

        <View style={s.card}>
          {rev.byStaffToday.map((st: any) => (
            <BarRow
              key={st.staffId}
              label={st.staffName}
              value={st.total}
              max={maxStaff}
            />
          ))}
        </View>

        {/* ── Quick Actions — grouped by category ── */}
        <View style={s.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <SectionLabel>QUICK ACTIONS</SectionLabel>
          </View>
        </View>

        <View style={s.actionsWrap}>
          {ACTION_GROUPS.map((group) => {
            // Chunk into rows of 3
            const chunks: (typeof group.actions)[number][][] = [];
            for (let i = 0; i < group.actions.length; i += 3)
              chunks.push([...group.actions].slice(i, i + 3));
            return (
              <View key={group.category} style={s.actionGroup}>
                {/* Category label — centred */}
                <Text style={s.actionGroupLabel}>
                  {group.category.toUpperCase()}
                </Text>
                {chunks.map((row, ri) => (
                  <View key={ri} style={s.actionRow}>
                    {row.map((a) => (
                      <TouchableOpacity
                        key={a.nav}
                        style={s.actionTile}
                        onPress={() => navigation.navigate(a.nav)}
                        activeOpacity={0.8}
                      >
                        <View style={s.actionIcon}>
                          <MaterialCommunityIcons
                            name={a.icon as any}
                            size={20}
                            color={D.green}
                          />
                        </View>
                        <Text style={s.actionLabel} numberOfLines={2}>
                          {a.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {/* Fill empty slots in last row so tiles stay same width */}
                    {row.length < 3 &&
                      Array.from({ length: 3 - row.length }).map((_, i) => (
                        <View key={`empty-${i}`} style={s.actionTileGhost} />
                      ))}
                  </View>
                ))}
              </View>
            );
          })}
        </View>

        {/* ── Branch Revenue ── */}
        <View style={s.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <SectionLabel>BRANCH REVENUE TODAY</SectionLabel>
          </View>
        </View>

        {rev.byBranch?.length > 0 && (
          <View style={s.card}>
            {rev.byBranch.map((b: any, i: number) => (
              <TouchableOpacity
                key={b.branchId}
                onPress={() => {
                  if (b.branchId && b.branchId !== "default") {
                    navigation.navigate("BranchDetail", {
                      branchId: b.branchId,
                      branchName: b.branchName,
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <BarRow
                  label={b.branchName}
                  value={b.todayTotal}
                  max={Math.max(
                    ...rev.byBranch.map((x: any) => x.todayTotal),
                    1,
                  )}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Staff Goals ── */}
        <View style={s.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <SectionLabel>STAFF GOALS</SectionLabel>
          </View>
        </View>

        <View style={s.listCard}>
          {staffMembers.map((staff: StaffMember, index: number) => {
            let earned = 0;
            visits.forEach((v: any) => {
              const d = new Date(v.date);
              if (d.getMonth() !== curMonth || d.getFullYear() !== curYear)
                return;
              if (v.attendingStaff?.length > 0) {
                const rec = v.attendingStaff.find(
                  (s: any) => s.staffId === staff.id,
                );
                if (rec) earned += rec.revenueShare;
              } else if (v.staffId === staff.id) {
                earned += v.total;
              }
            });
            const goal = staff.monthlyGoal || 0;
            const pct = goal > 0 ? Math.min(100, (earned / goal) * 100) : 0;
            const isLast = index === staffMembers.length - 1;

            return (
              <View key={staff.id} style={[s.goalRow, isLast && s.goalRowLast]}>
                <View style={s.goalAvatar}>
                  <Text style={s.goalInitials}>{initials(staff.name)}</Text>
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={s.goalRowTop}>
                    <Text style={s.goalName}>{staff.name}</Text>
                    {goal > 0 ? (
                      <Text style={s.goalNums}>
                        <Text style={s.goalEarned}>₹{earned.toFixed(0)}</Text>
                        <Text style={s.goalOf}> / ₹{goal}</Text>
                      </Text>
                    ) : (
                      <Text style={s.goalNone}>No goal set</Text>
                    )}
                  </View>
                  {goal > 0 && (
                    <View style={s.goalTrack}>
                      <View style={[s.goalFill, { width: `${pct}%` as any }]} />
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={s.editBtn}
                  onPress={() => openGoalModal(staff)}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={13}
                    color={D.green}
                  />
                  <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* ── Low Stock ── */}
        <View style={s.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <SectionLabel>LOW STOCK</SectionLabel>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            {lowStock.length > 0 && (
              <View style={s.warnBadge}>
                <Text style={s.warnBadgeText}>
                  {lowStock.length} item{lowStock.length > 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </View>
        </View>

        {lowStock.length === 0 ? (
          <View style={s.emptyBlock}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={26}
              color={D.textMuted}
            />
            <Text style={s.emptyText}>All items well stocked</Text>
          </View>
        ) : (
          lowStock.map((item: any, i: number) => {
            const out = item.quantity === 0;
            return (
              <View
                key={item.id}
                style={[
                  s.stockRow,
                  i === lowStock.length - 1 && s.stockRowLast,
                ]}
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
          })
        )}

        {/* ── Recent Services ── */}
        <View style={s.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <SectionLabel>RECENT SERVICES</SectionLabel>
          </View>
        </View>
        {recentServices.length === 0 ? (
          <View style={s.emptyBlock}>
            <MaterialCommunityIcons name="spa" size={26} color={D.textMuted} />
            <Text style={s.emptyText}>No services recorded yet</Text>
          </View>
        ) : (
          <View style={s.listCard}>
            {recentServices.map((item: any, i: number) => {
              const staffName =
                item.attendingStaff?.length > 0
                  ? item.attendingStaff
                      .map((st: any) => st.staffName)
                      .join(", ")
                  : item.staffName || "Unknown";
              const total = item.services.reduce(
                (acc: number, sv: any) => acc + (sv.price || 0),
                0,
              );
              const names = item.services
                .map((sv: any) => sv.name || sv.serviceName)
                .filter(Boolean)
                .join(", ");
              return (
                <ActivityRow
                  key={item.id || i}
                  title={names || "Service Visit"}
                  meta={`${item.customerName || "Walk-in"} · ${staffName} · ${fmtDate(item.date)}`}
                  amount={`₹${total.toFixed(0)}`}
                  isLast={i === recentServices.length - 1}
                />
              );
            })}
          </View>
        )}

        {/* ── Recent Product Sales ── */}
        <View style={s.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <SectionLabel>RECENT PRODUCT SALES</SectionLabel>
          </View>
        </View>

        {recentSales.length === 0 ? (
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
                meta={`${item.quantity} × ₹${item.unitPrice} · ${item.staffName} · ${fmtDate(item.date)}`}
                amount={`₹${item.totalPrice.toFixed(0)}`}
                isLast={i === recentSales.length - 1}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Goal Modal ── */}
      <Modal
        visible={goalModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeGoalModal}
      >
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handle} />
            <Text style={m.title}>Set Monthly Goal</Text>
            {selectedStaff && (
              <View style={m.staffRow}>
                <View style={m.staffAvatar}>
                  <Text style={m.staffInitials}>
                    {initials(selectedStaff.name)}
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
                selectionColor={D.green}
              />
            </View>
            <TouchableOpacity
              style={[m.saveBtn, savingGoal && { opacity: 0.6 }]}
              onPress={handleSaveGoal}
              disabled={savingGoal}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color="#fff"
              />
              <Text style={m.saveBtnText}>
                {savingGoal ? "Saving…" : "Save Goal"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={m.cancelBtn} onPress={closeGoalModal}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },

  // Top bar — identical to StaffDashboardScreen
  topBar: {
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Platform.select({
      ios: { paddingTop: 56 },
      android: { paddingTop: 14 },
    }),
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: D.text,
    letterSpacing: -0.3,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: D.radius.md,
    backgroundColor: D.redMuted,
    borderWidth: 1,
    borderColor: D.redBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 52,
    gap: 10,
  },

  // Profile — identical pattern to StaffDashboardScreen
  profile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: D.radius.lg,
    backgroundColor: D.green,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  profileDate: {
    fontSize: 10,
    fontWeight: "700",
    color: D.textSub,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "800",
    color: D.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: D.greenMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  adminBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: D.green,
  },
  adminBadgeText: { fontSize: 11, fontWeight: "700", color: D.green },

  // Hero card — same green block as staff progress card
  heroCard: {
    backgroundColor: D.green,
    borderRadius: D.radius.xxl,
    padding: 20,
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

  // Payment pills — neutral, single colour
  payRow: { flexDirection: "row", gap: 8 },
  payPill: {
    flex: 1,
    backgroundColor: D.surface,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.border,
    padding: 10,
    alignItems: "center",
    gap: 3,
  },
  payAmt: { fontSize: 12, fontWeight: "800", color: D.text },
  payLabel: { fontSize: 10, fontWeight: "600", color: D.textMuted },

  // Generic surface card
  card: {
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    borderWidth: 1,
    borderColor: D.border,
    padding: 16,
  },

  // Quick actions — grouped, 3 columns
  actionsWrap: { gap: 10 },
  actionGroup: {
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    borderWidth: 1,
    borderColor: D.border,
    padding: 14,
    gap: 10,
  },
  actionGroupLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: D.green,
    letterSpacing: 1.8,
    textAlign: "center",
  },
  actionRow: { flexDirection: "row", gap: 8 },
  actionTile: {
    flex: 1,
    alignItems: "center",
    gap: 7,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  actionTileGhost: { flex: 1 },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: D.radius.md,
    backgroundColor: D.greenMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: D.text,
    textAlign: "center",
    lineHeight: 20,
  },
  actionArrow: {},

  // Section header row (label + manage button side by side)
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: -5,
    marginTop: 20,
  },
  manageBtn: {
    backgroundColor: D.greenMuted,
    borderWidth: 1,
    borderColor: D.greenBorder,
    borderRadius: D.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexShrink: 0,
  },
  manageBtnText: { color: D.green, fontSize: 12, fontWeight: "700" },

  // Single white card wrapping a flat list (goals, services, products)
  listCard: {
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    borderWidth: 1,
    borderColor: D.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },

  // Goal rows inside the single card
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F4",
  },
  goalRowLast: { borderBottomWidth: 0 },
  goalRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  goalAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: D.green,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  goalInitials: { color: "#fff", fontSize: 12, fontWeight: "700" },
  goalName: { fontSize: 14, fontWeight: "700", color: D.text },
  goalNums: { fontSize: 12 },
  goalEarned: { fontWeight: "800", color: D.green },
  goalOf: { color: D.textMuted },
  goalNone: { fontSize: 12, color: D.textMuted },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: D.greenMuted,
    borderWidth: 1,
    borderColor: D.greenBorder,
    borderRadius: D.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  editBtnText: { color: D.green, fontSize: 11, fontWeight: "700" },
  goalTrack: {
    height: 5,
    backgroundColor: D.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  goalFill: { height: "100%", borderRadius: 3, backgroundColor: D.green },

  // Low stock — flat rows like visit list
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

  // Warn badge
  warnBadge: {
    backgroundColor: D.amberMuted,
    borderRadius: D.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: D.amberBorder,
  },
  warnBadgeText: { color: D.amber, fontSize: 11, fontWeight: "700" },

  // Empty
  emptyBlock: {
    backgroundColor: D.surface,
    borderRadius: D.radius.lg,
    borderWidth: 1,
    borderColor: D.border,
    paddingVertical: 28,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 13, color: D.textMuted, fontWeight: "600" },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: D.border,
    borderBottomWidth: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: D.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: D.text,
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.lg,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: D.radius.md,
    backgroundColor: D.green,
    alignItems: "center",
    justifyContent: "center",
  },
  staffInitials: { color: "#fff", fontSize: 14, fontWeight: "800" },
  staffName: { fontSize: 15, fontWeight: "700", color: D.text },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: D.textSub,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.lg,
    borderWidth: 2,
    borderColor: D.green,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  rupeeSign: {
    fontSize: 24,
    fontWeight: "800",
    color: D.green,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 30,
    fontWeight: "800",
    color: D.text,
    paddingVertical: 14,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: D.green,
    borderRadius: D.radius.lg,
    paddingVertical: 16,
    marginBottom: 10,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { color: D.textMuted, fontSize: 14, fontWeight: "600" },
});
