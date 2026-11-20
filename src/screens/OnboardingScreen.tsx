import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AnimatedProgressBar,
  FadeSlideIn,
  PopValueText,
  ScalePressable,
} from '../components/AnimatedPrimitives';
import {
  AppIcon,
  IconBadge,
  TREAT_ICON_CHOICES,
} from '../components/AppIcon';
import { BudgetStepperRow } from '../components/BudgetStepperRow';
import { MonthlyBillsBreakdownCard } from '../components/MonthlyBillsBreakdownCard';
import { SalaryScheduleCard } from '../components/SalaryScheduleCard';
import { formatPesoInput } from '../utils/numberFormat';
import {
  computeBaseDailyAllowance,
  sumBills,
  useBudget,
} from '../context/BudgetContext';
import { BillItem, getNextPaydayLabel } from '../types/budget';
import {
  triggerCelebrationHaptic,
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../utils/haptics';

const TOTAL_QUESTIONS = 6;

/**
 * 1-question-at-a-time conversational onboarding interview that praises the
 * user after each answered question before sliding to the next.
 */
export const OnboardingScreen: React.FC = () => {
  const {
    shade,
    settings,
    billItems,
    cashOnHand,
    disciplineScore,
    cardTier,
    isEditingOnboarding,
    completeOnboarding,
    cancelReopenedOnboarding,
  } = useBudget();

  const [step, setStep] = useState<number>(1);
  const insets = useSafeAreaInsets();
  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const [praiseMsg, setPraiseMsg] = useState<string | null>(null);
  const praiseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const praiseScale = useRef(new Animated.Value(0.85)).current;

  const [income, setIncome] = useState(settings.monthlyIncome);
  const [salaryFreq, setSalaryFreq] = useState<1 | 2>(settings.salaryFrequency);
  const [payday1, setPayday1] = useState(settings.payday1);
  const [payday2, setPayday2] = useState(settings.payday2);
  const [localBills, setLocalBills] = useState<BillItem[]>(billItems);
  const [savings, setSavings] = useState(settings.monthlySavingsGoal);

  const [treatIcon, setTreatIcon] = useState('headphones');
  const [treatName, setTreatName] = useState('');
  const [treatTargetText, setTreatTargetText] = useState('');

  const [localCashText, setLocalCashText] = useState(
    formatPesoInput(String(cashOnHand))
  );

  useEffect(() => {
    return () => {
      if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current);
    };
  }, []);

  const totalBills = useMemo(() => sumBills(localBills), [localBills]);

  const dailyPreview = useMemo(
    () =>
      computeBaseDailyAllowance({
        monthlyIncome: income,
        fixedBills: totalBills,
        monthlySavingsGoal: savings,
        salaryFrequency: salaryFreq,
        payday1,
        payday2,
      }),
    [income, totalBills, savings, salaryFreq, payday1, payday2]
  );

  const paydayLabel = getNextPaydayLabel({
    monthlyIncome: income,
    fixedBills: totalBills,
    monthlySavingsGoal: savings,
    salaryFrequency: salaryFreq,
    payday1,
    payday2,
  });

  const handleUpdateLocalBill = (id: string, amount: number) => {
    setLocalBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, amount } : b))
    );
  };

  const handleAddLocalBill = (name: string, icon: string, amount: number) => {
    setLocalBills((prev) => [
      ...prev,
      {
        id: `bill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        icon,
        amount,
      },
    ]);
  };

  const handleRemoveLocalBill = (id: string) => {
    setLocalBills((prev) => prev.filter((b) => b.id !== id));
  };

  const handleFinish = () => {
    const parsedCash =
      parseInt(localCashText.replace(/[^0-9]/g, ''), 10) || 0;
    const parsedTreatTarget =
      parseInt(treatTargetText.replace(/[^0-9]/g, ''), 10) || 0;

    completeOnboarding({
      income,
      bills: totalBills,
      billItems: localBills,
      savings,
      salaryFrequency: salaryFreq,
      payday1,
      payday2,
      cashOnHand: parsedCash,
      treatName: treatName.trim(),
      treatIcon,
      treatTarget: parsedTreatTarget,
      preserveExistingData: isEditingOnboarding,
    });
  };

  const getPraiseForStep = (currentStep: number): string => {
    switch (currentStep) {
      case 1:
        return `Nice! ₱${income.toLocaleString()}/month logged. Great start! 👏`;
      case 2:
        return 'Got it! We’ll keep track of your paydays. 🗓️';
      case 3:
        return `Awesome! ₱${totalBills.toLocaleString()} in bills set aside safely. 👍`;
      case 4:
        return `Good job! Protecting ₱${savings.toLocaleString()}/month is huge. 🏦`;
      case 5:
        return treatName.trim()
          ? `Love that goal! "${treatName.trim()}" is locked in. ✨`
          : 'No problem! You can add up to 3 treats anytime.';
      default:
        return 'You’re all set! 🎉';
    }
  };

  const handleNext = () => {
    if (praiseMsg) return;

    if (step >= TOTAL_QUESTIONS) {
      triggerCelebrationHaptic();
      handleFinish();
      return;
    }

    triggerSuccessHaptic();
    setPraiseMsg(getPraiseForStep(step));
    praiseScale.setValue(0.84);
    Animated.spring(praiseScale, {
      toValue: 1,
      speed: 30,
      bounciness: 12,
      useNativeDriver: true,
    }).start();

    praiseTimerRef.current = setTimeout(() => {
      setPraiseMsg(null);
      setDirection('right');
      setStep((s) => Math.min(TOTAL_QUESTIONS, s + 1));
    }, 850);
  };

  const handleBack = () => {
    if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current);
    setPraiseMsg(null);
    triggerLightHaptic();
    setDirection('left');
    setStep((s) => Math.max(1, s - 1));
  };

  const progressPct = (step / TOTAL_QUESTIONS) * 100;

  return (
    <View style={styles.root}>
      {/* Top Progress Header */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop:
              Platform.OS === 'web' ? 14 : Math.max(insets.top, 14),
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.stepKicker, { color: shade.accent }]}>
            QUESTION {step} OF {TOTAL_QUESTIONS}
          </Text>
          <TouchableOpacity
            onPress={
              isEditingOnboarding ? cancelReopenedOnboarding : handleFinish
            }
            activeOpacity={0.75}
          >
            <Text style={[styles.skipText, { color: shade.muted }]}>
              {isEditingOnboarding ? 'Cancel ›' : 'Skip Setup ›'}
            </Text>
          </TouchableOpacity>
        </View>

        <AnimatedProgressBar
          percentage={progressPct}
          trackColor={shade.surface}
          fillColor={shade.dopamine}
          height={5}
        />
      </View>

      {/* Main 1-Question-at-a-Time Interview Body */}
      <View style={styles.bodyWrap}>
        {/* Floating Praise Toast (never shifts layout below) */}
        {praiseMsg && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.praiseBanner,
              {
                backgroundColor: shade.positive,
                transform: [{ scale: praiseScale }],
              },
            ]}
          >
            <Text style={[styles.praiseText, { color: '#FFFFFF' }]}>
              {praiseMsg}
            </Text>
          </Animated.View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        <FadeSlideIn triggerKey={step} direction={direction} distance={22}>
          {step === 1 && (
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
                onChange={setIncome}
              />
            </View>
          )}

          {step === 2 && (
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
                onChange={(freq, d1, d2) => {
                  setSalaryFreq(freq);
                  setPayday1(d1);
                  setPayday2(d2);
                }}
              />
            </View>
          )}

          {step === 3 && (
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
                onUpdateAmount={handleUpdateLocalBill}
                onAddBill={handleAddLocalBill}
                onRemoveBill={handleRemoveLocalBill}
              />
            </View>
          )}

          {step === 4 && (
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
                onChange={setSavings}
              />

              {/* Live Safe-to-Spend Result */}
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
                  <Text style={[styles.heroAmount, { color: shade.text }]}>
                    ₱
                    {dailyPreview.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                    <Text style={[styles.heroUnit, { color: shade.muted }]}>
                      {' '}
                      / day
                    </Text>
                  </Text>
                </PopValueText>
              </View>
            </View>
          )}

          {step === 5 && (
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
                  Add your first treat (up to 3), or leave blank to skip.
                </Text>
              </View>

              <View
                style={[
                  styles.customCard,
                  { backgroundColor: shade.card, borderColor: shade.border },
                ]}
              >
                <Text style={[styles.fieldLabel, { color: shade.muted }]}>
                  Pick an icon
                </Text>
                <View style={styles.emojiRow}>
                  {TREAT_ICON_CHOICES.map((iconName) => {
                    const active = treatIcon === iconName;
                    return (
                      <ScalePressable
                        key={iconName}
                        onPress={() => {
                          triggerLightHaptic();
                          setTreatIcon(iconName);
                        }}
                        style={[
                          styles.emojiPill,
                          {
                            backgroundColor: active
                              ? shade.dopamine
                              : shade.surface,
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

                <Text style={[styles.fieldLabel, { color: shade.muted }]}>
                  What’s the treat? (Optional)
                </Text>
                <TextInput
                  value={treatName}
                  onChangeText={setTreatName}
                  placeholder="e.g., New Headphones, Weekend Trip"
                  placeholderTextColor={shade.muted}
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
                <View
                  style={[
                    styles.amountBox,
                    { backgroundColor: shade.bg, borderColor: shade.border },
                  ]}
                >
                  <Text style={[styles.pesoSign, { color: shade.dopamine }]}>
                    ₱
                  </Text>
                  <TextInput
                    value={treatTargetText}
                    onChangeText={(t) =>
                      setTreatTargetText(formatPesoInput(t))
                    }
                    keyboardType="numeric"
                    placeholder="Type the price"
                    placeholderTextColor={shade.muted}
                    style={[styles.amountInput, { color: shade.text }]}
                  />
                </View>
              </View>
            </View>
          )}

          {step === 6 && (
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
                <View
                  style={[
                    styles.amountBox,
                    { backgroundColor: shade.bg, borderColor: shade.border },
                  ]}
                >
                  <Text style={[styles.pesoSign, { color: shade.accent }]}>
                    ₱
                  </Text>
                  <TextInput
                    value={localCashText}
                    onChangeText={(t) => setLocalCashText(formatPesoInput(t))}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={shade.muted}
                    selectTextOnFocus
                    style={[styles.amountInput, { color: shade.text }]}
                  />
                </View>
              </View>

              {/* Final Obsidian Hero Card Preview */}
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
                      style={[
                        styles.tierDot,
                        { backgroundColor: '#FFFFFF' },
                      ]}
                    />
                    <Text
                      style={[styles.tierText, { color: shade.heroMuted }]}
                    >
                      {cardTier.toUpperCase()} TIER
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.scoreBadge,
                      { backgroundColor: shade.heroSurface },
                    ]}
                  >
                    <Text style={[styles.scoreText, { color: '#4ADE80' }]}>
                      {paydayLabel}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[styles.previewBalance, { color: shade.heroText }]}
                >
                  ₱
                  {dailyPreview.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text style={[styles.previewPass, { color: '#A5B4FC' }]}>
                  {treatName.trim() && treatTargetText
                    ? `First Treat: ${treatName.trim()} (₱${(
                        parseInt(treatTargetText.replace(/[^0-9]/g, ''), 10) ||
                        0
                      ).toLocaleString()})`
                    : `0 / 3 Treats • Score ${disciplineScore}`}
                </Text>
              </View>
            </View>
          )}
        </FadeSlideIn>
        </ScrollView>
      </View>

      {/* Bottom Step Navigation */}
      <View
        style={[
          styles.footerNav,
          {
            borderTopColor: shade.border,
            paddingBottom:
              Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 12),
          },
        ]}
      >
        {step > 1 ? (
          <ScalePressable
            onPress={handleBack}
            style={[
              styles.backBtn,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <Text style={[styles.backBtnText, { color: shade.text }]}>
              ‹ Back
            </Text>
          </ScalePressable>
        ) : null}

        <ScalePressable
          disabled={Boolean(praiseMsg)}
          onPress={handleNext}
          style={[
            styles.primaryBtn,
            {
              backgroundColor:
                step === TOTAL_QUESTIONS ? shade.dopamine : shade.accent,
              opacity: praiseMsg ? 0.8 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.primaryBtnText,
              {
                color:
                  step === TOTAL_QUESTIONS ? '#FFFFFF' : shade.accentText,
              },
            ]}
          >
            {step === TOTAL_QUESTIONS
              ? "✨ Let's Go!"
              : praiseMsg
              ? 'Great job! ✓'
              : 'Next ›'}
          </Text>
        </ScalePressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bodyWrap: {
    flex: 1,
    position: 'relative',
  },
  praiseBanner: {
    position: 'absolute',
    top: 4,
    left: 18,
    right: 18,
    zIndex: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  praiseText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 28,
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
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emojiPill: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.3,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    paddingVertical: 2,
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
  footerNav: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  backBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
