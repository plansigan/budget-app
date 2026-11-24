import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PopValueText } from '../../components/AnimatedPrimitives';
import { IconBadge, TREAT_ICON_CHOICES } from '../../components/AppIcon';
import { BudgetStepperRow } from '../../components/BudgetStepperRow';
import { MonthlyBillsBreakdownCard } from '../../components/MonthlyBillsBreakdownCard';
import { SalaryScheduleCard } from '../../components/SalaryScheduleCard';
import { IconPickerGrid } from '../../components/form/IconPickerGrid';
import { PesoAmountInput } from '../../components/form/PesoAmountInput';
import { ThemeShade } from '../../theme/palette';
import { BillItem } from '../../types/budget';
import { parsePesoInput } from '../../utils/numberFormat';

interface OnboardingStepsProps {
  step: number;
  shade: ThemeShade;
  maskOnEdit: (amount: number) => string;
  maskInputs: boolean;
  income: number;
  onChangeIncome: (val: number) => void;
  salaryFreq: 1 | 2;
  payday1: number;
  payday2: number;
  onChangeSchedule: (freq: 1 | 2, d1: number, d2: number) => void;
  localBills: BillItem[];
  onUpdateBill: (id: string, amount: number) => void;
  onAddBill: (
    name: string,
    icon: string,
    amount: number,
    dueDay?: number
  ) => void;
  onRemoveBill: (id: string) => void;
  savings: number;
  onChangeSavings: (val: number) => void;
  dailyPreview: number;
  paydayLabel: string;
  treatIcon: string;
  onChangeTreatIcon: (icon: string) => void;
  treatName: string;
  onChangeTreatName: (name: string) => void;
  treatTargetText: string;
  onChangeTreatTargetText: (formatted: string) => void;
  step5Error: string | null;
  existingTreatsCount: number;
  isEditingOnboarding: boolean;
  localCashText: string;
  onChangeLocalCashText: (formatted: string) => void;
  cardTier: string;
  disciplineScore: number;
}

/**
 * Renders the 6 conversational step bodies for OnboardingScreen.
 */
export const OnboardingSteps: React.FC<OnboardingStepsProps> = ({
  step,
  shade,
  maskOnEdit,
  maskInputs,
  income,
  onChangeIncome,
  salaryFreq,
  payday1,
  payday2,
  onChangeSchedule,
  localBills,
  onUpdateBill,
  onAddBill,
  onRemoveBill,
  savings,
  onChangeSavings,
  dailyPreview,
  paydayLabel,
  treatIcon,
  onChangeTreatIcon,
  treatName,
  onChangeTreatName,
  treatTargetText,
  onChangeTreatTargetText,
  step5Error,
  existingTreatsCount,
  isEditingOnboarding,
  localCashText,
  onChangeLocalCashText,
  cardTier,
  disciplineScore,
}) => {
  if (step === 1) {
    return (
      <View style={styles.stepStack}>
        <View style={styles.titleBlock}>
          <IconBadge
            name="dollar-sign"
            size={20}
            color={shade.accent}
            bg={shade.surface}
            boxSize={44}
          />
          <Text style={[styles.title, { color: shade.text }]}>
            How much do you earn each month?
          </Text>
          <Text style={[styles.subtitle, { color: shade.muted }]}>
            Type your monthly take-home pay below.
          </Text>
        </View>

        <BudgetStepperRow
          label="Monthly Income"
          hint="Your monthly pay after tax"
          value={income}
          shade={shade}
          privacyMode={maskInputs}
          onChange={onChangeIncome}
        />
      </View>
    );
  }

  if (step === 2) {
    return (
      <View style={styles.stepStack}>
        <View style={styles.titleBlock}>
          <IconBadge
            name="calendar"
            size={20}
            color={shade.accent}
            bg={shade.surface}
            boxSize={44}
          />
          <Text style={[styles.title, { color: shade.text }]}>
            How often do you get paid?
          </Text>
          <Text style={[styles.subtitle, { color: shade.muted }]}>
            Pick once or twice a month and set your paydays.
          </Text>
        </View>

        <SalaryScheduleCard
          frequency={salaryFreq}
          payday1={payday1}
          payday2={payday2}
          shade={shade}
          onChange={onChangeSchedule}
        />
      </View>
    );
  }

  if (step === 3) {
    return (
      <View style={styles.stepStack}>
        <View style={styles.titleBlock}>
          <IconBadge
            name="file-text"
            size={20}
            color={shade.accent}
            bg={shade.surface}
            boxSize={44}
          />
          <Text style={[styles.title, { color: shade.text }]}>
            What are your monthly bills?
          </Text>
          <Text style={[styles.subtitle, { color: shade.muted }]}>
            Edit or add bills below. We set this aside first.
          </Text>
        </View>

        <MonthlyBillsBreakdownCard
          bills={localBills}
          shade={shade}
          privacyMode={maskInputs}
          onUpdateAmount={onUpdateBill}
          onAddBill={onAddBill}
          onRemoveBill={onRemoveBill}
        />
      </View>
    );
  }

  if (step === 4) {
    return (
      <View style={styles.stepStack}>
        <View style={styles.titleBlock}>
          <IconBadge
            name="shield"
            size={20}
            color={shade.positive}
            bg={shade.positiveSoft}
            boxSize={44}
          />
          <Text style={[styles.title, { color: shade.text }]}>
            How much do you want to save?
          </Text>
          <Text style={[styles.subtitle, { color: shade.muted }]}>
            We protect your savings goal, then show your daily budget.
          </Text>
        </View>

        <BudgetStepperRow
          label="Monthly Savings Goal"
          hint="Protected every month"
          value={savings}
          shade={shade}
          privacyMode={maskInputs}
          onChange={onChangeSavings}
        />

        <View
          style={[
            styles.heroCard,
            { backgroundColor: shade.surface, borderColor: shade.accent },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.heroLabel, { color: shade.muted }]}>
              YOUR DAILY SAFE-TO-SPEND
            </Text>
            <View style={[styles.pillBadge, { backgroundColor: shade.bg }]}>
              <Text style={[styles.pillText, { color: shade.positive }]}>
                {paydayLabel}
              </Text>
            </View>
          </View>

          <PopValueText valueTrigger={dailyPreview}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={[
                styles.heroAmount,
                { color: shade.text, fontVariant: ['tabular-nums'] },
              ]}
            >
              {maskOnEdit(dailyPreview)}
              <Text style={[styles.heroUnit, { color: shade.muted }]}>
                {' '}
                / day
              </Text>
            </Text>
          </PopValueText>
        </View>
      </View>
    );
  }

  if (step === 5) {
    return (
      <View style={styles.stepStack}>
        <View style={styles.titleBlock}>
          <IconBadge
            name="gift"
            size={20}
            color={shade.dopamine}
            bg={shade.dopamineSoft}
            boxSize={44}
          />
          <Text style={[styles.title, { color: shade.text }]}>
            Want to save for a treat?
          </Text>
          <Text style={[styles.subtitle, { color: shade.muted }]}>
            {isEditingOnboarding && existingTreatsCount >= 3
              ? 'Your Treat Wishlist is full (3/3). Leave blank to keep existing treats.'
              : 'Add your first treat (up to 3), or leave blank to skip.'}
          </Text>
        </View>

        <View
          style={[
            styles.customCard,
            { backgroundColor: shade.card, borderColor: shade.border },
          ]}
        >
          <IconPickerGrid
            label="Pick an icon"
            icons={TREAT_ICON_CHOICES}
            selected={treatIcon}
            onSelect={onChangeTreatIcon}
            shade={shade}
            activeBg={shade.dopamineBtnBg}
            activeFg="#FFFFFF"
            pillSize={34}
          />

          <Text style={[styles.fieldLabel, { color: shade.muted }]}>
            What’s the treat? (Optional)
          </Text>
          <TextInput
            value={treatName}
            onChangeText={onChangeTreatName}
            placeholder="e.g., New Headphones, Weekend Trip"
            placeholderTextColor={shade.muted}
            accessibilityLabel="Treat goal name"
            style={[
              styles.textInput,
              {
                backgroundColor: shade.bg,
                color: shade.text,
                borderColor: shade.border,
              },
            ]}
          />

          <Text style={[styles.fieldLabel, { color: shade.muted }]}>
            How much does it cost? (₱)
          </Text>
          <PesoAmountInput
            value={treatTargetText}
            onChangeText={onChangeTreatTargetText}
            shade={shade}
            accentColor={shade.dopamine}
            borderColor={step5Error ? shade.warning : shade.border}
            backgroundColor={shade.bg}
            placeholder="Type the price"
            inputAccessibilityLabel="Treat goal price"
          />

          {step5Error ? (
            <Text style={[styles.errorText, { color: shade.warning }]}>
              {step5Error}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  const parsedTreatTarget = parsePesoInput(treatTargetText);

  return (
    <View style={styles.stepStack}>
      <View style={styles.titleBlock}>
        <IconBadge
          name="briefcase"
          size={20}
          color={shade.accent}
          bg={shade.surface}
          boxSize={44}
        />
        <Text style={[styles.title, { color: shade.text }]}>
          How much cash do you have right now?
        </Text>
        <Text style={[styles.subtitle, { color: shade.muted }]}>
          You can add your banks and cards in the Wallet tab next.
        </Text>
      </View>

      <View
        style={[
          styles.customCard,
          { backgroundColor: shade.card, borderColor: shade.border },
        ]}
      >
        <Text style={[styles.fieldLabel, { color: shade.muted }]}>
          Cash on hand (₱)
        </Text>
        <PesoAmountInput
          value={localCashText}
          onChangeText={onChangeLocalCashText}
          shade={shade}
          accentColor={shade.accent}
          borderColor={shade.border}
          backgroundColor={shade.bg}
          placeholder="0"
          selectTextOnFocus
          inputAccessibilityLabel="Cash on hand balance"
        />
      </View>

      <View
        style={[
          styles.previewMetalCard,
          {
            backgroundColor: shade.heroBg,
            borderColor: shade.heroBorder,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.tierRow}>
            <View
              style={[styles.tierDot, { backgroundColor: '#FFFFFF' }]}
            />
            <Text style={[styles.tierText, { color: shade.heroMuted }]}>
              {cardTier.toUpperCase()} TIER
            </Text>
          </View>
          <View
            style={[
              styles.scoreBadge,
              { backgroundColor: shade.heroSurface },
            ]}
          >
            <Text style={[styles.scoreText, { color: shade.heroPositive }]}>
              {paydayLabel}
            </Text>
          </View>
        </View>

        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          style={[
            styles.previewBalance,
            { color: shade.heroText, fontVariant: ['tabular-nums'] },
          ]}
        >
          {maskOnEdit(dailyPreview)}
        </Text>
        <Text style={[styles.previewPass, { color: shade.heroDopamine }]}>
          {treatName.trim() && parsedTreatTarget > 0
            ? `First Treat: ${treatName.trim()} (${maskOnEdit(
                parsedTreatTarget
              )})`
            : `${existingTreatsCount} / 3 Treats • Score ${disciplineScore}`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepStack: {
    gap: 15,
  },
  titleBlock: {
    gap: 6,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 29,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1.2,
    padding: 16,
    gap: 8,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  heroUnit: {
    fontSize: 15,
    fontWeight: '600',
  },
  customCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    gap: 11,
  },
  fieldLabel: {
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
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  previewMetalCard: {
    borderRadius: 22,
    borderWidth: 1.3,
    padding: 16,
    gap: 8,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  scoreBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  scoreText: {
    fontSize: 10,
    fontWeight: '700',
  },
  previewBalance: {
    fontSize: 32,
    fontWeight: '800',
  },
  previewPass: {
    fontSize: 12,
    fontWeight: '700',
  },
});
