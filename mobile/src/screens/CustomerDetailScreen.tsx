import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import type { Customer, Visit } from '../types';
import { colors, theme } from '../theme';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceWarm: '#FFFDF9',
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

  purple: '#7C5CBF',
  purpleMuted: '#7C5CBF15',
  purpleBorder: '#7C5CBF33',

  amber: '#D4872A',
  amberMuted: '#D4872A15',
  amberBorder: '#D4872A33',

  red: '#D94F4F',
  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

interface Props {
  navigation?: any;
  route?: { params?: { customerId?: string } };
}

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel = ({ icon, children }: { icon: string; children: string }) => (
  <View style={sl.row}>
    <View style={sl.iconBox}>
      <MaterialCommunityIcons name={icon as any} size={14} color={D.green} />
    </View>
    <Text style={sl.text}>{children}</Text>
    <View style={sl.line} />
  </View>
);
const sl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  iconBox: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: D.greenMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.greenBorder,
  },
  text: { color: D.green, fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
  line: { flex: 1, height: 1, backgroundColor: D.border },
});

// ─── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: string }) => (
  <View style={ir.row}>
    <View style={[ir.iconBox, { backgroundColor: accent ? accent + '18' : D.bg, borderColor: accent ? accent + '40' : D.border }]}>
      <MaterialCommunityIcons name={icon as any} size={16} color={accent ?? D.textMuted} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value}>{value}</Text>
    </View>
  </View>
);
const ir = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: D.border,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: D.radius.sm,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  label: { fontSize: 10, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3, marginBottom: 2 },
  value: { fontSize: 14, fontWeight: '600', color: D.text },
});

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, iconColor, iconBg, iconBorder, value, label }: {
  icon: string; iconColor: string; iconBg: string; iconBorder: string; value: string; label: string;
}) => (
  <View style={[sc.card, { borderColor: iconBorder }]}>
    <View style={[sc.icon, { backgroundColor: iconBg }]}>
      <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />
    </View>
    <Text style={sc.value}>{value}</Text>
    <Text style={sc.label}>{label}</Text>
  </View>
);
const sc = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: D.surface, borderRadius: D.radius.lg,
    padding: 12, alignItems: 'center', borderWidth: 1,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  icon: { width: 36, height: 36, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  value: { fontSize: 16, fontWeight: '800', color: D.text, letterSpacing: -0.5, marginBottom: 2 },
  label: { fontSize: 10, color: D.textMuted, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const CustomerDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customers, visits } = useData();
  const customerId = route?.params?.customerId;

  const customer = useMemo(
    () => (customerId ? customers.find((c: any) => c.id === customerId) : undefined),
    [customers, customerId],
  );
  const customerVisits = useMemo(
    () =>
      customerId
        ? visits.filter((v: any) => v.customerId === customerId).sort((a: any, b: any) => (b.date > a.date ? 1 : -1))
        : [],
    [visits, customerId],
  );
  const totalSpend = useMemo(() => customerVisits.reduce((s: number, v: any) => s + v.total, 0), [customerVisits]);
  const avgSpend = customerVisits.length > 0 ? totalSpend / customerVisits.length : 0;
  const lastVisit = customerVisits[0];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (!customer) {
    return (
      <View style={[s.center, { flex: 1, backgroundColor: D.bg }]}>
        <View style={s.emptyIconBox}>
          <MaterialCommunityIcons name="account-off-outline" size={36} color={D.textMuted} />
        </View>
        <Text style={s.emptyTitle}>Customer not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

      {/* ── Hero Header ── */}
      <View style={s.hero}>
        <View style={s.heroGlow} />

        <TouchableOpacity style={s.backBtn} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={D.text} />
        </TouchableOpacity>

        <View style={s.heroContent}>
          <View style={s.heroAvatar}>
            <Text style={s.heroAvatarText}>{initials(customer.name)}</Text>
          </View>
          <Text style={s.heroName}>{customer.name}</Text>
          {customer.phone && (
            <View style={s.heroPill}>
              <MaterialCommunityIcons name="phone-outline" size={13} color={D.green} />
              <Text style={s.heroPillText}>{customer.phone}</Text>
            </View>
          )}
          {lastVisit && (
            <View style={[s.heroPill, { backgroundColor: D.goldMuted, borderColor: D.goldBorder }]}>
              <MaterialCommunityIcons name="calendar-check" size={13} color={D.gold} />
              <Text style={[s.heroPillText, { color: D.gold }]}>Last visit {formatDate(lastVisit.date)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Stats Band ── */}
      <View style={s.statsBand}>
        <StatCard
          icon="calendar-multiple"
          iconColor={D.blue} iconBg={D.blueMuted} iconBorder={D.blueBorder}
          value={String(customerVisits.length)}
          label="Total Visits"
        />
        <StatCard
          icon="calculator-variant-outline"
          iconColor={D.amber} iconBg={D.amberMuted} iconBorder={D.amberBorder}
          value={`₹${avgSpend.toFixed(0)}`}
          label="Avg Bill"
        />
      </View>

      <View style={s.body}>

        {/* ── Contact Info ── */}
        <SectionLabel icon="account-outline">CONTACT DETAILS</SectionLabel>
        <View style={s.card}>
          {customer.phone && (
            <InfoRow icon="phone-outline" label="Phone" value={customer.phone} accent={D.green} />
          )}
          {customer.email && (
            <InfoRow icon="email-outline" label="Email" value={customer.email} accent={D.blue} />
          )}
          {customer.dob && (
            <InfoRow icon="cake-variant-outline" label="Date of Birth" value={formatDate(customer.dob)} accent={D.purple} />
          )}
          {customer.gender && (
            <InfoRow icon="gender-male-female" label="Gender" value={customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1)} />
          )}
          {customer.address && (
            <InfoRow icon="map-marker-outline" label="Address" value={customer.address} accent={D.amber} />
          )}
          {!customer.phone && !customer.email && !customer.dob && !customer.gender && !customer.address && (
            <View style={s.emptyInCard}>
              <MaterialCommunityIcons name="information-outline" size={16} color={D.textMuted} />
              <Text style={s.emptyInCardText}>No contact details saved</Text>
            </View>
          )}
        </View>

        {/* ── Visit History ── */}
        <SectionLabel icon="history">VISIT HISTORY</SectionLabel>

        {customerVisits.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIconBox}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={32} color={D.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No visits yet</Text>
            <Text style={s.emptyHint}>This customer hasn't visited yet</Text>
          </View>
        ) : (
          customerVisits.map((v: Visit, index: number) => {
            const serviceNames = v.services.map((sv: any) => sv.serviceName || sv.name).filter(Boolean).join(', ');
            const hasProducts = v.products && v.products.length > 0;

            return (
              <TouchableOpacity
                key={v.id}
                style={s.visitCard}
                onPress={() => navigation?.navigate('BillView', { visitId: v.id })}
                activeOpacity={0.8}
              >
                {/* Green stripe for recent visits */}
                <View style={[s.visitStripe, { backgroundColor: index === 0 ? D.green : D.border }]} />

                <View style={s.visitInner}>
                  <View style={s.visitTop}>
                    {/* Date + staff */}
                    <View>
                      <View style={s.visitDateRow}>
                        {index === 0 && (
                          <View style={s.visitLatestBadge}>
                            <Text style={s.visitLatestText}>Latest</Text>
                          </View>
                        )}
                        <Text style={s.visitDate}>{formatDate(v.date)}</Text>
                      </View>
                      <View style={s.visitStaffRow}>
                        <MaterialCommunityIcons name="account-tie" size={13} color={D.textMuted} />
                        <Text style={s.visitStaff}>{v.staffName}</Text>
                      </View>
                    </View>

                    {/* View Bill button only */}
                    <TouchableOpacity
                      style={s.visitViewBtn}
                      onPress={() => navigation?.navigate('BillView', { visitId: v.id })}
                      activeOpacity={0.8}
                    >
                      <Text style={s.visitViewBtnText}>View Bill</Text>
                      <MaterialCommunityIcons name="chevron-right" size={12} color={D.green} />
                    </TouchableOpacity>
                  </View>

                  {/* Services + products */}
                  {(serviceNames || hasProducts) && (
                    <View style={s.visitTagsRow}>
                      {serviceNames.split(', ').map((sn, i) => (
                        <View key={i} style={s.visitTag}>
                          <MaterialCommunityIcons name="spa" size={11} color={D.purple} />
                          <Text style={s.visitTagText}>{sn}</Text>
                        </View>
                      ))}
                      {hasProducts && (
                        <View style={[s.visitTag, { backgroundColor: D.amberMuted, borderColor: D.amberBorder }]}>
                          <MaterialCommunityIcons name="package-variant" size={11} color={D.amber} />
                          <Text style={[s.visitTagText, { color: D.amber }]}>
                            {v.products.length} product{v.products.length > 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },

  // Hero
  hero: {
    backgroundColor: D.surface, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28,
    borderBottomWidth: 1, borderBottomColor: D.border, alignItems: 'center',
    overflow: 'hidden', position: 'relative',
  },
  heroGlow: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: D.greenMuted,
  },
  backBtn: {
    position: 'absolute', top: 52, left: 20,
    width: 40, height: 40, borderRadius: D.radius.md,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border, zIndex: 1,
  },
  heroContent: { alignItems: 'center', gap: 10 },
  heroAvatar: {
    width: 80, height: 80, borderRadius: D.radius.xl,
    backgroundColor: D.greenMuted, borderWidth: 2, borderColor: D.green,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    shadowColor: D.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  heroAvatarText: { fontSize: 28, fontWeight: '800', color: D.green, letterSpacing: -0.5 },
  heroName: { fontSize: 22, fontWeight: '800', color: D.text, letterSpacing: -0.5 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: D.greenMuted, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: D.radius.pill, borderWidth: 1, borderColor: D.greenBorder,
  },
  heroPillText: { fontSize: 13, fontWeight: '600', color: D.green },

  // Stats band
  statsBand: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: D.surfaceWarm, borderBottomWidth: 1, borderBottomColor: D.border,
  },

  // Body
  body: { paddingHorizontal: 20, paddingTop: 20 },

  // Info card
  card: {
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border, paddingHorizontal: 16, paddingBottom: 4,
    marginBottom: 20, overflow: 'hidden',
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  emptyInCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 16,
  },
  emptyInCardText: { fontSize: 13, color: D.textMuted },

  // Visit card
  visitCard: {
    flexDirection: 'row', backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border, marginBottom: 10, overflow: 'hidden',
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  visitStripe: { width: 4 },
  visitInner: { flex: 1, padding: 14 },
  visitTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  visitDateRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  visitLatestBadge: {
    backgroundColor: D.greenMuted, borderRadius: D.radius.pill,
    paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: D.greenBorder,
  },
  visitLatestText: { fontSize: 9, fontWeight: '700', color: D.green, letterSpacing: 0.5 },
  visitDate: { fontSize: 14, fontWeight: '700', color: D.text },
  visitStaffRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  visitStaff: { fontSize: 12, color: D.textSub, fontWeight: '500' },
  visitViewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: D.greenMuted, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: D.radius.pill, borderWidth: 1, borderColor: D.greenBorder,
  },
  visitViewBtnText: { fontSize: 11, fontWeight: '700', color: D.green },
  visitTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  visitTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.purpleMuted, paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: D.radius.pill, borderWidth: 1, borderColor: D.purpleBorder,
  },
  visitTagText: { fontSize: 11, fontWeight: '600', color: D.purple },

  // Empty
  center: { alignItems: 'center', justifyContent: 'center' },
  emptyCard: {
    alignItems: 'center', paddingVertical: 40,
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border,
  },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: D.radius.xl,
    backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border, marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: D.text, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: D.textMuted },
});