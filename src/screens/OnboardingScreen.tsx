import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AnimatedProgressBar,
  FadeSlideIn,
  ScalePressable,
} from '../components/AnimatedPrimitives';
import {
  computeBaseDailyAllowance,
  sumBills,
  useBudgetActions,
  useDailyBudget,
  useGoals,
  useSystemStatus,
  useThemePrefs,
  useWallet,
} from '../context/BudgetContext';
import { BillItem, getNextPaydayLabel } from '../types/budget';
import {
  triggerCelebrationHaptic,
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../utils/haptics';
import {
  formatPesoDisplay,
  formatPesoNumber,
  parsePesoInput,
} from '../utils/numberFormat';
import { useWebKeyboardInset } from '../utils/useWebKeyboardInset';
import { OnboardingSteps } from './onboarding/OnboardingSteps';

const TOTAL_QUESTIONS = 6;

/**
 * 1-question-at-a-time conversational onboarding interview that praises the
 * user after each answered question before sliding to the next.
 */
export const OnboardingScreen: React.FC = () => {
  const { shade, privacyMode } = useThemePrefs();
  const { settings, billItems } = useDailyBudget();
  const { cashOnHand } = useWallet();
  const { disciplineScore, cardTier, treats } = useGoals();
  const { isEditingOnboarding } = useSystemStatus();
  const { completeOnboarding, cancelReopenedOnboarding } = useBudgetActions();

  const [step, setStep] = useState<number>(1);
  const insets = useSafeAreaInsets();
  const { keyboardInset } = useWebKeyboardInset(true);
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
  const [step5Error, setStep5Error] = useState<string | null>(null);

  const [localCashText, setLocalCashText] = useState(
    formatPesoNumber(cashOnHand)
  );

  useEffect(() => {
    return () => {
      if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current);
    };
  }, []);

  const maskInputs = isEditingOnboarding && privacyMode;
  const maskOnEdit = (amount: number) =>
    formatPesoDisplay(amount, maskInputs);

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

  const handleAddLocalBill = (
    name: string,
    icon: string,
    amount: number,
    dueDay?: number
  ) => {
    setLocalBills((prev) => [
      ...prev,
      {
        id: `bill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        icon,
        amount,
        ...(typeof dueDay === 'number' ? { dueDay } : {}),
      },
    ]);
  };

  const handleRemoveLocalBill = (id: string) => {
    setLocalBills((prev) => prev.filter((b) => b.id !== id));
  };

  const handleFinish = () => {
    const parsedCash = parsePesoInput(localCashText);
    const parsedTreatTarget = parsePesoInput(treatTargetText);

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
        return `Nice! ${maskOnEdit(income)}/month logged. Great start! 👏`;
      case 2:
        return 'Got it! We’ll keep track of your paydays. 🗓️';
      case 3:
        return `Awesome! ${maskOnEdit(totalBills)} in bills set aside safely. 👍`;
      case 4:
        return `Good job! Protecting ${maskOnEdit(savings)}/month is huge. 🏦`;
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

    if (step === 5) {
      const hasName = Boolean(treatName.trim());
      const targetVal = parsePesoInput(treatTargetText);
      if (hasName && targetVal <= 0) {
        setStep5Error(
          'Enter a price greater than ₱0, or clear the treat name to skip.'
        );
        return;
      }
      if (!hasName && targetVal > 0) {
        setStep5Error(
          'Enter a treat name, or clear the price to skip this step.'
        );
        return;
      }
      setStep5Error(null);
    }

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
    setStep5Error(null);
    triggerLightHaptic();
    setDirection('left');
    setStep((s) => Math.max(1, s - 1));
  };

  const progressPct = (step / TOTAL_QUESTIONS) * 100;

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : Platform.OS === 'android'
          ? 'height'
          : undefined
      }
      style={[
        styles.root,
        Platform.OS === 'web' && keyboardInset > 0
          ? { paddingBottom: keyboardInset }
          : null,
      ]}
    >
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
          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              if (isEditingOnboarding) {
                cancelReopenedOnboarding();
              } else {
                handleFinish();
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isEditingOnboarding ? 'Cancel setup edits' : 'Skip onboarding setup'
            }
            hitSlop={8}
          >
            <Text style={[styles.skipText, { color: shade.muted }]}>
              {isEditingOnboarding ? 'Cancel ›' : 'Skip Setup ›'}
            </Text>
          </ScalePressable>
        </View>

        <AnimatedProgressBar
          percentage={progressPct}
          trackColor={shade.surface}
          fillColor={shade.dopamine}
          height={5}
        />
      </View>

      <View style={styles.bodyWrap}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeSlideIn triggerKey={step} direction={direction} distance={22}>
            <OnboardingSteps
              step={step}
              shade={shade}
              maskOnEdit={maskOnEdit}
              maskInputs={maskInputs}
              income={income}
              onChangeIncome={setIncome}
              salaryFreq={salaryFreq}
              payday1={payday1}
              payday2={payday2}
              onChangeSchedule={(freq, d1, d2) => {
                setSalaryFreq(freq);
                setPayday1(d1);
                setPayday2(d2);
              }}
              localBills={localBills}
              onUpdateBill={handleUpdateLocalBill}
              onAddBill={handleAddLocalBill}
              onRemoveBill={handleRemoveLocalBill}
              savings={savings}
              onChangeSavings={setSavings}
              dailyPreview={dailyPreview}
              paydayLabel={paydayLabel}
              treatIcon={treatIcon}
              onChangeTreatIcon={setTreatIcon}
              treatName={treatName}
              onChangeTreatName={(t) => {
                setTreatName(t);
                if (step5Error) setStep5Error(null);
              }}
              treatTargetText={treatTargetText}
              onChangeTreatTargetText={(formatted) => {
                setTreatTargetText(formatted);
                if (step5Error) setStep5Error(null);
              }}
              step5Error={step5Error}
              existingTreatsCount={treats.length}
              isEditingOnboarding={isEditingOnboarding}
              localCashText={localCashText}
              onChangeLocalCashText={setLocalCashText}
              cardTier={cardTier}
              disciplineScore={disciplineScore}
            />
          </FadeSlideIn>
        </ScrollView>

        {praiseMsg && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.praiseBanner,
              {
                backgroundColor: shade.positiveBtnBg,
                transform: [{ scale: praiseScale }],
              },
            ]}
          >
            <Text style={[styles.praiseText, { color: '#FFFFFF' }]}>
              {praiseMsg}
            </Text>
          </Animated.View>
        )}
      </View>

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
            accessibilityRole="button"
            accessibilityLabel="Previous question"
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
          accessibilityRole="button"
          accessibilityLabel={
            step === TOTAL_QUESTIONS ? 'Finish setup' : 'Next question'
          }
          style={[
            styles.primaryBtn,
            {
              backgroundColor:
                step === TOTAL_QUESTIONS ? shade.dopamineBtnBg : shade.accent,
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
    </KeyboardAvoidingView>
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
    bottom: 12,
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
    paddingBottom: 64,
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
