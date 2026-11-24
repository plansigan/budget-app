import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ThemeShade } from '../theme/palette';
import {
  EnvelopeCadence,
  EnvelopeRolloverMode,
  SpendingEnvelopeItem,
} from '../types/budget';
import {
  formatPeso,
  formatPesoDisplay,
  formatPesoNumber,
  parsePesoInput,
} from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { ENVELOPE_ICON_CHOICES } from './AppIcon';
import { FormModal } from './FormModal';
import { IconPickerGrid } from './form/IconPickerGrid';
import { PesoAmountInput } from './form/PesoAmountInput';
import { QuickPresetChips } from './form/QuickPresetChips';
import { SegmentedTabBar } from './form/SegmentedTabBar';

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

  const presetItems = ENVELOPE_PRESETS.map((p) => ({
    ...p,
    label: `${p.name} ${formatPeso(p.amount)}`,
  }));

  const handleSaveModal = () => {
    const trimmed = formName.trim();
    if (!trimmed) {
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
        trimmed,
        formIcon,
        parsedCycleAmt,
        formCadence,
        formRolloverMode,
        parsedBalanceAmt
      );
    } else {
      onAddEnvelope(
        trimmed,
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
        <QuickPresetChips
          label="Quick Starters (tap to fill)"
          presets={presetItems}
          shade={shade}
          accentColor={shade.dopamine}
          onSelect={(preset) => {
            setFormName(preset.name);
            setFormIcon(preset.icon);
            setFormAmountText(formatPesoNumber(preset.amount));
            setFormCadence(preset.cadence);
            setFormRolloverMode(preset.rolloverMode);
            setFormError(null);
          }}
        />
      )}

      <IconPickerGrid
        label="Pick an icon"
        icons={ENVELOPE_ICON_CHOICES}
        selected={formIcon}
        onSelect={setFormIcon}
        shade={shade}
        activeBg={shade.dopamineBtnBg}
        activeFg="#FFFFFF"
      />

      <TextInput
        value={formName}
        onChangeText={(t) => {
          setFormName(t);
          if (formError) setFormError(null);
        }}
        placeholder="Allowance name (e.g., Date Night, Coffee)"
        placeholderTextColor={shade.muted}
        accessibilityLabel="Allowance name"
        style={[
          styles.nameInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      <PesoAmountInput
        value={formAmountText}
        onChangeText={(formatted) => {
          setFormAmountText(formatted);
          if (formError) setFormError(null);
        }}
        shade={shade}
        accentColor={shade.dopamine}
        placeholder={
          formCadence === 'per_payday'
            ? 'Amount per cutoff (e.g., 7,500)'
            : 'Monthly allowance'
        }
        inputAccessibilityLabel="Allowance cycle amount"
      />

      {editingEnvelope && (
        <View style={{ gap: 4 }}>
          <Text style={[styles.modalLabel, { color: shade.muted }]}>
            Current Available Balance
          </Text>
          <PesoAmountInput
            value={formBalanceText}
            onChangeText={setFormBalanceText}
            shade={shade}
            accentColor={shade.positive}
            placeholder="0"
            inputAccessibilityLabel="Current available allowance balance"
          />
        </View>
      )}

      <View style={{ gap: 6 }}>
        <Text style={[styles.modalLabel, { color: shade.muted }]}>
          Refill Schedule
        </Text>
        <SegmentedTabBar
          value={formCadence}
          onChange={setFormCadence}
          shade={shade}
          variant="accent"
          withBorder={false}
          options={[
            {
              key: 'per_payday',
              label: `Every Cutoff (${salaryFrequency}x/mo)`,
            },
            { key: 'monthly', label: 'Once a Month' },
          ]}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[styles.modalLabel, { color: shade.muted }]}>
          {formCadence === 'monthly'
            ? 'Unused Balance on New Month'
            : 'Unused Balance on Payday'}
        </Text>
        <SegmentedTabBar
          value={formRolloverMode}
          onChange={setFormRolloverMode}
          shade={shade}
          variant="accent"
          withBorder={false}
          activeBgColor={shade.dopamineBtnBg}
          activeTextColor="#FFFFFF"
          options={[
            { key: 'rollover', label: 'Roll over leftover' },
            { key: 'reset', label: 'Reset to cycle amt' },
          ]}
        />
      </View>

      <Text style={[styles.impactHint, { color: shade.muted }]}>
        Monthly budget impact: {mask(monthlyPreview)}/mo set aside automatically
      </Text>

      {formError ? (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {formError}
        </Text>
      ) : null}

      <ScalePressable
        onPress={handleSaveModal}
        accessibilityRole="button"
        style={[
          styles.addBtn,
          {
            backgroundColor: isFormValid
              ? shade.dopamineBtnBg
              : shade.surface,
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
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  nameInput: {
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  impactHint: {
    fontSize: 11,
    fontWeight: '600',
  },
  addBtn: {
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
