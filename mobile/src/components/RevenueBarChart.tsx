import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, theme, shadows } from '../theme';

interface RevenueBarChartProps {
  today: number;
  monthly: number;
  yearly: number;
}

export const RevenueBarChart: React.FC<RevenueBarChartProps> = ({ today, monthly, yearly }) => {
  const max = Math.max(today, monthly, yearly, 1);
  const toPct = (v: number) => (v / max) * 100;

  return (
    <View style={[styles.card, shadows.sm]}>
      <Text style={styles.title}>Revenue Overview</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Today</Text>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${toPct(today)}%`, backgroundColor: colors.chartGreen },
            ]}
          />
        </View>
        <Text style={styles.value}>₹{today.toFixed(0)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Monthly</Text>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${toPct(monthly)}%`, backgroundColor: colors.chartBlue },
            ]}
          />
        </View>
        <Text style={styles.value}>₹{monthly.toFixed(0)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Yearly</Text>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${toPct(yearly)}%`, backgroundColor: colors.chartPurple },
            ]}
          />
        </View>
        <Text style={styles.value}>₹{yearly.toFixed(0)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accentLavender,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    width: 56,
    fontSize: 13,
    color: colors.textSecondary,
  },
  track: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(103, 80, 164, 0.2)',
    borderRadius: 5,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  value: {
    width: 72,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
});
