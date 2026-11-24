import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScalePressable } from '../../components/AnimatedPrimitives';
import {
  BUCKET_ICON_CHOICES,
  TREAT_ICON_CHOICES,
} from '../../components/AppIcon';
import { FormModal } from '../../components/FormModal';
import { IconPickerGrid } from '../../components/form/IconPickerGrid';
import { PesoAmountInput } from '../../components/form/PesoAmountInput';
import {
  PresetChipOption,
  QuickPresetChips,
} from '../../components/form/QuickPresetChips';
import {
  useBudgetActions,
  useGoals,
  useThemePrefs,
} from '../../context/BudgetContext';
import { SinkingFundItem } from '../../types/budget';
import { formatPesoInput, parsePesoInput } from '../../utils/numberFormat';

interface SinkingPreset extends PresetChipOption {
  icon: string;
  target: number;
  months: number;
}

const SINKING_PRESETS: SinkingPreset[] = [
  { label: 'Emergency Fund', icon: 'shield', target: 45000, months: 12 },
  { label: 'Travel Fund', icon: 'compass', target: 25000, months: 8 },
  { label: 'Holiday Gifts', icon: 'gift', target: 10000, months: 6 },
  { label: 'Education', icon: 'book-open', target: 20000, months: 10 },
];

const AddTreatModalContent: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const { shade } = useThemePrefs();
  const { treats } = useGoals();
  const { addTreat } = useBudgetActions();

  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState<string>('headphones');
  const [newTargetText, setNewTargetText] = useState('');
  const [treatFormError, setTreatFormError] = useState<string | null>(null);

  const canAddMore = treats.length < 3;
  const numericTarget = parsePesoInput(newTargetText);
  const isTreatFormValid =
    canAddMore && Boolean(newName.trim()) && numericTarget > 0;

  const handleCreateTreat = () => {
    if (!canAddMore) {
      setTreatFormError('Maximum of 3 treats allowed in Wishlist.');
      return;
    }
    if (!newName.trim()) {
      setTreatFormError('Please enter a treat name.');
      return;
    }
    if (numericTarget <= 0) {
      setTreatFormError('Please enter a target price greater than ₱0.');
      return;
    }
    setTreatFormError(null);
    addTreat(newName, newIcon, numericTarget);
    onClose();
  };

  return (
    <FormModal
      visible
      title="Add Treat Goal"
      subtitle="Max 3 locked goals"
      icon={newIcon}
      accentColor={shade.dopamine}
      onClose={onClose}
    >
      <IconPickerGrid
        icons={TREAT_ICON_CHOICES}
        selected={newIcon}
        onSelect={setNewIcon}
        shade={shade}
        activeBg={shade.dopamineBtnBg}
        activeFg="#FFFFFF"
        label="Pick an icon"
      />

      <TextInput
        value={newName}
        onChangeText={(t) => {
          setNewName(t);
          if (treatFormError) setTreatFormError(null);
        }}
        placeholder="What do you want? (e.g., Running Shoes)"
        placeholderTextColor={shade.muted}
        autoFocus
        style={[
          styles.textInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      <PesoAmountInput
        value={newTargetText}
        onChangeText={(t) => {
          setNewTargetText(t);
          if (treatFormError) setTreatFormError(null);
        }}
        shade={shade}
        accentColor={shade.dopamine}
        borderColor={shade.dopamine}
        placeholder="Exact price"
        inputAccessibilityLabel="Treat target price"
      />

      {treatFormError && (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {treatFormError}
        </Text>
      )}

      <ScalePressable
        onPress={handleCreateTreat}
        accessibilityState={{ disabled: !isTreatFormValid }}
        style={[
          styles.createBtn,
          {
            backgroundColor: isTreatFormValid
              ? shade.dopamineBtnBg
              : shade.surface,
            opacity: isTreatFormValid ? 1 : 0.75,
          },
        ]}
      >
        <Text
          style={[
            styles.claimBtnText,
            { color: isTreatFormValid ? '#FFFFFF' : shade.muted },
          ]}
        >
          Lock & Add Treat Goal
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

const AddSinkingFundModalContent: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const { shade } = useThemePrefs();
  const { addSinkingFund } = useBudgetActions();

  const [fundIcon, setFundIcon] = useState<string>('shield');
  const [fundName, setFundName] = useState('');
  const [fundTargetText, setFundTargetText] = useState('');
  const [fundMonthsText, setFundMonthsText] = useState('6');
  const [fundFormError, setFundFormError] = useState<string | null>(null);

  const numericFundTarget = parsePesoInput(fundTargetText);
  const numericFundMonths =
    parseInt(fundMonthsText.replace(/[^0-9]/g, ''), 10) || 0;
  const isFundFormValid =
    Boolean(fundName.trim()) && numericFundTarget > 0 && numericFundMonths >= 1;

  const handleCreateFund = () => {
    if (!fundName.trim()) {
      setFundFormError('Please enter a bucket name.');
      return;
    }
    if (numericFundTarget <= 0) {
      setFundFormError('Please enter a target amount greater than ₱0.');
      return;
    }
    if (numericFundMonths < 1) {
      setFundFormError('Months to goal must be at least 1.');
      return;
    }
    setFundFormError(null);
    addSinkingFund(fundName, fundIcon, numericFundTarget, numericFundMonths);
    onClose();
  };

  return (
    <FormModal
      visible
      title="Add Savings Bucket"
      subtitle="Track goals with monthly pace"
      icon={fundIcon}
      accentColor={shade.positive}
      onClose={onClose}
    >
      <QuickPresetChips
        presets={SINKING_PRESETS}
        onSelect={(preset) => {
          setFundIcon(preset.icon);
          setFundName(preset.label);
          setFundTargetText(formatPesoInput(String(preset.target)));
          setFundMonthsText(String(preset.months));
          setFundFormError(null);
        }}
        shade={shade}
        accentColor={shade.positive}
        label="Quick starters"
      />

      <IconPickerGrid
        icons={BUCKET_ICON_CHOICES}
        selected={fundIcon}
        onSelect={setFundIcon}
        shade={shade}
        activeBg={shade.positiveBtnBg}
        activeFg="#FFFFFF"
        label="Pick an icon"
      />

      <TextInput
        value={fundName}
        onChangeText={(t) => {
          setFundName(t);
          if (fundFormError) setFundFormError(null);
        }}
        placeholder="Bucket name (e.g., Japan Trip)"
        placeholderTextColor={shade.muted}
        style={[
          styles.textInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      <View style={styles.breakdownRow}>
        <PesoAmountInput
          value={fundTargetText}
          onChangeText={(t) => {
            setFundTargetText(t);
            if (fundFormError) setFundFormError(null);
          }}
          shade={shade}
          accentColor={shade.positive}
          placeholder="Target ₱"
          inputAccessibilityLabel="Savings bucket target amount"
          containerStyle={{ flex: 1.5 }}
        />

        <View
          style={[
            styles.amountBox,
            {
              flex: 1,
              backgroundColor: shade.surface,
              borderColor: shade.border,
            },
          ]}
        >
          <TextInput
            value={fundMonthsText}
            onChangeText={(t) => {
              setFundMonthsText(t.replace(/[^0-9]/g, ''));
              if (fundFormError) setFundFormError(null);
            }}
            keyboardType="numeric"
            maxLength={3}
            placeholder="Months"
            placeholderTextColor={shade.muted}
            accessibilityLabel="Months to goal"
            style={[styles.amountInput, { color: shade.text }]}
          />
          <Text style={[styles.microSub, { color: shade.muted }]}>mos</Text>
        </View>
      </View>

      {fundFormError && (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {fundFormError}
        </Text>
      )}

      <ScalePressable
        onPress={handleCreateFund}
        accessibilityState={{ disabled: !isFundFormValid }}
        style={[
          styles.createBtn,
          {
            backgroundColor: isFundFormValid
              ? shade.positiveBtnBg
              : shade.surface,
            opacity: isFundFormValid ? 1 : 0.75,
          },
        ]}
      >
        <Text
          style={[
            styles.claimBtnText,
            { color: isFundFormValid ? '#FFFFFF' : shade.muted },
          ]}
        >
          Create Savings Bucket
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

const DepositSinkingFundModalContent: React.FC<{
  fund: SinkingFundItem;
  onClose: () => void;
}> = ({ fund, onClose }) => {
  const { shade } = useThemePrefs();
  const { depositToSinkingFund } = useBudgetActions();

  const [depositAmtText, setDepositAmtText] = useState('');
  const [depositFormError, setDepositFormError] = useState<string | null>(null);

  const numericDepositAmt = parsePesoInput(depositAmtText);

  const handleConfirmFundDeposit = () => {
    if (numericDepositAmt <= 0) {
      setDepositFormError('Please enter an amount greater than ₱0.');
      return;
    }
    setDepositFormError(null);
    depositToSinkingFund(fund.id, numericDepositAmt);
    onClose();
  };

  return (
    <FormModal
      visible
      title={`Deposit to ${fund.name}`}
      subtitle="Enter exact peso amount"
      icon={fund.icon || 'shield'}
      accentColor={shade.positive}
      onClose={onClose}
    >
      <PesoAmountInput
        value={depositAmtText}
        onChangeText={(t) => {
          setDepositAmtText(t);
          if (depositFormError) setDepositFormError(null);
        }}
        shade={shade}
        accentColor={shade.positive}
        borderColor={shade.positive}
        placeholder="0"
        autoFocus
        inputAccessibilityLabel={`Deposit amount for ${fund.name}`}
      />

      {depositFormError && (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {depositFormError}
        </Text>
      )}

      <ScalePressable
        onPress={handleConfirmFundDeposit}
        accessibilityState={{ disabled: numericDepositAmt <= 0 }}
        style={[
          styles.createBtn,
          {
            backgroundColor:
              numericDepositAmt > 0 ? shade.positiveBtnBg : shade.surface,
            opacity: numericDepositAmt > 0 ? 1 : 0.75,
          },
        ]}
      >
        <Text
          style={[
            styles.claimBtnText,
            { color: numericDepositAmt > 0 ? '#FFFFFF' : shade.muted },
          ]}
        >
          Confirm Deposit
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

interface VaultModalsProps {
  showAddTreat: boolean;
  onCloseAddTreat: () => void;
  showAddFund: boolean;
  onCloseAddFund: () => void;
  depositTargetFund: SinkingFundItem | null;
  onCloseDepositFund: () => void;
}

/**
 * Coordinates creation and deposit modals for Treat Goals and Savings Buckets.
 */
export const VaultModals: React.FC<VaultModalsProps> = ({
  showAddTreat,
  onCloseAddTreat,
  showAddFund,
  onCloseAddFund,
  depositTargetFund,
  onCloseDepositFund,
}) => (
  <>
    {showAddTreat && <AddTreatModalContent onClose={onCloseAddTreat} />}
    {showAddFund && <AddSinkingFundModalContent onClose={onCloseAddFund} />}
    {depositTargetFund && (
      <DepositSinkingFundModalContent
        fund={depositTargetFund}
        onClose={onCloseDepositFund}
      />
    )}
  </>
);

const styles = StyleSheet.create({
  textInput: {
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 8,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '800',
    paddingVertical: 1,
  },
  microSub: {
    fontSize: 11,
  },
  createBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  claimBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
