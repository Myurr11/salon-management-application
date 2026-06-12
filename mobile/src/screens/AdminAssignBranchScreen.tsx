import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import bcrypt from "bcryptjs";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import * as supabaseService from "../services/supabaseService";
import type { Branch, StaffMember } from "../types";

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

interface StaffWithBranch extends StaffMember {
  selectedBranchId: string | null;
  newPassword: string;
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

export const AdminAssignBranchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { branches, refreshData } = useData();
  const [staffList, setStaffList] = useState<StaffWithBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const members = await supabaseService.getStaffMembers();
        setStaffList(
          members.map((m) => ({
            ...m,
            selectedBranchId: m.branchId ?? null,
            newPassword: "",
          }))
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateBranch = (staffId: string, branchId: string | null) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, selectedBranchId: branchId } : s))
    );
  };

  const setPasswordField = (staffId: string, value: string) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, newPassword: value } : s))
    );
  };

  const saveStaff = async (staff: StaffWithBranch) => {
    if (!user || user.role !== "admin") return;
    setSavingId(staff.id);
    try {
      await supabaseService.updateStaffBranch(staff.id, staff.selectedBranchId);
      if (staff.newPassword.trim().length >= 6) {
        const hash = bcrypt.hashSync(staff.newPassword.trim(), 10);
        await supabaseService.updateStaffPassword(staff.id, hash);
        setStaffList((prev) =>
          prev.map((s) => (s.id === staff.id ? { ...s, newPassword: "" } : s))
        );
      }
      await refreshData();
      Alert.alert("Saved", "Branch and password updated.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save.");
    } finally {
      setSavingId(null);
    }
  };

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

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={D.green} />
        <Text style={s.loadingText}>Loading staff members...</Text>
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
        <View style={s.topBarIcon}>
          <MaterialCommunityIcons name="office-building-outline" size={18} color={D.green} />
        </View>
        <Text style={s.topBarTitle}>Assign Branches</Text>
        <View style={s.topBarBadge}>
          <Text style={s.topBarBadgeText}>{staffList.length}</Text>
        </View>
      </View>

      {/* ── Summary Strip ── */}
      <View style={s.summaryStrip}>
        <View style={s.stripStat}>
          <Text style={s.stripVal}>{staffList.length}</Text>
          <Text style={s.stripLabel}>Staff Members</Text>
        </View>
        <View style={s.stripDivider} />
        <View style={s.stripStat}>
          <Text style={s.stripVal}>
            {staffList.filter((s) => s.selectedBranchId).length}
          </Text>
          <Text style={s.stripLabel}>Assigned</Text>
        </View>
        <View style={s.stripDivider} />
        <View style={s.stripStat}>
          <Text style={s.stripVal}>
            {staffList.filter((s) => !s.selectedBranchId).length}
          </Text>
          <Text style={s.stripLabel}>Unassigned</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel>STAFF BRANCH ASSIGNMENT</SectionLabel>

        {staffList.map((staff, index) => {
          const isFirst = index === 0;
          const isLast = index === staffList.length - 1;
          const assignedBranch = branches.find((b) => b.id === staff.selectedBranchId);

          return (
            <View
              key={staff.id}
              style={[
                s.staffCard,
                isFirst && s.staffCardFirst,
                isLast && s.staffCardLast,
              ]}
            >
              {/* Card Header */}
              <View style={s.cardHeader}>
                <View
                  style={[
                    s.staffAvatar,
                    { backgroundColor: avatarColor(staff.name) },
                  ]}
                >
                  <Text style={s.staffAvatarText}>{initials(staff.name)}</Text>
                </View>
                <View style={s.staffInfo}>
                  <Text style={s.staffName}>{staff.name}</Text>
                  {staff.username && (
                    <View style={s.usernameChip}>
                      <MaterialCommunityIcons
                        name="account-outline"
                        size={12}
                        color={D.textMuted}
                      />
                      <Text style={s.usernameText}>{staff.username}</Text>
                    </View>
                  )}
                </View>
                {staff.selectedBranchId && assignedBranch && (
                  <View style={s.assignedBadge}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={14}
                      color={D.green}
                    />
                    <Text style={s.assignedBadgeText}>{assignedBranch.name}</Text>
                  </View>
                )}
              </View>

              <View style={s.cardDivider} />

              {/* Branch Selection */}
              <Text style={s.sectionLabel}>Branch Assignment</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.branchScroll}
              >
                {branches.map((b) => {
                  const isActive = staff.selectedBranchId === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[s.branchChip, isActive && s.branchChipActive]}
                      onPress={() => updateBranch(staff.id, b.id)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name={isActive ? "check-circle" : "office-building-outline"}
                        size={14}
                        color={isActive ? "#FFF" : D.textMuted}
                      />
                      <Text
                        style={[s.branchChipText, isActive && s.branchChipTextActive]}
                      >
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    s.branchChip,
                    staff.selectedBranchId === null && s.branchChipActive,
                  ]}
                  onPress={() => updateBranch(staff.id, null)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={staff.selectedBranchId === null ? "check-circle" : "circle-outline"}
                    size={14}
                    color={staff.selectedBranchId === null ? "#FFF" : D.textMuted}
                  />
                  <Text
                    style={[
                      s.branchChipText,
                      staff.selectedBranchId === null && s.branchChipTextActive,
                    ]}
                  >
                    Unassigned
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Password Field */}
              <Text style={s.sectionLabel}>New Password (optional)</Text>
              <View style={s.passwordBox}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={18}
                  color={D.textMuted}
                  style={s.passwordIcon}
                />
                <TextInput
                  style={s.passwordInput}
                  placeholder="Leave blank to keep current"
                  placeholderTextColor={D.textMuted}
                  value={staff.newPassword}
                  onChangeText={(v) => setPasswordField(staff.id, v)}
                  secureTextEntry
                />
                {staff.newPassword.length > 0 && (
                  <View style={s.passwordHint}>
                    <MaterialCommunityIcons
                      name={
                        staff.newPassword.length >= 6
                          ? "check-circle"
                          : "alert-circle"
                      }
                      size={14}
                      color={
                        staff.newPassword.length >= 6 ? D.green : D.amber
                      }
                    />
                  </View>
                )}
              </View>

              {/* Save Button - Now Green */}
              <TouchableOpacity
                style={s.saveBtn}
                onPress={() => saveStaff(staff)}
                disabled={savingId === staff.id}
                activeOpacity={0.85}
              >
                {savingId === staff.id ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <View style={s.saveBtnIcon}>
                      <MaterialCommunityIcons name="content-save" size={16} color="#FFF" />
                    </View>
                    <Text style={s.saveBtnText}>Save Changes</Text>
                    <MaterialCommunityIcons name="arrow-right" size={16} color="rgba(255,255,255,0.6)" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },

  // Center / Loading / Restricted
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

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16, gap: 12 },

  // Page hint
  pageHint: {
    fontSize: 12,
    color: D.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },

  // Staff Card
  staffCard: {
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.border,
    padding: 16,
  },
  staffCardFirst: {
    borderTopLeftRadius: D.radius.xl,
    borderTopRightRadius: D.radius.xl,
  },
  staffCardLast: {
    borderBottomLeftRadius: D.radius.xl,
    borderBottomRightRadius: D.radius.xl,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  staffAvatar: {
    width: 44,
    height: 44,
    borderRadius: D.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  staffAvatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 15, fontWeight: "700", color: D.text, marginBottom: 4 },
  usernameChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: D.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: D.radius.pill,
  },
  usernameText: { fontSize: 11, color: D.textMuted },
  assignedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: D.greenMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  assignedBadgeText: { fontSize: 11, fontWeight: "600", color: D.green },
  cardDivider: { height: 1, backgroundColor: D.border, marginBottom: 14 },

  // Section Label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: D.textSub,
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: "uppercase",
  },

  // Branch Chips
  branchScroll: { gap: 8, paddingBottom: 4, marginBottom: 14 },
  branchChip: {
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
  branchChipActive: { backgroundColor: D.green, borderColor: D.green },
  branchChipText: { fontSize: 12, fontWeight: "600", color: D.textSub },
  branchChipTextActive: { color: "#FFF" },

  // Password Input
  passwordBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
    marginBottom: 16,
  },
  passwordIcon: { marginLeft: 12 },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
    color: D.text,
  },
  passwordHint: { paddingRight: 12 },

  // Save Button - Green primary color
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: D.green,
    borderRadius: D.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  saveBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: D.radius.sm,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { flex: 1, fontSize: 14, fontWeight: "800", color: "#FFF" },
});