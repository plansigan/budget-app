import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActionAmountModal } from '../components/ActionAmountModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { MonthlyWrapUpModal } from '../components/MonthlyWrapUpModal';
import { SegmentedTabBar } from '../components/form/SegmentedTabBar';
import {
  useBudgetActions,
  useThemePrefs,
} from '../context/BudgetContext';
import { MonthlyArchiveSnapshot, SinkingFundItem } from '../types/budget';
import { GoalsSection, VaultConfirmRequest } from './vault/GoalsSection';
import { InsightsSection } from './vault/InsightsSection';
import { VaultModals } from './vault/VaultModals';

/**
 * Goals & Insights tab orchestrator.
 */
export const TreatVaultScreen: React.FC = () => {
  const { shade } = useThemePrefs();
  const { setActiveTreat } = useBudgetActions();

  const [subTab, setSubTab] = useState<'goals' | 'insights'>('goals');
  const [wrapVisible, setWrapVisible] = useState(false);
  const [selectedWrapArchive, setSelectedWrapArchive] =
    useState<MonthlyArchiveSnapshot | null>(null);
  const [showAddTreat, setShowAddTreat] = useState(false);
  const [showFundTreatModal, setShowFundTreatModal] = useState(false);
  const [showAddFund, setShowAddFund] = useState(false);
  const [depositTargetFund, setDepositTargetFund] =
    useState<SinkingFundItem | null>(null);
  const [pendingConfirm, setPendingConfirm] =
    useState<VaultConfirmRequest | null>(null);

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
          { key: 'goals', label: 'Goals & Buckets', icon: 'target' },
          { key: 'insights', label: 'Insights & Coach', icon: 'bar-chart-2' },
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

      <ActionAmountModal
        visible={showFundTreatModal}
        mode="treat"
        onClose={() => setShowFundTreatModal(false)}
      />

      <MonthlyWrapUpModal
        visible={wrapVisible}
        archiveSnapshot={selectedWrapArchive}
        onClose={() => {
          setWrapVisible(false);
          setSelectedWrapArchive(null);
        }}
      />

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
