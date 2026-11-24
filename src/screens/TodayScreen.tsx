import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActionAmountModal,
  ActionModalMode,
} from '../components/ActionAmountModal';
import { ActivityHistoryModal } from '../components/ActivityHistoryModal';
import { FadeSlideIn } from '../components/AnimatedPrimitives';
import { ConfirmModal } from '../components/ConfirmModal';
import { DebtPaymentModal } from '../components/DebtModals';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { PayBillModal } from '../components/PayBillModal';
import { PaydayCheckInModal } from '../components/PaydayCheckInModal';
import { BuyWantToBuyModal } from '../components/WantToBuyModals';
import { WeeklyBelt } from '../components/WeeklyBelt';
import {
  useBudgetActions,
  useDailyBudget,
  useGoals,
  useThemePrefs,
  useWallet,
} from '../context/BudgetContext';
import {
  getDaysUntilDateKey,
  parseDateKeyLocal,
  roundCurrency,
} from '../state/budgetMath';
import {
  BillItem,
  DebtItem,
  TransactionEntry,
  WantToBuyItem,
  getDaysUntilDayOfMonth,
  getExpectedPaycheckAmount,
  getNextPaydayLabel,
  getPaydayMatchKey,
} from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { getTransactionPresentation } from '../utils/transactionDisplay';
import { TodayActivityCard } from './today/TodayActivityCard';
import { TodayHeroCard } from './today/TodayHeroCard';
import { TodayQuickAllowances } from './today/TodayQuickAllowances';
import { TodayReevaluateCard } from './today/TodayReevaluateCard';
import { TodayUpcomingAndDebts } from './today/TodayUpcomingAndDebts';

interface TodayScreenProps {
  onOpenVault: () => void;
  onOpenBudgetSetup?: () => void;
  onOpenBills?: () => void;
  onOpenAllowances?: () => void;
  onOpenDebts?: () => void;
}

/**
 * Calm, spacious Today screen focused on daily safe-to-spend, quick-spend
 * allowances, tappable Savings/Treats buckets, and recent activity.
 */
export const TodayScreen: React.FC<TodayScreenProps> = ({
  onOpenVault,
  onOpenBudgetSetup,
  onOpenBills,
  onOpenAllowances,
  onOpenDebts,
}) => {
  const { shade, privacyMode, formatVisiblePeso } = useThemePrefs();
  const {
    settings,
    billItems,
    envelopes,
    lastPaydayCheckInKey,
    baseDailyAllowance,
    rolloverBalance,
    todayKey,
    selectedDateKey,
    safeToSpendOnSelectedDay,
    entries,
    getDayEntries,
  } = useDailyBudget();
  const { debts } = useWallet();
  const { monthlySaved, treats, activeTreat, wantToBuyItems } = useGoals();
  const {
    bankTodaySurplus,
    claimTreat,
    undoEntry,
    dismissPaydayPrompt,
    skipWantToBuy,
  } = useBudgetActions();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ActionModalMode>('spend');
  const [modalEnvelopeId, setModalEnvelopeId] = useState<string | null>(null);
  const [showPaydayModal, setShowPaydayModal] = useState(false);
  const [billToPay, setBillToPay] = useState<BillItem | null>(null);
  const [debtToPay, setDebtToPay] = useState<DebtItem | null>(null);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showEndDayConfirm, setShowEndDayConfirm] = useState(false);
  const [reviewingWantItem, setReviewingWantItem] =
    useState<WantToBuyItem | null>(null);
  const [editingEntry, setEditingEntry] = useState<TransactionEntry | null>(
    null
  );
  const [pendingUndoEntry, setPendingUndoEntry] =
    useState<TransactionEntry | null>(null);

  const openModal = useCallback(
    (mode: ActionModalMode, envelopeId: string | null = null) => {
      triggerLightHaptic();
      setModalEnvelopeId(envelopeId);
      setModalMode(mode);
      setModalVisible(true);
    },
    []
  );

  const handleOpenSpend = useCallback(() => openModal('spend'), [openModal]);
  const handleOpenPaydayModal = useCallback(() => setShowPaydayModal(true), []);
  const handleOpenAllActivity = useCallback(() => setShowAllActivity(true), []);
  const handleOpenAllowances = useCallback(
    () => (onOpenAllowances || onOpenBudgetSetup)?.(),
    [onOpenAllowances, onOpenBudgetSetup]
  );
  const handleOpenBills = useCallback(
    () => (onOpenBills || onOpenBudgetSetup)?.(),
    [onOpenBills, onOpenBudgetSetup]
  );

  const isTodaySelected = selectedDateKey === todayKey;
  const todayDateObj = useMemo(() => parseDateKeyLocal(todayKey), [todayKey]);
  const currentMonthKey = todayKey.slice(0, 7);
  const paydayLabel = getNextPaydayLabel(settings, todayDateObj);
  const isPaydayPromptVisible =
    getPaydayMatchKey(settings, todayDateObj) === todayKey &&
    lastPaydayCheckInKey !== todayKey;
  const expectedPay = getExpectedPaycheckAmount(settings);

  const allUpcomingUnpaidBills = useMemo(
    () =>
      billItems
        .filter(
          (b) =>
            typeof b.dueDay === 'number' && b.lastPaidMonth !== currentMonthKey
        )
        .map((b) => ({
          bill: b,
          daysLeft: getDaysUntilDayOfMonth(b.dueDay!, todayDateObj),
        }))
        .filter((item) => item.daysLeft <= 5)
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [billItems, currentMonthKey, todayDateObj]
  );

  const { openDebts, iOweTotal, owedToMeTotal, previewDebts } = useMemo(() => {
    const active = (debts || []).filter(
      (d) => roundCurrency(Math.max(0, d.amount - d.paidAmount)) > 0
    );
    const owe = active
      .filter((d) => d.direction === 'i_owe')
      .reduce(
        (sum, d) => roundCurrency(sum + Math.max(0, d.amount - d.paidAmount)),
        0
      );
    const owed = active
      .filter((d) => d.direction === 'owed_to_me')
      .reduce(
        (sum, d) => roundCurrency(sum + Math.max(0, d.amount - d.paidAmount)),
        0
      );
    return {
      openDebts: active,
      iOweTotal: owe,
      owedToMeTotal: owed,
      previewDebts: active.slice(0, 3),
    };
  }, [debts]);

  const goal = Math.max(0.01, settings.monthlySavingsGoal);
  const savPct = Math.min(100, Math.round((monthlySaved / goal) * 100));

  const treatPct = activeTreat
    ? Math.min(
        100,
        Math.round(
          (activeTreat.funded / Math.max(0.01, activeTreat.target)) * 100
        )
      )
    : 0;
  const treatReady =
    Boolean(activeTreat) &&
    activeTreat!.funded >= activeTreat!.target &&
    !activeTreat!.claimed;

  const selectedDayEntries = useMemo(
    () => getDayEntries(selectedDateKey),
    [getDayEntries, selectedDateKey]
  );
  const hasEndedSelectedDay = selectedDayEntries.some(
    (e) => e.type === 'midnight_split'
  );

  const leftoverPos = Math.max(0, roundCurrency(safeToSpendOnSelectedDay));
  const endDayRolloverHalf = roundCurrency(leftoverPos / 2);
  const endDaySavedHalf = roundCurrency(leftoverPos - endDayRolloverHalf);
  const activeUnclaimedTreat =
    activeTreat && !activeTreat.claimed
      ? activeTreat
      : treats.find((t) => !t.claimed) || null;

  const readyWantToBuyItems = useMemo(
    () =>
      wantToBuyItems.filter(
        (w) =>
          w.status === 'waiting' &&
          getDaysUntilDateKey(w.reevaluateOn, todayKey) <= 0
      ),
    [wantToBuyItems, todayKey]
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

        <TodayHeroCard
          isTodaySelected={isTodaySelected}
          selectedDateKey={selectedDateKey}
          todayKey={todayKey}
          paydayLabel={paydayLabel}
          safeToSpendOnSelectedDay={safeToSpendOnSelectedDay}
          baseDailyAllowance={baseDailyAllowance}
          rolloverBalance={rolloverBalance}
          hasEndedDay={hasEndedSelectedDay}
          isPaydayPromptVisible={isPaydayPromptVisible}
          expectedPay={expectedPay}
          onOpenSpend={handleOpenSpend}
          onBankSurplus={() => setShowEndDayConfirm(true)}
          onOpenPaydayModal={handleOpenPaydayModal}
          onDismissPaydayPrompt={dismissPaydayPrompt}
        />

        <TodayQuickAllowances
          envelopes={envelopes}
          monthlySaved={monthlySaved}
          monthlySavingsGoal={settings.monthlySavingsGoal}
          savPct={savPct}
          treats={treats}
          activeTreat={activeTreat}
          treatPct={treatPct}
          treatReady={treatReady}
          onOpenModal={openModal}
          onOpenAllowances={handleOpenAllowances}
          onOpenVault={onOpenVault}
          onClaimTreat={claimTreat}
        />

        <TodayReevaluateCard
          readyItems={readyWantToBuyItems}
          onReviewItem={setReviewingWantItem}
          onSkipItem={(item) => skipWantToBuy(item.id)}
        />

        <TodayUpcomingAndDebts
          upcomingUnpaidBills={allUpcomingUnpaidBills.slice(0, 3)}
          totalUpcomingBillsCount={allUpcomingUnpaidBills.length}
          openDebtsCount={openDebts.length}
          iOweTotal={iOweTotal}
          owedToMeTotal={owedToMeTotal}
          previewDebts={previewDebts}
          onPayBill={setBillToPay}
          onPayDebt={setDebtToPay}
          onOpenBills={handleOpenBills}
          onOpenDebts={onOpenDebts}
        />

        <TodayActivityCard
          isTodaySelected={isTodaySelected}
          selectedDateKey={selectedDateKey}
          selectedDayEntries={selectedDayEntries}
          totalEntriesCount={entries.length}
          treats={treats}
          debts={debts}
          onOpenAllActivity={handleOpenAllActivity}
          onEditEntry={setEditingEntry}
          onRequestUndo={setPendingUndoEntry}
        />
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

      <DebtPaymentModal
        debt={debtToPay}
        onClose={() => setDebtToPay(null)}
      />

      <ActivityHistoryModal
        visible={showAllActivity}
        onClose={() => setShowAllActivity(false)}
      />

      <EditTransactionModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
      />

      <BuyWantToBuyModal
        item={reviewingWantItem}
        onClose={() => setReviewingWantItem(null)}
        showDecisionShortcuts
      />

      <ConfirmModal
        visible={showEndDayConfirm}
        title="End Day & Save 50/50?"
        message={`Split ${formatVisiblePeso(
          leftoverPos
        )} leftover in half: ${formatVisiblePeso(
          endDayRolloverHalf
        )} rolls into tomorrow, and ${formatVisiblePeso(
          endDaySavedHalf
        )} goes to ${
          activeUnclaimedTreat
            ? `"${activeUnclaimedTreat.name}"`
            : 'your Savings Jar'
        }.`}
        confirmLabel="End Day & Save"
        cancelLabel="Keep Spending"
        destructive={false}
        icon="moon"
        onCancel={() => setShowEndDayConfirm(false)}
        onConfirm={() => {
          setShowEndDayConfirm(false);
          bankTodaySurplus();
        }}
      />

      <ConfirmModal
        visible={pendingUndoEntry !== null}
        title="Delete & Undo Entry?"
        message={
          pendingUndoEntry
            ? `Remove "${pendingUndoEntry.label}" (${
                getTransactionPresentation(pendingUndoEntry, shade, privacyMode)
                  .deltaText
              }) and reverse its balance changes?`
            : ''
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Keep"
        destructive
        icon="rotate-ccw"
        onCancel={() => setPendingUndoEntry(null)}
        onConfirm={() => {
          if (pendingUndoEntry) {
            undoEntry(pendingUndoEntry.id);
          }
          setPendingUndoEntry(null);
        }}
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
});
