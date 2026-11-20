import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TextInput, View } from 'react-native';
import { ThemeShade } from '../theme/palette';
import { formatPesoNumber, parsePesoInput } from '../utils/numberFormat';

interface BudgetStepperRowProps {
  label: string;
  hint: string;
  value: number;
  shade: ThemeShade;
  onChange: (next: number) => void;
}

/**
 * Clean minimalist Philippine Peso (₱) numeric input card (direct typing, no +/- buttons).
 */
export const BudgetStepperRow: React.FC<BudgetStepperRowProps> = ({
  label,
  hint,
  value,
  shade,
  onChange,
}) => {
  const focusScale = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    Animated.spring(focusScale, {
      toValue: 1.015,
      speed: 32,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    Animated.spring(focusScale, {
      toValue: 1,
      speed: 28,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  };

  const handleTextChange = (text: string) => {
    onChange(Math.max(0, parsePesoInput(text)));
  };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: shade.card,
          borderColor: shade.border,
          transform: [{ scale: focusScale }],
        },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: shade.text }]}>{label}</Text>
        <Text style={[styles.hint, { color: shade.muted }]}>{hint}</Text>
      </View>

      <View
        style={[
          styles.inputWrap,
          { backgroundColor: shade.surface, borderColor: shade.border },
        ]}
      >
        <Text style={[styles.pesoPrefix, { color: shade.accent }]}>₱</Text>
        <TextInput
          value={formatPesoNumber(value)}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={shade.muted}
          selectTextOnFocus
          style={[styles.inputField, { color: shade.text }]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  topRow: {
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 11,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pesoPrefix: {
    fontSize: 17,
    fontWeight: '800',
    marginRight: 6,
  },
  inputField: {
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
    paddingVertical: 0,
  },
});
