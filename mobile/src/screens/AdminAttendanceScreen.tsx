import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Image, ScrollView, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { DatePickerField } from '../components/DatePickerField';
import { useData } from '../context/DataContext';
import { colors, theme } from '../theme';
import type { Attendance } from '../types';
import * as attendancePhotoService from '../services/attendancePhotoService';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  border: '#E8E3DB',

  green: '#2D9A5F',
  greenMuted: '#2D9A5F15',
  greenBorder: '#2D9A5F40',

  gold: '#C9A84C',
  goldMuted: '#C9A84C18',
  goldBorder: '#C9A84C44',

  text: '#1A1814',
  textSub: '#6B6560',
  textMuted: '#A09A8F',

  blue: '#3A7EC8',
  blueMuted: '#3A7EC815',
  blueBorder: '#3A7EC833',

  amber: '#D4872A',
  amberMuted: '#D4872A15',
  amberBorder: '#D4872A33',

  red: '#D94F4F',
  redMuted: '#D94F4F15',
  redBorder: '#D94F4F33',

  purple: '#7C5CBF',
  purpleMuted: '#7C5CBF15',
  purpleBorder: '#7C5CBF33',

  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

// ─── Status config ────────────────────────────────────────────────────────────
const getStatusCfg = (status: string) => {
  switch (status) {
    case 'present':  return { label: 'Present',  color: D.green,  bg: D.greenMuted,  border: D.greenBorder,  icon: 'check-circle-outline'  };
    case 'late':     return { label: 'Late',      color: D.amber,  bg: D.amberMuted,  border: D.amberBorder,  icon: 'clock-alert-outline'   };
    case 'half_day': return { label: 'Half Day',  color: D.blue,   bg: D.blueMuted,   border: D.blueBorder,   icon: 'circle-half-full'       };
    case 'absent':   return { label: 'Absent',    color: D.red,    bg: D.redMuted,    border: D.redBorder,    icon: 'close-circle-outline'  };
    default:         return { label: 'Unknown',   color: D.textMuted, bg: D.bg, border: D.border, icon: 'help-circle-outline' };
  }
};

// ─── Avatar colors ────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#1e3a5f', '#0d9488', '#059669', '#2563eb', '#7c3aed'];
const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const formatTime = (t?: string) => {
  if (!t) return null;
  return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const calcHours = (checkIn?: string, checkOut?: string) => {
  if (!checkIn || !checkOut) return null;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return (diff / 3600000).toFixed(1);
};

interface Props { navigation: any; }

export const AdminAttendanceScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers } = useAuth();
  const { getAttendance } = useData();

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoMap, setPhotoMap] = useState<Record<string, attendancePhotoService.AttendancePhotoMeta[]>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<attendancePhotoService.AttendancePhotoMeta | null>(null);

  useEffect(() => { loadAttendance(); }, [selectedStaffId, selectedDate]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const filters: any = { date: selectedDate };
      if (selectedStaffId) filters.staffId = selectedStaffId;
      const data = await getAttendance(filters);
      setRecords(data);
      await attendancePhotoService.cleanupOldPhotos().catch(() => {});
      const map: Record<string, attendancePhotoService.AttendancePhotoMeta[]> = {};
      for (const r of data) {
        const photos = await attendancePhotoService.getPhotosForAttendance(r.staffId, r.attendanceDate);
        if (photos.length > 0) map[r.id] = photos;
      }
      setPhotoMap(map);
    } catch (e) {
      console.error('Error loading attendance:', e);
    } finally {
      setLoading(false);
    }
  };

  // Summary counts
  const summary = useMemo(() => {
    const present  = records.filter(r => r.status === 'present').length;
    const late     = records.filter(r => r.status === 'late').length;
    const halfDay  = records.filter(r => r.status === 'half_day').length;
    const absent   = records.filter(r => r.status === 'absent').length;
    const totalHrs = records.reduce((s, r) => {
      const h = parseFloat(calcHours(r.checkInTime, r.checkOutTime) ?? '0');
      return s + (isNaN(h) ? 0 : h);
    }, 0);
    return { present, late, halfDay, absent, totalHrs };
  }, [records]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  if (!user || user.role !== 'admin') {
    return (
      <View style={[s.center, { flex: 1, backgroundColor: D.bg }]}>
        <View style={s.restrictedBox}>
          <MaterialCommunityIcons name="shield-alert-outline" size={32} color={D.textMuted} />
        </View>
        <Text style={s.restrictedTitle}>Admin Access Required</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Attendance }) => {
    const cfg = getStatusCfg(item.status);
    const photos = photoMap[item.id] ?? [];
    const checkIn  = formatTime(item.checkInTime);
    const checkOut = formatTime(item.checkOutTime);
    const hours    = calcHours(item.checkInTime, item.checkOutTime);

    return (
      <View style={s.card}>
        {/* Left stripe */}
        <View style={[s.cardStripe, { backgroundColor: cfg.color }]} />

        <View style={s.cardInner}>
          {/* Top row */}
          <View style={s.cardTop}>
            <View style={[s.cardAvatar, { backgroundColor: avatarColor(item.staffName) }]}>
              <Text style={s.cardAvatarText}>{initials(item.staffName)}</Text>
            </View>
            <View style={s.cardStaffInfo}>
              <Text style={s.cardStaffName}>{item.staffName}</Text>
              <Text style={s.cardDate}>{formatDate(item.attendanceDate)}</Text>
            </View>
            <View style={[s.statusPill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <MaterialCommunityIcons name={cfg.icon as any} size={12} color={cfg.color} />
              <Text style={[s.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          {/* Time blocks */}
          <View style={s.timeRow}>
            {/* Check in */}
            <View style={[s.timeBlock, checkIn && { borderColor: D.greenBorder, backgroundColor: D.greenMuted }]}>
              <View style={[s.timeBlockIcon, { backgroundColor: checkIn ? D.greenMuted : D.bg }]}>
                <MaterialCommunityIcons name="login-variant" size={15} color={checkIn ? D.green : D.textMuted} />
              </View>
              <Text style={s.timeBlockLabel}>CHECK IN</Text>
              <Text style={[s.timeBlockValue, checkIn ? { color: D.green } : { color: D.textMuted }]}>
                {checkIn ?? '--:--'}
              </Text>
            </View>

            <MaterialCommunityIcons name="arrow-right" size={16} color={D.border} style={{ marginTop: 14 }} />

            {/* Check out */}
            <View style={[s.timeBlock,
              checkOut && { borderColor: D.blueBorder, backgroundColor: D.blueMuted },
              checkIn && !checkOut && { borderColor: D.amberBorder, backgroundColor: D.amberMuted },
            ]}>
              <View style={[s.timeBlockIcon, {
                backgroundColor: checkOut ? D.blueMuted : checkIn ? D.amberMuted : D.bg,
              }]}>
                <MaterialCommunityIcons
                  name="logout-variant" size={15}
                  color={checkOut ? D.blue : checkIn ? D.amber : D.textMuted}
                />
              </View>
              <Text style={s.timeBlockLabel}>CHECK OUT</Text>
              <Text style={[s.timeBlockValue,
                checkOut ? { color: D.blue } : checkIn ? { color: D.amber } : { color: D.textMuted },
              ]}>
                {checkOut ?? (checkIn ? 'Pending' : '--:--')}
              </Text>
            </View>

            {/* Hours */}
            <View style={[s.timeBlock, hours && { borderColor: D.purpleBorder, backgroundColor: D.purpleMuted }]}>
              <View style={[s.timeBlockIcon, { backgroundColor: hours ? D.purpleMuted : D.bg }]}>
                <MaterialCommunityIcons name="timer-outline" size={15} color={hours ? D.purple : D.textMuted} />
              </View>
              <Text style={s.timeBlockLabel}>HOURS</Text>
              <Text style={[s.timeBlockValue, hours ? { color: D.purple } : { color: D.textMuted }]}>
                {hours ? `${hours}h` : '--'}
              </Text>
            </View>
          </View>

          {/* Photo badge */}
          {photos.length > 0 && (
            <TouchableOpacity
              style={s.photoBadge}
              onPress={() => setSelectedPhoto(photos[photos.length - 1])}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="camera-outline" size={13} color={D.blue} />
              <Text style={s.photoBadgeText}>View attendance photo</Text>
              <MaterialCommunityIcons name="chevron-right" size={13} color={D.blue} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerGlow} />
        <View style={s.headerLeft}>
          <View style={s.headerIconBox}>
            <MaterialCommunityIcons name="clipboard-clock-outline" size={22} color={D.green} />
          </View>
          <View>
            <Text style={s.headerTitle}>Attendance</Text>
            <Text style={s.headerSub}>{formatDate(selectedDate)}</Text>
          </View>
        </View>
        <View style={s.headerHrsBadge}>
          <Text style={s.headerHrsLabel}>TOTAL HRS</Text>
          <Text style={s.headerHrsValue}>{summary.totalHrs.toFixed(1)}h</Text>
        </View>
      </View>

      {/* ── Filters ── */}
      <View style={s.filtersPanel}>
        {/* Date picker */}
        <View style={s.filterDateRow}>
          <View style={s.filterDateIcon}>
            <MaterialCommunityIcons name="calendar-outline" size={16} color={D.green} />
          </View>
          <DatePickerField
            value={selectedDate}
            onChange={setSelectedDate}
            placeholder="Select date"
            style={s.datePickerField}
          />
        </View>

        {/* Staff chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.staffChips}>
          {[{ id: null, name: 'All Staff' }, ...staffMembers].map((staff: any) => {
            const active = selectedStaffId === staff.id;
            return (
              <TouchableOpacity
                key={staff.id ?? 'all'}
                style={[s.staffChip, active && s.staffChipActive]}
                onPress={() => setSelectedStaffId(staff.id)}
                activeOpacity={0.8}
              >
                {staff.id && (
                  <View style={[s.staffChipAvatar, { backgroundColor: active ? D.green : avatarColor(staff.name) }]}>
                    <Text style={s.staffChipAvatarText}>{initials(staff.name)}</Text>
                  </View>
                )}
                {!staff.id && (
                  <MaterialCommunityIcons
                    name="account-group-outline" size={14}
                    color={active ? D.green : D.textMuted}
                  />
                )}
                <Text style={[s.staffChipText, active && s.staffChipTextActive]}>
                  {staff.id ? staff.name.split(' ')[0] : 'All Staff'}
                </Text>
                {active && <MaterialCommunityIcons name="check" size={12} color={D.green} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Summary band ── */}
      {!loading && records.length > 0 && (
        <View style={s.summaryBand}>
          {[
            { label: 'Present',  value: summary.present,  color: D.green,  bg: D.greenMuted,  border: D.greenBorder,  icon: 'check-circle-outline' },
            { label: 'Late',     value: summary.late,     color: D.amber,  bg: D.amberMuted,  border: D.amberBorder,  icon: 'clock-alert-outline'  },
            { label: 'Half Day', value: summary.halfDay,  color: D.blue,   bg: D.blueMuted,   border: D.blueBorder,   icon: 'circle-half-full'      },
            { label: 'Absent',   value: summary.absent,   color: D.red,    bg: D.redMuted,    border: D.redBorder,    icon: 'close-circle-outline' },
          ].map(stat => (
            <View key={stat.label} style={[s.summaryCard, { borderColor: stat.border }]}>
              <View style={[s.summaryIcon, { backgroundColor: stat.bg }]}>
                <MaterialCommunityIcons name={stat.icon as any} size={14} color={stat.color} />
              </View>
              <Text style={[s.summaryValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.summaryLabel}>{stat.label}</Text>
            </View>
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
          <View style={s.emptyIconBox}>
            <MaterialCommunityIcons name="clipboard-text-clock-outline" size={36} color={D.textMuted} />
          </View>
          <Text style={s.emptyTitle}>No records found</Text>
          <Text style={s.emptyHint}>No attendance was marked for this date / staff filter</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Photo modal ── */}
      <Modal
        visible={!!selectedPhoto}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={s.photoBackdrop}>
          <View style={s.photoSheet}>
            {/* Handle */}
            <View style={s.photoHandle} />

            {selectedPhoto && (
              <>
                {/* Caption header */}
                <View style={s.photoCaptionRow}>
                  <View style={[s.photoCaptionAvatar, { backgroundColor: avatarColor(selectedPhoto.staffName ?? '') }]}>
                    <Text style={s.photoCaptionAvatarText}>{initials(selectedPhoto.staffName ?? '?')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.photoCaptionName}>{selectedPhoto.staffName ?? 'Staff'}</Text>
                    <View style={s.photoCaptionMeta}>
                      <View style={[s.photoTypePill, {
                        backgroundColor: selectedPhoto.type === 'checkIn' ? D.greenMuted : D.blueMuted,
                        borderColor: selectedPhoto.type === 'checkIn' ? D.greenBorder : D.blueBorder,
                      }]}>
                        <MaterialCommunityIcons
                          name={selectedPhoto.type === 'checkIn' ? 'login-variant' : 'logout-variant'}
                          size={11}
                          color={selectedPhoto.type === 'checkIn' ? D.green : D.blue}
                        />
                        <Text style={[s.photoTypePillText, { color: selectedPhoto.type === 'checkIn' ? D.green : D.blue }]}>
                          {selectedPhoto.type === 'checkIn' ? 'Check In' : 'Check Out'}
                        </Text>
                      </View>
                      <Text style={s.photoCaptionDate}>{selectedPhoto.attendanceDate}</Text>
                    </View>
                  </View>
                </View>

                {/* Photo */}
                <Image
                  source={{ uri: selectedPhoto.fileUri }}
                  style={s.photoImage}
                  resizeMode="cover"
                />

                {/* Close */}
                <TouchableOpacity style={s.photoCloseBtn} onPress={() => setSelectedPhoto(null)} activeOpacity={0.85}>
                  <Text style={s.photoCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },

  // Restricted
  restrictedBox: { width: 72, height: 72, borderRadius: D.radius.xl, backgroundColor: D.surface, borderWidth: 1, borderColor: D.border, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  restrictedTitle: { fontSize: 16, fontWeight: '700', color: D.text },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: D.surface, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: D.border, overflow: 'hidden', position: 'relative',
  },
  headerGlow: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: D.greenMuted },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBox: {
    width: 44, height: 44, borderRadius: D.radius.md,
    backgroundColor: D.greenMuted, borderWidth: 1, borderColor: D.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: D.text, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },
  headerHrsBadge: {
    alignItems: 'flex-end', backgroundColor: D.purpleMuted,
    borderRadius: D.radius.md, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: D.purpleBorder,
  },
  headerHrsLabel: { fontSize: 9, fontWeight: '700', color: D.purple, letterSpacing: 1.5 },
  headerHrsValue: { fontSize: 16, fontWeight: '800', color: D.purple, letterSpacing: -0.3 },

  // Filters
  filtersPanel: {
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
    paddingTop: 14, paddingBottom: 12,
  },
  filterDateRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: D.bg, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.border, overflow: 'hidden',
  },
  filterDateIcon: {
    width: 42, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRightWidth: 1, borderRightColor: D.border, backgroundColor: D.greenMuted,
  },
  datePickerField: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: D.text, borderWidth: 0,
  },
  staffChips: { paddingHorizontal: 20, gap: 8 },
  staffChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: D.bg, borderRadius: D.radius.pill,
    borderWidth: 1, borderColor: D.border,
  },
  staffChipActive: { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  staffChipAvatar: { width: 22, height: 22, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  staffChipAvatarText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  staffChipText: { fontSize: 12, fontWeight: '600', color: D.textMuted },
  staffChipTextActive: { color: D.green },

  // Summary
  summaryBand: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
  },
  summaryCard: {
    flex: 1, alignItems: 'center', backgroundColor: D.bg,
    borderRadius: D.radius.lg, borderWidth: 1, padding: 10,
  },
  summaryIcon: { width: 28, height: 28, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  summaryValue: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: 2 },
  summaryLabel: { fontSize: 9, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },

  // List
  listContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 48 },

  // Card
  card: {
    flexDirection: 'row', backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border, marginBottom: 10, overflow: 'hidden',
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  cardStripe: { width: 4 },
  cardInner: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardAvatar: { width: 44, height: 44, borderRadius: D.radius.md, alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  cardStaffInfo: { flex: 1 },
  cardStaffName: { fontSize: 15, fontWeight: '800', color: D.text, letterSpacing: -0.2 },
  cardDate: { fontSize: 11, color: D.textMuted, marginTop: 2 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: D.radius.pill, borderWidth: 1,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  // Time blocks
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 10 },
  timeBlock: {
    flex: 1, alignItems: 'center', backgroundColor: D.bg,
    borderRadius: D.radius.lg, borderWidth: 1, borderColor: D.border, paddingVertical: 10,
  },
  timeBlockIcon: { width: 30, height: 30, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  timeBlockLabel: { fontSize: 8, color: D.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  timeBlockValue: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },

  // Photo badge
  photoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: D.blueMuted, borderRadius: D.radius.pill,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: D.blueBorder,
  },
  photoBadgeText: { fontSize: 12, fontWeight: '600', color: D.blue },

  // Empty / loading
  emptyIconBox: { width: 80, height: 80, borderRadius: D.radius.xl, backgroundColor: D.surface, borderWidth: 1, borderColor: D.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: D.text, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: D.textMuted, textAlign: 'center', lineHeight: 19 },
  loadingText: { fontSize: 14, color: D.textMuted, marginTop: 12, fontWeight: '500' },

  // Photo modal
  photoBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  photoSheet: {
    backgroundColor: D.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: D.border,
  },
  photoHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: D.border, alignSelf: 'center', marginBottom: 20 },
  photoCaptionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  photoCaptionAvatar: { width: 44, height: 44, borderRadius: D.radius.md, alignItems: 'center', justifyContent: 'center' },
  photoCaptionAvatarText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  photoCaptionName: { fontSize: 16, fontWeight: '800', color: D.text, marginBottom: 5 },
  photoCaptionMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoTypePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: D.radius.pill, borderWidth: 1,
  },
  photoTypePillText: { fontSize: 11, fontWeight: '700' },
  photoCaptionDate: { fontSize: 11, color: D.textMuted, fontWeight: '500' },
  photoImage: { width: '100%', height: 280, borderRadius: D.radius.xl, marginBottom: 16 },
  photoCloseBtn: {
    backgroundColor: D.text, borderRadius: D.radius.xl,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: D.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  photoCloseBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});