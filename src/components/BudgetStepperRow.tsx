import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TextInput, View } from 'react-native';
import { ThemeShade } from '../theme/palette';
import {
  formatPesoInput,
  formatPesoNumber,
  parsePesoInput,
} from '../utils/numberFormat';

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
  const [isFocused, setIsFocused] = useState(false);
  const [draftText, setDraftText] = useState(() => formatPesoNumber(value));

  useEffect(() => {
    if (!isFocused) {
      setDraftText(formatPesoNumber(value));
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    setDraftText(formatPesoNumber(value));
    Animated.spring(focusScale, {
      toValue: 1.015,
      speed: 32,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = Math.max(0, parsePesoInput(draftText));
    onChange(parsed);
    setDraftText(formatPesoNumber(parsed));
    Animated.spring(focusScale, {
      toValue: 1,
      speed: 28,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  };

  const handleTextChange = (text: string) => {
    const formatted = formatPesoInput(text);
    setDraftText(formatted);
    onChange(Math.max(0, parsePesoInput(formatted)));
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
          value={isFocused ? draftText : formatPesoNumber(value)}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          inputMode="decimal"
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
    minWidth: 0,
    fontSize: 19,
    fontWeight: '800',
    paddingVertical: 0,
  },
});
