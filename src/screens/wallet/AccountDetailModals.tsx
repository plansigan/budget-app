import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScalePressable } from '../../components/AnimatedPrimitives';
import { FormModal } from '../../components/FormModal';
import { PaymentSourcePicker } from '../../components/form/PaymentSourcePicker';
import { PesoAmountInput } from '../../components/form/PesoAmountInput';
import { SpendCategoryPicker } from '../../components/form/SpendCategoryPicker';
import { SPEND_CATEGORIES } from '../../components/AppIcon';
import {
  useBudgetActions,
  useThemePrefs,
  useWallet,
} from '../../context/BudgetContext';
import {
  BankAccount,
  CreditCardAccount,
  SpendCategoryKey,
} from '../../types/budget';
import { formatPesoNumber, parsePesoInput } from '../../utils/numberFormat';

export type AccountActionMode = 'deposit' | 'spend' | 'adjust' | null;

interface AccountActionModalProps {
  mode: AccountActionMode;
  selectedAccountId: string;
  accountTitle: string;
  isCreditCard: boolean;
  currentBalance: number;
  onClose: () => void;
}

const AccountActionModalContent: React.FC<
  Omit<AccountActionModalProps, 'mode'> & {
    mode: Exclude<AccountActionMode, null>;
  }
> = ({
  mode,
  selectedAccountId,
  accountTitle,
  isCreditCard,
  currentBalance,
  onClose,
}) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { cashOnHand, banks } = useWallet();
  const {
    depositToWalletAccount,
    transferBetweenAccounts,
    setAccountBalanceWithLog,
    logSpend,
  } = useBudgetActions();

  const [amountText, setAmountText] = useState(() =>
    mode === 'adjust' ? formatPesoNumber(currentBalance) : ''
  );
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<SpendCategoryKey>('food');
  const [icon, setIcon] = useState<string>('shopping-bag');
  const [payFromSourceId, setPayFromSourceId] = useState<string>('external');

  const snapshotRef = useRef({ banks, cashOnHand, currentBalance });
  snapshotRef.current = { banks, cashOnHand, currentBalance };

  useEffect(() => {
    setAmountText(
      mode === 'adjust'
        ? formatPesoNumber(snapshotRef.current.currentBalance)
        : ''
    );
    setNote('');
    setCategory('food');
    setIcon('shopping-bag');
    if (mode === 'deposit' && isCreditCard) {
      const fundedBank = snapshotRef.current.banks.find((b) => b.balance > 0);
      if (fundedBank) {
        setPayFromSourceId(fundedBank.id);
      } else if (snapshotRef.current.cashOnHand > 0) {
        setPayFromSourceId('cash');
      } else {
        setPayFromSourceId('external');
      }
    }
  }, [mode, isCreditCard, selectedAccountId]);

  const numericActionAmt = parsePesoInput(amountText);

  const isCardTransfer =
    mode === 'deposit' && isCreditCard && payFromSourceId !== 'external';
  const sourceBalance = isCardTransfer
    ? payFromSourceId === 'cash'
      ? cashOnHand
      : banks.find((b) => b.id === payFromSourceId)?.balance ?? 0
    : 0;
  const sourceLabel = isCardTransfer
    ? payFromSourceId === 'cash'
      ? 'Physical Cash'
      : banks.find((b) => b.id === payFromSourceId)?.name || 'Bank Account'
    : '';
  const isOverdraft =
    isCardTransfer && numericActionAmt > 0 && numericActionAmt > sourceBalance;

  const isSubmitDisabled =
    mode === 'adjust'
      ? !amountText.trim()
      : numericActionAmt <= 0 || isOverdraft;

  const handleSubmit = () => {
    if (isSubmitDisabled) return;

    if (mode === 'adjust') {
      setAccountBalanceWithLog(
        selectedAccountId,
        numericActionAmt,
        note.trim() || undefined
      );
      onClose();
      return;
    }

    if (mode === 'deposit') {
      if (numericActionAmt <= 0) return;
      if (isCardTransfer) {
        const ok = transferBetweenAccounts(
          payFromSourceId,
          selectedAccountId,
          numericActionAmt,
          note.trim() || undefined
        );
        if (!ok) return;
      } else {
        depositToWalletAccount(
          selectedAccountId,
          numericActionAmt,
          note.trim() || undefined
        );
      }
      onClose();
      return;
    }

    const defaultCatLabel =
      SPEND_CATEGORIES.find((c) => c.key === category)?.label || 'Wallet Spend';
    logSpend(
      numericActionAmt,
      note.trim() || defaultCatLabel,
      icon,
      selectedAccountId,
      category
    );
    onClose();
  };

  const accentColor =
    mode === 'deposit'
      ? shade.positive
      : mode === 'adjust'
      ? shade.dopamine
      : shade.accent;

  const submitBg = isSubmitDisabled
    ? shade.surface
    : mode === 'deposit'
    ? shade.positiveBtnBg
    : mode === 'spend'
    ? shade.accent
    : shade.dopamineBtnBg;

  const submitFg = isSubmitDisabled
    ? shade.muted
    : mode === 'spend'
    ? shade.accentText
    : '#FFFFFF';

  return (
    <FormModal
      visible
      title={
        mode === 'deposit'
          ? isCreditCard
            ? `Pay ${accountTitle}`
            : `Deposit to ${accountTitle}`
          : mode === 'spend'
          ? `Spend from ${accountTitle}`
          : isCreditCard
          ? `Update ${accountTitle} Used`
          : `Update ${accountTitle}`
      }
      subtitle="Enter exact peso amount"
      icon={
        mode === 'deposit'
          ? 'arrow-down-left'
          : mode === 'spend'
          ? 'arrow-up-right'
          : 'edit-2'
      }
      accentColor={accentColor}
      onClose={onClose}
    >
      <PesoAmountInput
        value={amountText}
        onChangeText={setAmountText}
        shade={shade}
        accentColor={accentColor}
        placeholder="Enter exact amount"
        autoFocus
        selectTextOnFocus={mode === 'adjust'}
        inputAccessibilityLabel={
          mode === 'adjust'
            ? isCreditCard
              ? 'New credit card used balance'
              : 'New account balance'
            : 'Amount in pesos'
        }
      />

      {mode === 'deposit' && isCreditCard && (
        <PaymentSourcePicker
          selectedId={payFromSourceId}
          onSelect={setPayFromSourceId}
          cashOnHand={cashOnHand}
          banks={banks}
          creditCards={[]}
          shade={shade}
          formatVisiblePeso={formatVisiblePeso}
          activeColor={shade.positiveBtnBg}
          includeCash
          includeTrackOnly
          trackOnlyId="external"
          trackOnlyLabel="Track Only"
          trackOnlySubLabel="External"
          trackOnlyActiveColor={shade.accent}
          label="PAY FROM ACCOUNT"
        />
      )}

      {isOverdraft && (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          Exceeds {sourceLabel} balance ({formatVisiblePeso(sourceBalance)}). Use
          Track Only or choose another source.
        </Text>
      )}

      {mode === 'spend' && (
        <SpendCategoryPicker
          selectedKey={category}
          onSelect={(cat) => {
            setCategory(cat.key);
            setIcon(cat.icon);
          }}
          shade={shade}
          label="CATEGORY"
        />
      )}

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={
          mode === 'deposit'
            ? 'Note (e.g., Payroll, Cash-in)'
            : mode === 'spend'
            ? 'What did you buy? (e.g., Groceries)'
            : 'Reason (optional)'
        }
        placeholderTextColor={shade.muted}
        style={[
          styles.textInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      <ScalePressable
        disabled={isSubmitDisabled}
        onPress={handleSubmit}
        accessibilityState={{ disabled: isSubmitDisabled }}
        style={[
          styles.submitBtn,
          {
            backgroundColor: submitBg,
            opacity: isSubmitDisabled ? 0.65 : 1,
          },
        ]}
      >
        <Text style={[styles.submitText, { color: submitFg }]}>
          {mode === 'deposit'
            ? isCreditCard
              ? payFromSourceId !== 'external'
                ? 'Confirm Card Payment'
                : 'Log Card Payment'
              : 'Confirm Deposit & Log'
            : mode === 'spend'
            ? 'Spend & Log Transaction'
            : isCreditCard
            ? 'Save Used'
            : 'Save Balance'}
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

/**
 * Modal for depositing, paying a credit card, spending, or adjusting an account balance.
 */
export const AccountActionModal: React.FC<AccountActionModalProps> = (
  props
) => {
  if (!props.mode) return null;
  return <AccountActionModalContent {...props} mode={props.mode} />;
};

interface EditAccountModalProps {
  visible: boolean;
  selectedBank?: BankAccount;
  selectedCard?: CreditCardAccount;
  onClose: () => void;
}

const EditAccountModalContent: React.FC<
  Omit<EditAccountModalProps, 'visible'>
> = ({ selectedBank, selectedCard, onClose }) => {
  const { shade } = useThemePrefs();
  const { updateBank, updateCreditCard } = useBudgetActions();

  const [editName, setEditName] = useState(
    selectedBank ? selectedBank.name : selectedCard ? selectedCard.name : ''
  );
  const [editLimitText, setEditLimitText] = useState(
    selectedCard ? formatPesoNumber(selectedCard.limit) : ''
  );
  const [editCutoffText, setEditCutoffText] = useState(
    selectedCard ? String(selectedCard.cutoffDay) : ''
  );
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setEditError(null);
    if (selectedBank) {
      setEditName(selectedBank.name);
      setEditLimitText('');
      setEditCutoffText('');
    } else if (selectedCard) {
      setEditName(selectedCard.name);
      setEditLimitText(formatPesoNumber(selectedCard.limit));
      setEditCutoffText(String(selectedCard.cutoffDay));
    }
  }, [selectedBank, selectedCard]);

  const handleSave = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError(
        selectedCard
          ? 'Please enter a credit card name.'
          : 'Please enter a bank or e-wallet name.'
      );
      return;
    }
    if (selectedBank) {
      updateBank(selectedBank.id, trimmed);
      onClose();
      return;
    }
    if (selectedCard) {
      const limit = parsePesoInput(editLimitText);
      if (limit <= 0) {
        setEditError('Please enter a credit limit greater than ₱0.');
        return;
      }
      const parsedCutoff = parseInt(editCutoffText.replace(/[^0-9]/g, ''), 10);
      if (
        !editCutoffText.trim() ||
        !Number.isFinite(parsedCutoff) ||
        parsedCutoff < 1 ||
        parsedCutoff > 31
      ) {
        setEditError('Statement cut-off day must be between 1 and 31.');
        return;
      }
      updateCreditCard(selectedCard.id, trimmed, limit, parsedCutoff);
      onClose();
    }
  };

  return (
    <FormModal
      visible
      title={selectedCard ? 'Edit Credit Card' : 'Edit Bank Account'}
      subtitle={
        selectedCard
          ? 'Update card name, credit limit, or cut-off date'
          : 'Rename this bank or e-wallet without losing logs'
      }
      icon="edit-2"
      accentColor={selectedCard ? shade.dopamine : shade.accent}
      onClose={onClose}
    >
      <Text style={[styles.catLabel, { color: shade.muted }]}>
        ACCOUNT NAME
      </Text>
      <TextInput
        value={editName}
        onChangeText={(t) => {
          setEditName(t);
          if (editError) setEditError(null);
        }}
        placeholder={
          selectedCard ? 'Card name (e.g., BDO Visa)' : 'Bank name (e.g., BPI)'
        }
        placeholderTextColor={shade.muted}
        autoFocus
        accessibilityLabel="Account name"
        style={[
          styles.textInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      {selectedCard && (
        <View style={styles.editTwoCols}>
          <View style={{ flex: 2, minWidth: 0, gap: 4 }}>
            <Text style={[styles.catLabel, { color: shade.muted }]}>
              CREDIT LIMIT
            </Text>
            <PesoAmountInput
              value={editLimitText}
              onChangeText={(t) => {
                setEditLimitText(t);
                if (editError) setEditError(null);
              }}
              shade={shade}
              accentColor={shade.dopamine}
              placeholder="Limit"
              inputAccessibilityLabel="Credit limit"
            />
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={[styles.catLabel, { color: shade.muted }]}>
              CUT-OFF DAY
            </Text>
            <TextInput
              value={editCutoffText}
              onChangeText={(t) => {
                setEditCutoffText(t.replace(/[^0-9]/g, '').slice(0, 2));
                if (editError) setEditError(null);
              }}
              keyboardType="numeric"
              maxLength={2}
              placeholder="1–31"
              placeholderTextColor={shade.muted}
              accessibilityLabel="Statement cut-off day"
              style={[
                styles.textInput,
                {
                  backgroundColor: shade.surface,
                  color: shade.text,
                  borderColor: shade.border,
                  textAlign: 'center',
                  fontWeight: '800',
                },
              ]}
            />
          </View>
        </View>
      )}

      {editError && (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {editError}
        </Text>
      )}

      <ScalePressable
        onPress={handleSave}
        style={[
          styles.submitBtn,
          {
            backgroundColor: selectedCard
              ? shade.dopamineBtnBg
              : shade.accent,
          },
        ]}
      >
        <Text
          style={[
            styles.submitText,
            { color: selectedCard ? '#FFFFFF' : shade.accentText },
          ]}
        >
          Save Changes
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

/**
 * Modal for renaming a bank account or editing a credit card's limit and cut-off date.
 */
export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  visible,
  selectedBank,
  selectedCard,
  onClose,
}) => {
  if (!visible || (!selectedBank && !selectedCard)) return null;
  return (
    <EditAccountModalContent
      selectedBank={selectedBank}
      selectedCard={selectedCard}
      onClose={onClose}
    />
  );
};

const styles = StyleSheet.create({
  catLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
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
  editTwoCols: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
