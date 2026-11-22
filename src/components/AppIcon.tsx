import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SpendCategoryKey } from '../types/budget';

export type AppIconName = React.ComponentProps<typeof Feather>['name'];

const VALID_FEATHER_SET = new Set<AppIconName>([
  'activity',
  'arrow-down-left',
  'arrow-right',
  'arrow-up-right',
  'award',
  'bar-chart-2',
  'book',
  'book-open',
  'briefcase',
  'calendar',
  'camera',
  'check',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'circle',
  'clock',
  'coffee',
  'compass',
  'credit-card',
  'disc',
  'dollar-sign',
  'download',
  'droplet',
  'edit-2',
  'eye',
  'eye-off',
  'file-text',
  'gift',
  'globe',
  'headphones',
  'heart',
  'help-circle',
  'home',
  'layers',
  'lock',
  'monitor',
  'moon',
  'music',
  'navigation',
  'package',
  'pie-chart',
  'plus',
  'refresh-cw',
  'repeat',
  'rotate-ccw',
  'scissors',
  'shield',
  'shopping-bag',
  'shopping-cart',
  'sliders',
  'smartphone',
  'smile',
  'star',
  'sun',
  'tag',
  'target',
  'trash-2',
  'trending-up',
  'truck',
  'tv',
  'umbrella',
  'upload',
  'watch',
  'wifi',
  'x',
  'zap',
]);

const EMOJI_TO_FEATHER: Record<string, AppIconName> = {
  '🏠': 'home',
  '⚡': 'zap',
  '🌐': 'wifi',
  '🎬': 'tv',
  '💧': 'droplet',
  '📱': 'smartphone',
  '💳': 'credit-card',
  '🛡️': 'shield',
  '🚌': 'truck',
  '🚕': 'navigation',
  '🍔': 'shopping-bag',
  '☕': 'coffee',
  '🛍️': 'shopping-cart',
  '🎧': 'headphones',
  '🍵': 'coffee',
  '👟': 'award',
  '✈️': 'compass',
  '🎮': 'monitor',
  '📚': 'book',
  '💐': 'heart',
  '🍣': 'star',
  '🎄': 'gift',
  '🎓': 'book-open',
  '💵': 'dollar-sign',
  '🏦': 'briefcase',
  '📅': 'calendar',
  '📥': 'arrow-down-left',
  '💸': 'arrow-up-right',
  '🎟️': 'gift',
  '🔥': 'zap',
  '🌙': 'moon',
  '✨': 'star',
  '🏆': 'award',
  '🌱': 'trending-up',
  '💡': 'sun',
  '📊': 'bar-chart-2',
  '⏳': 'clock',
  '✂️': 'scissors',
  '🍱': 'package',
  '🪙': 'disc',
  '🎁': 'gift',
  '🎉': 'award',
  '🎯': 'target',
  '✏️': 'edit-2',
  '✎': 'edit-2',
  '🔒': 'lock',
  '🗑️': 'trash-2',
  '📄': 'file-text',
  '💾': 'download',
  '🧪': 'sliders',
  '🙈': 'eye-off',
  '👁️': 'eye',
  'flame': 'zap',
};

/**
 * Resolves either a Feather icon name or a legacy stored emoji string to a flat Feather glyph.
 */
export function resolveFeatherName(icon?: string): AppIconName {
  if (!icon) return 'tag';
  const trimmed = icon.trim();
  if (trimmed in EMOJI_TO_FEATHER) {
    return EMOJI_TO_FEATHER[trimmed];
  }
  if (VALID_FEATHER_SET.has(trimmed as AppIconName)) {
    return trimmed as AppIconName;
  }
  return 'tag';
}

export const TREAT_ICON_CHOICES: AppIconName[] = [
  'headphones',
  'coffee',
  'shopping-bag',
  'compass',
  'monitor',
  'book',
  'heart',
  'gift',
  'camera',
  'music',
  'watch',
  'smartphone',
  'star',
  'award',
  'sun',
  'smile',
];

export const BILL_ICON_CHOICES: AppIconName[] = [
  'home',
  'zap',
  'wifi',
  'droplet',
  'smartphone',
  'tv',
  'credit-card',
  'shield',
  'truck',
  'book-open',
  'heart',
  'tag',
];

export const BUCKET_ICON_CHOICES: AppIconName[] = [
  'shield',
  'compass',
  'gift',
  'book-open',
  'home',
  'heart',
  'briefcase',
  'truck',
  'umbrella',
  'star',
  'target',
  'trending-up',
];

export const ENVELOPE_ICON_CHOICES: AppIconName[] = [
  'heart',
  'coffee',
  'shopping-bag',
  'star',
  'gift',
  'compass',
  'music',
  'smile',
];

export const SPEND_CATEGORIES: {
  key: SpendCategoryKey;
  icon: AppIconName;
  label: string;
}[] = [
  { key: 'cafe', icon: 'coffee', label: 'Cafe' },
  { key: 'food', icon: 'shopping-bag', label: 'Food' },
  { key: 'ride', icon: 'navigation', label: 'Ride' },
  { key: 'shop', icon: 'shopping-cart', label: 'Shop' },
  { key: 'bills', icon: 'zap', label: 'Bills' },
  { key: 'health', icon: 'heart', label: 'Health' },
  { key: 'fun', icon: 'tv', label: 'Fun' },
  { key: 'other', icon: 'tag', label: 'Other' },
];

interface AppIconProps {
  name?: string;
  size?: number;
  color?: string;
}

/**
 * Renders a flat, minimalist Feather vector icon (auto-mapping legacy emojis).
 */
export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 16,
  color = '#111318',
}) => {
  if (name === 'peso' || name === 'dollar-sign') {
    return (
      <Text
        style={[
          styles.pesoGlyph,
          {
            fontSize: size,
            lineHeight: Math.round(size * 1.15),
            color,
          },
        ]}
      >
        ₱
      </Text>
    );
  }
  return <Feather name={resolveFeatherName(name)} size={size} color={color} />;
};

interface IconBadgeProps {
  name?: string;
  size?: number;
  color: string;
  bg: string;
  boxSize?: number;
}

/**
 * Soft rounded minimalist square badge containing a flat Feather icon.
 */
export const IconBadge: React.FC<IconBadgeProps> = ({
  name,
  size = 16,
  color,
  bg,
  boxSize = 34,
}) => {
  return (
    <View
      style={[
        styles.badge,
        {
          width: boxSize,
          height: boxSize,
          borderRadius: Math.round(boxSize * 0.34),
          backgroundColor: bg,
        },
      ]}
    >
      <AppIcon name={name} size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pesoGlyph: {
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
