import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { ThemeShade } from '../theme/palette';
import { InlinePesoInput } from './form/InlinePesoInput';

interface BudgetStepperRowProps {
  label: string;
  hint: string;
  value: number;
  shade: ThemeShade;
  privacyMode?: boolean;
  onChange: (next: number) => void;
}

/**
 * Minimalist Philippine Peso (₱) numeric input card with optional Privacy Mode masking.
 */
export const BudgetStepperRow: React.FC<BudgetStepperRowProps> = ({
  label,
  hint,
  value,
  shade,
  privacyMode = false,
  onChange,
}) => {
  const focusScale = useRef(new Animated.Value(1)).current;

  const handleFocusChange = (focused: boolean) => {
    Animated.spring(focusScale, {
      toValue: focused ? 1.015 : 1,
      speed: focused ? 32 : 28,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
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

      <InlinePesoInput
        value={value}
        onCommit={onChange}
        onLiveChange={onChange}
        onFocusChange={handleFocusChange}
        shade={shade}
        privacyMode={privacyMode}
        accessibilityLabel={label}
        prefixColor={shade.accent}
        backgroundColor={shade.surface}
        borderColor={shade.border}
        containerStyle={styles.inputWrap}
        inputStyle={styles.inputField}
      />
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputField: {
    fontSize: 19,
  },
});
