import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScalePressable } from '../../components/AnimatedPrimitives';
import {
  AppIcon,
  BUCKET_ICON_CHOICES,
  TREAT_ICON_CHOICES,
} from '../../components/AppIcon';
import { FormModal } from '../../components/FormModal';
import { useBudget } from '../../context/BudgetContext';
import { SinkingFundItem } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { formatPesoInput, parsePesoInput } from '../../utils/numberFormat';

const SINKING_PRESETS = [
  { icon: 'shield', name: 'Emergency Fund', target: 45000, months: 12 },
  { icon: 'compass', name: 'Travel Fund', target: 25000, months: 8 },
  { icon: 'gift', name: 'Holiday Gifts', target: 10000, months: 6 },
  { icon: 'book-open', name: 'Education', target: 20000, months: 10 },
];

interface VaultModalsProps {
  showAddTreat: boolean;
  onCloseAddTreat: () => void;
  showAddFund: boolean;
  onCloseAddFund: () => void;
  depositTargetFund: SinkingFundItem | null;
  onCloseDepositFund: () => void;
}

export const VaultModals: React.FC<VaultModalsProps> = ({
  showAddTreat,
  onCloseAddTreat,
  showAddFund,
  onCloseAddFund,
  depositTargetFund,
  onCloseDepositFund,
}) => {
  const { shade, treats, addTreat, addSinkingFund, depositToSinkingFund } =
    useBudget();

  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState<string>('headphones');
  const [newTargetText, setNewTargetText] = useState('');
  const [treatFormError, setTreatFormError] = useState<string | null>(null);

  const [fundIcon, setFundIcon] = useState<string>('shield');
  const [fundName, setFundName] = useState('');
  const [fundTargetText, setFundTargetText] = useState('');
  const [fundMonthsText, setFundMonthsText] = useState('6');
  const [fundFormError, setFundFormError] = useState<string | null>(null);

  const [depositAmtText, setDepositAmtText] = useState('');
  const [depositFormError, setDepositFormError] = useState<string | null>(null);

  useEffect(() => {
    if (showAddTreat) setTreatFormError(null);
  }, [showAddTreat]);

  useEffect(() => {
    if (showAddFund) setFundFormError(null);
  }, [showAddFund]);

  useEffect(() => {
    if (depositTargetFund) {
      setDepositAmtText('');
      setDepositFormError(null);
    }
  }, [depositTargetFund]);

  const canAddMore = treats.length < 3;
  const numericTarget = parsePesoInput(newTargetText);
  const numericFundTarget = parsePesoInput(fundTargetText);
  const numericFundMonths =
    parseInt(fundMonthsText.replace(/[^0-9]/g, ''), 10) || 0;
  const numericDepositAmt = parsePesoInput(depositAmtText);

  const isTreatFormValid =
    canAddMore && Boolean(newName.trim()) && numericTarget > 0;
  const isFundFormValid =
    Boolean(fundName.trim()) && numericFundTarget > 0 && numericFundMonths >= 1;

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
    setNewName('');
    setNewTargetText('');
    setNewIcon('headphones');
    onCloseAddTreat();
  };

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
    setFundName('');
    setFundTargetText('');
    setFundMonthsText('6');
    setFundIcon('shield');
    onCloseAddFund();
  };

  const handleConfirmFundDeposit = () => {
    if (!depositTargetFund) return;
    if (numericDepositAmt <= 0) {
      setDepositFormError('Please enter an amount greater than ₱0.');
      return;
    }
    setDepositFormError(null);
    depositToSinkingFund(depositTargetFund.id, numericDepositAmt);
    setDepositAmtText('');
    onCloseDepositFund();
  };

  return (
    <>
      <FormModal
        visible={showAddTreat}
        title="Add Treat Goal"
        subtitle="Max 3 locked goals"
        icon={newIcon}
        accentColor={shade.dopamine}
        onClose={() => {
          setTreatFormError(null);
          onCloseAddTreat();
        }}
      >
        <Text style={[styles.formLabel, { color: shade.muted }]}>
          Pick an icon
        </Text>
        <View style={styles.emojiRow}>
          {TREAT_ICON_CHOICES.map((iconName) => {
            const active = newIcon === iconName;
            return (
              <ScalePressable
                key={iconName}
                onPress={() => {
                  triggerLightHaptic();
                  setNewIcon(iconName);
                }}
                style={[
                  styles.emojiPill,
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
          value={newName}
          onChangeText={(t) => {
            setNewName(t);
            if (treatFormError) setTreatFormError(null);
          }}
          placeholder="What do you want? (e.g., Running Shoes)"
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

        <View
          style={[
            styles.amountBox,
            { backgroundColor: shade.surface, borderColor: shade.dopamine },
          ]}
        >
          <Text style={[styles.pesoSign, { color: shade.dopamine }]}>₱</Text>
          <TextInput
            value={newTargetText}
            onChangeText={(t) => {
              setNewTargetText(formatPesoInput(t));
              if (treatFormError) setTreatFormError(null);
            }}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="Exact price"
            placeholderTextColor={shade.muted}
            style={[styles.amountInput, { color: shade.text }]}
          />
        </View>

        {treatFormError && (
          <Text style={[styles.formErrorText, { color: shade.warning }]}>
            {treatFormError}
          </Text>
        )}

        <ScalePressable
          onPress={handleCreateTreat}
          style={[
            styles.createBtn,
            {
              backgroundColor: isTreatFormValid
                ? shade.dopamine
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

      <FormModal
        visible={showAddFund}
        title="Add Savings Bucket"
        subtitle="Track goals with monthly pace"
        icon={fundIcon}
        accentColor={shade.positive}
        onClose={() => {
          setFundFormError(null);
          onCloseAddFund();
        }}
      >
        <Text style={[styles.formLabel, { color: shade.muted }]}>
          Quick starters
        </Text>
        <View style={styles.emojiRow}>
          {SINKING_PRESETS.map((p) => (
            <ScalePressable
              key={p.name}
              onPress={() => {
                triggerLightHaptic();
                setFundIcon(p.icon);
                setFundName(p.name);
                setFundTargetText(formatPesoInput(String(p.target)));
                setFundMonthsText(String(p.months));
                setFundFormError(null);
              }}
              style={[styles.presetChip, { backgroundColor: shade.surface }]}
            >
              <AppIcon name={p.icon} size={12} color={shade.positive} />
              <Text style={[styles.presetChipText, { color: shade.text }]}>
                {p.name}
              </Text>
            </ScalePressable>
          ))}
        </View>

        <Text style={[styles.formLabel, { color: shade.muted }]}>
          Pick an icon
        </Text>
        <View style={styles.emojiRow}>
          {BUCKET_ICON_CHOICES.map((iconName) => {
            const active = fundIcon === iconName;
            return (
              <ScalePressable
                key={iconName}
                onPress={() => {
                  triggerLightHaptic();
                  setFundIcon(iconName);
                }}
                style={[
                  styles.emojiPill,
                  {
                    backgroundColor: active ? shade.positive : shade.surface,
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
          <View
            style={[
              styles.amountBox,
              {
                flex: 1.5,
                backgroundColor: shade.surface,
                borderColor: shade.border,
              },
            ]}
          >
            <Text style={[styles.pesoSign, { color: shade.positive }]}>₱</Text>
            <TextInput
              value={fundTargetText}
              onChangeText={(t) => {
                setFundTargetText(formatPesoInput(t));
                if (fundFormError) setFundFormError(null);
              }}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="Target ₱"
              placeholderTextColor={shade.muted}
              style={[styles.amountInput, { color: shade.text }]}
            />
          </View>
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
          style={[
            styles.createBtn,
            {
              backgroundColor: isFundFormValid
                ? shade.positive
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

      <FormModal
        visible={depositTargetFund !== null}
        title={
          depositTargetFund
            ? `Deposit to ${depositTargetFund.name}`
            : 'Deposit to Bucket'
        }
        subtitle="Enter exact peso amount"
        icon={depositTargetFund?.icon || 'shield'}
        accentColor={shade.positive}
        onClose={() => {
          setDepositFormError(null);
          onCloseDepositFund();
        }}
      >
        <View
          style={[
            styles.amountBox,
            { backgroundColor: shade.surface, borderColor: shade.positive },
          ]}
        >
          <Text style={[styles.pesoSign, { color: shade.positive }]}>₱</Text>
          <TextInput
            value={depositAmtText}
            onChangeText={(t) => {
              setDepositAmtText(formatPesoInput(t));
              if (depositFormError) setDepositFormError(null);
            }}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0"
            placeholderTextColor={shade.muted}
            autoFocus
            style={[styles.amountInput, { color: shade.text }]}
          />
        </View>

        {depositFormError && (
          <Text style={[styles.formErrorText, { color: shade.warning }]}>
            {depositFormError}
          </Text>
        )}

        <ScalePressable
          onPress={handleConfirmFundDeposit}
          style={[
            styles.createBtn,
            {
              backgroundColor:
                numericDepositAmt > 0 ? shade.positive : shade.surface,
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
    </>
  );
};

const styles = StyleSheet.create({
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  emojiPill: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
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
  pesoSign: {
    fontSize: 16,
    fontWeight: '800',
    marginRight: 6,
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
