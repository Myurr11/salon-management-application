import { colors } from './colors';
import { Platform } from 'react-native';

export { colors };

// Professional Corporate shadow presets - subtle elevation
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

// Professional Corporate theme
export const theme = {
  colors,
  shadows,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    xxxxl: 40,
  },
  // Corporate border radius - subtle rounding
  radius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
    xxl: 16,
    full: 9999,
  },
  // Professional typography system
  typography: {
    h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
    h2: { fontSize: 22, fontWeight: '600' as const, lineHeight: 30 },
    h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
    h4: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
    body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
    label: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
    button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  },
} as const;
