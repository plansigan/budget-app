import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import {
  useBudgetActions,
  useThemePrefs,
  useWallet,
} from '../context/BudgetContext';
import { DebtDirection, DebtItem } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { formatPesoNumber, parsePesoInput } from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { DebtAccountingOptions } from './DebtAccountingOptions';
import { FormModal } from './FormModal';
import { PesoAmountInput } from './form/PesoAmountInput';
import { SegmentedTabBar } from './form/SegmentedTabBar';

interface AddEditDebtModalProps {
  visible: boolean;
  editingDebt?: DebtItem | null;
  defaultDirection?: DebtDirection;
  onClose: () => void;
}

const AddEditDebtModalContent: React.FC<
  Omit<AddEditDebtModalProps, 'visible'>
> = ({ editingDebt = null, defaultDirection = 'i_owe', onClose }) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { creditCards } = useWallet();
  const { addDebt, updateDebt } = useBudgetActions();

  const [direction, setDirection] = useState<DebtDirection>(() =>
    editingDebt ? editingDebt.direction : defaultDirection
  );
  const [personName, setPersonName] = useState(() =>
    editingDebt ? editingDebt.personName : ''
  );
  const [amountText, setAmountText] = useState(() =>
    editingDebt ? formatPesoNumber(editingDebt.amount) : ''
  );
  const [note, setNote] = useState(() => (editingDebt ? editingDebt.note || '' : ''));
  const [sourceId, setSourceId] = useState('none');
  const [affectsDaily, setAffectsDaily] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (editingDebt) {
      setDirection(editingDebt.direction);
      setPersonName(editingDebt.personName);
      setAmountText(formatPesoNumber(editingDebt.amount));
      setNote(editingDebt.note || '');
    } else {
      setDirection(defaultDirection);
      setPersonName('');
      setAmountText('');
      setNote('');
    }
    setSourceId('none');
    setAffectsDaily(false);
    setFormError(null);
  }, [editingDebt, defaultDirection]);

  const handleSelectDirection = (next: DebtDirection) => {
    setDirection(next);
    if (next === 'i_owe') {
      setAffectsDaily(false);
      if (creditCards.some((c) => c.id === sourceId)) {
        setSourceId('none');
      }
    }
  };

  const numericAmount = parsePesoInput(amountText);
  const isValid = Boolean(personName.trim()) && numericAmount > 0;
  const accentColor = direction === 'i_owe' ? shade.warning : shade.positive;
  const submitBtnBg =
    direction === 'i_owe' ? '#DC2626' : shade.positiveBtnBg;
  const belowPaidWarning =
    editingDebt &&
    editingDebt.paidAmount > 0 &&
    numericAmount > 0 &&
    numericAmount < editingDebt.paidAmount;

  const handleSave = () => {
    if (!personName.trim()) {
      setFormError('Please enter who this debt is with.');
      return;
    }
    if (numericAmount <= 0) {
      setFormError('Please enter an amount greater than ₱0.00.');
      return;
    }
    setFormError(null);
    triggerLightHaptic();

    if (editingDebt) {
      updateDebt(editingDebt.id, {
        direction,
        personName: personName.trim(),
        amount: numericAmount,
        note: note.trim() || undefined,
      });
    } else {
      addDebt({
        direction,
        personName: personName.trim(),
        amount: numericAmount,
        note: note.trim() || undefined,
        paymentSourceId: sourceId === 'none' ? undefined : sourceId,
        affectsDailyBudget: direction === 'owed_to_me' ? affectsDaily : false,
      });
    }
    onClose();
  };

  return (
    <FormModal
      visible
      title={editingDebt ? 'Edit Debt' : 'Add Debt'}
      subtitle={
        direction === 'i_owe'
          ? 'Money you borrowed and need to pay back'
          : 'Money someone owes back to you'
      }
      icon="users"
      accentColor={accentColor}
      onClose={onClose}
    >
      <SegmentedTabBar<DebtDirection>
        value={direction}
        onChange={handleSelectDirection}
        shade={shade}
        variant="card"
        activeTextColor={direction === 'i_owe' ? shade.warning : shade.positive}
        options={[
          { key: 'i_owe', label: 'I Owe' },
          { key: 'owed_to_me', label: 'Owed to Me' },
        ]}
      />

      <TextInput
        value={personName}
        onChangeText={(t) => {
          setPersonName(t);
          if (formError) setFormError(null);
        }}
        placeholder={
          direction === 'i_owe'
            ? 'Person name (e.g., Marco)'
            : 'Person name (e.g., Bea)'
        }
        placeholderTextColor={shade.muted}
        accessibilityLabel="Person name"
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
        value={amountText}
        onChangeText={(formatted) => {
          setAmountText(formatted);
          if (formError) setFormError(null);
        }}
        shade={shade}
        accentColor={accentColor}
        borderColor={accentColor}
        placeholder="0.00"
        inputAccessibilityLabel="Total debt amount"
        containerStyle={styles.amountBox}
        inputStyle={styles.amountInput}
      />

      {editingDebt && editingDebt.paidAmount > 0 && (
        <Text
          style={[
            styles.metaText,
            { color: belowPaidWarning ? shade.warning : shade.muted },
          ]}
        >
          {belowPaidWarning
            ? `Amount is below Paid so far (${formatVisiblePeso(
                editingDebt.paidAmount
              )}) — saving clamps paid total and marks settled.`
            : `Paid so far: ${formatVisiblePeso(editingDebt.paidAmount)}`}
        </Text>
      )}

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Optional note (e.g., Lunch split, Cab fare)"
        placeholderTextColor={shade.muted}
        accessibilityLabel="Debt note"
        style={[
          styles.textInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      {!editingDebt && (
        <DebtAccountingOptions
          isOutflow={direction === 'owed_to_me'}
          sourceId={sourceId}
          onSelectSource={setSourceId}
          affectsDaily={affectsDaily}
          onToggleDaily={() => setAffectsDaily((v) => !v)}
          showDailyToggle={direction === 'owed_to_me'}
        />
      )}

      {formError ? (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {formError}
        </Text>
      ) : null}

      <ScalePressable
        onPress={handleSave}
        accessibilityRole="button"
        style={[
          styles.confirmBtn,
          {
            backgroundColor: isValid ? submitBtnBg : shade.surface,
            opacity: isValid ? 1 : 0.75,
          },
        ]}
      >
        <Text
          style={[
            styles.confirmText,
            { color: isValid ? '#FFFFFF' : shade.muted },
          ]}
        >
          {editingDebt ? 'Save Changes' : 'Save Debt'}
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

/**
 * Modal for creating or editing an I Owe / Owed to Me debt record.
 */
export const AddEditDebtModal: React.FC<AddEditDebtModalProps> = ({
  visible,
  editingDebt = null,
  defaultDirection = 'i_owe',
  onClose,
}) => {
  if (!visible) return null;
  return (
    <AddEditDebtModalContent
      key={editingDebt?.id ?? `new-${defaultDirection}`}
      editingDebt={editingDebt}
      defaultDirection={defaultDirection}
      onClose={onClose}
    />
  );
};

const styles = StyleSheet.create({
  textInput: {
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: '600',
  },
  amountBox: {
    borderRadius: 14,
    borderWidth: 1.4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amountInput: {
    fontSize: 22,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
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
