import React, { Suspense, lazy, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActionAmountModal } from '../components/ActionAmountModal';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  AddWantToBuyModal,
  BuyWantToBuyModal,
} from '../components/WantToBuyModals';
import { SegmentedTabBar } from '../components/form/SegmentedTabBar';
import {
  useBudgetActions,
  useDailyBudget,
  useGoals,
  useThemePrefs,
} from '../context/BudgetContext';
import { getDaysUntilDateKey } from '../state/budgetMath';
import {
  MonthlyArchiveSnapshot,
  SinkingFundItem,
  WantToBuyItem,
} from '../types/budget';
import { GoalsSection, VaultConfirmRequest } from './vault/GoalsSection';
import { InsightsSection } from './vault/InsightsSection';
import { VaultModals } from './vault/VaultModals';
import { WantToBuySection } from './vault/WantToBuySection';

const MonthlyWrapUpModal = lazy(() =>
  import('../components/MonthlyWrapUpModal').then((m) => ({
    default: m.MonthlyWrapUpModal,
  }))
);

/**
 * Goals, Buy Later cool-off wishlist, & Insights tab orchestrator.
 */
export const TreatVaultScreen: React.FC = () => {
  const { shade } = useThemePrefs();
  const { todayKey } = useDailyBudget();
  const { wantToBuyItems } = useGoals();
  const { setActiveTreat } = useBudgetActions();

  const [subTab, setSubTab] = useState<'goals' | 'buy_later' | 'insights'>(
    'goals'
  );
  const [wrapVisible, setWrapVisible] = useState(false);
  const [selectedWrapArchive, setSelectedWrapArchive] =
    useState<MonthlyArchiveSnapshot | null>(null);
  const [showAddTreat, setShowAddTreat] = useState(false);
  const [showFundTreatModal, setShowFundTreatModal] = useState(false);
  const [showAddFund, setShowAddFund] = useState(false);
  const [depositTargetFund, setDepositTargetFund] =
    useState<SinkingFundItem | null>(null);
  const [showAddWantToBuy, setShowAddWantToBuy] = useState(false);
  const [decideWantToBuyItem, setDecideWantToBuyItem] =
    useState<WantToBuyItem | null>(null);
  const [pendingConfirm, setPendingConfirm] =
    useState<VaultConfirmRequest | null>(null);

  const { waitingCount, readyCount } = useMemo(() => {
    let waiting = 0;
    let ready = 0;
    for (const item of wantToBuyItems) {
      if (item.status === 'waiting') {
        waiting += 1;
        if (getDaysUntilDateKey(item.reevaluateOn, todayKey) <= 0) {
          ready += 1;
        }
      }
    }
    return { waitingCount: waiting, readyCount: ready };
  }, [wantToBuyItems, todayKey]);

  const buyLaterTabLabel =
    readyCount > 0
      ? `Buy Later (${readyCount}!)`
      : waitingCount > 0
      ? `Buy Later (${waitingCount})`
      : 'Buy Later';

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <SegmentedTabBar
        value={subTab}
        onChange={setSubTab}
        shade={shade}
        variant="card"
        containerStyle={{ marginBottom: 2 }}
        options={[
          { key: 'goals', label: 'Goals', icon: 'target' },
          { key: 'buy_later', label: buyLaterTabLabel, icon: 'clock' },
          { key: 'insights', label: 'Insights', icon: 'bar-chart-2' },
        ]}
      />

      {subTab === 'goals' && (
        <GoalsSection
          onOpenAddTreat={() => setShowAddTreat(true)}
          onFundTreat={(treatId) => {
            setActiveTreat(treatId);
            setShowFundTreatModal(true);
          }}
          onOpenAddFund={() => setShowAddFund(true)}
          onOpenDepositFund={setDepositTargetFund}
          onRequestConfirm={setPendingConfirm}
        />
      )}

      {subTab === 'buy_later' && (
        <WantToBuySection
          onOpenAdd={() => setShowAddWantToBuy(true)}
          onOpenDecide={setDecideWantToBuyItem}
          onRequestConfirm={setPendingConfirm}
        />
      )}

      {subTab === 'insights' && (
        <InsightsSection
          onOpenWrap={(archive) => {
            setSelectedWrapArchive(archive ?? null);
            setWrapVisible(true);
          }}
        />
      )}

      <VaultModals
        showAddTreat={showAddTreat}
        onCloseAddTreat={() => setShowAddTreat(false)}
        showAddFund={showAddFund}
        onCloseAddFund={() => setShowAddFund(false)}
        depositTargetFund={depositTargetFund}
        onCloseDepositFund={() => setDepositTargetFund(null)}
      />

      <AddWantToBuyModal
        visible={showAddWantToBuy}
        onClose={() => setShowAddWantToBuy(false)}
      />

      <BuyWantToBuyModal
        item={decideWantToBuyItem}
        onClose={() => setDecideWantToBuyItem(null)}
        showDecisionShortcuts={false}
      />

      <ActionAmountModal
        visible={showFundTreatModal}
        mode="treat"
        onClose={() => setShowFundTreatModal(false)}
      />

      {wrapVisible && (
        <Suspense fallback={null}>
          <MonthlyWrapUpModal
            visible={wrapVisible}
            archiveSnapshot={selectedWrapArchive}
            onClose={() => {
              setWrapVisible(false);
              setSelectedWrapArchive(null);
            }}
          />
        </Suspense>
      )}

      <ConfirmModal
        visible={pendingConfirm !== null}
        title={pendingConfirm?.title || ''}
        message={pendingConfirm?.message || ''}
        confirmLabel={pendingConfirm?.confirmLabel || 'Confirm'}
        destructive={pendingConfirm?.destructive ?? true}
        icon={pendingConfirm?.icon}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          pendingConfirm?.onConfirm();
          setPendingConfirm(null);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
    gap: 14,
  },
});
