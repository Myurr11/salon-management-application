import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import type {
  InventoryItem,
  PaymentMode,
  Service,
  ServiceOffer,
  VisitProductLine,
  VisitServiceLine,
  VisitStaff,
} from "../types";
import { DatePickerField } from "../components/DatePickerField";

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

  // Offer section colors (orange/golden)
  amber: "#B8742A",
  amberMuted: "rgba(184,116,42,0.10)",
  amberBorder: "rgba(184,116,42,0.25)",

  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 },
};

interface Props {
  navigation: any;
}
type CustomerMode = "new" | "existing";

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

// ─── Service icon helper ──────────────────────────────────────────────────────
const getServiceIcon = (name: string): keyof typeof MaterialCommunityIcons.glyphMap => {
  const n = name.toLowerCase();
  if (n.includes("hair")) return "hair-dryer";
  if (n.includes("cut")) return "content-cut";
  if (n.includes("color") || n.includes("colour")) return "palette";
  if (n.includes("wash") || n.includes("shampoo")) return "shower";
  if (n.includes("style") || n.includes("blow")) return "weather-windy";
  if (n.includes("spa") || n.includes("treatment")) return "spa";
  if (n.includes("facial") || n.includes("face")) return "face-woman";
  if (n.includes("massage")) return "hand-heart";
  if (n.includes("nail") || n.includes("manicure") || n.includes("pedicure"))
    return "hand-back-right";
  if (n.includes("wax")) return "fire";
  if (n.includes("beard") || n.includes("shave")) return "mustache";
  return "star-circle";
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const StaffBillingScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers } = useAuth();
  const {
    services,
    customers,
    inventory,
    addOrUpdateCustomer,
    recordVisit,
    offers,
  } = useData();

  const [attendingStaffIds, setAttendingStaffIds] = useState<string[]>([]);
  const [customerMode, setCustomerMode] = useState<CustomerMode>("new");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [customerName, setCustomerName] = useState("");
  const [customerDob, setCustomerDob] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerGender, setCustomerGender] = useState<
    "male" | "female" | "other" | ""
  >("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedLines, setSelectedLines] = useState<VisitServiceLine[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<VisitProductLine[]>(
    [],
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [amountOverride, setAmountOverride] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<ServiceOffer | null>(null);
  const [appliedOffers, setAppliedOffers] = useState<Set<string>>(new Set());

  const toggleService = (service: Service) => {
    const existing = selectedLines.find((l) => l.serviceId === service.id);
    if (existing) {
      setSelectedLines((prev) => prev.filter((l) => l.serviceId !== service.id));
      // Clear any offers that might have been dependent on this service
      const affectedOffers = offers.filter((offer) =>
        offer.serviceIds.includes(service.id)
      );
      if (affectedOffers.length > 0) {
        setAppliedOffers((prev) => {
          const newSet = new Set(prev);
          affectedOffers.forEach((offer) => newSet.delete(offer.id));
          return newSet;
        });
      }
    } else {
      const price = Number(service.price);
      const safePrice = Number.isFinite(price) ? price : 0;
      setSelectedLines((prev) => [
        ...prev,
        {
          id: `${service.id}-${Date.now()}`,
          serviceId: service.id,
          serviceName: service.name,
          basePrice: safePrice,
          finalPrice: safePrice,
        },
      ]);
    }
  };

  const updateLinePrice = (lineId: string, value: string) => {
    const numeric = Number(value.replace(/[^0-9.]/g, ""));
    setSelectedLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? { ...l, finalPrice: Number.isNaN(numeric) ? l.finalPrice : numeric }
          : l,
      ),
    );
  };

  // Remove an applied offer (reset prices to original)
  const removeOffer = (offer: ServiceOffer) => {
    setSelectedLines((prev) =>
      prev.map((line) => {
        const isInOffer = offer.serviceIds.includes(line.serviceId);
        if (isInOffer) {
          return { ...line, finalPrice: line.basePrice };
        }
        return line;
      }),
    );
    setAppliedOffers((prev) => {
      const newSet = new Set(prev);
      newSet.delete(offer.id);
      return newSet;
    });
  };

  const handleOfferSelect = (offer: ServiceOffer) => {
    // If offer is already applied, remove it
    if (appliedOffers.has(offer.id)) {
      removeOffer(offer);
      Alert.alert("Offer Removed", `"${offer.name}" has been removed.`, [{ text: "OK" }]);
      return;
    }

    const selectedServiceIds = selectedLines.map((l) => l.serviceId);
    const missingServiceIds = offer.serviceIds.filter(
      (serviceId) => !selectedServiceIds.includes(serviceId),
    );

    // If there are missing services, add them first
    if (missingServiceIds.length > 0) {
      const newServices: VisitServiceLine[] = [];
      missingServiceIds.forEach((serviceId) => {
        const service = services.find((s) => s.id === serviceId);
        if (service) {
          const price = Number(service.price);
          const safePrice = Number.isFinite(price) ? price : 0;
          newServices.push({
            id: `${service.id}-${Date.now()}-${Math.random()}`,
            serviceId: service.id,
            serviceName: service.name,
            basePrice: safePrice,
            finalPrice: safePrice,
          });
        }
      });
      setSelectedLines((prev) => [...prev, ...newServices]);
      
      Alert.alert(
        "✨ Services Added",
        `${missingServiceIds.length} service(s) from "${offer.name}" have been added to your bill.`,
        [{ text: "OK" }]
      );
    }

    // Apply combo pricing
    setTimeout(() => {
      const totalOriginalPrice = offer.serviceIds.reduce((sum, serviceId) => {
        const service = services.find((s) => s.id === serviceId);
        return sum + (service?.price || 0);
      }, 0);

      const ratio = offer.comboPrice / totalOriginalPrice;

      setSelectedLines((prev) =>
        prev.map((line) => {
          const isInOffer = offer.serviceIds.includes(line.serviceId);
          if (isInOffer) {
            const newFinalPrice = Math.round(line.basePrice * ratio * 100) / 100;
            return { ...line, finalPrice: newFinalPrice };
          }
          return line;
        }),
      );

      // Mark this offer as applied
      setAppliedOffers((prev) => new Set([...prev, offer.id]));

      Alert.alert(
        "🎉 Offer Applied!",
        `"${offer.name}" has been applied!\n\nYou Save: ₹${(
          totalOriginalPrice - offer.comboPrice
        ).toFixed(2)} (${offer.discountPercentage}% off)`,
        [{ text: "Great!" }],
      );
    }, 100);
  };

  const showOfferDetails = (offer: ServiceOffer) => {
    setSelectedOffer(offer);
    setOfferModalVisible(true);
  };

  const addProduct = (product: InventoryItem) => {
    if (product.quantity <= 0) {
      Alert.alert("Out of Stock", `${product.name} is out of stock.`);
      return;
    }
    const existing = selectedProducts.find((p) => p.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.quantity) {
        Alert.alert("Limit Reached", `Only ${product.quantity} available.`);
        return;
      }
      setSelectedProducts((prev) =>
        prev.map((p) =>
          p.productId === product.id
            ? {
                ...p,
                quantity: p.quantity + 1,
                totalPrice: (p.quantity + 1) * p.unitPrice,
              }
            : p,
        ),
      );
    } else {
      setSelectedProducts((prev) => [
        ...prev,
        {
          id: `prod-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          totalPrice: product.price,
        },
      ]);
    }
  };

  const updateProductQty = (productId: string, qty: number) => {
    const product = inventory.find((p) => p.id === productId);
    if (!product) return;
    if (qty > product.quantity) {
      Alert.alert("Limit Reached", `Only ${product.quantity} available.`);
      return;
    }
    if (qty <= 0) {
      setSelectedProducts((prev) => prev.filter((p) => p.productId !== productId));
      return;
    }
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.productId === productId
          ? { ...p, quantity: qty, totalPrice: qty * p.unitPrice }
          : p,
      ),
    );
  };

  const subtotal = useMemo(
    () =>
      selectedLines.reduce((s, l) => s + (Number.isFinite(l.finalPrice) ? l.finalPrice : 0), 0) +
      selectedProducts.reduce((s, p) => s + p.totalPrice, 0),
    [selectedLines, selectedProducts],
  );

  const total = useMemo(() => {
    let t = subtotal;
    const pct = parseFloat(discountPercent) || 0;
    if (pct > 0 && pct <= 100) t *= 1 - pct / 100;
    const amt = parseFloat(discountAmount) || 0;
    if (amt > 0) t = Math.max(0, t - amt);
    const ov = parseFloat(amountOverride);
    if (!isNaN(ov) && ov >= 0) t = ov;
    return t;
  }, [subtotal, discountPercent, discountAmount, amountOverride]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customers ?? [];
    return (customers ?? []).filter(
      (c: any) =>
        c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q),
    );
  }, [customers, customerSearch]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.toLowerCase().trim();
    if (!q) return services ?? [];
    return (services ?? []).filter((sv: Service) =>
      sv.name?.toLowerCase().includes(q),
    );
  }, [services, serviceSearch]);

  const filteredInventory = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    const inStock = (inventory ?? []).filter((item: any) => item.quantity > 0);
    if (!q) return inStock;
    return inStock.filter((item: any) => item.name?.toLowerCase().includes(q));
  }, [inventory, productSearch]);

  const toggleStaff = (id: string) => {
    setAttendingStaffIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (attendingStaffIds.length === 0) {
      Alert.alert("Select Staff", "Please select who attended the customer.");
      return;
    }
    if (selectedLines.length === 0 && selectedProducts.length === 0) {
      Alert.alert("Add Items", "Please select at least one service or product.");
      return;
    }
    const overrideNum = amountOverride.trim() ? parseFloat(amountOverride) : undefined;
    if (overrideNum !== undefined && !overrideReason.trim()) {
      Alert.alert("Reason Required", "Please enter a reason for overriding the amount.");
      return;
    }

    setSubmitting(true);
    try {
      const primaryStaffId = attendingStaffIds[0];
      const primaryStaff = staffMembers.find((s) => s.id === primaryStaffId);
      const attendingStaff: VisitStaff[] = attendingStaffIds.map((staffId) => ({
        staffId,
        staffName: staffMembers.find((s) => s.id === staffId)?.name || "Unknown",
        revenueShare: total / attendingStaffIds.length,
      }));

      let customerId: string;
      let name: string;
      if (customerMode === "existing") {
        if (!selectedCustomerId) {
          Alert.alert("Select Customer", "Please select a customer.");
          return;
        }
        const c = customers.find((c: any) => c.id === selectedCustomerId);
        if (!c) {
          Alert.alert("Error", "Customer not found.");
          return;
        }
        customerId = c?.id;
        name = c?.name;
      } else {
        if (!customerName.trim()) {
          Alert.alert("Name Required", "Please enter customer name.");
          return;
        }
        const created = await addOrUpdateCustomer({
          name: customerName.trim(),
          dob: customerDob.trim() || undefined,
          phone: customerPhone.trim() || undefined,
          email: customerEmail.trim() || undefined,
          gender: customerGender || undefined,
          address: customerAddress.trim() || undefined,
        });
        customerId = created?.id;
        name = created?.name;
      }

      const today = new Date();
      const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const visitId = await recordVisit({
        staffId: primaryStaffId,
        staffName: primaryStaff?.name || user?.name || "Staff",
        customerId,
        customerName: name,
        branchId: primaryStaff?.branchId || user?.branchId || undefined,
        date: dateOnly,
        services: selectedLines,
        products: selectedProducts,
        total,
        paymentMode,
        discountPercent: parseFloat(discountPercent) || 0,
        discountAmount: parseFloat(discountAmount) || 0,
        amountOverride: overrideNum,
        overrideReason: overrideReason.trim() || undefined,
        attendingStaff,
      });

      Alert.alert("Visit Saved!", "The visit has been recorded successfully.", [
        { text: "View Bill", onPress: () => navigation.navigate("BillView", { visitId }) },
        { text: "Done", style: "cancel", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save visit.");
    } finally {
      setSubmitting(false);
    }
  };

  const discountValue = useMemo(() => subtotal - total, [subtotal, total]);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <Text style={s.topBarTitle}>New Visit</Text>
          <View style={s.topBarIcon}>
            <MaterialCommunityIcons name="receipt" size={18} color={D.green} />
          </View>
        </View>

        {/* ══ 1. ATTENDING STAFF ════════════════════════════════════════════ */}
        <SectionLabel>ATTENDING STAFF</SectionLabel>
        <View style={s.card}>
          <Text style={s.cardHint}>
            Select all staff who served this customer. Revenue splits equally.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.staffRow}>
            {(staffMembers ?? []).map((staff: any) => {
              const active = attendingStaffIds.includes(staff.id);
              return (
                <TouchableOpacity
                  key={staff.id}
                  style={[s.staffChip, active && s.staffChipActive]}
                  onPress={() => toggleStaff(staff.id)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      s.staffAvatar,
                      { backgroundColor: avatarColor(staff.name) },
                    ]}
                  >
                    <Text style={s.staffAvatarText}>{initials(staff.name)}</Text>
                  </View>
                  <Text style={[s.staffChipText, active && s.staffChipTextActive]}>
                    {staff.name.split(" ")[0]}
                  </Text>
                  {active && (
                    <MaterialCommunityIcons name="check" size={12} color={D.green} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {attendingStaffIds.length > 0 && (
            <View style={s.revShareBanner}>
              <MaterialCommunityIcons name="currency-inr" size={14} color={D.green} />
              <Text style={s.revShareText}>
                Each staff receives{" "}
                <Text style={{ fontWeight: "800" }}>
                  ₹{(total / attendingStaffIds.length).toFixed(0)}
                </Text>
                {attendingStaffIds.length > 1 ? " (equal split)" : ""}
              </Text>
            </View>
          )}
        </View>

        {/* ══ 2. CUSTOMER DETAILS ════════════════════════════════════════════ */}
        <SectionLabel>CUSTOMER DETAILS</SectionLabel>
        <View style={s.card}>
          {/* Mode toggle */}
          <View style={s.modeToggle}>
            {(["new", "existing"] as CustomerMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[s.modeBtn, customerMode === mode && s.modeBtnActive]}
                onPress={() => setCustomerMode(mode)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={mode === "new" ? "account-plus-outline" : "account-search-outline"}
                  size={16}
                  color={customerMode === mode ? D.green : D.textMuted}
                />
                <Text
                  style={[s.modeBtnText, customerMode === mode && s.modeBtnTextActive]}
                >
                  {mode === "new" ? "New Customer" : "Existing Customer"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {customerMode === "existing" ? (
            customers.length === 0 ? (
              <View style={s.emptyBlock}>
                <MaterialCommunityIcons
                  name="account-off-outline"
                  size={32}
                  color={D.textMuted}
                />
                <Text style={s.emptyBlockText}>No customers yet. Add a new one.</Text>
              </View>
            ) : (
              <>
                <View style={s.searchBar}>
                  <MaterialCommunityIcons
                    name="magnify"
                    size={18}
                    color={D.textMuted}
                    style={{ marginLeft: 12 }}
                  />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Search by name or phone…"
                    placeholderTextColor={D.textMuted}
                    value={customerSearch}
                    onChangeText={setCustomerSearch}
                  />
                  {customerSearch.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setCustomerSearch("")}
                      style={{ paddingHorizontal: 12 }}
                    >
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={16}
                        color={D.textMuted}
                      />
                    </TouchableOpacity>
                  )}
                </View>
                {filteredCustomers.length === 0 ? (
                  <View style={s.emptyBlock}>
                    <MaterialCommunityIcons
                      name="account-search-outline"
                      size={28}
                      color={D.textMuted}
                    />
                    <Text style={s.emptyBlockText}>
                      No customers match "{customerSearch}"
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.customerRow}
                  >
                    {filteredCustomers.map((item: any) => {
                      const active = selectedCustomerId === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[s.customerTile, active && s.customerTileActive]}
                          onPress={() => setSelectedCustomerId(item.id)}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[
                              s.customerTileAvatar,
                              { backgroundColor: avatarColor(item.name) },
                              active && s.customerTileAvatarActive,
                            ]}
                          >
                            <Text style={s.customerTileAvatarText}>
                              {initials(item.name)}
                            </Text>
                          </View>
                          <Text
                            style={[s.customerTileName, active && s.customerTileNameActive]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          {item.phone && (
                            <Text style={s.customerTilePhone}>{item.phone}</Text>
                          )}
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
            <View style={s.formGroup}>
              <View style={s.inputWrapper}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={18}
                  color={D.textMuted}
                  style={s.inputIcon}
                />
                <TextInput
                  style={s.input}
                  placeholder="Customer name *"
                  placeholderTextColor={D.textMuted}
                  value={customerName}
                  onChangeText={setCustomerName}
                />
              </View>
              <DatePickerField
                value={customerDob}
                onChange={setCustomerDob}
                placeholder="Date of birth (optional)"
                style={s.datePicker}
              />
              <View style={s.inputWrapper}>
                <MaterialCommunityIcons
                  name="phone-outline"
                  size={18}
                  color={D.textMuted}
                  style={s.inputIcon}
                />
                <TextInput
                  style={s.input}
                  placeholder="Phone (optional)"
                  placeholderTextColor={D.textMuted}
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={s.inputWrapper}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={18}
                  color={D.textMuted}
                  style={s.inputIcon}
                />
                <TextInput
                  style={s.input}
                  placeholder="Email (optional)"
                  placeholderTextColor={D.textMuted}
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  keyboardType="email-address"
                />
              </View>
              <View style={s.genderRow}>
                {(["male", "female", "other"] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[s.genderChip, customerGender === g && s.genderChipActive]}
                    onPress={() => setCustomerGender(customerGender === g ? "" : g)}
                  >
                    <MaterialCommunityIcons
                      name={
                        g === "male"
                          ? "gender-male"
                          : g === "female"
                          ? "gender-female"
                          : "gender-non-binary"
                      }
                      size={14}
                      color={customerGender === g ? D.green : D.textMuted}
                    />
                    <Text
                      style={[
                        s.genderChipText,
                        customerGender === g && s.genderChipTextActive,
                      ]}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.inputWrapper}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={18}
                  color={D.textMuted}
                  style={s.inputIcon}
                />
                <TextInput
                  style={s.input}
                  placeholder="Address (optional)"
                  placeholderTextColor={D.textMuted}
                  value={customerAddress}
                  onChangeText={setCustomerAddress}
                />
              </View>
            </View>
          )}
        </View>

        {/* ══ 3. SERVICES ════════════════════════════════════════════════════ */}
        <SectionLabel>SERVICES</SectionLabel>
        <View style={s.card}>
          <View style={s.searchBar}>
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color={D.textMuted}
              style={{ marginLeft: 12 }}
            />
            <TextInput
              style={s.searchInput}
              placeholder="Search services…"
              placeholderTextColor={D.textMuted}
              value={serviceSearch}
              onChangeText={setServiceSearch}
            />
            {serviceSearch.length > 0 && (
              <TouchableOpacity
                onPress={() => setServiceSearch("")}
                style={{ paddingHorizontal: 12 }}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={16}
                  color={D.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>
          {filteredServices.length === 0 ? (
            <View style={s.emptyBlock}>
              <MaterialCommunityIcons name="spa" size={28} color={D.textMuted} />
              <Text style={s.emptyBlockText}>
                No services match "{serviceSearch}"
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.serviceRow}
            >
              {filteredServices.map((item: Service) => {
                const active = selectedLines.some((l) => l.serviceId === item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.serviceTile, active && s.serviceTileActive]}
                    onPress={() => toggleService(item)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        s.serviceTileIcon,
                        active && s.serviceTileIconActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={getServiceIcon(item.name)}
                        size={20}
                        color={active ? D.green : D.textSub}
                      />
                    </View>
                    <Text
                      style={[s.serviceTileName, active && s.serviceTileNameActive]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[s.serviceTilePrice, active && s.serviceTilePriceActive]}
                    >
                      ₹{item.price}
                    </Text>
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

          {/* Selected services list */}
          {selectedLines.length > 0 && (
            <View style={s.selectedSection}>
              <View style={s.selectedSectionHeader}>
                <MaterialCommunityIcons name="check-circle-outline" size={14} color={D.green} />
                <Text style={s.selectedSectionTitle}>
                  {selectedLines.length} service{selectedLines.length > 1 ? "s" : ""} selected
                </Text>
              </View>
              {selectedLines.map((line, i) => (
                <View
                  key={line.id}
                  style={[
                    s.lineRow,
                    i < selectedLines.length - 1 && s.lineRowBorder,
                  ]}
                >
                  <View
                    style={[
                      s.lineIcon,
                      { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={getServiceIcon(line.serviceName)}
                      size={14}
                      color={D.green}
                    />
                  </View>
                  <View style={s.lineInfo}>
                    <Text style={s.lineName}>{line.serviceName}</Text>
                    <Text style={s.lineBase}>Base ₹{line.basePrice}</Text>
                  </View>
                  <View style={s.linePriceBox}>
                    <Text style={s.linePriceLabel}>FINAL</Text>
                    <TextInput
                      style={s.linePriceInput}
                      keyboardType="numeric"
                      value={String(line.finalPrice)}
                      onChangeText={(val) => updateLinePrice(line.id, val)}
                      selectTextOnFocus
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ══ 4. OFFERS ══════════════════════════════════════════════════════ */}
        {offers.length > 0 && (
          <>
            <SectionLabel>SPECIAL OFFERS</SectionLabel>
            <View style={s.card}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.offerRow}
              >
                {offers.map((offer) => {
                  const isApplied = appliedOffers.has(offer.id);
                  const allServicesSelected = offer.serviceIds.every((serviceId) =>
                    selectedLines.some((l) => l.serviceId === serviceId),
                  );
                  // Offer is active if all services are selected (shows amber styling)
                  const isActive = allServicesSelected && !isApplied;
                  
                  return (
                    <TouchableOpacity
                      key={offer.id}
                      style={[
                        s.offerTile,
                        isActive && s.offerTileActive,
                        isApplied && s.offerTileApplied,
                      ]}
                      onPress={() => handleOfferSelect(offer)}
                      onLongPress={() => showOfferDetails(offer)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          s.offerTileIcon,
                          isActive && s.offerTileIconActive,
                          isApplied && s.offerTileIconApplied,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="percent"
                          size={20}
                          color={
                            isApplied
                              ? "#FFF"
                              : isActive
                              ? D.amber
                              : D.textSub
                          }
                        />
                      </View>
                      <Text
                        style={[
                          s.offerTileName,
                          isActive && s.offerTileNameActive,
                          isApplied && s.offerTileNameApplied,
                        ]}
                        numberOfLines={1}
                      >
                        {offer.name}
                      </Text>
                      <View style={s.offerPriceRow}>
                        <Text style={s.offerOriginalPrice}>₹{offer.originalPrice}</Text>
                        <Text
                          style={[
                            s.offerComboPrice,
                            isApplied && s.offerComboPriceApplied,
                          ]}
                        >
                          ₹{offer.comboPrice}
                        </Text>
                      </View>
                      <View
                        style={[
                          s.offerDiscountBadge,
                          isApplied && s.offerDiscountBadgeApplied,
                        ]}
                      >
                        <Text
                          style={[
                            s.offerDiscountText,
                            isApplied && s.offerDiscountTextApplied,
                          ]}
                        >
                          {offer.discountPercentage}% OFF
                        </Text>
                      </View>
                      {isActive && (
                        <View style={s.offerTilePendingIcon}>
                          <MaterialCommunityIcons name="clock-outline" size={11} color={D.amber} />
                        </View>
                      )}
                      {isApplied && (
                        <View style={s.offerTileCheck}>
                          <MaterialCommunityIcons name="check" size={11} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={s.offerHint}>
                <MaterialCommunityIcons name="information-outline" size={14} color={D.amber} />
                <Text style={s.offerHintText}>
                  Tap to apply/remove offer · Long press for details
                </Text>
              </View>
            </View>
          </>
        )}

        {/* ══ 5. PRODUCTS ════════════════════════════════════════════════════ */}
        <SectionLabel>PRODUCTS</SectionLabel>
        <View style={s.card}>
          <View style={s.searchBar}>
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color={D.textMuted}
              style={{ marginLeft: 12 }}
            />
            <TextInput
              style={s.searchInput}
              placeholder="Search products…"
              placeholderTextColor={D.textMuted}
              value={productSearch}
              onChangeText={setProductSearch}
            />
            {productSearch.length > 0 && (
              <TouchableOpacity
                onPress={() => setProductSearch("")}
                style={{ paddingHorizontal: 12 }}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={16}
                  color={D.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>
          {filteredInventory.length === 0 ? (
            <View style={s.emptyBlock}>
              <MaterialCommunityIcons name="package-variant" size={28} color={D.textMuted} />
              <Text style={s.emptyBlockText}>
                {productSearch
                  ? `No products match "${productSearch}"`
                  : "No products in stock"}
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.productRow}
            >
              {filteredInventory.map((item: any) => {
                const isSelected = selectedProducts.some((p) => p.productId === item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.productTile, isSelected && s.productTileSelected]}
                    onPress={() => addProduct(item)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        s.productTileIcon,
                        isSelected && s.productTileIconSelected,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="spray"
                        size={20}
                        color={isSelected ? D.green : D.textSub}
                      />
                    </View>
                    <Text
                      style={[
                        s.productTileName,
                        isSelected && s.productTileNameSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        s.productTilePrice,
                        isSelected && s.productTilePriceSelected,
                      ]}
                    >
                      ₹{item.price}
                    </Text>
                    <View style={[s.productTileStock, isSelected && s.productTileStockSelected]}>
                      <Text style={[s.productTileStockText, isSelected && s.productTileStockTextSelected]}>
                        {item.quantity} left
                      </Text>
                    </View>
                    {isSelected ? (
                      <View style={s.productTileCheck}>
                        <MaterialCommunityIcons name="check" size={11} color="#FFF" />
                      </View>
                    ) : (
                      <View style={s.productTileAdd}>
                        <MaterialCommunityIcons name="plus" size={12} color={D.textSub} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Selected products list */}
          {selectedProducts.length > 0 && (
            <View style={s.selectedSection}>
              <View
                style={[
                  s.selectedSectionHeader,
                  { backgroundColor: D.greenMuted },
                ]}
              >
                <MaterialCommunityIcons name="check-circle-outline" size={14} color={D.green} />
                <Text style={[s.selectedSectionTitle, { color: D.green }]}>
                  {selectedProducts.length} product{selectedProducts.length > 1 ? "s" : ""} selected
                </Text>
              </View>
              {selectedProducts.map((p, i) => (
                <View
                  key={p.productId}
                  style={[s.lineRow, i < selectedProducts.length - 1 && s.lineRowBorder]}
                >
                  <View
                    style={[
                      s.lineIcon,
                      { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
                    ]}
                  >
                    <MaterialCommunityIcons name="spray" size={14} color={D.green} />
                  </View>
                  <View style={s.lineInfo}>
                    <Text style={s.lineName}>{p.productName}</Text>
                    <Text style={s.lineBase}>₹{p.unitPrice} per unit</Text>
                  </View>
                  <View style={s.qtyRow}>
                    <TouchableOpacity
                      style={s.qtyBtn}
                      onPress={() => updateProductQty(p.productId, p.quantity - 1)}
                    >
                      <Text style={s.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.qtyValue}>{p.quantity}</Text>
                    <TouchableOpacity
                      style={[s.qtyBtn, s.qtyBtnAdd]}
                      onPress={() => updateProductQty(p.productId, p.quantity + 1)}
                    >
                      <Text style={[s.qtyBtnText, { color: D.green }]}>+</Text>
                    </TouchableOpacity>
                    <Text style={s.qtyTotal}>₹{p.totalPrice.toFixed(0)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ══ 6. PAYMENT ══════════════════════════════════════════════════════ */}
        <SectionLabel>PAYMENT</SectionLabel>
        <View style={s.card}>
          {/* Payment mode - larger icons like AdminDashboard */}
          <View style={s.paymentRow}>
            <TouchableOpacity
              style={[s.paymentBtn, paymentMode === "cash" && s.paymentBtnActive]}
              onPress={() => setPaymentMode("cash")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="cash"
                size={24}
                color={paymentMode === "cash" ? D.green : D.textMuted}
              />
              <Text style={[s.paymentBtnText, paymentMode === "cash" && s.paymentBtnTextActive]}>
                Cash
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.paymentBtn, paymentMode === "upi" && s.paymentBtnActive]}
              onPress={() => setPaymentMode("upi")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="contactless-payment"
                size={24}
                color={paymentMode === "upi" ? D.green : D.textMuted}
              />
              <Text style={[s.paymentBtnText, paymentMode === "upi" && s.paymentBtnTextActive]}>
                UPI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.paymentBtn, paymentMode === "card" && s.paymentBtnActive]}
              onPress={() => setPaymentMode("card")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="credit-card"
                size={24}
                color={paymentMode === "card" ? D.green : D.textMuted}
              />
              <Text style={[s.paymentBtnText, paymentMode === "card" && s.paymentBtnTextActive]}>
                Card
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.paymentBtn, paymentMode === "udhaar" && s.paymentBtnActive]}
              onPress={() => setPaymentMode("udhaar")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="handshake"
                size={24}
                color={paymentMode === "udhaar" ? D.green : D.textMuted}
              />
              <Text style={[s.paymentBtnText, paymentMode === "udhaar" && s.paymentBtnTextActive]}>
                Udhaar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Discounts */}
          <View style={s.discountRow}>
            <View style={s.discountInput}>
              <MaterialCommunityIcons
                name="percent"
                size={16}
                color={D.textMuted}
                style={{ marginLeft: 12 }}
              />
              <TextInput
                style={s.discountInputField}
                placeholder="Discount %"
                placeholderTextColor={D.textMuted}
                keyboardType="numeric"
                value={discountPercent}
                onChangeText={setDiscountPercent}
              />
            </View>
            <View style={s.discountInput}>
              <Text style={{ fontSize: 14, color: D.textMuted, marginLeft: 12 }}>₹</Text>
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
          <View style={[s.overrideBox, amountOverride.trim() && s.overrideBoxActive]}>
            <MaterialCommunityIcons
              name="pencil-outline"
              size={16}
              color={amountOverride.trim() ? D.green : D.textMuted}
              style={{ marginLeft: 12 }}
            />
            <TextInput
              style={s.overrideInput}
              placeholder="Override final amount (₹)"
              placeholderTextColor={D.textMuted}
              keyboardType="numeric"
              value={amountOverride}
              onChangeText={setAmountOverride}
            />
          </View>
          {amountOverride.trim() && (
            <View style={s.overrideReasonBox}>
              <MaterialCommunityIcons
                name="comment-outline"
                size={16}
                color={D.textMuted}
                style={{ marginLeft: 12 }}
              />
              <TextInput
                style={s.overrideReasonInput}
                placeholder="Reason for override (required)"
                placeholderTextColor={D.textMuted}
                value={overrideReason}
                onChangeText={setOverrideReason}
              />
            </View>
          )}

          {/* Bill breakdown */}
          <View style={s.billBreakdown}>
            <View style={s.billRow}>
              <Text style={s.billLabel}>Subtotal</Text>
              <Text style={s.billValue}>₹{subtotal.toFixed(0)}</Text>
            </View>
            {discountValue > 0 && (
              <View style={s.billRow}>
                <Text style={[s.billLabel, { color: D.green }]}>Discount</Text>
                <Text style={[s.billValue, { color: D.green }]}>
                  −₹{discountValue.toFixed(0)}
                </Text>
              </View>
            )}
            {amountOverride.trim() && (
              <View style={s.billRow}>
                <Text style={[s.billLabel, { color: D.green }]}>Override</Text>
                <Text style={[s.billValue, { color: D.green }]}>
                  ₹{parseFloat(amountOverride).toFixed(0)}
                </Text>
              </View>
            )}
            <View style={s.billDivider} />
            <View style={s.billTotalRow}>
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
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <View style={s.saveBtnIcon}>
                <MaterialCommunityIcons name="check" size={20} color={D.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.saveBtnTitle}>Save Visit</Text>
                <Text style={s.saveBtnSub}>
                  Total: ₹{total.toFixed(0)} · {paymentMode.toUpperCase()}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color="rgba(255,255,255,0.6)"
              />
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Offer Details Modal ── */}
      <Modal
        visible={offerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setOfferModalVisible(false)}
        >
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            {selectedOffer && (
              <>
                <View style={s.modalHeader}>
                  <View style={s.modalIcon}>
                    <MaterialCommunityIcons name="percent" size={24} color={D.amber} />
                  </View>
                  <Text style={s.modalTitle}>{selectedOffer.name}</Text>
                </View>
                {selectedOffer.description && (
                  <Text style={s.modalDesc}>{selectedOffer.description}</Text>
                )}
                <View style={s.modalDivider} />
                <Text style={s.modalSectionTitle}>Services Included</Text>
                {selectedOffer.serviceNames.map((name, idx) => (
                  <View key={idx} style={s.modalServiceRow}>
                    <View style={s.modalServiceDot} />
                    <Text style={s.modalServiceName}>{name}</Text>
                  </View>
                ))}
                <View style={s.modalDivider} />
                <View style={s.modalPriceRow}>
                  <Text style={s.modalPriceLabel}>Original Price</Text>
                  <Text style={s.modalOriginalPrice}>₹{selectedOffer.originalPrice}</Text>
                </View>
                <View style={s.modalPriceRow}>
                  <Text style={s.modalPriceLabel}>Offer Price</Text>
                  <Text style={s.modalOfferPrice}>₹{selectedOffer.comboPrice}</Text>
                </View>
                <View style={s.modalSaveRow}>
                  <Text style={s.modalSaveLabel}>You Save</Text>
                  <Text style={s.modalSaveValue}>
                    ₹{selectedOffer.originalPrice - selectedOffer.comboPrice} (
                    {selectedOffer.discountPercentage}% OFF)
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.modalCloseBtn}
                  onPress={() => setOfferModalVisible(false)}
                  activeOpacity={0.85}
                >
                  <Text style={s.modalCloseBtnText}>Got it</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 },

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
    marginTop: -8,
    marginBottom: 16,
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

  // Card
  card: {
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    borderWidth: 1,
    borderColor: D.border,
    padding: 16,
    marginBottom: 16,
  },
  cardHint: {
    fontSize: 12,
    color: D.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },

  // Staff
  staffRow: { gap: 8, paddingBottom: 4 },
  staffChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    borderColor: D.border,
  },
  staffChipActive: { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  staffAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  staffAvatarText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  staffChipText: { fontSize: 12, fontWeight: "600", color: D.textSub },
  staffChipTextActive: { color: D.green },
  revShareBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  revShareText: { fontSize: 12, color: D.green, fontWeight: "600" },

  // Mode toggle
  modeToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    backgroundColor: D.bg,
    borderRadius: D.radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: D.border,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: D.radius.md,
  },
  modeBtnActive: {
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  modeBtnText: { fontSize: 12, fontWeight: "600", color: D.textMuted },
  modeBtnTextActive: { color: D.green },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.border,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: D.text,
  },

  // Customer
  customerRow: { gap: 10, paddingBottom: 4 },
  customerTile: {
    width: 90,
    alignItems: "center",
    backgroundColor: D.surface,
    borderRadius: D.radius.lg,
    borderWidth: 1.5,
    borderColor: D.border,
    padding: 10,
    position: "relative",
  },
  customerTileActive: { borderColor: D.green, backgroundColor: D.greenMuted },
  customerTileAvatar: {
    width: 44,
    height: 44,
    borderRadius: D.radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  customerTileAvatarActive: { backgroundColor: D.green },
  customerTileAvatarText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  customerTileName: { fontSize: 11, fontWeight: "700", color: D.text, textAlign: "center" },
  customerTileNameActive: { color: D.green },
  customerTilePhone: { fontSize: 9, color: D.textMuted, textAlign: "center", marginTop: 2 },
  customerTileCheck: {
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

  // Form inputs
  formGroup: { gap: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
  },
  inputIcon: { marginLeft: 12 },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
    color: D.text,
  },
  datePicker: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: D.text,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.border,
  },
  genderRow: { flexDirection: "row", gap: 8 },
  genderChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.border,
  },
  genderChipActive: { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  genderChipText: { fontSize: 12, fontWeight: "600", color: D.textMuted },
  genderChipTextActive: { color: D.green },

  // Service tiles
  serviceRow: { gap: 10, paddingBottom: 4 },
  serviceTile: {
    width: 92,
    alignItems: "center",
    backgroundColor: D.surface,
    borderRadius: D.radius.lg,
    borderWidth: 1.5,
    borderColor: D.border,
    padding: 10,
    position: "relative",
  },
  serviceTileActive: { borderColor: D.green, backgroundColor: D.greenMuted },
  serviceTileIcon: {
    width: 44,
    height: 44,
    borderRadius: D.radius.md,
    backgroundColor: D.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: D.border,
    marginBottom: 6,
  },
  serviceTileIconActive: { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  serviceTileName: { fontSize: 10, fontWeight: "600", color: D.text, textAlign: "center", minHeight: 28 },
  serviceTileNameActive: { color: D.green },
  serviceTilePrice: { fontSize: 12, fontWeight: "800", color: D.textSub, marginTop: 3 },
  serviceTilePriceActive: { color: D.green },
  serviceTileCheck: {
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

  // Offer tiles - orange/golden colors
  offerRow: { gap: 10, paddingBottom: 4 },
  offerTile: {
    width: 120,
    alignItems: "center",
    backgroundColor: D.surface,
    borderRadius: D.radius.lg,
    borderWidth: 1.5,
    borderColor: D.border,
    padding: 10,
    position: "relative",
  },
  offerTileActive: { borderColor: D.amber, backgroundColor: D.amberMuted },
  offerTileApplied: { borderColor: D.amber, backgroundColor: D.amberMuted },
  offerTileIcon: {
    width: 44,
    height: 44,
    borderRadius: D.radius.md,
    backgroundColor: D.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: D.border,
    marginBottom: 6,
  },
  offerTileIconActive: { backgroundColor: D.amberMuted, borderColor: D.amberBorder },
  offerTileIconApplied: { backgroundColor: D.amber, borderColor: D.amberBorder },
  offerTileName: { fontSize: 11, fontWeight: "700", color: D.text, textAlign: "center", marginBottom: 4 },
  offerTileNameActive: { color: D.amber },
  offerTileNameApplied: { color: D.amber },
  offerPriceRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  offerOriginalPrice: { fontSize: 10, fontWeight: "600", color: D.textMuted, textDecorationLine: "line-through" },
  offerComboPrice: { fontSize: 13, fontWeight: "800", color: D.amber },
  offerComboPriceApplied: { color: D.amber },
  offerDiscountBadge: {
    backgroundColor: D.amberMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: D.radius.pill,
  },
  offerDiscountBadgeApplied: { backgroundColor: D.amberMuted },
  offerDiscountText: { fontSize: 9, fontWeight: "700", color: D.amber },
  offerDiscountTextApplied: { color: D.amber },
  offerTilePendingIcon: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: D.amberMuted,
    borderWidth: 1,
    borderColor: D.amberBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  offerTileCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: D.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  offerHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: D.amberMuted,
    borderRadius: D.radius.md,
  },
  offerHintText: { fontSize: 11, color: D.amber, fontWeight: "600", flex: 1 },

  // Product tiles - bland unselected, green when selected
  productRow: { gap: 10, paddingBottom: 1 },
  productTile: {
    width: 92,
    alignItems: "center",
    backgroundColor: D.surface,
    borderRadius: D.radius.lg,
    borderWidth: 1.5,
    borderColor: D.border,
    padding: 10,
    position: "relative",
  },
  productTileSelected: { borderColor: D.green, backgroundColor: D.greenMuted },
  productTileIcon: {
    width: 44,
    height: 44,
    borderRadius: D.radius.md,
    backgroundColor: D.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: D.border,
    marginBottom: 4,
    marginTop: 10,
  },
  productTileIconSelected: { backgroundColor: D.greenMuted, borderColor: D.greenBorder },
  productTileName: { fontSize: 10, fontWeight: "600", color: D.text, textAlign: "center", minHeight: 28 },
  productTileNameSelected: { color: D.green },
  productTilePrice: { fontSize: 12, fontWeight: "800", color: D.textSub },
  productTilePriceSelected: { color: D.green },
  productTileStock: {
    marginTop: 4,
    backgroundColor: D.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: D.radius.pill,
  },
  productTileStockSelected: { backgroundColor: D.greenMuted },
  productTileStockText: { fontSize: 8, fontWeight: "600", color: D.textSub },
  productTileStockTextSelected: { color: D.green },
  productTileAdd: {
    position: "absolute",
    top: 3,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: D.surfaceAlt,
    borderWidth: 1,
    borderColor: D.border,
    alignItems: "center",
    justifyContent: "center",
  },
  productTileCheck: {
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

  // Selected section
  selectedSection: {
    marginTop: 14,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.lg,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
  },
  selectedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    backgroundColor: D.greenMuted,
  },
  selectedSectionTitle: { fontSize: 11, fontWeight: "700", color: D.green, letterSpacing: 0.5 },
  lineRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  lineRowBorder: { borderBottomWidth: 1, borderBottomColor: D.border },
  lineIcon: {
    width: 32,
    height: 32,
    borderRadius: D.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  lineInfo: { flex: 1 },
  lineName: { fontSize: 13, fontWeight: "700", color: D.text },
  lineBase: { fontSize: 10, color: D.textMuted, marginTop: 1 },
  linePriceBox: { alignItems: "flex-end" },
  linePriceLabel: { fontSize: 8, color: D.textMuted, fontWeight: "700", letterSpacing: 1, marginBottom: 2 },
  linePriceInput: {
    minWidth: 68,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.greenBorder,
    backgroundColor: D.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: D.green,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },

  // Quantity controls
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: D.radius.sm,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnAdd: { borderColor: D.greenBorder, backgroundColor: D.greenMuted },
  qtyBtnText: { fontSize: 16, fontWeight: "700", color: D.textSub, lineHeight: 22 },
  qtyValue: { fontSize: 14, fontWeight: "800", color: D.text, minWidth: 20, textAlign: "center" },
  qtyTotal: { fontSize: 13, fontWeight: "800", color: D.green, minWidth: 52, textAlign: "right" },

  // Payment - larger icons like AdminDashboard
  paymentRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  paymentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: D.bg,
    borderRadius: D.radius.md,
    borderWidth: 1.5,
    borderColor: D.border,
  },
  paymentBtnActive: { borderColor: D.green, backgroundColor: D.greenMuted },
  paymentBtnText: { fontSize: 11, fontWeight: "700", color: D.textMuted },
  paymentBtnTextActive: { color: D.green },
  discountRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  discountInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.bg,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
  },
  discountInputField: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 11,
    fontSize: 14,
    color: D.text,
  },
  overrideBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.bg,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
    marginBottom: 10,
  },
  overrideBoxActive: { borderColor: D.greenBorder, backgroundColor: D.greenMuted },
  overrideInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 11,
    fontSize: 14,
    color: D.text,
  },
  overrideReasonBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.bg,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
    marginBottom: 10,
  },
  overrideReasonInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 11,
    fontSize: 14,
    color: D.text,
  },

  // Bill breakdown
  billBreakdown: {
    marginTop: 14,
    backgroundColor: D.bg,
    borderRadius: D.radius.lg,
    borderWidth: 1,
    borderColor: D.border,
    padding: 14,
  },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  billLabel: { fontSize: 12, color: D.textSub, fontWeight: "500" },
  billValue: { fontSize: 14, fontWeight: "700", color: D.text },
  billDivider: { height: 1, backgroundColor: D.border, marginVertical: 8 },
  billTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  billTotalLabel: { fontSize: 11, fontWeight: "800", color: D.text, letterSpacing: 1.5 },
  billTotalValue: { fontSize: 20, fontWeight: "800", color: D.green, letterSpacing: -0.5 },

  // Save button
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: D.text,
    borderRadius: D.radius.xl,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  saveBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: D.radius.lg,
    backgroundColor: D.greenMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnTitle: { fontSize: 16, fontWeight: "800", color: "#FFF", letterSpacing: -0.3 },
  saveBtnSub: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },

  // Empty state
  emptyBlock: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyBlockText: { fontSize: 13, color: D.textMuted, textAlign: "center" },

  // Modal - amber accent for offers
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
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: D.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: D.radius.md,
    backgroundColor: D.amberMuted,
    borderWidth: 1,
    borderColor: D.amberBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: D.text, flex: 1, letterSpacing: -0.3 },
  modalDesc: { fontSize: 13, color: D.textSub, marginBottom: 16, lineHeight: 20 },
  modalDivider: { height: 1, backgroundColor: D.border, marginVertical: 12 },
  modalSectionTitle: { fontSize: 11, fontWeight: "700", color: D.textSub, letterSpacing: 1, marginBottom: 10 },
  modalServiceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  modalServiceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: D.amber },
  modalServiceName: { fontSize: 14, color: D.text, fontWeight: "500" },
  modalPriceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalPriceLabel: { fontSize: 13, color: D.textSub },
  modalOriginalPrice: { fontSize: 14, color: D.textMuted, textDecorationLine: "line-through" },
  modalOfferPrice: { fontSize: 16, fontWeight: "800", color: D.amber },
  modalSaveRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: D.border,
  },
  modalSaveLabel: { fontSize: 13, fontWeight: "700", color: D.text },
  modalSaveValue: { fontSize: 14, fontWeight: "800", color: D.amber },
  modalCloseBtn: {
    backgroundColor: D.amber,
    borderRadius: D.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  modalCloseBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});