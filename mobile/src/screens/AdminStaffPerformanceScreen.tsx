import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface Props {
  navigation: any;
}

export const AdminStaffPerformanceScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { visits } = useData();
  const { staffMembers } = useAuth();

  const staffStats = useMemo(() => {
    const map: Record<
      string,
      { name: string; customers: number; revenue: number; servicesCount: number; productsCount: number }
    > = {};
    staffMembers.forEach(s => {
      map[s.id] = { name: s.name, customers: 0, revenue: 0, servicesCount: 0, productsCount: 0 };
    });
    visits.forEach(v => {
      if (map[v.staffId]) {
        map[v.staffId].customers += 1;
        map[v.staffId].revenue += v.total;
        map[v.staffId].servicesCount += v.services.length;
        map[v.staffId].productsCount += v.products.reduce((sum, p) => sum + p.quantity, 0);
      }
    });
    return Object.entries(map).map(([staffId, stats]) => ({
      staffId,
      ...stats,
      avgBill: stats.customers > 0 ? stats.revenue / stats.customers : 0,
    }));
  }, [visits, staffMembers]);

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Admin access required.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Staff Performance</Text>
      {staffStats.map(s => (
        <View key={s.staffId} style={styles.card}>
          <Text style={styles.staffName}>{s.name}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Customers attended</Text>
            <Text style={styles.value}>{s.customers}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total revenue</Text>
            <Text style={styles.value}>₹{s.revenue.toFixed(0)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Services sold</Text>
            <Text style={styles.value}>{s.servicesCount}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Products sold (units)</Text>
            <Text style={styles.value}>{s.productsCount}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Average bill value</Text>
            <Text style={styles.value}>₹{s.avgBill.toFixed(0)}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', paddingTop: 60, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ef4444', fontSize: 16 },
  title: { fontSize: 22, fontWeight: '700', color: 'white', marginBottom: 16 },
  card: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  staffName: { fontSize: 18, fontWeight: '700', color: 'white', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 14, color: '#9ca3af' },
  value: { fontSize: 14, fontWeight: '600', color: 'white' },
});
