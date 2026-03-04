import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, theme, shadows } from '../theme';
import type { Attendance, StaffMember } from '../types';
import * as supabaseService from '../services/supabaseService';
import bcrypt from 'bcryptjs';
import * as ImagePicker from 'expo-image-picker';
import * as attendancePhotoService from '../services/attendancePhotoService';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  border: '#E8E3DB',

  green: '#2D9A5F',
  greenMuted: '#2D9A5F15',
  greenBorder: '#2D9A5F40',
  greenDeep: '#1E7A48',

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

  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

interface Props { navigation: any; }

// ─── Avatar helper ────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#1e3a5f', '#0d9488', '#059669', '#2563eb', '#7c3aed', '#d97706'];
const getAvatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length];
const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const formatTime = (timeString?: string) => {
  if (!timeString) return null;
  return new Date(timeString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

// ─── Staff status helpers ─────────────────────────────────────────────────────
const getStaffStatus = (record: Attendance | null | undefined) => {
  if (!record?.checkInTime) return { label: 'Not marked', color: D.textMuted, bg: D.border + '30', icon: 'clock-outline' };
  if (!record.checkOutTime) return { label: 'Checked in', color: D.green, bg: D.greenMuted, icon: 'login-variant' };
  return { label: 'Complete', color: D.blue, bg: D.blueMuted, icon: 'check-circle-outline' };
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const StaffAttendanceScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers } = useAuth();
  const { attendance, checkIn, checkOut, refreshData } = useData();

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<'checkIn' | 'checkOut' | null>(null);

  const isSharedTablet = user?.id === 'shared-tablet';

  useEffect(() => {
    refreshData();
    attendancePhotoService.cleanupOldPhotos().catch(() => {});
  }, [refreshData]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayFormatted = useMemo(() =>
    new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }), []);

  const todaysAttendanceByStaffId = useMemo(() => {
    const map = new Map<string, Attendance>();
    attendance
      .filter(r => r.attendanceDate === todayStr)
      .forEach(r => map.set(r.staffId, r));
    return map;
  }, [attendance, todayStr]);

  const displayableStaff: StaffMember[] = useMemo(() => staffMembers ?? [], [staffMembers]);

  const selectedStaff = useMemo(
    () => displayableStaff.find(s => s.id === selectedStaffId) ?? null,
    [displayableStaff, selectedStaffId],
  );

  const selectedAttendance = selectedStaff
    ? todaysAttendanceByStaffId.get(selectedStaff.id) ?? null
    : null;

  // Summary counts
  const summary = useMemo(() => {
    let present = 0, checkedIn = 0, unmarked = 0;
    displayableStaff.forEach(s => {
      const r = todaysAttendanceByStaffId.get(s.id);
      if (!r?.checkInTime) unmarked++;
      else if (!r.checkOutTime) checkedIn++;
      else present++;
    });
    return { present, checkedIn, unmarked, total: displayableStaff.length };
  }, [displayableStaff, todaysAttendanceByStaffId]);

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(prev => prev === staffId ? null : staffId);
    setPassword('');
    setPendingAction(null);
  };

  const ensureCanPerformAction = (action: 'checkIn' | 'checkOut'): boolean => {
    if (!selectedStaff) { Alert.alert('Select Staff', 'Please select a staff member first.'); return false; }
    const record = todaysAttendanceByStaffId.get(selectedStaff.id);
    if (action === 'checkIn' && record?.checkInTime) { Alert.alert('Already Marked', 'Check-in already recorded for today.'); return false; }
    if (action === 'checkOut') {
      if (!record?.checkInTime) { Alert.alert('Not Checked In', 'Please check in before checking out.'); return false; }
      if (record.checkOutTime) { Alert.alert('Already Marked', 'Check-out already recorded for today.'); return false; }
    }
    return true;
  };

  const openPasswordModal = (action: 'checkIn' | 'checkOut') => {
    if (!ensureCanPerformAction(action)) return;
    setPendingAction(action);
    setPassword('');
    setPasswordModalVisible(true);
  };

  const verifyStaffPassword = async (staffId: string, plain: string): Promise<boolean> => {
    const staff = await supabaseService.getStaffById(staffId);
    if (!staff?.password_hash) return false;
    return bcrypt.compare(plain, staff.password_hash);
  };

  const handleConfirmPassword = async () => {
    if (!selectedStaff || !pendingAction) { setPasswordModalVisible(false); return; }
    if (!password) { Alert.alert('Required', 'Please enter your password.'); return; }
    setLoading(true);
    try {
      const isValid = await verifyStaffPassword(selectedStaff.id, password);
      if (!isValid) { Alert.alert('Wrong Password', 'The password you entered is incorrect.'); return; }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Required', 'Camera permission is needed for attendance photo.'); return; }

      const result = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: false, allowsEditing: false });
      if (result.canceled || !result.assets?.length) { Alert.alert('Cancelled', 'Photo not captured. Attendance not updated.'); return; }

      try {
        await attendancePhotoService.savePhotoFromTempUri(result.assets[0].uri, {
          staffId: selectedStaff.id, staffName: selectedStaff.name,
          attendanceDate: todayStr, type: pendingAction,
        });
      } catch { /* allow attendance even if photo fails */ }

      if (pendingAction === 'checkIn') await checkIn(selectedStaff.id);
      else await checkOut(selectedStaff.id);

      await refreshData();
      setPasswordModalVisible(false);
      setPassword('');
      setPendingAction(null);
      Alert.alert('Done!', `${pendingAction === 'checkIn' ? 'Check-in' : 'Check-out'} recorded successfully.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update attendance.');
    } finally { setLoading(false); }
  };

  if (!user || user.role !== 'staff' || !isSharedTablet) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <View style={s.restrictedIconBox}>
          <MaterialCommunityIcons name="lock-outline" size={36} color={D.textMuted} />
        </View>
        <Text style={s.restrictedTitle}>Restricted Access</Text>
        <Text style={s.restrictedText}>This page is only available on the shared salon tablet.</Text>
        <TouchableOpacity style={s.restrictedBack} onPress={() => navigation.goBack()}>
          <Text style={s.restrictedBackText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerGlow} />
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={D.text} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <View style={s.headerIconBox}>
              <MaterialCommunityIcons name="clock-check-outline" size={28} color={D.green} />
            </View>
            <Text style={s.headerTitle}>Mark Attendance</Text>
            <Text style={s.headerDate}>{todayFormatted}</Text>
          </View>
        </View>

        {/* ── Summary Band ── */}
        <View style={s.summaryBand}>
          {[
            { icon: 'check-circle-outline', label: 'Complete',   value: summary.present,   color: D.blue,  bg: D.blueMuted,  border: D.blueBorder  },
            { icon: 'login-variant',        label: 'Checked In', value: summary.checkedIn, color: D.green, bg: D.greenMuted, border: D.greenBorder },
            { icon: 'clock-outline',        label: 'Not Marked', value: summary.unmarked,  color: D.amber, bg: D.amberMuted, border: D.amberBorder },
          ].map(stat => (
            <View key={stat.label} style={[s.summaryCard, { borderColor: stat.border }]}>
              <View style={[s.summaryCardIcon, { backgroundColor: stat.bg }]}>
                <MaterialCommunityIcons name={stat.icon as any} size={18} color={stat.color} />
              </View>
              <Text style={[s.summaryCardValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.summaryCardLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.body}>

          {/* ── Staff Grid ── */}
          <View style={s.sectionHeaderRow}>
            <View style={s.sectionLabelRow}>
              <View style={s.sectionIconBox}>
                <MaterialCommunityIcons name="account-group-outline" size={14} color={D.green} />
              </View>
              <Text style={s.sectionLabel}>SELECT STAFF MEMBER</Text>
            </View>
            <View style={s.sectionLine} />
          </View>

          <View style={s.staffGrid}>
            {displayableStaff.map((staff, index) => {
              const record = todaysAttendanceByStaffId.get(staff.id) ?? null;
              const status = getStaffStatus(record);
              const isSelected = selectedStaffId === staff.id;

              return (
                <TouchableOpacity
                  key={staff.id}
                  style={[s.staffCard, isSelected && s.staffCardActive]}
                  onPress={() => handleStaffSelect(staff.id)}
                  activeOpacity={0.8}
                >
                  {/* Avatar */}
                  <View style={[s.staffAvatar, { backgroundColor: getAvatarColor(index) }, isSelected && s.staffAvatarActive]}>
                    <Text style={s.staffAvatarText}>{getInitials(staff.name)}</Text>
                  </View>

                  {/* Name */}
                  <Text style={[s.staffCardName, isSelected && { color: D.green }]} numberOfLines={2}>
                    {staff.name}
                  </Text>

                  {/* Status pill */}
                  <View style={[s.staffStatusPill, { backgroundColor: status.bg }]}>
                    <MaterialCommunityIcons name={status.icon as any} size={10} color={status.color} />
                    <Text style={[s.staffStatusText, { color: status.color }]}>{status.label}</Text>
                  </View>

                  {/* Selected check badge */}
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
              {/* Staff header */}
              <View style={s.actionCardHeader}>
                <View style={[s.actionCardAvatar, { backgroundColor: getAvatarColor(displayableStaff.findIndex(s => s.id === selectedStaff.id)) }]}>
                  <Text style={s.actionCardAvatarText}>{getInitials(selectedStaff.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.actionCardName}>{selectedStaff.name}</Text>
                  {selectedStaff.branchName && (
                    <View style={s.branchPill}>
                      <MaterialCommunityIcons name="office-building-outline" size={11} color={D.textMuted} />
                      <Text style={s.branchPillText}>{selectedStaff.branchName}</Text>
                    </View>
                  )}
                </View>
                {/* Status chip */}
                <View style={[s.actionStatusChip, { backgroundColor: getStaffStatus(selectedAttendance).bg, borderColor: getStaffStatus(selectedAttendance).color + '44' }]}>
                  <MaterialCommunityIcons name={getStaffStatus(selectedAttendance).icon as any} size={13} color={getStaffStatus(selectedAttendance).color} />
                  <Text style={[s.actionStatusChipText, { color: getStaffStatus(selectedAttendance).color }]}>
                    {getStaffStatus(selectedAttendance).label}
                  </Text>
                </View>
              </View>

              <View style={s.actionCardDivider} />

              {/* Time display */}
              <View style={s.timeRow}>
                {/* Check In */}
                <View style={[s.timeBlock, selectedAttendance?.checkInTime && { borderColor: D.greenBorder, backgroundColor: D.greenMuted }]}>
                  <View style={[s.timeBlockIcon, { backgroundColor: selectedAttendance?.checkInTime ? D.greenMuted : D.bg }]}>
                    <MaterialCommunityIcons name="login-variant" size={18} color={selectedAttendance?.checkInTime ? D.green : D.textMuted} />
                  </View>
                  <Text style={s.timeBlockLabel}>Check In</Text>
                  <Text style={[s.timeBlockValue, selectedAttendance?.checkInTime && { color: D.green }]}>
                    {formatTime(selectedAttendance?.checkInTime) ?? '--:--'}
                  </Text>
                </View>

                <View style={s.timeArrow}>
                  <MaterialCommunityIcons name="arrow-right" size={18} color={D.border} />
                </View>

                {/* Check Out */}
                <View style={[s.timeBlock,
                  selectedAttendance?.checkOutTime && { borderColor: D.blueBorder, backgroundColor: D.blueMuted },
                  selectedAttendance?.checkInTime && !selectedAttendance?.checkOutTime && { borderColor: D.amberBorder, backgroundColor: D.amberMuted },
                ]}>
                  <View style={[s.timeBlockIcon, {
                    backgroundColor: selectedAttendance?.checkOutTime ? D.blueMuted
                      : selectedAttendance?.checkInTime ? D.amberMuted : D.bg,
                  }]}>
                    <MaterialCommunityIcons
                      name="logout-variant" size={18}
                      color={selectedAttendance?.checkOutTime ? D.blue : selectedAttendance?.checkInTime ? D.amber : D.textMuted}
                    />
                  </View>
                  <Text style={s.timeBlockLabel}>Check Out</Text>
                  <Text style={[s.timeBlockValue,
                    selectedAttendance?.checkOutTime && { color: D.blue },
                    selectedAttendance?.checkInTime && !selectedAttendance?.checkOutTime && { color: D.amber },
                  ]}>
                    {formatTime(selectedAttendance?.checkOutTime) ?? (selectedAttendance?.checkInTime ? 'Pending' : '--:--')}
                  </Text>
                </View>
              </View>

              {/* Action buttons / complete banner */}
              {!selectedAttendance?.checkInTime ? (
                <TouchableOpacity
                  style={s.checkInBtn}
                  onPress={() => openPasswordModal('checkIn')}
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
                  onPress={() => openPasswordModal('checkOut')}
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
                  <MaterialCommunityIcons name="check-decagram" size={20} color={D.green} />
                  <Text style={s.completeBannerText}>Attendance complete for today 🎉</Text>
                </View>
              )}
            </View>
          )}

          {/* ── All staff quick status list ── */}
          <View style={[s.sectionHeaderRow, { marginTop: 24 }]}>
            <View style={s.sectionLabelRow}>
              <View style={s.sectionIconBox}>
                <MaterialCommunityIcons name="format-list-checks" size={14} color={D.green} />
              </View>
              <Text style={s.sectionLabel}>TODAY'S OVERVIEW</Text>
            </View>
            <View style={s.sectionLine} />
          </View>

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
                  <View style={[s.overviewAvatar, { backgroundColor: getAvatarColor(index) }]}>
                    <Text style={s.overviewAvatarText}>{getInitials(staff.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.overviewName}>{staff.name}</Text>
                    {staff.branchName && <Text style={s.overviewBranch}>{staff.branchName}</Text>}
                  </View>
                  <View style={s.overviewTimes}>
                    {record?.checkInTime && (
                      <Text style={s.overviewTime}>
                        <Text style={{ color: D.green }}>↑ </Text>
                        {formatTime(record.checkInTime)}
                      </Text>
                    )}
                    {record?.checkOutTime && (
                      <Text style={s.overviewTime}>
                        <Text style={{ color: D.blue }}>↓ </Text>
                        {formatTime(record.checkOutTime)}
                      </Text>
                    )}
                  </View>
                  <View style={[s.overviewStatusPill, { backgroundColor: status.bg, borderColor: status.color + '44' }]}>
                    <MaterialCommunityIcons name={status.icon as any} size={12} color={status.color} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* ── Password Modal ── */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { if (!loading) { setPasswordModalVisible(false); setPassword(''); setPendingAction(null); } }}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            {/* Sheet handle */}
            <View style={s.modalHandle} />

            {/* Icon */}
            <View style={[s.modalIconBox, { backgroundColor: pendingAction === 'checkIn' ? D.greenMuted : D.amberMuted, borderColor: pendingAction === 'checkIn' ? D.greenBorder : D.amberBorder }]}>
              <MaterialCommunityIcons
                name={pendingAction === 'checkIn' ? 'login-variant' : 'logout-variant'}
                size={28}
                color={pendingAction === 'checkIn' ? D.green : D.amber}
              />
            </View>

            <Text style={s.modalTitle}>
              {pendingAction === 'checkIn' ? 'Confirm Check In' : 'Confirm Check Out'}
            </Text>
            <Text style={s.modalSubtitle}>
              Enter password for <Text style={{ fontWeight: '700', color: D.text }}>{selectedStaff?.name}</Text>
            </Text>

            {/* Password input */}
            <View style={s.modalInputBox}>
              <View style={s.modalInputIcon}>
                <MaterialCommunityIcons name="lock-outline" size={18} color={D.textMuted} />
              </View>
              <TextInput
                style={s.modalInputField}
                placeholder="Enter your password"
                placeholderTextColor={D.textMuted}
                secureTextEntry={!passwordVisible}
                value={password}
                editable={!loading}
                onChangeText={setPassword}
                autoFocus
              />
              <TouchableOpacity style={s.modalInputEye} onPress={() => setPasswordVisible(v => !v)}>
                <MaterialCommunityIcons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={D.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Buttons */}
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => { if (!loading) { setPasswordModalVisible(false); setPassword(''); setPendingAction(null); } }}
                disabled={loading}
              >
                <Text style={s.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirmBtn, { backgroundColor: pendingAction === 'checkIn' ? D.green : D.amber }]}
                onPress={handleConfirmPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name={pendingAction === 'checkIn' ? 'login-variant' : 'logout-variant'} size={16} color="#FFF" />
                    <Text style={s.modalConfirmBtnText}>{pendingAction === 'checkIn' ? 'Check In' : 'Check Out'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: D.bg },
  container: { flex: 1, backgroundColor: D.bg },

  // Restricted
  restrictedIconBox: { width: 80, height: 80, borderRadius: D.radius.xl, backgroundColor: D.surface, borderWidth: 1, borderColor: D.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  restrictedTitle: { fontSize: 18, fontWeight: '800', color: D.text, marginBottom: 8 },
  restrictedText: { fontSize: 14, color: D.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  restrictedBack: { backgroundColor: D.green, paddingHorizontal: 24, paddingVertical: 12, borderRadius: D.radius.pill },
  restrictedBackText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Header
  header: {
    backgroundColor: D.surface, paddingTop: 16, paddingBottom: 24,
    borderBottomWidth: 1, borderBottomColor: D.border,
    alignItems: 'center', overflow: 'hidden', position: 'relative',
  },
  headerGlow: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: D.greenMuted },
  backBtn: {
    position: 'absolute', top: 16, left: 20,
    width: 40, height: 40, borderRadius: D.radius.md,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border, zIndex: 1,
  },
  headerCenter: { alignItems: 'center', gap: 8 },
  headerIconBox: {
    width: 64, height: 64, borderRadius: D.radius.xl,
    backgroundColor: D.greenMuted, borderWidth: 2, borderColor: D.greenBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    shadowColor: D.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: D.text, letterSpacing: -0.5 },
  headerDate: { fontSize: 13, color: D.textMuted, fontWeight: '500' },

  // Summary band
  summaryBand: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
  },
  summaryCard: {
    flex: 1, alignItems: 'center', backgroundColor: D.bg,
    borderRadius: D.radius.lg, borderWidth: 1, padding: 12,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 2, elevation: 1,
  },
  summaryCardIcon: { width: 36, height: 36, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  summaryCardValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  summaryCardLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },

  // Body
  body: { paddingHorizontal: 20, paddingTop: 20 },

  // Section header
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionIconBox: { width: 24, height: 24, borderRadius: 12, backgroundColor: D.greenMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.greenBorder },
  sectionLabel: { color: D.green, fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
  sectionLine: { flex: 1, height: 1, backgroundColor: D.border },

  // Staff grid
  staffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  staffCard: {
    width: '30%', alignItems: 'center',
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1.5, borderColor: D.border, padding: 14,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
    position: 'relative',
  },
  staffCardActive: { borderColor: D.green, backgroundColor: D.greenMuted },
  staffAvatar: { width: 48, height: 48, borderRadius: D.radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  staffAvatarActive: { borderWidth: 2, borderColor: D.green },
  staffAvatarText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  staffCardName: { fontSize: 12, fontWeight: '700', color: D.text, textAlign: 'center', marginBottom: 6 },
  staffStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: D.radius.pill,
  },
  staffStatusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  staffSelectedBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10, backgroundColor: D.green,
    alignItems: 'center', justifyContent: 'center',
  },

  // Action card
  actionCard: {
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.greenBorder, padding: 16, marginBottom: 8,
    shadowColor: D.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  actionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  actionCardAvatar: { width: 52, height: 52, borderRadius: D.radius.md, alignItems: 'center', justifyContent: 'center' },
  actionCardAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  actionCardName: { fontSize: 17, fontWeight: '800', color: D.text, letterSpacing: -0.3, marginBottom: 4 },
  branchPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: D.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: D.radius.pill, borderWidth: 1, borderColor: D.border },
  branchPillText: { fontSize: 11, color: D.textMuted },
  actionStatusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: D.radius.pill, borderWidth: 1 },
  actionStatusChipText: { fontSize: 11, fontWeight: '700' },
  actionCardDivider: { height: 1, backgroundColor: D.border, marginBottom: 14 },

  // Time blocks
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  timeBlock: {
    flex: 1, alignItems: 'center', backgroundColor: D.bg,
    borderRadius: D.radius.lg, borderWidth: 1, borderColor: D.border, padding: 12,
  },
  timeBlockIcon: { width: 36, height: 36, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  timeBlockLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3, marginBottom: 4 },
  timeBlockValue: { fontSize: 18, fontWeight: '800', color: D.textMuted, letterSpacing: -0.3 },
  timeArrow: { width: 28, alignItems: 'center' },

  // Action buttons
  checkInBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.green, borderRadius: D.radius.xl,
    paddingVertical: 16, paddingHorizontal: 18,
    shadowColor: D.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  checkInBtnIcon: { width: 38, height: 38, borderRadius: D.radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  checkInBtnText: { flex: 1, fontSize: 16, fontWeight: '800', color: '#FFF' },
  checkOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    paddingVertical: 16, paddingHorizontal: 18,
    borderWidth: 2, borderColor: D.amberBorder,
    shadowColor: D.amber, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  checkOutBtnIcon: { width: 38, height: 38, borderRadius: D.radius.md, backgroundColor: D.amberMuted, alignItems: 'center', justifyContent: 'center' },
  checkOutBtnText: { flex: 1, fontSize: 16, fontWeight: '800', color: D.amber },
  completeBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: D.greenMuted, borderRadius: D.radius.lg,
    paddingVertical: 14, borderWidth: 1, borderColor: D.greenBorder,
  },
  completeBannerText: { fontSize: 14, fontWeight: '700', color: D.green },

  // Overview list
  overviewCard: {
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border, overflow: 'hidden',
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  overviewRowBorder: { borderBottomWidth: 1, borderBottomColor: D.border },
  overviewAvatar: { width: 38, height: 38, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center' },
  overviewAvatarText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  overviewName: { fontSize: 14, fontWeight: '700', color: D.text },
  overviewBranch: { fontSize: 11, color: D.textMuted, marginTop: 1 },
  overviewTimes: { alignItems: 'flex-end', gap: 2 },
  overviewTime: { fontSize: 12, fontWeight: '600', color: D.textSub },
  overviewStatusPill: { width: 28, height: 28, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: D.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, alignItems: 'center',
    borderTopWidth: 1, borderColor: D.border,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: D.border, marginBottom: 24 },
  modalIconBox: {
    width: 64, height: 64, borderRadius: D.radius.xl,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: D.text, letterSpacing: -0.3, marginBottom: 6, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: D.textMuted, marginBottom: 20, textAlign: 'center', lineHeight: 20 },
  modalInputBox: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: D.bg, borderRadius: D.radius.md,
    borderWidth: 1.5, borderColor: D.border, overflow: 'hidden', marginBottom: 20,
  },
  modalInputIcon: { width: 44, height: 50, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: D.border },
  modalInputField: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: D.text },
  modalInputEye: { paddingHorizontal: 14 },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: D.radius.xl,
    backgroundColor: D.bg, borderWidth: 1, borderColor: D.border, alignItems: 'center',
  },
  modalCancelBtnText: { fontSize: 15, fontWeight: '700', color: D.textSub },
  modalConfirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: D.radius.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: D.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  modalConfirmBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
});