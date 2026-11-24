import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeShade } from '../../theme/palette';
import { SpendCategoryKey } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { ScalePressable } from '../AnimatedPrimitives';
import { AppIcon, AppIconName, SPEND_CATEGORIES } from '../AppIcon';

export interface SpendCategoryPickerProps {
  selectedKey: SpendCategoryKey;
  onSelect: (category: {
    key: SpendCategoryKey;
    icon: AppIconName;
    label: string;
  }) => void;
  shade: ThemeShade;
  activeColor?: string;
  activeTextColor?: string;
  label?: string;
}

/**
 * Shared category pill grid for Spend and Edit Transaction modals.
 */
export const SpendCategoryPicker: React.FC<SpendCategoryPickerProps> = ({
  selectedKey,
  onSelect,
  shade,
  activeColor,
  activeTextColor,
  label,
}) => {
  const activeBg = activeColor || shade.accent;
  const activeFg =
    activeTextColor ||
    (activeBg === shade.accent ? shade.accentText : '#FFFFFF');

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: shade.muted }]}>{label}</Text>
      ) : null}
      <View style={styles.row}>
        {SPEND_CATEGORIES.map((cat) => {
          const active = selectedKey === cat.key;
          return (
            <ScalePressable
              key={cat.key}
              onPress={() => {
                triggerLightHaptic();
                onSelect(cat);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Category ${cat.label}`}
              accessibilityState={{ selected: active }}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? activeBg : shade.surface,
                },
              ]}
            >
              <AppIcon
                name={cat.icon}
                size={12}
                color={active ? activeFg : shade.text}
              />
              <Text
                style={[styles.text, { color: active ? activeFg : shade.text }]}
              >
                {cat.label}
              </Text>
            </ScalePressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
