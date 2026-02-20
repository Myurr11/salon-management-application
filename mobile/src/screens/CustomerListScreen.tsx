import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { useData } from '../context/DataContext';
import type { Customer } from '../types';
import { colors, theme, shadows } from '../theme';

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

  const renderCustomer = ({ item }: { item: Customer }) => {
    const stats = customerStats[item.id];
    return (
      <TouchableOpacity
        style={styles.customerCard}
        onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
      >
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name}</Text>
          {item.phone && <Text style={styles.customerDetail}>📞 {item.phone}</Text>}
          {item.dob && <Text style={styles.customerDetail}>🎂 {formatDate(item.dob)}</Text>}
          {item.gender && <Text style={styles.customerDetail}>{item.gender}</Text>}
          {stats && (
            <Text style={styles.customerDetail}>
              Total spend: ₹{stats.totalSpend.toFixed(0)} • Last visit: {formatDate(stats.lastVisitDate)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers by name, phone, or DOB..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Customers</Text>
        <Text style={styles.headerSubtitle}>{filteredCustomers.length} customer(s)</Text>
      </View>

      {filteredCustomers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No customers found matching your search.' : 'No customers yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={item => item.id}
          renderItem={renderCustomer}
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
  customerCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    ...shadows.sm,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  customerDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
});
