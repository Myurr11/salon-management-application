import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useData } from "../context/DataContext";
import type { ServiceOffer, Service } from "../types";
import * as supabaseService from "../services/supabaseService";

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

export const AdminOffersScreen: React.FC<Props> = ({ navigation }) => {
  const { services, offers, refreshData } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuOffer, setMenuOffer] = useState<ServiceOffer | null>(null);
  const [editingOffer, setEditingOffer] = useState<ServiceOffer | null>(null);
  const [offerName, setOfferName] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [comboPrice, setComboPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredOffers = useMemo(() => {
    if (!searchQuery.trim()) return offers;
    const q = searchQuery.toLowerCase();
    return offers.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q),
    );
  }, [offers, searchQuery]);

  const originalPrice = useMemo(() => {
    return selectedServices.reduce((sum, serviceId) => {
      const service = services.find((s) => s.id === serviceId);
      return sum + (service?.price || 0);
    }, 0);
  }, [selectedServices, services]);

  const discountPercentage = useMemo(() => {
    const original = originalPrice;
    const combo = parseFloat(comboPrice) || 0;
    if (original === 0) return 0;
    return Math.round(((original - combo) / original) * 100);
  }, [originalPrice, comboPrice]);

  const openAddModal = () => {
    setEditingOffer(null);
    setOfferName("");
    setOfferDescription("");
    setSelectedServices([]);
    setComboPrice("");
    setModalVisible(true);
  };

  const openEditModal = (offer: ServiceOffer) => {
    setEditingOffer(offer);
    setOfferName(offer.name);
    setOfferDescription(offer.description || "");
    setSelectedServices(offer.serviceIds);
    setComboPrice(offer.comboPrice.toString());
    setModalVisible(true);
  };

  const openMenu = (offer: ServiceOffer) => {
    setMenuOffer(offer);
    setMenuVisible(true);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  const handleSubmit = async () => {
    if (!offerName.trim()) {
      Alert.alert("Error", "Please enter an offer name");
      return;
    }
    if (selectedServices.length === 0) {
      Alert.alert("Error", "Please select at least one service");
      return;
    }
    if (!comboPrice.trim() || isNaN(parseFloat(comboPrice))) {
      Alert.alert("Error", "Please enter a valid combo price");
      return;
    }
    if (parseFloat(comboPrice) >= originalPrice) {
      Alert.alert("Error", "Combo price should be less than original total");
      return;
    }

    setSubmitting(true);
    try {
      const serviceNames = selectedServices
        .map((id) => {
          const service = services.find((s) => s.id === id);
          return service?.name || "";
        })
        .filter((name) => name !== "");

      if (editingOffer) {
        await supabaseService.updateServiceOffer(editingOffer.id, {
          name: offerName.trim(),
          description: offerDescription.trim() || undefined,
          comboPrice: parseFloat(comboPrice),
          originalPrice: originalPrice,
          discountPercentage: discountPercentage,
          serviceIds: selectedServices,
          serviceNames: serviceNames,
          isActive: true,
        });
        Alert.alert("Success", "Offer updated successfully");
      } else {
        await supabaseService.createServiceOffer({
          name: offerName.trim(),
          description: offerDescription.trim() || undefined,
          comboPrice: parseFloat(comboPrice),
          originalPrice: originalPrice,
          discountPercentage: discountPercentage,
          serviceIds: selectedServices,
          serviceNames: serviceNames,
          isActive: true,
        });
        Alert.alert("Success", "Offer created successfully");
      }
      await refreshData();
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save offer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (offer: ServiceOffer) => {
    Alert.alert("Delete Offer", `Delete "${offer.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await supabaseService.deleteServiceOffer(offer.id);
            await refreshData();
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to delete offer");
          }
        },
      },
    ]);
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
        <Text style={s.topBarTitle}>Offers</Text>
        <View style={s.topBarCount}>
          <Text style={s.topBarCountText}>{offers.length}</Text>
        </View>
      </View>

      {/* ── Stats Row ── */}
      <View style={s.statsRow}>
        <View style={s.statPill}>
          <Text style={s.statVal}>{offers.length}</Text>
          <Text style={s.statLabel}>Active Offers</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statPill}>
          <Text style={s.statVal}>
            ₹
            {offers
              .reduce((sum, o) => sum + (o.originalPrice - o.comboPrice), 0)
              .toFixed(0)}
          </Text>
          <Text style={s.statLabel}>Total Savings</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statPill}>
          <Text style={s.statVal}>
            {Math.round(
              offers.reduce((sum, o) => sum + o.discountPercentage, 0) /
                (offers.length || 1),
            )}
            %
          </Text>
          <Text style={s.statLabel}>Avg Discount</Text>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <MaterialCommunityIcons
            name="magnify"
            size={18}
            color={D.textMuted}
            style={{ marginLeft: 12 }}
          />
          <TextInput
            style={s.searchInput}
            placeholder="Search offers…"
            placeholderTextColor={D.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
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
      </View>

      {/* ── List ── */}
      {filteredOffers.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <MaterialCommunityIcons
              name="tag-outline"
              size={32}
              color={D.textMuted}
            />
          </View>
          <Text style={s.emptyTitle}>
            {searchQuery
              ? `No results for "${searchQuery}"`
              : "No special offers yet"}
          </Text>
          <Text style={s.emptyHint}>
            {searchQuery
              ? "Try a different search"
              : 'Tap "Add Offer" below to get started'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionLabel>
            {searchQuery ? `RESULTS (${filteredOffers.length})` : "ALL OFFERS"}
          </SectionLabel>

          {/* Single white card wrapping all rows */}
          <View style={s.listCard}>
            {filteredOffers.map((offer, index) => {
              const isLast = index === filteredOffers.length - 1;
              return (
                <View key={offer.id} style={[s.row, isLast && s.rowLast]}>
                  {/* Icon */}
                  <View style={s.rowIcon}>
                    <MaterialCommunityIcons
                      name="tag"
                      size={18}
                      color={D.green}
                    />
                  </View>

                  {/* Content */}
                  <View style={s.rowBody}>
                    <Text style={s.rowName} numberOfLines={1}>
                      {offer.name}
                    </Text>
                    {offer.description ? (
                      <Text style={s.rowDesc} numberOfLines={1}>
                        {offer.description}
                      </Text>
                    ) : null}
                    <View style={s.servicesRow}>
                      {offer.serviceNames.slice(0, 2).map((name, idx) => (
                        <View key={idx} style={s.serviceChip}>
                          <Text style={s.serviceChipText}>{name}</Text>
                        </View>
                      ))}
                      {offer.serviceNames.length > 2 && (
                        <View style={s.serviceChip}>
                          <Text style={s.serviceChipText}>
                            +{offer.serviceNames.length - 2}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Price Info */}
                  <View style={s.priceInfo}>
                    <Text style={s.originalPrice}>₹{offer.originalPrice}</Text>
                    <View style={s.discountBadge}>
                      <Text style={s.discountText}>
                        {offer.discountPercentage}% OFF
                      </Text>
                    </View>
                    <Text style={s.comboPrice}>₹{offer.comboPrice}</Text>
                  </View>

                  {/* Three-dot */}
                  <TouchableOpacity
                    style={s.dotsBtn}
                    onPress={() => openMenu(offer)}
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
            })}
          </View>
        </ScrollView>
      )}

      {/* ── Bottom Bar ── */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={s.addBtn}
          onPress={openAddModal}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={s.addBtnText}>Add Offer</Text>
        </TouchableOpacity>
      </View>

      {/* ── Three-dot Action Menu ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={s.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={s.menuSheet}>
            <View style={s.menuHandle} />
            <Text style={s.menuItemName} numberOfLines={1}>
              {menuOffer?.name}
            </Text>
            <View style={s.menuDivider} />

            <TouchableOpacity
              style={s.menuOption}
              activeOpacity={0.7}
              onPress={() => {
                setMenuVisible(false);
                if (menuOffer) openEditModal(menuOffer);
              }}
            >
              <View
                style={[s.menuOptionIcon, { backgroundColor: D.greenMuted }]}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={20}
                  color={D.green}
                />
              </View>
              <View style={s.menuOptionText}>
                <Text style={s.menuOptionTitle}>Edit Offer</Text>
                <Text style={s.menuOptionSub}>
                  Update name, services or price
                </Text>
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
                setMenuVisible(false);
                if (menuOffer) handleDelete(menuOffer);
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
                  Delete Offer
                </Text>
                <Text style={s.menuOptionSub}>Remove from offers list</Text>
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

      {/* ── Add / Edit Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={s.sheet}>
            <View style={s.handle} />

            {/* Sheet header */}
            <View style={s.sheetHeader}>
              <View style={s.sheetIconBox}>
                <MaterialCommunityIcons
                  name={editingOffer ? "pencil-outline" : "tag-plus-outline"}
                  size={18}
                  color={D.green}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>
                  {editingOffer ? "Edit Offer" : "Create New Offer"}
                </Text>
                <Text style={s.sheetSub}>
                  {editingOffer
                    ? "Update details below"
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

            <SectionLabel>OFFER DETAILS</SectionLabel>

            {/* Offer Name */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Offer Name *</Text>
              <View style={s.fieldBox}>
                <MaterialCommunityIcons
                  name="tag-outline"
                  size={16}
                  color={D.textMuted}
                  style={s.fieldIcon}
                />
                <TextInput
                  style={s.fieldInput}
                  placeholder="e.g., Summer Glow Package"
                  placeholderTextColor={D.textMuted}
                  value={offerName}
                  onChangeText={setOfferName}
                  autoFocus
                />
              </View>
            </View>

            {/* Description */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>
                Description{" "}
                <Text style={{ color: D.textMuted, fontWeight: "500" }}>
                  (optional)
                </Text>
              </Text>
              <View style={[s.fieldBox, { alignItems: "flex-start" }]}>
                <MaterialCommunityIcons
                  name="text-box-outline"
                  size={16}
                  color={D.textMuted}
                  style={[s.fieldIcon, { marginTop: 13 }]}
                />
                <TextInput
                  style={[
                    s.fieldInput,
                    { minHeight: 72, textAlignVertical: "top", paddingTop: 12 },
                  ]}
                  placeholder="Describe what's included…"
                  placeholderTextColor={D.textMuted}
                  value={offerDescription}
                  onChangeText={setOfferDescription}
                  multiline
                />
              </View>
            </View>

            <SectionLabel>SELECT SERVICES</SectionLabel>

            {/* Services Selection */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.servicesScroll}
            >
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    s.serviceToggle,
                    selectedServices.includes(service.id) &&
                      s.serviceToggleActive,
                  ]}
                  onPress={() => toggleService(service.id)}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons
                    name={
                      selectedServices.includes(service.id)
                        ? "check-circle"
                        : "circle-outline"
                    }
                    size={16}
                    color={
                      selectedServices.includes(service.id)
                        ? D.green
                        : D.textMuted
                    }
                  />
                  <Text
                    style={[
                      s.serviceToggleText,
                      selectedServices.includes(service.id) &&
                        s.serviceToggleTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {service.name}
                  </Text>
                  <Text
                    style={[
                      s.serviceTogglePrice,
                      selectedServices.includes(service.id) &&
                        s.serviceTogglePriceActive,
                    ]}
                  >
                    ₹{service.price}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedServices.length > 0 && (
              <View style={s.summaryBox}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={14}
                  color={D.green}
                />
                <Text style={s.summaryText}>
                  Selected: {selectedServices.length} service
                  {selectedServices.length > 1 ? "s" : ""}
                </Text>
                <Text style={s.summaryTotal}>Total: ₹{originalPrice}</Text>
              </View>
            )}

            <SectionLabel>PRICING</SectionLabel>

            {/* Combo Price */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Combo Price (₹) *</Text>
              <View style={s.fieldBox}>
                <MaterialCommunityIcons
                  name="currency-inr"
                  size={16}
                  color={D.textMuted}
                  style={s.fieldIcon}
                />
                <TextInput
                  style={s.fieldInput}
                  placeholder="Enter discounted price"
                  placeholderTextColor={D.textMuted}
                  value={comboPrice}
                  onChangeText={setComboPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Price Preview */}
            {originalPrice > 0 && parseFloat(comboPrice) > 0 && (
              <View style={s.previewBox}>
                <View style={s.previewRow}>
                  <Text style={s.previewLabel}>Original Total</Text>
                  <Text style={s.previewOriginal}>₹{originalPrice}</Text>
                </View>
                <View style={s.previewRow}>
                  <Text style={s.previewLabel}>You Save</Text>
                  <Text style={s.previewSave}>
                    ₹{originalPrice - parseFloat(comboPrice)} (
                    {discountPercentage}%)
                  </Text>
                </View>
                <View style={s.previewDivider} />
                <View style={s.previewRow}>
                  <Text style={s.previewLabel}>Combo Price</Text>
                  <Text style={s.previewCombo}>₹{comboPrice}</Text>
                </View>
              </View>
            )}

            {/* Buttons */}
            <View style={s.sheetBtnRow}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.saveBtn,
                  (selectedServices.length === 0 || !comboPrice.trim()) && {
                    opacity: 0.5,
                  },
                ]}
                onPress={handleSubmit}
                disabled={
                  selectedServices.length === 0 ||
                  !comboPrice.trim() ||
                  submitting
                }
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name={editingOffer ? "check" : "plus"}
                      size={16}
                      color="#fff"
                    />
                    <Text style={s.saveBtnText}>
                      {editingOffer ? "Save Changes" : "Create Offer"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  topBarCount: {
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  topBarCountText: { fontSize: 12, fontWeight: "700", color: D.green },

  // Stats row
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

  // Search
  searchWrap: {
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.lg,
    borderWidth: 1,
    borderColor: D.border,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 11,
    fontSize: 14,
    color: D.text,
  },

  // Scroll + list
  scroll: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 110 },

  // Single white card
  listCard: {
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    borderWidth: 1,
    borderColor: D.border,
  },

  // Flat rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F4",
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: D.greenMuted,
    borderWidth: 1,
    borderColor: D.greenBorder,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: "700", color: D.text },
  rowDesc: { fontSize: 12, color: D.textMuted, marginTop: 2 },
  servicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  serviceChip: {
    backgroundColor: D.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: D.radius.pill,
  },
  serviceChipText: {
    fontSize: 9,
    fontWeight: "600",
    color: D.textSub,
  },
  priceInfo: {
    alignItems: "flex-end",
    gap: 3,
    flexShrink: 0,
  },
  originalPrice: {
    fontSize: 10,
    color: D.textMuted,
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: D.greenMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: D.radius.pill,
  },
  discountText: {
    fontSize: 9,
    fontWeight: "700",
    color: D.green,
  },
  comboPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: D.green,
  },
  dotsBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
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

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: D.surface,
    borderTopWidth: 1,
    borderTopColor: D.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.select({ ios: 32, android: 14, default: 14 }),
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: D.green,
    borderRadius: D.radius.pill,
    paddingVertical: 14,
  },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Three-dot menu
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

  // Add/Edit sheet
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
    paddingBottom: Platform.select({ ios: 36, android: 24, default: 24 }),
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

  // Form fields
  fieldGroup: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: D.text,
    marginBottom: 6,
  },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.md,
    borderWidth: 1.5,
    borderColor: D.border,
    overflow: "hidden",
  },
  fieldIcon: { marginLeft: 12 },
  fieldInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
    color: D.text,
    fontWeight: "500",
  },

  // Services scroll
  servicesScroll: {
    maxHeight: 100,
    marginBottom: 12,
  },
  serviceToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    borderColor: D.border,
  },
  serviceToggleActive: {
    backgroundColor: D.greenMuted,
    borderColor: D.green,
  },
  serviceToggleText: {
    fontSize: 11,
    fontWeight: "600",
    color: D.text,
    maxWidth: 100,
  },
  serviceToggleTextActive: {
    color: D.green,
  },
  serviceTogglePrice: {
    fontSize: 10,
    fontWeight: "700",
    color: D.textMuted,
  },
  serviceTogglePriceActive: {
    color: D.green,
  },

  // Summary box
  summaryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  summaryText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: D.green,
  },
  summaryTotal: {
    fontSize: 11,
    fontWeight: "800",
    color: D.green,
  },

  // Price preview
  previewBox: {
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius.lg,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: D.textSub,
  },
  previewOriginal: {
    fontSize: 12,
    fontWeight: "600",
    color: D.textMuted,
    textDecorationLine: "line-through",
  },
  previewSave: {
    fontSize: 13,
    fontWeight: "800",
    color: D.green,
  },
  previewDivider: {
    height: 1,
    backgroundColor: D.border,
  },
  previewCombo: {
    fontSize: 15,
    fontWeight: "800",
    color: D.green,
  },

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
});
