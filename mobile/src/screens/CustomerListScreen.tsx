import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { useData } from '../context/DataContext';
import type { Customer } from '../types';

interface Props {
  navigation: any;
}

export const CustomerListScreen: React.FC<Props> = ({ navigation }) => {
  const { customers } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(
      c =>
        c.name.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query) ||
        c.dob?.includes(query),
    );
  }, [customers, searchQuery]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderCustomer = ({ item }: { item: Customer }) => (
    <TouchableOpacity style={styles.customerCard}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        {item.phone && <Text style={styles.customerDetail}>📞 {item.phone}</Text>}
        {item.dob && <Text style={styles.customerDetail}>🎂 {formatDate(item.dob)}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers by name, phone, or DOB..."
          placeholderTextColor="#6b7280"
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
  customerCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 6,
  },
  customerDetail: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
});
