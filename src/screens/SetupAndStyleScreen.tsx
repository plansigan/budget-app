import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScalePressable } from '../components/AnimatedPrimitives';
import { ConfirmModal } from '../components/ConfirmModal';
import { PayBillModal } from '../components/PayBillModal';
import { useThemePrefs } from '../context/BudgetContext';
import { BillItem } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
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
 * Clean 2-segment Budget screen separating Plan (income, schedule, bills,
 * allowances, savings) from Settings (appearance, auto-snapshots, tools).
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

  useEffect(() => {
    if (focusAllowancesKey > 0) {
      setSubTab('plan');
    }
  }, [focusAllowancesKey]);

  const handleOpenSnapshots = useCallback(() => setShowSnapshotsModal(true), []);
  const handleOpenRestore = useCallback(() => setShowRestoreBox(true), []);

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
            setSubTab('plan');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: subTab === 'plan' }}
          style={[
            styles.subTabBtn,
            subTab === 'plan' && { backgroundColor: shade.card },
          ]}
        >
          <Text
            style={[
              styles.subTabText,
              { color: subTab === 'plan' ? shade.text : shade.muted },
            ]}
          >
            Plan
          </Text>
        </ScalePressable>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setSubTab('settings');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: subTab === 'settings' }}
          style={[
            styles.subTabBtn,
            subTab === 'settings' && { backgroundColor: shade.card },
          ]}
        >
          <Text
            style={[
              styles.subTabText,
              { color: subTab === 'settings' ? shade.text : shade.muted },
            ]}
          >
            Settings
          </Text>
        </ScalePressable>
      </View>

      {subTab === 'plan' ? (
        <BudgetPlanSection
          focusAllowancesKey={focusAllowancesKey}
          onRequestPayBill={setBillToPay}
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
        destructive={pendingConfirm?.destructive}
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
    gap: 16,
  },
  subTabBar: {
    flexDirection: 'row',
    borderRadius: 15,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
