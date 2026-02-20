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
} from 'react-native';
import { useData } from '../context/DataContext';
import type { InventoryItem } from '../types';
import { colors, theme } from '../theme';

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
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
            </View>
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => openEditModal(item)}
            >
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price:</Text>
            <Text style={styles.detailValue}>₹{item.price}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity:</Text>
            <Text style={styles.detailValue}>{item.quantity} units</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Min Threshold:</Text>
            <Text style={styles.detailValue}>{item.minThreshold} units</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      {inventory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No inventory items. Add your first item!</Text>
        </View>
      ) : (
        <FlatList
          data={inventory}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
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
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
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
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButton: {
    backgroundColor: colors.chartBlue,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
  itemDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
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
