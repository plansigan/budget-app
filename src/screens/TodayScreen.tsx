import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ActionAmountModal,
  ActionModalMode,
} from '../components/ActionAmountModal';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  FadeSlideIn,
  PopValueText,
  ScalePressable,
} from '../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../components/AppIcon';
import { PayBillModal } from '../components/PayBillModal';
import { PaydayCheckInModal } from '../components/PaydayCheckInModal';
import { SavingsCoachCard } from '../components/SavingsCoachCard';
import { WeeklyBelt } from '../components/WeeklyBelt';
import { useBudget } from '../context/BudgetContext';
import { parseDateKeyLocal } from '../state/budgetMath';
import {
  BillItem,
  getDaysUntilDayOfMonth,
  getExpectedPaycheckAmount,
  getNextPaydayLabel,
  getPaydayMatchKey,
} from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { getTransactionPresentation } from '../utils/transactionDisplay';

interface TodayScreenProps {
  onOpenVault: () => void;
  onOpenBudgetSetup: () => void;
}

/**
 * Primary home screen locked to the Velvet Dusk Luxury Metal Card aesthetic,
 * featuring the top Weekly Belt, single "Spend!" trigger (exact amount modal),
 * Dual-Bucket Savings & Treat Pass, and Selected Day's Activity feed.
 */
export const TodayScreen: React.FC<TodayScreenProps> = ({
  onOpenVault,
  onOpenBudgetSetup,
}) => {
  const {
    shade,
    privacyMode,
    formatVisiblePeso,
    settings,
    billItems,
    lastPaydayCheckInKey,
    monthlySaved,
    baseDailyAllowance,
    rolloverBalance,
    todayKey,
    selectedDateKey,
    safeToSpendOnSelectedDay,
    streakDays,
    disciplineScore,
    cardTier,
    treats,
    activeTreat,
    entries,
    bankTodaySurplus,
    claimTreat,
    undoEntry,
    dismissPaydayPrompt,
  } = useBudget();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ActionModalMode>('spend');
  const [showPaydayModal, setShowPaydayModal] = useState(false);
  const [billToPay, setBillToPay] = useState<BillItem | null>(null);

  const openModal = (mode: ActionModalMode) => {
    triggerLightHaptic();
    setModalMode(mode);
    setModalVisible(true);
  };

  const isTodaySelected = selectedDateKey === todayKey;
  const isOver = safeToSpendOnSelectedDay <= 0;
  const todayDateObj = parseDateKeyLocal(todayKey);
  const currentMonthKey = todayKey.slice(0, 7);
  const paydayLabel = getNextPaydayLabel(settings, todayDateObj);
  const isPaydayPromptVisible =
    getPaydayMatchKey(settings, todayDateObj) === todayKey &&
    lastPaydayCheckInKey !== todayKey;
  const expectedPay = getExpectedPaycheckAmount(settings);

  const upcomingUnpaidBills = billItems
    .filter(
      (b) => typeof b.dueDay === 'number' && b.lastPaidMonth !== currentMonthKey
    )
    .map((b) => ({
      bill: b,
      daysLeft: getDaysUntilDayOfMonth(b.dueDay!, todayDateObj),
    }))
    .filter((item) => item.daysLeft <= 5)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  const goal = Math.max(1, settings.monthlySavingsGoal);
  const savPct = Math.min(100, Math.round((monthlySaved / goal) * 100));

  const treatPct = activeTreat
    ? Math.min(100, Math.round((activeTreat.funded / activeTreat.target) * 100))
    : 0;
  const treatReady =
    Boolean(activeTreat) &&
    activeTreat!.funded >= activeTreat!.target &&
    !activeTreat!.claimed;

  const selectedDayEntries = entries.filter(
    (e) => (e.dateKey || todayKey) === selectedDateKey
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stack}>
        {/* Top Mon-Sun Weekly Belt */}
        <FadeSlideIn delay={0} distance={10}>
          <WeeklyBelt />
        </FadeSlideIn>

        {/* Dark Obsidian Hero Card */}
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
            {/* Top Meta Row: Tier, Payday Badge & Score */}
            <View style={styles.rowBetween}>
              <View style={styles.tierRow}>
                <View
                  style={[styles.tierDot, { backgroundColor: '#FFFFFF' }]}
                />
                <Text style={[styles.tierText, { color: shade.heroMuted }]}>
                  {cardTier.toUpperCase()}
                </Text>
              </View>

              <View style={styles.rightPills}>
                <ScalePressable
                  onPress={() => {
                    triggerLightHaptic();
                    setShowPaydayModal(true);
                  }}
                  accessibilityLabel="Open Payday Check-In"
                  hitSlop={4}
                  style={[
                    styles.paydayPill,
                    { backgroundColor: shade.heroSurface },
                  ]}
                >
                  <AppIcon name="calendar" size={11} color="#4ADE80" />
                  <Text style={[styles.paydayText, { color: '#4ADE80' }]}>
                    {paydayLabel}
                  </Text>
                </ScalePressable>
                <PopValueText valueTrigger={disciplineScore}>
                  <View
                    style={[
                      styles.scoreBadge,
                      { backgroundColor: shade.heroSurface },
                    ]}
                  >
                    <Text style={[styles.scoreText, { color: shade.heroMuted }]}>
                      SCORE{' '}
                      <Text style={{ color: shade.heroText, fontWeight: '800' }}>
                        {disciplineScore}
                      </Text>
                    </Text>
                  </View>
                </PopValueText>
              </View>
            </View>

            {/* Balance Block */}
            <View style={styles.balanceBlock}>
              <View style={styles.rowBetween}>
                <Text style={[styles.balanceLabel, { color: shade.heroMuted }]}>
                  {isTodaySelected
                    ? 'Safe to Spend Today'
                    : `Safe to Spend (${selectedDateKey})`}
                </Text>
                <View style={styles.streakInlineRow}>
                  <AppIcon name="zap" size={12} color="#A5B4FC" />
                  <Text style={[styles.streakInline, { color: '#A5B4FC' }]}>
                    {streakDays}d streak
                  </Text>
                </View>
              </View>

              <PopValueText valueTrigger={safeToSpendOnSelectedDay}>
                <AnimatedCounter
                  value={Math.max(0, safeToSpendOnSelectedDay)}
                  decimals={2}
                  masked={privacyMode}
                  style={[
                    styles.bigBalance,
                    { color: isOver ? '#F87171' : shade.heroText },
                  ]}
                />
              </PopValueText>

              <View style={styles.rowBetween}>
                <Text style={[styles.subBalance, { color: shade.heroMuted }]}>
                  {formatVisiblePeso(baseDailyAllowance)} base
                  {isTodaySelected && rolloverBalance > 0
                    ? ` • +${formatVisiblePeso(rolloverBalance)} rollover`
                    : ''}
                </Text>
                <ScalePressable
                  onPress={onOpenBudgetSetup}
                  style={[
                    styles.editBudgetChip,
                    { backgroundColor: shade.heroSurface },
                  ]}
                >
                  <Text
                    style={[styles.editBudgetText, { color: shade.heroText }]}
                  >
                    Edit Budget
                  </Text>
                </ScalePressable>
              </View>
            </View>

            {/* Single Primary "Spend!" Button + End Day & Save */}
            <View style={styles.primaryActionsRow}>
              <ScalePressable
                onPress={() => openModal('spend')}
                scaleTo={0.95}
                style={[styles.spendPrimaryBtn, { backgroundColor: '#FFFFFF' }]}
              >
                <Text style={[styles.spendPrimaryText, { color: '#141519' }]}>
                  Spend!
                </Text>
              </ScalePressable>

              <ScalePressable
                onPress={bankTodaySurplus}
                scaleTo={0.95}
                style={[
                  styles.bankBtn,
                  {
                    backgroundColor: isOver
                      ? shade.heroSurface
                      : shade.positive,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.bankBtnText,
                    { color: isOver ? shade.heroMuted : '#FFFFFF' },
                  ]}
                >
                  {isOver ? '✓ Day Ended' : 'End Day & Save'}
                </Text>
              </ScalePressable>
            </View>
          </View>
        </FadeSlideIn>

        {/* Payday Check-In Prompt Banner */}
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
                  size={15}
                  color={shade.positive}
                  bg={shade.positiveSoft}
                  boxSize={34}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paydayBannerTitle, { color: shade.text }]}>
                    Payday Today!
                  </Text>
                  <Text style={[styles.paydayBannerSub, { color: shade.muted }]}>
                    Check in {formatVisiblePeso(expectedPay)} & pay yourself first
                  </Text>
                </View>
              </View>

              <View style={styles.paydayBannerActions}>
                <ScalePressable
                  onPress={() => {
                    triggerLightHaptic();
                    setShowPaydayModal(true);
                  }}
                  style={[
                    styles.paydayCheckInBtn,
                    { backgroundColor: shade.positive },
                  ]}
                >
                  <Text style={styles.paydayCheckInText}>Check In</Text>
                </ScalePressable>
                <ScalePressable
                  onPress={() => dismissPaydayPrompt(todayKey)}
                  accessibilityLabel="Dismiss payday reminder"
                  hitSlop={6}
                  style={[
                    styles.paydayDismissBtn,
                    { backgroundColor: shade.surface },
                  ]}
                >
                  <AppIcon name="x" size={13} color={shade.muted} />
                </ScalePressable>
              </View>
            </View>
          </FadeSlideIn>
        )}

        {/* Dual-Bucket Row: Pure White Elevated Cards */}
        <FadeSlideIn delay={80} distance={14}>
          <View style={styles.dualRow}>
            {/* Bucket 1: Real Monthly Savings Jar */}
            <View
              style={[
                styles.bucketCard,
                { backgroundColor: shade.card, borderColor: shade.border },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.bucketKicker, { color: shade.positive }]}>
                  SAVINGS JAR
                </Text>
                <Text style={[styles.bucketPct, { color: shade.positive }]}>
                  {savPct}%
                </Text>
              </View>
              <Text style={[styles.bucketValue, { color: shade.text }]}>
                {formatVisiblePeso(monthlySaved)}{' '}
                <Text
                  style={{ fontSize: 11, color: shade.muted, fontWeight: '600' }}
                >
                  / {formatVisiblePeso(settings.monthlySavingsGoal)}
                </Text>
              </Text>
              <AnimatedProgressBar
                percentage={savPct}
                trackColor={shade.surface}
                fillColor={shade.positive}
                height={7}
              />
              <ScalePressable
                onPress={() => openModal('save')}
                style={[
                  styles.bucketBtn,
                  { backgroundColor: shade.positiveSoft },
                ]}
              >
                <Text style={[styles.bucketBtnText, { color: shade.positive }]}>
                  + Save to Jar
                </Text>
              </ScalePressable>
            </View>

            {/* Bucket 2: Treat Wishlist (0 to 3 Locked Treats) */}
            <View
              style={[
                styles.bucketCard,
                { backgroundColor: shade.card, borderColor: shade.border },
              ]}
            >
              <ScalePressable onPress={onOpenVault}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.bucketKicker, { color: shade.dopamine }]}>
                    TREATS ({treats.length}/3)
                  </Text>
                  <Text style={[styles.bucketPct, { color: shade.dopamine }]}>
                    {activeTreat ? `${treatPct}% ›` : 'Open ›'}
                  </Text>
                </View>
              </ScalePressable>

              {activeTreat ? (
                <>
                  <View style={styles.treatValRow}>
                    <AppIcon
                      name={activeTreat.icon}
                      size={14}
                      color={shade.dopamine}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.bucketValue, { color: shade.text, flex: 1 }]}
                    >
                      {formatVisiblePeso(activeTreat.funded)}{' '}
                      <Text
                        style={{
                          fontSize: 11,
                          color: shade.muted,
                          fontWeight: '600',
                        }}
                      >
                        / {formatVisiblePeso(activeTreat.target)}
                      </Text>
                    </Text>
                  </View>
                  <AnimatedProgressBar
                    percentage={treatPct}
                    trackColor={shade.surface}
                    fillColor={shade.dopamine}
                    height={7}
                  />
                </>
              ) : (
                <Text style={[styles.emptyTreatVal, { color: shade.muted }]}>
                  0 of 3 added
                </Text>
              )}

              {treatReady && activeTreat ? (
                <ScalePressable
                  onPress={() => claimTreat(activeTreat.id)}
                  style={[styles.bucketBtn, { backgroundColor: shade.dopamine }]}
                >
                  <Text style={[styles.bucketBtnText, { color: '#FFFFFF' }]}>
                    Claim Treat
                  </Text>
                </ScalePressable>
              ) : activeTreat ? (
                <ScalePressable
                  onPress={() => openModal('treat')}
                  style={[
                    styles.bucketBtn,
                    { backgroundColor: shade.dopamineSoft },
                  ]}
                >
                  <Text style={[styles.bucketBtnText, { color: shade.dopamine }]}>
                    + Fund Treat
                  </Text>
                </ScalePressable>
              ) : (
                <ScalePressable
                  onPress={onOpenVault}
                  style={[
                    styles.bucketBtn,
                    { backgroundColor: shade.dopamineSoft },
                  ]}
                >
                  <Text style={[styles.bucketBtnText, { color: shade.dopamine }]}>
                    + Add Treat
                  </Text>
                </ScalePressable>
              )}
            </View>
          </View>
        </FadeSlideIn>

        {/* Upcoming Bills Due Soon Card */}
        {upcomingUnpaidBills.length > 0 && (
          <FadeSlideIn delay={95} distance={14}>
            <View
              style={[
                styles.billsDueCard,
                { backgroundColor: shade.card, borderColor: shade.border },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.microHint, { color: shade.muted }]}>
                  BILLS DUE SOON
                </Text>
                <Text style={[styles.billsDueCount, { color: shade.warning }]}>
                  {upcomingUnpaidBills.length} unpaid
                </Text>
              </View>

              <View style={{ gap: 7 }}>
                {upcomingUnpaidBills.map(({ bill, daysLeft }) => (
                  <View
                    key={bill.id}
                    style={[
                      styles.billDueRow,
                      { backgroundColor: shade.surface },
                    ]}
                  >
                    <View style={styles.activityLeftRow}>
                      <IconBadge
                        name={bill.icon}
                        size={13}
                        color={daysLeft <= 1 ? shade.warning : shade.text}
                        bg={daysLeft <= 1 ? shade.warningSoft : shade.card}
                        boxSize={30}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          numberOfLines={1}
                          style={[styles.activityLabel, { color: shade.text }]}
                        >
                          {bill.name}
                        </Text>
                        <Text
                          style={[
                            styles.sourceSub,
                            {
                              color:
                                daysLeft <= 1 ? shade.warning : shade.muted,
                            },
                          ]}
                        >
                          {daysLeft === 0
                            ? 'Due Today'
                            : daysLeft === 1
                            ? 'Due Tomorrow'
                            : `Due in ${daysLeft}d`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.activityRight}>
                      <Text style={[styles.activityDelta, { color: shade.text }]}>
                        {formatVisiblePeso(bill.amount)}
                      </Text>
                      <ScalePressable
                        onPress={() => {
                          triggerLightHaptic();
                          setBillToPay(bill);
                        }}
                        style={[
                          styles.payMiniBtn,
                          { backgroundColor: shade.accent },
                        ]}
                      >
                        <Text
                          style={[
                            styles.payMiniText,
                            { color: shade.accentText },
                          ]}
                        >
                          Pay
                        </Text>
                      </ScalePressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </FadeSlideIn>
        )}

        {/* Smart Personalized Savings Coach */}
        <FadeSlideIn delay={110} distance={14}>
          <SavingsCoachCard />
        </FadeSlideIn>

        {/* Selected Day's Activity Strip */}
        <FadeSlideIn delay={120} distance={14}>
          <View
            style={[
              styles.activityCard,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <View style={styles.rowBetween}>
              <Text style={[styles.microHint, { color: shade.muted }]}>
                {isTodaySelected
                  ? "TODAY'S ACTIVITY"
                  : `ACTIVITY (${selectedDateKey})`}
              </Text>
              <Text style={[styles.microHint, { color: shade.accent }]}>
                {selectedDayEntries.length} logged
              </Text>
            </View>

            {selectedDayEntries.length === 0 ? (
              <View
                style={[styles.activityEmpty, { backgroundColor: shade.surface }]}
              >
                <Text style={[styles.activityEmptyText, { color: shade.muted }]}>
                  Nothing logged yet. Tap Spend! or + Save to Jar.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                {selectedDayEntries.slice(0, 8).map((entry) => {
                  const { deltaText, deltaColor } = getTransactionPresentation(
                    entry,
                    shade,
                    privacyMode
                  );

                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.activityRow,
                        { backgroundColor: shade.surface },
                      ]}
                    >
                      <View style={styles.activityLeftRow}>
                        <IconBadge
                          name={entry.icon}
                          size={13}
                          color={deltaColor}
                          bg={shade.card}
                          boxSize={30}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            numberOfLines={1}
                            style={[styles.activityLabel, { color: shade.text }]}
                          >
                            {entry.label}
                          </Text>
                          {entry.paymentSourceLabel ? (
                            <Text
                              style={[styles.sourceSub, { color: shade.muted }]}
                            >
                              via {entry.paymentSourceLabel}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.activityRight}>
                        <Text
                          style={[styles.activityDelta, { color: deltaColor }]}
                        >
                          {deltaText}
                        </Text>
                        <ScalePressable
                          onPress={() => undoEntry(entry.id)}
                          accessibilityLabel={`Undo ${entry.label}`}
                          hitSlop={6}
                          style={[
                            styles.undoMini,
                            { backgroundColor: shade.card },
                          ]}
                        >
                          <Text
                            style={[
                              styles.undoMiniText,
                              { color: shade.muted },
                            ]}
                          >
                            Undo
                          </Text>
                        </ScalePressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </FadeSlideIn>
      </View>

      <ActionAmountModal
        visible={modalVisible}
        mode={modalMode}
        onClose={() => setModalVisible(false)}
      />

      <PaydayCheckInModal
        visible={showPaydayModal}
        onClose={() => setShowPaydayModal(false)}
      />

      <PayBillModal
        bill={billToPay}
        onClose={() => setBillToPay(null)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  stack: {
    gap: 12,
  },
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
    gap: 14,
    shadowColor: '#111318',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tierDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  rightPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paydayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  streakInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  treatValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  paydayText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scoreBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  scoreText: {
    fontSize: 10,
    fontWeight: '600',
  },
  balanceBlock: {
    gap: 4,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  streakInline: {
    fontSize: 11,
    fontWeight: '700',
  },
  bigBalance: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subBalance: {
    fontSize: 11,
    fontWeight: '500',
  },
  editBudgetChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
  },
  editBudgetText: {
    fontSize: 10,
    fontWeight: '800',
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 2,
  },
  spendPrimaryBtn: {
    flex: 1.35,
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spendPrimaryText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  bankBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  dualRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bucketCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 9,
    justifyContent: 'space-between',
    shadowColor: '#111318',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  bucketKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bucketPct: {
    fontSize: 11,
    fontWeight: '800',
  },
  bucketValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyTreatVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyTreatLink: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  bucketBtn: {
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  bucketBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  activityCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    gap: 9,
    shadowColor: '#111318',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  microHint: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  activityEmpty: {
    borderRadius: 12,
    padding: 12,
  },
  activityEmptyText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  activityRow: {
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  sourceSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  activityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityDelta: {
    fontSize: 12,
    fontWeight: '800',
  },
  undoMini: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  undoMiniText: {
    fontSize: 10,
    fontWeight: '700',
  },
  paydayBanner: {
    borderRadius: 18,
    borderWidth: 1.2,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  paydayBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  paydayBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  paydayBannerSub: {
    fontSize: 11,
  },
  paydayBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paydayCheckInBtn: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },
  paydayCheckInText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  paydayDismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billsDueCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    gap: 9,
    shadowColor: '#111318',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  billsDueCount: {
    fontSize: 10,
    fontWeight: '800',
  },
  billDueRow: {
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  payMiniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  payMiniText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
