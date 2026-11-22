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
import { AppIcon, BILL_ICON_CHOICES, IconBadge } from './AppIcon';
import { ConfirmModal } from './ConfirmModal';
import { FormModal } from './FormModal';

interface MonthlyBillsBreakdownCardProps {
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

const QUICK_BILL_PRESETS = [
  { icon: 'droplet', name: 'Water', amount: 500 },
  { icon: 'smartphone', name: 'Load / Plan', amount: 999 },
  { icon: 'credit-card', name: 'Loan / CC', amount: 2000 },
  { icon: 'shield', name: 'Insurance', amount: 1500 },
];

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
export const MonthlyBillsBreakdownCard: React.FC<
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [newIcon, setNewIcon] = useState('droplet');
  const [newName, setNewName] = useState('');
  const [newAmountText, setNewAmountText] = useState('');
  const [newDueDayText, setNewDueDayText] = useState('');
  const [billFormError, setBillFormError] = useState<string | null>(null);
  const [pendingDeleteBill, setPendingDeleteBill] = useState<BillItem | null>(
    null
  );
  const [dueEditBill, setDueEditBill] = useState<BillItem | null>(null);
  const [dueDayDraft, setDueDayDraft] = useState('');

  const now = new Date();
  const activeMonthKey =
    currentMonthKey ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const totalBills = sumBills(bills);
  const paidCount = bills.filter(
    (b) => b.lastPaidMonth === activeMonthKey
  ).length;
  const parsedCustomAmt = parsePesoInput(newAmountText);
  const isCustomBillValid = Boolean(newName.trim()) && parsedCustomAmt > 0;

  const parseDueDayDraft = (raw: string): number | undefined => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    if (!cleaned) return undefined;
    const parsed = parseInt(cleaned, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return undefined;
    return Math.min(31, parsed);
  };

  const openAddBillModal = () => {
    triggerLightHaptic();
    setEditingBillId(null);
    setNewIcon('droplet');
    setNewName('');
    setNewAmountText('');
    setNewDueDayText('');
    setBillFormError(null);
    setShowAddForm(true);
  };

  const openEditBillModal = (bill: BillItem) => {
    triggerLightHaptic();
    setEditingBillId(bill.id);
    setNewIcon(bill.icon || 'tag');
    setNewName(bill.name);
    setNewAmountText(bill.amount > 0 ? formatPesoNumber(bill.amount) : '');
    setNewDueDayText(typeof bill.dueDay === 'number' ? String(bill.dueDay) : '');
    setBillFormError(null);
    setShowAddForm(true);
  };

  const handleSaveBillForm = () => {
    if (!newName.trim()) {
      setBillFormError('Please enter a bill name.');
      return;
    }
    if (parsedCustomAmt <= 0) {
      setBillFormError('Please enter a monthly amount greater than ₱0.');
      return;
    }
    setBillFormError(null);
    const parsedDue = parseDueDayDraft(newDueDayText);
    if (editingBillId && onUpdateBillItem) {
      onUpdateBillItem(editingBillId, newName, newIcon, parsedCustomAmt, parsedDue);
    } else {
      onAddBill(newName, newIcon, parsedCustomAmt, parsedDue);
    }
    setEditingBillId(null);
    setNewName('');
    setNewAmountText('');
    setNewDueDayText('');
    setShowAddForm(false);
  };

  const handleSaveDueDay = () => {
    if (!dueEditBill || !onUpdateDueDay) return;
    onUpdateDueDay(dueEditBill.id, parseDueDayDraft(dueDayDraft));
    setDueEditBill(null);
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
                          setDueDayDraft(
                            typeof bill.dueDay === 'number'
                              ? String(bill.dueDay)
                              : ''
                          );
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

      {/* Clean Modal for Adding or Editing a Bill */}
      <FormModal
        visible={showAddForm}
        title={editingBillId ? 'Edit Monthly Bill' : 'Add Monthly Bill'}
        subtitle={
          editingBillId
            ? 'Update bill name, icon, amount, or due day'
            : 'Set aside monthly fixed costs first'
        }
        icon={newIcon}
        onClose={() => {
          setBillFormError(null);
          setEditingBillId(null);
          setShowAddForm(false);
        }}
      >
        {!editingBillId && collapsible && (
          <View style={{ gap: 6 }}>
            <Text style={[styles.modalLabel, { color: shade.muted }]}>
              Quick Starters (tap to fill)
            </Text>
            <View style={styles.presetChips}>
              {QUICK_BILL_PRESETS.map((preset) => (
                <ScalePressable
                  key={preset.name}
                  onPress={() => {
                    triggerLightHaptic();
                    setNewName(preset.name);
                    setNewIcon(preset.icon);
                    setNewAmountText(formatPesoNumber(preset.amount));
                    setBillFormError(null);
                  }}
                  style={[styles.presetChip, { backgroundColor: shade.surface }]}
                >
                  <AppIcon name={preset.icon} size={12} color={shade.dopamine} />
                  <Text style={[styles.presetChipText, { color: shade.text }]}>
                    {preset.name} {formatPeso(preset.amount)}
                  </Text>
                </ScalePressable>
              ))}
            </View>
          </View>
        )}
        <Text style={[styles.modalLabel, { color: shade.muted }]}>
          Pick an icon
        </Text>
        <View style={styles.iconRow}>
          {BILL_ICON_CHOICES.map((iconName) => {
            const active = newIcon === iconName;
            return (
              <ScalePressable
                key={iconName}
                onPress={() => {
                  triggerLightHaptic();
                  setNewIcon(iconName);
                }}
                style={[
                  styles.iconPill,
                  {
                    backgroundColor: active ? shade.accent : shade.surface,
                  },
                ]}
              >
                <AppIcon
                  name={iconName}
                  size={16}
                  color={active ? shade.accentText : shade.text}
                />
              </ScalePressable>
            );
          })}
        </View>

        <TextInput
          value={newName}
          onChangeText={(t) => {
            setNewName(t);
            if (billFormError) setBillFormError(null);
          }}
          placeholder="Bill name (e.g., Meralco, Condo Dues)"
          placeholderTextColor={shade.muted}
          style={[
            styles.nameInput,
            {
              backgroundColor: shade.surface,
              color: shade.text,
              borderColor: shade.border,
            },
          ]}
        />

        <View
          style={[
            styles.newAmountWrap,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <Text style={[styles.pesoSign, { color: shade.accent }]}>₱</Text>
          <TextInput
            value={newAmountText}
            onChangeText={(t) => {
              setNewAmountText(formatPesoInput(t));
              if (billFormError) setBillFormError(null);
            }}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="Monthly amount"
            placeholderTextColor={shade.muted}
            style={[styles.newAmountInput, { color: shade.text }]}
          />
        </View>

        {enableTracking && (
          <View style={styles.dueFieldRow}>
            <Text style={[styles.modalLabel, { color: shade.muted }]}>
              Due Day (1–31, optional)
            </Text>
            <TextInput
              value={newDueDayText}
              onChangeText={(t) => setNewDueDayText(t.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="numeric"
              maxLength={2}
              placeholder="e.g., 15"
              placeholderTextColor={shade.muted}
              style={[
                styles.dueDaySmallInput,
                {
                  backgroundColor: shade.surface,
                  color: shade.text,
                  borderColor: shade.border,
                },
              ]}
            />
          </View>
        )}

        {billFormError && (
          <Text style={[styles.formErrorText, { color: shade.warning }]}>
            {billFormError}
          </Text>
        )}

        <ScalePressable
          onPress={handleSaveBillForm}
          style={[
            styles.addBtn,
            {
              backgroundColor: isCustomBillValid
                ? shade.accent
                : shade.surface,
              opacity: isCustomBillValid ? 1 : 0.75,
            },
          ]}
        >
          <Text
            style={[
              styles.addBtnText,
              {
                color: isCustomBillValid ? shade.accentText : shade.muted,
              },
            ]}
          >
            {editingBillId ? 'Save Bill Changes' : 'Add to Monthly Bills'}
          </Text>
        </ScalePressable>
      </FormModal>

      <FormModal
        visible={dueEditBill !== null}
        title={dueEditBill ? `${dueEditBill.name} Due Day` : 'Bill Due Day'}
        subtitle="Set day of month (1–31) for payment reminders"
        icon="calendar"
        onClose={() => setDueEditBill(null)}
      >
        <TextInput
          value={dueDayDraft}
          onChangeText={(t) => setDueDayDraft(t.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="numeric"
          maxLength={2}
          placeholder="Day of month (1-31, leave blank to clear)"
          placeholderTextColor={shade.muted}
          autoFocus
          style={[
            styles.nameInput,
            {
              backgroundColor: shade.surface,
              color: shade.text,
              borderColor: shade.border,
            },
          ]}
        />
        <View style={styles.dueModalBtnRow}>
          <ScalePressable
            onPress={() => {
              if (dueEditBill && onUpdateDueDay) {
                onUpdateDueDay(dueEditBill.id, undefined);
              }
              setDueEditBill(null);
            }}
            style={[
              styles.dueClearBtn,
              { backgroundColor: shade.surface, borderColor: shade.border },
            ]}
          >
            <Text style={[styles.dueClearBtnText, { color: shade.muted }]}>
              Clear
            </Text>
          </ScalePressable>
          <ScalePressable
            onPress={handleSaveDueDay}
            style={[styles.dueSaveBtn, { backgroundColor: shade.accent }]}
          >
            <Text style={[styles.addBtnText, { color: shade.accentText }]}>
              Save Due Day
            </Text>
          </ScalePressable>
        </View>
      </FormModal>

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
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  iconPill: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  newAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  newAmountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '800',
    paddingVertical: 0,
  },
  addBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dueFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dueDaySmallInput: {
    width: 84,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  dueModalBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dueClearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  dueClearBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dueSaveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
});
