import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
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

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const AVATAR_COLORS = ["#1E3A5F", "#0D9488", "#059669", "#2563EB", "#7C3AED"];
const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

export const AdminStaffPerformanceScreen: React.FC<Props> = ({
  navigation,
}) => {
  const { user, staffMembers, refreshStaffMembers } = useAuth();
  const { visits } = useData();

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  const staffStats = useMemo(() => {
    const map: Record<
      string,
      {
        name: string;
        customers: number;
        revenue: number;
        servicesCount: number;
        productsCount: number;
        monthlyGoal: number;
      }
    > = {};
    staffMembers.forEach((s) => {
      map[s.id] = {
        name: s.name,
        customers: 0,
        revenue: 0,
        servicesCount: 0,
        productsCount: 0,
        monthlyGoal: s.monthlyGoal || 0,
      };
    });
    visits.forEach((v: any) => {
      if (map[v.staffId]) {
        map[v.staffId].customers += 1;
        map[v.staffId].revenue += v.total;
        map[v.staffId].servicesCount += v.services.length;
        map[v.staffId].productsCount += v.products.reduce(
          (s: number, p: any) => s + p.quantity,
          0,
        );
      }
      v.attendingStaff?.forEach((st: any) => {
        if (map[st.staffId] && st.staffId !== v.staffId) {
          map[st.staffId].customers += 1;
          map[st.staffId].revenue += st.revenueShare;
        }
      });
    });
    return Object.entries(map)
      .map(([staffId, stats]) => ({
        staffId,
        ...stats,
        avgBill: stats.customers > 0 ? stats.revenue / stats.customers : 0,
        goalProgress:
          stats.monthlyGoal > 0
            ? Math.min(100, (stats.revenue / stats.monthlyGoal) * 100)
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [visits, staffMembers]);

  const totalRevenue = useMemo(
    () => staffStats.reduce((s, st) => s + st.revenue, 0),
    [staffStats],
  );
  const totalCustomers = useMemo(
    () => staffStats.reduce((s, st) => s + st.customers, 0),
    [staffStats],
  );

  const openGoalModal = (staffId: string, name: string, current: number) => {
    setSelectedStaffId(staffId);
    setSelectedStaffName(name);
    setGoalInput(current > 0 ? current.toString() : "");
    setGoalModalVisible(true);
  };

  const saveGoal = async () => {
    if (!selectedStaffId) return;
    const val = parseFloat(goalInput);
    if (isNaN(val) || val < 0) {
      Alert.alert("Invalid Goal", "Please enter a valid amount.");
      return;
    }
    setSavingGoal(true);
    try {
      await supabaseService.updateStaffGoal(selectedStaffId, val);
      await refreshStaffMembers();
      setGoalModalVisible(false);
    } catch {
      Alert.alert("Error", "Failed to update goal.");
    } finally {
      setSavingGoal(false);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <View style={s.center}>
        <Text style={{ color: D.red, fontSize: 15, fontWeight: "700" }}>
          Admin access required.
        </Text>
      </View>
    );
  }

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
        <Text style={s.topBarTitle}>Staff Performance</Text>
        <View style={s.topBarCount}>
          <Text style={s.topBarCountText}>{staffStats.length}</Text>
        </View>
      </View>

      {/* ── Summary strip ── */}
      <View style={s.summaryStrip}>
        <View style={s.stripStat}>
          <Text style={s.stripVal}>₹{(totalRevenue / 1000).toFixed(1)}k</Text>
          <Text style={s.stripLabel}>Revenue</Text>
        </View>
        <View style={s.stripDivider} />
        <View style={s.stripStat}>
          <Text style={s.stripVal}>{totalCustomers}</Text>
          <Text style={s.stripLabel}>Customers</Text>
        </View>
        <View style={s.stripDivider} />
        <View style={s.stripStat}>
          <Text style={s.stripVal}>{staffStats.length}</Text>
          <Text style={s.stripLabel}>Staff</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel>PERFORMANCE RANKING</SectionLabel>

        {/* Single white card wrapping all staff rows */}
        <View style={s.listCard}>
          {staffStats.map((st, index) => {
            const isLast = index === staffStats.length - 1;
            const progressColor =
              st.goalProgress >= 100
                ? D.amber
                : st.goalProgress >= 60
                  ? D.green
                  : D.textSub;
            const rankEmoji =
              index === 0
                ? "🥇"
                : index === 1
                  ? "🥈"
                  : index === 2
                    ? "🥉"
                    : null;

            return (
              <View
                key={st.staffId}
                style={[s.staffRow, isLast && s.staffRowLast]}
              >
                {/* ── Top row: avatar + name + revenue ── */}
                <View style={s.staffTop}>
                  <View
                    style={[
                      s.avatar,
                      { backgroundColor: avatarColor(st.name) },
                    ]}
                  >
                    <Text style={s.avatarText}>{initials(st.name)}</Text>
                  </View>

                  <View style={s.staffInfo}>
                    <View style={s.staffNameRow}>
                      <Text style={s.staffName}>{st.name}</Text>
                      {rankEmoji && (
                        <Text style={s.rankEmoji}>{rankEmoji}</Text>
                      )}
                    </View>
                    <Text style={s.staffRank}>Rank #{index + 1}</Text>
                  </View>

                  <View style={s.revenueCol}>
                    <Text style={s.revenueVal}>₹{st.revenue.toFixed(0)}</Text>
                    <Text style={s.revenueLabel}>revenue</Text>
                  </View>
                </View>

                {/* ── Mini stats ── */}
                <View style={s.miniStats}>
                  <View style={s.miniStat}>
                    <Text style={s.miniStatVal}>{st.customers}</Text>
                    <Text style={s.miniStatLabel}>Customers</Text>
                  </View>
                  <View style={s.miniStatDivider} />
                  <View style={s.miniStat}>
                    <Text style={s.miniStatVal}>{st.servicesCount}</Text>
                    <Text style={s.miniStatLabel}>Services</Text>
                  </View>
                  <View style={s.miniStatDivider} />
                  <View style={s.miniStat}>
                    <Text style={s.miniStatVal}>{st.productsCount}</Text>
                    <Text style={s.miniStatLabel}>Products</Text>
                  </View>
                  <View style={s.miniStatDivider} />
                  <View style={s.miniStat}>
                    <Text style={s.miniStatVal}>₹{st.avgBill.toFixed(0)}</Text>
                    <Text style={s.miniStatLabel}>Avg Bill</Text>
                  </View>
                </View>

                {/* ── Goal row ── */}
                <View style={s.goalRow}>
                  {st.monthlyGoal > 0 ? (
                    <>
                      <View style={s.goalMeta}>
                        <Text style={s.goalText}>
                          <Text
                            style={{ color: progressColor, fontWeight: "800" }}
                          >
                            ₹{st.revenue.toFixed(0)}
                          </Text>
                          <Text style={{ color: D.textMuted }}>
                            {" "}
                            / ₹{st.monthlyGoal}
                          </Text>
                        </Text>
                        <View style={s.goalRight}>
                          <Text style={[s.goalPct, { color: progressColor }]}>
                            {Math.round(st.goalProgress)}%
                          </Text>
                          <TouchableOpacity
                            style={s.editBtn}
                            onPress={() =>
                              openGoalModal(st.staffId, st.name, st.monthlyGoal)
                            }
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons
                              name="pencil"
                              size={12}
                              color={D.green}
                            />
                            <Text style={s.editBtnText}>Edit</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={s.barBg}>
                        <View
                          style={[
                            s.barFill,
                            {
                              width:
                                `${Math.min(st.goalProgress, 100)}%` as any,
                              backgroundColor: progressColor,
                            },
                          ]}
                        />
                      </View>
                      {st.goalProgress >= 100 && (
                        <View style={s.achievedBanner}>
                          <MaterialCommunityIcons
                            name="check-circle-outline"
                            size={13}
                            color={D.green}
                          />
                          <Text style={s.achievedText}>Goal achieved! 🎉</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <TouchableOpacity
                      style={s.setGoalBtn}
                      onPress={() => openGoalModal(st.staffId, st.name, 0)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name="target"
                        size={14}
                        color={D.green}
                      />
                      <Text style={s.setGoalText}>Set a monthly goal</Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={14}
                        color={D.green}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Goal Modal ── */}
      <Modal
        visible={goalModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.sheet}>
            <View style={s.handle} />

            <View style={s.sheetHeader}>
              <View style={s.sheetIconBox}>
                <MaterialCommunityIcons
                  name="target"
                  size={18}
                  color={D.green}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>Monthly Goal</Text>
                <Text style={s.sheetSub}>{selectedStaffName}</Text>
              </View>
              <TouchableOpacity
                style={s.closeBtn}
                onPress={() => setGoalModalVisible(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={D.textSub}
                />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLabel}>Target Amount (₹)</Text>
            <View style={s.inputBox}>
              <MaterialCommunityIcons
                name="currency-inr"
                size={18}
                color={D.textMuted}
                style={{ marginLeft: 14 }}
              />
              <TextInput
                style={s.input}
                keyboardType="numeric"
                placeholder="e.g. 50000"
                placeholderTextColor={D.textMuted}
                value={goalInput}
                onChangeText={setGoalInput}
                selectionColor={D.green}
                autoFocus
              />
            </View>

            {goalInput && !isNaN(+goalInput) && +goalInput > 0 && (
              <View style={s.previewBanner}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={14}
                  color={D.green}
                />
                <Text style={s.previewText}>
                  Goal:{" "}
                  <Text style={{ color: D.text, fontWeight: "800" }}>
                    ₹{(+goalInput).toLocaleString("en-IN")}
                  </Text>
                </Text>
              </View>
            )}

            <View style={s.sheetBtnRow}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setGoalModalVisible(false)}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, savingGoal && { opacity: 0.6 }]}
                onPress={saveGoal}
                disabled={savingGoal}
                activeOpacity={0.85}
              >
                {savingGoal ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color="#fff"
                    />
                    <Text style={s.saveBtnText}>Save Goal</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

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

  // List
  listContent: { padding: 16, paddingBottom: 52 },

  // Single white card
  listCard: {
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    borderWidth: 1,
    borderColor: D.border,
  },

  // Staff rows
  staffRow: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F4",
    gap: 12,
  },
  staffRowLast: { borderBottomWidth: 0 },

  // Top: avatar + name + revenue
  staffTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  staffInfo: { flex: 1, minWidth: 0 },
  staffNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  staffName: { fontSize: 14, fontWeight: "700", color: D.text },
  rankEmoji: { fontSize: 14 },
  staffRank: {
    fontSize: 11,
    color: D.textMuted,
    fontWeight: "500",
    marginTop: 1,
  },
  revenueCol: { alignItems: "flex-end", flexShrink: 0 },
  revenueVal: {
    fontSize: 15,
    fontWeight: "800",
    color: D.green,
    letterSpacing: -0.5,
  },
  revenueLabel: {
    fontSize: 10,
    color: D.textMuted,
    fontWeight: "600",
    marginTop: 1,
  },

  // Mini stats
  miniStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.md,
    paddingVertical: 10,
  },
  miniStat: { flex: 1, alignItems: "center", gap: 2 },
  miniStatDivider: { width: 1, height: 24, backgroundColor: D.border },
  miniStatVal: { fontSize: 13, fontWeight: "800", color: D.text },
  miniStatLabel: {
    fontSize: 9,
    color: D.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Goal
  goalRow: { gap: 6 },
  goalMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalText: { fontSize: 12 },
  goalRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  goalPct: { fontSize: 12, fontWeight: "800" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: D.greenMuted,
    borderWidth: 1,
    borderColor: D.greenBorder,
    borderRadius: D.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  editBtnText: { fontSize: 11, fontWeight: "700", color: D.green },
  barBg: {
    height: 5,
    backgroundColor: D.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
  achievedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  achievedText: { fontSize: 12, fontWeight: "700", color: D.green },
  setGoalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  setGoalText: { flex: 1, fontSize: 13, fontWeight: "600", color: D.green },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: D.surface,
    borderTopLeftRadius: D.radius.xxl,
    borderTopRightRadius: D.radius.xxl,
    padding: 20,
    paddingBottom: Platform.select({ ios: 40, android: 28, default: 28 }),
    borderTopWidth: 1,
    borderColor: D.border,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: D.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  sheetIconBox: {
    width: 40,
    height: 40,
    borderRadius: D.radius.md,
    backgroundColor: D.greenMuted,
    borderWidth: 1,
    borderColor: D.greenBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: D.text,
    letterSpacing: -0.3,
  },
  sheetSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: D.radius.sm,
    backgroundColor: D.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: D.text,
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.md,
    borderWidth: 1.5,
    borderColor: D.border,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 22,
    color: D.text,
    fontWeight: "800",
  },
  previewBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: D.greenBorder,
    marginBottom: 20,
  },
  previewText: { fontSize: 13, color: D.textSub, fontWeight: "600" },
  sheetBtnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: D.radius.lg,
    backgroundColor: D.surfaceAlt,
    alignItems: "center",
    borderWidth: 1,
    borderColor: D.border,
  },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: D.textSub },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: D.radius.lg,
    backgroundColor: D.green,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
