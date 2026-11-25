import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  FadeSlideIn,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../../components/AppIcon';
import { useThemePrefs } from '../../context/BudgetContext';
import { canEditEntry, getUndoEligibility } from '../../state/budgetReducer';
import { getCardShadow } from '../../theme/tokens';
import {
  DebtItem,
  TransactionEntry,
  TreatVaultItem,
} from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { getTransactionPresentation } from '../../utils/transactionDisplay';

interface TodayActivityCardProps {
  isTodaySelected: boolean;
  selectedDateKey: string;
  selectedDayEntries: TransactionEntry[];
  totalEntriesCount: number;
  treats: TreatVaultItem[];
  debts: DebtItem[];
  onOpenAllActivity: () => void;
  onEditEntry: (entry: TransactionEntry) => void;
  onRequestUndo: (entry: TransactionEntry) => void;
}

export const TodayActivityCard: React.FC<TodayActivityCardProps> = React.memo(
  ({
    isTodaySelected,
    selectedDateKey,
    selectedDayEntries,
    totalEntriesCount,
    treats,
    debts,
    onOpenAllActivity,
    onEditEntry,
    onRequestUndo,
  }) => {
    const { shade, privacyMode } = useThemePrefs();
    const visibleEntries = selectedDayEntries.slice(0, 4);

    return (
      <FadeSlideIn delay={120} distance={10}>
        <View
          style={[
            styles.sectionCard,
            getCardShadow(shade),
            { backgroundColor: shade.card, borderColor: shade.border },
          ]}
        >
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionKicker, { color: shade.muted }]}>
              {isTodaySelected
                ? "TODAY'S ACTIVITY"
                : `ACTIVITY (${selectedDateKey})`}
            </Text>
            <View style={styles.activityHeaderRight}>
              <Text style={[styles.sectionSubHint, { color: shade.muted }]}>
                {selectedDayEntries.length} logged
              </Text>
              {totalEntriesCount > 0 && (
                <ScalePressable
                  onPress={() => {
                    triggerLightHaptic();
                    onOpenAllActivity();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`View all ${totalEntriesCount} logged entries`}
                  hitSlop={8}
                  style={[
                    styles.viewAllChip,
                    { backgroundColor: shade.surface },
                  ]}
                >
                  <Text style={[styles.viewAllText, { color: shade.text }]}>
                    View All ({totalEntriesCount})
                  </Text>
                </ScalePressable>
              )}
            </View>
          </View>

          {selectedDayEntries.length === 0 ? (
            <View
              style={[styles.activityEmpty, { backgroundColor: shade.surface }]}
            >
              <Text style={[styles.activityEmptyText, { color: shade.muted }]}>
                {isTodaySelected
                  ? 'Nothing logged today yet. Tap Spend! or Savings Jar above.'
                  : 'No entries logged on this day.'}
              </Text>
            </View>
          ) : (
            <View>
              {visibleEntries.map((entry, idx) => {
                const { deltaText, deltaColor } = getTransactionPresentation(
                  entry,
                  shade,
                  privacyMode
                );
                const editable = canEditEntry(entry, treats);
                const undoable = getUndoEligibility(entry, treats, debts).ok;
                const isLast = idx === visibleEntries.length - 1;
                const sourceText =
                  entry.type === 'wallet_transfer' &&
                    entry.paymentSourceLabel &&
                    entry.toPaymentSourceLabel
                    ? `${entry.paymentSourceLabel} → ${entry.toPaymentSourceLabel}`
                    : entry.paymentSourceLabel
                      ? `via ${entry.paymentSourceLabel}`
                      : isTodaySelected
                        ? 'Today'
                        : selectedDateKey;

                return (
                  <View
                    key={entry.id}
                    style={[
                      styles.activityRow,
                      !isLast && {
                        borderBottomWidth: 1,
                        borderBottomColor: shade.borderSubtle,
                      },
                    ]}
                  >
                    <ScalePressable
                      disabled={!editable}
                      onPress={() => {
                        if (!editable) return;
                        triggerLightHaptic();
                        onEditEntry(entry);
                      }}
                      scaleTo={0.985}
                      hoverScale={1.005}
                      accessibilityRole={editable ? 'button' : 'text'}
                      accessibilityLabel={
                        editable
                          ? `Edit ${entry.label}, ${deltaText}`
                          : `${entry.label}, ${deltaText}`
                      }
                      style={styles.activityTapArea}
                    >
                      <IconBadge
                        name={entry.icon}
                        size={15}
                        color={deltaColor}
                        bg={shade.surface}
                        boxSize={36}
                      />
                      <View style={styles.activityContent}>
                        <View style={styles.labelRow}>
                          <Text
                            numberOfLines={1}
                            style={[styles.rowTitle, { color: shade.text }]}
                          >
                            {entry.label}
                          </Text>
                          {editable && (
                            <AppIcon
                              name="edit-2"
                              size={11}
                              color={shade.muted}
                            />
                          )}
                        </View>
                        <Text
                          numberOfLines={1}
                          style={[styles.rowSub, { color: shade.muted }]}
                        >
                          {sourceText}
                        </Text>
                      </View>
                      <Text style={[styles.rowDelta, { color: deltaColor }]}>
                        {deltaText}
                      </Text>
                    </ScalePressable>

                    {undoable ? (
                      <ScalePressable
                        onPress={() => {
                          triggerLightHaptic();
                          onRequestUndo(entry);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Undo ${entry.label}`}
                        hitSlop={8}
                        style={[
                          styles.undoIconBtn,
                          { backgroundColor: shade.surface },
                        ]}
                      >
                        <AppIcon
                          name="rotate-ccw"
                          size={13}
                          color={shade.muted}
                        />
                      </ScalePressable>
                    ) : (
                      <View
                        accessible
                        accessibilityLabel={`${entry.label} cannot be undone`}
                        style={[styles.undoIconBtn, { opacity: 0.45 }]}
                      >
                        <AppIcon name="lock" size={12} color={shade.muted} />
                      </View>
                    )}
                  </View>
                );
              })}

              {selectedDayEntries.length > 4 && (
                <ScalePressable
                  onPress={() => {
                    triggerLightHaptic();
                    onOpenAllActivity();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Show all ${selectedDayEntries.length} entries`}
                  style={[styles.showAllBtn, { backgroundColor: shade.surface }]}
                >
                  <Text
                    style={[styles.showAllText, { color: shade.dopamine }]}
                  >
                    Show all {selectedDayEntries.length} entries ›
                  </Text>
                </ScalePressable>
              )}
            </View>
          )}
        </View>
      </FadeSlideIn>
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
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionSubHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  activityHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAllChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activityEmpty: {
    borderRadius: 16,
    padding: 18,
  },
  activityEmptyText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
  },
  activityRow: {
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityTapArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  activityContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  rowSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  rowDelta: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  undoIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  showAllBtn: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  showAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
