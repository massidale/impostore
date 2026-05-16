export const colors = {
  background: '#0A0F1C',
  surface: '#0F172A',
  surfaceAlt: '#1E293B',
  surfaceElevated: '#1E293B',
  border: '#334155',
  borderMuted: '#1E293B',

  primary: '#06B6D4',
  primaryDark: '#0891B2',
  primaryLight: '#22D3EE',
  primaryOutline: '#67E8F9',
  primaryTint: '#083344',

  accent: '#06B6D4',
  accentDark: '#0891B2',

  success: '#10B981',
  successDark: '#047857',
  danger: '#F43F5E',
  dangerMuted: '#9A3434',
  warning: '#F59E0B',
  warningMuted: '#A16C1E',

  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',

  disabled: '#475569',

  roleImpostor: '#EF4444',
  roleClown: '#F59E0B',
  roleCivilian: '#10B981',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  display: 44,
} as const;

export const fonts = {
  display: 'DMSans_700Bold',
  displayHeavy: 'DMSans_800ExtraBold',
  displaySemi: 'DMSans_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemi: 'DMSans_700Bold',
  code: 'Menlo, Monaco, Consolas, "Courier New", monospace',
} as const;

export const layout = {
  headerHeight: 56,
  headerBorderColor: colors.primaryTint,
} as const;
