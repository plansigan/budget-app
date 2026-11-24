import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { sumBills } from '../context/BudgetContext';
import { ThemeShade } from '../theme/palette';
import { BillItem } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { formatPeso, formatPesoDisplay } from '../utils/numberFormat';
import { PopValueText, ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';
import {
  AddEditBillModal,
  BillDueDayModal,
  QUICK_BILL_PRESETS,
} from './BillModals';
import { ConfirmModal } from './ConfirmModal';
import { BillRowCard } from './bills/BillRowCard';
import { QuickPresetChips } from './form/QuickPresetChips';

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

/**
 * Interactive Monthly Bills Breakdown allowing users to add, edit, or remove
 * individual bills while computing total fixed bills.
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

  const quickPresets = QUICK_BILL_PRESETS.map((p) => ({
    ...p,
    label: `${p.name} ${formatPeso(p.amount)}`,
  }));

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: shade.card, borderColor: shade.border },
      ]}
    >
      <View style={styles.headerRow}>
        <ScalePressable
          disabled={!collapsible}
          onPress={() => {
            triggerLightHaptic();
            setExpanded((v) => !v);
          }}
          accessibilityRole={collapsible ? 'button' : 'text'}
          accessibilityState={collapsible ? { expanded } : undefined}
          style={{ flex: 1, minWidth: 0 }}
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
                accessibilityRole="button"
                accessibilityLabel="Add monthly bill"
                hitSlop={8}
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
                accessibilityRole="button"
                accessibilityLabel={
                  expanded ? 'Collapse monthly bills' : 'Expand monthly bills'
                }
                accessibilityState={{ expanded }}
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
                  <Text
                    style={[styles.paidCountText, { color: shade.positive }]}
                  >
                    {paidCount}/{bills.length} paid
                  </Text>
                </View>
              )}
              <PopValueText valueTrigger={totalBills}>
                <View
                  style={[styles.totalPill, { backgroundColor: shade.surface }]}
                >
                  <Text style={[styles.totalText, { color: shade.accent }]}>
                    Total: {formatPesoDisplay(totalBills, privacyMode)}
                  </Text>
                </View>
              </PopValueText>
            </>
          )}
        </View>
      </View>

      {expanded && (
        <View style={styles.billList}>
          {bills.length === 0 ? (
            <View style={[styles.emptyRow, { backgroundColor: shade.bg }]}>
              <Text style={[styles.emptyText, { color: shade.muted }]}>
                {collapsible
                  ? 'No fixed bills yet. Tap + Add above.'
                  : 'No fixed bills yet. Tap a preset or + Custom Bill below.'}
              </Text>
            </View>
          ) : (
            bills.map((bill) => (
              <BillRowCard
                key={bill.id}
                bill={bill}
                activeMonthKey={activeMonthKey}
                shade={shade}
                privacyMode={privacyMode}
                enableTracking={enableTracking}
                canEditBill={Boolean(onUpdateBillItem)}
                canEditDueDay={Boolean(onUpdateDueDay)}
                onUpdateAmount={onUpdateAmount}
                onEditBill={openEditBillModal}
                onEditDueDay={setDueEditBill}
                onPayBill={(target) => onRequestPayBill?.(target)}
                onRequestDelete={setPendingDeleteBill}
              />
            ))
          )}
        </View>
      )}

      {expanded && !collapsible && (
        <View style={styles.presetSection}>
          <View style={styles.headerRow}>
            <Text style={[styles.presetLabel, { color: shade.muted }]}>
              QUICK ADD BILLS
            </Text>
            <ScalePressable
              onPress={openAddBillModal}
              accessibilityRole="button"
              accessibilityLabel="Add custom monthly bill"
              hitSlop={8}
              style={[styles.customToggle, { backgroundColor: shade.surface }]}
            >
              <AppIcon name="plus" size={12} color={shade.dopamine} />
              <Text style={[styles.customToggleText, { color: shade.dopamine }]}>
                Custom Bill
              </Text>
            </ScalePressable>
          </View>

          <QuickPresetChips
            presets={quickPresets}
            shade={shade}
            accentColor={shade.text}
            onSelect={(preset) =>
              onAddBill(preset.name, preset.icon, preset.amount)
            }
          />
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
            ? `Remove "${pendingDeleteBill.name}" (${formatPesoDisplay(
                pendingDeleteBill.amount,
                privacyMode
              )}/mo) from your fixed bills?`
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
    flexShrink: 0,
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
    textAlign: 'center',
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  customToggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
