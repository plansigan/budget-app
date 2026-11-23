import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { sumBills } from '../context/BudgetContext';
import { ThemeShade } from '../theme/palette';
import { BillItem, getDaysUntilDayOfMonth } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import {
  formatOrdinal,
  formatPeso,
  formatPesoDisplay,
  formatPesoInput,
  formatPesoNumber,
  parsePesoInput,
} from '../utils/numberFormat';
import { PopValueText, ScalePressable } from './AnimatedPrimitives';
import { AppIcon, IconBadge } from './AppIcon';
import {
  AddEditBillModal,
  BillDueDayModal,
  QUICK_BILL_PRESETS,
} from './BillModals';
import { ConfirmModal } from './ConfirmModal';

export interface MonthlyBillsBreakdownCardProps {
  bills: BillItem[];
  shade: ThemeShade;
  onUpdateAmount: (id: string, amount: number) => void;
  onUpdateBillItem?: (
    billId: string,
    name: string,
    icon: string,
    amount: number,
    dueDay?: number
  ) => void;
  onAddBill: (
    name: string,
    icon: string,
    amount: number,
    dueDay?: number
  ) => void;
  onRemoveBill: (id: string) => void;
  enableTracking?: boolean;
  currentMonthKey?: string;
  privacyMode?: boolean;
  onUpdateDueDay?: (billId: string, dueDay?: number) => void;
  onRequestPayBill?: (bill: BillItem) => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

interface BillAmountInputProps {
  value: number;
  shade: ThemeShade;
  onChange: (next: number) => void;
}

const BillAmountInput: React.FC<BillAmountInputProps> = ({
  value,
  shade,
  onChange,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [draftText, setDraftText] = useState(() => formatPesoNumber(value));

  useEffect(() => {
    if (!isFocused) {
      setDraftText(formatPesoNumber(value));
    }
  }, [value, isFocused]);

  return (
    <TextInput
      value={isFocused ? draftText : formatPesoNumber(value)}
      onChangeText={(t) => {
        const formatted = formatPesoInput(t);
        setDraftText(formatted);
        onChange(Math.max(0, parsePesoInput(formatted)));
      }}
      onFocus={() => {
        setIsFocused(true);
        setDraftText(formatPesoNumber(value));
      }}
      onBlur={() => {
        setIsFocused(false);
        const parsed = Math.max(0, parsePesoInput(draftText));
        onChange(parsed);
        setDraftText(formatPesoNumber(parsed));
      }}
      keyboardType="decimal-pad"
      inputMode="decimal"
      placeholder="0"
      placeholderTextColor={shade.muted}
      selectTextOnFocus
      style={[styles.amountInput, { color: shade.text }]}
    />
  );
};

/**
 * Interactive Monthly Bills Breakdown allowing users to add, edit, or remove
 * individual bills via modal while computing the total fixed bills.
 */
const MonthlyBillsBreakdownCardBase: React.FC<
  MonthlyBillsBreakdownCardProps
> = ({
  bills,
  shade,
  onUpdateAmount,
  onUpdateBillItem,
  onAddBill,
  onRemoveBill,
  enableTracking = false,
  currentMonthKey,
  privacyMode = false,
  onUpdateDueDay,
  onRequestPayBill,
  collapsible = false,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(collapsible ? defaultExpanded : true);
  const [billModalState, setBillModalState] = useState<{
    bill: BillItem | null;
  } | null>(null);
  const [pendingDeleteBill, setPendingDeleteBill] = useState<BillItem | null>(
    null
  );
  const [dueEditBill, setDueEditBill] = useState<BillItem | null>(null);

  const now = new Date();
  const activeMonthKey =
    currentMonthKey ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const totalBills = sumBills(bills);
  const paidCount = bills.filter(
    (b) => b.lastPaidMonth === activeMonthKey
  ).length;

  const openAddBillModal = () => {
    triggerLightHaptic();
    setBillModalState({ bill: null });
  };

  const openEditBillModal = (bill: BillItem) => {
    triggerLightHaptic();
    setBillModalState({ bill });
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: shade.card, borderColor: shade.border },
      ]}
    >
      {/* Header with Live Total & Optional Collapse Trigger */}
      <View style={styles.headerRow}>
        <ScalePressable
          disabled={!collapsible}
          onPress={() => {
            triggerLightHaptic();
            setExpanded((v) => !v);
          }}
          style={{ flex: 1 }}
        >
          <Text style={[styles.title, { color: shade.text }]}>
            Monthly fixed bills ({bills.length})
          </Text>
          <Text style={[styles.subtitle, { color: shade.muted }]}>
            {collapsible
              ? `${
                  enableTracking ? `${paidCount}/${bills.length} paid • ` : ''
                }${formatPesoDisplay(totalBills, privacyMode)}/mo`
              : 'Tap any amount to edit.'}
          </Text>
        </ScalePressable>

        <View style={styles.headerPillsWrap}>
          {collapsible ? (
            <>
              <ScalePressable
                onPress={openAddBillModal}
                style={[styles.customToggle, { backgroundColor: shade.surface }]}
              >
                <AppIcon name="plus" size={12} color={shade.dopamine} />
                <Text
                  style={[styles.customToggleText, { color: shade.dopamine }]}
                >
                  Add
                </Text>
              </ScalePressable>
              <ScalePressable
                onPress={() => {
                  triggerLightHaptic();
                  setExpanded((v) => !v);
                }}
                hitSlop={8}
              >
                <AppIcon
                  name={expanded ? 'chevron-down' : 'chevron-right'}
                  size={18}
                  color={shade.muted}
                />
              </ScalePressable>
            </>
          ) : (
            <>
              {enableTracking && bills.length > 0 && (
                <View
                  style={[
                    styles.paidCountPill,
                    { backgroundColor: shade.positiveSoft },
                  ]}
                >
                  <Text style={[styles.paidCountText, { color: shade.positive }]}>
                    {paidCount}/{bills.length} paid
                  </Text>
                </View>
              )}
              <PopValueText valueTrigger={totalBills}>
                <View style={[styles.totalPill, { backgroundColor: shade.surface }]}>
                  <Text style={[styles.totalText, { color: shade.accent }]}>
                    Total: {formatPesoDisplay(totalBills, privacyMode)}
                  </Text>
                </View>
              </PopValueText>
            </>
          )}
        </View>
      </View>

      {/* Individual Bill Rows */}
      {expanded && (
        <View style={styles.billList}>
        {bills.length === 0 ? (
          <View style={[styles.emptyRow, { backgroundColor: shade.bg }]}>
            <Text style={[styles.emptyText, { color: shade.muted }]}>
              No fixed bills yet. Tap a preset or + Custom Bill.
            </Text>
          </View>
        ) : (
          bills.map((bill) => {
            const isPaid = bill.lastPaidMonth === activeMonthKey;
            const daysLeft =
              typeof bill.dueDay === 'number'
                ? getDaysUntilDayOfMonth(bill.dueDay)
                : null;
            const isUrgent = !isPaid && daysLeft !== null && daysLeft <= 3;

            return (
              <View
                key={bill.id}
                style={[styles.billRowCard, { backgroundColor: shade.surface }]}
              >
                <View style={styles.billMainRow}>
                    <ScalePressable
                      onPress={() => {
                        if (onUpdateBillItem) {
                          openEditBillModal(bill);
                        }
                      }}
                      disabled={!onUpdateBillItem}
                      style={[styles.billLeft, { minWidth: 0 }]}
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
                    <View
                      style={[
                        styles.amountBox,
                        { backgroundColor: shade.bg, borderColor: shade.border },
                      ]}
                    >
                      <Text style={[styles.pesoSign, { color: shade.accent }]}>
                        ₱
                      </Text>
                      <BillAmountInput
                        value={bill.amount}
                        shade={shade}
                        onChange={(next) => onUpdateAmount(bill.id, next)}
                      />
                    </View>

                    <ScalePressable
                      onPress={() => {
                        triggerLightHaptic();
                        setPendingDeleteBill(bill);
                      }}
                      accessibilityLabel={`Remove ${bill.name}`}
                      hitSlop={9}
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
                        onPress={() => {
                          if (!onUpdateDueDay) return;
                          triggerLightHaptic();
                          setDueEditBill(bill);
                        }}
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

                      {onUpdateBillItem && (
                        <ScalePressable
                          onPress={() => openEditBillModal(bill)}
                          accessibilityLabel={`Edit ${bill.name}`}
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
                        <Text
                          style={[
                            styles.paidBadgeText,
                            { color: shade.positive },
                          ]}
                        >
                          Paid
                        </Text>
                      </View>
                    ) : (
                      <ScalePressable
                        onPress={() => {
                          triggerLightHaptic();
                          onRequestPayBill?.(bill);
                        }}
                        style={[
                          styles.markPaidBtn,
                          {
                            backgroundColor: isUrgent
                              ? shade.warningSoft
                              : shade.card,
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
          })
        )}
        </View>
      )}

      {/* Quick Presets + Custom Bill Modal Trigger (kept in Onboarding; hidden in compact Setup) */}
      {expanded && !collapsible && (
        <View style={styles.presetSection}>
          <View style={styles.headerRow}>
            <Text style={[styles.presetLabel, { color: shade.muted }]}>
              QUICK ADD BILLS
            </Text>
            <ScalePressable
              onPress={openAddBillModal}
              style={[styles.customToggle, { backgroundColor: shade.surface }]}
            >
              <AppIcon name="plus" size={12} color={shade.dopamine} />
              <Text style={[styles.customToggleText, { color: shade.dopamine }]}>
                Custom Bill
              </Text>
            </ScalePressable>
          </View>

          <View style={styles.presetChips}>
            {QUICK_BILL_PRESETS.map((preset) => (
              <ScalePressable
                key={preset.name}
                onPress={() =>
                  onAddBill(preset.name, preset.icon, preset.amount)
                }
                style={[styles.presetChip, { backgroundColor: shade.surface }]}
              >
                <AppIcon name={preset.icon} size={12} color={shade.text} />
                <Text style={[styles.presetChipText, { color: shade.text }]}>
                  {preset.name} {formatPeso(preset.amount)}
                </Text>
              </ScalePressable>
            ))}
          </View>
        </View>
      )}

      <AddEditBillModal
        visible={billModalState !== null}
        editingBill={billModalState?.bill ?? null}
        shade={shade}
        collapsible={collapsible}
        enableTracking={enableTracking}
        onAddBill={onAddBill}
        onUpdateBillItem={onUpdateBillItem}
        onClose={() => setBillModalState(null)}
      />

      <BillDueDayModal
        bill={dueEditBill}
        shade={shade}
        onUpdateDueDay={onUpdateDueDay}
        onClose={() => setDueEditBill(null)}
      />

      <ConfirmModal
        visible={pendingDeleteBill !== null}
        title="Remove Monthly Bill?"
        message={
          pendingDeleteBill
            ? `Remove "${pendingDeleteBill.name}" (${formatPeso(pendingDeleteBill.amount)}/mo) from your fixed bills?`
            : ''
        }
        confirmLabel="Remove"
        destructive
        onCancel={() => setPendingDeleteBill(null)}
        onConfirm={() => {
          if (pendingDeleteBill) {
            onRemoveBill(pendingDeleteBill.id);
          }
          setPendingDeleteBill(null);
        }}
      />
    </View>
  );
};

export const MonthlyBillsBreakdownCard = React.memo(
  MonthlyBillsBreakdownCardBase
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  totalPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  headerPillsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paidCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  paidCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  totalText: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  billList: {
    gap: 6,
  },
  emptyRow: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 11,
  },
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
  billTrackRow: {
    flexDirection: 'row',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  markPaidBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  markPaidText: {
    fontSize: 10,
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 132,
  },
  pesoSign: {
    fontSize: 12,
    fontWeight: '800',
    marginRight: 3,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '800',
    paddingVertical: 0,
  },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetSection: {
    gap: 7,
    paddingTop: 2,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  customToggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  presetChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
