import React, { useState, useMemo } from "react";
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
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useData } from "../context/DataContext";
import type { InventoryItem, InventoryItemType } from "../types";
import * as supabaseService from "../services/supabaseService";

// ─── Design Tokens — shared with StaffDashboardScreen & AdminDashboardScreen ──
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

const { width: W } = Dimensions.get("window");

interface Props {
  navigation: any;
}
type InventoryTab = "retail" | "consumable";

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

// ─── Modal Input ──────────────────────────────────────────────────────────────
const MInput: React.FC<{
  label: string;
  icon: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  keyboard?: "default" | "numeric";
  hint?: string;
}> = ({
  label,
  icon,
  value,
  onChange,
  placeholder,
  keyboard = "default",
  hint,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={mi.group}>
      <View style={mi.labelRow}>
        <Text style={mi.label}>{label}</Text>
        {hint && <Text style={mi.hint}>{hint}</Text>}
      </View>
      <View style={[mi.box, focused && mi.boxFocused]}>
        <View style={[mi.iconBox, focused && mi.iconFocused]}>
          <MaterialCommunityIcons
            name={icon as any}
            size={17}
            color={focused ? D.green : D.textMuted}
          />
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
  group: { marginBottom: 12 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: { fontSize: 12, fontWeight: "700", color: D.text },
  hint: { fontSize: 11, color: D.textMuted },
  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.md,
    borderWidth: 1.5,
    borderColor: D.border,
    overflow: "hidden",
  },
  boxFocused: { borderColor: D.green },
  iconBox: {
    width: 42,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: D.surface,
    borderRightWidth: 1,
    borderRightColor: D.border,
  },
  iconFocused: {
    backgroundColor: D.greenMuted,
    borderRightColor: D.greenBorder,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: D.text,
    fontWeight: "500",
  },
});

// ─── Stock status helper ──────────────────────────────────────────────────────
const getStockStatus = (item: InventoryItem) => {
  if (item.quantity === 0)
    return {
      text: "Out of stock",
      color: D.red,
      bg: D.redMuted,
      border: D.redBorder,
    };
  if (item.quantity <= item.minThreshold)
    return {
      text: "Low stock",
      color: D.amber,
      bg: D.amberMuted,
      border: D.amberBorder,
    };
  return {
    text: "In stock",
    color: D.green,
    bg: D.greenMuted,
    border: D.greenBorder,
  };
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const AdminInventoryScreen: React.FC<Props> = ({ navigation }) => {
  const {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    refreshData,
  } = useData();

  const [activeTab, setActiveTab] = useState<InventoryTab>("retail");
  const [modalVisible, setModalVisible] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuItem, setActionMenuItem] = useState<InventoryItem | null>(
    null,
  );
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItemForPurchase, setSelectedItemForPurchase] =
    useState<InventoryItem | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    minThreshold: "",
    price: "",
    costPrice: "",
    itemType: "retail" as InventoryItemType,
    supplier: "",
    sku: "",
    unit: "units",
  });
  const [purchaseData, setPurchaseData] = useState({
    quantity: "",
    unitCost: "",
    supplier: "",
    invoiceNumber: "",
    notes: "",
  });

  const filteredInventory = useMemo(
    () => inventory.filter((i) => (i.itemType || "retail") === activeTab),
    [inventory, activeTab],
  );

  const analytics = useMemo(() => {
    const retail = inventory.filter(
      (i) => (i.itemType || "retail") === "retail",
    );
    const consumable = inventory.filter(
      (i) => (i.itemType || "retail") === "consumable",
    );
    return {
      retailCount: retail.length,
      consumableCount: consumable.length,
      stockValue: retail.reduce((s, i) => s + i.quantity * i.price, 0),
      lowStock: inventory.filter((i) => i.quantity <= i.minThreshold).length,
    };
  }, [inventory]);

  // ── Modal helpers ──
  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      quantity: "",
      minThreshold: "",
      price: "",
      costPrice: "",
      itemType: activeTab,
      supplier: "",
      sku: "",
      unit: "units",
    });
    setModalVisible(true);
  };
  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      quantity: String(item.quantity),
      minThreshold: String(item.minThreshold),
      price: String(item.price),
      costPrice: item.costPrice != null ? String(item.costPrice) : "",
      itemType: item.itemType || "retail",
      supplier: item.supplier || "",
      sku: item.sku || "",
      unit: item.unit || "units",
    });
    setModalVisible(true);
  };
  const openPurchaseModal = (item: InventoryItem) => {
    setSelectedItemForPurchase(item);
    setPurchaseData({
      quantity: "",
      unitCost: item.costPrice ? String(item.costPrice) : "",
      supplier: "",
      invoiceNumber: "",
      notes: "",
    });
    setPurchaseModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter item name.");
      return;
    }
    const quantity = parseInt(formData.quantity, 10);
    const minThreshold = parseInt(formData.minThreshold, 10);
    const price = parseFloat(formData.price);
    const costPrice = formData.costPrice.trim()
      ? parseFloat(formData.costPrice)
      : undefined;
    if (isNaN(quantity) || quantity < 0) {
      Alert.alert("Error", "Enter a valid quantity.");
      return;
    }
    if (isNaN(minThreshold) || minThreshold < 0) {
      Alert.alert("Error", "Enter a valid minimum threshold.");
      return;
    }
    if (isNaN(price) || price < 0) {
      Alert.alert("Error", "Enter a valid selling price.");
      return;
    }
    try {
      const payload = {
        name: formData.name.trim(),
        quantity,
        minThreshold,
        price,
        costPrice,
        itemType: formData.itemType,
        supplier: formData.supplier.trim() || undefined,
        sku: formData.sku.trim() || undefined,
        unit: formData.unit.trim() || "units",
      };
      if (editingItem) {
        await updateInventoryItem(editingItem.id, payload);
      } else {
        await addInventoryItem(payload);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save.");
    }
  };

  const handlePurchase = async () => {
    if (!selectedItemForPurchase) return;
    const quantity = parseInt(purchaseData.quantity, 10);
    const unitCost = parseFloat(purchaseData.unitCost);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert("Error", "Enter a valid quantity.");
      return;
    }
    if (isNaN(unitCost) || unitCost < 0) {
      Alert.alert("Error", "Enter a valid unit cost.");
      return;
    }
    try {
      await supabaseService.addStockPurchase({
        itemId: selectedItemForPurchase.id,
        quantity,
        unitCost,
        totalCost: quantity * unitCost,
        supplier: purchaseData.supplier.trim() || undefined,
        invoiceNumber: purchaseData.invoiceNumber.trim() || undefined,
        purchaseDate: new Date().toISOString().split("T")[0],
        notes: purchaseData.notes.trim() || undefined,
      });
      await refreshData();
      setPurchaseModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to record purchase.");
    }
  };

  const handleDelete = (item: InventoryItem) => {
    Alert.alert("Delete Item", `Delete "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteInventoryItem(item.id);
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete.");
          }
        },
      },
    ]);
  };

  // ── Render item ──
  const renderItem = ({
    item,
    index,
  }: {
    item: InventoryItem;
    index: number;
  }) => {
    const status = getStockStatus(item);
    const isRetail = (item.itemType || "retail") === "retail";
    const margin =
      item.costPrice && item.price
        ? (((item.price - item.costPrice) / item.price) * 100).toFixed(0)
        : null;
    const isFirst = index === 0;
    const isLast = index === filteredInventory.length - 1;

    return (
      <View style={[ic.row, isFirst && ic.rowFirst, isLast && ic.rowLast]}>
        {/* Left — icon avatar */}
        <View
          style={[
            ic.avatar,
            { backgroundColor: status.bg, borderColor: status.border },
          ]}
        >
          <MaterialCommunityIcons
            name={isRetail ? "package-variant" : "spray"}
            size={18}
            color={status.color}
          />
        </View>

        {/* Centre — name, meta, progress bar */}
        <View style={ic.body}>
          <View style={ic.nameRow}>
            <Text style={ic.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View
              style={[
                ic.statusPill,
                { backgroundColor: status.bg, borderColor: status.border },
              ]}
            >
              <View style={[ic.statusDot, { backgroundColor: status.color }]} />
              <Text style={[ic.statusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
          </View>

          <View style={ic.metaRow}>
            <Text style={ic.meta}>₹{item.price}</Text>
            {margin && <Text style={ic.metaDot}>·</Text>}
            {margin && (
              <Text style={[ic.meta, { color: D.green }]}>
                {margin}% margin
              </Text>
            )}
            <Text style={ic.metaDot}>·</Text>
            <Text style={ic.meta}>
              {item.quantity} {item.unit || "units"}
            </Text>
          </View>

          <View style={ic.track}>
            <View
              style={[
                ic.fill,
                {
                  width:
                    `${Math.min((item.quantity / Math.max(item.minThreshold * 3, 1)) * 100, 100)}%` as any,
                  backgroundColor: status.color,
                },
              ]}
            />
          </View>
        </View>

        {/* Right — three-dot menu */}
        <TouchableOpacity
          style={ic.dotsBtn}
          onPress={() => {
            setActionMenuItem(item);
            setActionMenuVisible(true);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name="dots-vertical"
            size={20}
            color={D.textMuted}
          />
        </TouchableOpacity>
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
        <Text style={s.topBarTitle}>Inventory</Text>
        <TouchableOpacity
          style={s.reportBtn}
          onPress={() => navigation.navigate("InventoryReport")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="chart-bar"
            size={18}
            color={D.textSub}
          />
        </TouchableOpacity>
      </View>

      {/* ── Stat pills ── */}
      <View style={s.statsRow}>
        <View style={s.statPill}>
          <Text style={s.statVal}>{analytics.retailCount}</Text>
          <Text style={s.statLabel}>Retail</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statPill}>
          <Text style={s.statVal}>{analytics.consumableCount}</Text>
          <Text style={s.statLabel}>Consumable</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statPill}>
          <Text style={s.statVal}>
            ₹{(analytics.stockValue / 1000).toFixed(1)}k
          </Text>
          <Text style={s.statLabel}>Stock Value</Text>
        </View>
        {analytics.lowStock > 0 && (
          <>
            <View style={s.statDivider} />
            <View style={s.statPill}>
              <Text style={[s.statVal, { color: D.red }]}>
                {analytics.lowStock}
              </Text>
              <Text style={s.statLabel}>Low Stock</Text>
            </View>
          </>
        )}
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabRow}>
        {(["retail", "consumable"] as InventoryTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons
              name={tab === "retail" ? "package-variant" : "spray"}
              size={16}
              color={activeTab === tab ? D.green : D.textMuted}
            />
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === "retail" ? "Retail" : "Consumables"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      {filteredInventory.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={32}
              color={D.textMuted}
            />
          </View>
          <Text style={s.emptyTitle}>No {activeTab} items yet</Text>
          <Text style={s.emptyHint}>Tap "Add Item" below to get started</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInventory}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Bottom Nav Bar ── */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={s.navBtn}
          onPress={() => navigation.navigate("AdminInventory")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="package-variant"
            size={20}
            color={D.green}
          />
          <Text style={[s.navLabel, { color: D.green }]}>Items</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.navBtnAdd}
          onPress={openAddModal}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          <Text style={s.navLabelAdd}>Add Item</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.navBtn}
          onPress={() => navigation.navigate("InventoryReport")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="chart-bar"
            size={20}
            color={D.textSub}
          />
          <Text style={s.navLabel}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* ── Add / Edit Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.sheet}>
              <View style={s.handle} />

              {/* Modal header */}
              <View style={s.sheetHeader}>
                <View style={s.sheetIconBox}>
                  <MaterialCommunityIcons
                    name={
                      editingItem ? "pencil-outline" : "plus-circle-outline"
                    }
                    size={18}
                    color={D.green}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetTitle}>
                    {editingItem ? "Edit Item" : "Add New Item"}
                  </Text>
                  <Text style={s.sheetSub}>
                    {editingItem
                      ? "Update item details"
                      : "Fill in the details below"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.closeBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={18}
                    color={D.textSub}
                  />
                </TouchableOpacity>
              </View>

              {/* Type selector */}
              {!editingItem && (
                <>
                  <SectionLabel>ITEM TYPE</SectionLabel>
                  <View style={s.typeRow}>
                    {(["retail", "consumable"] as InventoryItemType[]).map(
                      (type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            s.typeChip,
                            formData.itemType === type && s.typeChipActive,
                          ]}
                          onPress={() =>
                            setFormData({ ...formData, itemType: type })
                          }
                          activeOpacity={0.75}
                        >
                          <MaterialCommunityIcons
                            name={
                              type === "retail" ? "package-variant" : "spray"
                            }
                            size={16}
                            color={
                              formData.itemType === type ? D.green : D.textMuted
                            }
                          />
                          <Text
                            style={[
                              s.typeChipText,
                              formData.itemType === type &&
                                s.typeChipTextActive,
                            ]}
                          >
                            {type === "retail"
                              ? "Retail Product"
                              : "Salon Consumable"}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </>
              )}

              <SectionLabel>ITEM DETAILS</SectionLabel>
              <MInput
                label="Item Name"
                icon="package-outline"
                value={formData.name}
                onChange={(t) => setFormData({ ...formData, name: t })}
                placeholder="e.g. Shampoo 200ml"
              />
              <MInput
                label="SKU / Product Code"
                hint="Optional"
                icon="barcode"
                value={formData.sku}
                onChange={(t) => setFormData({ ...formData, sku: t })}
                placeholder="e.g. SH-001"
              />

              <SectionLabel>PRICING & STOCK</SectionLabel>
              <View style={s.rowInputs}>
                <View style={{ flex: 1 }}>
                  <MInput
                    label="Selling Price (₹)"
                    icon="currency-inr"
                    value={formData.price}
                    onChange={(t) => setFormData({ ...formData, price: t })}
                    placeholder="0"
                    keyboard="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MInput
                    label="Cost Price (₹)"
                    hint="Optional"
                    icon="tag-outline"
                    value={formData.costPrice}
                    onChange={(t) => setFormData({ ...formData, costPrice: t })}
                    placeholder="0"
                    keyboard="numeric"
                  />
                </View>
              </View>
              <View style={s.rowInputs}>
                <View style={{ flex: 1 }}>
                  <MInput
                    label="Quantity"
                    icon="counter"
                    value={formData.quantity}
                    onChange={(t) => setFormData({ ...formData, quantity: t })}
                    placeholder="0"
                    keyboard="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MInput
                    label="Min Threshold"
                    icon="alert-outline"
                    value={formData.minThreshold}
                    onChange={(t) =>
                      setFormData({ ...formData, minThreshold: t })
                    }
                    placeholder="5"
                    keyboard="numeric"
                  />
                </View>
              </View>

              <SectionLabel>EXTRA INFO</SectionLabel>
              <View style={s.rowInputs}>
                <View style={{ flex: 1 }}>
                  <MInput
                    label="Unit"
                    icon="scale-outline"
                    value={formData.unit}
                    onChange={(t) => setFormData({ ...formData, unit: t })}
                    placeholder="units / bottles / kg"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MInput
                    label="Supplier"
                    hint="Optional"
                    icon="truck-outline"
                    value={formData.supplier}
                    onChange={(t) => setFormData({ ...formData, supplier: t })}
                    placeholder="Supplier name"
                  />
                </View>
              </View>

              <View style={s.sheetBtnRow}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                  <MaterialCommunityIcons
                    name={editingItem ? "check" : "plus"}
                    size={16}
                    color="#fff"
                  />
                  <Text style={s.saveBtnText}>
                    {editingItem ? "Save Changes" : "Add Item"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Purchase Modal ── */}
      <Modal visible={purchaseModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.sheet}>
            <View style={s.handle} />

            <View style={s.sheetHeader}>
              <View style={s.sheetIconBox}>
                <MaterialCommunityIcons
                  name="plus-circle-outline"
                  size={18}
                  color={D.green}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>Record Stock Purchase</Text>
                <Text style={s.sheetSub} numberOfLines={1}>
                  {selectedItemForPurchase?.name}
                </Text>
              </View>
              <TouchableOpacity
                style={s.closeBtn}
                onPress={() => setPurchaseModalVisible(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={D.textSub}
                />
              </TouchableOpacity>
            </View>

            <SectionLabel>PURCHASE DETAILS</SectionLabel>
            <View style={s.rowInputs}>
              <View style={{ flex: 1 }}>
                <MInput
                  label="Quantity to Add"
                  icon="counter"
                  value={purchaseData.quantity}
                  onChange={(t) =>
                    setPurchaseData({ ...purchaseData, quantity: t })
                  }
                  placeholder="0"
                  keyboard="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <MInput
                  label="Unit Cost (₹)"
                  icon="currency-inr"
                  value={purchaseData.unitCost}
                  onChange={(t) =>
                    setPurchaseData({ ...purchaseData, unitCost: t })
                  }
                  placeholder="0"
                  keyboard="numeric"
                />
              </View>
            </View>

            {purchaseData.quantity &&
              purchaseData.unitCost &&
              !isNaN(+purchaseData.quantity) &&
              !isNaN(+purchaseData.unitCost) && (
                <View style={s.totalBanner}>
                  <MaterialCommunityIcons
                    name="receipt"
                    size={15}
                    color={D.green}
                  />
                  <Text style={s.totalBannerText}>
                    Total:{" "}
                    <Text style={{ color: D.text, fontWeight: "800" }}>
                      ₹
                      {(
                        +purchaseData.quantity * +purchaseData.unitCost
                      ).toFixed(0)}
                    </Text>
                  </Text>
                </View>
              )}

            <SectionLabel>OPTIONAL INFO</SectionLabel>
            <MInput
              label="Supplier"
              hint="Optional"
              icon="truck-outline"
              value={purchaseData.supplier}
              onChange={(t) =>
                setPurchaseData({ ...purchaseData, supplier: t })
              }
              placeholder="Supplier name"
            />
            <MInput
              label="Invoice Number"
              hint="Optional"
              icon="file-document-outline"
              value={purchaseData.invoiceNumber}
              onChange={(t) =>
                setPurchaseData({ ...purchaseData, invoiceNumber: t })
              }
              placeholder="INV-001"
            />
            <MInput
              label="Notes"
              hint="Optional"
              icon="note-text-outline"
              value={purchaseData.notes}
              onChange={(t) => setPurchaseData({ ...purchaseData, notes: t })}
              placeholder="Any notes…"
            />

            <View style={s.sheetBtnRow}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setPurchaseModalVisible(false)}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handlePurchase}>
                <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                <Text style={s.saveBtnText}>Record Purchase</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Action Menu (three-dot) ── */}
      <Modal
        visible={actionMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMenuVisible(false)}
      >
        <TouchableOpacity
          style={s.menuOverlay}
          activeOpacity={1}
          onPress={() => setActionMenuVisible(false)}
        >
          <View style={s.menuSheet}>
            <View style={s.menuHandle} />
            <Text style={s.menuItemName} numberOfLines={1}>
              {actionMenuItem?.name}
            </Text>
            <View style={s.menuDivider} />

            <TouchableOpacity
              style={s.menuOption}
              activeOpacity={0.7}
              onPress={() => {
                setActionMenuVisible(false);
                if (actionMenuItem) openPurchaseModal(actionMenuItem);
              }}
            >
              <View
                style={[s.menuOptionIcon, { backgroundColor: D.greenMuted }]}
              >
                <MaterialCommunityIcons
                  name="plus-circle-outline"
                  size={20}
                  color={D.green}
                />
              </View>
              <View style={s.menuOptionText}>
                <Text style={s.menuOptionTitle}>Add Stock</Text>
                <Text style={s.menuOptionSub}>Record a stock purchase</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={16}
                color={D.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.menuOption}
              activeOpacity={0.7}
              onPress={() => {
                setActionMenuVisible(false);
                if (actionMenuItem) openEditModal(actionMenuItem);
              }}
            >
              <View
                style={[s.menuOptionIcon, { backgroundColor: D.surfaceAlt }]}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={20}
                  color={D.textSub}
                />
              </View>
              <View style={s.menuOptionText}>
                <Text style={s.menuOptionTitle}>Edit Item</Text>
                <Text style={s.menuOptionSub}>Update item details</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={16}
                color={D.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.menuOption, { borderBottomWidth: 0 }]}
              activeOpacity={0.7}
              onPress={() => {
                setActionMenuVisible(false);
                if (actionMenuItem) handleDelete(actionMenuItem);
              }}
            >
              <View style={[s.menuOptionIcon, { backgroundColor: D.redMuted }]}>
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color={D.red}
                />
              </View>
              <View style={s.menuOptionText}>
                <Text style={[s.menuOptionTitle, { color: D.red }]}>
                  Delete Item
                </Text>
                <Text style={s.menuOptionSub}>Remove from inventory</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={16}
                color={D.textMuted}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── Inventory item row styles ────────────────────────────────────────────────
const ic = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
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
  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: D.radius.xl,
    borderTopRightRadius: D.radius.xl,
  },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    borderBottomLeftRadius: D.radius.xl,
    borderBottomRightRadius: D.radius.xl,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: D.radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  body: { flex: 1, minWidth: 0, gap: 4 },
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
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { fontSize: 12, color: D.textSub, fontWeight: "500" },
  metaDot: { fontSize: 12, color: D.textMuted },
  track: {
    height: 4,
    backgroundColor: D.surfaceAlt,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 2 },
  dotsBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
const D_radius = D.radius;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },

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
  reportBtn: {
    width: 36,
    height: 36,
    borderRadius: D.radius.md,
    backgroundColor: D.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  // Stats inline row
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  statPill: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: D.border },
  statVal: {
    fontSize: 16,
    fontWeight: "800",
    color: D.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: D.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: D.radius.lg,
    backgroundColor: D.surfaceAlt,
    borderWidth: 1,
    borderColor: D.border,
  },
  tabActive: { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  tabText: { fontSize: 13, fontWeight: "600", color: D.textMuted },
  tabTextActive: { color: D.green, fontWeight: "700" },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },

  // Empty
  emptyWrap: {
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: D.border,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: D.text,
    marginBottom: 6,
  },
  emptyHint: { fontSize: 13, color: D.textMuted, textAlign: "center" },

  // Unused header/footer stubs kept for FlatList
  listCardTop: {},
  listCardBottom: {},

  // Bottom nav bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: D.surface,
    borderTopWidth: 1,
    borderTopColor: D.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.select({ ios: 28, android: 12, default: 12 }),
    gap: 0,
  },
  navBtn: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  navLabel: { fontSize: 11, fontWeight: "600", color: D.textSub },
  navBtnAdd: {
    flex: 1.6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: D.green,
    borderRadius: D.radius.pill,
    paddingVertical: 12,
    marginHorizontal: 12,
  },
  navLabelAdd: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: D.surface,
    borderTopLeftRadius: D.radius.xxl,
    borderTopRightRadius: D.radius.xxl,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: D.border,
    maxHeight: "92%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: D.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  sheetIconBox: {
    width: 40,
    height: 40,
    borderRadius: D.radius.md,
    backgroundColor: D.greenMuted,
    borderWidth: 1,
    borderColor: D.greenBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: D.text,
    letterSpacing: -0.3,
  },
  sheetSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: D.radius.sm,
    backgroundColor: D.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  // Type selector
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  typeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.lg,
    borderWidth: 1.5,
    borderColor: D.border,
  },
  typeChipActive: { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  typeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: D.textMuted,
    flex: 1,
  },
  typeChipTextActive: { color: D.green },

  rowInputs: { flexDirection: "row", gap: 10 },

  // Total banner
  totalBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: D.greenBorder,
    marginBottom: 14,
    marginTop: -4,
  },
  totalBannerText: { fontSize: 13, color: D.textSub, fontWeight: "600" },

  // Sheet buttons
  sheetBtnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: D.radius.lg,
    backgroundColor: D.surfaceAlt,
    alignItems: "center",
    borderWidth: 1,
    borderColor: D.border,
  },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: D.textSub },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: D.radius.lg,
    backgroundColor: D.green,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // Action menu (three-dot)
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: D.surface,
    borderTopLeftRadius: D.radius.xxl,
    borderTopRightRadius: D.radius.xxl,
    paddingTop: 12,
    paddingBottom: Platform.select({ ios: 36, android: 20, default: 20 }),
    borderTopWidth: 1,
    borderColor: D.border,
  },
  menuHandle: {
    width: 36,
    height: 4,
    backgroundColor: D.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  menuItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: D.textMuted,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  menuDivider: { height: 1, backgroundColor: D.border, marginBottom: 4 },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F4",
  },
  menuOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: D.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  menuOptionText: { flex: 1 },
  menuOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: D.text,
    marginBottom: 2,
  },
  menuOptionSub: { fontSize: 12, color: D.textMuted },
});
