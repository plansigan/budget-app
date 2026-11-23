import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  FadeSlideIn,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { IconBadge } from '../../components/AppIcon';
import { useThemePrefs } from '../../context/BudgetContext';
import { roundCurrency } from '../../state/budgetMath';
import { BillItem, DebtItem } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';

interface UpcomingBillEntry {
  bill: BillItem;
  daysLeft: number;
}

interface TodayUpcomingAndDebtsProps {
  upcomingUnpaidBills: UpcomingBillEntry[];
  openDebtsCount: number;
  iOweTotal: number;
  owedToMeTotal: number;
  previewDebts: DebtItem[];
  onPayBill: (bill: BillItem) => void;
  onPayDebt: (debt: DebtItem) => void;
  onOpenDebts?: () => void;
}

export const TodayUpcomingAndDebts: React.FC<TodayUpcomingAndDebtsProps> =
  React.memo(
    ({
      upcomingUnpaidBills,
      openDebtsCount,
      iOweTotal,
      owedToMeTotal,
      previewDebts,
      onPayBill,
      onPayDebt,
      onOpenDebts,
    }) => {
      const { shade, formatVisiblePeso } = useThemePrefs();

      return (
        <>
          {upcomingUnpaidBills.length > 0 && (
            <FadeSlideIn delay={105} distance={14}>
              <View
                style={[
                  styles.sectionCard,
                  { backgroundColor: shade.card, borderColor: shade.border },
                ]}
              >
                <View style={styles.rowBetween}>
                  <Text style={[styles.sectionKicker, { color: shade.muted }]}>
                    BILLS DUE SOON
                  </Text>
                  <Text
                    style={[styles.billsDueCount, { color: shade.warning }]}
                  >
                    {upcomingUnpaidBills.length} unpaid
                  </Text>
                </View>

                <View style={{ gap: 8 }}>
                  {upcomingUnpaidBills.map(({ bill, daysLeft }) => (
                    <View
                      key={bill.id}
                      style={[
                        styles.billDueRow,
                        { backgroundColor: shade.surface },
                      ]}
                    >
                      <View style={styles.billLeftRow}>
                        <IconBadge
                          name={bill.icon}
                          size={14}
                          color={daysLeft <= 1 ? shade.warning : shade.text}
                          bg={daysLeft <= 1 ? shade.warningSoft : shade.card}
                          boxSize={34}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            numberOfLines={1}
                            style={[styles.rowTitle, { color: shade.text }]}
                          >
                            {bill.name}
                          </Text>
                          <Text
                            style={[
                              styles.rowSub,
                              {
                                color:
                                  daysLeft <= 1 ? shade.warning : shade.muted,
                              },
                            ]}
                          >
                            {daysLeft === 0
                              ? 'Due Today'
                              : daysLeft === 1
                              ? 'Due Tomorrow'
                              : `Due in ${daysLeft}d`}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.billRightRow}>
                        <Text style={[styles.rowDelta, { color: shade.text }]}>
                          {formatVisiblePeso(bill.amount)}
                        </Text>
                        <ScalePressable
                          onPress={() => {
                            triggerLightHaptic();
                            onPayBill(bill);
                          }}
                          style={[
                            styles.payMiniBtn,
                            { backgroundColor: shade.accent },
                          ]}
                        >
                          <Text
                            style={[
                              styles.payMiniText,
                              { color: shade.accentText },
                            ]}
                          >
                            Pay
                          </Text>
                        </ScalePressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </FadeSlideIn>
          )}

          {openDebtsCount > 0 && (
            <FadeSlideIn delay={112} distance={14}>
              <View
                style={[
                  styles.sectionCard,
                  { backgroundColor: shade.card, borderColor: shade.border },
                ]}
              >
                <View style={styles.rowBetween}>
                  <Text style={[styles.sectionKicker, { color: shade.muted }]}>
                    DEBTS ({openDebtsCount})
                  </Text>
                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      onOpenDebts?.();
                    }}
                    hitSlop={6}
                  >
                    <Text
                      style={[
                        styles.sectionSubHint,
                        { color: shade.accent, fontWeight: '800' },
                      ]}
                    >
                      Manage ›
                    </Text>
                  </ScalePressable>
                </View>

                <View
                  style={[
                    styles.billDueRow,
                    {
                      backgroundColor: shade.surface,
                      paddingVertical: 8,
                      flexWrap: 'wrap',
                      gap: 8,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.rowSub,
                      {
                        color: shade.warning,
                        fontWeight: '800',
                        fontVariant: ['tabular-nums'],
                      },
                    ]}
                  >
                    I Owe {formatVisiblePeso(iOweTotal)}
                  </Text>
                  <Text
                    style={[
                      styles.rowSub,
                      {
                        color: shade.positive,
                        fontWeight: '800',
                        fontVariant: ['tabular-nums'],
                      },
                    ]}
                  >
                    Owed to Me {formatVisiblePeso(owedToMeTotal)}
                  </Text>
                </View>

                <View style={{ gap: 8 }}>
                  {previewDebts.map((debt) => {
                    const remaining = roundCurrency(
                      Math.max(0, debt.amount - debt.paidAmount)
                    );
                    const isOwe = debt.direction === 'i_owe';
                    return (
                      <View
                        key={debt.id}
                        style={[
                          styles.billDueRow,
                          { backgroundColor: shade.surface },
                        ]}
                      >
                        <View style={styles.billLeftRow}>
                          <IconBadge
                            name={isOwe ? 'arrow-up-right' : 'arrow-down-left'}
                            size={14}
                            color={isOwe ? shade.warning : shade.positive}
                            bg={isOwe ? shade.warningSoft : shade.positiveSoft}
                            boxSize={34}
                          />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              numberOfLines={1}
                              style={[styles.rowTitle, { color: shade.text }]}
                            >
                              {debt.personName}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={[styles.rowSub, { color: shade.muted }]}
                            >
                              {isOwe ? 'I Owe' : 'Owed to Me'}
                              {debt.note ? ` • ${debt.note}` : ''}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.billRightRow}>
                          <Text
                            style={[
                              styles.rowDelta,
                              { color: isOwe ? shade.text : shade.positive },
                            ]}
                          >
                            {formatVisiblePeso(remaining)}
                          </Text>
                          <ScalePressable
                            onPress={() => {
                              triggerLightHaptic();
                              onPayDebt(debt);
                            }}
                            style={[
                              styles.payMiniBtn,
                              {
                                backgroundColor: isOwe
                                  ? shade.accent
                                  : shade.positiveSoft,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.payMiniText,
                                {
                                  color: isOwe
                                    ? shade.accentText
                                    : shade.positive,
                                },
                              ]}
                            >
                              {isOwe ? 'Pay' : 'Got Paid'}
                            </Text>
                          </ScalePressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </FadeSlideIn>
          )}
        </>
      );
    }
  );

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: '#111318',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionSubHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  billsDueCount: {
    fontSize: 11,
    fontWeight: '800',
  },
  billDueRow: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  billLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  billRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 8,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 0,
  },
  rowSub: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  rowDelta: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  payMiniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  payMiniText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
