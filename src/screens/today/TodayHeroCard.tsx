import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AnimatedCounter,
  FadeSlideIn,
  PopValueText,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../../components/AppIcon';
import { useThemePrefs } from '../../context/BudgetContext';
import { triggerLightHaptic } from '../../utils/haptics';

interface TodayHeroCardProps {
  isTodaySelected: boolean;
  selectedDateKey: string;
  todayKey: string;
  paydayLabel: string;
  safeToSpendOnSelectedDay: number;
  baseDailyAllowance: number;
  rolloverBalance: number;
  hasEndedDay: boolean;
  isPaydayPromptVisible: boolean;
  expectedPay: number;
  onOpenSpend: () => void;
  onBankSurplus: () => void;
  onOpenPaydayModal: () => void;
  onDismissPaydayPrompt: (dateKey: string) => void;
}

export const TodayHeroCard: React.FC<TodayHeroCardProps> = React.memo(
  ({
    isTodaySelected,
    selectedDateKey,
    todayKey,
    paydayLabel,
    safeToSpendOnSelectedDay,
    baseDailyAllowance,
    rolloverBalance,
    hasEndedDay,
    isPaydayPromptVisible,
    expectedPay,
    onOpenSpend,
    onBankSurplus,
    onOpenPaydayModal,
    onDismissPaydayPrompt,
  }) => {
    const { shade, privacyMode, formatVisiblePeso } = useThemePrefs();

    const isOverspent = safeToSpendOnSelectedDay < 0;
    const canEndDay = !hasEndedDay && safeToSpendOnSelectedDay > 0;
    const endDayLabel = hasEndedDay
      ? '✓ Day Ended'
      : isOverspent
      ? 'Over Budget'
      : safeToSpendOnSelectedDay <= 0
      ? '₱0 Left'
      : 'End Day & Save';

    return (
      <>
        <FadeSlideIn delay={40} distance={14}>
          <View
            style={[
              styles.metalCard,
              {
                backgroundColor: shade.heroBg,
                borderColor: shade.heroBorder,
              },
            ]}
          >
            <View style={styles.rowBetween}>
              <Text style={[styles.balanceLabel, { color: shade.heroMuted }]}>
                {isTodaySelected
                  ? 'Safe to Spend Today'
                  : `Safe to Spend (${selectedDateKey})`}
              </Text>

              <ScalePressable
                onPress={() => {
                  triggerLightHaptic();
                  onOpenPaydayModal();
                }}
                accessibilityRole="button"
                accessibilityLabel="Open Payday Check-In"
                hitSlop={6}
                style={[
                  styles.paydayPill,
                  { backgroundColor: shade.heroSurface },
                ]}
              >
                <AppIcon name="calendar" size={12} color={shade.heroPositive} />
                <Text style={[styles.paydayText, { color: shade.heroPositive }]}>
                  {paydayLabel}
                </Text>
              </ScalePressable>
            </View>

            <View style={styles.balanceBlock}>
              <PopValueText valueTrigger={safeToSpendOnSelectedDay}>
                <AnimatedCounter
                  value={safeToSpendOnSelectedDay}
                  decimals={2}
                  masked={privacyMode}
                  style={[
                    styles.bigBalance,
                    { color: isOverspent ? shade.heroWarning : shade.heroText },
                  ]}
                />
              </PopValueText>

              <Text style={[styles.subBalance, { color: shade.heroMuted }]}>
                {formatVisiblePeso(baseDailyAllowance)} base
                {isTodaySelected && rolloverBalance > 0
                  ? ` • +${formatVisiblePeso(rolloverBalance)} rollover`
                  : ''}
                {isOverspent
                  ? ' • Over budget'
                  : hasEndedDay
                  ? ' • Day ended'
                  : ''}
              </Text>
            </View>

            <View style={styles.primaryActionsRow}>
              <ScalePressable
                onPress={onOpenSpend}
                accessibilityRole="button"
                accessibilityLabel="Log a spend"
                scaleTo={0.96}
                style={[styles.spendPrimaryBtn, { backgroundColor: '#FFFFFF' }]}
              >
                <Text style={[styles.spendPrimaryText, { color: '#141519' }]}>
                  Spend!
                </Text>
              </ScalePressable>

              <ScalePressable
                disabled={!canEndDay}
                onPress={onBankSurplus}
                accessibilityRole="button"
                accessibilityLabel={
                  hasEndedDay
                    ? 'Day already ended'
                    : isOverspent
                    ? 'Over budget today'
                    : safeToSpendOnSelectedDay <= 0
                    ? 'Zero balance left today'
                    : 'End day and save remaining balance'
                }
                scaleTo={0.96}
                style={[
                  styles.bankBtn,
                  {
                    backgroundColor: canEndDay
                      ? shade.positiveBtnBg
                      : shade.heroSurface,
                    opacity: canEndDay ? 1 : 0.78,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.bankBtnText,
                    {
                      color: canEndDay
                        ? '#FFFFFF'
                        : hasEndedDay
                        ? shade.heroPositive
                        : isOverspent
                        ? shade.heroWarning
                        : shade.heroMuted,
                    },
                  ]}
                >
                  {endDayLabel}
                </Text>
              </ScalePressable>
            </View>
          </View>
        </FadeSlideIn>

        {isPaydayPromptVisible && (
          <FadeSlideIn delay={60} distance={10}>
            <View
              style={[
                styles.paydayBanner,
                { backgroundColor: shade.card, borderColor: shade.positive },
              ]}
            >
              <View style={styles.paydayBannerLeft}>
                <IconBadge
                  name="dollar-sign"
                  size={16}
                  color={shade.positive}
                  bg={shade.positiveSoft}
                  boxSize={38}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[styles.paydayBannerTitle, { color: shade.text }]}
                  >
                    Payday Today!
                  </Text>
                  <Text style={[styles.paydayBannerSub, { color: shade.muted }]}>
                    Check in {formatVisiblePeso(expectedPay)} & pay yourself
                    first
                  </Text>
                </View>
              </View>

              <View style={styles.paydayBannerActions}>
                <ScalePressable
                  onPress={() => {
                    triggerLightHaptic();
                    onOpenPaydayModal();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Complete Payday Check-In"
                  style={[
                    styles.paydayCheckInBtn,
                    { backgroundColor: shade.positiveBtnBg },
                  ]}
                >
                  <Text style={styles.paydayCheckInText}>Check In</Text>
                </ScalePressable>
                <ScalePressable
                  onPress={() => onDismissPaydayPrompt(todayKey)}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss payday reminder"
                  hitSlop={8}
                  style={[
                    styles.paydayDismissBtn,
                    { backgroundColor: shade.surface },
                  ]}
                >
                  <AppIcon name="x" size={14} color={shade.muted} />
                </ScalePressable>
              </View>
            </View>
          </FadeSlideIn>
        )}
      </>
    );
  }
);

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 15,
    shadowColor: '#111318',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  paydayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  paydayText: {
    fontSize: 11,
    fontWeight: '800',
  },
  balanceBlock: {
    gap: 4,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  bigBalance: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  subBalance: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 2,
  },
  spendPrimaryBtn: {
    flex: 1.25,
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spendPrimaryText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  bankBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  paydayBanner: {
    borderRadius: 20,
    borderWidth: 1.2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  paydayBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  paydayBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  paydayBannerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  paydayBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paydayCheckInBtn: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 11,
  },
  paydayCheckInText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  paydayDismissBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
