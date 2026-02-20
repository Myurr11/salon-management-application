import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, theme, shadows } from '../theme';

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

const DEFAULT_COLORS = [
  colors.chartGreen,
  colors.chartBlue,
  colors.chartAmber,
  colors.chartRed,
  colors.chartPurple,
  colors.chartTeal,
];

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
    <View style={[styles.card, shadows.sm]}>
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
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    width: 80,
    fontSize: 14,
    color: colors.textSecondary,
  },
  barContainer: {
    flex: 1,
    height: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 6,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 6,
  },
  value: {
    width: 72,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
});
