import { Platform, ViewStyle } from 'react-native';
import { ThemeShade } from './palette';

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
} as const;

export const FONT_FAMILY = Platform.select({
  web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  default: undefined,
});

/**
 * Soft, diffused elevation shadow for content cards.
 */
export function getCardShadow(shade: ThemeShade): ViewStyle {
  return {
    shadowColor: shade.shadowColor,
    shadowOpacity: shade.dark ? 0.28 : 0.045,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  };
}

/**
 * Deeper ambient shadow for hero balance cards and floating overlays.
 */
export function getHeroShadow(shade: ThemeShade): ViewStyle {
  return {
    shadowColor: shade.shadowColor,
    shadowOpacity: shade.dark ? 0.42 : 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  };
}

/**
 * Floating dock shadow for the bottom navigation pill.
 */
export function getDockShadow(shade: ThemeShade): ViewStyle {
  return {
    shadowColor: shade.shadowColor,
    shadowOpacity: shade.dark ? 0.5 : 0.11,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  };
}

/**
 * Frosted glass backdrop blur on web, clean opaque fallback on native.
 */
export function getWebGlassStyle(blurPx = 18): ViewStyle {
  if (Platform.OS !== 'web') return {};
  return {
    backdropFilter: `blur(${blurPx}px)`,
    WebkitBackdropFilter: `blur(${blurPx}px)`,
  } as ViewStyle;
}
