import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput } from 'react-native';
import { useData } from '../context/DataContext';
import type { InventoryItem } from '../types';

interface Props {
  navigation: any;
}

export const InventoryViewScreen: React.FC<Props> = ({ navigation }) => {
  const { inventory } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return inventory;
    const query = searchQuery.toLowerCase();
    return inventory.filter(item => item.name.toLowerCase().includes(query));
  }, [inventory, searchQuery]);

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return { text: 'Out of Stock', color: '#ef4444' };
    if (item.quantity <= item.minThreshold) return { text: 'Low Stock', color: '#f97316' };
    return { text: 'In Stock', color: '#22c55e' };
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const status = getStockStatus(item);
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
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
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search inventory..."
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
        <Text style={styles.headerSubtitle}>{filteredInventory.length} item(s)</Text>
      </View>

      {filteredInventory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No items found matching your search.' : 'No inventory items.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredInventory}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: 60,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'white',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
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
    color: '#9ca3af',
  },
  detailValue: {
    fontSize: 13,
    color: '#e5e7eb',
    fontWeight: '500',
  },
});
