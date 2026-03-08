import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import type { InventoryItem, InventoryItemType } from '../types';
import { colors, theme, shadows } from '../theme';
import * as supabaseService from '../services/supabaseService';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceWarm: '#FFFDF9',
  border: '#E8E3DB',
  borderFocus: '#C9A84C',
  gold: '#C9A84C',
  goldLight: '#E8C96A',
  goldMuted: '#C9A84C18',
  goldBorder: '#C9A84C44',
  text: '#1A1814',
  textSub: '#6B6560',
  textMuted: '#A09A8F',
  green: '#2D9A5F',
  greenMuted: '#2D9A5F15',
  greenBorder: '#2D9A5F33',
  red: '#D94F4F',
  redMuted: '#D94F4F15',
  redBorder: '#D94F4F33',
  amber: '#D4872A',
  amberMuted: '#D4872A15',
  amberBorder: '#D4872A33',
  blue: '#3A7EC8',
  blueMuted: '#3A7EC815',
  blueBorder: '#3A7EC833',
  purple: '#7C5CBF',
  purpleMuted: '#7C5CBF15',
  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

interface Props { navigation: any; }
type InventoryTab = 'retail' | 'consumable';

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: string }) => (
  <View style={sl.row}>
    <View style={sl.dash} />
    <Text style={sl.text}>{children}</Text>
    <View style={sl.line} />
  </View>
);
const sl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: 4 },
  dash: { width: 16, height: 2, backgroundColor: D.gold, borderRadius: 1 },
  line: { flex: 1, height: 1, backgroundColor: D.border },
  text: { color: D.gold, fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
});

// ─── Modal Input ──────────────────────────────────────────────────────────────
const MInput: React.FC<{
  label: string;
  icon: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  keyboard?: 'default' | 'numeric';
  hint?: string;
}> = ({ label, icon, value, onChange, placeholder, keyboard = 'default', hint }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={mi.group}>
      <View style={mi.labelRow}>
        <Text style={mi.label}>{label}</Text>
        {hint && <Text style={mi.hint}>{hint}</Text>}
      </View>
      <View style={[mi.box, focused && mi.boxFocused]}>
        <View style={[mi.iconBox, focused && mi.iconFocused]}>
          <MaterialCommunityIcons name={icon as any} size={18} color={focused ? D.gold : D.textMuted} />
        </View>
        <TextInput
          style={mi.input}
          placeholder={placeholder}
          placeholderTextColor={D.textMuted}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboard}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
};
const mi = StyleSheet.create({
  group: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '700', color: D.text, letterSpacing: 0.2 },
  hint: { fontSize: 11, color: D.textMuted },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.bg,
    borderRadius: D.radius.md,
    borderWidth: 1.5,
    borderColor: D.border,
    overflow: 'hidden',
  },
  boxFocused: { borderColor: D.gold },
  iconBox: {
    width: 42,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: D.surface,
    borderRightWidth: 1,
    borderRightColor: D.border,
  },
  iconFocused: { backgroundColor: D.goldMuted, borderRightColor: D.goldBorder },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: D.text,
    fontWeight: '500',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const AdminInventoryScreen: React.FC<Props> = ({ navigation }) => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, refreshData } = useData();
  const [activeTab, setActiveTab] = useState<InventoryTab>('retail');
  const [modalVisible, setModalVisible] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '', quantity: '', minThreshold: '', price: '', costPrice: '',
    itemType: 'retail' as InventoryItemType, supplier: '', sku: '', unit: 'units',
  });
  const [purchaseData, setPurchaseData] = useState({
    quantity: '', unitCost: '', supplier: '', invoiceNumber: '', notes: '',
  });

  const filteredInventory = useMemo(
    () => inventory.filter(item => (item.itemType || 'retail') === activeTab),
    [inventory, activeTab],
  );

  const analytics = useMemo(() => {
    const retail = inventory.filter(i => (i.itemType || 'retail') === 'retail');
    const consumable = inventory.filter(i => (i.itemType || 'retail') === 'consumable');
    return {
      retailCount: retail.length,
      consumableCount: consumable.length,
      retailStockValue: retail.reduce((s, i) => s + i.quantity * i.price, 0),
      retailProfitPotential: retail.reduce((s, i) => s + i.quantity * (i.price - (i.costPrice || 0)), 0),
      lowStock: inventory.filter(i => i.quantity <= i.minThreshold).length,
    };
  }, [inventory]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ name: '', quantity: '', minThreshold: '', price: '', costPrice: '', itemType: activeTab, supplier: '', sku: '', unit: 'units' });
    setModalVisible(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name, quantity: String(item.quantity), minThreshold: String(item.minThreshold),
      price: String(item.price), costPrice: item.costPrice != null ? String(item.costPrice) : '',
      itemType: item.itemType || 'retail', supplier: item.supplier || '', sku: item.sku || '', unit: item.unit || 'units',
    });
    setModalVisible(true);
  };

  const openPurchaseModal = (item: InventoryItem) => {
    setSelectedItemForPurchase(item);
    setPurchaseData({ quantity: '', unitCost: item.costPrice ? String(item.costPrice) : '', supplier: '', invoiceNumber: '', notes: '' });
    setPurchaseModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { Alert.alert('Error', 'Please enter item name.'); return; }
    const quantity = parseInt(formData.quantity, 10);
    const minThreshold = parseInt(formData.minThreshold, 10);
    const price = parseFloat(formData.price);
    const costPrice = formData.costPrice.trim() ? parseFloat(formData.costPrice) : undefined;
    if (isNaN(quantity) || quantity < 0) { Alert.alert('Error', 'Enter a valid quantity.'); return; }
    if (isNaN(minThreshold) || minThreshold < 0) { Alert.alert('Error', 'Enter a valid minimum threshold.'); return; }
    if (isNaN(price) || price < 0) { Alert.alert('Error', 'Enter a valid selling price.'); return; }
    try {
      const payload = {
        name: formData.name.trim(), quantity, minThreshold, price,
        costPrice: costPrice ?? undefined, itemType: formData.itemType,
        supplier: formData.supplier.trim() || undefined, sku: formData.sku.trim() || undefined,
        unit: formData.unit.trim() || 'units',
      };
      if (editingItem) {
        await updateInventoryItem(editingItem.id, payload);
        Alert.alert('Updated', 'Item updated successfully.');
      } else {
        await addInventoryItem(payload);
        Alert.alert('Added', 'Item added successfully.');
      }
      setModalVisible(false);
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to save.'); }
  };

  const handlePurchase = async () => {
    if (!selectedItemForPurchase) return;
    const quantity = parseInt(purchaseData.quantity, 10);
    const unitCost = parseFloat(purchaseData.unitCost);
    if (isNaN(quantity) || quantity <= 0) { Alert.alert('Error', 'Enter a valid quantity.'); return; }
    if (isNaN(unitCost) || unitCost < 0) { Alert.alert('Error', 'Enter a valid unit cost.'); return; }
    try {
      await supabaseService.addStockPurchase({
        itemId: selectedItemForPurchase.id, quantity, unitCost, totalCost: quantity * unitCost,
        supplier: purchaseData.supplier.trim() || undefined,
        invoiceNumber: purchaseData.invoiceNumber.trim() || undefined,
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: purchaseData.notes.trim() || undefined,
      });
      await refreshData();
      Alert.alert('Done', 'Stock purchase recorded.');
      setPurchaseModalVisible(false);
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to record purchase.'); }
  };

  const handleDelete = (item: InventoryItem) => {
    Alert.alert('Delete Item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteInventoryItem(item.id); }
        catch (e: any) { Alert.alert('Error', e.message || 'Failed to delete.'); }
      }},
    ]);
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return { text: 'Out of Stock', color: D.red, bg: D.redMuted, border: D.redBorder };
    if (item.quantity <= item.minThreshold) return { text: 'Low Stock', color: D.amber, bg: D.amberMuted, border: D.amberBorder };
    return { text: 'In Stock', color: D.green, bg: D.greenMuted, border: D.greenBorder };
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const status = getStockStatus(item);
    const stockPct = Math.min((item.quantity / Math.max(item.minThreshold * 3, 1)) * 100, 100);
    const isRetail = (item.itemType || 'retail') === 'retail';
    const margin = item.costPrice && item.price ? (((item.price - item.costPrice) / item.price) * 100).toFixed(0) : null;

    return (
      <View style={s.card}>
        {/* Status stripe */}
        <View style={[s.cardStripe, { backgroundColor: status.color }]} />

        <View style={s.cardInner}>
          {/* Top Row */}
          <View style={s.cardTop}>
            <View style={[s.cardIconBox, { backgroundColor: status.bg, borderColor: status.border }]}>
              <MaterialCommunityIcons
                name={isRetail ? 'package-variant' : 'spray'}
                size={22}
                color={status.color}
              />
            </View>

            <View style={s.cardNameWrap}>
              <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
              <View style={s.cardPillRow}>
                <View style={[s.typePill, { backgroundColor: isRetail ? D.blueMuted : D.greenMuted, borderColor: isRetail ? D.blueBorder : D.greenBorder }]}>
                  <Text style={[s.typePillText, { color: isRetail ? D.blue : D.green }]}>
                    {isRetail ? 'Retail' : 'Consumable'}
                  </Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: status.bg, borderColor: status.border }]}>
                  <View style={[s.statusDot, { backgroundColor: status.color }]} />
                  <Text style={[s.statusPillText, { color: status.color }]}>{status.text}</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={s.cardActions}>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: D.greenMuted, borderColor: D.greenBorder }]} onPress={() => openPurchaseModal(item)}>
                <MaterialCommunityIcons name="plus" size={15} color={D.green} />
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: D.blueMuted, borderColor: D.blueBorder }]} onPress={() => openEditModal(item)}>
                <MaterialCommunityIcons name="pencil-outline" size={15} color={D.blue} />
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: D.redMuted, borderColor: D.redBorder }]} onPress={() => handleDelete(item)}>
                <MaterialCommunityIcons name="delete-outline" size={15} color={D.red} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stock Bar */}
          <View style={s.stockRow}>
            <View style={s.stockBarBg}>
              <View style={[s.stockBarFill, { width: `${stockPct}%` as any, backgroundColor: status.color }]} />
            </View>
            <Text style={s.stockQty}>
              <Text style={{ color: D.text, fontWeight: '700' }}>{item.quantity}</Text>
              <Text style={{ color: D.textMuted }}> / {item.minThreshold * 3} {item.unit || 'units'}</Text>
            </Text>
          </View>

          {/* Detail Chips */}
          <View style={s.chipRow}>
            <View style={s.detailChip}>
              <MaterialCommunityIcons name="currency-inr" size={13} color={D.textMuted} />
              <Text style={s.detailChipText}>₹{item.price}</Text>
            </View>
            {margin && (
              <View style={[s.detailChip, { backgroundColor: D.greenMuted, borderColor: D.greenBorder }]}>
                <MaterialCommunityIcons name="trending-up" size={13} color={D.green} />
                <Text style={[s.detailChipText, { color: D.green }]}>{margin}% margin</Text>
              </View>
            )}
            <View style={s.detailChip}>
              <MaterialCommunityIcons name="alert-outline" size={13} color={D.textMuted} />
              <Text style={s.detailChipText}>Min {item.minThreshold}</Text>
            </View>
            {item.sku && (
              <View style={s.detailChip}>
                <MaterialCommunityIcons name="barcode" size={13} color={D.textMuted} />
                <Text style={s.detailChipText}>{item.sku}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={D.text} />
        </TouchableOpacity>
        <View style={s.headerIconBox}>
          <MaterialCommunityIcons name="package-variant" size={22} color={D.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Inventory</Text>
          <Text style={s.headerSub}>{inventory.length} items total</Text>
        </View>
        <TouchableOpacity style={s.reportBtn} onPress={() => navigation.navigate('InventoryReport')} activeOpacity={0.8}>
          <MaterialCommunityIcons name="chart-bar" size={18} color={D.textSub} />
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={openAddModal} activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Analytics Row ── */}
      <View style={s.analyticsRow}>
        <View style={[s.statCard, { borderColor: D.blueBorder }]}>
          <View style={[s.statIconBox, { backgroundColor: D.blueMuted }]}>
            <MaterialCommunityIcons name="store-outline" size={18} color={D.blue} />
          </View>
          <Text style={s.statValue}>{analytics.retailCount}</Text>
          <Text style={s.statLabel}>Retail</Text>
        </View>
        <View style={[s.statCard, { borderColor: D.greenBorder }]}>
          <View style={[s.statIconBox, { backgroundColor: D.greenMuted }]}>
            <MaterialCommunityIcons name="spray" size={18} color={D.green} />
          </View>
          <Text style={s.statValue}>{analytics.consumableCount}</Text>
          <Text style={s.statLabel}>Consumable</Text>
        </View>
        <View style={[s.statCard, { borderColor: D.goldBorder, flex: 1.4 }]}>
          <View style={[s.statIconBox, { backgroundColor: D.goldMuted }]}>
            <MaterialCommunityIcons name="currency-inr" size={18} color={D.gold} />
          </View>
          <Text style={s.statValue}>₹{(analytics.retailStockValue / 1000).toFixed(1)}k</Text>
          <Text style={s.statLabel}>Stock Value</Text>
        </View>
        {analytics.lowStock > 0 && (
          <View style={[s.statCard, { borderColor: D.redBorder }]}>
            <View style={[s.statIconBox, { backgroundColor: D.redMuted }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={D.red} />
            </View>
            <Text style={[s.statValue, { color: D.red }]}>{analytics.lowStock}</Text>
            <Text style={s.statLabel}>Low Stock</Text>
          </View>
        )}
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabRow}>
        {(['retail', 'consumable'] as InventoryTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons
              name={tab === 'retail' ? 'store-outline' : 'spray'}
              size={17}
              color={activeTab === tab ? D.gold : D.textMuted}
            />
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'retail' ? 'Retail Products' : 'Salon Consumables'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      {filteredInventory.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIconBox}>
            <MaterialCommunityIcons name="package-variant-closed" size={36} color={D.textMuted} />
          </View>
          <Text style={s.emptyTitle}>No {activeTab} items yet</Text>
          <Text style={s.emptyHint}>Tap "Add" to add your first item</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInventory}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
            <View style={s.modalSheet}>
              {/* Handle */}
              <View style={s.sheetHandle} />

              <View style={s.modalHeaderRow}>
                <View style={s.modalTitleIconBox}>
                  <MaterialCommunityIcons name={editingItem ? 'pencil-outline' : 'plus-circle-outline'} size={20} color={D.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalTitle}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>
                  <Text style={s.modalSub}>{editingItem ? 'Update item details' : 'Fill in the details below'}</Text>
                </View>
                <TouchableOpacity style={s.modalCloseBtn} onPress={() => setModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={20} color={D.textSub} />
                </TouchableOpacity>
              </View>

              {/* Type Selector */}
              {!editingItem && (
                <>
                  <SectionLabel>ITEM TYPE</SectionLabel>
                  <View style={s.typeRow}>
                    {(['retail', 'consumable'] as InventoryItemType[]).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[s.typeChip, formData.itemType === type && s.typeChipActive]}
                        onPress={() => setFormData({ ...formData, itemType: type })}
                        activeOpacity={0.75}
                      >
                        <View style={[s.typeChipIcon, formData.itemType === type && s.typeChipIconActive]}>
                          <MaterialCommunityIcons
                            name={type === 'retail' ? 'store-outline' : 'spray'}
                            size={18}
                            color={formData.itemType === type ? '#FFF' : D.textMuted}
                          />
                        </View>
                        <Text style={[s.typeChipText, formData.itemType === type && s.typeChipTextActive]}>
                          {type === 'retail' ? 'Retail Product' : 'Salon Consumable'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <SectionLabel>ITEM DETAILS</SectionLabel>
              <MInput label="Item Name" icon="package-outline" value={formData.name} onChange={t => setFormData({ ...formData, name: t })} placeholder="e.g. Shampoo 200ml" />
              <MInput label="SKU / Product Code" hint="Optional" icon="barcode" value={formData.sku} onChange={t => setFormData({ ...formData, sku: t })} placeholder="e.g. SH-001" />

              <SectionLabel>PRICING & STOCK</SectionLabel>
              <View style={s.rowInputs}>
                <View style={{ flex: 1 }}>
                  <MInput label="Selling Price (₹)" icon="currency-inr" value={formData.price} onChange={t => setFormData({ ...formData, price: t })} placeholder="0" keyboard="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <MInput label="Cost Price (₹)" hint="Optional" icon="tag-outline" value={formData.costPrice} onChange={t => setFormData({ ...formData, costPrice: t })} placeholder="0" keyboard="numeric" />
                </View>
              </View>
              <View style={s.rowInputs}>
                <View style={{ flex: 1 }}>
                  <MInput label="Current Quantity" icon="counter" value={formData.quantity} onChange={t => setFormData({ ...formData, quantity: t })} placeholder="0" keyboard="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <MInput label="Min Threshold" icon="alert-outline" value={formData.minThreshold} onChange={t => setFormData({ ...formData, minThreshold: t })} placeholder="5" keyboard="numeric" />
                </View>
              </View>

              <SectionLabel>EXTRA INFO</SectionLabel>
              <View style={s.rowInputs}>
                <View style={{ flex: 1 }}>
                  <MInput label="Unit" icon="scale-outline" value={formData.unit} onChange={t => setFormData({ ...formData, unit: t })} placeholder="units / bottles / kg" />
                </View>
                <View style={{ flex: 1 }}>
                  <MInput label="Supplier" hint="Optional" icon="truck-outline" value={formData.supplier} onChange={t => setFormData({ ...formData, supplier: t })} placeholder="Supplier name" />
                </View>
              </View>

              <View style={s.modalBtnRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                  <MaterialCommunityIcons name={editingItem ? 'check' : 'plus'} size={18} color="#FFF" />
                  <Text style={s.saveBtnText}>{editingItem ? 'Save Changes' : 'Add Item'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Purchase Modal ── */}
      <Modal visible={purchaseModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalSheet}>
            <View style={s.sheetHandle} />

            <View style={s.modalHeaderRow}>
              <View style={[s.modalTitleIconBox, { backgroundColor: D.greenMuted, borderColor: D.greenBorder }]}>
                <MaterialCommunityIcons name="plus-circle-outline" size={20} color={D.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Record Stock Purchase</Text>
                <Text style={s.modalSub} numberOfLines={1}>{selectedItemForPurchase?.name}</Text>
              </View>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setPurchaseModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color={D.textSub} />
              </TouchableOpacity>
            </View>

            <SectionLabel>PURCHASE DETAILS</SectionLabel>
            <View style={s.rowInputs}>
              <View style={{ flex: 1 }}>
                <MInput label="Quantity to Add" icon="counter" value={purchaseData.quantity} onChange={t => setPurchaseData({ ...purchaseData, quantity: t })} placeholder="0" keyboard="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <MInput label="Unit Cost (₹)" icon="currency-inr" value={purchaseData.unitCost} onChange={t => setPurchaseData({ ...purchaseData, unitCost: t })} placeholder="0" keyboard="numeric" />
              </View>
            </View>

            {/* Live total preview */}
            {purchaseData.quantity && purchaseData.unitCost && !isNaN(+purchaseData.quantity) && !isNaN(+purchaseData.unitCost) && (
              <View style={s.totalBanner}>
                <MaterialCommunityIcons name="receipt" size={16} color={D.gold} />
                <Text style={s.totalBannerText}>
                  Total: <Text style={{ color: D.text, fontWeight: '800' }}>₹{(+purchaseData.quantity * +purchaseData.unitCost).toFixed(0)}</Text>
                </Text>
              </View>
            )}

            <SectionLabel>OPTIONAL INFO</SectionLabel>
            <MInput label="Supplier" hint="Optional" icon="truck-outline" value={purchaseData.supplier} onChange={t => setPurchaseData({ ...purchaseData, supplier: t })} placeholder="Supplier name" />
            <MInput label="Invoice Number" hint="Optional" icon="file-document-outline" value={purchaseData.invoiceNumber} onChange={t => setPurchaseData({ ...purchaseData, invoiceNumber: t })} placeholder="e.g. INV-2024-001" />
            <MInput label="Notes" hint="Optional" icon="note-text-outline" value={purchaseData.notes} onChange={t => setPurchaseData({ ...purchaseData, notes: t })} placeholder="Any notes..." />

            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setPurchaseModalVisible(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: D.green }]} onPress={handlePurchase}>
                <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
                <Text style={s.saveBtnText}>Record Purchase</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    gap: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: D.radius.md,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
  },
  headerIconBox: {
    width: 44, height: 44, borderRadius: D.radius.md,
    backgroundColor: D.goldMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.goldBorder,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },
  reportBtn: {
    width: 40, height: 40, borderRadius: D.radius.md,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: D.text, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: D.radius.pill,
  },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Analytics
  analyticsRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: D.surfaceWarm, borderBottomWidth: 1, borderBottomColor: D.border,
  },
  statCard: {
    flex: 1, backgroundColor: D.surface, borderRadius: D.radius.lg,
    padding: 12, alignItems: 'center', borderWidth: 1,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  statIconBox: {
    width: 34, height: 34, borderRadius: D.radius.sm,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: D.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },

  // Tabs
  tabRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20,
    paddingTop: 14, paddingBottom: 6,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, backgroundColor: D.surface, borderRadius: D.radius.lg,
    borderWidth: 1.5, borderColor: D.border, gap: 7,
  },
  tabActive: { backgroundColor: D.goldMuted, borderColor: D.gold },
  tabText: { fontSize: 13, fontWeight: '600', color: D.textMuted },
  tabTextActive: { color: D.gold },

  // Empty
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: D.radius.xl,
    backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border, marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: D.text, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: D.textMuted, textAlign: 'center' },

  // Item Card
  card: {
    flexDirection: 'row', backgroundColor: D.surface, borderRadius: D.radius.xl,
    marginBottom: 12, borderWidth: 1, borderColor: D.border, overflow: 'hidden',
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  cardStripe: { width: 4 },
  cardInner: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardIconBox: {
    width: 44, height: 44, borderRadius: D.radius.md,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
    borderWidth: 1,
  },
  cardNameWrap: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 6 },
  cardPillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  typePill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: D.radius.pill,
    borderWidth: 1,
  },
  typePillText: { fontSize: 10, fontWeight: '700' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: D.radius.pill, borderWidth: 1,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 6, marginLeft: 6 },
  actionBtn: {
    width: 32, height: 32, borderRadius: D.radius.sm,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  // Stock bar
  stockRow: { marginBottom: 10 },
  stockBarBg: {
    height: 5, backgroundColor: D.border, borderRadius: 3,
    overflow: 'hidden', marginBottom: 6,
  },
  stockBarFill: { height: '100%', borderRadius: 3 },
  stockQty: { fontSize: 13 },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  detailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.bg, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: D.radius.pill, borderWidth: 1, borderColor: D.border,
  },
  detailChipText: { fontSize: 12, color: D.textSub, fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: D.surface, borderTopLeftRadius: D.radius.xl, borderTopRightRadius: D.radius.xl,
    padding: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: D.border,
    maxHeight: '92%',
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: D.border, borderRadius: 2,
    alignSelf: 'center', marginBottom: 18,
  },
  modalHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20,
  },
  modalTitleIconBox: {
    width: 44, height: 44, borderRadius: D.radius.md,
    backgroundColor: D.goldMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.goldBorder,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  modalSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: D.radius.sm,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
  },

  // Type selector
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, backgroundColor: D.bg, borderRadius: D.radius.lg,
    borderWidth: 1.5, borderColor: D.border,
  },
  typeChipActive: { backgroundColor: D.goldMuted, borderColor: D.gold },
  typeChipIcon: {
    width: 32, height: 32, borderRadius: D.radius.sm,
    backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
  },
  typeChipIconActive: { backgroundColor: D.gold, borderColor: D.gold },
  typeChipText: { fontSize: 13, fontWeight: '600', color: D.textMuted, flex: 1 },
  typeChipTextActive: { color: D.text },

  // Row inputs
  rowInputs: { flexDirection: 'row', gap: 10 },

  // Total banner
  totalBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.goldMuted, borderRadius: D.radius.md,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: D.goldBorder,
    marginBottom: 16, marginTop: -4,
  },
  totalBannerText: { fontSize: 14, color: D.textSub, fontWeight: '600' },

  // Modal buttons
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 15, borderRadius: D.radius.lg,
    backgroundColor: D.bg, alignItems: 'center', borderWidth: 1, borderColor: D.border,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: D.textSub },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: D.radius.lg, backgroundColor: D.text,
    shadowColor: D.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});