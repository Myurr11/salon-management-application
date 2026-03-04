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

interface Props {
  navigation: any;
}

type InventoryTab = 'retail' | 'consumable';

export const AdminInventoryScreen: React.FC<Props> = ({ navigation }) => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, refreshData } = useData();
  const [activeTab, setActiveTab] = useState<InventoryTab>('retail');
  const [modalVisible, setModalVisible] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    minThreshold: '',
    price: '',
    costPrice: '',
    itemType: 'retail' as InventoryItemType,
    supplier: '',
    sku: '',
    unit: 'units',
  });
  const [purchaseData, setPurchaseData] = useState({
    quantity: '',
    unitCost: '',
    supplier: '',
    invoiceNumber: '',
    notes: '',
  });

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => (item.itemType || 'retail') === activeTab);
  }, [inventory, activeTab]);

  const analytics = useMemo(() => {
    const retailItems = inventory.filter(i => (i.itemType || 'retail') === 'retail');
    const consumableItems = inventory.filter(i => (i.itemType || 'retail') === 'consumable');
    
    const totalRetailValue = retailItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const totalRetailCost = retailItems.reduce((sum, item) => sum + (item.quantity * (item.costPrice || 0)), 0);
    const totalConsumableValue = consumableItems.reduce((sum, item) => sum + (item.quantity * (item.costPrice || 0)), 0);
    
    return {
      retailCount: retailItems.length,
      consumableCount: consumableItems.length,
      retailStockValue: totalRetailValue,
      retailProfitPotential: totalRetailValue - totalRetailCost,
      consumableStockValue: totalConsumableValue,
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
      name: item.name,
      quantity: String(item.quantity),
      minThreshold: String(item.minThreshold),
      price: String(item.price),
      costPrice: item.costPrice != null ? String(item.costPrice) : '',
      itemType: item.itemType || 'retail',
      supplier: item.supplier || '',
      sku: item.sku || '',
      unit: item.unit || 'units',
    });
    setModalVisible(true);
  };

  const openPurchaseModal = (item: InventoryItem) => {
    setSelectedItemForPurchase(item);
    setPurchaseData({ quantity: '', unitCost: item.costPrice ? String(item.costPrice) : '', supplier: '', invoiceNumber: '', notes: '' });
    setPurchaseModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter item name.');
      return;
    }
    const quantity = parseInt(formData.quantity, 10);
    const minThreshold = parseInt(formData.minThreshold, 10);
    const price = parseFloat(formData.price);
    const costPrice = formData.costPrice.trim() ? parseFloat(formData.costPrice) : undefined;

    if (isNaN(quantity) || quantity < 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }
    if (isNaN(minThreshold) || minThreshold < 0) {
      Alert.alert('Error', 'Please enter a valid minimum threshold.');
      return;
    }
    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'Please enter a valid selling price.');
      return;
    }
    if (costPrice !== undefined && (isNaN(costPrice) || costPrice < 0)) {
      Alert.alert('Error', 'Please enter a valid cost price.');
      return;
    }

    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, {
          name: formData.name.trim(),
          quantity,
          minThreshold,
          price,
          costPrice: costPrice ?? undefined,
          itemType: formData.itemType,
          supplier: formData.supplier.trim() || undefined,
          sku: formData.sku.trim() || undefined,
          unit: formData.unit.trim() || 'units',
        });
        Alert.alert('Success', 'Item updated successfully.');
      } else {
        await addInventoryItem({
          name: formData.name.trim(),
          quantity,
          minThreshold,
          price,
          costPrice: costPrice ?? undefined,
          itemType: formData.itemType,
          supplier: formData.supplier.trim() || undefined,
          sku: formData.sku.trim() || undefined,
          unit: formData.unit.trim() || 'units',
        });
        Alert.alert('Success', 'Item added successfully.');
      }
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save item. Please try again.');
    }
  };

  const handlePurchase = async () => {
    if (!selectedItemForPurchase) return;
    
    const quantity = parseInt(purchaseData.quantity, 10);
    const unitCost = parseFloat(purchaseData.unitCost);
    
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }
    if (isNaN(unitCost) || unitCost < 0) {
      Alert.alert('Error', 'Please enter a valid unit cost.');
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
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: purchaseData.notes.trim() || undefined,
      });
      
      await refreshData();
      Alert.alert('Success', 'Stock purchase recorded successfully.');
      setPurchaseModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record purchase. Please try again.');
    }
  };

  const handleDelete = (item: InventoryItem) => {
    Alert.alert('Delete Item', `Are you sure you want to delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteInventoryItem(item.id);
            Alert.alert('Success', 'Item deleted successfully.');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete item. Please try again.');
          }
        },
      },
    ]);
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return { text: 'Out of Stock', color: colors.error };
    if (item.quantity <= item.minThreshold) return { text: 'Low Stock', color: colors.warning };
    return { text: 'In Stock', color: colors.success };
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const status = getStockStatus(item);
    const stockPercentage = Math.min((item.quantity / (item.minThreshold * 3)) * 100, 100);
    const isRetail = (item.itemType || 'retail') === 'retail';
    const profit = item.costPrice ? item.price - item.costPrice : 0;
    const margin = item.costPrice ? ((profit / item.price) * 100).toFixed(0) : 0;
    
    return (
      <TouchableOpacity style={[styles.itemCard, shadows.sm]} activeOpacity={0.9}>
        {/* Header with Icon and Actions */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: `${status.color}15` }]}>
            <MaterialCommunityIcons 
              name={isRetail ? "package-variant" : "spray"} 
              size={24} 
              color={status.color} 
            />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.itemTypeRow}>
              <View style={[styles.typePill, { backgroundColor: isRetail ? colors.accentBlue : colors.accentGreen }]}>
                <Text style={styles.typePillText}>{isRetail ? 'Retail' : 'Consumable'}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: `${status.color}15` }]}>
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
              </View>
            </View>
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.successMuted }]}
              onPress={() => openPurchaseModal(item)}
            >
              <MaterialCommunityIcons name="plus-circle" size={16} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.infoMuted }]}
              onPress={() => openEditModal(item)}
            >
              <MaterialCommunityIcons name="pencil" size={16} color={colors.info} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.errorMuted }]}
              onPress={() => handleDelete(item)}
            >
              <MaterialCommunityIcons name="delete" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stock Progress Bar */}
        <View style={styles.stockBarContainer}>
          <View style={styles.stockBarBackground}>
            <View style={[styles.stockBarFill, { width: `${stockPercentage}%`, backgroundColor: status.color }]} />
          </View>
          <View style={styles.stockInfo}>
            <Text style={styles.stockCurrent}>{item.quantity}</Text>
            <Text style={styles.stockLabel}> / {item.minThreshold * 3} {item.unit || 'units'}</Text>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailChip}>
            <MaterialCommunityIcons name="currency-inr" size={14} color={colors.textMuted} />
            <Text style={styles.detailChipText}>₹{item.price}</Text>
          </View>
          {isRetail && item.costPrice && (
            <View style={styles.detailChip}>
              <MaterialCommunityIcons name="tag-outline" size={14} color={colors.success} />
              <Text style={[styles.detailChipText, { color: colors.success }]}>+{margin}%</Text>
            </View>
          )}
          <View style={styles.detailChip}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.detailChipText}>Min: {item.minThreshold}</Text>
          </View>
          {item.sku && (
            <View style={styles.detailChip}>
              <MaterialCommunityIcons name="barcode" size={14} color={colors.textMuted} />
              <Text style={styles.detailChipText}>{item.sku}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="package-variant" size={28} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Inventory</Text>
          <Text style={styles.headerSubtitle}>{inventory.length} items</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.headerIconButton, { marginRight: 8 }]} 
            onPress={() => navigation.navigate('InventoryReport')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="chart-bar" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal} activeOpacity={0.8}>
            <MaterialCommunityIcons name="plus" size={20} color={colors.textInverse} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Analytics Summary */}
      <View style={styles.analyticsContainer}>
        <View style={[styles.analyticsCard, { backgroundColor: colors.accentBlue }]}>
          <MaterialCommunityIcons name="store" size={20} color={colors.textInverse} />
          <Text style={styles.analyticsValue}>{analytics.retailCount}</Text>
          <Text style={styles.analyticsLabel}>Retail Items</Text>
        </View>
        <View style={[styles.analyticsCard, { backgroundColor: colors.accentGreen }]}>
          <MaterialCommunityIcons name="spray" size={20} color={colors.textInverse} />
          <Text style={styles.analyticsValue}>{analytics.consumableCount}</Text>
          <Text style={styles.analyticsLabel}>Consumables</Text>
        </View>
        <View style={[styles.analyticsCard, { backgroundColor: colors.accentPurple }]}>
          <MaterialCommunityIcons name="currency-inr" size={20} color={colors.textInverse} />
          <Text style={styles.analyticsValue}>₹{(analytics.retailStockValue / 1000).toFixed(1)}k</Text>
          <Text style={styles.analyticsLabel}>Stock Value</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'retail' && styles.tabActive]}
          onPress={() => setActiveTab('retail')}
        >
          <MaterialCommunityIcons 
            name="store" 
            size={18} 
            color={activeTab === 'retail' ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'retail' && styles.tabTextActive]}>
            Retail Products
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'consumable' && styles.tabActive]}
          onPress={() => setActiveTab('consumable')}
        >
          <MaterialCommunityIcons 
            name="spray" 
            size={18} 
            color={activeTab === 'consumable' ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'consumable' && styles.tabTextActive]}>
            Salon Consumables
          </Text>
        </TouchableOpacity>
      </View>

      {filteredInventory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="package-variant-closed" size={64} color={colors.border} />
          <Text style={styles.emptyText}>
            No {activeTab} items. Add your first {activeTab} item!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredInventory}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>

              {/* Item Type Selector */}
              {!editingItem && (
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeOption, formData.itemType === 'retail' && styles.typeOptionActive]}
                    onPress={() => setFormData({ ...formData, itemType: 'retail' })}
                  >
                    <MaterialCommunityIcons 
                      name="store" 
                      size={20} 
                      color={formData.itemType === 'retail' ? colors.primary : colors.textMuted} 
                    />
                    <Text style={[styles.typeOptionText, formData.itemType === 'retail' && styles.typeOptionTextActive]}>
                      Retail Product
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeOption, formData.itemType === 'consumable' && styles.typeOptionActive]}
                    onPress={() => setFormData({ ...formData, itemType: 'consumable' })}
                  >
                    <MaterialCommunityIcons 
                      name="spray" 
                      size={20} 
                      color={formData.itemType === 'consumable' ? colors.primary : colors.textMuted} 
                    />
                    <Text style={[styles.typeOptionText, formData.itemType === 'consumable' && styles.typeOptionTextActive]}>
                      Salon Consumable
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder="Item Name"
                placeholderTextColor={colors.textMuted}
                value={formData.name}
                onChangeText={text => setFormData({ ...formData, name: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="SKU / Product Code (optional)"
                placeholderTextColor={colors.textMuted}
                value={formData.sku}
                onChangeText={text => setFormData({ ...formData, sku: text })}
              />

              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder={formData.itemType === 'retail' ? 'Selling Price (₹)' : 'Unit Cost (₹)'}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={formData.price}
                  onChangeText={text => setFormData({ ...formData, price: text })}
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder={formData.itemType === 'retail' ? 'Cost Price (₹)' : 'Current Stock'}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={formData.itemType === 'retail' ? formData.costPrice : formData.quantity}
                  onChangeText={text => formData.itemType === 'retail' 
                    ? setFormData({ ...formData, costPrice: text })
                    : setFormData({ ...formData, quantity: text })
                  }
                />
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Current Quantity"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={formData.quantity}
                  onChangeText={text => setFormData({ ...formData, quantity: text })}
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Min Threshold"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={formData.minThreshold}
                  onChangeText={text => setFormData({ ...formData, minThreshold: text })}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Unit (e.g., bottles, kg, units)"
                placeholderTextColor={colors.textMuted}
                value={formData.unit}
                onChangeText={text => setFormData({ ...formData, unit: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Supplier (optional)"
                placeholderTextColor={colors.textMuted}
                value={formData.supplier}
                onChangeText={text => setFormData({ ...formData, supplier: text })}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Purchase Stock Modal */}
      <Modal visible={purchaseModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Stock Purchase: {selectedItemForPurchase?.name}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Quantity to Add"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={purchaseData.quantity}
              onChangeText={text => setPurchaseData({ ...purchaseData, quantity: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Unit Cost (₹)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={purchaseData.unitCost}
              onChangeText={text => setPurchaseData({ ...purchaseData, unitCost: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Supplier (optional)"
              placeholderTextColor={colors.textMuted}
              value={purchaseData.supplier}
              onChangeText={text => setPurchaseData({ ...purchaseData, supplier: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Invoice Number (optional)"
              placeholderTextColor={colors.textMuted}
              value={purchaseData.invoiceNumber}
              onChangeText={text => setPurchaseData({ ...purchaseData, invoiceNumber: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textMuted}
              value={purchaseData.notes}
              onChangeText={text => setPurchaseData({ ...purchaseData, notes: text })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPurchaseModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handlePurchase}>
                <Text style={styles.saveButtonText}>Record Purchase</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    gap: 6,
  },
  addButtonText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  analyticsCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textInverse,
    marginTop: 4,
  },
  analyticsLabel: {
    fontSize: 11,
    color: colors.textInverse,
    opacity: 0.9,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  tabActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textInverse,
  },
  stockBarContainer: {
    marginBottom: theme.spacing.md,
  },
  stockBarBackground: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  stockBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stockCurrent: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  stockLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
  },
  detailChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  typeOptionActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  typeOptionTextActive: {
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.backgroundSecondary,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});
