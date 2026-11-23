import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ThemeShade } from '../theme/palette';
import {
  EnvelopeCadence,
  EnvelopeRolloverMode,
  SpendingEnvelopeItem,
} from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import {
  formatPeso,
  formatPesoDisplay,
  formatPesoInput,
  formatPesoNumber,
  parsePesoInput,
} from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon, ENVELOPE_ICON_CHOICES } from './AppIcon';
import { FormModal } from './FormModal';

export const ENVELOPE_PRESETS: Array<{
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

export interface AddEditEnvelopeModalProps {
  visible: boolean;
  editingEnvelope: SpendingEnvelopeItem | null;
  salaryFrequency: 1 | 2;
  shade: ThemeShade;
  privacyMode?: boolean;
  collapsible?: boolean;
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
  onClose: () => void;
}

const AddEditEnvelopeModalContent: React.FC<
  Omit<AddEditEnvelopeModalProps, 'visible'>
> = ({
  editingEnvelope,
  salaryFrequency,
  shade,
  privacyMode = false,
  collapsible = false,
  onAddEnvelope,
  onUpdateEnvelope,
  onClose,
}) => {
  const [formIcon, setFormIcon] = useState(
    editingEnvelope ? editingEnvelope.icon : 'heart'
  );
  const [formName, setFormName] = useState(
    editingEnvelope ? editingEnvelope.name : ''
  );
  const [formAmountText, setFormAmountText] = useState(
    editingEnvelope ? formatPesoNumber(editingEnvelope.amountPerCycle) : ''
  );
  const [formBalanceText, setFormBalanceText] = useState(
    editingEnvelope ? formatPesoNumber(editingEnvelope.balance) : ''
  );
  const [formCadence, setFormCadence] = useState<EnvelopeCadence>(
    editingEnvelope ? editingEnvelope.cadence : 'per_payday'
  );
  const [formRolloverMode, setFormRolloverMode] =
    useState<EnvelopeRolloverMode>(
      editingEnvelope ? editingEnvelope.rolloverMode : 'rollover'
    );
  const [formError, setFormError] = useState<string | null>(null);

  const mask = (amt: number) => formatPesoDisplay(amt, privacyMode);
  const parsedCycleAmt = parsePesoInput(formAmountText);
  const parsedBalanceAmt = parsePesoInput(formBalanceText);
  const monthlyPreview =
    parsedCycleAmt * (formCadence === 'per_payday' ? salaryFrequency : 1);
  const isFormValid = Boolean(formName.trim()) && parsedCycleAmt > 0;

  const handleSaveModal = () => {
    if (!formName.trim()) {
      setFormError('Please enter an allowance name.');
      return;
    }
    if (parsedCycleAmt <= 0) {
      setFormError('Please enter an amount greater than ₱0.00.');
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
    onClose();
  };

  return (
    <FormModal
      visible
      title={editingEnvelope ? 'Edit Allowance' : 'New Allowance'}
      subtitle="Set aside upfront so spending won't touch your daily budget"
      icon={formIcon}
      accentColor={shade.dopamine}
      onClose={onClose}
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
                  setFormAmountText(formatPesoNumber(preset.amount));
                  setFormCadence(preset.cadence);
                  setFormRolloverMode(preset.rolloverMode);
                  setFormError(null);
                }}
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
        placeholder="Allowance name (e.g., Date Night, Coffee)"
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
          keyboardType="decimal-pad"
          inputMode="decimal"
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
              keyboardType="decimal-pad"
              inputMode="decimal"
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
                  color: formRolloverMode === 'reset' ? '#FFFFFF' : shade.text,
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
          {editingEnvelope ? 'Save Allowance' : 'Add Allowance'}
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

export const AddEditEnvelopeModal: React.FC<AddEditEnvelopeModalProps> = ({
  visible,
  editingEnvelope,
  ...rest
}) => {
  if (!visible) return null;
  return (
    <AddEditEnvelopeModalContent
      key={editingEnvelope?.id ?? 'new'}
      editingEnvelope={editingEnvelope}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
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
