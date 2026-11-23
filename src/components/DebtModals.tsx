import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  useBudgetActions,
  useThemePrefs,
  useWallet,
} from '../context/BudgetContext';
import { DebtDirection, DebtItem } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import {
  formatPeso,
  formatPesoInput,
  formatPesoNumber,
  parsePesoInput,
} from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';
import { FormModal } from './FormModal';

interface AccountingOptionsProps {
  isOutflow: boolean;
  sourceId: string;
  onSelectSource: (id: string) => void;
  affectsDaily: boolean;
  onToggleDaily: () => void;
  showDailyToggle?: boolean;
}

const DebtAccountingOptions: React.FC<AccountingOptionsProps> = ({
  isOutflow,
  sourceId,
  onSelectSource,
  affectsDaily,
  onToggleDaily,
  showDailyToggle = true,
}) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { cashOnHand, banks, creditCards } = useWallet();

  return (
    <View style={styles.optionsGap}>
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionLabel, { color: shade.muted }]}>
          WALLET ACCOUNT (OPTIONAL)
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.sourceScroll}
        >
          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              onSelectSource('none');
            }}
            style={[
              styles.sourcePill,
              {
                backgroundColor:
                  sourceId === 'none' ? shade.accent : shade.surface,
              },
            ]}
          >
            <View style={styles.inlineIconTitle}>
              <AppIcon
                name="check"
                size={12}
                color={sourceId === 'none' ? shade.accentText : shade.text}
              />
              <Text
                style={[
                  styles.sourceTitle,
                  { color: sourceId === 'none' ? shade.accentText : shade.text },
                ]}
              >
                Track Only
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.sourceSub,
                { color: sourceId === 'none' ? shade.accentText : shade.muted },
              ]}
            >
              No wallet change
            </Text>
          </ScalePressable>

          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              onSelectSource('cash');
            }}
            style={[
              styles.sourcePill,
              {
                backgroundColor:
                  sourceId === 'cash' ? shade.accent : shade.surface,
              },
            ]}
          >
            <View style={styles.inlineIconTitle}>
              <AppIcon
                name="dollar-sign"
                size={12}
                color={sourceId === 'cash' ? shade.accentText : shade.text}
              />
              <Text
                style={[
                  styles.sourceTitle,
                  { color: sourceId === 'cash' ? shade.accentText : shade.text },
                ]}
              >
                Cash
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.sourceSub,
                { color: sourceId === 'cash' ? shade.accentText : shade.muted },
              ]}
            >
              {formatVisiblePeso(cashOnHand)}
            </Text>
          </ScalePressable>

          {banks.map((bank) => {
            const active = sourceId === bank.id;
            return (
              <ScalePressable
                key={bank.id}
                onPress={() => {
                  triggerLightHaptic();
                  onSelectSource(bank.id);
                }}
                style={[
                  styles.sourcePill,
                  { backgroundColor: active ? shade.accent : shade.surface },
                ]}
              >
                <View style={styles.inlineIconTitle}>
                  <AppIcon
                    name="briefcase"
                    size={12}
                    color={active ? shade.accentText : shade.text}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.sourceTitle,
                      { color: active ? shade.accentText : shade.text },
                    ]}
                  >
                    {bank.name}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.sourceSub,
                    { color: active ? shade.accentText : shade.muted },
                  ]}
                >
                  {formatVisiblePeso(bank.balance)}
                </Text>
              </ScalePressable>
            );
          })}

          {isOutflow &&
            creditCards.map((card) => {
              const active = sourceId === card.id;
              const avail = Math.max(0, card.limit - card.used);
              return (
                <ScalePressable
                  key={card.id}
                  onPress={() => {
                    triggerLightHaptic();
                    onSelectSource(card.id);
                  }}
                  style={[
                    styles.sourcePill,
                    { backgroundColor: active ? shade.dopamine : shade.surface },
                  ]}
                >
                  <View style={styles.inlineIconTitle}>
                    <AppIcon
                      name="credit-card"
                      size={12}
                      color={active ? '#FFFFFF' : shade.text}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.sourceTitle,
                        { color: active ? '#FFFFFF' : shade.text },
                      ]}
                    >
                      {card.name}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.sourceSub,
                      { color: active ? '#FFFFFF' : shade.muted },
                    ]}
                  >
                    {formatVisiblePeso(avail)} avail
                  </Text>
                </ScalePressable>
              );
            })}
        </ScrollView>
      </View>

      {showDailyToggle && (
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            onToggleDaily();
          }}
          style={[
            styles.dailyToggleCard,
            {
              backgroundColor: shade.surface,
              borderColor: affectsDaily
                ? isOutflow
                  ? shade.accent
                  : shade.positive
                : shade.border,
            },
          ]}
        >
          <View
            style={[
              styles.checkCircle,
              {
                backgroundColor: affectsDaily
                  ? isOutflow
                    ? shade.accent
                    : shade.positive
                  : shade.card,
                borderColor: affectsDaily
                  ? isOutflow
                    ? shade.accent
                    : shade.positive
                  : shade.border,
              },
            ]}
          >
            {affectsDaily && (
              <AppIcon
                name="check"
                size={12}
                color={isOutflow ? shade.accentText : '#FFFFFF'}
              />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[styles.toggleTitle, { color: shade.text }]}>
              {isOutflow
                ? "Count against today's Safe-to-Spend"
                : "Add back to today's Safe-to-Spend"}
            </Text>
            <Text style={[styles.toggleSub, { color: shade.muted }]}>
              {isOutflow
                ? 'Subtracted from daily allowance (off = reminder only)'
                : 'Increases today’s allowance (e.g., split payback)'}
            </Text>
          </View>
        </ScalePressable>
      )}
    </View>
  );
};

interface AddEditDebtModalProps {
  visible: boolean;
  editingDebt?: DebtItem | null;
  defaultDirection?: DebtDirection;
  onClose: () => void;
}

export const AddEditDebtModal: React.FC<AddEditDebtModalProps> = ({
  visible,
  editingDebt = null,
  defaultDirection = 'i_owe',
  onClose,
}) => {
  const { shade } = useThemePrefs();
  const { creditCards } = useWallet();
  const { addDebt, updateDebt } = useBudgetActions();

  const [direction, setDirection] = useState<DebtDirection>(defaultDirection);
  const [personName, setPersonName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [sourceId, setSourceId] = useState('none');
  const [affectsDaily, setAffectsDaily] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
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
  }, [visible, editingDebt, defaultDirection]);

  const handleSelectDirection = (next: DebtDirection) => {
    triggerLightHaptic();
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
      visible={visible}
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
      <View style={[styles.segRow, { backgroundColor: shade.surface }]}>
        <ScalePressable
          onPress={() => handleSelectDirection('i_owe')}
          style={[
            styles.segBtn,
            direction === 'i_owe' && { backgroundColor: shade.warningSoft },
          ]}
        >
          <Text
            style={[
              styles.segText,
              {
                color: direction === 'i_owe' ? shade.warning : shade.muted,
              },
            ]}
          >
            I Owe
          </Text>
        </ScalePressable>
        <ScalePressable
          onPress={() => handleSelectDirection('owed_to_me')}
          style={[
            styles.segBtn,
            direction === 'owed_to_me' && {
              backgroundColor: shade.positiveSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.segText,
              {
                color:
                  direction === 'owed_to_me' ? shade.positive : shade.muted,
              },
            ]}
          >
            Owed to Me
          </Text>
        </ScalePressable>
      </View>

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
        style={[
          styles.textInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      <View
        style={[
          styles.amountBox,
          { backgroundColor: shade.surface, borderColor: accentColor },
        ]}
      >
        <Text style={[styles.pesoSign, { color: accentColor }]}>₱</Text>
        <TextInput
          value={amountText}
          onChangeText={(t) => {
            setAmountText(formatPesoInput(t));
            if (formError) setFormError(null);
          }}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="0.00"
          placeholderTextColor={shade.muted}
          style={[styles.amountInput, { color: shade.text }]}
        />
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Optional note (e.g., Lunch split, Cab fare)"
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

      {formError && (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {formError}
        </Text>
      )}

      <ScalePressable
        onPress={handleSave}
        style={[
          styles.confirmBtn,
          {
            backgroundColor: isValid ? accentColor : shade.surface,
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

interface DebtPaymentModalProps {
  debt: DebtItem | null;
  onClose: () => void;
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  debt,
  onClose,
}) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { recordDebtPayment } = useBudgetActions();

  const [amountText, setAmountText] = useState('');
  const [sourceId, setSourceId] = useState('none');
  const [affectsDaily, setAffectsDaily] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const remaining = debt
    ? Math.max(0, Math.round((debt.amount - debt.paidAmount) * 100) / 100)
    : 0;

  useEffect(() => {
    if (!debt) return;
    const rem = Math.max(
      0,
      Math.round((debt.amount - debt.paidAmount) * 100) / 100
    );
    setAmountText(formatPesoNumber(rem));
    setSourceId('none');
    setAffectsDaily(false);
    setFormError(null);
  }, [debt]);

  const numericAmount = parsePesoInput(amountText);
  const appliedAmount = Math.min(numericAmount, remaining);
  const isOutflow = debt ? debt.direction === 'i_owe' : true;
  const accentColor = isOutflow ? shade.accent : shade.positive;
  const isValid = Boolean(debt) && appliedAmount > 0;

  const handleConfirm = () => {
    if (!debt) return;
    if (numericAmount <= 0) {
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
      visible={debt !== null}
      title={
        debt
          ? isOutflow
            ? `Pay ${debt.personName}`
            : `Received from ${debt.personName}`
          : 'Record Debt Payment'
      }
      subtitle={
        debt
          ? `Remaining: ${formatVisiblePeso(remaining)}${
              debt.note ? ` • ${debt.note}` : ''
            }`
          : undefined
      }
      icon={isOutflow ? 'arrow-up-right' : 'arrow-down-left'}
      accentColor={accentColor}
      onClose={onClose}
    >
      <View
        style={[
          styles.amountBox,
          { backgroundColor: shade.surface, borderColor: accentColor },
        ]}
      >
        <Text style={[styles.pesoSign, { color: accentColor }]}>₱</Text>
        <TextInput
          value={amountText}
          onChangeText={(t) => {
            setAmountText(formatPesoInput(t));
            if (formError) setFormError(null);
          }}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="0.00"
          placeholderTextColor={shade.muted}
          autoFocus
          style={[styles.amountInput, { color: shade.text }]}
        />
      </View>

      {debt && (
        <DebtAccountingOptions
          isOutflow={isOutflow}
          sourceId={sourceId}
          onSelectSource={setSourceId}
          affectsDaily={affectsDaily}
          onToggleDaily={() => setAffectsDaily((v) => !v)}
        />
      )}

      {formError && (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {formError}
        </Text>
      )}

      <ScalePressable
        onPress={handleConfirm}
        style={[
          styles.confirmBtn,
          {
            backgroundColor: isValid ? accentColor : shade.surface,
            opacity: isValid ? 1 : 0.75,
          },
        ]}
      >
        <Text
          style={[
            styles.confirmText,
            {
              color: isValid
                ? isOutflow
                  ? shade.accentText
                  : '#FFFFFF'
                : shade.muted,
            },
          ]}
        >
          {appliedAmount > 0
            ? isOutflow
              ? `Pay ${formatPeso(appliedAmount)}`
              : `Mark ${formatPeso(appliedAmount)} Received`
            : 'Enter Amount'}
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

const styles = StyleSheet.create({
  segRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  segText: {
    fontSize: 13,
    fontWeight: '800',
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pesoSign: {
    fontSize: 22,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 24,
    fontWeight: '800',
    paddingVertical: 0,
  },
  optionsGap: {
    gap: 10,
  },
  sectionBlock: {
    gap: 6,
    width: '100%',
    minWidth: 0,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  horizontalScroll: {
    flexGrow: 0,
    width: '100%',
  },
  sourceScroll: {
    gap: 8,
  },
  sourcePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 2,
    minWidth: 114,
  },
  inlineIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sourceTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  sourceSub: {
    fontSize: 10,
    fontWeight: '600',
  },
  dailyToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  toggleSub: {
    fontSize: 11,
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
