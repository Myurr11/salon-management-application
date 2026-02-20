import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, theme, shadows } from '../../theme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconColor = colors.primary,
  iconBgColor = colors.primaryContainer,
  subtitle,
  trend,
  trendValue,
  style,
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return colors.success;
      case 'down':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const getTrendIcon = (): keyof typeof MaterialCommunityIcons.glyphMap => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'minus';
    }
  };

  return (
    <View style={[styles.card, shadows.sm, style]}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
        </View>
      )}
      <Text style={[theme.typography.bodySmall, styles.title]} numberOfLines={1}>{title}</Text>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
      {(subtitle || trend) && (
        <View style={styles.footer}>
          {subtitle && (
            <Text style={[theme.typography.bodySmall, { color: colors.textMuted }]}>
              {subtitle}
            </Text>
          )}
          {trend && trendValue && (
            <View style={styles.trendContainer}>
              <MaterialCommunityIcons
                name={getTrendIcon()}
                size={14}
                color={getTrendColor()}
              />
              <Text style={[theme.typography.caption, { color: getTrendColor(), marginLeft: 4 }]}>
                {trendValue}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minHeight: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
