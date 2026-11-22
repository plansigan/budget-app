import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { getMonthlyEnvelopeAllocation } from '../state/budgetMath';
import { ThemeShade } from '../theme/palette';
import {
  EnvelopeCadence,
  EnvelopeRolloverMode,
  SpendingEnvelopeItem,
} from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { formatPesoInput, parsePesoInput } from '../utils/numberFormat';
import { PopValueText, ScalePressable } from './AnimatedPrimitives';
import { AppIcon, ENVELOPE_ICON_CHOICES, IconBadge } from './AppIcon';
import { ConfirmModal } from './ConfirmModal';
import { FormModal } from './FormModal';

interface SpendingEnvelopesCardProps {
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
}

const ENVELOPE_PRESETS: Array<{
  name: string;
  icon: string;
  amount: number;
  cadence: EnvelopeCadence;
  rolloverMode: EnvelopeRolloverMode;
}> = [
  {
    name: 'Date Fund',
    icon: 'heart',
    amount: 7500,
    cadence: 'per_payday',
    rolloverMode: 'rollover',
  },
  {
    name: 'Dining Out',
    icon: 'shopping-bag',
    amount: 2500,
    cadence: 'per_payday',
    rolloverMode: 'reset',
  },
  {
    name: 'Personal Fun',
    icon: 'star',
    amount: 2000,
    cadence: 'per_payday',
    rolloverMode: 'rollover',
  },
  {
    name: 'Coffee & Snacks',
    icon: 'coffee',
    amount: 1000,
    cadence: 'per_payday',
    rolloverMode: 'reset',
  },
];

/**
 * Interactive card in the Budget setup tab for creating and refilling
 * dedicated guilt-free Spending Envelopes (e.g., Date Fund every cutoff).
 */
export const SpendingEnvelopesCard: React.FC<SpendingEnvelopesCardProps> = ({
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
}) => {
  const [expanded, setExpanded] = useState(collapsible ? defaultExpanded : true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEnvelope, setEditingEnvelope] =
    useState<SpendingEnvelopeItem | null>(null);
  const [formIcon, setFormIcon] = useState('heart');
  const [formName, setFormName] = useState('');
  const [formAmountText, setFormAmountText] = useState('');
  const [formBalanceText, setFormBalanceText] = useState('');
  const [formCadence, setFormCadence] = useState<EnvelopeCadence>('per_payday');
  const [formRolloverMode, setFormRolloverMode] =
    useState<EnvelopeRolloverMode>('rollover');
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<SpendingEnvelopeItem | null>(null);

  const mask = (amt: number) =>
    privacyMode ? '₱••••' : `₱${Math.round(amt).toLocaleString()}`;

  const totalMonthly = envelopes.reduce(
    (sum, env) => sum + getMonthlyEnvelopeAllocation(env, salaryFrequency),
    0
  );

  const openCreateModal = () => {
    triggerLightHaptic();
    setEditingEnvelope(null);
    setFormIcon('heart');
    setFormName('');
    setFormAmountText('');
    setFormBalanceText('');
    setFormCadence('per_payday');
    setFormRolloverMode('rollover');
    setFormError(null);
    setModalVisible(true);
  };

  const openEditModal = (env: SpendingEnvelopeItem) => {
    triggerLightHaptic();
    setEditingEnvelope(env);
    setFormIcon(env.icon);
    setFormName(env.name);
    setFormAmountText(formatPesoInput(String(env.amountPerCycle)));
    setFormBalanceText(formatPesoInput(String(env.balance)));
    setFormCadence(env.cadence);
    setFormRolloverMode(env.rolloverMode);
    setFormError(null);
    setModalVisible(true);
  };

  const parsedCycleAmt = parsePesoInput(formAmountText);
  const parsedBalanceAmt = parsePesoInput(formBalanceText);
  const monthlyPreview =
    parsedCycleAmt * (formCadence === 'per_payday' ? salaryFrequency : 1);
  const isFormValid = Boolean(formName.trim()) && parsedCycleAmt > 0;

  const handleSaveModal = () => {
    if (!formName.trim()) {
      setFormError('Please enter an envelope name.');
      return;
    }
    if (parsedCycleAmt <= 0) {
      setFormError('Please enter an amount greater than ₱0.');
      return;
    }
    setFormError(null);
    if (editingEnvelope) {
      onUpdateEnvelope(
        editingEnvelope.id,
        formName.trim(),
        formIcon,
        parsedCycleAmt,
        formCadence,
        formRolloverMode,
        parsedBalanceAmt
      );
    } else {
      onAddEnvelope(
        formName.trim(),
        formIcon,
        parsedCycleAmt,
        formCadence,
        formRolloverMode
      );
    }
    setModalVisible(false);
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
            Spending envelopes ({envelopes.length})
          </Text>
          <Text style={[styles.subtitle, { color: shade.muted }]}>
            {collapsible
              ? `${mask(totalMonthly)}/mo budgeted guilt-free`
              : 'Budgeted upfront & guilt-free to spend'}
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
              No spending envelopes yet (e.g., Date Fund every cutoff). Tap a
              starter below or + Custom Envelope.
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
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={[styles.envName, { color: shade.text }]}
                      >
                        {env.name}
                      </Text>
                      <Text style={[styles.envMeta, { color: shade.muted }]}>
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
                    <Text style={[styles.balanceText, { color: shade.dopamine }]}>
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
                    <AppIcon name="x" size={12} color={shade.muted} />
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
              QUICK ADD ENVELOPE
            </Text>
            <ScalePressable
              onPress={openCreateModal}
              style={[styles.customToggle, { backgroundColor: shade.surface }]}
            >
              <AppIcon name="plus" size={12} color={shade.dopamine} />
              <Text style={[styles.customToggleText, { color: shade.dopamine }]}>
                Custom Envelope
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
                  {preset.name} ₱{preset.amount.toLocaleString()}
                </Text>
              </ScalePressable>
            ))}
          </View>
        </View>
      )}

      <FormModal
        visible={modalVisible}
        title={editingEnvelope ? 'Edit Spending Envelope' : 'New Spending Envelope'}
        subtitle="Carved out upfront so spending feels guilt-free"
        icon={formIcon}
        accentColor={shade.dopamine}
        onClose={() => {
          setFormError(null);
          setModalVisible(false);
        }}
      >
        {!editingEnvelope && collapsible && (
          <View style={{ gap: 6 }}>
            <Text style={[styles.modalLabel, { color: shade.muted }]}>
              Quick Starters (tap to fill)
            </Text>
            <View style={styles.presetChips}>
              {ENVELOPE_PRESETS.map((preset) => (
                <ScalePressable
                  key={preset.name}
                  onPress={() => {
                    triggerLightHaptic();
                    setFormName(preset.name);
                    setFormIcon(preset.icon);
                    setFormAmountText(formatPesoInput(String(preset.amount)));
                    setFormCadence(preset.cadence);
                    setFormRolloverMode(preset.rolloverMode);
                    setFormError(null);
                  }}
                  style={[styles.presetChip, { backgroundColor: shade.surface }]}
                >
                  <AppIcon name={preset.icon} size={12} color={shade.dopamine} />
                  <Text style={[styles.presetChipText, { color: shade.text }]}>
                    {preset.name} ₱{preset.amount.toLocaleString()}
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
          {ENVELOPE_ICON_CHOICES.map((iconName) => {
            const active = formIcon === iconName;
            return (
              <ScalePressable
                key={iconName}
                onPress={() => {
                  triggerLightHaptic();
                  setFormIcon(iconName);
                }}
                style={[
                  styles.iconPill,
                  {
                    backgroundColor: active ? shade.dopamine : shade.surface,
                  },
                ]}
              >
                <AppIcon
                  name={iconName}
                  size={16}
                  color={active ? '#FFFFFF' : shade.text}
                />
              </ScalePressable>
            );
          })}
        </View>

        <TextInput
          value={formName}
          onChangeText={(t) => {
            setFormName(t);
            if (formError) setFormError(null);
          }}
          placeholder="Envelope name (e.g., Date Fund, Fun Fund)"
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
          <Text style={[styles.pesoSign, { color: shade.dopamine }]}>₱</Text>
          <TextInput
            value={formAmountText}
            onChangeText={(t) => {
              setFormAmountText(formatPesoInput(t));
              if (formError) setFormError(null);
            }}
            keyboardType="numeric"
            placeholder={
              formCadence === 'per_payday'
                ? 'Amount per cutoff (e.g., 7,500)'
                : 'Monthly allowance'
            }
            placeholderTextColor={shade.muted}
            style={[styles.newAmountInput, { color: shade.text }]}
          />
        </View>

        {editingEnvelope && (
          <View style={{ gap: 4 }}>
            <Text style={[styles.modalLabel, { color: shade.muted }]}>
              Current Available Balance
            </Text>
            <View
              style={[
                styles.newAmountWrap,
                { backgroundColor: shade.surface, borderColor: shade.border },
              ]}
            >
              <Text style={[styles.pesoSign, { color: shade.positive }]}>₱</Text>
              <TextInput
                value={formBalanceText}
                onChangeText={(t) => setFormBalanceText(formatPesoInput(t))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={shade.muted}
                style={[styles.newAmountInput, { color: shade.text }]}
              />
            </View>
          </View>
        )}

        <View style={{ gap: 6 }}>
          <Text style={[styles.modalLabel, { color: shade.muted }]}>
            Refill Schedule
          </Text>
          <View style={styles.segRow}>
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setFormCadence('per_payday');
              }}
              style={[
                styles.segBtn,
                {
                  backgroundColor:
                    formCadence === 'per_payday' ? shade.accent : shade.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.segText,
                  {
                    color:
                      formCadence === 'per_payday'
                        ? shade.accentText
                        : shade.text,
                  },
                ]}
              >
                Every Cutoff ({salaryFrequency}x/mo)
              </Text>
            </ScalePressable>
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setFormCadence('monthly');
              }}
              style={[
                styles.segBtn,
                {
                  backgroundColor:
                    formCadence === 'monthly' ? shade.accent : shade.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.segText,
                  {
                    color:
                      formCadence === 'monthly' ? shade.accentText : shade.text,
                  },
                ]}
              >
                Once a Month
              </Text>
            </ScalePressable>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={[styles.modalLabel, { color: shade.muted }]}>
            Unused Balance on New Cutoff
          </Text>
          <View style={styles.segRow}>
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setFormRolloverMode('rollover');
              }}
              style={[
                styles.segBtn,
                {
                  backgroundColor:
                    formRolloverMode === 'rollover'
                      ? shade.dopamine
                      : shade.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.segText,
                  {
                    color:
                      formRolloverMode === 'rollover' ? '#FFFFFF' : shade.text,
                  },
                ]}
              >
                Roll over leftover
              </Text>
            </ScalePressable>
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setFormRolloverMode('reset');
              }}
              style={[
                styles.segBtn,
                {
                  backgroundColor:
                    formRolloverMode === 'reset'
                      ? shade.dopamine
                      : shade.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.segText,
                  {
                    color:
                      formRolloverMode === 'reset' ? '#FFFFFF' : shade.text,
                  },
                ]}
              >
                Reset to cycle amt
              </Text>
            </ScalePressable>
          </View>
        </View>

        <Text style={[styles.impactHint, { color: shade.muted }]}>
          Monthly budget impact: {mask(monthlyPreview)}/mo set aside automatically
        </Text>

        {formError && (
          <Text style={[styles.formErrorText, { color: shade.warning }]}>
            {formError}
          </Text>
        )}

        <ScalePressable
          onPress={handleSaveModal}
          style={[
            styles.addBtn,
            {
              backgroundColor: isFormValid ? shade.dopamine : shade.surface,
              opacity: isFormValid ? 1 : 0.75,
            },
          ]}
        >
          <Text
            style={[
              styles.addBtnText,
              { color: isFormValid ? '#FFFFFF' : shade.muted },
            ]}
          >
            {editingEnvelope ? 'Save Envelope Changes' : 'Add Spending Envelope'}
          </Text>
        </ScalePressable>
      </FormModal>

      <ConfirmModal
        visible={pendingDelete !== null}
        title="Remove Spending Envelope?"
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
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
  },
  balanceText: {
    fontSize: 11,
    fontWeight: '800',
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
  pesoSign: {
    fontSize: 14,
    fontWeight: '800',
    marginRight: 5,
  },
  newAmountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '800',
    paddingVertical: 0,
  },
  segRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  segText: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  impactHint: {
    fontSize: 11,
    fontWeight: '600',
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
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
});
