import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import type { Attendance, StaffMember } from "../types";
import * as supabaseService from "../services/supabaseService";
import bcrypt from "bcryptjs";
import * as ImagePicker from "expo-image-picker";
import * as attendancePhotoService from "../services/attendancePhotoService";

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

const formatTime = (timeString?: string) => {
  if (!timeString) return null;
  return new Date(timeString).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Staff status helpers ─────────────────────────────────────────────────────
const getStaffStatus = (record: Attendance | null | undefined) => {
  if (!record?.checkInTime)
    return { label: "Not marked", color: D.textMuted, bg: D.surfaceAlt, icon: "clock-outline" as const };
  if (!record.checkOutTime)
    return { label: "Checked in", color: D.green, bg: D.greenMuted, icon: "login-variant" as const };
  return { label: "Complete", color: D.blue, bg: D.blueMuted, icon: "check-circle-outline" as const };
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const StaffAttendanceScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers } = useAuth();
  const { attendance, checkIn, checkOut, refreshData } = useData();

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<"checkIn" | "checkOut" | null>(null);

  const isSharedTablet = user?.id === "shared-tablet";

  useEffect(() => {
    refreshData();
    attendancePhotoService.cleanupOldPhotos().catch(() => {});
  }, [refreshData]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayFormatted = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    []
  );

  const todaysAttendanceByStaffId = useMemo(() => {
    const map = new Map<string, Attendance>();
    attendance
      .filter((r) => r.attendanceDate === todayStr)
      .forEach((r) => map.set(r.staffId, r));
    return map;
  }, [attendance, todayStr]);

  const displayableStaff: StaffMember[] = useMemo(() => staffMembers ?? [], [staffMembers]);

  const selectedStaff = useMemo(
    () => displayableStaff.find((s) => s.id === selectedStaffId) ?? null,
    [displayableStaff, selectedStaffId]
  );

  const selectedAttendance = selectedStaff
    ? todaysAttendanceByStaffId.get(selectedStaff.id) ?? null
    : null;

  // Summary counts
  const summary = useMemo(() => {
    let present = 0,
      checkedIn = 0,
      unmarked = 0;
    displayableStaff.forEach((s) => {
      const r = todaysAttendanceByStaffId.get(s.id);
      if (!r?.checkInTime) unmarked++;
      else if (!r.checkOutTime) checkedIn++;
      else present++;
    });
    return { present, checkedIn, unmarked, total: displayableStaff.length };
  }, [displayableStaff, todaysAttendanceByStaffId]);

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId((prev) => (prev === staffId ? null : staffId));
    setPassword("");
    setPendingAction(null);
  };

  const ensureCanPerformAction = (action: "checkIn" | "checkOut"): boolean => {
    if (!selectedStaff) {
      Alert.alert("Select Staff", "Please select a staff member first.");
      return false;
    }
    const record = todaysAttendanceByStaffId.get(selectedStaff.id);
    if (action === "checkIn" && record?.checkInTime) {
      Alert.alert("Already Marked", "Check-in already recorded for today.");
      return false;
    }
    if (action === "checkOut") {
      if (!record?.checkInTime) {
        Alert.alert("Not Checked In", "Please check in before checking out.");
        return false;
      }
      if (record.checkOutTime) {
        Alert.alert("Already Marked", "Check-out already recorded for today.");
        return false;
      }
    }
    return true;
  };

  const openPasswordModal = (action: "checkIn" | "checkOut") => {
    if (!ensureCanPerformAction(action)) return;
    setPendingAction(action);
    setPassword("");
    setPasswordModalVisible(true);
  };

  const verifyStaffPassword = async (staffId: string, plain: string): Promise<boolean> => {
    const staff = await supabaseService.getStaffById(staffId);
    if (!staff?.password_hash) return false;
    return bcrypt.compare(plain, staff.password_hash);
  };

  const handleConfirmPassword = async () => {
    if (!selectedStaff || !pendingAction) {
      setPasswordModalVisible(false);
      return;
    }
    if (!password) {
      Alert.alert("Required", "Please enter your password.");
      return;
    }
    setLoading(true);
    try {
      const isValid = await verifyStaffPassword(selectedStaff.id, password);
      if (!isValid) {
        Alert.alert("Wrong Password", "The password you entered is incorrect.");
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is needed for attendance photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.6,
        base64: false,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) {
        Alert.alert("Cancelled", "Photo not captured. Attendance not updated.");
        return;
      }

      try {
        await attendancePhotoService.savePhotoFromTempUri(result.assets[0].uri, {
          staffId: selectedStaff.id,
          staffName: selectedStaff.name,
          attendanceDate: todayStr,
          type: pendingAction,
        });
      } catch {
        // allow attendance even if photo fails
      }

      if (pendingAction === "checkIn") await checkIn(selectedStaff.id);
      else await checkOut(selectedStaff.id);

      await refreshData();
      setPasswordModalVisible(false);
      setPassword("");
      setPendingAction(null);
      Alert.alert(
        "Done!",
        `${pendingAction === "checkIn" ? "Check-in" : "Check-out"} recorded successfully.`
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update attendance.");
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "staff" || !isSharedTablet) {
    return (
      <View style={s.restrictedContainer}>
        <View style={s.restrictedIcon}>
          <MaterialCommunityIcons
            name="shield-alert-outline"
            size={28}
            color={D.textMuted}
          />
        </View>
        <Text style={s.restrictedTitle}>Restricted Access</Text>
        <Text style={s.restrictedText}>
          This page is only available on the shared salon tablet.
        </Text>
        <TouchableOpacity style={s.restrictedBackBtn} onPress={() => navigation.goBack()}>
          <Text style={s.restrictedBackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={D.text} />
          </TouchableOpacity>
          <View style={s.topBarIcon}>
            <MaterialCommunityIcons name="clock-check-outline" size={18} color={D.green} />
          </View>
          <Text style={s.topBarTitle}>Mark Attendance</Text>
          <View style={s.topBarSpacer} />
        </View>

        {/* ── Date Header ── */}
        <View style={s.dateHeader}>
          <MaterialCommunityIcons name="calendar-today" size={16} color={D.green} />
          <Text style={s.dateText}>{todayFormatted}</Text>
        </View>

        {/* ── Summary Strip ── */}
        <View style={s.summaryStrip}>
          <View style={s.stripStat}>
            <Text style={[s.stripVal, { color: D.blue }]}>{summary.present}</Text>
            <Text style={s.stripLabel}>Complete</Text>
          </View>
          <View style={s.stripDivider} />
          <View style={s.stripStat}>
            <Text style={[s.stripVal, { color: D.green }]}>{summary.checkedIn}</Text>
            <Text style={s.stripLabel}>Checked In</Text>
          </View>
          <View style={s.stripDivider} />
          <View style={s.stripStat}>
            <Text style={[s.stripVal, { color: D.amber }]}>{summary.unmarked}</Text>
            <Text style={s.stripLabel}>Not Marked</Text>
          </View>
        </View>

        {/* ── Staff Grid ── */}
        <SectionLabel>SELECT STAFF MEMBER</SectionLabel>
        <View style={s.staffGrid}>
          {displayableStaff.map((staff) => {
            const record = todaysAttendanceByStaffId.get(staff.id) ?? null;
            const status = getStaffStatus(record);
            const isSelected = selectedStaffId === staff.id;

            return (
              <TouchableOpacity
                key={staff.id}
                style={[s.staffTile, isSelected && s.staffTileActive]}
                onPress={() => handleStaffSelect(staff.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    s.staffAvatar,
                    { backgroundColor: avatarColor(staff.name) },
                    isSelected && s.staffAvatarActive,
                  ]}
                >
                  <Text style={s.staffAvatarText}>{initials(staff.name)}</Text>
                </View>
                <Text
                  style={[s.staffName, isSelected && s.staffNameActive]}
                  numberOfLines={2}
                >
                  {staff.name}
                </Text>
                <View style={[s.staffStatusPill, { backgroundColor: status.bg }]}>
                  <View style={[s.staffStatusDot, { backgroundColor: status.color }]} />
                  <Text style={[s.staffStatusText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
                {isSelected && (
                  <View style={s.staffSelectedBadge}>
                    <MaterialCommunityIcons name="check" size={11} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Selected Staff Action Card ── */}
        {selectedStaff && (
          <View style={s.actionCard}>
            <View style={s.actionCardHeader}>
              <View
                style={[
                  s.actionAvatar,
                  { backgroundColor: avatarColor(selectedStaff.name) },
                ]}
              >
                <Text style={s.actionAvatarText}>{initials(selectedStaff.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionName}>{selectedStaff.name}</Text>
                {selectedStaff.branchName && (
                  <View style={s.branchPill}>
                    <MaterialCommunityIcons
                      name="office-building-outline"
                      size={11}
                      color={D.textMuted}
                    />
                    <Text style={s.branchPillText}>{selectedStaff.branchName}</Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  s.actionStatusChip,
                  { backgroundColor: getStaffStatus(selectedAttendance).bg },
                ]}
              >
                <MaterialCommunityIcons
                  name={getStaffStatus(selectedAttendance).icon}
                  size={12}
                  color={getStaffStatus(selectedAttendance).color}
                />
                <Text
                  style={[
                    s.actionStatusText,
                    { color: getStaffStatus(selectedAttendance).color },
                  ]}
                >
                  {getStaffStatus(selectedAttendance).label}
                </Text>
              </View>
            </View>

            <View style={s.actionDivider} />

            {/* Time Row */}
            <View style={s.timeRow}>
              <View
                style={[
                  s.timeBlock,
                  selectedAttendance?.checkInTime && s.timeBlockActive,
                ]}
              >
                <View
                  style={[
                    s.timeIcon,
                    { backgroundColor: selectedAttendance?.checkInTime ? D.greenMuted : D.surfaceAlt },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="login-variant"
                    size={18}
                    color={selectedAttendance?.checkInTime ? D.green : D.textMuted}
                  />
                </View>
                <Text style={s.timeLabel}>Check In</Text>
                <Text
                  style={[
                    s.timeValue,
                    selectedAttendance?.checkInTime && { color: D.green },
                  ]}
                >
                  {formatTime(selectedAttendance?.checkInTime) ?? "--:--"}
                </Text>
              </View>

              <View style={s.timeArrow}>
                <MaterialCommunityIcons name="arrow-right" size={16} color={D.border} />
              </View>

              <View
                style={[
                  s.timeBlock,
                  selectedAttendance?.checkOutTime && s.timeBlockBlue,
                  selectedAttendance?.checkInTime &&
                    !selectedAttendance?.checkOutTime &&
                    s.timeBlockAmber,
                ]}
              >
                <View
                  style={[
                    s.timeIcon,
                    {
                      backgroundColor: selectedAttendance?.checkOutTime
                        ? D.blueMuted
                        : selectedAttendance?.checkInTime
                        ? D.amberMuted
                        : D.surfaceAlt,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="logout-variant"
                    size={18}
                    color={
                      selectedAttendance?.checkOutTime
                        ? D.blue
                        : selectedAttendance?.checkInTime
                        ? D.amber
                        : D.textMuted
                    }
                  />
                </View>
                <Text style={s.timeLabel}>Check Out</Text>
                <Text
                  style={[
                    s.timeValue,
                    selectedAttendance?.checkOutTime && { color: D.blue },
                    selectedAttendance?.checkInTime &&
                      !selectedAttendance?.checkOutTime && { color: D.amber },
                  ]}
                >
                  {formatTime(selectedAttendance?.checkOutTime) ??
                    (selectedAttendance?.checkInTime ? "Pending" : "--:--")}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            {!selectedAttendance?.checkInTime ? (
              <TouchableOpacity
                style={s.checkInBtn}
                onPress={() => openPasswordModal("checkIn")}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={s.checkInBtnIcon}>
                  <MaterialCommunityIcons name="login-variant" size={20} color={D.green} />
                </View>
                <Text style={s.checkInBtnText}>Check In Now</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            ) : !selectedAttendance?.checkOutTime ? (
              <TouchableOpacity
                style={s.checkOutBtn}
                onPress={() => openPasswordModal("checkOut")}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={s.checkOutBtnIcon}>
                  <MaterialCommunityIcons name="logout-variant" size={20} color={D.amber} />
                </View>
                <Text style={s.checkOutBtnText}>Check Out</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color={D.amber} />
              </TouchableOpacity>
            ) : (
              <View style={s.completeBanner}>
                <MaterialCommunityIcons name="check-circle" size={20} color={D.green} />
                <Text style={s.completeBannerText}>Attendance complete for today</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Today's Overview ── */}
        <SectionLabel>TODAY'S OVERVIEW</SectionLabel>
        <View style={s.overviewCard}>
          {displayableStaff.map((staff, index) => {
            const record = todaysAttendanceByStaffId.get(staff.id) ?? null;
            const status = getStaffStatus(record);
            const isLast = index === displayableStaff.length - 1;

            return (
              <TouchableOpacity
                key={staff.id}
                style={[s.overviewRow, !isLast && s.overviewRowBorder]}
                onPress={() => handleStaffSelect(staff.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    s.overviewAvatar,
                    { backgroundColor: avatarColor(staff.name) },
                  ]}
                >
                  <Text style={s.overviewAvatarText}>{initials(staff.name)}</Text>
                </View>
                <View style={s.overviewInfo}>
                  <Text style={s.overviewName}>{staff.name}</Text>
                  {staff.branchName && (
                    <Text style={s.overviewBranch}>{staff.branchName}</Text>
                  )}
                </View>
                <View style={s.overviewTimes}>
                  {record?.checkInTime && (
                    <View style={s.overviewTimeRow}>
                      <MaterialCommunityIcons
                        name="login-variant"
                        size={10}
                        color={D.green}
                      />
                      <Text style={s.overviewTime}>{formatTime(record.checkInTime)}</Text>
                    </View>
                  )}
                  {record?.checkOutTime && (
                    <View style={s.overviewTimeRow}>
                      <MaterialCommunityIcons
                        name="logout-variant"
                        size={10}
                        color={D.blue}
                      />
                      <Text style={s.overviewTime}>{formatTime(record.checkOutTime)}</Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    s.overviewStatusIcon,
                    { backgroundColor: status.bg, borderColor: status.color + "44" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={status.icon}
                    size={14}
                    color={status.color}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Password Modal ── */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!loading) {
            setPasswordModalVisible(false);
            setPassword("");
            setPendingAction(null);
          }
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />

            <View
              style={[
                s.modalIcon,
                {
                  backgroundColor:
                    pendingAction === "checkIn" ? D.greenMuted : D.amberMuted,
                  borderColor:
                    pendingAction === "checkIn" ? D.greenBorder : D.amberBorder,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={pendingAction === "checkIn" ? "login-variant" : "logout-variant"}
                size={28}
                color={pendingAction === "checkIn" ? D.green : D.amber}
              />
            </View>

            <Text style={s.modalTitle}>
              {pendingAction === "checkIn" ? "Confirm Check In" : "Confirm Check Out"}
            </Text>
            <Text style={s.modalSubtitle}>
              Enter password for{" "}
              <Text style={{ fontWeight: "700", color: D.text }}>
                {selectedStaff?.name}
              </Text>
            </Text>

            <View style={s.modalInputBox}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={18}
                color={D.textMuted}
                style={s.modalInputIcon}
              />
              <TextInput
                style={s.modalInput}
                placeholder="Enter your password"
                placeholderTextColor={D.textMuted}
                secureTextEntry={!passwordVisible}
                value={password}
                editable={!loading}
                onChangeText={setPassword}
                autoFocus
              />
              <TouchableOpacity
                style={s.modalInputEye}
                onPress={() => setPasswordVisible((v) => !v)}
              >
                <MaterialCommunityIcons
                  name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={D.textMuted}
                />
              </TouchableOpacity>
            </View>

            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => {
                  if (!loading) {
                    setPasswordModalVisible(false);
                    setPassword("");
                    setPendingAction(null);
                  }
                }}
                disabled={loading}
              >
                <Text style={s.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.modalConfirmBtn,
                  {
                    backgroundColor:
                      pendingAction === "checkIn" ? D.green : D.amber,
                  },
                ]}
                onPress={handleConfirmPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name={pendingAction === "checkIn" ? "login-variant" : "logout-variant"}
                      size={16}
                      color="#FFF"
                    />
                    <Text style={s.modalConfirmBtnText}>
                      {pendingAction === "checkIn" ? "Check In" : "Check Out"}
                    </Text>
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

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
  topBarSpacer: { width: 36 },

  // Date Header
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  dateText: { fontSize: 14, color: D.textSub, fontWeight: "500" },

  // Summary Strip
  summaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  stripStat: { flex: 1, alignItems: "center", gap: 2 },
  stripDivider: { width: 1, height: 28, backgroundColor: D.border },
  stripVal: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  stripLabel: {
    fontSize: 10,
    color: D.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Staff Grid
  staffGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  staffTile: {
    width: "31%",
    alignItems: "center",
    backgroundColor: D.surface,
    borderRadius: D.radius.lg,
    borderWidth: 1.5,
    borderColor: D.border,
    padding: 12,
    position: "relative",
  },
  staffTileActive: { borderColor: D.green, backgroundColor: D.greenMuted },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: D.radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  staffAvatarActive: { borderWidth: 2, borderColor: D.green },
  staffAvatarText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  staffName: { fontSize: 12, fontWeight: "700", color: D.text, textAlign: "center", marginBottom: 6 },
  staffNameActive: { color: D.green },
  staffStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: D.radius.pill,
  },
  staffStatusDot: { width: 5, height: 5, borderRadius: 3 },
  staffStatusText: { fontSize: 9, fontWeight: "700" },
  staffSelectedBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: D.green,
    alignItems: "center",
    justifyContent: "center",
  },

  // Action Card
  actionCard: {
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    borderWidth: 1,
    borderColor: D.greenBorder,
    padding: 16,
    marginBottom: 24,
  },
  actionCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  actionAvatar: {
    width: 48,
    height: 48,
    borderRadius: D.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionAvatarText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  actionName: { fontSize: 16, fontWeight: "800", color: D.text, letterSpacing: -0.3 },
  branchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  branchPillText: { fontSize: 11, color: D.textMuted },
  actionStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: D.radius.pill,
  },
  actionStatusText: { fontSize: 11, fontWeight: "700" },
  actionDivider: { height: 1, backgroundColor: D.border, marginBottom: 14 },

  // Time Row
  timeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  timeBlock: {
    flex: 1,
    alignItems: "center",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.lg,
    borderWidth: 1,
    borderColor: D.border,
    padding: 12,
  },
  timeBlockActive: { borderColor: D.greenBorder, backgroundColor: D.greenMuted },
  timeBlockBlue: { borderColor: D.blueBorder, backgroundColor: D.blueMuted },
  timeBlockAmber: { borderColor: D.amberBorder, backgroundColor: D.amberMuted },
  timeIcon: {
    width: 36,
    height: 36,
    borderRadius: D.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  timeLabel: { fontSize: 10, color: D.textMuted, fontWeight: "600", letterSpacing: 0.5, marginBottom: 4 },
  timeValue: { fontSize: 16, fontWeight: "800", color: D.textMuted, letterSpacing: -0.3 },
  timeArrow: { width: 24, alignItems: "center" },

  // Action Buttons
  checkInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: D.green,
    borderRadius: D.radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  checkInBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: D.radius.md,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkInBtnText: { flex: 1, fontSize: 15, fontWeight: "800", color: "#FFF" },
  checkOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: D.amberBorder,
  },
  checkOutBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: D.radius.md,
    backgroundColor: D.amberMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOutBtnText: { flex: 1, fontSize: 15, fontWeight: "800", color: D.amber },
  completeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  completeBannerText: { fontSize: 13, fontWeight: "700", color: D.green },

  // Overview Card
  overviewCard: {
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
  },
  overviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  overviewRowBorder: { borderBottomWidth: 1, borderBottomColor: D.border },
  overviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: D.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewAvatarText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  overviewInfo: { flex: 1 },
  overviewName: { fontSize: 14, fontWeight: "700", color: D.text },
  overviewBranch: { fontSize: 11, color: D.textMuted, marginTop: 1 },
  overviewTimes: { alignItems: "flex-end", gap: 2 },
  overviewTimeRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  overviewTime: { fontSize: 11, fontWeight: "600", color: D.textSub },
  overviewStatusIcon: {
    width: 28,
    height: 28,
    borderRadius: D.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  // Restricted Access
  restrictedContainer: {
    flex: 1,
    backgroundColor: D.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
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
  restrictedText: {
    fontSize: 13,
    color: D.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  restrictedBackBtn: {
    backgroundColor: D.green,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: D.radius.pill,
  },
  restrictedBackBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: D.text, marginBottom: 6, textAlign: "center" },
  modalSubtitle: { fontSize: 13, color: D.textMuted, marginBottom: 20, textAlign: "center", lineHeight: 20 },
  modalInputBox: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
    marginBottom: 20,
  },
  modalInputIcon: { marginLeft: 14 },
  modalInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: D.text,
  },
  modalInputEye: { paddingHorizontal: 14 },
  modalBtnRow: { flexDirection: "row", gap: 10, width: "100%" },
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
  },
  modalConfirmBtnText: { fontSize: 14, fontWeight: "800", color: "#FFF" },
});