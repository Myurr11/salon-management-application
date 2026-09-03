/**
 * Salon Design System
 * Matches the green/gray palette used across the redesigned screens
 */
export const colors = {
  // Backgrounds
  background: '#F7F9FB',
  backgroundSecondary: '#F2F4F6',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',

  // Text
  text: '#191C1E',
  textSecondary: '#707A6F',
  textMuted: '#9AA09E',
  textInverse: '#ffffff',

  // Borders
  border: '#E8EAEC',
  borderLight: '#EEF1F3',

  // Primary - Deep Green
  primary: '#166534',
  primaryLight: '#1E7A42',
  primaryMuted: 'rgba(22,101,52,0.10)',
  primaryContainer: 'rgba(22,101,52,0.12)',

  // Secondary - Neutral Gray
  secondary: '#707A6F',
  secondaryLight: '#9AA09E',
  secondaryMuted: '#F2F4F6',

  // Accent - Teal (kept distinct from primary green)
  accent: '#0d9488',
  accentLight: '#14b8a6',
  accentMuted: '#ccfbf1',

  // Accent variations for cards (solid colors for backgrounds)
  accentBlue: '#1B5FA6',
  accentGreen: '#166534',
  accentAmber: '#B8742A',
  accentRose: '#BA1A1A',
  accentPurple: '#7C5CBF',

  // Status
  success: '#166534',
  successMuted: 'rgba(22,101,52,0.10)',
  successLight: 'rgba(22,101,52,0.06)',
  error: '#BA1A1A',
  errorMuted: 'rgba(186,26,26,0.08)',
  errorLight: 'rgba(186,26,26,0.05)',
  warning: '#B8742A',
  warningMuted: 'rgba(184,116,42,0.10)',
  warningLight: 'rgba(184,116,42,0.06)',
  info: '#1B5FA6',
  infoMuted: 'rgba(27,95,166,0.10)',
  infoLight: 'rgba(27,95,166,0.06)',

  // Chart accents
  chartGreen: '#166534',
  chartBlue: '#1B5FA6',
  chartAmber: '#B8742A',
  chartRed: '#BA1A1A',
  chartPurple: '#7C5CBF',
  chartTeal: '#0d9488',
  chartNavy: '#1e3a5f',
} as const;
