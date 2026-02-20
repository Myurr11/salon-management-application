import { colors } from './colors';
import { Platform } from 'react-native';

export { colors };

// Material U shadow presets - subtle elevation for depth
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

export const theme = {
  colors,
  shadows,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  // Material U - very rounded corners
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },
  typography: {
    title: { fontSize: 22, fontWeight: '700' as const },
    titleLarge: { fontSize: 26, fontWeight: '700' as const },
    subtitle: { fontSize: 16, fontWeight: '600' as const },
    body: { fontSize: 15 },
    bodySmall: { fontSize: 13 },
    caption: { fontSize: 12 },
  },
} as const;
