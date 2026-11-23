import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  FadeSlideIn,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { IconBadge } from '../../components/AppIcon';
import { useThemePrefs } from '../../context/BudgetContext';
import { isEditableEntryType } from '../../state/budgetReducer';
import { TransactionEntry, TreatVaultItem } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { getTransactionPresentation } from '../../utils/transactionDisplay';

interface TodayActivityCardProps {
  isTodaySelected: boolean;
  selectedDateKey: string;
  selectedDayEntries: TransactionEntry[];
  totalEntriesCount: number;
  treats: TreatVaultItem[];
  onOpenAllActivity: () => void;
  onEditEntry: (entry: TransactionEntry) => void;
  onRequestUndo: (entry: TransactionEntry) => void;
  onDirectUndo: (entryId: string) => void;
}

export const TodayActivityCard: React.FC<TodayActivityCardProps> = React.memo(
  ({
    isTodaySelected,
    selectedDateKey,
    selectedDayEntries,
    totalEntriesCount,
    treats,
    onOpenAllActivity,
    onEditEntry,
    onRequestUndo,
    onDirectUndo,
  }) => {
    const { shade, privacyMode } = useThemePrefs();

    return (
      <FadeSlideIn delay={120} distance={14}>
        <View
          style={[
            styles.sectionCard,
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
                {selectedDayEntries.length} today
              </Text>
              {totalEntriesCount > 0 && (
                <ScalePressable
                  onPress={() => {
                    triggerLightHaptic();
                    onOpenAllActivity();
                  }}
                  hitSlop={6}
                  style={[
                    styles.viewAllChip,
                    {
                      backgroundColor: shade.surface,
                      borderColor: shade.border,
                    },
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
                Nothing logged yet. Tap Spend! or Savings Jar above.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {selectedDayEntries.slice(0, 4).map((entry) => {
                const { deltaText, deltaColor } = getTransactionPresentation(
                  entry,
                  shade,
                  privacyMode
                );
                const editable =
                  isEditableEntryType(entry) &&
                  (entry.type !== 'treat_direct' ||
                    !entry.treatId ||
                    !treats.some((t) => t.id === entry.treatId && t.claimed));
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
                      { backgroundColor: shade.surface },
                    ]}
                  >
                    <View style={styles.activityContent}>
                      <View style={styles.rowBetween}>
                        <ScalePressable
                          disabled={!editable}
                          onPress={() => {
                            if (!editable) return;
                            triggerLightHaptic();
                            onEditEntry(entry);
                          }}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <IconBadge
                            name={entry.icon}
                            size={14}
                            color={deltaColor}
                            bg={shade.card}
                            boxSize={34}
                          />
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.rowTitle,
                              { color: shade.text, flex: 1 },
                            ]}
                          >
                            {entry.label}
                          </Text>
                        </ScalePressable>
                        <ScalePressable
                          onPress={() => {
                            const linkedClaimed =
                              (entry.type === 'treat_direct' ||
                                entry.type === 'impulse_skipped' ||
                                entry.type === 'midnight_split') &&
                              Boolean(entry.treatId) &&
                              treats.some(
                                (t) => t.id === entry.treatId && t.claimed
                              );
                            if (linkedClaimed) {
                              onDirectUndo(entry.id);
                              return;
                            }
                            triggerLightHaptic();
                            onRequestUndo(entry);
                          }}
                          accessibilityLabel={`Undo ${entry.label}`}
                          hitSlop={6}
                          style={[
                            styles.undoMini,
                            { backgroundColor: shade.card },
                          ]}
                        >
                          <Text
                            style={[styles.undoMiniText, { color: shade.muted }]}
                          >
                            Undo
                          </Text>
                        </ScalePressable>
                      </View>
                      <ScalePressable
                        disabled={!editable}
                        onPress={() => {
                          if (!editable) return;
                          triggerLightHaptic();
                          onEditEntry(entry);
                        }}
                        style={styles.rowBottomWrap}
                      >
                        <Text
                          numberOfLines={1}
                          style={[styles.rowSub, { color: shade.muted }]}
                        >
                          {sourceText}
                        </Text>
                        <Text style={[styles.rowDelta, { color: deltaColor }]}>
                          {deltaText}
                        </Text>
                      </ScalePressable>
                    </View>
                  </View>
                );
              })}
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
  activityHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAllChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '800',
  },
  activityEmpty: {
    borderRadius: 14,
    padding: 16,
  },
  activityEmptyText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
  },
  activityRow: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowBottomWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
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
  undoMini: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  undoMiniText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
