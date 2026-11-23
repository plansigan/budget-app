import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScalePressable } from '../../components/AnimatedPrimitives';
import { AppIcon, SPEND_CATEGORIES } from '../../components/AppIcon';
import { FormModal } from '../../components/FormModal';
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
import { triggerLightHaptic } from '../../utils/haptics';
import {
  formatPesoInput,
  formatPesoNumber,
  parsePesoInput,
} from '../../utils/numberFormat';

export type AccountActionMode = 'deposit' | 'spend' | 'adjust' | null;

interface AccountActionModalProps {
  mode: AccountActionMode;
  selectedAccountId: string;
  accountTitle: string;
  isCreditCard: boolean;
  onClose: () => void;
}

const AccountActionModalContent: React.FC<
  Omit<AccountActionModalProps, 'mode'> & {
    mode: Exclude<AccountActionMode, null>;
  }
> = ({ mode, selectedAccountId, accountTitle, isCreditCard, onClose }) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { cashOnHand, banks } = useWallet();
  const {
    depositToWalletAccount,
    transferBetweenAccounts,
    setAccountBalanceWithLog,
    logSpend,
  } = useBudgetActions();

  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<SpendCategoryKey>('food');
  const [icon, setIcon] = useState<string>('shopping-bag');
  const [payFromSourceId, setPayFromSourceId] = useState<string>('external');

  const fundingRef = useRef({ banks, cashOnHand });
  fundingRef.current = { banks, cashOnHand };

  useEffect(() => {
    setAmountText('');
    setNote('');
    setCategory('food');
    setIcon('shopping-bag');
    if (mode === 'deposit' && isCreditCard) {
      const fundedBank = fundingRef.current.banks.find((b) => b.balance > 0);
      if (fundedBank) {
        setPayFromSourceId(fundedBank.id);
      } else if (fundingRef.current.cashOnHand > 0) {
        setPayFromSourceId('cash');
      } else {
        setPayFromSourceId('external');
      }
    }
  }, [mode, isCreditCard, selectedAccountId]);

  const numericActionAmt = parsePesoInput(amountText);

  const handleSubmit = () => {
    if (mode === 'adjust') {
      setAccountBalanceWithLog(
        selectedAccountId,
        numericActionAmt,
        note.trim() || undefined
      );
    } else if (mode === 'deposit') {
      if (numericActionAmt <= 0) return;
      if (isCreditCard && payFromSourceId !== 'external') {
        transferBetweenAccounts(
          payFromSourceId,
          selectedAccountId,
          numericActionAmt,
          note.trim() || undefined
        );
      } else {
        depositToWalletAccount(
          selectedAccountId,
          numericActionAmt,
          note.trim() || undefined
        );
      }
    } else if (mode === 'spend') {
      if (numericActionAmt <= 0) return;
      const defaultCatLabel =
        SPEND_CATEGORIES.find((c) => c.key === category)?.label ||
        'Wallet Spend';
      logSpend(
        numericActionAmt,
        note.trim() || defaultCatLabel,
        icon,
        selectedAccountId,
        category
      );
    }
    onClose();
  };

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
      accentColor={
        mode === 'deposit'
          ? shade.positive
          : mode === 'adjust'
          ? shade.dopamine
          : shade.accent
      }
      onClose={onClose}
    >
      <View
        style={[
          styles.fullAmountBox,
          { backgroundColor: shade.surface, borderColor: shade.border },
        ]}
      >
        <Text style={[styles.pesoPrefix, { color: shade.accent }]}>₱</Text>
        <TextInput
          value={amountText}
          onChangeText={(t) => setAmountText(formatPesoInput(t))}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="Enter exact amount"
          placeholderTextColor={shade.muted}
          autoFocus
          style={[styles.amountInput, { color: shade.text }]}
        />
      </View>

      {mode === 'deposit' && isCreditCard && (
        <View style={{ gap: 6 }}>
          <Text style={[styles.catLabel, { color: shade.muted }]}>
            PAY FROM ACCOUNT
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.payFromScroll}
          >
            {banks.map((b) => {
              const active = payFromSourceId === b.id;
              return (
                <ScalePressable
                  key={b.id}
                  onPress={() => {
                    triggerLightHaptic();
                    setPayFromSourceId(b.id);
                  }}
                  style={[
                    styles.payFromPill,
                    {
                      backgroundColor: active ? shade.positive : shade.surface,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.payFromTitle,
                      { color: active ? '#FFFFFF' : shade.text },
                    ]}
                  >
                    {b.name}
                  </Text>
                  <Text
                    style={[
                      styles.payFromSub,
                      { color: active ? '#FFFFFF' : shade.muted },
                    ]}
                  >
                    {formatVisiblePeso(b.balance)}
                  </Text>
                </ScalePressable>
              );
            })}

            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setPayFromSourceId('cash');
              }}
              style={[
                styles.payFromPill,
                {
                  backgroundColor:
                    payFromSourceId === 'cash' ? shade.positive : shade.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.payFromTitle,
                  {
                    color: payFromSourceId === 'cash' ? '#FFFFFF' : shade.text,
                  },
                ]}
              >
                Cash
              </Text>
              <Text
                style={[
                  styles.payFromSub,
                  {
                    color:
                      payFromSourceId === 'cash' ? '#FFFFFF' : shade.muted,
                  },
                ]}
              >
                {formatVisiblePeso(cashOnHand)}
              </Text>
            </ScalePressable>

            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setPayFromSourceId('external');
              }}
              style={[
                styles.payFromPill,
                {
                  backgroundColor:
                    payFromSourceId === 'external'
                      ? shade.accent
                      : shade.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.payFromTitle,
                  {
                    color:
                      payFromSourceId === 'external'
                        ? shade.accentText
                        : shade.text,
                  },
                ]}
              >
                Track Only
              </Text>
              <Text
                style={[
                  styles.payFromSub,
                  {
                    color:
                      payFromSourceId === 'external'
                        ? shade.accentText
                        : shade.muted,
                  },
                ]}
              >
                External
              </Text>
            </ScalePressable>
          </ScrollView>
        </View>
      )}

      {mode === 'spend' && (
        <View style={{ gap: 6 }}>
          <Text style={[styles.catLabel, { color: shade.muted }]}>
            CATEGORY
          </Text>
          <View style={styles.tagRow}>
            {SPEND_CATEGORIES.map((cat) => {
              const active = category === cat.key;
              return (
                <ScalePressable
                  key={cat.key}
                  onPress={() => {
                    triggerLightHaptic();
                    setCategory(cat.key);
                    setIcon(cat.icon);
                  }}
                  style={[
                    styles.tagPill,
                    {
                      backgroundColor: active ? shade.accent : shade.surface,
                    },
                  ]}
                >
                  <AppIcon
                    name={cat.icon}
                    size={12}
                    color={active ? shade.accentText : shade.text}
                  />
                  <Text
                    style={[
                      styles.tagText,
                      { color: active ? shade.accentText : shade.text },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </ScalePressable>
              );
            })}
          </View>
        </View>
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
        disabled={mode !== 'adjust' && numericActionAmt <= 0}
        onPress={handleSubmit}
        style={[
          styles.submitBtn,
          {
            backgroundColor:
              mode !== 'adjust' && numericActionAmt <= 0
                ? shade.surface
                : mode === 'deposit'
                ? shade.positive
                : mode === 'spend'
                ? shade.accent
                : shade.dopamine,
            opacity: mode !== 'adjust' && numericActionAmt <= 0 ? 0.65 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.submitText,
            {
              color:
                mode !== 'adjust' && numericActionAmt <= 0
                  ? shade.muted
                  : mode === 'spend'
                  ? shade.accentText
                  : '#FFFFFF',
            },
          ]}
        >
          {mode === 'deposit'
            ? isCreditCard
              ? payFromSourceId !== 'external'
                ? 'Confirm Card Payment'
                : 'Log Card Payment'
              : 'Confirm Deposit & Log'
            : mode === 'spend'
            ? 'Spend & Log Transaction'
            : 'Save Balance'}
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

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
      const cutoff = Math.max(
        1,
        Math.min(
          31,
          parseInt(editCutoffText.replace(/[^0-9]/g, ''), 10) ||
            selectedCard.cutoffDay
        )
      );
      updateCreditCard(selectedCard.id, trimmed, limit, cutoff);
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
            <View
              style={[
                styles.fullAmountBox,
                { backgroundColor: shade.surface, borderColor: shade.border },
              ]}
            >
              <Text style={[styles.pesoPrefix, { color: shade.dopamine }]}>
                ₱
              </Text>
              <TextInput
                value={editLimitText}
                onChangeText={(t) => {
                  setEditLimitText(formatPesoInput(t));
                  if (editError) setEditError(null);
                }}
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="Limit"
                placeholderTextColor={shade.muted}
                style={[styles.amountInput, { color: shade.text }]}
              />
            </View>
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={[styles.catLabel, { color: shade.muted }]}>
              CUT-OFF DAY
            </Text>
            <TextInput
              value={editCutoffText}
              onChangeText={(t) =>
                setEditCutoffText(t.replace(/[^0-9]/g, '').slice(0, 2))
              }
              keyboardType="numeric"
              maxLength={2}
              placeholder="1–31"
              placeholderTextColor={shade.muted}
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
            backgroundColor: selectedCard ? shade.dopamine : shade.accent,
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
  horizontalScroll: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
  },
  payFromScroll: {
    gap: 8,
  },
  payFromPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 92,
  },
  payFromTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  payFromSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  fullAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pesoPrefix: {
    fontSize: 14,
    fontWeight: '800',
    marginRight: 5,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 1,
  },
  catLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 11,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
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
