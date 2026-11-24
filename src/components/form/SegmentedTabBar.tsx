import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ThemeShade } from '../../theme/palette';
import { triggerLightHaptic } from '../../utils/haptics';
import { ScalePressable } from '../AnimatedPrimitives';
import { AppIcon } from '../AppIcon';

export interface SegmentOption<K extends string> {
  key: K;
  label: string;
  icon?: string;
}

export interface SegmentedTabBarProps<K extends string> {
  options: SegmentOption<K>[];
  value: K;
  onChange: (next: K) => void;
  shade: ThemeShade;
  variant?: 'card' | 'accent';
  activeBgColor?: string;
  activeTextColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
  withBorder?: boolean;
}

/**
 * Shared accessible segmented tab toggle used across screens and modals.
 */
export function SegmentedTabBar<K extends string>({
  options,
  value,
  onChange,
  shade,
  variant = 'card',
  activeBgColor,
  activeTextColor,
  containerStyle,
  withBorder = true,
}: SegmentedTabBarProps<K>) {
  const defaultActiveBg = variant === 'accent' ? shade.accent : shade.card;
  const resolvedActiveBg = activeBgColor || defaultActiveBg;
  const resolvedActiveFg =
    activeTextColor ||
    (variant === 'accent' && resolvedActiveBg === shade.accent
      ? shade.accentText
      : resolvedActiveBg === shade.card
      ? shade.text
      : '#FFFFFF');

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: shade.surface,
          borderColor: shade.border,
          borderWidth: withBorder ? 1 : 0,
        },
        containerStyle,
      ]}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <ScalePressable
            key={opt.key}
            onPress={() => {
              triggerLightHaptic();
              onChange(opt.key);
            }}
            accessibilityRole="tab"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
            style={[
              styles.btn,
              active && { backgroundColor: resolvedActiveBg },
            ]}
          >
            {opt.icon ? (
              <AppIcon
                name={opt.icon}
                size={13}
                color={active ? resolvedActiveFg : shade.muted}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={[
                styles.text,
                { color: active ? resolvedActiveFg : shade.muted },
              ]}
            >
              {opt.label}
            </Text>
          </ScalePressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderRadius: 15,
    padding: 4,
    gap: 4,
  },
  btn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 11,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
  },
});
