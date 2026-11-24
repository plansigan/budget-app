import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useBudgetActions, useThemePrefs } from '../context/BudgetContext';
import { roundCurrency } from '../state/budgetMath';
import { DebtItem } from '../types/budget';
import { formatPesoNumber, parsePesoInput } from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { DebtAccountingOptions } from './DebtAccountingOptions';
import { FormModal } from './FormModal';
import { PesoAmountInput } from './form/PesoAmountInput';

interface DebtPaymentModalProps {
  debt: DebtItem | null;
  onClose: () => void;
}

const DebtPaymentModalContent: React.FC<{
  debt: DebtItem;
  onClose: () => void;
}> = ({ debt, onClose }) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { recordDebtPayment } = useBudgetActions();

  const remaining = roundCurrency(Math.max(0, debt.amount - debt.paidAmount));
  const [amountText, setAmountText] = useState(() =>
    formatPesoNumber(remaining)
  );
  const [sourceId, setSourceId] = useState('none');
  const [affectsDaily, setAffectsDaily] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const rem = roundCurrency(Math.max(0, debt.amount - debt.paidAmount));
    setAmountText(formatPesoNumber(rem));
    setSourceId('none');
    setAffectsDaily(false);
    setFormError(null);
  }, [debt]);

  const numericAmount = parsePesoInput(amountText);
  const appliedAmount = roundCurrency(Math.min(numericAmount, remaining));
  const exceedsRemaining = remaining > 0 && numericAmount > remaining;
  const isOutflow = debt.direction === 'i_owe';
  const accentColor = isOutflow ? shade.accent : shade.positive;
  const submitBg = isOutflow ? shade.accent : shade.positiveBtnBg;
  const submitFg = isOutflow ? shade.accentText : '#FFFFFF';
  const isValid = appliedAmount > 0;

  const handleConfirm = () => {
    if (remaining <= 0) {
      setFormError('This debt is already settled.');
      return;
    }
    if (numericAmount <= 0 || appliedAmount <= 0) {
      setFormError('Please enter a payment amount greater than ₱0.00.');
      return;
    }
    setFormError(null);
    recordDebtPayment(
      debt.id,
      appliedAmount,
      sourceId === 'none' ? undefined : sourceId,
      affectsDaily
    );
    onClose();
  };

  return (
    <FormModal
      visible
      title={isOutflow ? `Pay ${debt.personName}` : `Received from ${debt.personName}`}
      subtitle={`Remaining: ${formatVisiblePeso(remaining)}${
        debt.note ? ` • ${debt.note}` : ''
      }`}
      icon={isOutflow ? 'arrow-up-right' : 'arrow-down-left'}
      accentColor={accentColor}
      onClose={onClose}
    >
      <PesoAmountInput
        value={amountText}
        onChangeText={(formatted) => {
          setAmountText(formatted);
          if (formError) setFormError(null);
        }}
        shade={shade}
        accentColor={accentColor}
        borderColor={accentColor}
        placeholder="0.00"
        autoFocus
        inputAccessibilityLabel="Debt payment amount"
        containerStyle={styles.amountBox}
        inputStyle={styles.amountInput}
      />

      {exceedsRemaining && (
        <Text style={[styles.capNotice, { color: shade.dopamine }]}>
          Exceeds remaining balance — capped to {formatVisiblePeso(appliedAmount)}.
        </Text>
      )}

      <DebtAccountingOptions
        isOutflow={isOutflow}
        sourceId={sourceId}
        onSelectSource={setSourceId}
        affectsDaily={affectsDaily}
        onToggleDaily={() => setAffectsDaily((v) => !v)}
      />

      {formError ? (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {formError}
        </Text>
      ) : null}

      <ScalePressable
        onPress={handleConfirm}
        accessibilityRole="button"
        style={[
          styles.confirmBtn,
          {
            backgroundColor: isValid ? submitBg : shade.surface,
            opacity: isValid ? 1 : 0.75,
          },
        ]}
      >
        <Text
          style={[
            styles.confirmText,
            { color: isValid ? submitFg : shade.muted },
          ]}
        >
          {appliedAmount > 0
            ? isOutflow
              ? `Pay ${formatVisiblePeso(appliedAmount)}`
              : `Mark ${formatVisiblePeso(appliedAmount)} Received`
            : 'Enter Amount'}
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

/**
 * Modal for recording partial or full settlement of a personal I Owe / Owed to Me debt.
 */
export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  debt,
  onClose,
}) => {
  if (!debt) return null;
  return <DebtPaymentModalContent key={debt.id} debt={debt} onClose={onClose} />;
};

const styles = StyleSheet.create({
  amountBox: {
    borderRadius: 14,
    borderWidth: 1.4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amountInput: {
    fontSize: 22,
  },
  capNotice: {
    fontSize: 11,
    fontWeight: '700',
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confirmBtn: {
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
