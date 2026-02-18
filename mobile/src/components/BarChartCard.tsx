import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartCardProps {
  title: string;
  items: BarChartItem[];
  formatValue?: (value: number) => string;
  maxValue?: number;
  onPressItem?: (index: number, item: BarChartItem) => void;
  TouchableWrapper?: React.ComponentType<{ onPress: () => void; children: React.ReactNode }>;
}

const DEFAULT_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const BarChartCard: React.FC<BarChartCardProps> = ({
  title,
  items,
  formatValue = (v) => `₹${v.toFixed(0)}`,
  maxValue: maxValueProp,
  onPressItem,
  TouchableWrapper,
}) => {
  const maxVal = maxValueProp ?? Math.max(...items.map((i) => i.value), 1);
  const maxWidth = 100;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {items.map((item, index) => {
        const widthPct = maxVal > 0 ? (item.value / maxVal) * maxWidth : 0;
        const color = item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
        const row = (
          <View style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  { width: `${Math.min(widthPct, 100)}%`, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={styles.value}>{formatValue(item.value)}</Text>
          </View>
        );
        if (TouchableWrapper && onPressItem) {
          return (
            <TouchableWrapper key={`${item.label}-${index}`} onPress={() => onPressItem(index, item)}>
              {row}
            </TouchableWrapper>
          );
        }
        return <View key={`${item.label}-${index}`}>{row}</View>;
      })}
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
    width: 80,
    fontSize: 12,
    color: '#9ca3af',
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#1f2937',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  value: {
    width: 56,
    fontSize: 12,
    fontWeight: '600',
    color: '#e5e7eb',
    textAlign: 'right',
  },
});
