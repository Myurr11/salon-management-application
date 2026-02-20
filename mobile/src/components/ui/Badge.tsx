import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, theme } from '../../theme';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'default';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'default',
  size = 'md',
  style,
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: colors.successMuted,
        };
      case 'error':
        return {
          backgroundColor: colors.errorMuted,
        };
      case 'warning':
        return {
          backgroundColor: colors.warningMuted,
        };
      case 'info':
        return {
          backgroundColor: colors.infoMuted,
        };
      default:
        return {
          backgroundColor: colors.secondaryMuted,
        };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'info':
        return colors.info;
      default:
        return colors.secondary;
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: 2,
        };
      case 'md':
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
        };
      default:
        return {};
    }
  };

  return (
    <View style={[styles.badge, getVariantStyle(), getSizeStyle(), style]}>
      <Text style={[theme.typography.caption, { color: getTextColor() }]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
  },
});
