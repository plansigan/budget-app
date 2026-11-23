import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getMonthlyEnvelopeAllocation } from '../state/budgetMath';
import { ThemeShade } from '../theme/palette';
import {
  EnvelopeCadence,
  EnvelopeRolloverMode,
  SpendingEnvelopeItem,
} from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { formatPeso, formatPesoDisplay } from '../utils/numberFormat';
import { PopValueText, ScalePressable } from './AnimatedPrimitives';
import { AppIcon, IconBadge } from './AppIcon';
import { ConfirmModal } from './ConfirmModal';
import { AddEditEnvelopeModal, ENVELOPE_PRESETS } from './EnvelopeModal';

export interface SpendingEnvelopesCardProps {
  envelopes: SpendingEnvelopeItem[];
  salaryFrequency: 1 | 2;
  shade: ThemeShade;
  privacyMode?: boolean;
  onAddEnvelope: (
    name: string,
    icon: string,
    amountPerCycle: number,
    cadence: EnvelopeCadence,
    rolloverMode: EnvelopeRolloverMode
  ) => void;
  onUpdateEnvelope: (
    id: string,
    name: string,
    icon: string,
    amountPerCycle: number,
    cadence: EnvelopeCadence,
    rolloverMode: EnvelopeRolloverMode,
    balance?: number
  ) => void;
  onDeleteEnvelope: (id: string) => void;
  onRefillEnvelope: (id: string) => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  focusSignal?: number;
}

/**
 * Interactive card in the Budget setup tab for creating and refilling
 * dedicated guilt-free Spending Envelopes (e.g., Date Fund every cutoff).
 */
const SpendingEnvelopesCardBase: React.FC<SpendingEnvelopesCardProps> = ({
  envelopes,
  salaryFrequency,
  shade,
  privacyMode = false,
  onAddEnvelope,
  onUpdateEnvelope,
  onDeleteEnvelope,
  onRefillEnvelope,
  collapsible = false,
  defaultExpanded = true,
  focusSignal = 0,
}) => {
  const [expanded, setExpanded] = useState(collapsible ? defaultExpanded : true);

  useEffect(() => {
    if (focusSignal > 0) {
      setExpanded(true);
    }
  }, [focusSignal]);
  const [envelopeModalState, setEnvelopeModalState] = useState<{
    envelope: SpendingEnvelopeItem | null;
  } | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<SpendingEnvelopeItem | null>(null);

  const mask = (amt: number) => formatPesoDisplay(amt, privacyMode);

  const totalMonthly = envelopes.reduce(
    (sum, env) => sum + getMonthlyEnvelopeAllocation(env, salaryFrequency),
    0
  );

  const openCreateModal = () => {
    triggerLightHaptic();
    setEnvelopeModalState({ envelope: null });
  };

  const openEditModal = (env: SpendingEnvelopeItem) => {
    triggerLightHaptic();
    setEnvelopeModalState({ envelope: env });
  };

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
          style={{ flex: 1 }}
        >
          <Text style={[styles.title, { color: shade.text }]}>
            Allowances ({envelopes.length})
          </Text>
          <Text style={[styles.subtitle, { color: shade.muted }]}>
            {collapsible
              ? `${mask(totalMonthly)}/mo set aside upfront`
              : "Set-aside money that won't touch your daily budget"}
          </Text>
        </ScalePressable>

        {collapsible ? (
          <View style={styles.headerActions}>
            <ScalePressable
              onPress={openCreateModal}
              style={[
                styles.customToggle,
                { backgroundColor: shade.dopamineSoft },
              ]}
            >
              <AppIcon name="plus" size={12} color={shade.dopamine} />
              <Text style={[styles.customToggleText, { color: shade.dopamine }]}>
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
          </View>
        ) : (
          <PopValueText valueTrigger={totalMonthly}>
            <View style={[styles.totalPill, { backgroundColor: shade.surface }]}>
              <Text style={[styles.totalText, { color: shade.dopamine }]}>
                {mask(totalMonthly)}/mo
              </Text>
            </View>
          </PopValueText>
        )}
      </View>

      {expanded && (
        <View style={styles.list}>
        {envelopes.length === 0 ? (
          <View style={[styles.emptyRow, { backgroundColor: shade.bg }]}>
            <Text style={[styles.emptyText, { color: shade.muted }]}>
              No allowances yet (e.g., Date Night or Coffee). Tap + Add above.
            </Text>
          </View>
        ) : (
          envelopes.map((env) => {
            const cadenceLabel =
              env.cadence === 'per_payday' ? 'cutoff' : 'mo';
            const modeLabel =
              env.rolloverMode === 'rollover' ? 'Rollover' : 'Reset';
            return (
              <View
                key={env.id}
                style={[styles.envCard, { backgroundColor: shade.surface }]}
              >
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
                    onPress={() => onRefillEnvelope(env.id)}
                    style={[
                      styles.actionChip,
                      {
                        backgroundColor: shade.card,
                        borderColor: shade.border,
                      },
                    ]}
                  >
                    <AppIcon name="rotate-ccw" size={11} color={shade.positive} />
                    <Text
                      style={[styles.actionChipText, { color: shade.positive }]}
                    >
                      {env.rolloverMode === 'rollover' ? '+ Refill' : 'Reset'}
                    </Text>
                  </ScalePressable>

                  <ScalePressable
                    onPress={() => openEditModal(env)}
                    style={[
                      styles.actionChip,
                      {
                        backgroundColor: shade.card,
                        borderColor: shade.border,
                      },
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
                      setPendingDelete(env);
                    }}
                    accessibilityLabel={`Remove ${env.name}`}
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
          })
        )}
        </View>
      )}

      {expanded && !collapsible && (
        <View style={styles.presetSection}>
          <View style={styles.headerRow}>
            <Text style={[styles.presetLabel, { color: shade.muted }]}>
              QUICK ADD ALLOWANCE
            </Text>
            <ScalePressable
              onPress={openCreateModal}
              style={[styles.customToggle, { backgroundColor: shade.surface }]}
            >
              <AppIcon name="plus" size={12} color={shade.dopamine} />
              <Text style={[styles.customToggleText, { color: shade.dopamine }]}>
                Custom Allowance
              </Text>
            </ScalePressable>
          </View>

          <View style={styles.presetChips}>
            {ENVELOPE_PRESETS.map((preset) => (
              <ScalePressable
                key={preset.name}
                onPress={() =>
                  onAddEnvelope(
                    preset.name,
                    preset.icon,
                    preset.amount,
                    preset.cadence,
                    preset.rolloverMode
                  )
                }
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

      <AddEditEnvelopeModal
        visible={envelopeModalState !== null}
        editingEnvelope={envelopeModalState?.envelope ?? null}
        salaryFrequency={salaryFrequency}
        shade={shade}
        privacyMode={privacyMode}
        collapsible={collapsible}
        onAddEnvelope={onAddEnvelope}
        onUpdateEnvelope={onUpdateEnvelope}
        onClose={() => setEnvelopeModalState(null)}
      />

      <ConfirmModal
        visible={pendingDelete !== null}
        title="Remove Allowance?"
        message={
          pendingDelete
            ? `Remove "${pendingDelete.name}"? Its monthly set-aside will return to your daily budget.`
            : ''
        }
        confirmLabel="Remove"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            onDeleteEnvelope(pendingDelete.id);
          }
          setPendingDelete(null);
        }}
      />
    </View>
  );
};

export const SpendingEnvelopesCard = React.memo(SpendingEnvelopesCardBase);

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  totalText: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  list: {
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
    lineHeight: 16,
  },
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
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
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
