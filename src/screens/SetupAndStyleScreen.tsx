import React, { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ConfirmModal } from '../components/ConfirmModal';
import { PayBillModal } from '../components/PayBillModal';
import { SegmentedTabBar } from '../components/form/SegmentedTabBar';
import { useThemePrefs } from '../context/BudgetContext';
import { BillItem } from '../types/budget';
import {
  AutoSnapshotsModal,
  RestoreBackupModal,
} from './setup/BackupRecoveryModals';
import { BudgetPlanSection } from './setup/BudgetPlanSection';
import {
  SettingsAndBackupSection,
  SetupConfirmRequest,
} from './setup/SettingsAndBackupSection';

interface SetupAndStyleScreenProps {
  focusAllowancesKey?: number;
  onOpenFaq?: () => void;
}

/**
 * 2-segment Budget screen with a pinned Plan / Settings toggle and smooth auto-scroll to Allowances.
 */
export const SetupAndStyleScreen: React.FC<SetupAndStyleScreenProps> = ({
  focusAllowancesKey = 0,
  onOpenFaq,
}) => {
  const { shade } = useThemePrefs();

  const [subTab, setSubTab] = useState<'plan' | 'settings'>('plan');
  const [billToPay, setBillToPay] = useState<BillItem | null>(null);
  const [showRestoreBox, setShowRestoreBox] = useState(false);
  const [showSnapshotsModal, setShowSnapshotsModal] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [pendingConfirm, setPendingConfirm] =
    useState<SetupConfirmRequest | null>(null);

  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const allowancesOffsetYRef = useRef<number | null>(null);
  const pendingAllowancesScrollRef = useRef(false);

  const scrollToAllowances = useCallback(() => {
    const targetY = allowancesOffsetYRef.current;
    if (targetY === null) return false;
    pendingAllowancesScrollRef.current = false;
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, targetY - 8),
        animated: true,
      });
    }, 60);
    return true;
  }, []);

  useEffect(() => {
    if (focusAllowancesKey <= 0) return;
    pendingAllowancesScrollRef.current = true;
    setSubTab('plan');
    if (subTab === 'plan') {
      scrollToAllowances();
    }
  }, [focusAllowancesKey, subTab, scrollToAllowances]);

  const handleAllowancesLayout = useCallback(
    (y: number) => {
      allowancesOffsetYRef.current = y;
      if (pendingAllowancesScrollRef.current) {
        scrollToAllowances();
      }
    },
    [scrollToAllowances]
  );

  const handleChangeSubTab = useCallback((next: 'plan' | 'settings') => {
    setSubTab(next);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const handleOpenSnapshots = useCallback(() => setShowSnapshotsModal(true), []);
  const handleOpenRestore = useCallback(() => setShowRestoreBox(true), []);

  return (
    <View style={styles.root}>
      <SegmentedTabBar<'plan' | 'settings'>
        value={subTab}
        onChange={handleChangeSubTab}
        shade={shade}
        variant="card"
        options={[
          { key: 'plan', label: 'Plan' },
          { key: 'settings', label: 'Settings' },
        ]}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {subTab === 'plan' ? (
          <BudgetPlanSection
            focusAllowancesKey={focusAllowancesKey}
            onRequestPayBill={setBillToPay}
            onAllowancesLayout={handleAllowancesLayout}
          />
        ) : (
          <SettingsAndBackupSection
            onOpenFaq={onOpenFaq}
            onOpenSnapshots={handleOpenSnapshots}
            onOpenRestore={handleOpenRestore}
            backupStatus={backupStatus}
            onSetBackupStatus={setBackupStatus}
            onRequestConfirm={setPendingConfirm}
          />
        )}
      </ScrollView>

      <AutoSnapshotsModal
        visible={showSnapshotsModal}
        onClose={() => setShowSnapshotsModal(false)}
        onRestored={setBackupStatus}
      />

      <RestoreBackupModal
        visible={showRestoreBox}
        onClose={() => setShowRestoreBox(false)}
        onRestored={setBackupStatus}
      />

      <PayBillModal bill={billToPay} onClose={() => setBillToPay(null)} />

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
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 14,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },
});
