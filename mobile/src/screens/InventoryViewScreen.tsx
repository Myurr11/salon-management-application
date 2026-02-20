import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import type { InventoryItem } from '../types';
import { colors, theme, shadows } from '../theme';

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

  const getStockIcon = (item: InventoryItem): keyof typeof MaterialCommunityIcons.glyphMap => {
    if (item.quantity === 0) return 'package-variant-closed';
    if (item.quantity <= item.minThreshold) return 'alert-circle';
    return 'package-variant';
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const status = getStockStatus(item);
    const stockPercentage = Math.min((item.quantity / (item.minThreshold * 3)) * 100, 100);
    
    return (
      <TouchableOpacity style={styles.itemCard} activeOpacity={0.9}>
        {/* Top Section with Icon and Main Info */}
        <View style={styles.cardTop}>
          <View style={[styles.iconCircle, { backgroundColor: `${status.color}15` }]}>
            <MaterialCommunityIcons name="spray" size={24} color={status.color} />
          </View>
          <View style={styles.mainInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemPrice}>₹{item.price}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${status.color}15` }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        </View>

        {/* Stock Visual Bar */}
        <View style={styles.stockBarContainer}>
          <View style={styles.stockBarBackground}>
            <View 
              style={[
                styles.stockBarFill, 
                { 
                  width: `${stockPercentage}%`,
                  backgroundColor: status.color 
                }
              ]} 
            />
          </View>
          <View style={styles.stockNumbers}>
            <Text style={styles.stockCurrent}>{item.quantity}</Text>
            <Text style={styles.stockLabel}> / {item.minThreshold * 3} units</Text>
          </View>
        </View>

        {/* Bottom Info Row */}
        <View style={styles.cardBottom}>
          <View style={styles.infoChip}>
            <MaterialCommunityIcons name="alert-circle-outline" size={12} color={colors.textMuted} />
            <Text style={styles.infoChipText}>Min: {item.minThreshold}</Text>
          </View>
          <View style={styles.infoChip}>
            <MaterialCommunityIcons name="cube-outline" size={12} color={colors.textMuted} />
            <Text style={styles.infoChipText}>Stock Value: ₹{(item.price * item.quantity).toFixed(0)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="package-variant" size={28} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Inventory</Text>
          <Text style={styles.headerSubtitle}>{filteredInventory.length} item(s)</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search inventory..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {filteredInventory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="package-variant-closed" size={64} color={colors.border} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No items found matching your search.' : 'No inventory items.'}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.full,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
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
    ...shadows.sm,
  },
  cardTop: {
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
  mainInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
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
  stockNumbers: {
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
  cardBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
  },
  infoChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
});
