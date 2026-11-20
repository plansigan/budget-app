import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScalePressable } from '../components/AnimatedPrimitives';
import { AppIcon } from '../components/AppIcon';
import { ConfirmModal } from '../components/ConfirmModal';
import { MonthlyWrapUpModal } from '../components/MonthlyWrapUpModal';
import { useBudget } from '../context/BudgetContext';
import { MonthlyArchiveSnapshot, SinkingFundItem } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { GoalsSection, VaultConfirmRequest } from './vault/GoalsSection';
import { InsightsSection } from './vault/InsightsSection';
import { VaultModals } from './vault/VaultModals';

/**
 * Goals & Insights tab orchestrator.
 */
export const TreatVaultScreen: React.FC = () => {
  const { shade } = useBudget();

  const [subTab, setSubTab] = useState<'goals' | 'insights'>('goals');
  const [wrapVisible, setWrapVisible] = useState(false);
  const [selectedWrapArchive, setSelectedWrapArchive] =
    useState<MonthlyArchiveSnapshot | null>(null);
  const [showAddTreat, setShowAddTreat] = useState(false);
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
      <View
        style={[
          styles.subTabBar,
          { backgroundColor: shade.surface, borderColor: shade.border },
        ]}
      >
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setSubTab('goals');
          }}
          style={[
            styles.subTabBtn,
            subTab === 'goals' && { backgroundColor: shade.card },
          ]}
        >
          <View style={styles.inlineRow}>
            <AppIcon
              name="target"
              size={14}
              color={subTab === 'goals' ? shade.text : shade.muted}
            />
            <Text
              style={[
                styles.subTabText,
                { color: subTab === 'goals' ? shade.text : shade.muted },
              ]}
            >
              Goals & Buckets
            </Text>
          </View>
        </ScalePressable>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setSubTab('insights');
          }}
          style={[
            styles.subTabBtn,
            subTab === 'insights' && { backgroundColor: shade.card },
          ]}
        >
          <View style={styles.inlineRow}>
            <AppIcon
              name="bar-chart-2"
              size={14}
              color={subTab === 'insights' ? shade.text : shade.muted}
            />
            <Text
              style={[
                styles.subTabText,
                { color: subTab === 'insights' ? shade.text : shade.muted },
              ]}
            >
              Insights & Wrap-Up
            </Text>
          </View>
        </ScalePressable>
      </View>

      {subTab === 'goals' && (
        <GoalsSection
          onOpenAddTreat={() => setShowAddTreat(true)}
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
        destructive
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
    paddingBottom: 36,
    gap: 10,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subTabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginBottom: 4,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
