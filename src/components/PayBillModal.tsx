import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useBudget } from '../context/BudgetContext';
import { BillItem } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import {
  formatOrdinal,
  formatPeso,
  formatPesoInput,
  formatPesoNumber,
  parsePesoInput,
} from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';
import { FormModal } from './FormModal';

interface PayBillModalProps {
  bill: BillItem | null;
  onClose: () => void;
}

/**
 * Actionable modal for marking a monthly fixed bill paid from Cash, a Bank,
 * a Credit Card, or Track Only without double-counting against daily spend.
 */
export const PayBillModal: React.FC<PayBillModalProps> = ({ bill, onClose }) => {
  const {
    shade,
    formatVisiblePeso,
    cashOnHand,
    banks,
    creditCards,
    markBillPaid,
  } = useBudget();

  const [amountText, setAmountText] = useState('');
  const [sourceId, setSourceId] = useState('cash');

  useEffect(() => {
    if (bill) {
      setAmountText(formatPesoNumber(bill.amount));
      setSourceId(banks.length > 0 ? banks[0].id : 'cash');
    }
  }, [bill, banks]);

  const numericAmount = parsePesoInput(amountText);

  const handleConfirm = () => {
    if (!bill) return;
    markBillPaid(bill.id, sourceId, numericAmount);
    onClose();
  };

  return (
    <FormModal
      visible={bill !== null}
      title={bill ? `Pay ${bill.name}` : 'Pay Bill'}
      subtitle={
        bill && typeof bill.dueDay === 'number'
          ? `Due every ${formatOrdinal(bill.dueDay)} of the month`
          : 'Mark settled for this month'
      }
      icon={bill?.icon || 'file-text'}
      accentColor={shade.positive}
      onClose={onClose}
    >
      <View
        style={[
          styles.amountBox,
          { backgroundColor: shade.surface, borderColor: shade.positive },
        ]}
      >
        <Text style={[styles.pesoSign, { color: shade.positive }]}>₱</Text>
        <TextInput
          value={amountText}
          onChangeText={(t) => setAmountText(formatPesoInput(t))}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="Actual amount paid"
          placeholderTextColor={shade.muted}
          autoFocus
          style={[styles.amountInput, { color: shade.text }]}
        />
      </View>

      <View style={{ gap: 7 }}>
        <Text style={[styles.sectionLabel, { color: shade.muted }]}>
          PAY FROM ACCOUNT
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sourceScroll}
        >
          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              setSourceId('none');
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
              style={[
                styles.sourceSub,
                { color: sourceId === 'none' ? shade.accentText : shade.muted },
              ]}
            >
              No deduction
            </Text>
          </ScalePressable>

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

          {creditCards.map((card) => {
            const active = sourceId === card.id;
            const avail = Math.max(0, card.limit - card.used);
            return (
              <ScalePressable
                key={card.id}
                onPress={() => {
                  triggerLightHaptic();
                  setSourceId(card.id);
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
                    style={[
                      styles.sourceTitle,
                      { color: active ? '#FFFFFF' : shade.text },
                    ]}
                  >
                    {card.name}
                  </Text>
                </View>
                <Text
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

      <Text style={[styles.hintText, { color: shade.muted }]}>
        Fixed bills are already carved out of your daily budget—paying updates your
        wallet balance only.
      </Text>

      <ScalePressable
        onPress={handleConfirm}
        style={[styles.confirmBtn, { backgroundColor: shade.positive }]}
      >
        <Text style={styles.confirmText}>
          Mark Paid ({formatPeso(numericAmount)})
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

const styles = StyleSheet.create({
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
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
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
  hintText: {
    fontSize: 11,
    lineHeight: 16,
  },
  confirmBtn: {
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
