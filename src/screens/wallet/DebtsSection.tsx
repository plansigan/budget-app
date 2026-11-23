import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AnimatedProgressBar,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { AppIcon } from '../../components/AppIcon';
import { useBudget } from '../../context/BudgetContext';
import { roundCurrency } from '../../state/budgetMath';
import { DebtDirection, DebtItem } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { WalletConfirmRequest } from './AccountDetailView';

type DebtFilterKey = 'all' | DebtDirection;

interface DebtsSectionProps {
  onOpenAddDebt: (defaultDirection?: DebtDirection) => void;
  onEditDebt: (debt: DebtItem) => void;
  onPayDebt: (debt: DebtItem) => void;
  onRequestConfirm: (req: WalletConfirmRequest) => void;
}

export const DebtsSection: React.FC<DebtsSectionProps> = ({
  onOpenAddDebt,
  onEditDebt,
  onPayDebt,
  onRequestConfirm,
}) => {
  const { shade, formatVisiblePeso, debts, deleteDebt } = useBudget();
  const [filter, setFilter] = useState<DebtFilterKey>('all');
  const [showSettled, setShowSettled] = useState(false);

  const { openDebts, settledDebts, iOweTotal, owedToMeTotal } = useMemo(() => {
    const open: DebtItem[] = [];
    const settled: DebtItem[] = [];
    let oweSum = 0;
    let owedSum = 0;

    for (const d of debts) {
      const rem = roundCurrency(Math.max(0, d.amount - d.paidAmount));
      if (rem > 0) {
        open.push(d);
        if (d.direction === 'i_owe') oweSum = roundCurrency(oweSum + rem);
        else owedSum = roundCurrency(owedSum + rem);
      } else {
        settled.push(d);
      }
    }

    return {
      openDebts: open,
      settledDebts: settled,
      iOweTotal: oweSum,
      owedToMeTotal: owedSum,
    };
  }, [debts]);

  const filteredOpen = useMemo(() => {
    if (filter === 'all') return openDebts;
    return openDebts.filter((d) => d.direction === filter);
  }, [openDebts, filter]);

  return (
    <View style={styles.section}>
      {/* Two-Column Summary Strip */}
      <View style={styles.summaryRow}>
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setFilter((prev) => (prev === 'i_owe' ? 'all' : 'i_owe'));
          }}
          style={[
            styles.summaryBox,
            {
              backgroundColor: shade.card,
              borderColor: filter === 'i_owe' ? shade.warning : shade.border,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <Text style={[styles.summaryLabel, { color: shade.warning }]}>
              I OWE
            </Text>
            <AppIcon name="arrow-up-right" size={13} color={shade.warning} />
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            style={[styles.summaryAmount, { color: shade.text }]}
          >
            {formatVisiblePeso(iOweTotal)}
          </Text>
        </ScalePressable>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setFilter((prev) =>
              prev === 'owed_to_me' ? 'all' : 'owed_to_me'
            );
          }}
          style={[
            styles.summaryBox,
            {
              backgroundColor: shade.card,
              borderColor:
                filter === 'owed_to_me' ? shade.positive : shade.border,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <Text style={[styles.summaryLabel, { color: shade.positive }]}>
              OWED TO ME
            </Text>
            <AppIcon name="arrow-down-left" size={13} color={shade.positive} />
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            style={[styles.summaryAmount, { color: shade.positive }]}
          >
            {formatVisiblePeso(owedToMeTotal)}
          </Text>
        </ScalePressable>
      </View>

      {/* Filter Pills + Add Debt Header */}
      <View style={styles.toolbarRow}>
        <View style={[styles.filterBar, { backgroundColor: shade.surface }]}>
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'i_owe', label: 'I Owe' },
              { key: 'owed_to_me', label: 'Owed' },
            ] as const
          ).map((item) => {
            const active = filter === item.key;
            return (
              <ScalePressable
                key={item.key}
                onPress={() => {
                  triggerLightHaptic();
                  setFilter(item.key);
                }}
                style={[
                  styles.filterPill,
                  active && { backgroundColor: shade.card },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? shade.text : shade.muted },
                  ]}
                >
                  {item.label}
                </Text>
              </ScalePressable>
            );
          })}
        </View>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            onOpenAddDebt(filter === 'owed_to_me' ? 'owed_to_me' : 'i_owe');
          }}
          style={[styles.addBtn, { backgroundColor: shade.surface }]}
        >
          <AppIcon name="plus" size={12} color={shade.accent} />
          <Text style={[styles.addBtnText, { color: shade.accent }]}>
            Add Debt
          </Text>
        </ScalePressable>
      </View>

      {/* Open Debts List */}
      {filteredOpen.length === 0 ? (
        <View
          style={[
            styles.emptyBox,
            { backgroundColor: shade.card, borderColor: shade.border },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: shade.text }]}>
            {openDebts.length === 0
              ? 'No open debts right now'
              : 'No debts match this filter'}
          </Text>
          <Text style={[styles.emptySub, { color: shade.muted }]}>
            {openDebts.length === 0
              ? 'Track borrowed cash or split bills without cluttering your daily budget.'
              : 'Switch back to All above to view all open debts.'}
          </Text>
        </View>
      ) : (
        <View style={styles.listGap}>
          {filteredOpen.map((debt) => {
            const remaining = roundCurrency(
              Math.max(0, debt.amount - debt.paidAmount)
            );
            const isOwe = debt.direction === 'i_owe';
            const pct =
              debt.amount > 0
                ? Math.min(100, Math.round((debt.paidAmount / debt.amount) * 100))
                : 0;
            const badgeBg = isOwe ? shade.warningSoft : shade.positiveSoft;
            const badgeFg = isOwe ? shade.warning : shade.positive;

            return (
              <View
                key={debt.id}
                style={[
                  styles.debtCard,
                  { backgroundColor: shade.card, borderColor: shade.border },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.personCol}>
                    <View style={styles.nameBadgeRow}>
                      <View
                        style={[styles.dirBadge, { backgroundColor: badgeBg }]}
                      >
                        <Text style={[styles.dirText, { color: badgeFg }]}>
                          {isOwe ? 'I Owe' : 'Owed to Me'}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[styles.personName, { color: shade.text }]}
                      >
                        {debt.personName}
                      </Text>
                    </View>
                    {Boolean(debt.note) && (
                      <Text
                        numberOfLines={1}
                        style={[styles.noteText, { color: shade.muted }]}
                      >
                        {debt.note}
                      </Text>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.remainingAmt,
                      { color: isOwe ? shade.text : shade.positive },
                    ]}
                  >
                    {formatVisiblePeso(remaining)}
                  </Text>
                </View>

                {debt.paidAmount > 0 && (
                  <View style={{ gap: 5 }}>
                    <AnimatedProgressBar
                      percentage={pct}
                      trackColor={shade.surface}
                      fillColor={isOwe ? shade.accent : shade.positive}
                      height={6}
                    />
                    <Text style={[styles.paidMeta, { color: shade.muted }]}>
                      Paid {formatVisiblePeso(debt.paidAmount)} of{' '}
                      {formatVisiblePeso(debt.amount)} ({pct}%)
                    </Text>
                  </View>
                )}

                <View style={styles.actionRow}>
                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      onPayDebt(debt);
                    }}
                    style={[
                      styles.payActionBtn,
                      {
                        backgroundColor: isOwe
                          ? shade.surface
                          : shade.positiveSoft,
                      },
                    ]}
                  >
                    <AppIcon
                      name={isOwe ? 'arrow-up-right' : 'arrow-down-left'}
                      size={12}
                      color={isOwe ? shade.accent : shade.positive}
                    />
                    <Text
                      style={[
                        styles.actionText,
                        { color: isOwe ? shade.accent : shade.positive },
                      ]}
                    >
                      {isOwe ? 'Pay' : 'Got Paid'}
                    </Text>
                  </ScalePressable>

                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      onEditDebt(debt);
                    }}
                    style={[
                      styles.editActionBtn,
                      { backgroundColor: shade.surface },
                    ]}
                  >
                    <AppIcon name="edit-2" size={12} color={shade.text} />
                    <Text style={[styles.actionText, { color: shade.text }]}>
                      Edit
                    </Text>
                  </ScalePressable>

                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      onRequestConfirm({
                        title: 'Delete Debt?',
                        message: `Remove "${debt.personName}" (${formatVisiblePeso(
                          remaining
                        )} remaining) from Debts? Any previous activity logs will stay intact.`,
                        confirmLabel: 'Delete',
                        onConfirm: () => deleteDebt(debt.id),
                      });
                    }}
                    accessibilityLabel={`Delete debt with ${debt.personName}`}
                    style={[
                      styles.deleteBtn,
                      { backgroundColor: shade.surface },
                    ]}
                  >
                    <AppIcon name="trash-2" size={13} color={shade.muted} />
                  </ScalePressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Collapsible Settled History */}
      {settledDebts.length > 0 && (
        <View style={styles.settledWrap}>
          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              setShowSettled((v) => !v);
            }}
            style={styles.settledHeader}
          >
            <Text style={[styles.settledTitle, { color: shade.muted }]}>
              SETTLED ({settledDebts.length})
            </Text>
            <AppIcon
              name={showSettled ? 'chevron-down' : 'chevron-right'}
              size={15}
              color={shade.muted}
            />
          </ScalePressable>

          {showSettled && (
            <View style={styles.listGap}>
              {settledDebts.map((debt) => (
                <View
                  key={debt.id}
                  style={[
                    styles.settledCard,
                    {
                      backgroundColor: shade.card,
                      borderColor: shade.border,
                    },
                  ]}
                >
                  <View style={styles.personCol}>
                    <View style={styles.nameBadgeRow}>
                      <View
                        style={[
                          styles.dirBadge,
                          { backgroundColor: shade.surface },
                        ]}
                      >
                        <Text
                          style={[styles.dirText, { color: shade.muted }]}
                        >
                          {debt.direction === 'i_owe' ? 'I Owe' : 'Owed to Me'}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[styles.personName, { color: shade.text }]}
                      >
                        {debt.personName}
                      </Text>
                    </View>
                    <Text style={[styles.paidMeta, { color: shade.positive }]}>
                      Settled • {formatVisiblePeso(debt.amount)}
                      {debt.note ? ` • ${debt.note}` : ''}
                    </Text>
                  </View>

                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      onRequestConfirm({
                        title: 'Remove Settled Debt?',
                        message: `Remove this settled debt record with ${debt.personName} (${formatVisiblePeso(
                          debt.amount
                        )})?`,
                        confirmLabel: 'Remove',
                        onConfirm: () => deleteDebt(debt.id),
                      });
                    }}
                    accessibilityLabel={`Remove settled debt with ${debt.personName}`}
                    style={[
                      styles.deleteBtn,
                      { backgroundColor: shade.surface },
                    ]}
                  >
                    <AppIcon name="trash-2" size={13} color={shade.muted} />
                  </ScalePressable>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryBox: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 13,
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterBar: {
    flexDirection: 'row',
    borderRadius: 11,
    padding: 3,
    gap: 3,
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '800',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  listGap: {
    gap: 10,
  },
  debtCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  personCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  dirBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  dirText: {
    fontSize: 10,
    fontWeight: '800',
  },
  personName: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  noteText: {
    fontSize: 12,
  },
  remainingAmt: {
    flexShrink: 0,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  paidMeta: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  payActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settledWrap: {
    gap: 8,
    paddingTop: 4,
  },
  settledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settledTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  settledCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    opacity: 0.78,
  },
});
