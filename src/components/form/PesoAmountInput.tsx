import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { ThemeShade } from '../../theme/palette';
import { formatPesoInput } from '../../utils/numberFormat';

export interface PesoAmountInputProps {
  value: string;
  onChangeText: (formatted: string) => void;
  shade: ThemeShade;
  accentColor?: string;
  borderColor?: string;
  backgroundColor?: string;
  placeholder?: string;
  autoFocus?: boolean;
  selectTextOnFocus?: boolean;
  disabled?: boolean;
  compact?: boolean;
  inputAccessibilityLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  rightAdornment?: React.ReactNode;
  testID?: string;
}

/**
 * Shared Philippine Peso input box with consistent numeric keypad, tabular digits,
 * automatic decimal sanitization, and narrow-screen safe shrinking.
 */
export const PesoAmountInput: React.FC<PesoAmountInputProps> = ({
  value,
  onChangeText,
  shade,
  accentColor,
  borderColor,
  backgroundColor,
  placeholder = '0.00',
  autoFocus = false,
  selectTextOnFocus = false,
  disabled = false,
  compact = false,
  inputAccessibilityLabel,
  containerStyle,
  inputStyle,
  rightAdornment,
  testID,
}) => {
  const effectiveAccent = accentColor || shade.accent;
  const effectiveBorder = borderColor || shade.border;
  const effectiveBg = backgroundColor || shade.surface;

  return (
    <View
      style={[
        styles.box,
        compact && styles.compactBox,
        {
          backgroundColor: effectiveBg,
          borderColor: effectiveBorder,
        },
        containerStyle,
      ]}
    >
      <Text
        accessible={false}
        style={[
          styles.prefix,
          compact && styles.compactPrefix,
          { color: effectiveAccent },
        ]}
      >
        ₱
      </Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={(text) => onChangeText(formatPesoInput(text))}
        keyboardType="decimal-pad"
        inputMode="decimal"
        editable={!disabled}
        autoFocus={autoFocus}
        selectTextOnFocus={selectTextOnFocus}
        placeholder={placeholder}
        placeholderTextColor={shade.muted}
        accessibilityLabel={inputAccessibilityLabel || placeholder}
        style={[
          styles.input,
          compact && styles.compactInput,
          { color: shade.text },
          inputStyle,
        ]}
      />
      {rightAdornment}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 0,
  },
  compactBox: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '800',
    marginRight: 6,
  },
  compactPrefix: {
    fontSize: 14,
    marginRight: 4,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    paddingVertical: 1,
  },
  compactInput: {
    fontSize: 15,
  },
});
