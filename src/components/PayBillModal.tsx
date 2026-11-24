import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  useBudgetActions,
  useThemePrefs,
  useWallet,
} from '../context/BudgetContext';
import { BillItem } from '../types/budget';
import { formatOrdinal, formatPesoNumber, parsePesoInput } from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { FormModal } from './FormModal';
import { PaymentSourcePicker } from './form/PaymentSourcePicker';
import { PesoAmountInput } from './form/PesoAmountInput';

interface PayBillModalProps {
  bill: BillItem | null;
  onClose: () => void;
}

const PayBillModalContent: React.FC<{
  bill: BillItem;
  onClose: () => void;
}> = ({ bill, onClose }) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { cashOnHand, banks, creditCards } = useWallet();
  const { markBillPaid } = useBudgetActions();

  const snapshotRef = useRef({ banks });
  snapshotRef.current = { banks };

  const [amountText, setAmountText] = useState(() =>
    formatPesoNumber(bill.amount)
  );
  const [sourceId, setSourceId] = useState(() =>
    snapshotRef.current.banks.length > 0
      ? snapshotRef.current.banks[0].id
      : 'cash'
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setAmountText(formatPesoNumber(bill.amount));
    setSourceId(
      snapshotRef.current.banks.length > 0
        ? snapshotRef.current.banks[0].id
        : 'cash'
    );
    setFormError(null);
  }, [bill]);

  const numericAmount = parsePesoInput(amountText);

  const handleConfirm = () => {
    if (numericAmount <= 0) {
      setFormError('Please enter a bill payment greater than ₱0.');
      return;
    }
    setFormError(null);
    markBillPaid(bill.id, sourceId, numericAmount);
    onClose();
  };

  return (
    <FormModal
      visible
      title={`Pay ${bill.name}`}
      subtitle={
        typeof bill.dueDay === 'number'
          ? `Due every ${formatOrdinal(bill.dueDay)} of the month`
          : 'Mark settled for this month'
      }
      icon={bill.icon || 'file-text'}
      accentColor={shade.positive}
      onClose={onClose}
    >
      <PesoAmountInput
        value={amountText}
        onChangeText={(formatted) => {
          setAmountText(formatted);
          if (formError) setFormError(null);
        }}
        shade={shade}
        accentColor={shade.positive}
        borderColor={formError ? shade.warning : shade.positive}
        placeholder="Actual amount paid"
        autoFocus
        inputAccessibilityLabel="Bill payment amount"
        containerStyle={styles.amountBox}
        inputStyle={styles.amountInput}
      />

      <PaymentSourcePicker
        label="PAY FROM ACCOUNT"
        selectedId={sourceId}
        onSelect={setSourceId}
        cashOnHand={cashOnHand}
        banks={banks}
        creditCards={creditCards}
        shade={shade}
        formatVisiblePeso={formatVisiblePeso}
        includeTrackOnly
        trackOnlyId="none"
        trackOnlyLabel="Track Only"
        trackOnlySubLabel="No deduction"
        creditCardSubMode="avail"
      />

      <Text style={[styles.hintText, { color: shade.muted }]}>
        Fixed bills are already carved out of your daily budget—paying updates your
        wallet balance only.
      </Text>

      {formError ? (
        <Text style={[styles.errorText, { color: shade.warning }]}>
          {formError}
        </Text>
      ) : null}

      <ScalePressable
        onPress={handleConfirm}
        accessibilityRole="button"
        accessibilityLabel={`Mark ${bill.name} paid for ${formatVisiblePeso(
          numericAmount
        )}`}
        style={[
          styles.confirmBtn,
          {
            backgroundColor:
              numericAmount > 0 ? shade.positiveBtnBg : shade.surface,
            opacity: numericAmount > 0 ? 1 : 0.72,
          },
        ]}
      >
        <Text
          style={[
            styles.confirmText,
            { color: numericAmount > 0 ? '#FFFFFF' : shade.muted },
          ]}
        >
          {numericAmount > 0
            ? `Mark Paid (${formatVisiblePeso(numericAmount)})`
            : 'Enter Amount to Pay'}
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

/**
 * Actionable modal for marking a monthly fixed bill paid without double-counting against daily spend.
 */
export const PayBillModal: React.FC<PayBillModalProps> = ({ bill, onClose }) => {
  if (!bill) return null;
  return <PayBillModalContent bill={bill} onClose={onClose} />;
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
  hintText: {
    fontSize: 11,
    lineHeight: 16,
  },
  errorText: {
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
