import React, { useState } from 'react';
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
import type { InventoryItem } from '../types';
import { colors, theme, shadows } from '../theme';

interface Props {
  navigation: any;
}

export const AdminInventoryScreen: React.FC<Props> = ({ navigation }) => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    minThreshold: '',
    price: '',
    costPrice: '',
  });

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ name: '', quantity: '', minThreshold: '', price: '', costPrice: '' });
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
    });
    setModalVisible(true);
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
        });
        Alert.alert('Success', 'Item updated successfully.');
      } else {
        await addInventoryItem({
          name: formData.name.trim(),
          quantity,
          minThreshold,
          price,
          costPrice: costPrice ?? undefined,
        });
        Alert.alert('Success', 'Item added successfully.');
      }
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save item. Please try again.');
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
    
    return (
      <TouchableOpacity style={[styles.itemCard, shadows.sm]} activeOpacity={0.9}>
        {/* Header with Icon and Actions */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: `${status.color}15` }]}>
            <MaterialCommunityIcons name="spray" size={24} color={status.color} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.statusPill, { backgroundColor: `${status.color}15` }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
            </View>
          </View>
          <View style={styles.itemActions}>
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
            <Text style={styles.stockLabel}> / {item.minThreshold * 3} units</Text>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailChip}>
            <MaterialCommunityIcons name="currency-inr" size={14} color={colors.textMuted} />
            <Text style={styles.detailChipText}>₹{item.price}</Text>
          </View>
          <View style={styles.detailChip}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.detailChipText}>Min: {item.minThreshold}</Text>
          </View>
          {item.costPrice && (
            <View style={styles.detailChip}>
              <MaterialCommunityIcons name="tag-outline" size={14} color={colors.textMuted} />
              <Text style={styles.detailChipText}>Cost: ₹{item.costPrice}</Text>
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
        <TouchableOpacity style={styles.addButton} onPress={openAddModal} activeOpacity={0.8}>
          <MaterialCommunityIcons name="plus" size={20} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {inventory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="package-variant-closed" size={64} color={colors.border} />
          <Text style={styles.emptyText}>No inventory items. Add your first item!</Text>
        </View>
      ) : (
        <FlatList
          data={inventory}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>

            <TextInput
              style={styles.input}
              placeholder="Item Name"
              placeholderTextColor={colors.textMuted}
              value={formData.name}
              onChangeText={text => setFormData({ ...formData, name: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Selling Price (₹)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={formData.price}
              onChangeText={text => setFormData({ ...formData, price: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Cost Price (₹, optional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={formData.costPrice}
              onChangeText={text => setFormData({ ...formData, costPrice: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Quantity"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={formData.quantity}
              onChangeText={text => setFormData({ ...formData, quantity: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Minimum Threshold"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={formData.minThreshold}
              onChangeText={text => setFormData({ ...formData, minThreshold: text })}
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
