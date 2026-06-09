import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { DatePickerField } from "../components/DatePickerField";
import { useData } from "../context/DataContext";
import type { Attendance } from "../types";
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

// ─── Status config ────────────────────────────────────────────────────────────
const getStatusCfg = (status: string) => {
  switch (status) {
    case "present":
      return {
        label: "Present",
        color: D.green,
        bg: D.greenMuted,
        border: D.greenBorder,
        icon: "check-circle-outline",
      };
    case "late":
      return {
        label: "Late",
        color: D.amber,
        bg: D.amberMuted,
        border: D.amberBorder,
        icon: "clock-alert-outline",
      };
    case "half_day":
      return {
        label: "Half Day",
        color: D.blue,
        bg: D.blueMuted,
        border: D.blueBorder,
        icon: "circle-half-full",
      };
    case "absent":
      return {
        label: "Absent",
        color: D.red,
        bg: D.redMuted,
        border: D.redBorder,
        icon: "close-circle-outline",
      };
    default:
      return {
        label: "Unknown",
        color: D.textMuted,
        bg: D.surfaceAlt,
        border: D.border,
        icon: "help-circle-outline",
      };
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const formatTime = (t?: string) =>
  t
    ? new Date(t).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

const calcHours = (checkIn?: string, checkOut?: string) => {
  if (!checkIn || !checkOut) return null;
  return (
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
    3600000
  ).toFixed(1);
};

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

export const AdminAttendanceScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers } = useAuth();
  const { getAttendance } = useData();

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoMap, setPhotoMap] = useState<
    Record<string, attendancePhotoService.AttendancePhotoMeta[]>
  >({});
  const [selectedPhoto, setSelectedPhoto] =
    useState<attendancePhotoService.AttendancePhotoMeta | null>(null);

  useEffect(() => {
    loadAttendance();
  }, [selectedStaffId, selectedDate]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const filters: any = { date: selectedDate };
      if (selectedStaffId) filters.staffId = selectedStaffId;
      const data = await getAttendance(filters);
      setRecords(data);
      await attendancePhotoService.cleanupOldPhotos().catch(() => {});
      const map: Record<string, attendancePhotoService.AttendancePhotoMeta[]> =
        {};
      for (const r of data) {
        const photos = await attendancePhotoService.getPhotosForAttendance(
          r.staffId,
          r.attendanceDate,
        );
        if (photos.length > 0) map[r.id] = photos;
      }
      setPhotoMap(map);
    } catch (e) {
      console.error("Error loading attendance:", e);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const present = records.filter((r) => r.status === "present").length;
    const late = records.filter((r) => r.status === "late").length;
    const halfDay = records.filter((r) => r.status === "half_day").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const totalHrs = records.reduce((s, r) => {
      const h = parseFloat(calcHours(r.checkInTime, r.checkOutTime) ?? "0");
      return s + (isNaN(h) ? 0 : h);
    }, 0);
    return { present, late, halfDay, absent, totalHrs };
  }, [records]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  if (!user || user.role !== "admin") {
    return (
      <View style={s.center}>
        <View style={s.emptyIcon}>
          <MaterialCommunityIcons
            name="shield-alert-outline"
            size={28}
            color={D.textMuted}
          />
        </View>
        <Text style={s.emptyTitle}>Admin Access Required</Text>
      </View>
    );
  }

  // ── Render attendance row ──
  const renderItem = ({ item, index }: { item: Attendance; index: number }) => {
    const cfg = getStatusCfg(item.status);
    const photos = photoMap[item.id] ?? [];
    const checkIn = formatTime(item.checkInTime);
    const checkOut = formatTime(item.checkOutTime);
    const hours = calcHours(item.checkInTime, item.checkOutTime);
    const isLast = index === records.length - 1;

    return (
      <View style={[ar.row, isLast && ar.rowLast]}>
        {/* Avatar */}
        <View
          style={[ar.avatar, { backgroundColor: avatarColor(item.staffName) }]}
        >
          <Text style={ar.avatarText}>{initials(item.staffName)}</Text>
        </View>

        {/* Centre content */}
        <View style={ar.body}>
          {/* Name + status */}
          <View style={ar.nameRow}>
            <Text style={ar.name} numberOfLines={1}>
              {item.staffName}
            </Text>
            <View
              style={[
                ar.statusPill,
                { backgroundColor: cfg.bg, borderColor: cfg.border },
              ]}
            >
              <View style={[ar.statusDot, { backgroundColor: cfg.color }]} />
              <Text style={[ar.statusText, { color: cfg.color }]}>
                {cfg.label}
              </Text>
            </View>
          </View>

          {/* Time row */}
          <View style={ar.timeRow}>
            {/* Check in */}
            <View style={ar.timeItem}>
              <MaterialCommunityIcons
                name="login-variant"
                size={12}
                color={checkIn ? D.green : D.textMuted}
              />
              <Text
                style={[ar.timeVal, { color: checkIn ? D.green : D.textMuted }]}
              >
                {checkIn ?? "--:--"}
              </Text>
            </View>

            <Text style={ar.timeSep}>→</Text>

            {/* Check out */}
            <View style={ar.timeItem}>
              <MaterialCommunityIcons
                name="logout-variant"
                size={12}
                color={checkOut ? D.blue : checkIn ? D.amber : D.textMuted}
              />
              <Text
                style={[
                  ar.timeVal,
                  {
                    color: checkOut ? D.blue : checkIn ? D.amber : D.textMuted,
                  },
                ]}
              >
                {checkOut ?? (checkIn ? "Pending" : "--:--")}
              </Text>
            </View>

            {hours && (
              <>
                <Text style={ar.timeSep}>·</Text>
                <Text style={[ar.timeVal, { color: D.textSub }]}>{hours}h</Text>
              </>
            )}
          </View>

          {/* Photo badge */}
          {photos.length > 0 && (
            <TouchableOpacity
              style={ar.photoBadge}
              onPress={() => setSelectedPhoto(photos[photos.length - 1])}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="camera-outline"
                size={12}
                color={D.green}
              />
              <Text style={ar.photoBadgeText}>View photo</Text>
            </TouchableOpacity>
          )}
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
        <Text style={s.topBarTitle}>Attendance</Text>
        {!loading && records.length > 0 && (
          <View style={s.hrsBadge}>
            <Text style={s.hrsBadgeLabel}>Total hrs</Text>
            <Text style={s.hrsBadgeVal}>{summary.totalHrs.toFixed(1)}h</Text>
          </View>
        )}
      </View>

      {/* ── Filters panel ── */}
      <View style={s.filtersPanel}>
        {/* Date row */}
        <View style={s.dateRow}>
          <View style={s.dateIcon}>
            <MaterialCommunityIcons
              name="calendar-outline"
              size={16}
              color={D.green}
            />
          </View>
          <DatePickerField
            value={selectedDate}
            onChange={setSelectedDate}
            placeholder="Select date"
            style={s.datePicker}
          />
        </View>

        {/* Staff chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
        >
          {[{ id: null, name: "All Staff" }, ...staffMembers].map(
            (staff: any) => {
              const active = selectedStaffId === staff.id;
              return (
                <TouchableOpacity
                  key={staff.id ?? "all"}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setSelectedStaffId(staff.id)}
                  activeOpacity={0.8}
                >
                  {staff.id ? (
                    <View
                      style={[
                        s.chipAvatar,
                        {
                          backgroundColor: active
                            ? D.green
                            : avatarColor(staff.name),
                        },
                      ]}
                    >
                      <Text style={s.chipAvatarText}>
                        {initials(staff.name)}
                      </Text>
                    </View>
                  ) : (
                    <MaterialCommunityIcons
                      name="account-group-outline"
                      size={14}
                      color={active ? D.green : D.textMuted}
                    />
                  )}
                  <Text style={[s.chipText, active && s.chipTextActive]}>
                    {staff.id ? staff.name.split(" ")[0] : "All"}
                  </Text>
                  {active && (
                    <MaterialCommunityIcons
                      name="check"
                      size={11}
                      color={D.green}
                    />
                  )}
                </TouchableOpacity>
              );
            },
          )}
        </ScrollView>
      </View>

      {/* ── Summary strip ── */}
      {!loading && records.length > 0 && (
        <View style={s.summaryStrip}>
          {[
            {
              label: "Present",
              value: summary.present,
              color: D.green,
              bg: D.greenMuted,
              border: D.greenBorder,
            },
            {
              label: "Late",
              value: summary.late,
              color: D.amber,
              bg: D.amberMuted,
              border: D.amberBorder,
            },
            {
              label: "Half Day",
              value: summary.halfDay,
              color: D.blue,
              bg: D.blueMuted,
              border: D.blueBorder,
            },
            {
              label: "Absent",
              value: summary.absent,
              color: D.red,
              bg: D.redMuted,
              border: D.redBorder,
            },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <View style={s.stripDivider} />}
              <View style={s.stripStat}>
                <Text style={[s.stripVal, { color: stat.color }]}>
                  {stat.value}
                </Text>
                <Text style={s.stripLabel}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* ── Content ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={D.green} size="large" />
          <Text style={s.loadingText}>Loading attendance…</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <MaterialCommunityIcons
              name="clipboard-text-clock-outline"
              size={28}
              color={D.textMuted}
            />
          </View>
          <Text style={s.emptyTitle}>No records found</Text>
          <Text style={s.emptyHint}>
            No attendance marked for this date or staff filter
          </Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <SectionLabel>{formatDate(selectedDate)}</SectionLabel>
          }
          // Single white card — first/last rows get radius via FlatList wrapper
          style={s.flatList}
        />
      )}

      {/* ── Photo Modal ── */}
      <Modal
        visible={!!selectedPhoto}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.sheet}>
            <View style={s.handle} />

            {selectedPhoto && (
              <>
                <View style={s.photoCaptionRow}>
                  <View
                    style={[
                      s.photoCaptionAvatar,
                      {
                        backgroundColor: avatarColor(
                          selectedPhoto.staffName ?? "",
                        ),
                      },
                    ]}
                  >
                    <Text style={s.photoCaptionAvatarText}>
                      {initials(selectedPhoto.staffName ?? "?")}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.photoCaptionName}>
                      {selectedPhoto.staffName ?? "Staff"}
                    </Text>
                    <View style={s.photoCaptionMeta}>
                      <View
                        style={[
                          s.typePill,
                          {
                            backgroundColor:
                              selectedPhoto.type === "checkIn"
                                ? D.greenMuted
                                : D.blueMuted,
                            borderColor:
                              selectedPhoto.type === "checkIn"
                                ? D.greenBorder
                                : D.blueBorder,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={
                            selectedPhoto.type === "checkIn"
                              ? "login-variant"
                              : "logout-variant"
                          }
                          size={11}
                          color={
                            selectedPhoto.type === "checkIn" ? D.green : D.blue
                          }
                        />
                        <Text
                          style={[
                            s.typePillText,
                            {
                              color:
                                selectedPhoto.type === "checkIn"
                                  ? D.green
                                  : D.blue,
                            },
                          ]}
                        >
                          {selectedPhoto.type === "checkIn"
                            ? "Check In"
                            : "Check Out"}
                        </Text>
                      </View>
                      <Text style={s.photoCaptionDate}>
                        {selectedPhoto.attendanceDate}
                      </Text>
                    </View>
                  </View>
                </View>

                <Image
                  source={{ uri: selectedPhoto.fileUri }}
                  style={s.photoImage}
                  resizeMode="cover"
                />

                <TouchableOpacity
                  style={s.closeBtn}
                  onPress={() => setSelectedPhoto(null)}
                  activeOpacity={0.85}
                >
                  <Text style={s.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Attendance row styles ─────────────────────────────────────────────────────
const ar = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  rowLast: {
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    borderBottomLeftRadius: D.radius.xl,
    borderBottomRightRadius: D.radius.xl,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  body: { flex: 1, minWidth: 0, gap: 5 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: { fontSize: 14, fontWeight: "700", color: D.text, flex: 1 },
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
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeVal: { fontSize: 12, fontWeight: "600", color: D.textSub },
  timeSep: { fontSize: 12, color: D.textMuted },
  photoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  photoBadgeText: { fontSize: 11, fontWeight: "600", color: D.green },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
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
  hrsBadge: {
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: D.greenBorder,
    alignItems: "center",
  },
  hrsBadgeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: D.green,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  hrsBadgeVal: { fontSize: 14, fontWeight: "800", color: D.green },

  // Filters
  filtersPanel: {
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingTop: 12,
    paddingBottom: 10,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
  },
  dateIcon: {
    width: 40,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: D.border,
    backgroundColor: D.greenMuted,
  },
  datePicker: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: D.text,
    borderWidth: 0,
  },
  chipsRow: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    borderColor: D.border,
  },
  chipActive: { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  chipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  chipAvatarText: { color: "#fff", fontSize: 8, fontWeight: "800" },
  chipText: { fontSize: 12, fontWeight: "600", color: D.textMuted },
  chipTextActive: { color: D.green, fontWeight: "700" },

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
  stripDivider: { width: 1, height: 28, backgroundColor: D.border },
  stripStat: { flex: 1, alignItems: "center", gap: 2 },
  stripVal: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  stripLabel: {
    fontSize: 10,
    color: D.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // FlatList
  flatList: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Single white card — first row gets top radius via inline style on FlatList header approach
  // We rely on the ar.row side-borders + ar.rowLast bottom radius
  // Top radius applied via a transparent header View trick
  listCardTop: {
    height: D.radius.xl,
    backgroundColor: D.surface,
    borderTopLeftRadius: D.radius.xl,
    borderTopRightRadius: D.radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: D.border,
    marginHorizontal: 16,
  },

  // Empty / loading
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
  },
  emptyHint: {
    fontSize: 13,
    color: D.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 13,
    color: D.textMuted,
    marginTop: 12,
    fontWeight: "500",
  },

  // Photo modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.40)",
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
  photoCaptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  photoCaptionAvatar: {
    width: 44,
    height: 44,
    borderRadius: D.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  photoCaptionAvatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  photoCaptionName: {
    fontSize: 15,
    fontWeight: "700",
    color: D.text,
    marginBottom: 5,
  },
  photoCaptionMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: D.radius.pill,
    borderWidth: 1,
  },
  typePillText: { fontSize: 11, fontWeight: "700" },
  photoCaptionDate: { fontSize: 11, color: D.textMuted },
  photoImage: {
    width: "100%",
    height: 260,
    borderRadius: D.radius.xl,
    marginBottom: 16,
  },
  closeBtn: {
    backgroundColor: D.green,
    borderRadius: D.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
