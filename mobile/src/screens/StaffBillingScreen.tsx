import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { InventoryItem, PaymentMode, Service, VisitProductLine, VisitServiceLine, VisitStaff } from '../types';
import { colors, theme, shadows } from '../theme';
import { DatePickerField } from '../components/DatePickerField';

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
  redMuted: '#D94F4F15',
  redBorder: '#D94F4F33',

  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

interface Props { navigation: any; }
type CustomerMode = 'new' | 'existing';

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel = ({ n, icon, children }: { n: number; icon: string; children: string }) => (
  <View style={sl.row}>
    <View style={sl.numBox}><Text style={sl.num}>{n}</Text></View>
    <View style={sl.iconBox}>
      <MaterialCommunityIcons name={icon as any} size={14} color={D.green} />
    </View>
    <Text style={sl.text}>{children}</Text>
    <View style={sl.line} />
  </View>
);
const sl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14, marginTop: 6 },
  numBox: { width: 22, height: 22, borderRadius: 11, backgroundColor: D.green, alignItems: 'center', justifyContent: 'center' },
  num: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  iconBox: { width: 22, height: 22, borderRadius: 11, backgroundColor: D.greenMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.greenBorder },
  text: { color: D.text, fontSize: 13, fontWeight: '700' },
  line: { flex: 1, height: 1, backgroundColor: D.border },
});

// ─── Focusable input ──────────────────────────────────────────────────────────
const FInput: React.FC<{
  icon: string; placeholder: string; value: string;
  onChange: (t: string) => void; keyboard?: any; multiline?: boolean;
}> = ({ icon, placeholder, value, onChange, keyboard, multiline }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[fi.box, focused && fi.boxFocused]}>
      <View style={[fi.iconBox, focused && fi.iconFocused]}>
        <MaterialCommunityIcons name={icon as any} size={17} color={focused ? D.green : D.textMuted} />
      </View>
      <TextInput
        style={[fi.input, multiline && { minHeight: 72, textAlignVertical: 'top', paddingTop: 14 }]}
        placeholder={placeholder}
        placeholderTextColor={D.textMuted}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value.length > 0 && (
        <View style={fi.checkBox}>
          <MaterialCommunityIcons name="check" size={13} color={D.green} />
        </View>
      )}
    </View>
  );
};
const fi = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderRadius: D.radius.md,
    borderWidth: 1.5, borderColor: D.border, overflow: 'hidden', marginBottom: 10,
  },
  boxFocused: { borderColor: D.green },
  iconBox: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: D.bg, borderRightWidth: 1, borderRightColor: D.border },
  iconFocused: { backgroundColor: D.greenMuted, borderRightColor: D.greenBorder },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 13, fontSize: 14, color: D.text },
  checkBox: { paddingRight: 12, width: 30, alignItems: 'center' },
});

// ─── AVATAR COLORS ────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#1e3a5f', '#0d9488', '#059669', '#2563eb', '#7c3aed'];
const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const StaffBillingScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers } = useAuth();
  const { services, customers, inventory, addOrUpdateCustomer, recordVisit } = useData();

  const [attendingStaffIds, setAttendingStaffIds] = useState<string[]>([]);
  const [customerMode, setCustomerMode] = useState<CustomerMode>('new');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerDob, setCustomerDob] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGender, setCustomerGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedLines, setSelectedLines] = useState<VisitServiceLine[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<VisitProductLine[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [amountOverride, setAmountOverride] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const toggleService = (service: Service) => {
    const existing = selectedLines.find(l => l.serviceId === service.id);
    if (existing) {
      setSelectedLines(prev => prev.filter(l => l.serviceId !== service.id));
    } else {
      const price = Number(service.price);
      const safePrice = Number.isFinite(price) ? price : 0;
      setSelectedLines(prev => [...prev, {
        id: `${service.id}-${Date.now()}`, serviceId: service.id,
        serviceName: service.name, basePrice: safePrice, finalPrice: safePrice,
      }]);
    }
  };

  const updateLinePrice = (lineId: string, value: string) => {
    const numeric = Number(value.replace(/[^0-9.]/g, ''));
    setSelectedLines(prev => prev.map(l =>
      l.id === lineId ? { ...l, finalPrice: Number.isNaN(numeric) ? l.finalPrice : numeric } : l
    ));
  };

  const addProduct = (product: InventoryItem) => {
    if (product.quantity <= 0) { Alert.alert('Out of Stock', `${product.name} is out of stock.`); return; }
    const existing = selectedProducts.find(p => p.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.quantity) { Alert.alert('Limit Reached', `Only ${product.quantity} available.`); return; }
      setSelectedProducts(prev => prev.map(p => p.productId === product.id
        ? { ...p, quantity: p.quantity + 1, totalPrice: (p.quantity + 1) * p.unitPrice } : p));
    } else {
      setSelectedProducts(prev => [...prev, {
        id: `prod-${Date.now()}`, productId: product.id, productName: product.name,
        quantity: 1, unitPrice: product.price, totalPrice: product.price,
      }]);
    }
  };

  const updateProductQty = (productId: string, qty: number) => {
    const product = inventory.find(p => p.id === productId);
    if (!product) return;
    if (qty > product.quantity) { Alert.alert('Limit Reached', `Only ${product.quantity} available.`); return; }
    if (qty <= 0) { setSelectedProducts(prev => prev.filter(p => p.productId !== productId)); return; }
    setSelectedProducts(prev => prev.map(p =>
      p.productId === productId ? { ...p, quantity: qty, totalPrice: qty * p.unitPrice } : p));
  };

  const subtotal = useMemo(() =>
    selectedLines.reduce((s, l) => s + (Number.isFinite(l.finalPrice) ? l.finalPrice : 0), 0) +
    selectedProducts.reduce((s, p) => s + p.totalPrice, 0),
    [selectedLines, selectedProducts]);

  const total = useMemo(() => {
    let t = subtotal;
    const pct = parseFloat(discountPercent) || 0;
    if (pct > 0 && pct <= 100) t *= (1 - pct / 100);
    const amt = parseFloat(discountAmount) || 0;
    if (amt > 0) t = Math.max(0, t - amt);
    const ov = parseFloat(amountOverride);
    if (!isNaN(ov) && ov >= 0) t = ov;
    return t;
  }, [subtotal, discountPercent, discountAmount, amountOverride]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customers ?? [];
    return (customers ?? []).filter((c: any) =>
      c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q));
  }, [customers, customerSearch]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.toLowerCase().trim();
    if (!q) return services ?? [];
    return (services ?? []).filter((sv: Service) => sv.name?.toLowerCase().includes(q));
  }, [services, serviceSearch]);

  const filteredInventory = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    const inStock = (inventory ?? []).filter((item: any) => item.quantity > 0);
    if (!q) return inStock;
    return inStock.filter((item: any) => item.name?.toLowerCase().includes(q));
  }, [inventory, productSearch]);

  const toggleStaff = (id: string) => {
    setAttendingStaffIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getServiceIcon = (name: string): any => {
    const n = name.toLowerCase();
    if (n.includes('hair')) return 'hair-dryer';
    if (n.includes('cut')) return 'content-cut';
    if (n.includes('color') || n.includes('colour')) return 'palette';
    if (n.includes('wash') || n.includes('shampoo')) return 'shower';
    if (n.includes('style') || n.includes('blow')) return 'weather-windy';
    if (n.includes('spa') || n.includes('treatment')) return 'spa';
    if (n.includes('facial') || n.includes('face')) return 'face-woman';
    if (n.includes('massage')) return 'hand-heart';
    if (n.includes('nail') || n.includes('manicure') || n.includes('pedicure')) return 'hand-back-right';
    if (n.includes('wax')) return 'fire';
    if (n.includes('beard') || n.includes('shave')) return 'mustache';
    return 'star-circle';
  };

  const handleSubmit = async () => {
    if (attendingStaffIds.length === 0) { Alert.alert('Select Staff', 'Please select who attended the customer.'); return; }
    if (selectedLines.length === 0 && selectedProducts.length === 0) { Alert.alert('Add Items', 'Please select at least one service or product.'); return; }
    const overrideNum = amountOverride.trim() ? parseFloat(amountOverride) : undefined;
    if (overrideNum !== undefined && !overrideReason.trim()) { Alert.alert('Reason Required', 'Please enter a reason for overriding the amount.'); return; }

    setSubmitting(true);
    try {
      const primaryStaffId = attendingStaffIds[0];
      const primaryStaff = staffMembers.find(s => s.id === primaryStaffId);
      const attendingStaff: VisitStaff[] = attendingStaffIds.map(staffId => ({
        staffId, staffName: staffMembers.find(s => s.id === staffId)?.name || 'Unknown',
        revenueShare: total / attendingStaffIds.length,
      }));

      let customerId: string;
      let name: string;
      if (customerMode === 'existing') {
        if (!selectedCustomerId) { Alert.alert('Select Customer', 'Please select a customer.'); return; }
        const c = customers.find((c: any) => c.id === selectedCustomerId);
        if (!c) { Alert.alert('Error', 'Customer not found.'); return; }
        customerId = c?.id; name = c?.name;
      } else {
        if (!customerName.trim()) { Alert.alert('Name Required', 'Please enter customer name.'); return; }
        const created = await addOrUpdateCustomer({
          name: customerName.trim(), dob: customerDob.trim() || undefined,
          phone: customerPhone.trim() || undefined, email: customerEmail.trim() || undefined,
          gender: customerGender || undefined, address: customerAddress.trim() || undefined,
        });
        customerId = created?.id; name = created?.name;
      }

      const today = new Date();
      const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const visitId = await recordVisit({
        staffId: primaryStaffId, staffName: primaryStaff?.name || user?.name || 'Staff',
        customerId, customerName: name,
        branchId: primaryStaff?.branchId || user?.branchId || undefined,
        date: dateOnly, services: selectedLines, products: selectedProducts, total, paymentMode,
        discountPercent: parseFloat(discountPercent) || 0,
        discountAmount: parseFloat(discountAmount) || 0,
        amountOverride: overrideNum, overrideReason: overrideReason.trim() || undefined,
        attendingStaff,
      });

      Alert.alert('Visit Saved!', 'The visit has been recorded successfully.', [
        { text: 'View Bill', onPress: () => navigation.navigate('BillView', { visitId }) },
        { text: 'Done', style: 'cancel', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save visit.');
    } finally { setSubmitting(false); }
  };

  const PAYMENT_CFG = {
    cash:   { icon: 'cash',           label: 'Cash',   color: D.green,  bg: D.greenMuted,  border: D.greenBorder },
    upi:    { icon: 'cellphone',      label: 'UPI',    color: D.blue,   bg: D.blueMuted,   border: D.blueBorder  },
    card:   { icon: 'credit-card',    label: 'Card',   color: D.purple, bg: D.purpleMuted, border: D.purpleBorder},
    udhaar: { icon: 'clock-outline',  label: 'Udhaar', color: D.amber,  bg: D.amberMuted,  border: D.amberBorder },
  } as const;

  const discountValue = useMemo(() => subtotal - total, [subtotal, total]);

  return (
    <KeyboardAvoidingView style={s.wrapper} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {/* ── Page Header ── */}
        <View style={s.pageHeader}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={D.text} />
          </TouchableOpacity>
          <View style={s.pageHeaderIconBox}>
            <MaterialCommunityIcons name="receipt" size={22} color={D.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.pageHeaderTitle}>New Visit</Text>
            <Text style={s.pageHeaderSub}>Record a customer visit & bill</Text>
          </View>
        </View>

        {/* ══ 1. STAFF ═══════════════════════════════════════════════════════ */}
        <SectionLabel n={1} icon="account-group-outline">ATTENDING STAFF</SectionLabel>
        <View style={s.card}>
          <Text style={s.cardHint}>Select all staff who served this customer. Revenue splits equally.</Text>
          <View style={s.staffGrid}>
            {(staffMembers ?? []).map((staff: any) => {
              const active = attendingStaffIds.includes(staff.id);
              return (
                <TouchableOpacity
                  key={staff.id}
                  style={[s.staffChip, active && s.staffChipActive]}
                  onPress={() => toggleStaff(staff.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.staffChipAvatar, { backgroundColor: avatarColor(staff.name) }]}>
                    <Text style={s.staffChipAvatarText}>{initials(staff.name)}</Text>
                  </View>
                  <Text style={[s.staffChipName, active && s.staffChipNameActive]} numberOfLines={1}>
                    {staff.name.split(' ')[0]}
                  </Text>
                  {active && <MaterialCommunityIcons name="check-circle" size={15} color={D.green} />}
                </TouchableOpacity>
              );
            })}
          </View>
          {attendingStaffIds.length > 0 && (
            <View style={s.revShareBanner}>
              <MaterialCommunityIcons name="currency-inr" size={14} color={D.green} />
              <Text style={s.revShareText}>
                Each staff receives <Text style={{ fontWeight: '800' }}>₹{(total / attendingStaffIds.length).toFixed(0)}</Text>
                {attendingStaffIds.length > 1 ? ' (equal split)' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* ══ 2. CUSTOMER ════════════════════════════════════════════════════ */}
        <SectionLabel n={2} icon="account-outline">CUSTOMER DETAILS</SectionLabel>
        <View style={s.card}>
          {/* Mode toggle */}
          <View style={s.modeToggle}>
            {(['new', 'existing'] as CustomerMode[]).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[s.modeBtn, customerMode === mode && s.modeBtnActive]}
                onPress={() => setCustomerMode(mode)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={mode === 'new' ? 'account-plus-outline' : 'account-search-outline'}
                  size={16}
                  color={customerMode === mode ? D.green : D.textMuted}
                />
                <Text style={[s.modeBtnText, customerMode === mode && s.modeBtnTextActive]}>
                  {mode === 'new' ? 'New Customer' : 'Existing Customer'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {customerMode === 'existing' ? (
            customers.length === 0 ? (
              <View style={s.emptyBlock}>
                <MaterialCommunityIcons name="account-off-outline" size={32} color={D.textMuted} />
                <Text style={s.emptyBlockText}>No customers yet. Add a new one.</Text>
              </View>
            ) : (
              <>
                <View style={s.searchBar}>
                  <View style={s.searchBarIcon}>
                    <MaterialCommunityIcons name="magnify" size={17} color={D.textMuted} />
                  </View>
                  <TextInput
                    style={s.searchBarInput}
                    placeholder="Search by name or phone…"
                    placeholderTextColor={D.textMuted}
                    value={customerSearch}
                    onChangeText={setCustomerSearch}
                  />
                  {customerSearch.length > 0 && (
                    <TouchableOpacity style={s.searchBarClear} onPress={() => setCustomerSearch('')}>
                      <MaterialCommunityIcons name="close-circle" size={15} color={D.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                {filteredCustomers.length === 0 ? (
                  <View style={s.emptyBlock}>
                    <MaterialCommunityIcons name="account-search-outline" size={28} color={D.textMuted} />
                    <Text style={s.emptyBlockText}>No customers match "{customerSearch}"</Text>
                  </View>
                ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                {filteredCustomers.map((item: any) => {
                  const active = selectedCustomerId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[s.customerTile, active && s.customerTileActive]}
                      onPress={() => setSelectedCustomerId(item.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[s.customerTileAvatar, { backgroundColor: active ? D.green : '#E8E3DB' }]}>
                        <Text style={[s.customerTileAvatarText, { color: active ? '#FFF' : D.textSub }]}>
                          {initials(item.name)}
                        </Text>
                      </View>
                      <Text style={[s.customerTileName, active && { color: D.green }]} numberOfLines={2}>{item.name}</Text>
                      {item.phone && <Text style={s.customerTilePhone}>{item.phone}</Text>}
                      {active && (
                        <View style={s.customerTileCheck}>
                          <MaterialCommunityIcons name="check" size={11} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
                )}
              </>
            )
          ) : (
            <View style={{ gap: 0 }}>
              <FInput icon="account-outline" placeholder="Customer name *" value={customerName} onChange={setCustomerName} />
              <DatePickerField value={customerDob} onChange={setCustomerDob} placeholder="Date of birth (optional)" style={fi.box} maximumDate={new Date()} />
              <FInput icon="phone-outline" placeholder="Phone (optional)" value={customerPhone} onChange={setCustomerPhone} keyboard="phone-pad" />
              <FInput icon="email-outline" placeholder="Email (optional)" value={customerEmail} onChange={setCustomerEmail} keyboard="email-address" />
              {/* Gender */}
              <View style={s.genderRow}>
                {(['male', 'female', 'other'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[s.genderChip, customerGender === g && s.genderChipActive]}
                    onPress={() => setCustomerGender(customerGender === g ? '' : g)}
                  >
                    <MaterialCommunityIcons
                      name={g === 'male' ? 'gender-male' : g === 'female' ? 'gender-female' : 'gender-non-binary'}
                      size={14}
                      color={customerGender === g ? D.green : D.textMuted}
                    />
                    <Text style={[s.genderChipText, customerGender === g && s.genderChipTextActive]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <FInput icon="map-marker-outline" placeholder="Address (optional)" value={customerAddress} onChange={setCustomerAddress} />
            </View>
          )}
        </View>

        {/* ══ 3. SERVICES ════════════════════════════════════════════════════ */}
        <SectionLabel n={3} icon="spa">SERVICES</SectionLabel>
        <View style={s.card}>
          <View style={s.searchBar}>
            <View style={s.searchBarIcon}>
              <MaterialCommunityIcons name="magnify" size={17} color={D.textMuted} />
            </View>
            <TextInput
              style={s.searchBarInput}
              placeholder="Search services…"
              placeholderTextColor={D.textMuted}
              value={serviceSearch}
              onChangeText={setServiceSearch}
            />
            {serviceSearch.length > 0 && (
              <TouchableOpacity style={s.searchBarClear} onPress={() => setServiceSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={15} color={D.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          {filteredServices.length === 0 ? (
            <View style={s.emptyBlock}>
              <MaterialCommunityIcons name="spa" size={28} color={D.textMuted} />
              <Text style={s.emptyBlockText}>No services match "{serviceSearch}"</Text>
            </View>
          ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
            {filteredServices.map((item: Service) => {
              const active = selectedLines.some(l => l.serviceId === item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.serviceTile, active && s.serviceTileActive]}
                  onPress={() => toggleService(item)}
                  activeOpacity={0.8}
                >
                  <View style={[s.serviceTileIcon, active && { backgroundColor: D.greenMuted, borderColor: D.greenBorder }]}>
                    <MaterialCommunityIcons name={getServiceIcon(item.name)} size={22} color={active ? D.green : D.textSub} />
                  </View>
                  <Text style={[s.serviceTileName, active && { color: D.green }]} numberOfLines={2}>{item.name}</Text>
                  <Text style={[s.serviceTilePrice, active && { color: D.green }]}>₹{item.price}</Text>
                  {active && (
                    <View style={s.serviceTileCheck}>
                      <MaterialCommunityIcons name="check" size={11} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          )}

          {/* Selected services price editor */}
          {selectedLines.length > 0 && (
            <View style={s.selectedSection}>
              <View style={s.selectedSectionHeader}>
                <MaterialCommunityIcons name="check-circle-outline" size={14} color={D.green} />
                <Text style={s.selectedSectionTitle}>{selectedLines.length} service{selectedLines.length > 1 ? 's' : ''} selected</Text>
              </View>
              {selectedLines.map((line, i) => (
                <View key={line.id} style={[s.lineRow, i < selectedLines.length - 1 && { borderBottomWidth: 1, borderBottomColor: D.border }]}>
                  <View style={[s.lineIconBox, { backgroundColor: D.greenMuted, borderColor: D.greenBorder }]}>
                    <MaterialCommunityIcons name={getServiceIcon(line.serviceName)} size={16} color={D.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.lineName}>{line.serviceName}</Text>
                    <Text style={s.lineBase}>Base ₹{line.basePrice}</Text>
                  </View>
                  <View style={s.linePriceBox}>
                    <Text style={s.linePriceLabel}>FINAL</Text>
                    <TextInput
                      style={s.linePriceInput}
                      keyboardType="numeric"
                      value={String(line.finalPrice)}
                      onChangeText={val => updateLinePrice(line.id, val)}
                      selectTextOnFocus
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ══ 4. PRODUCTS ════════════════════════════════════════════════════ */}
        <SectionLabel n={4} icon="package-variant">PRODUCTS</SectionLabel>
        <View style={s.card}>
          <View style={s.searchBar}>
            <View style={s.searchBarIcon}>
              <MaterialCommunityIcons name="magnify" size={17} color={D.textMuted} />
            </View>
            <TextInput
              style={s.searchBarInput}
              placeholder="Search products…"
              placeholderTextColor={D.textMuted}
              value={productSearch}
              onChangeText={setProductSearch}
            />
            {productSearch.length > 0 && (
              <TouchableOpacity style={s.searchBarClear} onPress={() => setProductSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={15} color={D.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          {filteredInventory.length === 0 ? (
            <View style={s.emptyBlock}>
              <MaterialCommunityIcons name="package-variant" size={28} color={D.textMuted} />
              <Text style={s.emptyBlockText}>{productSearch ? `No products match "${productSearch}"` : 'No products in stock'}</Text>
            </View>
          ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
            {filteredInventory.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={s.productTile}
                onPress={() => addProduct(item)}
                activeOpacity={0.8}
              >
                <View style={s.productTileIcon}>
                  <MaterialCommunityIcons name="spray" size={22} color={D.purple} />
                </View>
                <Text style={s.productTileName} numberOfLines={2}>{item.name}</Text>
                <Text style={s.productTilePrice}>₹{item.price}</Text>
                <View style={s.productTileStock}>
                  <Text style={s.productTileStockText}>{item.quantity} left</Text>
                </View>
                <View style={s.productTileAddBtn}>
                  <MaterialCommunityIcons name="plus" size={14} color={D.purple} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          )}

          {selectedProducts.length > 0 && (
            <View style={s.selectedSection}>
              <View style={s.selectedSectionHeader}>
                <MaterialCommunityIcons name="check-circle-outline" size={14} color={D.purple} />
                <Text style={[s.selectedSectionTitle, { color: D.purple }]}>{selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected</Text>
              </View>
              {selectedProducts.map((p, i) => (
                <View key={p.productId} style={[s.lineRow, i < selectedProducts.length - 1 && { borderBottomWidth: 1, borderBottomColor: D.border }]}>
                  <View style={[s.lineIconBox, { backgroundColor: D.purpleMuted, borderColor: D.purpleBorder }]}>
                    <MaterialCommunityIcons name="spray" size={16} color={D.purple} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.lineName}>{p.productName}</Text>
                    <Text style={s.lineBase}>₹{p.unitPrice} per unit</Text>
                  </View>
                  <View style={s.qtyRow}>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => updateProductQty(p.productId, p.quantity - 1)}>
                      <Text style={s.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.qtyValue}>{p.quantity}</Text>
                    <TouchableOpacity style={[s.qtyBtn, s.qtyBtnAdd]} onPress={() => updateProductQty(p.productId, p.quantity + 1)}>
                      <Text style={[s.qtyBtnText, { color: D.green }]}>+</Text>
                    </TouchableOpacity>
                    <Text style={s.qtyTotal}>₹{p.totalPrice.toFixed(0)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ══ 5. PAYMENT ═════════════════════════════════════════════════════ */}
        <SectionLabel n={5} icon="cash-multiple">PAYMENT</SectionLabel>
        <View style={s.card}>
          {/* Payment mode */}
          <View style={s.paymentModeRow}>
            {(['cash', 'upi', 'card', 'udhaar'] as PaymentMode[]).map(mode => {
              const cfg = PAYMENT_CFG[mode];
              return (
              <TouchableOpacity
                key={mode}
                style={[s.paymentModeBtn, paymentMode === mode && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                onPress={() => setPaymentMode(mode)}
                activeOpacity={0.8}
              >
                <View style={[s.paymentModeBtnIcon, { backgroundColor: paymentMode === mode ? cfg.bg : D.bg }]}>
                  <MaterialCommunityIcons name={cfg.icon as any} size={18} color={paymentMode === mode ? cfg.color : D.textMuted} />
                </View>
                <Text style={[s.paymentModeBtnText, paymentMode === mode && { color: cfg.color }]}>{cfg.label}</Text>
              </TouchableOpacity>
            );
          })}
          </View>

          {/* Discounts */}
          <View style={s.discountRow}>
            <View style={[s.discountInput]}>
              <View style={s.discountInputIcon}>
                <MaterialCommunityIcons name="percent" size={15} color={D.textMuted} />
              </View>
              <TextInput
                style={s.discountInputField}
                placeholder="Discount %"
                placeholderTextColor={D.textMuted}
                keyboardType="numeric"
                value={discountPercent}
                onChangeText={setDiscountPercent}
              />
            </View>
            <View style={[s.discountInput]}>
              <View style={s.discountInputIcon}>
                <Text style={{ fontSize: 13, color: D.textMuted, fontWeight: '700' }}>₹</Text>
              </View>
              <TextInput
                style={s.discountInputField}
                placeholder="Discount ₹"
                placeholderTextColor={D.textMuted}
                keyboardType="numeric"
                value={discountAmount}
                onChangeText={setDiscountAmount}
              />
            </View>
          </View>

          {/* Override */}
          <View style={[s.overrideBox, amountOverride.trim() && { borderColor: D.amberBorder, backgroundColor: D.amberMuted }]}>
            <View style={s.discountInputIcon}>
              <MaterialCommunityIcons name="pencil-outline" size={15} color={amountOverride.trim() ? D.amber : D.textMuted} />
            </View>
            <TextInput
              style={s.discountInputField}
              placeholder="Override final amount (₹)"
              placeholderTextColor={D.textMuted}
              keyboardType="numeric"
              value={amountOverride}
              onChangeText={setAmountOverride}
            />
          </View>
          {amountOverride.trim() && (
            <FInput icon="comment-outline" placeholder="Reason for override (required)" value={overrideReason} onChange={setOverrideReason} />
          )}

          {/* Bill breakdown */}
          <View style={s.billBreakdown}>
            <View style={s.billRow}>
              <Text style={s.billRowLabel}>Subtotal</Text>
              <Text style={s.billRowValue}>₹{subtotal.toFixed(0)}</Text>
            </View>
            {discountValue > 0 && (
              <View style={s.billRow}>
                <Text style={[s.billRowLabel, { color: D.green }]}>Discount</Text>
                <Text style={[s.billRowValue, { color: D.green }]}>−₹{discountValue.toFixed(0)}</Text>
              </View>
            )}
            {amountOverride.trim() && (
              <View style={s.billRow}>
                <Text style={[s.billRowLabel, { color: D.amber }]}>Override</Text>
                <Text style={[s.billRowValue, { color: D.amber }]}>₹{parseFloat(amountOverride).toFixed(0)}</Text>
              </View>
            )}
            <View style={s.billDivider} />
            <View style={s.billRow}>
              <Text style={s.billTotalLabel}>TOTAL</Text>
              <Text style={s.billTotalValue}>₹{total.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* ══ SAVE BUTTON ════════════════════════════════════════════════════ */}
        <TouchableOpacity
          style={[s.saveBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <View style={s.saveBtnIcon}>
                <MaterialCommunityIcons name="check" size={22} color={D.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.saveBtnTitle}>Save Visit</Text>
                <Text style={s.saveBtnSub}>Total: ₹{total.toFixed(0)} · {paymentMode.toUpperCase()}</Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={20} color="rgba(255,255,255,0.6)" />
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: D.bg },
  scrollContent: { paddingBottom: 32, paddingHorizontal: 20 },

  // Page header
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 52, paddingBottom: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: D.radius.md,
    backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
  },
  pageHeaderIconBox: {
    width: 44, height: 44, borderRadius: D.radius.md,
    backgroundColor: D.greenMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.greenBorder,
  },
  pageHeaderTitle: { fontSize: 18, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  pageHeaderSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },

  // Card
  card: {
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border, padding: 16, marginBottom: 16,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  cardHint: { fontSize: 12, color: D.textMuted, marginBottom: 12, lineHeight: 17 },

  // Staff
  staffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  staffChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: D.bg, borderRadius: D.radius.lg,
    borderWidth: 1.5, borderColor: D.border,
  },
  staffChipActive: { backgroundColor: D.greenMuted, borderColor: D.green },
  staffChipAvatar: { width: 28, height: 28, borderRadius: D.radius.sm, alignItems: 'center', justifyContent: 'center' },
  staffChipAvatarText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  staffChipName: { fontSize: 13, fontWeight: '600', color: D.textSub, maxWidth: 80 },
  staffChipNameActive: { color: D.green },
  revShareBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: D.greenMuted, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.greenBorder,
  },
  revShareText: { fontSize: 13, color: D.green },

  // Customer
  modeToggle: {
    flexDirection: 'row', gap: 8, marginBottom: 14,
    backgroundColor: D.bg, borderRadius: D.radius.lg, padding: 4,
    borderWidth: 1, borderColor: D.border,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 10, borderRadius: D.radius.md,
  },
  modeBtnActive: { backgroundColor: D.surface, borderWidth: 1, borderColor: D.greenBorder },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: D.textMuted },
  modeBtnTextActive: { color: D.green },
  customerTile: {
    width: 90, alignItems: 'center', backgroundColor: D.surface,
    borderRadius: D.radius.lg, borderWidth: 1.5, borderColor: D.border,
    padding: 12, position: 'relative',
  },
  customerTileActive: { borderColor: D.green, backgroundColor: D.greenMuted },
  customerTileAvatar: {
    width: 44, height: 44, borderRadius: D.radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  customerTileAvatarText: { fontSize: 15, fontWeight: '800' },
  customerTileName: { fontSize: 11, fontWeight: '700', color: D.text, textAlign: 'center', marginBottom: 3 },
  customerTilePhone: { fontSize: 10, color: D.textMuted, textAlign: 'center' },
  customerTileCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9, backgroundColor: D.green,
    alignItems: 'center', justifyContent: 'center',
  },
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  genderChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, backgroundColor: D.bg,
    borderRadius: D.radius.md, borderWidth: 1.5, borderColor: D.border,
  },
  genderChipActive: { backgroundColor: D.greenMuted, borderColor: D.green },
  genderChipText: { fontSize: 13, fontWeight: '600', color: D.textMuted },
  genderChipTextActive: { color: D.green },
  emptyBlock: { alignItems: 'center', paddingVertical: 24 },
  emptyBlockText: { fontSize: 13, color: D.textMuted, marginTop: 8 },

  // Search bar (reused across customer/service/product)
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.bg, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.border, overflow: 'hidden',
    marginBottom: 12,
  },
  searchBarIcon: {
    width: 40, height: 42, alignItems: 'center', justifyContent: 'center',
    borderRightWidth: 1, borderRightColor: D.border,
  },
  searchBarInput: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, color: D.text,
  },
  searchBarClear: { paddingHorizontal: 10 },

  // Service / Product tiles
  serviceTile: {
    width: 92, alignItems: 'center', backgroundColor: D.surface,
    borderRadius: D.radius.lg, borderWidth: 1.5, borderColor: D.border, padding: 12,
    position: 'relative',
  },
  serviceTileActive: { borderColor: D.green, backgroundColor: D.greenMuted },
  serviceTileIcon: {
    width: 48, height: 48, borderRadius: D.radius.md,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border, marginBottom: 8,
  },
  serviceTileName: { fontSize: 11, fontWeight: '600', color: D.text, textAlign: 'center', marginBottom: 5, minHeight: 30 },
  serviceTilePrice: { fontSize: 13, fontWeight: '800', color: D.textSub },
  serviceTileCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9, backgroundColor: D.green,
    alignItems: 'center', justifyContent: 'center',
  },
  productTile: {
    width: 92, alignItems: 'center',
    borderRadius: D.radius.lg, borderWidth: 1.5, borderColor: D.purpleBorder,
    backgroundColor: D.purpleMuted, padding: 12, position: 'relative',
  },
  productTileIcon: {
    width: 48, height: 48, borderRadius: D.radius.md,
    backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.purpleBorder, marginBottom: 8,
  },
  productTileName: { fontSize: 11, fontWeight: '600', color: D.text, textAlign: 'center', marginBottom: 4, minHeight: 30 },
  productTilePrice: { fontSize: 13, fontWeight: '800', color: D.purple },
  productTileStock: { marginTop: 4, backgroundColor: D.surface, paddingHorizontal: 7, paddingVertical: 2, borderRadius: D.radius.pill, borderWidth: 1, borderColor: D.purpleBorder },
  productTileStockText: { fontSize: 9, fontWeight: '600', color: D.purple },
  productTileAddBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10, backgroundColor: D.surface,
    borderWidth: 1, borderColor: D.purpleBorder, alignItems: 'center', justifyContent: 'center',
  },

  // Selected section
  selectedSection: {
    marginTop: 14, backgroundColor: D.bg, borderRadius: D.radius.lg,
    borderWidth: 1, borderColor: D.border, overflow: 'hidden',
  },
  selectedSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: D.border,
    backgroundColor: D.greenMuted,
  },
  selectedSectionTitle: { fontSize: 11, fontWeight: '700', color: D.green, letterSpacing: 0.5 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  lineIconBox: {
    width: 34, height: 34, borderRadius: D.radius.sm,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  lineName: { fontSize: 13, fontWeight: '700', color: D.text },
  lineBase: { fontSize: 11, color: D.textMuted, marginTop: 1 },
  linePriceBox: { alignItems: 'flex-end' },
  linePriceLabel: { fontSize: 9, color: D.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  linePriceInput: {
    minWidth: 72, borderRadius: D.radius.md, borderWidth: 1.5, borderColor: D.greenBorder,
    backgroundColor: D.surface, paddingHorizontal: 10, paddingVertical: 6,
    color: D.green, fontSize: 15, fontWeight: '800', textAlign: 'right',
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: D.radius.sm,
    backgroundColor: D.bg, borderWidth: 1, borderColor: D.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnAdd: { borderColor: D.greenBorder, backgroundColor: D.greenMuted },
  qtyBtnText: { fontSize: 17, fontWeight: '700', color: D.textSub, lineHeight: 22 },
  qtyValue: { fontSize: 15, fontWeight: '800', color: D.text, minWidth: 20, textAlign: 'center' },
  qtyTotal: { fontSize: 14, fontWeight: '800', color: D.green, minWidth: 56, textAlign: 'right' },

  // Payment
  paymentModeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  paymentModeBtn: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12,
    backgroundColor: D.bg, borderRadius: D.radius.lg, borderWidth: 1.5, borderColor: D.border,
  },
  paymentModeBtnIcon: {
    width: 36, height: 36, borderRadius: D.radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  paymentModeBtnText: { fontSize: 11, fontWeight: '700', color: D.textMuted },
  discountRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  discountInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.bg, borderRadius: D.radius.md, borderWidth: 1, borderColor: D.border, overflow: 'hidden',
  },
  discountInputIcon: { width: 38, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: D.border, height: 44 },
  discountInputField: { flex: 1, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14, color: D.text },
  overrideBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.bg, borderRadius: D.radius.md, borderWidth: 1, borderColor: D.border,
    overflow: 'hidden', marginBottom: 10,
  },
  billBreakdown: {
    marginTop: 14, backgroundColor: D.bg, borderRadius: D.radius.lg,
    borderWidth: 1, borderColor: D.border, padding: 14,
  },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  billRowLabel: { fontSize: 13, color: D.textSub, fontWeight: '500' },
  billRowValue: { fontSize: 14, fontWeight: '700', color: D.text },
  billDivider: { height: 1, backgroundColor: D.border, marginVertical: 8 },
  billTotalLabel: { fontSize: 11, fontWeight: '800', color: D.text, letterSpacing: 2 },
  billTotalValue: { fontSize: 22, fontWeight: '800', color: D.green, letterSpacing: -0.5 },

  // Save button
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: D.text, borderRadius: D.radius.xl,
    paddingVertical: 18, paddingHorizontal: 20,
    shadowColor: D.text, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 8,
    marginTop: 8,
  },
  saveBtnIcon: {
    width: 46, height: 46, borderRadius: D.radius.lg,
    backgroundColor: D.greenMuted, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: -0.3 },
  saveBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
});