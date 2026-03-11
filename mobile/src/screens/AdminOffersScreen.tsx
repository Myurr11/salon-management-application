import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import type { ServiceOffer, Service } from '../types';
import * as supabaseService from '../services/supabaseService';

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

  red: '#D94F4F',
  redMuted: '#D94F4F15',
  redBorder: '#D94F4F33',

  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

interface Props { navigation: any; }

export const AdminOffersScreen: React.FC<Props> = ({ navigation }) => {
  const { services, offers, refreshData } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOffer, setEditingOffer] = useState<ServiceOffer | null>(null);
  const [offerName, setOfferName] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [comboPrice, setComboPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredOffers = useMemo(() => {
    if (!searchQuery.trim()) return offers;
    const q = searchQuery.toLowerCase();
    return offers.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.description?.toLowerCase().includes(q)
    );
  }, [offers, searchQuery]);

  const originalPrice = useMemo(() => {
    return selectedServices.reduce((sum, serviceId) => {
      const service = services.find(s => s.id === serviceId);
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
    setOfferName('');
    setOfferDescription('');
    setSelectedServices([]);
    setComboPrice('');
    setModalVisible(true);
  };

  const openEditModal = (offer: ServiceOffer) => {
    setEditingOffer(offer);
    setOfferName(offer.name);
    setOfferDescription(offer.description || '');
    setSelectedServices(offer.serviceIds);
    setComboPrice(offer.comboPrice.toString());
    setModalVisible(true);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async () => {
    if (!offerName.trim()) {
      Alert.alert('Error', 'Please enter an offer name');
      return;
    }
    if (selectedServices.length === 0) {
      Alert.alert('Error', 'Please select at least one service');
      return;
    }
    if (!comboPrice.trim() || isNaN(parseFloat(comboPrice))) {
      Alert.alert('Error', 'Please enter a valid combo price');
      return;
    }
    if (parseFloat(comboPrice) >= originalPrice) {
      Alert.alert('Error', 'Combo price should be less than original total');
      return;
    }

    setSubmitting(true);
    try {
      const serviceNames = selectedServices.map(id => {
        const service = services.find(s => s.id === id);
        return service?.name || '';
      }).filter(name => name !== '');

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
        Alert.alert('Success', 'Offer updated successfully');
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
        Alert.alert('Success', 'Offer created successfully');
      }
      await refreshData();
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (offer: ServiceOffer) => {
    Alert.alert(
      'Delete Offer',
      `Are you sure you want to delete "${offer.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseService.deleteServiceOffer(offer.id);
              await refreshData();
              Alert.alert('Success', 'Offer deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete offer');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={D.text} />
        </TouchableOpacity>
        <View style={s.headerIconBox}>
          <MaterialCommunityIcons name="percent" size={22} color={D.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Special Offers</Text>
          <Text style={s.headerSub}>{offers.length} active offers</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <View style={s.searchIcon}>
            <MaterialCommunityIcons name="magnify" size={18} color={D.textMuted} />
          </View>
          <TextInput
            style={s.searchInput}
            placeholder="Search offers…"
            placeholderTextColor={D.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={s.searchClear} onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color={D.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Offers List */}
      {filteredOffers.length === 0 ? (
        <View style={s.emptyBlock}>
          <View style={s.emptyIconBox}>
            <MaterialCommunityIcons name="tag-off-outline" size={36} color={D.textMuted} />
          </View>
          <Text style={s.emptyTitle}>
            {searchQuery ? `No results for "${searchQuery}"` : 'No special offers yet'}
          </Text>
          <Text style={s.emptyHint}>
            {searchQuery ? 'Try a different search term' : 'Create your first offer using the + button'}
          </Text>
        </View>
      ) : (
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          {filteredOffers.map((offer) => (
            <View key={offer.id} style={s.card}>
              <View style={s.cardStripe} />
              <View style={s.cardInner}>
                <View style={s.cardTop}>
                  <View style={[s.cardIconBox, { backgroundColor: D.goldMuted, borderColor: D.goldBorder }]}>
                    <MaterialCommunityIcons name="percent" size={20} color={D.gold} />
                  </View>
                  <View style={s.cardMainInfo}>
                    <Text style={s.cardName} numberOfLines={1}>{offer.name}</Text>
                    {offer.description && (
                      <Text style={s.cardDesc} numberOfLines={2}>{offer.description}</Text>
                    )}
                    <View style={s.servicesRow}>
                      {offer.serviceNames.slice(0, 3).map((name, idx) => (
                        <View key={idx} style={s.serviceChip}>
                          <Text style={s.serviceChipText}>{name}</Text>
                        </View>
                      ))}
                      {offer.serviceNames.length > 3 && (
                        <View style={s.serviceChip}>
                          <Text style={s.serviceChipText}>+{offer.serviceNames.length - 3} more</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={s.pricingRow}>
                  <View style={s.priceBlock}>
                    <Text style={s.originalPrice}>₹{offer.originalPrice}</Text>
                    <Text style={s.originalPriceLabel}>Original</Text>
                  </View>
                  <View style={s.discountBadge}>
                    <Text style={s.discountText}>{offer.discountPercentage}% OFF</Text>
                  </View>
                  <View style={s.priceBlock}>
                    <Text style={s.comboPrice}>₹{offer.comboPrice}</Text>
                    <Text style={s.comboPriceLabel}>Combo Price</Text>
                  </View>
                </View>
                <View style={s.cardActions}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnBlue]}
                    onPress={() => openEditModal(offer)}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={15} color={D.blue} />
                    <Text style={[s.actionBtnText, { color: D.blue }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnRed]}
                    onPress={() => handleDelete(offer)}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons name="delete-outline" size={15} color={D.red} />
                    <Text style={[s.actionBtnText, { color: D.red }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Button */}
      <TouchableOpacity style={s.fab} onPress={openAddModal} activeOpacity={0.8}>
        <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <View style={[s.modalIconBox, { backgroundColor: D.goldMuted, borderColor: D.goldBorder }]}>
                <MaterialCommunityIcons name="percent" size={24} color={D.gold} />
              </View>
              <Text style={s.modalTitle}>{editingOffer ? 'Edit Offer' : 'Create New Offer'}</Text>
              <TouchableOpacity style={s.modalClose} onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color={D.textSub} />
              </TouchableOpacity>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Offer Name *</Text>
              <View style={s.inputWrap}>
                <MaterialCommunityIcons name="label-outline" size={18} color={D.textMuted} />
                <TextInput
                  style={s.input}
                  placeholder="e.g., Diwali Glow Package"
                  placeholderTextColor={D.textMuted}
                  value={offerName}
                  onChangeText={setOfferName}
                  autoFocus
                />
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Description (optional)</Text>
              <View style={s.inputWrap}>
                <MaterialCommunityIcons name="text-box-outline" size={18} color={D.textMuted} />
                <TextInput
                  style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="Describe what's included…"
                  placeholderTextColor={D.textMuted}
                  value={offerDescription}
                  onChangeText={setOfferDescription}
                  multiline
                />
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Select Services in Combo *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.servicesScroll}>
                {services.map(service => (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      s.serviceToggle,
                      selectedServices.includes(service.id) && {
                        backgroundColor: D.greenMuted,
                        borderColor: D.green,
                      },
                    ]}
                    onPress={() => toggleService(service.id)}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons
                      name={selectedServices.includes(service.id) ? 'check-circle' : 'circle-outline'}
                      size={18}
                      color={selectedServices.includes(service.id) ? D.green : D.textMuted}
                    />
                    <Text style={[
                      s.serviceToggleText,
                      selectedServices.includes(service.id) && { color: D.green },
                    ]} numberOfLines={1}>
                      {service.name}
                    </Text>
                    <Text style={[
                      s.serviceTogglePrice,
                      selectedServices.includes(service.id) && { color: D.green },
                    ]}>₹{service.price}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {selectedServices.length > 0 && (
                <View style={s.selectedServicesSummary}>
                  <Text style={s.summaryLabel}>Selected: {selectedServices.length} services</Text>
                  <Text style={s.summaryTotal}>Total: ₹{originalPrice}</Text>
                </View>
              )}
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Combo Price *</Text>
              <View style={s.inputWrap}>
                <MaterialCommunityIcons name="currency-inr" size={18} color={D.textMuted} />
                <TextInput
                  style={s.input}
                  placeholder="Enter discounted price"
                  placeholderTextColor={D.textMuted}
                  value={comboPrice}
                  onChangeText={setComboPrice}
                  keyboardType="numeric"
                />
              </View>
              {originalPrice > 0 && (
                <View style={s.priceComparison}>
                  <View style={s.compareItem}>
                    <Text style={s.compareLabel}>Original Total</Text>
                    <Text style={s.compareValue}>₹{originalPrice}</Text>
                  </View>
                  <View style={[s.compareItem, { backgroundColor: D.greenMuted, borderRadius: D.radius.md, padding: 10 }]}>
                    <Text style={[s.compareLabel, { color: D.green }]}>You Save</Text>
                    <Text style={[s.compareValue, { color: D.green }]}>₹{originalPrice - (parseFloat(comboPrice) || 0)} ({discountPercentage}%)</Text>
                  </View>
                  <View style={s.compareItem}>
                    <Text style={s.compareLabel}>Combo Price</Text>
                    <Text style={[s.compareValue, { color: D.gold }]}>₹{comboPrice || '0'}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={s.modalButtons}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnCancel]}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.75}
              >
                <Text style={s.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnSave, (selectedServices.length === 0 || !comboPrice.trim()) && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={selectedServices.length === 0 || !comboPrice.trim()}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={18} color="#FFF" />
                    <Text style={s.modalBtnText}>{editingOffer ? 'Update' : 'Create'} Offer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: D.surface, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: D.border,
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: D.text, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: D.textMuted, marginTop: 1 },

  // Search
  searchWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.border, overflow: 'hidden',
  },
  searchIcon: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: D.border },
  searchInput: { flex: 1, paddingHorizontal: 12, fontSize: 14, color: D.text },
  searchClear: { paddingHorizontal: 10 },

  // List
  list: { flex: 1, paddingHorizontal: 20, paddingBottom: 100 },
  emptyBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: D.radius.xl,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: D.text, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: D.textMuted, textAlign: 'center' },

  // Card
  card: {
    flexDirection: 'row', backgroundColor: D.surface, borderRadius: D.radius.xl,
    borderWidth: 1, borderColor: D.border, marginBottom: 10, overflow: 'hidden',
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  cardStripe: { width: 4, backgroundColor: D.gold },
  cardInner: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardIconBox: {
    width: 44, height: 44, borderRadius: D.radius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  cardMainInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: D.textSub, marginBottom: 6, lineHeight: 16 },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  serviceChip: {
    backgroundColor: D.bg, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: D.radius.sm, borderWidth: 1, borderColor: D.border,
  },
  serviceChipText: { fontSize: 10, color: D.textSub, fontWeight: '600' },
  pricingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  priceBlock: { alignItems: 'center', flex: 1 },
  originalPrice: { fontSize: 14, fontWeight: '700', color: D.textMuted, textDecorationLine: 'line-through' },
  originalPriceLabel: { fontSize: 9, color: D.textMuted, marginTop: 2 },
  discountBadge: {
    backgroundColor: D.greenMuted, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: D.radius.sm, borderWidth: 1, borderColor: D.greenBorder,
  },
  discountText: { fontSize: 11, fontWeight: '800', color: D.green },
  comboPrice: { fontSize: 18, fontWeight: '900', color: D.gold },
  comboPriceLabel: { fontSize: 9, color: D.textMuted, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: D.radius.md, borderWidth: 1,
  },
  actionBtnBlue: { backgroundColor: D.blueMuted, borderColor: D.blueBorder },
  actionBtnRed: { backgroundColor: D.redMuted, borderColor: D.redBorder },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: D.gold, alignItems: 'center', justifyContent: 'center',
    shadowColor: D.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    padding: 24, width: '100%', maxWidth: 500,
    borderWidth: 1, borderColor: D.border,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20,
  },
  modalIconBox: {
    width: 44, height: 44, borderRadius: D.radius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: D.text, letterSpacing: -0.3 },
  modalClose: {
    width: 36, height: 36, borderRadius: D.radius.sm,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.border,
  },

  // Form
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 12, fontWeight: '700', color: D.text, marginBottom: 8, letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.bg, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.border, overflow: 'hidden',
  },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: D.text },

  // Services selection
  servicesScroll: { maxHeight: 100 },
  serviceToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 8,
    backgroundColor: D.bg, borderRadius: D.radius.md,
    borderWidth: 1, borderColor: D.border,
  },
  serviceToggleText: { fontSize: 12, color: D.text, fontWeight: '600', maxWidth: 100 },
  serviceTogglePrice: { fontSize: 11, color: D.textMuted, fontWeight: '700' },
  selectedServicesSummary: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: D.greenMuted, borderRadius: D.radius.md,
  },
  summaryLabel: { fontSize: 11, color: D.green, fontWeight: '600' },
  summaryTotal: { fontSize: 11, color: D.green, fontWeight: '800' },

  // Price comparison
  priceComparison: {
    flexDirection: 'row', gap: 8, marginTop: 8,
  },
  compareItem: {
    flex: 1, backgroundColor: D.bg,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: D.radius.md, alignItems: 'center',
  },
  compareLabel: { fontSize: 10, color: D.textMuted, fontWeight: '600', marginBottom: 4 },
  compareValue: { fontSize: 13, fontWeight: '800', color: D.text },

  // Modal buttons
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: D.radius.lg, borderWidth: 1,
  },
  modalBtnCancel: {
    flex: 1, backgroundColor: D.bg, borderColor: D.border,
  },
  modalBtnSave: {
    flex: 2, backgroundColor: D.gold, borderColor: D.goldBorder,
    shadowColor: D.gold, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  modalBtnText: { fontSize: 15, fontWeight: '800', color: D.text },
});
