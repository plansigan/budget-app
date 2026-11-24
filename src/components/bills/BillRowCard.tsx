import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeShade } from '../../theme/palette';
import { BillItem, getDaysUntilDayOfMonth } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { formatOrdinal } from '../../utils/numberFormat';
import { ScalePressable } from '../AnimatedPrimitives';
import { AppIcon, IconBadge } from '../AppIcon';
import { InlinePesoInput } from '../form/InlinePesoInput';

interface BillRowCardProps {
  bill: BillItem;
  activeMonthKey: string;
  shade: ThemeShade;
  privacyMode: boolean;
  enableTracking: boolean;
  canEditBill: boolean;
  canEditDueDay: boolean;
  onUpdateAmount: (id: string, amount: number) => void;
  onEditBill: (bill: BillItem) => void;
  onEditDueDay: (bill: BillItem) => void;
  onPayBill: (bill: BillItem) => void;
  onRequestDelete: (bill: BillItem) => void;
}

/**
 * Pure individual row inside MonthlyBillsBreakdownCard with narrow-screen-safe peso editing.
 */
export const BillRowCard: React.FC<BillRowCardProps> = React.memo(
  ({
    bill,
    activeMonthKey,
    shade,
    privacyMode,
    enableTracking,
    canEditBill,
    canEditDueDay,
    onUpdateAmount,
    onEditBill,
    onEditDueDay,
    onPayBill,
    onRequestDelete,
  }) => {
    const isPaid = bill.lastPaidMonth === activeMonthKey;
    const daysLeft =
      typeof bill.dueDay === 'number'
        ? getDaysUntilDayOfMonth(bill.dueDay)
        : null;
    const isUrgent = !isPaid && daysLeft !== null && daysLeft <= 3;

    return (
      <View style={[styles.billRowCard, { backgroundColor: shade.surface }]}>
        <View style={styles.billMainRow}>
          <ScalePressable
            onPress={() => {
              if (canEditBill) {
                triggerLightHaptic();
                onEditBill(bill);
              }
            }}
            disabled={!canEditBill}
            accessibilityRole={canEditBill ? 'button' : 'text'}
            accessibilityLabel={
              canEditBill ? `Edit ${bill.name}` : bill.name
            }
            style={styles.billLeft}
          >
            <IconBadge
              name={bill.icon}
              size={14}
              color={shade.text}
              bg={shade.card}
              boxSize={28}
            />
            <Text
              numberOfLines={1}
              style={[styles.billName, { color: shade.text }]}
            >
              {bill.name}
            </Text>
          </ScalePressable>

          <View style={styles.billRight}>
            <InlinePesoInput
              value={bill.amount}
              onCommit={(next) => onUpdateAmount(bill.id, next)}
              onLiveChange={(next) => onUpdateAmount(bill.id, next)}
              shade={shade}
              privacyMode={privacyMode}
              width={108}
              accessibilityLabel={`${bill.name} monthly amount`}
              prefixColor={shade.accent}
              backgroundColor={shade.bg}
              borderColor={shade.border}
              containerStyle={styles.amountBox}
              inputStyle={styles.amountInput}
            />

            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                onRequestDelete(bill);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${bill.name}`}
              hitSlop={8}
              style={[styles.removeBtn, { backgroundColor: shade.bg }]}
            >
              <AppIcon name="x" size={13} color={shade.muted} />
            </ScalePressable>
          </View>
        </View>

        {enableTracking && (
          <View style={styles.billTrackRow}>
            <View style={styles.billTrackLeft}>
              <ScalePressable
                disabled={!canEditDueDay}
                onPress={() => {
                  if (!canEditDueDay) return;
                  triggerLightHaptic();
                  onEditDueDay(bill);
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  typeof bill.dueDay === 'number'
                    ? `Change due day for ${bill.name}, currently ${formatOrdinal(
                        bill.dueDay
                      )}`
                    : `Set due day for ${bill.name}`
                }
                hitSlop={8}
                style={[
                  styles.dueChip,
                  {
                    backgroundColor: shade.card,
                    borderColor: shade.border,
                  },
                ]}
              >
                <AppIcon name="calendar" size={11} color={shade.muted} />
                <Text style={[styles.dueChipText, { color: shade.muted }]}>
                  {typeof bill.dueDay === 'number'
                    ? `Due ${formatOrdinal(bill.dueDay)}`
                    : '+ Due day'}
                </Text>
              </ScalePressable>

              {canEditBill && (
                <ScalePressable
                  onPress={() => {
                    triggerLightHaptic();
                    onEditBill(bill);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${bill.name}`}
                  hitSlop={8}
                  style={[
                    styles.dueChip,
                    {
                      backgroundColor: shade.card,
                      borderColor: shade.border,
                    },
                  ]}
                >
                  <AppIcon name="edit-2" size={10} color={shade.muted} />
                  <Text style={[styles.dueChipText, { color: shade.muted }]}>
                    Edit
                  </Text>
                </ScalePressable>
              )}
            </View>

            {isPaid ? (
              <View
                style={[
                  styles.paidBadge,
                  { backgroundColor: shade.positiveSoft },
                ]}
              >
                <AppIcon name="check" size={11} color={shade.positive} />
                <Text style={[styles.paidBadgeText, { color: shade.positive }]}>
                  Paid
                </Text>
              </View>
            ) : (
              <ScalePressable
                onPress={() => {
                  triggerLightHaptic();
                  onPayBill(bill);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Mark ${bill.name} paid`}
                hitSlop={8}
                style={[
                  styles.markPaidBtn,
                  {
                    backgroundColor: isUrgent ? shade.warningSoft : shade.card,
                    borderColor: isUrgent ? shade.warning : shade.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.markPaidText,
                    { color: isUrgent ? shade.warning : shade.text },
                  ]}
                >
                  {daysLeft === 0
                    ? 'Mark Paid • Due Today'
                    : isUrgent
                    ? `Mark Paid • ${daysLeft}d`
                    : 'Mark Paid'}
                </Text>
              </ScalePressable>
            )}
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  billRowCard: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 7,
  },
  billMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  billLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  billName: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
  },
  billRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
  },
  amountBox: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  amountInput: {
    fontSize: 13,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billTrackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  billTrackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  dueChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  markPaidBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  markPaidText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
