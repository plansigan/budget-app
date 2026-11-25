import { ThemeMode } from '../types/budget';

export interface ThemeShade {
  id: 'velvet';
  name: string;
  description: string;
  bg: string;
  card: string;
  surface: string;
  border: string;
  borderSubtle: string;
  glassBg: string;
  glassBorder: string;
  backdropBg: string;
  shadowColor: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  heroBg: string;
  heroSurface: string;
  heroBorder: string;
  heroText: string;
  heroMuted: string;
  dopamine: string;
  dopamineSoft: string;
  dopamineBtnBg: string;
  positive: string;
  positiveSoft: string;
  positiveBtnBg: string;
  warning: string;
  warningSoft: string;
  heroPositive: string;
  heroDopamine: string;
  heroWarning: string;
  heroAmber: string;
  dark: boolean;
}

/**
 * Warm Velvet Editorial light palette — low-glare alabaster canvas, pure white
 * elevated cards, soft translucent hairlines & deep velvet hero contrast.
 */
export const VELVET_SHADE: ThemeShade = {
  id: 'velvet',
  name: 'Warm Velvet',
  description: 'Soft linen alabaster canvas, elevated white cards & velvet hero',
  bg: '#F6F5F1',
  card: '#FFFFFF',
  surface: '#EFEDE8',
  border: 'rgba(22, 24, 29, 0.08)',
  borderSubtle: 'rgba(22, 24, 29, 0.055)',
  glassBg: 'rgba(255, 255, 255, 0.80)',
  glassBorder: 'rgba(255, 255, 255, 0.65)',
  backdropBg: '#ECE9E1',
  shadowColor: '#16181D',
  text: '#16181D',
  muted: '#6D7078',
  accent: '#181A20',
  accentText: '#FFFFFF',
  heroBg: '#16181F',
  heroSurface: '#232631',
  heroBorder: 'rgba(255, 255, 255, 0.09)',
  heroText: '#FFFFFF',
  heroMuted: '#9CA3AF',
  dopamine: '#5B5BD6',
  dopamineSoft: 'rgba(91, 91, 214, 0.10)',
  dopamineBtnBg: '#5B5BD6',
  positive: '#15803D',
  positiveSoft: 'rgba(21, 128, 61, 0.10)',
  positiveBtnBg: '#15803D',
  warning: '#E11D48',
  warningSoft: 'rgba(225, 29, 72, 0.10)',
  heroPositive: '#4ADE80',
  heroDopamine: '#A5B4FC',
  heroWarning: '#FB7185',
  heroAmber: '#FBBF24',
  dark: false,
};

/**
 * Deep Velvet Charcoal dark palette — low-glare obsidian canvas, elevated slate
 * cards & calm high-legibility accents.
 */
export const VELVET_DARK_SHADE: ThemeShade = {
  id: 'velvet',
  name: 'Velvet Charcoal',
  description: 'Deep velvet charcoal canvas, elevated slate cards & calm accents',
  bg: '#0C0D11',
  card: '#15171E',
  surface: '#1D202A',
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.055)',
  glassBg: 'rgba(21, 23, 30, 0.82)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  backdropBg: '#07080B',
  shadowColor: '#000000',
  text: '#F3F4F6',
  muted: '#9499A6',
  accent: '#F8FAFC',
  accentText: '#111318',
  heroBg: '#171A24',
  heroSurface: '#232736',
  heroBorder: 'rgba(255, 255, 255, 0.11)',
  heroText: '#FFFFFF',
  heroMuted: '#A1A7B8',
  dopamine: '#818CF8',
  dopamineSoft: 'rgba(129, 140, 248, 0.16)',
  dopamineBtnBg: '#5B5BD6',
  positive: '#34D399',
  positiveSoft: 'rgba(52, 211, 153, 0.16)',
  positiveBtnBg: '#15803D',
  warning: '#FB7185',
  warningSoft: 'rgba(251, 113, 133, 0.16)',
  heroPositive: '#4ADE80',
  heroDopamine: '#A5B4FC',
  heroWarning: '#FB7185',
  heroAmber: '#FBBF24',
  dark: true,
};

/**
 * Resolves the active palette from the user's selected themeMode and system color scheme.
 */
export function resolveThemeShade(
  mode: ThemeMode,
  systemColorScheme?: string | null
): ThemeShade {
  if (mode === 'dark') return VELVET_DARK_SHADE;
  if (mode === 'light') return VELVET_SHADE;
  return systemColorScheme === 'dark' ? VELVET_DARK_SHADE : VELVET_SHADE;
}
