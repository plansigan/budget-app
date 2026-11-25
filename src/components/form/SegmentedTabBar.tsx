import React, { useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { ThemeShade } from '../../theme/palette';
import { triggerLightHaptic } from '../../utils/haptics';
import {
  PillLayout,
  ScalePressable,
  SlidingIndicator,
} from '../AnimatedPrimitives';
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
 * Shared accessible segmented tab toggle with a spring-sliding thumb indicator.
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
  const [layouts, setLayouts] = useState<Record<string, PillLayout>>({});

  const defaultActiveBg = variant === 'accent' ? shade.accent : shade.card;
  const resolvedActiveBg = activeBgColor || defaultActiveBg;
  const resolvedActiveFg =
    activeTextColor ||
    (variant === 'accent' && resolvedActiveBg === shade.accent
      ? shade.accentText
      : resolvedActiveBg === shade.card
        ? shade.text
        : '#FFFFFF');

  const handleOptionLayout = useCallback(
    (key: string) => (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      setLayouts((prev) => {
        const existing = prev[key];
        if (
          existing &&
          Math.abs(existing.x - x) < 0.5 &&
          Math.abs(existing.width - width) < 0.5
        ) {
          return prev;
        }
        return { ...prev, [key]: { x, width } };
      });
    },
    []
  );

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
      <SlidingIndicator
        activeLayout={layouts[value]}
        style={[
          styles.thumb,
          {
            backgroundColor: resolvedActiveBg,
            shadowColor: shade.shadowColor,
            shadowOpacity: shade.dark ? 0.25 : 0.08,
          },
        ]}
      />
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <View
            key={opt.key}
            onLayout={handleOptionLayout(opt.key)}
            style={styles.slot}
          >
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                onChange(opt.key);
              }}
              scaleTo={0.96}
              hoverScale={1.015}
              accessibilityRole="tab"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: active }}
              style={styles.btn}
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
                  {
                    color: active ? resolvedActiveFg : shade.muted,
                    fontWeight: active ? '700' : '600',
                  },
                ]}
              >
                {opt.label}
              </Text>
            </ScalePressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    gap: 4,
    position: 'relative',
  },
  thumb: {
    top: 4,
    bottom: 4,
    borderRadius: 12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  slot: {
    flex: 1,
    minWidth: 0,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
  },
});
