import React, { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { ScalePressable } from '../../components/AnimatedPrimitives';
import { FormModal } from '../../components/FormModal';
import { PesoAmountInput } from '../../components/form/PesoAmountInput';
import { useBudgetActions, useThemePrefs } from '../../context/BudgetContext';
import { parsePesoInput } from '../../utils/numberFormat';

interface AddBankModalProps {
  visible: boolean;
  onClose: () => void;
}

const AddBankModalContent: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const { shade } = useThemePrefs();
  const { addBank } = useBudgetActions();

  const [bankName, setBankName] = useState('');
  const [bankBalanceText, setBankBalanceText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isBankFormValid = Boolean(bankName.trim());

  const handleCreateBank = () => {
    if (!bankName.trim()) {
      setFormError('Please enter a bank or e-wallet name.');
      return;
    }
    const bal = parsePesoInput(bankBalanceText);
    setFormError(null);
    addBank(bankName, bal);
    onClose();
  };

  return (
    <FormModal
      visible
      title="Add Bank Account"
      subtitle="Track your bank or e-wallet balance"
      icon="briefcase"
      onClose={onClose}
    >
      <TextInput
        value={bankName}
        onChangeText={(t) => {
          setBankName(t);
          if (formError) setFormError(null);
        }}
        placeholder="Bank / E-Wallet name (e.g., BPI, Maya)"
        placeholderTextColor={shade.muted}
        autoFocus
        style={[
          styles.textInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      <PesoAmountInput
        value={bankBalanceText}
        onChangeText={setBankBalanceText}
        shade={shade}
        placeholder="Current balance"
        inputAccessibilityLabel="Current bank balance"
      />

      {formError && (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {formError}
        </Text>
      )}

      <ScalePressable
        onPress={handleCreateBank}
        accessibilityState={{ disabled: !isBankFormValid }}
        style={[
          styles.submitBtn,
          {
            backgroundColor: isBankFormValid ? shade.accent : shade.surface,
            opacity: isBankFormValid ? 1 : 0.75,
          },
        ]}
      >
        <Text
          style={[
            styles.submitText,
            { color: isBankFormValid ? shade.accentText : shade.muted },
          ]}
        >
          Save Bank Account
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

/**
 * Modal dialog for adding a new bank account or e-wallet.
 */
export const AddBankModal: React.FC<AddBankModalProps> = ({
  visible,
  onClose,
}) => {
  if (!visible) return null;
  return <AddBankModalContent onClose={onClose} />;
};

const styles = StyleSheet.create({
  textInput: {
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  submitBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 13,
    fontWeight: '800',
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
