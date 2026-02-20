import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, theme, shadows } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 'md',
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'sm': return theme.spacing.sm;
      case 'md': return theme.spacing.lg;
      case 'lg': return theme.spacing.xxl;
      default: return theme.spacing.lg;
    }
  };

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: colors.surface,
      borderRadius: theme.radius.md,
      padding: getPadding(),
    };

    switch (variant) {
      case 'outlined':
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'elevated':
        return {
          ...baseStyle,
          ...shadows.md,
        };
      default:
        return {
          ...baseStyle,
          ...shadows.sm,
        };
    }
  };

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  style,
}) => {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerContent}>
        <Text style={theme.typography.h4}>{title}</Text>
        {subtitle && (
          <Text style={[theme.typography.bodySmall, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {action && <View style={styles.headerAction}>{action}</View>}
    </View>
  );
};

import { Text } from 'react-native';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerAction: {
    marginLeft: theme.spacing.md,
  },
});
