import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScalePressable } from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../../components/AppIcon';
import { isEditableEntryType } from '../../state/budgetReducer';
import { ThemeShade } from '../../theme/palette';
import { TransactionEntry } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { formatPeso } from '../../utils/numberFormat';

interface AccountEntryRowProps {
  entry: TransactionEntry;
  selectedAccountId: string;
  isCreditCard: boolean;
  undoable: boolean;
  shade: ThemeShade;
  privacyMode: boolean;
  onEdit: (entry: TransactionEntry) => void;
  onRequestUndo: (entry: TransactionEntry, deltaString: string) => void;
}

export const AccountEntryRow: React.FC<AccountEntryRowProps> = React.memo(
  ({
    entry,
    selectedAccountId,
    isCreditCard,
    undoable,
    shade,
    privacyMode,
    onEdit,
    onRequestUndo,
  }) => {
    const isDeposit = entry.type === 'wallet_deposit';
    const isAdjust = entry.type === 'wallet_adjust';
    const isBillPaid = entry.type === 'bill_paid';
    const isEnvelopeSpend = entry.type === 'envelope_spend';
    const isDebtInflow = entry.type === 'debt_inflow';
    const isDebtOutflow = entry.type === 'debt_outflow';
    const isTransfer = entry.type === 'wallet_transfer';
    const isIncomingTransfer =
      isTransfer && entry.toPaymentSourceId === selectedAccountId;
    const adjPositive = (entry.signedDelta || 0) >= 0;
    const editable = isEditableEntryType(entry);

    const deltaColor =
      isDeposit || isIncomingTransfer || isDebtInflow
        ? shade.positive
        : isAdjust
        ? adjPositive
          ? shade.positive
          : shade.warning
        : shade.text;

    const deltaString = privacyMode
      ? '₱••••'
      : isDeposit || isIncomingTransfer || isDebtInflow
      ? `+${formatPeso(entry.amount)}`
      : isAdjust
      ? `${adjPositive ? '+' : '-'}${formatPeso(entry.amount)}`
      : `-${formatPeso(entry.amount)}`;

    const typeLabel = isIncomingTransfer
      ? isCreditCard
        ? `Paid from ${entry.paymentSourceLabel || 'Account'}`
        : `From ${entry.paymentSourceLabel || 'Account'}`
      : isTransfer
      ? `To ${entry.toPaymentSourceLabel || 'Account'}`
      : isDeposit
      ? isCreditCard
        ? 'Card Payment'
        : 'Added'
      : isDebtInflow
      ? entry.debtAction === 'created'
        ? 'Borrowed'
        : 'Debt Received'
      : isDebtOutflow
      ? entry.debtAction === 'created'
        ? 'Lent'
        : 'Debt Paid'
      : isAdjust
      ? 'Updated Balance'
      : isBillPaid
      ? 'Bill Paid'
      : isEnvelopeSpend
      ? 'Allowance Spend'
      : 'Spent';

    return (
      <View
        style={[
          styles.logRow,
          {
            backgroundColor: shade.card,
            borderColor:
              isDeposit || isIncomingTransfer ? shade.positive : shade.border,
          },
        ]}
      >
        <ScalePressable
          disabled={!editable}
          onPress={() => {
            if (!editable) return;
            triggerLightHaptic();
            onEdit(entry);
          }}
          accessibilityLabel={editable ? `Edit ${entry.label}` : undefined}
          style={styles.logTapArea}
        >
          <View style={styles.logLeft}>
            <IconBadge
              name={entry.icon}
              size={14}
              color={deltaColor}
              bg={shade.surface}
              boxSize={32}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.labelRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.logLabel, { color: shade.text }]}
                >
                  {entry.label}
                </Text>
                {editable && (
                  <AppIcon name="edit-2" size={10} color={shade.muted} />
                )}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.accountSub, { color: shade.muted }]}
              >
                {entry.dateKey || ''} • {typeLabel}
              </Text>
            </View>
          </View>

          <Text style={[styles.logDelta, { color: deltaColor }]}>
            {deltaString}
          </Text>
        </ScalePressable>

        {undoable ? (
          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              onRequestUndo(entry, deltaString);
            }}
            accessibilityLabel={`Undo ${entry.label}`}
            hitSlop={6}
            style={[styles.undoMini, { backgroundColor: shade.surface }]}
          >
            <Text style={[styles.undoMiniText, { color: shade.muted }]}>
              Undo
            </Text>
          </ScalePressable>
        ) : (
          <View
            style={[styles.undoMini, { backgroundColor: shade.surface }]}
          >
            <Text style={[styles.undoMiniText, { color: shade.muted }]}>
              Locked
            </Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  logRow: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  logTapArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  logLabel: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  accountSub: {
    fontSize: 11,
  },
  logDelta: {
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
  undoMini: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  undoMiniText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
