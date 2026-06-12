import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import type { UdhaarBalance } from "../types";

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

export const AdminUdhaarScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { branches, getUdhaarBalances, addUdhaarPayment } = useData();
  const [balances, setBalances] = useState<UdhaarBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [payingBalance, setPayingBalance] = useState<UdhaarBalance | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadBalances = async () => {
    setLoading(true);
    try {
      const list = await getUdhaarBalances(
        selectedBranchId ? { branchId: selectedBranchId } : undefined,
      );
      setBalances(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, [selectedBranchId, getUdhaarBalances]);

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

  const totalOutstanding = balances.reduce((sum, b) => sum + b.outstandingAmount, 0);

  const handlePay = (balance: UdhaarBalance) => {
    setPayingBalance(balance);
    setPaymentAmount("");
    setPaymentNotes("");
    setModalVisible(true);
  };

  const submitPayment = async () => {
    if (!payingBalance) return;
    const amount = Number(paymentAmount.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid payment amount.");
      return;
    }
    if (amount > payingBalance.outstandingAmount) {
      Alert.alert("Too high", "Payment cannot exceed outstanding amount.");
      return;
    }
    setSubmitting(true);
    try {
      await addUdhaarPayment(
        payingBalance.customerId,
        payingBalance.branchId,
        amount,
        paymentNotes.trim() || undefined,
      );
      setModalVisible(false);
      setPayingBalance(null);
      loadBalances();
      Alert.alert("Success", "Payment recorded successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
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
        <View style={s.topBarIcon}>
          <MaterialCommunityIcons name="handshake" size={18} color={D.green} />
        </View>
        <Text style={s.topBarTitle}>Udhaar</Text>
        <View style={s.topBarBadge}>
          <Text style={s.topBarBadgeText}>{balances.length}</Text>
        </View>
      </View>

      {/* ── Summary Strip ── */}
      <View style={s.summaryStrip}>
        <View style={s.stripStat}>
          <Text style={[s.stripVal, { color: D.amber }]}>₹{totalOutstanding.toFixed(0)}</Text>
          <Text style={s.stripLabel}>Total Outstanding</Text>
        </View>
        <View style={s.stripDivider} />
        <View style={s.stripStat}>
          <Text style={s.stripVal}>{balances.length}</Text>
          <Text style={s.stripLabel}>Customers</Text>
        </View>
        <View style={s.stripDivider} />
        <View style={s.stripStat}>
          <Text style={s.stripVal}>
            {balances.filter((b) => b.dueDate && new Date(b.dueDate) < new Date()).length}
          </Text>
          <Text style={s.stripLabel}>Overdue</Text>
        </View>
      </View>

      {/* ── Branch Filter ── */}
      {branches.length > 1 && (
        <View style={s.filterWrap}>
          <SectionLabel>FILTER BY BRANCH</SectionLabel>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterScroll}
          >
            <TouchableOpacity
              style={[s.filterChip, !selectedBranchId && s.filterChipActive]}
              onPress={() => setSelectedBranchId(null)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={!selectedBranchId ? "check" : "office-building-outline"}
                size={14}
                color={!selectedBranchId ? "#FFF" : D.textMuted}
                style={s.filterChipIcon}
              />
              <Text style={[s.filterChipText, !selectedBranchId && s.filterChipTextActive]}>
                All Branches
              </Text>
            </TouchableOpacity>
            {branches.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[s.filterChip, selectedBranchId === b.id && s.filterChipActive]}
                onPress={() => setSelectedBranchId(b.id)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={selectedBranchId === b.id ? "check" : "office-building-outline"}
                  size={14}
                  color={selectedBranchId === b.id ? "#FFF" : D.textMuted}
                  style={s.filterChipIcon}
                />
                <Text
                  style={[s.filterChipText, selectedBranchId === b.id && s.filterChipTextActive]}
                >
                  {b.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Content ── */}
      {loading ? (
        <View style={s.centerInline}>
          <ActivityIndicator size="large" color={D.green} />
          <Text style={s.loadingText}>Loading udhaar balances...</Text>
        </View>
      ) : balances.length === 0 ? (
        <View style={s.emptyBlock}>
          <View style={s.emptyIcon}>
            <MaterialCommunityIcons name="handshake" size={32} color={D.textMuted} />
          </View>
          <Text style={s.emptyTitle}>No outstanding udhaar</Text>
          <Text style={s.emptyHint}>
            {selectedBranchId
              ? "This branch has no pending udhaar payments"
              : "All customers have cleared their udhaar"}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionLabel>
            {`${selectedBranchId ? "BRANCH UDHAAR" : "ALL UDHAAR"} • ${balances.length} CUSTOMER${balances.length !== 1 ? "S" : ""}`}
          </SectionLabel>

          {balances.map((balance, index) => {
            const isOverdue = balance.dueDate && new Date(balance.dueDate) < new Date();
            const isFirst = index === 0;
            const isLast = index === balances.length - 1;

            return (
              <View
                key={balance.id}
                style={[
                  s.udhaarCard,
                  isFirst && s.udhaarCardFirst,
                  isLast && s.udhaarCardLast,
                ]}
              >
                <View style={s.cardHeader}>
                  <View
                    style={[
                      s.customerAvatar,
                      { backgroundColor: avatarColor(balance.customerName || "U") },
                    ]}
                  >
                    <Text style={s.customerAvatarText}>
                      {initials(balance.customerName || "Unknown")}
                    </Text>
                  </View>
                  <View style={s.customerInfo}>
                    <Text style={s.customerName} numberOfLines={1}>
                      {balance.customerName || balance.customerId}
                    </Text>
                    {balance.branchName && (
                      <View style={s.branchChip}>
                        <MaterialCommunityIcons
                          name="office-building-outline"
                          size={11}
                          color={D.textMuted}
                        />
                        <Text style={s.branchText}>{balance.branchName}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.amountBox}>
                    <Text style={s.amountLabel}>Due</Text>
                    <Text style={[s.amountValue, isOverdue && { color: D.red }]}>
                      ₹{balance.outstandingAmount.toFixed(0)}
                    </Text>
                  </View>
                </View>

                {balance.dueDate && (
                  <View style={[s.dueRow, isOverdue && s.dueRowOverdue]}>
                    <MaterialCommunityIcons
                      name="calendar-clock"
                      size={14}
                      color={isOverdue ? D.red : D.amber}
                    />
                    <Text style={[s.dueDate, isOverdue && { color: D.red }]}>
                      Due: {new Date(balance.dueDate).toLocaleDateString("en-IN")}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={s.payBtn}
                  onPress={() => handlePay(balance)}
                  activeOpacity={0.85}
                >
                  <View style={s.payBtnIcon}>
                    <MaterialCommunityIcons name="cash-check" size={16} color={D.green} />
                  </View>
                  <Text style={s.payBtnText}>Record Payment</Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Payment Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!submitting) {
            setModalVisible(false);
            setPayingBalance(null);
          }
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />

            <View style={s.modalIcon}>
              <MaterialCommunityIcons name="cash-check" size={32} color={D.green} />
            </View>

            <Text style={s.modalTitle}>Record Payment</Text>
            <Text style={s.modalSubtitle}>
              Enter payment details for{" "}
              <Text style={{ fontWeight: "700", color: D.text }}>
                {payingBalance?.customerName}
              </Text>
            </Text>

            <Text style={s.modalOutstanding}>
              Outstanding: ₹{payingBalance?.outstandingAmount.toFixed(0)}
            </Text>

            <View style={s.modalInputBox}>
              <MaterialCommunityIcons
                name="currency-inr"
                size={18}
                color={D.textMuted}
                style={s.modalInputIcon}
              />
              <TextInput
                style={s.modalInput}
                placeholder="Payment amount"
                placeholderTextColor={D.textMuted}
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                autoFocus
              />
            </View>

            <View style={s.modalInputBox}>
              <MaterialCommunityIcons
                name="note-text-outline"
                size={18}
                color={D.textMuted}
                style={s.modalInputIcon}
              />
              <TextInput
                style={s.modalInput}
                placeholder="Notes (optional)"
                placeholderTextColor={D.textMuted}
                value={paymentNotes}
                onChangeText={setPaymentNotes}
              />
            </View>

            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => {
                  if (!submitting) {
                    setModalVisible(false);
                    setPayingBalance(null);
                  }
                }}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Text style={s.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirmBtn, submitting && { opacity: 0.6 }]}
                onPress={submitPayment}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                    <Text style={s.modalConfirmBtnText}>Record Payment</Text>
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
  centerInline: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  loadingText: { fontSize: 13, color: D.textMuted, marginTop: 12 },

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
  topBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: D.text,
    letterSpacing: -0.3,
  },
  topBarBadge: {
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  topBarBadgeText: { fontSize: 12, fontWeight: "700", color: D.green },

  // Summary Strip
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
  stripVal: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  stripLabel: {
    fontSize: 10,
    color: D.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Filter
  filterWrap: {
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  filterScroll: { gap: 8, paddingBottom: 4 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    borderColor: D.border,
  },
  filterChipActive: { backgroundColor: D.green, borderColor: D.green },
  filterChipIcon: { marginRight: 2 },
  filterChipText: { fontSize: 12, fontWeight: "600", color: D.textSub },
  filterChipTextActive: { color: "#FFF" },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16, gap: 12 },

  // Udhaar Card
  udhaarCard: {
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.border,
    padding: 16,
  },
  udhaarCardFirst: {
    borderTopLeftRadius: D.radius.xl,
    borderTopRightRadius: D.radius.xl,
  },
  udhaarCardLast: {
    borderBottomLeftRadius: D.radius.xl,
    borderBottomRightRadius: D.radius.xl,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: D.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  customerAvatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: "700", color: D.text, marginBottom: 4 },
  branchChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: D.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: D.radius.pill,
  },
  branchText: { fontSize: 11, color: D.textMuted },
  amountBox: { alignItems: "flex-end" },
  amountLabel: { fontSize: 10, color: D.textMuted, fontWeight: "600", marginBottom: 2 },
  amountValue: { fontSize: 18, fontWeight: "800", color: D.amber, letterSpacing: -0.3 },

  // Due row
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: D.amberMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: D.radius.md,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  dueRowOverdue: { backgroundColor: D.redMuted },
  dueDate: { fontSize: 12, fontWeight: "600", color: D.amber },

  // Pay Button
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: D.text,
    borderRadius: D.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  payBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: D.radius.sm,
    backgroundColor: D.greenMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnText: { flex: 1, fontSize: 14, fontWeight: "800", color: "#FFF" },

  // Empty state
  emptyBlock: {
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
    borderWidth: 1,
    borderColor: D.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: D.text, marginBottom: 8 },
  emptyHint: { fontSize: 13, color: D.textMuted, textAlign: "center", lineHeight: 20 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: D.surface,
    borderTopLeftRadius: D.radius.xxl,
    borderTopRightRadius: D.radius.xxl,
    padding: 20,
    paddingBottom: Platform.select({ ios: 36, android: 24, default: 24 }),
    borderTopWidth: 1,
    borderColor: D.border,
    alignItems: "center",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: D.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: D.radius.xl,
    backgroundColor: D.greenMuted,
    borderWidth: 2,
    borderColor: D.greenBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: D.text, marginBottom: 6, textAlign: "center" },
  modalSubtitle: { fontSize: 13, color: D.textMuted, marginBottom: 16, textAlign: "center", lineHeight: 20 },
  modalOutstanding: {
    fontSize: 14,
    fontWeight: "700",
    color: D.amber,
    backgroundColor: D.amberMuted,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: D.radius.pill,
    marginBottom: 20,
  },
  modalInputBox: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
    marginBottom: 12,
  },
  modalInputIcon: { marginLeft: 14 },
  modalInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: D.text,
  },
  modalBtnRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 8 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: D.radius.lg,
    backgroundColor: D.surfaceAlt,
    borderWidth: 1,
    borderColor: D.border,
    alignItems: "center",
  },
  modalCancelBtnText: { fontSize: 14, fontWeight: "700", color: D.textSub },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: D.radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: D.green,
  },
  modalConfirmBtnText: { fontSize: 14, fontWeight: "800", color: "#FFF" },
});