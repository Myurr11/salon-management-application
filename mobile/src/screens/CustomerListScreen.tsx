import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import type { Customer } from '../types';
import { colors, theme, shadows } from '../theme';
import { Button } from '../components/ui/Button';

interface Props {
  navigation: any;
}

export const CustomerListScreen: React.FC<Props> = ({ navigation }) => {
  const { customers, visits } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  const customerStats = useMemo(() => {
    const map: Record<string, { totalSpend: number; lastVisitDate: string | null }> = {};
    customers.forEach(c => {
      map[c.id] = { totalSpend: 0, lastVisitDate: null };
    });
    visits.forEach(v => {
      if (map[v.customerId]) {
        map[v.customerId].totalSpend += v.total;
        if (!map[v.customerId].lastVisitDate || v.date > map[v.customerId].lastVisitDate!) {
          map[v.customerId].lastVisitDate = v.date;
        }
      }
    });
    return map;
  }, [customers, visits]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(
      c =>
        c.name.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query) ||
        c.dob?.includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.address?.toLowerCase().includes(query),
    );
  }, [customers, searchQuery]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#1e3a5f', '#0d9488', '#059669', '#2563eb', '#7c3aed'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const renderCustomer = ({ item }: { item: Customer }) => {
    const stats = customerStats[item.id];
    const balance = stats?.totalSpend || 0;
    const isNegative = balance < 0;
    
    return (
      <TouchableOpacity
        style={styles.customerCard}
        onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
        activeOpacity={0.8}
      >
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.customerInfo}>
          <Text style={theme.typography.body} numberOfLines={1}>{item.name}</Text>
          <Text style={[theme.typography.caption, { color: colors.textMuted }]}>
            {item.phone || 'No phone'}
          </Text>
        </View>
        <View style={styles.balanceContainer}>
          <Text style={[theme.typography.caption, { color: colors.textMuted }]}>Total Spend</Text>
          <Text style={[theme.typography.h4, { color: isNegative ? colors.error : colors.success }]}>
            ₹{Math.abs(balance).toFixed(0)}
          </Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={theme.typography.h2}>My Clients</Text>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.statsRow}>
        <Text style={[theme.typography.bodySmall, { color: colors.textMuted }]}>
          Total Clients: <Text style={{ color: colors.text, fontWeight: '600' }}>{filteredCustomers.length}</Text>
        </Text>
      </View>

      {filteredCustomers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-off" size={48} color={colors.border} />
          <Text style={[theme.typography.bodySmall, { color: colors.textMuted, marginTop: theme.spacing.md }]}>
            {searchQuery ? 'No customers found matching your search.' : 'No customers yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={item => item.id}
          renderItem={renderCustomer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  statsRow: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  customerInfo: {
    flex: 1,
  },
  balanceContainer: {
    alignItems: 'flex-end',
    marginRight: theme.spacing.sm,
  },
  moreButton: {
    padding: theme.spacing.xs,
  },
});
