import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  useBudgetActions,
  useDailyBudget,
  useThemePrefs,
  useWallet,
} from '../context/BudgetContext';
import {
  getExpectedPaycheckAmount,
  getExpectedPaycheckSavingsSlice,
} from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { formatPesoNumber, parsePesoInput } from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';
import { FormModal } from './FormModal';
import { PaymentSourcePicker } from './form/PaymentSourcePicker';
import { PesoAmountInput } from './form/PesoAmountInput';

interface PaydayCheckInModalProps {
  visible: boolean;
  onClose: () => void;
}

const PaydayCheckInModalContent: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { settings, envelopes } = useDailyBudget();
  const { cashOnHand, banks } = useWallet();
  const { logPaydayCheckIn } = useBudgetActions();

  const snapshotRef = useRef({ settings, banks, envelopes });
  snapshotRef.current = { settings, banks, envelopes };

  const [payText, setPayText] = useState(() =>
    formatPesoNumber(getExpectedPaycheckAmount(snapshotRef.current.settings))
  );
  const [sourceId, setSourceId] = useState(() =>
    snapshotRef.current.banks.length > 0
      ? snapshotRef.current.banks[0].id
      : 'cash'
  );
  const [includeSavings, setIncludeSavings] = useState(
    () => getExpectedPaycheckSavingsSlice(snapshotRef.current.settings) > 0
  );
  const [savingsText, setSavingsText] = useState(() =>
    formatPesoNumber(
      getExpectedPaycheckSavingsSlice(snapshotRef.current.settings)
    )
  );
  const [selectedEnvelopeIds, setSelectedEnvelopeIds] = useState<string[]>(() =>
    snapshotRef.current.envelopes
      .filter((e) => e.cadence === 'per_payday')
      .map((e) => e.id)
  );
  const [note, setNote] = useState('');

  useEffect(() => {
    const snap = snapshotRef.current;
    const expectedPay = getExpectedPaycheckAmount(snap.settings);
    const expectedSav = getExpectedPaycheckSavingsSlice(snap.settings);
    setPayText(formatPesoNumber(expectedPay));
    setSavingsText(formatPesoNumber(expectedSav));
    setIncludeSavings(expectedSav > 0);
    setSourceId(snap.banks.length > 0 ? snap.banks[0].id : 'cash');
    setSelectedEnvelopeIds(
      snap.envelopes.filter((e) => e.cadence === 'per_payday').map((e) => e.id)
    );
    setNote('');
  }, []);

  const cutoffEnvelopes = envelopes.filter((e) => e.cadence === 'per_payday');
  const numericPay = parsePesoInput(payText);
  const numericSavings = parsePesoInput(savingsText);
  const isValid = numericPay > 0;
  const savingsExceedsPay =
    includeSavings && numericPay > 0 && numericSavings > numericPay;

  const toggleEnvelopeId = (id: string) => {
    triggerLightHaptic();
    setSelectedEnvelopeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (!isValid) return;
    logPaydayCheckIn(
      numericPay,
      sourceId,
      includeSavings ? numericSavings : 0,
      note.trim() || undefined,
      selectedEnvelopeIds
    );
    onClose();
  };

  return (
    <FormModal
      visible
      title="Payday Check-In"
      subtitle="Deposit your paycheck and pay yourself first"
      icon="dollar-sign"
      accentColor={shade.positive}
      onClose={onClose}
    >
      <Text style={[styles.sectionLabel, { color: shade.muted }]}>
        PAYCHECK AMOUNT RECEIVED
      </Text>
      <PesoAmountInput
        value={payText}
        onChangeText={setPayText}
        shade={shade}
        accentColor={shade.positive}
        borderColor={shade.positive}
        placeholder="0"
        autoFocus
        inputAccessibilityLabel="Paycheck amount received"
        containerStyle={styles.amountBox}
        inputStyle={styles.amountInput}
      />

      <PaymentSourcePicker
        label="DEPOSIT TO ACCOUNT"
        selectedId={sourceId}
        onSelect={setSourceId}
        cashOnHand={cashOnHand}
        banks={banks}
        shade={shade}
        formatVisiblePeso={formatVisiblePeso}
      />

      <View
        style={[
          styles.savingsCard,
          { backgroundColor: shade.surface, borderColor: shade.border },
        ]}
      >
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setIncludeSavings((v) => !v);
          }}
          accessibilityRole="checkbox"
          accessibilityLabel="Pay Yourself First"
          accessibilityState={{ checked: includeSavings }}
          style={styles.toggleRow}
        >
          <View style={styles.toggleLeft}>
            <View
              style={[
                styles.checkCircle,
                {
                  backgroundColor: includeSavings
                    ? shade.positiveBtnBg
                    : shade.card,
                  borderColor: includeSavings
                    ? shade.positiveBtnBg
                    : shade.border,
                },
              ]}
            >
              {includeSavings && (
                <AppIcon name="check" size={12} color="#FFFFFF" />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.toggleTitle, { color: shade.text }]}>
                Pay Yourself First
              </Text>
              <Text style={[styles.toggleSub, { color: shade.muted }]}>
                Credit monthly Savings Jar goal right away
              </Text>
            </View>
          </View>
        </ScalePressable>

        {includeSavings && (
          <>
            <PesoAmountInput
              value={savingsText}
              onChangeText={setSavingsText}
              shade={shade}
              accentColor={shade.positive}
              borderColor={shade.border}
              backgroundColor={shade.card}
              placeholder="0"
              compact
              inputAccessibilityLabel="Payday savings slice amount"
            />
            {savingsExceedsPay && (
              <Text style={[styles.warnText, { color: shade.warning }]}>
                Note: savings slice exceeds your paycheck amount.
              </Text>
            )}
          </>
        )}
      </View>

      {cutoffEnvelopes.length > 0 && (
        <View
          style={[
            styles.savingsCard,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <View style={styles.envSectionHeader}>
            <Text style={[styles.toggleTitle, { color: shade.text }]}>
              Refill Cutoff Allowances
            </Text>
            <Text style={[styles.toggleSub, { color: shade.muted }]}>
              Reset or roll over unused balance
            </Text>
          </View>

          {cutoffEnvelopes.map((env) => {
            const checked = selectedEnvelopeIds.includes(env.id);
            const actionCopy =
              env.rolloverMode === 'rollover'
                ? `+${formatVisiblePeso(env.amountPerCycle)} rollover`
                : `Reset to ${formatVisiblePeso(env.amountPerCycle)}`;
            return (
              <ScalePressable
                key={env.id}
                onPress={() => toggleEnvelopeId(env.id)}
                accessibilityRole="checkbox"
                accessibilityLabel={`Refill ${env.name}: ${actionCopy}`}
                accessibilityState={{ checked }}
                style={styles.toggleRow}
              >
                <View style={styles.toggleLeft}>
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        backgroundColor: checked
                          ? shade.dopamineBtnBg
                          : shade.card,
                        borderColor: checked
                          ? shade.dopamineBtnBg
                          : shade.border,
                      },
                    ]}
                  >
                    {checked && (
                      <AppIcon name="check" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.envToggleTitle, { color: shade.text }]}>
                      {env.name}
                    </Text>
                    <Text style={[styles.toggleSub, { color: shade.muted }]}>
                      {actionCopy} (now {formatVisiblePeso(env.balance)})
                    </Text>
                  </View>
                </View>
              </ScalePressable>
            );
          })}
        </View>
      )}

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Optional note (e.g., Mid-month salary)"
        placeholderTextColor={shade.muted}
        accessibilityLabel="Payday check-in note"
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
        disabled={!isValid}
        onPress={handleConfirm}
        accessibilityRole="button"
        style={[
          styles.confirmBtn,
          {
            backgroundColor: isValid ? shade.positiveBtnBg : shade.surface,
            opacity: isValid ? 1 : 0.7,
          },
        ]}
      >
        <Text
          style={[
            styles.confirmText,
            { color: isValid ? '#FFFFFF' : shade.muted },
          ]}
        >
          Complete Payday Check-In
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

/**
 * Guided Payday Check-In modal for crediting received salary into Cash or Bank
 * while optionally allocating the "Pay Yourself First" savings slice upfront.
 */
export const PaydayCheckInModal: React.FC<PaydayCheckInModalProps> = ({
  visible,
  onClose,
}) => {
  if (!visible) return null;
  return <PaydayCheckInModalContent onClose={onClose} />;
};

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
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
  savingsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
    fontSize: 13,
    fontWeight: '800',
  },
  toggleSub: {
    fontSize: 11,
  },
  warnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  noteInput: {
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  envSectionHeader: {
    gap: 2,
  },
  envToggleTitle: {
    fontSize: 12,
    fontWeight: '800',
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
