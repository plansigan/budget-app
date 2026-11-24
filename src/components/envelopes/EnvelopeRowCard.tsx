import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeShade } from '../../theme/palette';
import { SpendingEnvelopeItem } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { formatPesoDisplay } from '../../utils/numberFormat';
import { ScalePressable } from '../AnimatedPrimitives';
import { AppIcon, IconBadge } from '../AppIcon';

interface EnvelopeRowCardProps {
  env: SpendingEnvelopeItem;
  shade: ThemeShade;
  privacyMode: boolean;
  onRequestRefill: (env: SpendingEnvelopeItem) => void;
  onEdit: (env: SpendingEnvelopeItem) => void;
  onRequestDelete: (env: SpendingEnvelopeItem) => void;
}

/**
 * Pure Spending Allowance row card with accessible controls and hitSlop.
 */
export const EnvelopeRowCard: React.FC<EnvelopeRowCardProps> = React.memo(
  ({
    env,
    shade,
    privacyMode,
    onRequestRefill,
    onEdit,
    onRequestDelete,
  }) => {
    const mask = (amt: number) => formatPesoDisplay(amt, privacyMode);
    const cadenceLabel = env.cadence === 'per_payday' ? 'cutoff' : 'mo';
    const modeLabel = env.rolloverMode === 'rollover' ? 'Rollover' : 'Reset';

    return (
      <View style={[styles.envCard, { backgroundColor: shade.surface }]}>
        <View style={styles.envTopRow}>
          <View style={styles.envLeft}>
            <IconBadge
              name={env.icon}
              size={14}
              color={shade.dopamine}
              bg={shade.dopamineSoft}
              boxSize={30}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={[styles.envName, { color: shade.text }]}
              >
                {env.name}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.envMeta, { color: shade.muted }]}
              >
                {mask(env.amountPerCycle)} / {cadenceLabel} • {modeLabel}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.balancePill,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.balanceText, { color: shade.dopamine }]}
            >
              {mask(env.balance)} left
            </Text>
          </View>
        </View>

        <View style={styles.envActionsRow}>
          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              onRequestRefill(env);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              env.rolloverMode === 'rollover'
                ? `Refill ${env.name}`
                : `Reset ${env.name} balance`
            }
            hitSlop={8}
            style={[
              styles.actionChip,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <AppIcon name="rotate-ccw" size={11} color={shade.positive} />
            <Text style={[styles.actionChipText, { color: shade.positive }]}>
              {env.rolloverMode === 'rollover' ? '+ Refill' : 'Reset'}
            </Text>
          </ScalePressable>

          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              onEdit(env);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${env.name}`}
            hitSlop={8}
            style={[
              styles.actionChip,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <AppIcon name="edit-2" size={11} color={shade.text} />
            <Text style={[styles.actionChipText, { color: shade.text }]}>
              Edit
            </Text>
          </ScalePressable>

          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              onRequestDelete(env);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${env.name}`}
            hitSlop={8}
            style={[
              styles.removeBtn,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <AppIcon name="trash-2" size={12} color={shade.warning} />
          </ScalePressable>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  envCard: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },
  envTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  envLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  envName: {
    fontSize: 13,
    fontWeight: '800',
  },
  envMeta: {
    fontSize: 10,
    fontWeight: '600',
  },
  balancePill: {
    flexShrink: 0,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
  },
  balanceText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  envActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
