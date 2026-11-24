import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  useBudgetActions,
  useDailyBudget,
  useGoals,
  useThemePrefs,
  useWallet,
} from '../context/BudgetContext';
import { getDaysUntilDateKey } from '../state/budgetMath';
import { SpendCategoryKey, WantToBuyItem } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { parsePesoInput } from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon, IconBadge, TREAT_ICON_CHOICES } from './AppIcon';
import { FormModal } from './FormModal';
import { IconPickerGrid } from './form/IconPickerGrid';
import { PaymentSourcePicker } from './form/PaymentSourcePicker';
import { PesoAmountInput } from './form/PesoAmountInput';
import { SpendCategoryPicker } from './form/SpendCategoryPicker';

interface AddWantToBuyModalProps {
  visible: boolean;
  onClose: () => void;
}

const AddWantToBuyModalContent: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const { shade } = useThemePrefs();
  const { addWantToBuy } = useBudgetActions();

  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [icon, setIcon] = useState('shopping-bag');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const numericPrice = parsePesoInput(priceText);
  const canSubmit = name.trim().length > 0 && numericPrice > 0;

  const handleSave = () => {
    if (!name.trim()) {
      setFormError('Please enter what you are thinking of buying.');
      return;
    }
    if (numericPrice <= 0) {
      setFormError('Please enter an estimated price greater than ₱0.');
      return;
    }
    setFormError(null);
    addWantToBuy(name.trim(), icon, numericPrice, note.trim() || undefined);
    onClose();
  };

  return (
    <FormModal
      visible
      title="Add Thing to Buy"
      subtitle="Give yourself 7 days to make sure you still want it"
      icon={icon}
      accentColor={shade.dopamine}
      onClose={onClose}
    >
      <IconPickerGrid
        icons={TREAT_ICON_CHOICES}
        selected={icon}
        onSelect={setIcon}
        shade={shade}
        activeBg={shade.dopamineBtnBg}
        activeFg="#FFFFFF"
        label="Pick an icon"
      />

      <View style={styles.fieldGroup}>
        <Text style={[styles.sectionLabel, { color: shade.muted }]}>
          WHAT DO YOU WANT TO BUY?
        </Text>
        <TextInput
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (formError) setFormError(null);
          }}
          placeholder="e.g., Mechanical Keyboard, Sneakers"
          placeholderTextColor={shade.muted}
          autoFocus
          accessibilityLabel="Item name"
          style={[
            styles.textInput,
            {
              backgroundColor: shade.surface,
              color: shade.text,
              borderColor: shade.border,
            },
          ]}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.sectionLabel, { color: shade.muted }]}>
          ESTIMATED PRICE
        </Text>
        <PesoAmountInput
          value={priceText}
          onChangeText={(formatted) => {
            setPriceText(formatted);
            if (formError) setFormError(null);
          }}
          shade={shade}
          accentColor={shade.dopamine}
          borderColor={formError ? shade.warning : shade.dopamine}
          placeholder="0.00"
          inputAccessibilityLabel="Estimated price"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.sectionLabel, { color: shade.muted }]}>
          WHY DO YOU WANT IT? (OPTIONAL)
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional reminder for 7 days from now"
          placeholderTextColor={shade.muted}
          accessibilityLabel="Optional note"
          style={[
            styles.textInput,
            {
              backgroundColor: shade.surface,
              color: shade.text,
              borderColor: shade.border,
            },
          ]}
        />
      </View>

      <View
        style={[
          styles.infoBanner,
          { backgroundColor: shade.dopamineSoft },
        ]}
      >
        <AppIcon name="clock" size={16} color={shade.dopamine} />
        <Text style={[styles.infoBannerText, { color: shade.text }]}>
          7-day cool-off starts today. We will ask you to re-evaluate before
          adding it to your dashboard.
        </Text>
      </View>

      {formError ? (
        <Text style={[styles.errorText, { color: shade.warning }]}>
          {formError}
        </Text>
      ) : null}

      <ScalePressable
        onPress={handleSave}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
        style={[
          styles.primaryBtn,
          {
            backgroundColor: canSubmit ? shade.dopamineBtnBg : shade.surface,
            opacity: canSubmit ? 1 : 0.72,
          },
        ]}
      >
        <Text
          style={[
            styles.primaryBtnText,
            { color: canSubmit ? '#FFFFFF' : shade.muted },
          ]}
        >
          Start 7-Day Pause
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

/**
 * Calm, spacious modal for adding a new item to the 7-day cool-off list.
 */
export const AddWantToBuyModal: React.FC<AddWantToBuyModalProps> = ({
  visible,
  onClose,
}) => {
  if (!visible) return null;
  return <AddWantToBuyModalContent onClose={onClose} />;
};

interface BuyWantToBuyModalProps {
  item: WantToBuyItem | null;
  onClose: () => void;
  showDecisionShortcuts?: boolean;
}

const BuyWantToBuyModalContent: React.FC<{
  item: WantToBuyItem;
  onClose: () => void;
  showDecisionShortcuts?: boolean;
}> = ({ item, onClose, showDecisionShortcuts = true }) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { safeToSpendOnSelectedDay, todayKey } = useDailyBudget();
  const { cashOnHand, banks, creditCards, lastPaymentSourceId } = useWallet();
  const { monthlySaved, sinkingFunds } = useGoals();
  const { buyWantToBuy, extendWantToBuy, skipWantToBuy } = useBudgetActions();

  const [fundingChoice, setFundingChoice] = useState<'daily' | 'savings'>(
    safeToSpendOnSelectedDay >= item.price ? 'daily' : 'savings'
  );
  const [savingsSource, setSavingsSource] = useState<'jar' | string>('jar');
  const [paymentSourceId, setPaymentSourceId] = useState<string>(
    lastPaymentSourceId || 'cash'
  );
  const [category, setCategory] = useState<SpendCategoryKey>('shop');

  useEffect(() => {
    setFundingChoice(
      safeToSpendOnSelectedDay >= item.price ? 'daily' : 'savings'
    );
    setSavingsSource('jar');
    setPaymentSourceId(lastPaymentSourceId || 'cash');
    setCategory('shop');
  }, [item.id, item.price, safeToSpendOnSelectedDay, lastPaymentSourceId]);

  const waitedDays = Math.max(
    0,
    -getDaysUntilDateKey(item.createdAt, todayKey)
  );
  const selectedFund = sinkingFunds.find((f) => f.id === savingsSource);
  const availableFromSavings = selectedFund ? selectedFund.saved : monthlySaved;
  const selectedSavingsName = selectedFund ? selectedFund.name : 'Savings Jar';

  const handleConfirmPurchase = () => {
    const chosenType =
      fundingChoice === 'daily'
        ? 'daily'
        : selectedFund
        ? 'sinking_fund'
        : 'savings_jar';
    buyWantToBuy(item.id, {
      fundingChoice: chosenType,
      ...(chosenType === 'sinking_fund' && selectedFund
        ? { sinkingFundId: selectedFund.id }
        : {}),
      paymentSourceId,
      ...(chosenType === 'daily' ? { category } : {}),
    });
    onClose();
  };

  return (
    <FormModal
      visible
      title="Decide on Your Purchase"
      subtitle={
        waitedDays >= 7
          ? `Waited ${waitedDays} days — ready to decide`
          : 'Choose how to add this purchase to your dashboard'
      }
      icon={item.icon}
      accentColor={shade.dopamine}
      onClose={onClose}
    >
      <View
        style={[
          styles.summaryBanner,
          { backgroundColor: shade.surface, borderColor: shade.border },
        ]}
      >
        <IconBadge
          name={item.icon}
          size={18}
          color={shade.dopamine}
          bg={shade.dopamineSoft}
          boxSize={40}
        />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            numberOfLines={1}
            style={[styles.summaryName, { color: shade.text }]}
          >
            {item.name}
          </Text>
          {item.note ? (
            <Text
              numberOfLines={2}
              style={[styles.summaryNote, { color: shade.muted }]}
            >
              {item.note}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.summaryPrice, { color: shade.dopamine }]}>
          {formatVisiblePeso(item.price)}
        </Text>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.sectionLabel, { color: shade.muted }]}>
          HOW SHOULD THIS BE FUNDED?
        </Text>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setFundingChoice('daily');
          }}
          accessibilityRole="radio"
          accessibilityState={{ checked: fundingChoice === 'daily' }}
          style={[
            styles.optionCard,
            {
              backgroundColor:
                fundingChoice === 'daily' ? shade.card : shade.surface,
              borderColor:
                fundingChoice === 'daily' ? shade.accent : shade.border,
            },
          ]}
        >
          <View style={styles.optionHeaderRow}>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={[styles.optionTitle, { color: shade.text }]}>
                Part of Daily Spending
              </Text>
              <Text style={[styles.optionSub, { color: shade.muted }]}>
                Counts toward today’s Safe-to-Spend (
                {formatVisiblePeso(safeToSpendOnSelectedDay)} left)
              </Text>
            </View>
            <AppIcon
              name={fundingChoice === 'daily' ? 'check' : 'circle'}
              size={18}
              color={fundingChoice === 'daily' ? shade.accent : shade.muted}
            />
          </View>
        </ScalePressable>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setFundingChoice('savings');
          }}
          accessibilityRole="radio"
          accessibilityState={{ checked: fundingChoice === 'savings' }}
          style={[
            styles.optionCard,
            {
              backgroundColor:
                fundingChoice === 'savings' ? shade.positiveSoft : shade.surface,
              borderColor:
                fundingChoice === 'savings' ? shade.positive : shade.border,
            },
          ]}
        >
          <View style={styles.optionHeaderRow}>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={[styles.optionTitle, { color: shade.text }]}>
                Take from Savings
              </Text>
              <Text style={[styles.optionSub, { color: shade.muted }]}>
                Keeps today’s daily spending budget untouched
              </Text>
            </View>
            <AppIcon
              name={fundingChoice === 'savings' ? 'check' : 'circle'}
              size={18}
              color={fundingChoice === 'savings' ? shade.positive : shade.muted}
            />
          </View>
        </ScalePressable>
      </View>

      {fundingChoice === 'savings' && (
        <View style={styles.fieldGroup}>
          <Text style={[styles.sectionLabel, { color: shade.muted }]}>
            CHOOSE SAVINGS SOURCE
          </Text>
          <View style={styles.savingsGrid}>
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setSavingsSource('jar');
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: savingsSource === 'jar' }}
              style={[
                styles.savingsPill,
                {
                  backgroundColor:
                    savingsSource === 'jar'
                      ? shade.positiveBtnBg
                      : shade.surface,
                  borderColor:
                    savingsSource === 'jar'
                      ? shade.positiveBtnBg
                      : shade.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.savingsPillTitle,
                  { color: savingsSource === 'jar' ? '#FFFFFF' : shade.text },
                ]}
              >
                Savings Jar
              </Text>
              <Text
                style={[
                  styles.savingsPillSub,
                  { color: savingsSource === 'jar' ? '#FFFFFF' : shade.muted },
                ]}
              >
                {formatVisiblePeso(monthlySaved)} available
              </Text>
            </ScalePressable>

            {sinkingFunds.map((fund) => {
              const active = savingsSource === fund.id;
              return (
                <ScalePressable
                  key={fund.id}
                  onPress={() => {
                    triggerLightHaptic();
                    setSavingsSource(fund.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={[
                    styles.savingsPill,
                    {
                      backgroundColor: active
                        ? shade.positiveBtnBg
                        : shade.surface,
                      borderColor: active ? shade.positiveBtnBg : shade.border,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.savingsPillTitle,
                      { color: active ? '#FFFFFF' : shade.text },
                    ]}
                  >
                    {fund.name}
                  </Text>
                  <Text
                    style={[
                      styles.savingsPillSub,
                      { color: active ? '#FFFFFF' : shade.muted },
                    ]}
                  >
                    {formatVisiblePeso(fund.saved)} available
                  </Text>
                </ScalePressable>
              );
            })}
          </View>

          {item.price > availableFromSavings && (
            <Text style={[styles.helperHint, { color: shade.muted }]}>
              {selectedSavingsName} has{' '}
              {formatVisiblePeso(availableFromSavings)}; deducting{' '}
              {formatVisiblePeso(item.price)} will bring it down to ₱0.00.
            </Text>
          )}
        </View>
      )}

      {fundingChoice === 'daily' && (
        <SpendCategoryPicker
          label="CATEGORY"
          selectedKey={category}
          onSelect={(cat) => setCategory(cat.key)}
          shade={shade}
        />
      )}

      <PaymentSourcePicker
        selectedId={paymentSourceId}
        onSelect={setPaymentSourceId}
        cashOnHand={cashOnHand}
        banks={banks}
        creditCards={creditCards}
        shade={shade}
        formatVisiblePeso={formatVisiblePeso}
        includeCash
        includeTrackOnly
        trackOnlyId="none"
        trackOnlyLabel="Track Only"
        trackOnlySubLabel="No wallet change"
        label="PAID WITH ACCOUNT"
      />

      <ScalePressable
        onPress={handleConfirmPurchase}
        accessibilityRole="button"
        style={[
          styles.primaryBtn,
          {
            backgroundColor:
              fundingChoice === 'daily' ? shade.accent : shade.positiveBtnBg,
          },
        ]}
      >
        <Text
          style={[
            styles.primaryBtnText,
            {
              color:
                fundingChoice === 'daily' ? shade.accentText : '#FFFFFF',
            },
          ]}
        >
          Buy & Add to Dashboard
        </Text>
      </ScalePressable>

      {showDecisionShortcuts && (
        <View style={styles.secondaryRow}>
          <ScalePressable
            onPress={() => {
              extendWantToBuy(item.id, 7);
              onClose();
            }}
            accessibilityRole="button"
            style={[
              styles.secondaryBtn,
              { backgroundColor: shade.surface, borderColor: shade.border },
            ]}
          >
            <AppIcon name="clock" size={14} color={shade.muted} />
            <Text style={[styles.secondaryBtnText, { color: shade.text }]}>
              Wait 7 More Days
            </Text>
          </ScalePressable>

          <ScalePressable
            onPress={() => {
              skipWantToBuy(item.id);
              onClose();
            }}
            accessibilityRole="button"
            style={[
              styles.secondaryBtn,
              {
                backgroundColor: shade.positiveSoft,
                borderColor: shade.positiveSoft,
              },
            ]}
          >
            <AppIcon name="check" size={14} color={shade.positive} />
            <Text style={[styles.secondaryBtnText, { color: shade.positive }]}>
              Skip & Keep ₱
            </Text>
          </ScalePressable>
        </View>
      )}
    </FormModal>
  );
};

/**
 * Spacious decision modal asking whether a Buy Later purchase comes from
 * daily spending or from one of the user's savings balances.
 */
export const BuyWantToBuyModal: React.FC<BuyWantToBuyModalProps> = ({
  item,
  onClose,
  showDecisionShortcuts = true,
}) => {
  if (!item) return null;
  return (
    <BuyWantToBuyModalContent
      item={item}
      onClose={onClose}
      showDecisionShortcuts={showDecisionShortcuts}
    />
  );
};

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  textInput: {
    minWidth: 0,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 13,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  summaryName: {
    fontSize: 15,
    fontWeight: '800',
  },
  summaryNote: {
    fontSize: 12,
    lineHeight: 16,
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  optionCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 15,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  optionSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  savingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  savingsPill: {
    minWidth: 132,
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    gap: 2,
  },
  savingsPillTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  savingsPillSub: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  helperHint: {
    fontSize: 11,
    lineHeight: 16,
  },
  primaryBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    minWidth: 125,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 10,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
