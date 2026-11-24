import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useBudgetActions, useThemePrefs } from '../context/BudgetContext';
import { SpendCategoryKey, TransactionEntry } from '../types/budget';
import { classifySpendCategory } from '../utils/insightsEngine';
import { formatPesoNumber, parsePesoInput } from '../utils/numberFormat';
import { formatEntryDateLocal } from '../utils/transactionDisplay';
import { ScalePressable } from './AnimatedPrimitives';
import { FormModal } from './FormModal';
import { PesoAmountInput } from './form/PesoAmountInput';
import { SpendCategoryPicker } from './form/SpendCategoryPicker';

interface EditTransactionModalProps {
  entry: TransactionEntry | null;
  onClose: () => void;
}

/**
 * Modal to edit a logged transaction's amount, label/note, and category
 * while automatically reconciling linked Wallet, Allowance, Savings, or Treat balances.
 */
export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  entry,
  onClose,
}) => {
  const { shade } = useThemePrefs();
  const { editEntry } = useBudgetActions();

  const [amountText, setAmountText] = useState('');
  const [labelText, setLabelText] = useState('');
  const [category, setCategory] = useState<SpendCategoryKey>('other');
  const [icon, setIcon] = useState<string>('tag');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    setAmountText(formatPesoNumber(entry.amount));
    setLabelText(entry.label || '');
    const classified = classifySpendCategory(entry);
    const resolvedCat = (
      entry.category || classified.key
    ) as SpendCategoryKey;
    setCategory(resolvedCat);
    setIcon(entry.icon || classified.icon);
    setFormError(null);
  }, [entry]);

  if (!entry) return null;

  const isSpendEntry =
    entry.type === 'spend' || entry.type === 'envelope_spend';
  const numericAmount = parsePesoInput(amountText);
  const canSave = numericAmount > 0 && labelText.trim().length > 0;
  const dateStr = formatEntryDateLocal(entry);
  const contextLine = entry.paymentSourceLabel
    ? `${dateStr} • ${entry.paymentSourceLabel} — Balances update automatically`
    : `${dateStr} — Balances update automatically`;

  const isDopamine =
    entry.type === 'envelope_spend' || entry.type === 'treat_direct';
  const isPositive =
    entry.type === 'save_direct' || entry.type === 'wallet_deposit';

  const borderAccent = isDopamine
    ? shade.dopamine
    : isPositive
    ? shade.positive
    : shade.accent;
  const filledBtnBg = isDopamine
    ? shade.dopamineBtnBg
    : isPositive
    ? shade.positiveBtnBg
    : shade.accent;
  const filledBtnFg =
    !isDopamine && !isPositive ? shade.accentText : '#FFFFFF';

  const handleSave = () => {
    if (numericAmount <= 0) {
      setFormError('Please enter an amount greater than ₱0.00.');
      return;
    }
    if (!labelText.trim()) {
      setFormError('Please enter a note or description.');
      return;
    }
    setFormError(null);
    editEntry(entry.id, {
      amount: numericAmount,
      label: labelText.trim(),
      ...(isSpendEntry ? { category, icon } : {}),
    });
    onClose();
  };

  return (
    <FormModal
      visible={entry !== null}
      title="Edit Transaction"
      subtitle={contextLine}
      icon={icon || entry.icon}
      accentColor={borderAccent}
      onClose={onClose}
    >
      <PesoAmountInput
        value={amountText}
        onChangeText={(formatted) => {
          setAmountText(formatted);
          if (formError) setFormError(null);
        }}
        shade={shade}
        accentColor={borderAccent}
        borderColor={formError ? shade.warning : borderAccent}
        placeholder="Enter exact amount"
        autoFocus
        inputAccessibilityLabel="Edited transaction amount"
        containerStyle={styles.amountBox}
        inputStyle={styles.amountInput}
      />

      {isSpendEntry && (
        <SpendCategoryPicker
          label="CATEGORY"
          selectedKey={category}
          onSelect={(cat) => {
            setCategory(cat.key);
            setIcon(cat.icon);
          }}
          shade={shade}
          activeColor={filledBtnBg}
          activeTextColor={filledBtnFg}
        />
      )}

      <View style={{ gap: 6 }}>
        <Text style={[styles.sectionLabel, { color: shade.muted }]}>
          NOTE / LABEL
        </Text>
        <TextInput
          value={labelText}
          onChangeText={(t) => {
            setLabelText(t);
            if (formError) setFormError(null);
          }}
          placeholder="Description or merchant name"
          placeholderTextColor={shade.muted}
          accessibilityLabel="Transaction note or label"
          style={[
            styles.noteInput,
            {
              backgroundColor: shade.surface,
              color: shade.text,
              borderColor: shade.border,
            },
          ]}
        />
      </View>

      {formError ? (
        <Text style={[styles.errorText, { color: shade.warning }]}>
          {formError}
        </Text>
      ) : null}

      <ScalePressable
        onPress={handleSave}
        accessibilityRole="button"
        style={[
          styles.saveBtn,
          {
            backgroundColor: canSave ? filledBtnBg : shade.surface,
            opacity: canSave ? 1 : 0.72,
          },
        ]}
      >
        <Text
          style={[
            styles.saveText,
            { color: canSave ? filledBtnFg : shade.muted },
          ]}
        >
          Save Changes
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

const styles = StyleSheet.create({
  amountBox: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  amountInput: {
    fontSize: 21,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  noteInput: {
    width: '100%',
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
