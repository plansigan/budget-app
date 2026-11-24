import React, { useEffect, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { ThemeShade } from '../../theme/palette';
import {
  formatPesoInput,
  formatPesoNumber,
  parsePesoInput,
} from '../../utils/numberFormat';

export interface InlinePesoInputProps {
  value: number;
  onCommit: (nextValue: number) => void;
  onLiveChange?: (nextValue: number) => void;
  onFocusChange?: (focused: boolean) => void;
  shade: ThemeShade;
  privacyMode?: boolean;
  accessibilityLabel: string;
  width?: number;
  prefixColor?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<import('react-native').TextStyle>;
}

/**
 * Compact inline editable Philippine Peso box for stepper rows and monthly bills.
 * Masks unfocused values behind •••• when Privacy Mode is enabled.
 */
export const InlinePesoInput: React.FC<InlinePesoInputProps> = ({
  value,
  onCommit,
  onLiveChange,
  onFocusChange,
  shade,
  privacyMode = false,
  accessibilityLabel,
  width,
  prefixColor,
  textColor,
  backgroundColor,
  borderColor,
  placeholder = '0',
  containerStyle,
  inputStyle,
}) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() =>
    value > 0 ? formatPesoNumber(value) : ''
  );

  useEffect(() => {
    if (!focused) {
      setDraft(value > 0 ? formatPesoNumber(value) : '');
    }
  }, [value, focused]);

  const handleFocus = () => {
    setDraft(value > 0 ? formatPesoNumber(value) : '');
    setFocused(true);
    onFocusChange?.(true);
  };

  const handleEndEditing = () => {
    setFocused(false);
    onFocusChange?.(false);
    const parsed = Math.max(0, parsePesoInput(draft));
    onCommit(parsed);
    setDraft(parsed > 0 ? formatPesoNumber(parsed) : '');
  };

  const showMasked = privacyMode && !focused;

  return (
    <View
      style={[
        styles.box,
        width !== undefined ? { width } : null,
        {
          backgroundColor: backgroundColor || shade.surface,
          borderColor: borderColor || shade.border,
        },
        containerStyle,
      ]}
    >
      <Text
        accessible={false}
        style={[styles.prefix, { color: prefixColor || shade.muted }]}
      >
        ₱
      </Text>
      <TextInput
        value={showMasked ? '••••' : draft}
        onChangeText={(text) => {
          if (showMasked) return;
          const formatted = formatPesoInput(text);
          setDraft(formatted);
          onLiveChange?.(Math.max(0, parsePesoInput(formatted)));
        }}
        onFocus={handleFocus}
        onBlur={handleEndEditing}
        onSubmitEditing={handleEndEditing}
        keyboardType="decimal-pad"
        inputMode="decimal"
        selectTextOnFocus={!privacyMode}
        placeholder={placeholder}
        placeholderTextColor={shade.muted}
        accessibilityLabel={accessibilityLabel}
        style={[styles.input, { color: textColor || shade.text }, inputStyle]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 0,
  },
  prefix: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 3,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    paddingVertical: 1,
  },
});
