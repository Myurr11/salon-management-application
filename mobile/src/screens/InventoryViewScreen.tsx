import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput } from 'react-native';
import { useData } from '../context/DataContext';
import type { InventoryItem } from '../types';
import { colors, theme } from '../theme';

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
    if (item.quantity === 0) return { text: 'Out of Stock', color: colors.error };
    if (item.quantity <= item.minThreshold) return { text: 'Low Stock', color: colors.warning };
    return { text: 'In Stock', color: colors.success };
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
          placeholderTextColor={colors.textMuted}
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
    backgroundColor: colors.background,
    paddingTop: 16,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
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
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
});
