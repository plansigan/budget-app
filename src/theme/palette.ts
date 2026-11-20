import { ThemeMode } from '../types/budget';

export interface ThemeShade {
  id: 'velvet';
  name: string;
  description: string;
  bg: string;
  card: string;
  surface: string;
  border: string;
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
  positive: string;
  positiveSoft: string;
  warning: string;
  warningSoft: string;
  dark: boolean;
}

/**
 * Soft-elevated Minimalist palette with Dark Obsidian Hero contrast.
 */
export const VELVET_SHADE: ThemeShade = {
  id: 'velvet',
  name: 'Minimalist Obsidian',
  description: 'Soft alabaster canvas, pure white cards & dark obsidian hero',
  bg: '#F7F7F9',
  card: '#FFFFFF',
  surface: '#F1F2F6',
  border: '#E8EAF0',
  text: '#111318',
  muted: '#6B7280',
  accent: '#141519',
  accentText: '#FFFFFF',
  heroBg: '#141519',
  heroSurface: '#22242C',
  heroBorder: '#2A2D37',
  heroText: '#FFFFFF',
  heroMuted: '#9CA3AF',
  dopamine: '#4F46E5',
  dopamineSoft: 'rgba(79, 70, 229, 0.09)',
  positive: '#15803D',
  positiveSoft: 'rgba(21, 128, 61, 0.10)',
  warning: '#DC2626',
  warningSoft: 'rgba(220, 38, 38, 0.10)',
  dark: false,
};

/**
 * Midnight Obsidian dark palette preserving high-contrast minimalist hierarchy.
 */
export const VELVET_DARK_SHADE: ThemeShade = {
  id: 'velvet',
  name: 'Midnight Obsidian',
  description: 'Deep obsidian canvas, elevated slate cards & vivid accents',
  bg: '#0B0C10',
  card: '#14161D',
  surface: '#1C1F2A',
  border: '#272B38',
  text: '#F3F4F6',
  muted: '#9CA3AF',
  accent: '#F8FAFC',
  accentText: '#111318',
  heroBg: '#181B25',
  heroSurface: '#242838',
  heroBorder: '#343A4F',
  heroText: '#FFFFFF',
  heroMuted: '#A1A7B8',
  dopamine: '#6366F1',
  dopamineSoft: 'rgba(99, 102, 241, 0.18)',
  positive: '#16A34A',
  positiveSoft: 'rgba(22, 163, 74, 0.18)',
  warning: '#EF4444',
  warningSoft: 'rgba(239, 68, 68, 0.18)',
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
