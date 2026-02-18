import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RevenueBarChartProps {
  today: number;
  monthly: number;
  yearly: number;
}

export const RevenueBarChart: React.FC<RevenueBarChartProps> = ({ today, monthly, yearly }) => {
  const max = Math.max(today, monthly, yearly, 1);
  const toPct = (v: number) => (v / max) * 100;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Revenue overview</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Today</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${toPct(today)}%`, backgroundColor: '#22c55e' }]} />
        </View>
        <Text style={styles.value}>₹{today.toFixed(0)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Monthly</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${toPct(monthly)}%`, backgroundColor: '#3b82f6' }]} />
        </View>
        <Text style={styles.value}>₹{monthly.toFixed(0)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Yearly</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${toPct(yearly)}%`, backgroundColor: '#8b5cf6' }]} />
        </View>
        <Text style={styles.value}>₹{yearly.toFixed(0)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    width: 56,
    fontSize: 12,
    color: '#9ca3af',
  },
  track: {
    flex: 1,
    height: 24,
    backgroundColor: '#1f2937',
    borderRadius: 6,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
  value: {
    width: 72,
    fontSize: 12,
    fontWeight: '600',
    color: '#e5e7eb',
    textAlign: 'right',
  },
});
