import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  useDailyBudget,
  useGoals,
  useThemePrefs,
  useWallet,
} from '../context/BudgetContext';
import { triggerLightHaptic } from '../utils/haptics';
import { generatePersonalizedTips } from '../utils/savingsCoach';
import { FadeSlideIn, ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';

/**
 * Compact minimalist Coach Card on TodayScreen showing live, practical saving
 * tips built from the user's real Philippine Peso budget, bills, and cards.
 */
export const SavingsCoachCard: React.FC = React.memo(() => {
  const { shade, privacyMode } = useThemePrefs();
  const {
    todayKey,
    settings,
    baseDailyAllowance,
    getDaySummary,
    entries,
    billItems,
  } = useDailyBudget();
  const { cashOnHand, banks, creditCards } = useWallet();
  const { monthlySaved, treats, streakDays } = useGoals();

  const [tipIndex, setTipIndex] = useState(0);

  const safeToSpendToday = getDaySummary(todayKey).safeRemaining;

  const tips = useMemo(
    () =>
      generatePersonalizedTips({
        settings,
        monthlySaved,
        baseDailyAllowance,
        safeToSpendToday,
        cashOnHand,
        banks,
        creditCards,
        treats,
        entries,
        streakDays,
        privacyMode,
        billItems,
        currentMonthKey: todayKey.slice(0, 7),
      }),
    [
      settings,
      monthlySaved,
      baseDailyAllowance,
      safeToSpendToday,
      cashOnHand,
      banks,
      creditCards,
      treats,
      entries,
      streakDays,
      privacyMode,
      billItems,
      todayKey,
    ]
  );

  const activeIndex = tips.length > 0 ? tipIndex % tips.length : 0;
  const currentTip = tips[activeIndex];

  if (!currentTip) return null;

  const toneBg =
    currentTip.tone === 'positive'
      ? shade.positiveSoft
      : currentTip.tone === 'dopamine'
      ? shade.dopamineSoft
      : currentTip.tone === 'warning'
      ? shade.warningSoft
      : shade.surface;

  const toneText =
    currentTip.tone === 'positive'
      ? shade.positive
      : currentTip.tone === 'dopamine'
      ? shade.dopamine
      : currentTip.tone === 'warning'
      ? shade.warning
      : shade.muted;

  const handleNextTip = () => {
    triggerLightHaptic();
    setTipIndex((prev) => (prev + 1) % tips.length);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: shade.card, borderColor: shade.border },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.categoryPill, { backgroundColor: toneBg }]}>
          <AppIcon name={currentTip.icon} size={11} color={toneText} />
          <Text style={[styles.categoryText, { color: toneText }]}>
            {currentTip.category.toUpperCase()}
          </Text>
        </View>

        <Text style={[styles.counterText, { color: shade.muted }]}>
          {activeIndex + 1} / {tips.length}
        </Text>
      </View>

      <FadeSlideIn
        triggerKey={`${currentTip.id}-${activeIndex}`}
        direction="right"
        distance={10}
      >
        <View style={styles.copyWrap}>
          <Text style={[styles.title, { color: shade.text }]}>
            {currentTip.title}
          </Text>
          <Text style={[styles.body, { color: shade.muted }]}>
            {currentTip.body}
          </Text>
        </View>
      </FadeSlideIn>

      <View style={styles.footerRow}>
        <Text style={[styles.footerHint, { color: shade.muted }]}>
          Personalized for your ₱ budget
        </Text>
        <ScalePressable
          onPress={handleNextTip}
          style={[styles.nextChip, { backgroundColor: shade.surface }]}
        >
          <Text style={[styles.nextChipText, { color: shade.text }]}>
            Next tip ›
          </Text>
        </ScalePressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    shadowColor: '#111318',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  counterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  copyWrap: {
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  footerHint: {
    fontSize: 10,
    fontWeight: '600',
  },
  nextChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  nextChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
