import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeShade } from '../../theme/palette';
import { TransactionEntry } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import {
  formatEntryDateLocal,
  getTransactionPresentation,
} from '../../utils/transactionDisplay';
import { ScalePressable } from '../AnimatedPrimitives';
import { AppIcon, IconBadge } from '../AppIcon';

interface ActivityHistoryRowProps {
  entry: TransactionEntry;
  editable: boolean;
  undoable: boolean;
  shade: ThemeShade;
  privacyMode: boolean;
  onEdit: (entry: TransactionEntry) => void;
  onRequestUndo: (entry: TransactionEntry) => void;
}

/**
 * Pure virtualized list row for ActivityHistoryModal with single-pressable Edit cue and gated Undo.
 */
export const ActivityHistoryRow: React.FC<ActivityHistoryRowProps> = React.memo(
  ({
    entry,
    editable,
    undoable,
    shade,
    privacyMode,
    onEdit,
    onRequestUndo,
  }) => {
    const { deltaText, deltaColor, isTreatHighlight } =
      getTransactionPresentation(entry, shade, privacyMode);
    const dateStr = formatEntryDateLocal(entry);
    const sourceMeta =
      entry.type === 'wallet_transfer' &&
      entry.paymentSourceLabel &&
      entry.toPaymentSourceLabel
        ? `${entry.paymentSourceLabel} → ${entry.toPaymentSourceLabel}`
        : entry.paymentSourceLabel || '';

    return (
      <View
        style={[
          styles.rowCard,
          {
            backgroundColor: shade.surface,
            borderColor: isTreatHighlight ? shade.dopamine : shade.border,
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
          accessibilityRole={editable ? 'button' : 'text'}
          accessibilityLabel={
            editable ? `Edit ${entry.label}, ${deltaText}` : `${entry.label}, ${deltaText}`
          }
          style={styles.rowTap}
        >
          <IconBadge
            name={entry.icon}
            size={13}
            color={deltaColor}
            bg={shade.card}
            boxSize={30}
          />
          <View style={styles.rowContent}>
            <View style={styles.rowTop}>
              <View style={styles.labelRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.rowLabel, { color: shade.text }]}
                >
                  {entry.label}
                </Text>
                {editable && (
                  <AppIcon name="edit-2" size={10} color={shade.muted} />
                )}
              </View>
            </View>
            <View style={styles.rowBottom}>
              <Text
                numberOfLines={1}
                style={[styles.rowSub, { color: shade.muted }]}
              >
                {dateStr}
                {sourceMeta ? ` • ${sourceMeta}` : ''}
              </Text>
              <Text style={[styles.rowDelta, { color: deltaColor }]}>
                {deltaText}
              </Text>
            </View>
          </View>
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
            style={[styles.undoBtn, { backgroundColor: shade.card }]}
          >
            <Text style={[styles.undoText, { color: shade.muted }]}>Undo</Text>
          </ScalePressable>
        ) : (
          <View
            accessible
            accessibilityLabel={`${entry.label} cannot be undone`}
            style={[styles.undoBtn, { backgroundColor: shade.card, opacity: 0.55 }]}
          >
            <Text style={[styles.undoText, { color: shade.muted }]}>
              Locked
            </Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  rowCard: {
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  labelRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  rowSub: {
    fontSize: 10,
    flexShrink: 1,
  },
  rowDelta: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  undoBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  undoText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
