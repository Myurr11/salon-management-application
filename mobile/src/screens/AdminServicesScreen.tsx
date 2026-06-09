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
import type { Service } from "../types";
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

  amber: "#B8742A",
  amberMuted: "rgba(184,116,42,0.10)",
  amberBorder: "rgba(184,116,42,0.25)",

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

export const AdminServicesScreen: React.FC<Props> = ({ navigation }) => {
  const { services, refreshData } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuService, setMenuService] = useState<Service | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q),
    );
  }, [services, searchQuery]);

  const openAddModal = () => {
    setEditingService(null);
    setServiceName("");
    setServicePrice("");
    setServiceDescription("");
    setModalVisible(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setServiceName(service.name);
    setServicePrice(service.price.toString());
    setServiceDescription(service.description || "");
    setModalVisible(true);
  };

  const openMenu = (service: Service) => {
    setMenuService(service);
    setMenuVisible(true);
  };

  const handleSubmit = async () => {
    if (!serviceName.trim()) {
      Alert.alert("Error", "Please enter a service name");
      return;
    }
    if (!servicePrice.trim() || isNaN(parseFloat(servicePrice))) {
      Alert.alert("Error", "Please enter a valid price");
      return;
    }
    setSubmitting(true);
    try {
      if (editingService) {
        await supabaseService.updateService(editingService.id, {
          name: serviceName.trim(),
          price: parseFloat(servicePrice),
          description: serviceDescription.trim() || undefined,
        });
      } else {
        await supabaseService.createService({
          name: serviceName.trim(),
          price: parseFloat(servicePrice),
          description: serviceDescription.trim() || undefined,
        });
      }
      await refreshData();
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save service");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (service: Service) => {
    Alert.alert("Delete Service", `Delete "${service.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await supabaseService.deleteService(service.id);
            await refreshData();
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to delete service");
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
        <Text style={s.topBarTitle}>Services</Text>
        <View style={s.topBarCount}>
          <Text style={s.topBarCountText}>{services.length}</Text>
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
            placeholder="Search services…"
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
      {filteredServices.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <MaterialCommunityIcons name="spa" size={32} color={D.textMuted} />
          </View>
          <Text style={s.emptyTitle}>
            {searchQuery
              ? `No results for "${searchQuery}"`
              : "No services yet"}
          </Text>
          <Text style={s.emptyHint}>
            {searchQuery
              ? "Try a different search"
              : 'Tap "Add Service" below to get started'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionLabel>ALL SERVICES</SectionLabel>

          {/* Single white card wrapping all rows */}
          <View style={s.listCard}>
            {filteredServices.map((service, index) => {
              const isLast = index === filteredServices.length - 1;
              return (
                <View key={service.id} style={[s.row, isLast && s.rowLast]}>
                  {/* Icon */}
                  <View style={s.rowIcon}>
                    <MaterialCommunityIcons
                      name="spa"
                      size={18}
                      color={D.green}
                    />
                  </View>

                  {/* Content */}
                  <View style={s.rowBody}>
                    <Text style={s.rowName} numberOfLines={1}>
                      {service.name}
                    </Text>
                    {service.description ? (
                      <Text style={s.rowDesc} numberOfLines={1}>
                        {service.description}
                      </Text>
                    ) : null}
                  </View>

                  {/* Price */}
                  <Text style={s.rowPrice}>₹{service.price}</Text>

                  {/* Three-dot */}
                  <TouchableOpacity
                    style={s.dotsBtn}
                    onPress={() => openMenu(service)}
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
          <Text style={s.addBtnText}>Add Service</Text>
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
              {menuService?.name}
            </Text>
            <View style={s.menuDivider} />

            <TouchableOpacity
              style={s.menuOption}
              activeOpacity={0.7}
              onPress={() => {
                setMenuVisible(false);
                if (menuService) openEditModal(menuService);
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
                <Text style={s.menuOptionTitle}>Edit Service</Text>
                <Text style={s.menuOptionSub}>
                  Update name, price or description
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
                if (menuService) handleDelete(menuService);
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
                  Delete Service
                </Text>
                <Text style={s.menuOptionSub}>Remove from service list</Text>
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
                  name={
                    editingService ? "pencil-outline" : "plus-circle-outline"
                  }
                  size={18}
                  color={D.green}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>
                  {editingService ? "Edit Service" : "Add New Service"}
                </Text>
                <Text style={s.sheetSub}>
                  {editingService
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

            <SectionLabel>SERVICE DETAILS</SectionLabel>

            {/* Name */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Service Name</Text>
              <View style={s.fieldBox}>
                <MaterialCommunityIcons
                  name="spa"
                  size={16}
                  color={D.textMuted}
                  style={s.fieldIcon}
                />
                <TextInput
                  style={s.fieldInput}
                  placeholder="e.g. Haircut, Facial…"
                  placeholderTextColor={D.textMuted}
                  value={serviceName}
                  onChangeText={setServiceName}
                  autoFocus
                />
              </View>
            </View>

            {/* Price */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Price (₹)</Text>
              <View style={s.fieldBox}>
                <MaterialCommunityIcons
                  name="currency-inr"
                  size={16}
                  color={D.textMuted}
                  style={s.fieldIcon}
                />
                <TextInput
                  style={s.fieldInput}
                  placeholder="e.g. 500"
                  placeholderTextColor={D.textMuted}
                  value={servicePrice}
                  onChangeText={setServicePrice}
                  keyboardType="numeric"
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
                  name="note-text-outline"
                  size={16}
                  color={D.textMuted}
                  style={[s.fieldIcon, { marginTop: 13 }]}
                />
                <TextInput
                  style={[
                    s.fieldInput,
                    { minHeight: 72, textAlignVertical: "top", paddingTop: 12 },
                  ]}
                  placeholder="Brief description…"
                  placeholderTextColor={D.textMuted}
                  value={serviceDescription}
                  onChangeText={setServiceDescription}
                  multiline
                />
              </View>
            </View>

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
                  (!serviceName.trim() || !servicePrice.trim()) && {
                    opacity: 0.5,
                  },
                ]}
                onPress={handleSubmit}
                disabled={
                  !serviceName.trim() || !servicePrice.trim() || submitting
                }
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name={editingService ? "check" : "plus"}
                      size={16}
                      color="#fff"
                    />
                    <Text style={s.saveBtnText}>
                      {editingService ? "Save Changes" : "Add Service"}
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
  rowPrice: { fontSize: 14, fontWeight: "800", color: D.green, flexShrink: 0 },
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
