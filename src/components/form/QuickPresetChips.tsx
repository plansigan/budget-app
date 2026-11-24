import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeShade } from '../../theme/palette';
import { triggerLightHaptic } from '../../utils/haptics';
import { ScalePressable } from '../AnimatedPrimitives';
import { AppIcon } from '../AppIcon';

export interface PresetChipOption {
  label: string;
  icon?: string;
}

export interface QuickPresetChipsProps<T extends PresetChipOption> {
  presets: T[];
  onSelect: (preset: T) => void;
  shade: ThemeShade;
  accentColor?: string;
  label?: string;
  chipBackgroundColor?: string;
}

/**
 * Reusable starter preset chip strip for bills, allowances, and savings buckets.
 */
export function QuickPresetChips<T extends PresetChipOption>({
  presets,
  onSelect,
  shade,
  accentColor,
  label,
  chipBackgroundColor,
}: QuickPresetChipsProps<T>) {
  const iconColor = accentColor || shade.accent;
  const chipBg = chipBackgroundColor || shade.surface;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: shade.muted }]}>{label}</Text>
      ) : null}
      <View style={styles.row}>
        {presets.map((preset) => (
          <ScalePressable
            key={preset.label}
            onPress={() => {
              triggerLightHaptic();
              onSelect(preset);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Preset ${preset.label}`}
            style={[styles.chip, { backgroundColor: chipBg }]}
          >
            {preset.icon ? (
              <AppIcon name={preset.icon} size={12} color={iconColor} />
            ) : null}
            <Text style={[styles.text, { color: shade.text }]}>
              {preset.label}
            </Text>
          </ScalePressable>
        ))}
      </View>
    </View>
  );
}

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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
