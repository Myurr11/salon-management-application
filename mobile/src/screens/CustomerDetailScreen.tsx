import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useData } from '../context/DataContext';
import type { Customer, Visit } from '../types';
import { colors, theme } from '../theme';

interface Props {
  navigation: any;
  route: { params: { customerId: string } };
}

export const CustomerDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customers, visits } = useData();
  const customer = useMemo(
    () => customers.find(c => c.id === route.params.customerId),
    [customers, route.params.customerId],
  );
  const customerVisits = useMemo(
    () => visits.filter(v => v.customerId === route.params.customerId).sort((a, b) => (b.date > a.date ? 1 : -1)),
    [visits, route.params.customerId],
  );
  const totalSpend = useMemo(
    () => customerVisits.reduce((sum, v) => sum + v.total, 0),
    [customerVisits],
  );
  const lastVisit = customerVisits[0];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  if (!customer) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Customer not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{customer.name}</Text>
        {customer.phone && <Text style={styles.detail}>📞 {customer.phone}</Text>}
        {customer.email && <Text style={styles.detail}>✉️ {customer.email}</Text>}
        {customer.dob && <Text style={styles.detail}>🎂 DOB: {formatDate(customer.dob)}</Text>}
        {customer.gender && <Text style={styles.detail}>Gender: {customer.gender}</Text>}
        {customer.address && <Text style={styles.detail}>📍 {customer.address}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Total visits</Text>
          <Text style={styles.value}>{customerVisits.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Lifetime spend</Text>
          <Text style={styles.value}>₹{totalSpend.toFixed(0)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Last visit</Text>
          <Text style={styles.value}>{lastVisit ? formatDate(lastVisit.date) : 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Visit History</Text>
        {customerVisits.length === 0 ? (
          <Text style={styles.emptyText}>No visits yet.</Text>
        ) : (
          customerVisits.map((v: Visit) => (
            <TouchableOpacity
              key={v.id}
              style={styles.visitRow}
              onPress={() => navigation.navigate('BillView', { visitId: v.id })}
            >
              <View>
                <Text style={styles.visitDate}>{formatDate(v.date)}</Text>
                <Text style={styles.visitStaff}>{v.staffName}</Text>
                <Text style={styles.visitServices}>
                  {v.services.map(s => s.serviceName).join(', ')}
                  {v.products.length > 0 ? ` + ${v.products.length} product(s)` : ''}
                </Text>
              </View>
              <Text style={styles.visitAmount}>₹{v.total.toFixed(0)}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.error, fontSize: 16 },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  detail: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 14, color: colors.textSecondary },
  value: { fontSize: 14, fontWeight: '600', color: colors.text },
  visitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  visitDate: { fontSize: 14, fontWeight: '600', color: colors.text },
  visitStaff: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  visitServices: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  visitAmount: { fontSize: 16, fontWeight: '700', color: colors.success },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
