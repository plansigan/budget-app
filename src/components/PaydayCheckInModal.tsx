import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useBudget } from '../context/BudgetContext';
import {
  getExpectedPaycheckAmount,
  getExpectedPaycheckSavingsSlice,
} from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { formatPesoInput, parsePesoInput } from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';
import { FormModal } from './FormModal';

interface PaydayCheckInModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Guided Payday Check-In modal for crediting received salary into Cash or Bank
 * while optionally allocating the "Pay Yourself First" savings slice upfront.
 */
export const PaydayCheckInModal: React.FC<PaydayCheckInModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    shade,
    formatVisiblePeso,
    settings,
    cashOnHand,
    banks,
    envelopes,
    logPaydayCheckIn,
  } = useBudget();

  const [payText, setPayText] = useState('');
  const [sourceId, setSourceId] = useState('cash');
  const [includeSavings, setIncludeSavings] = useState(true);
  const [savingsText, setSavingsText] = useState('');
  const [selectedEnvelopeIds, setSelectedEnvelopeIds] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const cutoffEnvelopes = envelopes.filter((e) => e.cadence === 'per_payday');

  useEffect(() => {
    if (!visible) return;
    const expectedPay = getExpectedPaycheckAmount(settings);
    const expectedSav = getExpectedPaycheckSavingsSlice(settings);
    setPayText(expectedPay > 0 ? formatPesoInput(String(expectedPay)) : '');
    setSavingsText(expectedSav > 0 ? formatPesoInput(String(expectedSav)) : '');
    setIncludeSavings(expectedSav > 0);
    setSourceId(banks.length > 0 ? banks[0].id : 'cash');
    setSelectedEnvelopeIds(
      envelopes.filter((e) => e.cadence === 'per_payday').map((e) => e.id)
    );
    setNote('');
  }, [visible, settings, banks, envelopes]);

  const numericPay = parsePesoInput(payText);
  const numericSavings = parsePesoInput(savingsText);
  const isValid = numericPay > 0;

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
      visible={visible}
      title="Payday Check-In"
      subtitle="Deposit your paycheck and pay yourself first"
      icon="dollar-sign"
      accentColor={shade.positive}
      onClose={onClose}
    >
      <Text style={[styles.sectionLabel, { color: shade.muted }]}>
        PAYCHECK AMOUNT RECEIVED
      </Text>
      <View
        style={[
          styles.amountBox,
          { backgroundColor: shade.surface, borderColor: shade.positive },
        ]}
      >
        <Text style={[styles.pesoSign, { color: shade.positive }]}>₱</Text>
        <TextInput
          value={payText}
          onChangeText={(t) => setPayText(formatPesoInput(t))}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={shade.muted}
          autoFocus
          style={[styles.amountInput, { color: shade.text }]}
        />
      </View>

      <View style={{ gap: 7 }}>
        <Text style={[styles.sectionLabel, { color: shade.muted }]}>
          DEPOSIT TO ACCOUNT
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sourceScroll}
        >
          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              setSourceId('cash');
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
                  setSourceId(bank.id);
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
                    style={[
                      styles.sourceTitle,
                      { color: active ? shade.accentText : shade.text },
                    ]}
                  >
                    {bank.name}
                  </Text>
                </View>
                <Text
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
        </ScrollView>
      </View>

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
          style={styles.toggleRow}
        >
          <View style={styles.toggleLeft}>
            <View
              style={[
                styles.checkCircle,
                {
                  backgroundColor: includeSavings ? shade.positive : shade.card,
                  borderColor: includeSavings ? shade.positive : shade.border,
                },
              ]}
            >
              {includeSavings && <AppIcon name="check" size={12} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1 }}>
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
          <View
            style={[
              styles.savingsInputWrap,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <Text style={[styles.savingsPeso, { color: shade.positive }]}>
              +₱
            </Text>
            <TextInput
              value={savingsText}
              onChangeText={(t) => setSavingsText(formatPesoInput(t))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={shade.muted}
              style={[styles.savingsInput, { color: shade.text }]}
            />
          </View>
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
                style={styles.toggleRow}
              >
                <View style={styles.toggleLeft}>
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        backgroundColor: checked ? shade.dopamine : shade.card,
                        borderColor: checked ? shade.dopamine : shade.border,
                      },
                    ]}
                  >
                    {checked && <AppIcon name="check" size={12} color="#FFFFFF" />}
                  </View>
                  <View style={{ flex: 1 }}>
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
        style={[
          styles.confirmBtn,
          {
            backgroundColor: isValid ? shade.positive : shade.surface,
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

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
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
  sourceScroll: {
    gap: 8,
  },
  sourcePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 2,
    minWidth: 96,
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
  savingsInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  savingsPeso: {
    fontSize: 15,
    fontWeight: '800',
    marginRight: 5,
  },
  savingsInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '800',
    paddingVertical: 0,
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
