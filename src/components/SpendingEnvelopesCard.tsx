import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getMonthlyEnvelopeAllocation, roundCurrency } from '../state/budgetMath';
import { ThemeShade } from '../theme/palette';
import {
  EnvelopeCadence,
  EnvelopeRolloverMode,
  SpendingEnvelopeItem,
} from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { formatPeso, formatPesoDisplay } from '../utils/numberFormat';
import { PopValueText, ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';
import { ConfirmModal } from './ConfirmModal';
import { AddEditEnvelopeModal, ENVELOPE_PRESETS } from './EnvelopeModal';
import { EnvelopeRowCard } from './envelopes/EnvelopeRowCard';
import { QuickPresetChips } from './form/QuickPresetChips';

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
 * dedicated guilt-free Spending Allowances (e.g., Date Fund every cutoff).
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
  const [pendingRefill, setPendingRefill] =
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
    setEnvelopeModalState({ envelope: env });
  };

  const quickPresets = ENVELOPE_PRESETS.map((p) => ({
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
              accessibilityRole="button"
              accessibilityLabel="Add new allowance"
              hitSlop={8}
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
              accessibilityRole="button"
              accessibilityLabel={
                expanded ? 'Collapse allowances' : 'Expand allowances'
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
                {collapsible
                  ? 'No allowances yet (e.g., Date Night or Coffee). Tap + Add above.'
                  : 'No allowances yet. Tap a starter below or + Custom Allowance.'}
              </Text>
            </View>
          ) : (
            envelopes.map((env) => (
              <EnvelopeRowCard
                key={env.id}
                env={env}
                shade={shade}
                privacyMode={privacyMode}
                onRequestRefill={setPendingRefill}
                onEdit={openEditModal}
                onRequestDelete={setPendingDelete}
              />
            ))
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
              accessibilityRole="button"
              accessibilityLabel="Add custom allowance"
              hitSlop={8}
              style={[styles.customToggle, { backgroundColor: shade.surface }]}
            >
              <AppIcon name="plus" size={12} color={shade.dopamine} />
              <Text style={[styles.customToggleText, { color: shade.dopamine }]}>
                Custom Allowance
              </Text>
            </ScalePressable>
          </View>

          <QuickPresetChips
            presets={quickPresets}
            shade={shade}
            accentColor={shade.dopamine}
            onSelect={(preset) =>
              onAddEnvelope(
                preset.name,
                preset.icon,
                preset.amount,
                preset.cadence,
                preset.rolloverMode
              )
            }
          />
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
        visible={pendingRefill !== null}
        title={
          pendingRefill
            ? pendingRefill.rolloverMode === 'reset'
              ? `Reset ${pendingRefill.name}?`
              : `Refill ${pendingRefill.name}?`
            : 'Confirm Refill'
        }
        message={
          pendingRefill
            ? pendingRefill.rolloverMode === 'reset'
              ? `Reset current balance (${mask(
                  pendingRefill.balance
                )}) back to ${mask(pendingRefill.amountPerCycle)}?`
              : `Add ${mask(pendingRefill.amountPerCycle)} cycle refill to ${
                  pendingRefill.name
                } (new balance: ${mask(
                  roundCurrency(
                    pendingRefill.balance + pendingRefill.amountPerCycle
                  )
                )})?`
            : ''
        }
        confirmLabel={
          pendingRefill?.rolloverMode === 'reset'
            ? 'Reset Balance'
            : 'Add Refill'
        }
        destructive={false}
        icon="rotate-ccw"
        onCancel={() => setPendingRefill(null)}
        onConfirm={() => {
          if (pendingRefill) {
            onRefillEnvelope(pendingRefill.id);
          }
          setPendingRefill(null);
        }}
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
    flexShrink: 0,
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
