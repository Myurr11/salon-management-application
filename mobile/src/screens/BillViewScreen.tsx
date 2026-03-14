import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import type { Visit } from '../types';
import { colors, theme } from '../theme';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  border: '#E8E3DB',
  borderLight: '#F0EDE8',

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

  purple: '#7C5CBF',
  purpleMuted: '#7C5CBF15',
  purpleBorder: '#7C5CBF33',

  amber: '#D4872A',
  amberMuted: '#D4872A15',
  amberBorder: '#D4872A33',

  red: '#D94F4F',
  redMuted: '#D94F4F15',

  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

// ─── Payment mode config ──────────────────────────────────────────────────────
const PAYMENT_CFG: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  cash:   { icon: 'cash',          label: 'Cash',   color: D.green,  bg: D.greenMuted,  border: D.greenBorder  },
  upi:    { icon: 'cellphone',     label: 'UPI',    color: D.blue,   bg: D.blueMuted,   border: D.blueBorder   },
  card:   { icon: 'credit-card',   label: 'Card',   color: D.purple, bg: D.purpleMuted, border: D.purpleBorder },
  udhaar: { icon: 'clock-outline', label: 'Udhaar', color: D.amber,  bg: D.amberMuted,  border: D.amberBorder  },
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

interface Props {
  navigation?: any;
  route?: { params?: { visitId?: string } };
}

export const BillViewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { visits, branches } = useData();
  const visitId = route?.params?.visitId;
  const visit   = visitId ? visits.find(v => v.id === visitId) : undefined;
  const branchName = visit?.branchId
    ? branches.find((b: any) => b.id === visit.branchId)?.name
    : visit?.branchName;

  const handlePrint = () =>
    Alert.alert('Print', 'Bill printing feature will be available soon.');

  if (!visit) {
    return (
      <View style={[s.center, { flex: 1, backgroundColor: D.bg }]}>
        <View style={s.notFoundBox}>
          <MaterialCommunityIcons name="receipt" size={36} color={D.textMuted} />
        </View>
        <Text style={s.notFoundTitle}>Bill not found</Text>
        <Text style={s.notFoundHint}>This visit record may have been removed</Text>
      </View>
    );
  }

  const payMode = (visit.paymentMode ?? 'cash').toLowerCase();
  const pmtCfg  = PAYMENT_CFG[payMode] ?? PAYMENT_CFG.cash;

  const subtotal = [
    ...visit.services.map((sv: any) => sv.finalPrice),
    ...visit.products.map((p: any) => p.totalPrice),
  ].reduce((s, v) => s + v, 0);

  const discountAmt =
    visit.discountPercent ? subtotal * (visit.discountPercent / 100) :
    visit.discountAmount  ? visit.discountAmount : 0;

  const billNumber = visit.billNumber ?? `#${visit.id.slice(0, 8).toUpperCase()}`;

  // Attending staff display
  const staffDisplay = visit.attendingStaff && visit.attendingStaff.length > 0
    ? visit.attendingStaff.map((st: any) => st.staffName).join(', ')
    : visit.staffName;

  return (
    <View style={s.wrapper}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top navigation bar ── */}
        <View style={s.navBar}>
          {navigation && (
            <TouchableOpacity style={s.navBack} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <MaterialCommunityIcons name="arrow-left" size={20} color={D.text} />
            </TouchableOpacity>
          )}
          <Text style={s.navTitle}>Bill Receipt</Text>
          <TouchableOpacity style={s.navPrint} onPress={handlePrint} activeOpacity={0.8}>
            <MaterialCommunityIcons name="printer-outline" size={18} color={D.green} />
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════
            RECEIPT CARD
        ══════════════════════════════════════════ */}
        <View style={s.receipt}>

          {/* ── Green header band ── */}
          <View style={s.receiptHeader}>
            <View style={s.receiptHeaderGlow} />
            <View style={s.receiptLogoBox}>
              <MaterialCommunityIcons name="content-cut" size={22} color={D.green} />
            </View>
            <Text style={s.receiptSalonName}>SALON MANAGER</Text>
            {branchName && (
              <View style={s.receiptBranchPill}>
                <MaterialCommunityIcons name="office-building-outline" size={11} color={D.textMuted} />
                <Text style={s.receiptBranchText}>{branchName}</Text>
              </View>
            )}
            <Text style={s.receiptAddress}>123 Main Street, City  ·  +91 98765 43210</Text>
          </View>

          {/* ── Bill meta info ── */}
          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>BILL NO</Text>
              <Text style={s.metaValue}>{billNumber}</Text>
            </View>
            <View style={s.metaDivider} />
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>DATE</Text>
              <Text style={s.metaValue}>{fmtDate(visit.date)}</Text>
            </View>
            <View style={s.metaDivider} />
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>TIME</Text>
              <Text style={s.metaValue}>{fmtTime(visit.createdAt ?? visit.date)}</Text>
            </View>
          </View>

          {/* ── Customer + Staff ── */}
          <View style={s.peopleRow}>
            <View style={[s.peoplePill, { flex: 1 }]}>
              <View style={[s.peoplePillIcon, { backgroundColor: D.blueMuted, borderColor: D.blueBorder }]}>
                <MaterialCommunityIcons name="account-outline" size={14} color={D.blue} />
              </View>
              <View>
                <Text style={s.peoplePillLabel}>CUSTOMER</Text>
                <Text style={s.peoplePillValue} numberOfLines={1}>{visit.customerName}</Text>
              </View>
            </View>
            <View style={[s.peoplePill, { flex: 1 }]}>
              <View style={[s.peoplePillIcon, { backgroundColor: D.purpleMuted, borderColor: D.purpleBorder }]}>
                <MaterialCommunityIcons name="account-tie-outline" size={14} color={D.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.peoplePillLabel}>STAFF</Text>
                <Text style={s.peoplePillValue} numberOfLines={1}>{staffDisplay}</Text>
              </View>
            </View>
          </View>

          {/* ── Dashed separator ── */}
          <View style={s.dashedSep} />

          {/* ── Services ── */}
          {visit.services.length > 0 && (
            <View style={s.itemSection}>
              <View style={s.itemSectionHeader}>
                <View style={[s.itemSectionIconBox, { backgroundColor: D.purpleMuted, borderColor: D.purpleBorder }]}>
                  <MaterialCommunityIcons name="spa" size={13} color={D.purple} />
                </View>
                <Text style={[s.itemSectionTitle, { color: D.purple }]}>SERVICES</Text>
              </View>
              {visit.services.map((sv: any) => (
                <View key={sv.id} style={s.lineItem}>
                  <View style={s.lineItemLeft}>
                    <Text style={s.lineItemName}>{sv.serviceName}</Text>
                    {sv.finalPrice !== sv.basePrice && (
                      <Text style={s.lineItemDiscount}>
                        Was ₹{sv.basePrice}  ·  discount applied
                      </Text>
                    )}
                  </View>
                  <Text style={s.lineItemPrice}>₹{sv.finalPrice.toFixed(0)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Products ── */}
          {visit.products.length > 0 && (
            <View style={s.itemSection}>
              <View style={s.itemSectionHeader}>
                <View style={[s.itemSectionIconBox, { backgroundColor: D.amberMuted, borderColor: D.amberBorder }]}>
                  <MaterialCommunityIcons name="package-variant" size={13} color={D.amber} />
                </View>
                <Text style={[s.itemSectionTitle, { color: D.amber }]}>PRODUCTS</Text>
              </View>
              {visit.products.map((p: any) => (
                <View key={p.id} style={s.lineItem}>
                  <View style={s.lineItemLeft}>
                    <Text style={s.lineItemName}>{p.productName}</Text>
                    <Text style={s.lineItemSub}>₹{p.unitPrice} × {p.quantity}</Text>
                  </View>
                  <Text style={s.lineItemPrice}>₹{p.totalPrice.toFixed(0)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Dashed separator ── */}
          <View style={s.dashedSep} />

          {/* ── Bill breakdown ── */}
          <View style={s.breakdown}>
            <View style={s.breakdownRow}>
              <Text style={s.breakdownLabel}>Subtotal</Text>
              <Text style={s.breakdownValue}>₹{subtotal.toFixed(0)}</Text>
            </View>

            {discountAmt > 0 && (
              <View style={s.breakdownRow}>
                <View style={s.breakdownLabelRow}>
                  <Text style={[s.breakdownLabel, { color: D.red }]}>Discount</Text>
                  {visit.discountPercent && visit.discountPercent > 0 && (
                    <View style={[s.discountBadge]}>
                      <Text style={s.discountBadgeText}>{visit.discountPercent}% off</Text>
                    </View>
                  )}
                </View>
                <Text style={[s.breakdownValue, { color: D.red }]}>−₹{discountAmt.toFixed(0)}</Text>
              </View>
            )}

            {visit.overrideReason && (
              <View style={s.overrideRow}>
                <MaterialCommunityIcons name="pencil-outline" size={12} color={D.amber} />
                <Text style={s.overrideText}>Override: {visit.overrideReason}</Text>
              </View>
            )}

            {/* Total */}
            <View style={s.totalBlock}>
              <View style={s.totalBlockLeft}>
                <Text style={s.totalLabel}>TOTAL</Text>
                <View style={[s.paymentModePill, { backgroundColor: pmtCfg.bg, borderColor: pmtCfg.border }]}>
                  <MaterialCommunityIcons name={pmtCfg.icon as any} size={12} color={pmtCfg.color} />
                  <Text style={[s.paymentModeText, { color: pmtCfg.color }]}>{pmtCfg.label}</Text>
                </View>
              </View>
              <Text style={s.totalAmount}>₹{visit.total.toFixed(0)}</Text>
            </View>
          </View>

          {/* ── Dashed separator ── */}
          <View style={s.dashedSep} />

          {/* ── Thank you footer ── */}
          <View style={s.receiptFooter}>
            <View style={s.thankYouRow}>
              <MaterialCommunityIcons name="heart" size={14} color={D.red} />
              <Text style={s.thankYouText}>Thank you for your visit!</Text>
              <MaterialCommunityIcons name="heart" size={14} color={D.red} />
            </View>
            <Text style={s.footerTagline}>See you again soon ✨</Text>

            {/* Barcode-style decoration */}
            <View style={s.barcodeRow}>
              {Array.from({ length: 28 }).map((_, i) => (
                <View
                  key={i}
                  style={[s.barcodeBar, {
                    height: [16, 10, 20, 14, 18, 12, 22, 10, 16, 20, 14, 18, 10, 16,
                             20, 12, 18, 16, 10, 22, 14, 16, 18, 12, 10, 20, 16, 14][i],
                    opacity: 0.12,
                  }]}
                />
              ))}
            </View>
            <Text style={s.billIdText}>{billNumber}</Text>
          </View>

        </View>
        {/* END RECEIPT CARD */}

        {/* ── Action buttons ── */}
        <View style={s.actions}>
          <TouchableOpacity style={s.printBtn} onPress={handlePrint} activeOpacity={0.85}>
            <View style={s.printBtnIcon}>
              <MaterialCommunityIcons name="printer-outline" size={20} color={D.green} />
            </View>
            <Text style={s.printBtnText}>Print Bill</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          {navigation && (
            <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: D.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Not found
  notFoundBox: { width: 80, height: 80, borderRadius: D.radius.xl, backgroundColor: D.surface, borderWidth: 1, borderColor: D.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  notFoundTitle: { fontSize: 17, fontWeight: '700', color: D.text, marginBottom: 6 },
  notFoundHint: { fontSize: 13, color: D.textMuted },

  // Nav bar
  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
  },
  navBack: { width: 40, height: 40, borderRadius: D.radius.md, backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.border, marginRight: 12 },
  navTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  navPrint: { width: 40, height: 40, borderRadius: D.radius.md, backgroundColor: D.greenMuted, borderWidth: 1, borderColor: D.greenBorder, alignItems: 'center', justifyContent: 'center' },

  // Receipt card
  receipt: {
    backgroundColor: D.surface, marginHorizontal: 20, marginTop: 20,
    borderRadius: D.radius.xl, borderWidth: 1, borderColor: D.border, overflow: 'hidden',
    shadowColor: 'rgba(0,0,0,0.1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },

  // Receipt header (green band)
  receiptHeader: {
    backgroundColor: D.bg, alignItems: 'center',
    paddingTop: 24, paddingBottom: 20, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: D.border,
    position: 'relative', overflow: 'hidden',
  },
  receiptHeaderGlow: { position: 'absolute', top: -40, left: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: D.greenMuted },
  receiptLogoBox: {
    width: 56, height: 56, borderRadius: D.radius.lg,
    backgroundColor: D.surface, borderWidth: 2, borderColor: D.greenBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    shadowColor: D.green, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  receiptSalonName: { fontSize: 18, fontWeight: '800', color: D.text, letterSpacing: 2, marginBottom: 6 },
  receiptBranchPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: D.surface, borderRadius: D.radius.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: D.border, marginBottom: 6 },
  receiptBranchText: { fontSize: 11, color: D.textMuted, fontWeight: '600' },
  receiptAddress: { fontSize: 11, color: D.textMuted, textAlign: 'center', lineHeight: 16 },

  // Meta row
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontSize: 9, fontWeight: '700', color: D.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  metaValue: { fontSize: 12, fontWeight: '700', color: D.text, textAlign: 'center' },
  metaDivider: { width: 1, height: 28, backgroundColor: D.border },

  // People row
  peopleRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: D.border },
  peoplePill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: D.bg, borderRadius: D.radius.md, borderWidth: 1, borderColor: D.border, paddingHorizontal: 12, paddingVertical: 10 },
  peoplePillIcon: { width: 30, height: 30, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  peoplePillLabel: { fontSize: 9, fontWeight: '700', color: D.textMuted, letterSpacing: 1, marginBottom: 2 },
  peoplePillValue: { fontSize: 13, fontWeight: '700', color: D.text },

  // Dashed separator (receipt tear effect)
  dashedSep: { height: 1, borderTopWidth: 1, borderTopColor: D.border, borderStyle: 'dashed', marginVertical: 4, marginHorizontal: 16 },

  // Item sections
  itemSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  itemSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  itemSectionIconBox: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  itemSectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  lineItem: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: D.borderLight },
  lineItemLeft: { flex: 1, marginRight: 12 },
  lineItemName: { fontSize: 14, fontWeight: '600', color: D.text, marginBottom: 2 },
  lineItemSub: { fontSize: 11, color: D.textMuted, fontWeight: '500' },
  lineItemDiscount: { fontSize: 10, color: D.amber, fontWeight: '500', marginTop: 2 },
  lineItemPrice: { fontSize: 14, fontWeight: '800', color: D.text, letterSpacing: -0.2 },

  // Breakdown
  breakdown: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  breakdownLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakdownLabel: { fontSize: 14, color: D.textSub, fontWeight: '500' },
  breakdownValue: { fontSize: 14, fontWeight: '700', color: D.text },
  discountBadge: { backgroundColor: D.redMuted, borderRadius: D.radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  discountBadgeText: { fontSize: 10, fontWeight: '700', color: D.red },
  overrideRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: D.amberMuted, borderRadius: D.radius.md, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 12, borderWidth: 1, borderColor: D.amberBorder },
  overrideText: { fontSize: 12, color: D.amber, fontWeight: '500', flex: 1 },

  // Total block
  totalBlock: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: D.greenMuted, borderRadius: D.radius.xl,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 4,
    borderWidth: 1.5, borderColor: D.greenBorder,
    shadowColor: D.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  totalBlockLeft: { gap: 6 },
  totalLabel: { fontSize: 11, fontWeight: '800', color: D.green, letterSpacing: 2.5 },
  paymentModePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: D.radius.pill, borderWidth: 1 },
  paymentModeText: { fontSize: 11, fontWeight: '700' },
  totalAmount: { fontSize: 32, fontWeight: '800', color: D.green, letterSpacing: -1 },

  // Receipt footer
  receiptFooter: { paddingTop: 10, paddingBottom: 20, alignItems: 'center', backgroundColor: D.bg },
  thankYouRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  thankYouText: { fontSize: 14, fontWeight: '700', color: D.textSub },
  footerTagline: { fontSize: 12, color: D.textMuted, marginBottom: 16 },
  barcodeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 8 },
  barcodeBar: { width: 2.5, backgroundColor: D.text, borderRadius: 1 },
  billIdText: { fontSize: 10, fontWeight: '700', color: D.textMuted, letterSpacing: 2 },

  // Actions
  actions: { paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  printBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.green, borderRadius: D.radius.xl, paddingVertical: 16, paddingHorizontal: 18,
    shadowColor: D.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  printBtnIcon: { width: 38, height: 38, borderRadius: D.radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  printBtnText: { flex: 1, fontSize: 16, fontWeight: '800', color: '#FFF' },
  closeBtn: { borderRadius: D.radius.xl, paddingVertical: 14, alignItems: 'center', backgroundColor: D.surface, borderWidth: 1.5, borderColor: D.border },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: D.textSub },
});