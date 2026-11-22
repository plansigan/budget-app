import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ActionAmountModal,
  ActionModalMode,
} from '../components/ActionAmountModal';
import { ActivityHistoryModal } from '../components/ActivityHistoryModal';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  FadeSlideIn,
  PopValueText,
  ScalePressable,
} from '../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../components/AppIcon';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { PayBillModal } from '../components/PayBillModal';
import { PaydayCheckInModal } from '../components/PaydayCheckInModal';
import { WeeklyBelt } from '../components/WeeklyBelt';
import { useBudget } from '../context/BudgetContext';
import { parseDateKeyLocal } from '../state/budgetMath';
import { isEditableEntryType } from '../state/budgetReducer';
import {
  BillItem,
  TransactionEntry,
  getDaysUntilDayOfMonth,
  getExpectedPaycheckAmount,
  getNextPaydayLabel,
  getPaydayMatchKey,
} from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { getTransactionPresentation } from '../utils/transactionDisplay';

interface TodayScreenProps {
  onOpenVault: () => void;
  onOpenBudgetSetup?: () => void;
}

/**
 * Calm, spacious Today screen focused on daily safe-to-spend, quick-spend
 * envelopes, tappable Savings/Treats buckets, and recent activity.
 */
export const TodayScreen: React.FC<TodayScreenProps> = ({ onOpenVault }) => {
  const {
    shade,
    privacyMode,
    formatVisiblePeso,
    settings,
    billItems,
    envelopes,
    lastPaydayCheckInKey,
    monthlySaved,
    baseDailyAllowance,
    rolloverBalance,
    todayKey,
    selectedDateKey,
    safeToSpendOnSelectedDay,
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
  const [modalEnvelopeId, setModalEnvelopeId] = useState<string | null>(null);
  const [showPaydayModal, setShowPaydayModal] = useState(false);
  const [billToPay, setBillToPay] = useState<BillItem | null>(null);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TransactionEntry | null>(
    null
  );

  const openModal = (mode: ActionModalMode, envelopeId: string | null = null) => {
    triggerLightHaptic();
    setModalEnvelopeId(envelopeId);
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
        <FadeSlideIn delay={0} distance={10}>
          <WeeklyBelt />
        </FadeSlideIn>

        {/* Calmer Dark Obsidian Hero Card */}
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
                  setShowPaydayModal(true);
                }}
                accessibilityLabel="Open Payday Check-In"
                hitSlop={4}
                style={[
                  styles.paydayPill,
                  { backgroundColor: shade.heroSurface },
                ]}
              >
                <AppIcon name="calendar" size={12} color="#4ADE80" />
                <Text style={[styles.paydayText, { color: '#4ADE80' }]}>
                  {paydayLabel}
                </Text>
              </ScalePressable>
            </View>

            <View style={styles.balanceBlock}>
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

              <Text style={[styles.subBalance, { color: shade.heroMuted }]}>
                {formatVisiblePeso(baseDailyAllowance)} base
                {isTodaySelected && rolloverBalance > 0
                  ? ` • +${formatVisiblePeso(rolloverBalance)} rollover`
                  : ''}
              </Text>
            </View>

            <View style={styles.primaryActionsRow}>
              <ScalePressable
                onPress={() => openModal('spend')}
                scaleTo={0.96}
                style={[styles.spendPrimaryBtn, { backgroundColor: '#FFFFFF' }]}
              >
                <Text style={[styles.spendPrimaryText, { color: '#141519' }]}>
                  Spend!
                </Text>
              </ScalePressable>

              <ScalePressable
                onPress={bankTodaySurplus}
                scaleTo={0.96}
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

        {/* Payday Check-In Reminder */}
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
                  <AppIcon name="x" size={14} color={shade.muted} />
                </ScalePressable>
              </View>
            </View>
          </FadeSlideIn>
        )}

        {/* Spacious Horizontal Quick-Spend Envelopes Strip */}
        {envelopes.length > 0 && (
          <FadeSlideIn delay={75} distance={12}>
            <View style={styles.sectionBlock}>
              <View style={styles.rowBetween}>
                <Text style={[styles.sectionKicker, { color: shade.muted }]}>
                  SPENDING ENVELOPES
                </Text>
                <Text style={[styles.sectionSubHint, { color: shade.muted }]}>
                  Tap to spend
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.envStripScroll}
              >
                {envelopes.map((env) => {
                  const pct =
                    env.amountPerCycle > 0
                      ? Math.min(
                          100,
                          Math.max(
                            0,
                            Math.round((env.balance / env.amountPerCycle) * 100)
                          )
                        )
                      : 0;
                  return (
                    <ScalePressable
                      key={env.id}
                      onPress={() => openModal('spend', env.id)}
                      style={[
                        styles.envPillCard,
                        {
                          backgroundColor: shade.card,
                          borderColor: shade.border,
                        },
                      ]}
                    >
                      <View style={styles.envCardTop}>
                        <IconBadge
                          name={env.icon}
                          size={15}
                          color={shade.dopamine}
                          bg={shade.dopamineSoft}
                          boxSize={32}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            numberOfLines={1}
                            style={[styles.envCardName, { color: shade.text }]}
                          >
                            {env.name}
                          </Text>
                          <Text
                            style={[
                              styles.envCardBal,
                              { color: shade.dopamine },
                            ]}
                          >
                            {formatVisiblePeso(env.balance)} left
                          </Text>
                        </View>
                      </View>
                      <AnimatedProgressBar
                        percentage={pct}
                        trackColor={shade.surface}
                        fillColor={shade.dopamine}
                        height={4}
                      />
                    </ScalePressable>
                  );
                })}
              </ScrollView>
            </View>
          </FadeSlideIn>
        )}

        {/* Spacious Tappable Dual-Bucket Cards (No Stacked Extra Buttons) */}
        <FadeSlideIn delay={90} distance={14}>
          <View style={styles.dualRow}>
            <ScalePressable
              onPress={() => openModal('save')}
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
                  style={{ fontSize: 12, color: shade.muted, fontWeight: '600' }}
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
              <Text style={[styles.bucketTapHint, { color: shade.positive }]}>
                + Save to Jar
              </Text>
            </ScalePressable>

            <ScalePressable
              onPress={() =>
                treatReady && activeTreat
                  ? claimTreat(activeTreat.id)
                  : activeTreat
                  ? openModal('treat')
                  : onOpenVault()
              }
              style={[
                styles.bucketCard,
                { backgroundColor: shade.card, borderColor: shade.border },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.bucketKicker, { color: shade.dopamine }]}>
                  TREAT ({treats.length}/3)
                </Text>
                <ScalePressable onPress={onOpenVault} hitSlop={8}>
                  <Text style={[styles.bucketPct, { color: shade.dopamine }]}>
                    {activeTreat ? `${treatPct}% ›` : 'Open ›'}
                  </Text>
                </ScalePressable>
              </View>

              {activeTreat ? (
                <>
                  <Text
                    numberOfLines={1}
                    style={[styles.bucketValue, { color: shade.text }]}
                  >
                    {formatVisiblePeso(activeTreat.funded)}{' '}
                    <Text
                      style={{
                        fontSize: 12,
                        color: shade.muted,
                        fontWeight: '600',
                      }}
                    >
                      / {formatVisiblePeso(activeTreat.target)}
                    </Text>
                  </Text>
                  <AnimatedProgressBar
                    percentage={treatPct}
                    trackColor={shade.surface}
                    fillColor={shade.dopamine}
                    height={7}
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.bucketTapHint, { color: shade.dopamine }]}
                  >
                    {treatReady
                      ? `Claim ${activeTreat.name}`
                      : `+ Fund ${activeTreat.name}`}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.emptyTreatVal, { color: shade.muted }]}>
                    No treats yet
                  </Text>
                  <Text
                    style={[styles.bucketTapHint, { color: shade.dopamine }]}
                  >
                    + Add Treat Goal
                  </Text>
                </>
              )}
            </ScalePressable>
          </View>
        </FadeSlideIn>

        {/* Upcoming Bills Due Soon */}
        {upcomingUnpaidBills.length > 0 && (
          <FadeSlideIn delay={105} distance={14}>
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: shade.card, borderColor: shade.border },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.sectionKicker, { color: shade.muted }]}>
                  BILLS DUE SOON
                </Text>
                <Text style={[styles.billsDueCount, { color: shade.warning }]}>
                  {upcomingUnpaidBills.length} unpaid
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                {upcomingUnpaidBills.map(({ bill, daysLeft }) => (
                  <View
                    key={bill.id}
                    style={[
                      styles.billDueRow,
                      { backgroundColor: shade.surface },
                    ]}
                  >
                    <View style={styles.billLeftRow}>
                      <IconBadge
                        name={bill.icon}
                        size={14}
                        color={daysLeft <= 1 ? shade.warning : shade.text}
                        bg={daysLeft <= 1 ? shade.warningSoft : shade.card}
                        boxSize={34}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          numberOfLines={1}
                          style={[styles.rowTitle, { color: shade.text }]}
                        >
                          {bill.name}
                        </Text>
                        <Text
                          style={[
                            styles.rowSub,
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

                    <View style={styles.billRightRow}>
                      <Text style={[styles.rowDelta, { color: shade.text }]}>
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

        {/* Selected Day's Activity (Spacious 4-Row Cap + View All Modal) */}
        <FadeSlideIn delay={120} distance={14}>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionKicker, { color: shade.muted }]}>
                {isTodaySelected
                  ? "TODAY'S ACTIVITY"
                  : `ACTIVITY (${selectedDateKey})`}
              </Text>
              <View style={styles.activityHeaderRight}>
                <Text style={[styles.sectionSubHint, { color: shade.muted }]}>
                  {selectedDayEntries.length} today
                </Text>
                {entries.length > 0 && (
                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      setShowAllActivity(true);
                    }}
                    hitSlop={6}
                    style={[
                      styles.viewAllChip,
                      {
                        backgroundColor: shade.surface,
                        borderColor: shade.border,
                      },
                    ]}
                  >
                    <Text style={[styles.viewAllText, { color: shade.text }]}>
                      View All ({entries.length})
                    </Text>
                  </ScalePressable>
                )}
              </View>
            </View>

            {selectedDayEntries.length === 0 ? (
              <View
                style={[styles.activityEmpty, { backgroundColor: shade.surface }]}
              >
                <Text style={[styles.activityEmptyText, { color: shade.muted }]}>
                  Nothing logged yet. Tap Spend! or Savings Jar above.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {selectedDayEntries.slice(0, 4).map((entry) => {
                  const { deltaText, deltaColor } = getTransactionPresentation(
                    entry,
                    shade,
                    privacyMode
                  );
                  const editable =
                    isEditableEntryType(entry) &&
                    (entry.type !== 'treat_direct' ||
                      !entry.treatId ||
                      !treats.some((t) => t.id === entry.treatId && t.claimed));
                  const sourceText =
                    entry.type === 'wallet_transfer' &&
                    entry.paymentSourceLabel &&
                    entry.toPaymentSourceLabel
                      ? `${entry.paymentSourceLabel} → ${entry.toPaymentSourceLabel}`
                      : entry.paymentSourceLabel
                      ? `via ${entry.paymentSourceLabel}`
                      : isTodaySelected
                      ? 'Today'
                      : selectedDateKey;

                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.activityRow,
                        { backgroundColor: shade.surface },
                      ]}
                    >
                      <View style={styles.activityContent}>
                        <View style={styles.rowBetween}>
                          <ScalePressable
                            disabled={!editable}
                            onPress={() => {
                              if (!editable) return;
                              triggerLightHaptic();
                              setEditingEntry(entry);
                            }}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                            }}
                          >
                            <IconBadge
                              name={entry.icon}
                              size={14}
                              color={deltaColor}
                              bg={shade.card}
                              boxSize={34}
                            />
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.rowTitle,
                                { color: shade.text, flex: 1 },
                              ]}
                            >
                              {entry.label}
                            </Text>
                          </ScalePressable>
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
                              style={[styles.undoMiniText, { color: shade.muted }]}
                            >
                              Undo
                            </Text>
                          </ScalePressable>
                        </View>
                        <ScalePressable
                          disabled={!editable}
                          onPress={() => {
                            if (!editable) return;
                            triggerLightHaptic();
                            setEditingEntry(entry);
                          }}
                          style={styles.rowBottomWrap}
                        >
                          <Text
                            numberOfLines={1}
                            style={[styles.rowSub, { color: shade.muted }]}
                          >
                            {sourceText}
                          </Text>
                          <Text style={[styles.rowDelta, { color: deltaColor }]}>
                            {deltaText}
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
        initialEnvelopeId={modalEnvelopeId}
        onClose={() => {
          setModalVisible(false);
          setModalEnvelopeId(null);
        }}
      />

      <PaydayCheckInModal
        visible={showPaydayModal}
        onClose={() => setShowPaydayModal(false)}
      />

      <PayBillModal
        bill={billToPay}
        onClose={() => setBillToPay(null)}
      />

      <ActivityHistoryModal
        visible={showAllActivity}
        onClose={() => setShowAllActivity(false)}
      />

      <EditTransactionModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  stack: {
    gap: 15,
  },
  sectionBlock: {
    gap: 8,
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
    fontSize: 42,
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
  envStripScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  envPillCard: {
    minWidth: 156,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  envCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  envCardName: {
    fontSize: 13,
    fontWeight: '800',
  },
  envCardBal: {
    fontSize: 12,
    fontWeight: '700',
  },
  dualRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bucketCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    justifyContent: 'space-between',
    shadowColor: '#111318',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  bucketKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bucketPct: {
    fontSize: 12,
    fontWeight: '800',
  },
  bucketValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  bucketTapHint: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyTreatVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: '#111318',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionSubHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAllChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '800',
  },
  activityEmpty: {
    borderRadius: 14,
    padding: 16,
  },
  activityEmptyText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
  },
  activityRow: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowBottomWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 0,
  },
  rowSub: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  rowDelta: {
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 0,
  },
  undoMini: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  undoMiniText: {
    fontSize: 11,
    fontWeight: '700',
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
  billsDueCount: {
    fontSize: 11,
    fontWeight: '800',
  },
  billDueRow: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  billLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  billRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payMiniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  payMiniText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
