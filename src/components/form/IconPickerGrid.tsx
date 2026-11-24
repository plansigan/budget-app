import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeShade } from '../../theme/palette';
import { triggerLightHaptic } from '../../utils/haptics';
import { ScalePressable } from '../AnimatedPrimitives';
import { AppIcon } from '../AppIcon';

export interface IconPickerGridProps {
  icons: string[];
  selected: string;
  onSelect: (icon: string) => void;
  shade: ThemeShade;
  activeBg?: string;
  activeFg?: string;
  label?: string;
  pillSize?: number;
}

/**
 * Shared Feather icon grid selector used by Bill, Allowance, Treat, Bucket, and Onboarding forms.
 */
export const IconPickerGrid: React.FC<IconPickerGridProps> = ({
  icons,
  selected,
  onSelect,
  shade,
  activeBg,
  activeFg,
  label,
  pillSize = 38,
}) => {
  const resolvedActiveBg = activeBg || shade.accent;
  const resolvedActiveFg =
    activeFg ||
    (resolvedActiveBg === shade.accent ? shade.accentText : '#FFFFFF');

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: shade.muted }]}>{label}</Text>
      ) : null}
      <View style={styles.row}>
        {icons.map((iconName) => {
          const active = selected === iconName;
          return (
            <ScalePressable
              key={iconName}
              onPress={() => {
                triggerLightHaptic();
                onSelect(iconName);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Choose ${iconName} icon`}
              accessibilityState={{ selected: active }}
              style={[
                styles.pill,
                {
                  width: pillSize,
                  height: pillSize,
                  backgroundColor: active ? resolvedActiveBg : shade.surface,
                },
              ]}
            >
              <AppIcon
                name={iconName}
                size={16}
                color={active ? resolvedActiveFg : shade.text}
              />
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
    fontSize: 11,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  pill: {
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
