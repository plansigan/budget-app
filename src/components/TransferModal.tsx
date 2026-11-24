import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import {
  useBudgetActions,
  useThemePrefs,
  useWallet,
} from '../context/BudgetContext';
import { triggerLightHaptic } from '../utils/haptics';
import { parsePesoInput } from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { FormModal } from './FormModal';
import { PaymentSourcePicker } from './form/PaymentSourcePicker';
import { PesoAmountInput } from './form/PesoAmountInput';

interface TransferModalProps {
  visible: boolean;
  initialFromId?: string | null;
  initialToId?: string | null;
  onClose: () => void;
}

const TransferModalContent: React.FC<Omit<TransferModalProps, 'visible'>> = ({
  initialFromId = null,
  initialToId = null,
  onClose,
}) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { cashOnHand, banks, creditCards } = useWallet();
  const { transferBetweenAccounts } = useBudgetActions();

  const [fromId, setFromId] = useState<string>('cash');
  const [toId, setToId] = useState<string>('');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');

  const snapshotRef = useRef({ banks, creditCards });
  snapshotRef.current = { banks, creditCards };

  useEffect(() => {
    const { banks: bList, creditCards: cList } = snapshotRef.current;
    const validFromIds = ['cash', ...bList.map((b) => b.id)];
    const validDestIds = ['cash', ...bList.map((b) => b.id), ...cList.map((c) => c.id)];

    const preferredFrom =
      initialFromId && validFromIds.includes(initialFromId)
        ? initialFromId
        : bList[0]?.id || 'cash';
    const remainingDests = validDestIds.filter((id) => id !== preferredFrom);
    const preferredTo =
      initialToId && remainingDests.includes(initialToId)
        ? initialToId
        : remainingDests[0] || '';

    setFromId(preferredFrom);
    setToId(preferredTo);
    setAmountText('');
    setNote('');
  }, [initialFromId, initialToId]);

  const allDests = [
    { id: 'cash', label: 'Cash', isCard: false },
    ...banks.map((b) => ({ id: b.id, label: b.name, isCard: false })),
    ...creditCards.map((c) => ({ id: c.id, label: c.name, isCard: true })),
  ].filter((o) => o.id !== fromId);

  const selectedDest = allDests.find((o) => o.id === toId) || allDests[0] || null;
  const effectiveToId = selectedDest ? selectedDest.id : '';

  const sourceAccount =
    fromId === 'cash'
      ? { label: 'Cash', balance: cashOnHand }
      : (() => {
          const bank = banks.find((b) => b.id === fromId);
          return bank
            ? { label: bank.name, balance: bank.balance }
            : { label: 'Account', balance: 0 };
        })();

  const numericAmount = parsePesoInput(amountText);
  const hasOverdraft = numericAmount > sourceAccount.balance;
  const hasDestOptions = allDests.length > 0;
  const canSubmit =
    Boolean(fromId) &&
    Boolean(selectedDest) &&
    fromId !== effectiveToId &&
    numericAmount > 0 &&
    !hasOverdraft;

  const isCardPayment = Boolean(selectedDest?.isCard);
  const accentColor = isCardPayment ? shade.positive : shade.accent;
  const activeSubmitBg = isCardPayment ? shade.positiveBtnBg : shade.accent;
  const activeSubmitFg = isCardPayment ? '#FFFFFF' : shade.accentText;

  const handleSelectFrom = (nextFrom: string) => {
    triggerLightHaptic();
    setFromId(nextFrom);
    if (nextFrom === toId) {
      const nextDest = [
        { id: 'cash' },
        ...banks.map((b) => ({ id: b.id })),
        ...creditCards.map((c) => ({ id: c.id })),
      ].find((o) => o.id !== nextFrom);
      setToId(nextDest ? nextDest.id : '');
    }
  };

  const handleConfirm = () => {
    if (!canSubmit || !selectedDest) return;
    const ok = transferBetweenAccounts(
      fromId,
      selectedDest.id,
      numericAmount,
      note.trim() || undefined
    );
    if (ok) {
      onClose();
    }
  };

  return (
    <FormModal
      visible
      title={
        isCardPayment && selectedDest
          ? `Pay ${selectedDest.label}`
          : 'Transfer Money'
      }
      subtitle="Move funds between Cash, Banks, or pay a Credit Card"
      icon={isCardPayment ? 'credit-card' : 'repeat'}
      accentColor={accentColor}
      onClose={onClose}
    >
      <PaymentSourcePicker
        label="FROM ACCOUNT"
        selectedId={fromId}
        onSelect={handleSelectFrom}
        cashOnHand={cashOnHand}
        banks={banks}
        shade={shade}
        formatVisiblePeso={formatVisiblePeso}
      />

      <PaymentSourcePicker
        label="TO ACCOUNT"
        selectedId={effectiveToId}
        onSelect={setToId}
        cashOnHand={cashOnHand}
        banks={banks}
        creditCards={creditCards}
        excludeIds={[fromId]}
        shade={shade}
        formatVisiblePeso={formatVisiblePeso}
        activeColor={isCardPayment ? shade.positiveBtnBg : shade.accent}
        activeTextColor={isCardPayment ? '#FFFFFF' : shade.accentText}
        creditCardSubMode="used"
        emptyNotice="Add another bank or credit card to transfer between accounts."
      />

      <PesoAmountInput
        value={amountText}
        onChangeText={setAmountText}
        shade={shade}
        accentColor={hasOverdraft ? shade.warning : accentColor}
        borderColor={hasOverdraft ? shade.warning : accentColor}
        placeholder="Enter exact amount"
        autoFocus
        inputAccessibilityLabel="Transfer amount"
        containerStyle={styles.amountBox}
        inputStyle={styles.amountInput}
      />

      {hasOverdraft && (
        <Text style={[styles.errorText, { color: shade.warning }]}>
          Insufficient balance in {sourceAccount.label} (available:{' '}
          {formatVisiblePeso(sourceAccount.balance)}).
        </Text>
      )}

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={
          isCardPayment
            ? 'Optional note (e.g., Statement balance)'
            : 'Optional note (e.g., Cash-in to GCash)'
        }
        placeholderTextColor={shade.muted}
        accessibilityLabel="Transfer note"
        style={[
          styles.noteInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      <ScalePressable
        disabled={!canSubmit}
        onPress={handleConfirm}
        accessibilityRole="button"
        style={[
          styles.submitBtn,
          {
            backgroundColor: canSubmit ? activeSubmitBg : shade.surface,
            opacity: canSubmit ? 1 : 0.65,
          },
        ]}
      >
        <Text
          style={[
            styles.submitText,
            { color: canSubmit ? activeSubmitFg : shade.muted },
          ]}
        >
          {!hasDestOptions
            ? 'Add Another Account to Transfer'
            : canSubmit && selectedDest
            ? isCardPayment
              ? `Pay ${selectedDest.label} ${formatVisiblePeso(numericAmount)}`
              : `Transfer ${formatVisiblePeso(numericAmount)}`
            : 'Enter Amount to Transfer'}
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

/**
 * Modal to transfer funds between Cash / Bank accounts or pay a Credit Card from a real account.
 */
export const TransferModal: React.FC<TransferModalProps> = (props) => {
  if (!props.visible) return null;
  return (
    <TransferModalContent
      initialFromId={props.initialFromId}
      initialToId={props.initialToId}
      onClose={props.onClose}
    />
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
  errorText: {
    fontSize: 12,
    fontWeight: '700',
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
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
