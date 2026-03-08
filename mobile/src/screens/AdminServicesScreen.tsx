import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import type { Service } from '../types';
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

  amber: '#D4872A',
  amberMuted: '#D4872A15',
  amberBorder: '#D4872A33',

  shadow: 'rgba(0,0,0,0.06)',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
};

interface Props { navigation: any; }

export const AdminServicesScreen: React.FC<Props> = ({ navigation }) => {
  const { services, refreshData } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  }, [services, searchQuery]);

  const openAddModal = () => {
    setEditingService(null);
    setServiceName('');
    setServicePrice('');
    setServiceDescription('');
    setModalVisible(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setServiceName(service.name);
    setServicePrice(service.price.toString());
    setServiceDescription(service.description || '');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!serviceName.trim()) {
      Alert.alert('Error', 'Please enter a service name');
      return;
    }
    if (!servicePrice.trim() || isNaN(parseFloat(servicePrice))) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setSubmitting(true);
    try {
      if (editingService) {
        // Update existing service
        await supabaseService.updateService(editingService.id, {
          name: serviceName.trim(),
          price: parseFloat(servicePrice),
          description: serviceDescription.trim() || undefined,
        });
        Alert.alert('Success', 'Service updated successfully');
      } else {
        // Create new service
        await supabaseService.createService({
          name: serviceName.trim(),
          price: parseFloat(servicePrice),
          description: serviceDescription.trim() || undefined,
        });
        Alert.alert('Success', 'Service added successfully');
      }
      await refreshData();
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (service: Service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseService.deleteService(service.id);
              await refreshData();
              Alert.alert('Success', 'Service deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete service');
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
          <MaterialCommunityIcons name="spa" size={22} color={D.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Services</Text>
          <Text style={s.headerSub}>{services.length} services offered</Text>
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
            placeholder="Search services…"
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

      {/* Services List */}
      {filteredServices.length === 0 ? (
        <View style={s.emptyBlock}>
          <View style={s.emptyIconBox}>
            <MaterialCommunityIcons name="spa" size={36} color={D.textMuted} />
          </View>
          <Text style={s.emptyTitle}>
            {searchQuery ? `No results for "${searchQuery}"` : 'No services yet'}
          </Text>
          <Text style={s.emptyHint}>
            {searchQuery ? 'Try a different search term' : 'Add your first service using the + button'}
          </Text>
        </View>
      ) : (
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          {filteredServices.map((service) => (
            <View key={service.id} style={s.card}>
              <View style={s.cardStripe} />
              <View style={s.cardInner}>
                <View style={s.cardTop}>
                  <View style={[s.cardIconBox, { backgroundColor: D.greenMuted, borderColor: D.greenBorder }]}>
                    <MaterialCommunityIcons name="spa" size={22} color={D.green} />
                  </View>
                  <View style={s.cardMainInfo}>
                    <Text style={s.cardName} numberOfLines={1}>{service.name}</Text>
                    {service.description && (
                      <Text style={s.cardDesc} numberOfLines={2}>{service.description}</Text>
                    )}
                  </View>
                  <View style={s.cardPriceBox}>
                    <Text style={s.cardPrice}>₹{service.price}</Text>
                  </View>
                </View>
                <View style={s.cardActions}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnBlue]}
                    onPress={() => openEditModal(service)}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={15} color={D.blue} />
                    <Text style={[s.actionBtnText, { color: D.blue }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnRed]}
                    onPress={() => handleDelete(service)}
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
              <View style={[s.modalIconBox, { backgroundColor: D.greenMuted, borderColor: D.greenBorder }]}>
                <MaterialCommunityIcons name="spa" size={24} color={D.green} />
              </View>
              <Text style={s.modalTitle}>{editingService ? 'Edit Service' : 'Add New Service'}</Text>
              <TouchableOpacity style={s.modalClose} onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color={D.textSub} />
              </TouchableOpacity>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Service Name *</Text>
              <View style={s.inputWrap}>
                <MaterialCommunityIcons name="text-box-outline" size={18} color={D.textMuted} />
                <TextInput
                  style={s.input}
                  placeholder="e.g., Haircut, Facial Treatment…"
                  placeholderTextColor={D.textMuted}
                  value={serviceName}
                  onChangeText={setServiceName}
                  autoFocus
                />
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Price (₹) *</Text>
              <View style={s.inputWrap}>
                <MaterialCommunityIcons name="currency-inr" size={18} color={D.textMuted} />
                <TextInput
                  style={s.input}
                  placeholder="e.g., 500"
                  placeholderTextColor={D.textMuted}
                  value={servicePrice}
                  onChangeText={setServicePrice}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Description (optional)</Text>
              <View style={[s.inputWrap, s.textareaWrap]}>
                <MaterialCommunityIcons name="note-text-outline" size={18} color={D.textMuted} />
                <TextInput
                  style={[s.input, s.textarea]}
                  placeholder="Brief description of the service…"
                  placeholderTextColor={D.textMuted}
                  value={serviceDescription}
                  onChangeText={setServiceDescription}
                  multiline
                  textAlignVertical="top"
                />
              </View>
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
                style={[s.modalBtn, s.modalBtnSave, (!serviceName.trim() || !servicePrice.trim()) && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={!serviceName.trim() || !servicePrice.trim()}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={18} color="#FFF" />
                    <Text style={s.modalBtnText}>{editingService ? 'Update' : 'Add'} Service</Text>
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
    backgroundColor: D.greenMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.greenBorder,
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
  cardStripe: { width: 4, backgroundColor: D.green },
  cardInner: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  cardIconBox: {
    width: 42, height: 42, borderRadius: D.radius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  cardMainInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: D.textSub, lineHeight: 18 },
  cardPriceBox: { alignItems: 'flex-end' },
  cardPrice: { fontSize: 18, fontWeight: '800', color: D.green, letterSpacing: -0.5 },
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
    backgroundColor: D.green, alignItems: 'center', justifyContent: 'center',
    shadowColor: D.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    backgroundColor: D.surface, borderRadius: D.radius.xl,
    padding: 24, width: '100%', maxWidth: 420,
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
  textareaWrap: { alignItems: 'flex-start' },
  textarea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },

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
    flex: 2, backgroundColor: D.green, borderColor: D.greenBorder,
    shadowColor: D.green, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  modalBtnText: { fontSize: 15, fontWeight: '800', color: D.text },
});
