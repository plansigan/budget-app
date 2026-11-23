import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  FadeSlideIn,
  PopValueText,
  ScalePressable,
} from '../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../components/AppIcon';
import { BudgetStepperRow } from '../components/BudgetStepperRow';
import { ConfirmModal } from '../components/ConfirmModal';
import { FormModal } from '../components/FormModal';
import { MonthlyBillsBreakdownCard } from '../components/MonthlyBillsBreakdownCard';
import { PayBillModal } from '../components/PayBillModal';
import { SalaryScheduleCard } from '../components/SalaryScheduleCard';
import { SpendingEnvelopesCard } from '../components/SpendingEnvelopesCard';
import {
  useBudgetActions,
  useDailyBudget,
  useSystemStatus,
  useThemePrefs,
} from '../context/BudgetContext';
import {
  AutoBackupSnapshot,
  formatSnapshotAgeLabel,
} from '../state/autoSnapshots';
import { BillItem, ThemeMode } from '../types/budget';
import {
  buildTransactionsCsv,
  pickJsonFileTextOnWeb,
  shareOrDownloadText,
  summarizeBackupJson,
} from '../utils/backupExport';
import { triggerLightHaptic } from '../utils/haptics';
import { formatPeso } from '../utils/numberFormat';

const THEME_OPTIONS: Array<{ mode: ThemeMode; label: string; icon: string }> = [
  { mode: 'system', label: 'System', icon: 'monitor' },
  { mode: 'light', label: 'Light', icon: 'sun' },
  { mode: 'dark', label: 'Dark', icon: 'moon' },
];

const SNAPSHOT_REASON_LABEL: Record<AutoBackupSnapshot['reason'], string> = {
  auto_interval: '10-min auto',
  before_restore: 'Before restore/reset',
  manual: 'Manual save',
};

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
  const { shade, privacyMode, formatVisiblePeso, themeMode, setThemeMode } =
    useThemePrefs();
  const {
    lastBackupAt,
    lastAutoSnapshotAt,
    autoSnapshotCount,
    storagePersisted,
  } = useSystemStatus();
  const {
    todayKey,
    settings,
    billItems,
    envelopes,
    entries,
    baseDailyAllowance,
  } = useDailyBudget();
  const {
    markBackupExported,
    listAutoSnapshots,
    restoreAutoSnapshot,
    captureAutoSnapshotNow,
    updateBudgetConfig,
    updateSalarySchedule,
    updateBillAmount,
    updateBillItem,
    updateBillDueDay,
    addBillItem,
    removeBillItem,
    addEnvelope,
    updateEnvelope,
    deleteEnvelope,
    refillEnvelope,
    simulateMidnightSplit,
    reopenOnboarding,
    openTutorial,
    resetToNewUser,
    resetDemoState,
    exportBackupJsonString,
    importBackupJsonString,
  } = useBudgetActions();

  const [subTab, setSubTab] = useState<'plan' | 'settings'>('plan');
  const [billToPay, setBillToPay] = useState<BillItem | null>(null);

  useEffect(() => {
    if (focusAllowancesKey > 0) {
      setSubTab('plan');
    }
  }, [focusAllowancesKey]);

  const [showRestoreBox, setShowRestoreBox] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const [showSnapshotsModal, setShowSnapshotsModal] = useState(false);
  const [snapshots, setSnapshots] = useState<AutoBackupSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);

  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    icon?: string;
    onConfirm: () => void;
  } | null>(null);

  const restorePreview = useMemo(
    () => (restoreText.trim() ? summarizeBackupJson(restoreText) : null),
    [restoreText]
  );

  const daysSinceBackup = useMemo(() => {
    if (!lastBackupAt) return null;
    const ms = Date.parse(lastBackupAt);
    if (Number.isNaN(ms)) return null;
    return Math.max(0, Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24)));
  }, [lastBackupAt]);

  const showBackupNudge =
    (daysSinceBackup === null && entries.length >= 5) ||
    (daysSinceBackup !== null && daysSinceBackup >= 14 && entries.length > 0);

  const handleExportCsv = async () => {
    triggerLightHaptic();
    const csv = buildTransactionsCsv(entries);
    const ok = await shareOrDownloadText(
      'velvet-budget-logs.csv',
      csv,
      'text/csv;charset=utf-8;',
      'Velvet Budget Logs (CSV)'
    );
    setBackupStatus({
      ok,
      text: ok
        ? `Exported ${entries.length} logs to CSV!`
        : 'Could not open share dialog.',
    });
  };

  const handleExportJson = async () => {
    triggerLightHaptic();
    const json = exportBackupJsonString();
    const ok = await shareOrDownloadText(
      'velvet-budget-backup.json',
      json,
      'application/json',
      'Velvet Budget Full Backup (JSON)'
    );
    if (ok) {
      markBackupExported();
    }
    setBackupStatus({
      ok,
      text: ok
        ? 'Full backup ready to save or share!'
        : 'Could not share backup.',
    });
  };

  const handlePickBackupFile = async () => {
    triggerLightHaptic();
    const picked = await pickJsonFileTextOnWeb();
    if (!picked.ok) {
      if (!picked.cancelled && picked.error) {
        setRestoreError(picked.error);
      }
      return;
    }
    setPickedFileName(picked.filename);
    setRestoreText(picked.text);
    setRestoreError(null);
  };

  const handleRestoreJson = () => {
    const res = importBackupJsonString(restoreText);
    setBackupStatus({ ok: res.ok, text: res.message });
    if (res.ok) {
      setRestoreError(null);
      setRestoreText('');
      setPickedFileName(null);
      setShowRestoreBox(false);
    } else {
      setRestoreError(res.message);
    }
  };

  const handleOpenSnapshots = async () => {
    triggerLightHaptic();
    setShowSnapshotsModal(true);
    setLoadingSnapshots(true);
    try {
      const list = await listAutoSnapshots();
      setSnapshots(list);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  const handleRestoreSnapshot = async (snap: AutoBackupSnapshot) => {
    triggerLightHaptic();
    const res = await restoreAutoSnapshot(snap.id);
    setBackupStatus({ ok: res.ok, text: res.message });
    if (res.ok) {
      setShowSnapshotsModal(false);
    }
  };

  const manualBackupSubtext =
    daysSinceBackup === null
      ? showBackupNudge
        ? 'Tip: Export a JSON copy for off-device safety'
        : 'Save a portable .json copy anytime'
      : daysSinceBackup === 0
      ? 'Last exported: Today'
      : daysSinceBackup === 1
      ? 'Last exported: 1 day ago'
      : `Last exported: ${daysSinceBackup} days ago`;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 2-Segment Control: Plan vs Settings */}
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
        <FadeSlideIn delay={0} style={styles.section}>
          {/* Live Daily Budget Formula Hero Strip */}
          <View
            style={[
              styles.formulaCard,
              {
                backgroundColor: shade.heroBg,
                borderColor: shade.heroBorder,
              },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={[styles.formulaKicker, { color: shade.heroMuted }]}>
                DAILY BUDGET FORMULA
              </Text>
              <Text style={[styles.formulaSub, { color: shade.heroText }]}>
                {formatVisiblePeso(settings.monthlyIncome)} in − Bills, Env &{' '}
                {formatVisiblePeso(settings.monthlySavingsGoal)} save
              </Text>
            </View>
            <PopValueText valueTrigger={baseDailyAllowance}>
              <Text
                numberOfLines={1}
                style={[styles.formulaResult, { color: '#4ADE80' }]}
              >
                {formatVisiblePeso(baseDailyAllowance)}/day
              </Text>
            </PopValueText>
          </View>

          <BudgetStepperRow
            label="Monthly Income"
            hint="How much you take home"
            value={settings.monthlyIncome}
            shade={shade}
            onChange={(val) =>
              updateBudgetConfig(
                val,
                settings.fixedBills,
                settings.monthlySavingsGoal
              )
            }
          />

          <SalaryScheduleCard
            frequency={settings.salaryFrequency}
            payday1={settings.payday1}
            payday2={settings.payday2}
            shade={shade}
            onChange={updateSalarySchedule}
          />

          <MonthlyBillsBreakdownCard
            bills={billItems}
            shade={shade}
            enableTracking
            collapsible
            defaultExpanded={false}
            currentMonthKey={todayKey.slice(0, 7)}
            privacyMode={privacyMode}
            onUpdateAmount={updateBillAmount}
            onUpdateBillItem={updateBillItem}
            onUpdateDueDay={updateBillDueDay}
            onAddBill={addBillItem}
            onRemoveBill={removeBillItem}
            onRequestPayBill={(bill) => setBillToPay(bill)}
          />

          <SpendingEnvelopesCard
            envelopes={envelopes}
            salaryFrequency={settings.salaryFrequency}
            shade={shade}
            privacyMode={privacyMode}
            collapsible
            defaultExpanded={false}
            focusSignal={focusAllowancesKey}
            onAddEnvelope={addEnvelope}
            onUpdateEnvelope={updateEnvelope}
            onDeleteEnvelope={deleteEnvelope}
            onRefillEnvelope={refillEnvelope}
          />

          <BudgetStepperRow
            label="Monthly Savings Goal"
            hint="Set aside first each month"
            value={settings.monthlySavingsGoal}
            shade={shade}
            onChange={(val) =>
              updateBudgetConfig(
                settings.monthlyIncome,
                settings.fixedBills,
                val
              )
            }
          />
        </FadeSlideIn>
      ) : (
        <FadeSlideIn delay={0} style={styles.section}>
          {/* Appearance */}
          <View
            style={[
              styles.appearanceCard,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <View style={{ gap: 2 }}>
              <Text style={[styles.cardTitle, { color: shade.text }]}>
                Appearance
              </Text>
              <Text style={[styles.cardSub, { color: shade.muted }]}>
                Follow device theme or lock Light / Dark mode
              </Text>
            </View>
            <View
              style={[
                styles.themeSegRow,
                { backgroundColor: shade.surface },
              ]}
            >
              {THEME_OPTIONS.map((opt) => {
                const active = themeMode === opt.mode;
                return (
                  <ScalePressable
                    key={opt.mode}
                    onPress={() => setThemeMode(opt.mode)}
                    style={[
                      styles.themeSegBtn,
                      active && { backgroundColor: shade.accent },
                    ]}
                  >
                    <AppIcon
                      name={opt.icon}
                      size={14}
                      color={active ? shade.accentText : shade.muted}
                    />
                    <Text
                      style={[
                        styles.themeSegText,
                        { color: active ? shade.accentText : shade.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>
          </View>

          {/* Grouped Backup & Auto-Recovery Card */}
          <View
            style={[
              styles.groupedCard,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <View
              style={[
                styles.autoHeaderRow,
                { borderBottomColor: shade.border },
              ]}
            >
              <View style={styles.autoLeftCluster}>
                <View
                  style={[styles.liveDot, { backgroundColor: shade.positive }]}
                />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={[styles.cardTitle, { color: shade.text }]}>
                    Auto-save & 10-min Recovery
                  </Text>
                  <Text style={[styles.cardSub, { color: shade.muted }]}>
                    Last snapshot: {formatSnapshotAgeLabel(lastAutoSnapshotAt)} •{' '}
                    {autoSnapshotCount}{' '}
                    {autoSnapshotCount === 1 ? 'point' : 'points'}
                    {storagePersisted ? ' • Persistent' : ''}
                  </Text>
                </View>
              </View>
              <ScalePressable
                onPress={() => {
                  triggerLightHaptic();
                  void captureAutoSnapshotNow();
                }}
                style={[
                  styles.saveNowPill,
                  { backgroundColor: shade.positiveSoft },
                ]}
              >
                <Text style={[styles.saveNowText, { color: shade.positive }]}>
                  Save Now
                </Text>
              </ScalePressable>
            </View>

            <ScalePressable
              onPress={() => {
                void handleOpenSnapshots();
              }}
              style={[styles.groupedRow, { borderBottomColor: shade.border }]}
            >
              <View style={styles.rowLeft}>
                <IconBadge
                  name="rotate-ccw"
                  size={15}
                  color={shade.dopamine}
                  bg={shade.dopamineSoft}
                  boxSize={34}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowTitle, { color: shade.text }]}>
                    Auto-Snapshots ({autoSnapshotCount})
                  </Text>
                  <Text style={[styles.rowSub, { color: shade.muted }]}>
                    Restore an automatic rolling checkpoint
                  </Text>
                </View>
              </View>
              <AppIcon name="chevron-right" size={17} color={shade.muted} />
            </ScalePressable>

            <ScalePressable
              onPress={() => {
                void handleExportJson();
              }}
              style={[styles.groupedRow, { borderBottomColor: shade.border }]}
            >
              <View style={styles.rowLeft}>
                <IconBadge
                  name="download"
                  size={15}
                  color={shade.positive}
                  bg={shade.positiveSoft}
                  boxSize={34}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowTitle, { color: shade.text }]}>
                    Export Full Backup (JSON)
                  </Text>
                  <Text
                    style={[
                      styles.rowSub,
                      { color: showBackupNudge ? shade.dopamine : shade.muted },
                    ]}
                  >
                    {manualBackupSubtext}
                  </Text>
                </View>
              </View>
              <AppIcon name="chevron-right" size={17} color={shade.muted} />
            </ScalePressable>

            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setRestoreError(null);
                setPickedFileName(null);
                setShowRestoreBox(true);
                setBackupStatus(null);
              }}
              style={[styles.groupedRow, { borderBottomColor: shade.border }]}
            >
              <View style={styles.rowLeft}>
                <IconBadge
                  name="upload"
                  size={15}
                  color={shade.text}
                  bg={shade.surface}
                  boxSize={34}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowTitle, { color: shade.text }]}>
                    Restore Backup (JSON)
                  </Text>
                  <Text style={[styles.rowSub, { color: shade.muted }]}>
                    Pick a .json file or paste exported data
                  </Text>
                </View>
              </View>
              <AppIcon name="chevron-right" size={17} color={shade.muted} />
            </ScalePressable>

            <ScalePressable
              onPress={() => {
                void handleExportCsv();
              }}
              style={[styles.groupedRow, { borderBottomWidth: 0 }]}
            >
              <View style={styles.rowLeft}>
                <IconBadge
                  name="file-text"
                  size={15}
                  color={shade.text}
                  bg={shade.surface}
                  boxSize={34}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowTitle, { color: shade.text }]}>
                    Export Activity Logs (CSV)
                  </Text>
                  <Text style={[styles.rowSub, { color: shade.muted }]}>
                    Spreadsheet copy of {entries.length}{' '}
                    {entries.length === 1 ? 'log' : 'logs'}
                  </Text>
                </View>
              </View>
              <AppIcon name="chevron-right" size={17} color={shade.muted} />
            </ScalePressable>
          </View>

          {backupStatus && (
            <Text
              style={[
                styles.backupStatusText,
                { color: backupStatus.ok ? shade.positive : shade.warning },
              ]}
            >
              {backupStatus.text}
            </Text>
          )}

          {/* Grouped App Tools & Reset Card */}
          <View
            style={[
              styles.groupedCard,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <ScalePressable
              onPress={() => (onOpenFaq ? onOpenFaq() : openTutorial())}
              style={[styles.groupedRow, { borderBottomColor: shade.border }]}
            >
              <View style={styles.rowLeft}>
                <AppIcon name="help-circle" size={16} color={shade.dopamine} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowTitle, { color: shade.dopamine }]}>
                    App Guide & FAQ
                  </Text>
                  <Text style={[styles.rowSub, { color: shade.muted }]}>
                    How every feature works & common questions
                  </Text>
                </View>
              </View>
              <AppIcon name="chevron-right" size={17} color={shade.muted} />
            </ScalePressable>

            <ScalePressable
              onPress={reopenOnboarding}
              style={[styles.groupedRow, { borderBottomColor: shade.border }]}
            >
              <View style={styles.rowLeft}>
                <AppIcon name="sliders" size={16} color={shade.text} />
                <Text style={[styles.rowTitle, { color: shade.text }]}>
                  Re-do Setup Questions
                </Text>
              </View>
              <AppIcon name="chevron-right" size={17} color={shade.muted} />
            </ScalePressable>

            <ScalePressable
              onPress={simulateMidnightSplit}
              style={[styles.groupedRow, { borderBottomColor: shade.border }]}
            >
              <View style={styles.rowLeft}>
                <AppIcon name="moon" size={16} color={shade.text} />
                <Text style={[styles.rowTitle, { color: shade.text }]}>
                  Test 50/50 Midnight Split
                </Text>
              </View>
              <AppIcon name="chevron-right" size={17} color={shade.muted} />
            </ScalePressable>

            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setPendingConfirm({
                  title: 'Load Demo Data?',
                  message:
                    'This will replace your current budget, accounts, and logs with sample demo data. An automatic recovery snapshot is saved beforehand.',
                  confirmLabel: 'Load Demo',
                  destructive: true,
                  icon: 'star',
                  onConfirm: resetDemoState,
                });
              }}
              style={[styles.groupedRow, { borderBottomColor: shade.border }]}
            >
              <View style={styles.rowLeft}>
                <AppIcon name="star" size={16} color={shade.text} />
                <Text style={[styles.rowTitle, { color: shade.text }]}>
                  Load Sample Demo Data
                </Text>
              </View>
              <AppIcon name="chevron-right" size={17} color={shade.muted} />
            </ScalePressable>

            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setPendingConfirm({
                  title: 'Start Fresh?',
                  message:
                    'This will erase all logged transactions, treats, installments, and reset savings to ₱0. An automatic recovery snapshot will be captured first.',
                  confirmLabel: 'Reset Everything',
                  destructive: true,
                  icon: 'rotate-ccw',
                  onConfirm: resetToNewUser,
                });
              }}
              style={[styles.groupedRow, { borderBottomWidth: 0 }]}
            >
              <View style={styles.rowLeft}>
                <AppIcon name="rotate-ccw" size={16} color={shade.warning} />
                <Text style={[styles.rowTitle, { color: shade.warning }]}>
                  Start Fresh (0 Treats, ₱0)
                </Text>
              </View>
              <AppIcon name="chevron-right" size={17} color={shade.warning} />
            </ScalePressable>
          </View>
        </FadeSlideIn>
      )}

      {/* Auto-Snapshot Recovery Modal */}
      <FormModal
        visible={showSnapshotsModal}
        title="Auto-Recovery Snapshots"
        subtitle="Captured automatically every 10 mins & before resets"
        icon="rotate-ccw"
        accentColor={shade.dopamine}
        onClose={() => setShowSnapshotsModal(false)}
      >
        {loadingSnapshots ? (
          <Text style={[styles.snapshotEmptyText, { color: shade.muted }]}>
            Loading saved recovery points...
          </Text>
        ) : snapshots.length === 0 ? (
          <Text style={[styles.snapshotEmptyText, { color: shade.muted }]}>
            No snapshots yet. Tap Save Now or log activity to create your first recovery point.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {snapshots.map((snap) => (
              <View
                key={snap.id}
                style={[
                  styles.snapshotRow,
                  {
                    backgroundColor: shade.surface,
                    borderColor: shade.border,
                  },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={[styles.snapshotTime, { color: shade.text }]}>
                    {new Date(snap.savedAt).toLocaleString()} (
                    {formatSnapshotAgeLabel(snap.savedAt)})
                  </Text>
                  <Text style={[styles.snapshotMeta, { color: shade.muted }]}>
                    {SNAPSHOT_REASON_LABEL[snap.reason]} • {snap.entriesCount}{' '}
                    logs • {snap.accountsCount} accts • Income{' '}
                    {formatPeso(snap.monthlyIncome)}
                  </Text>
                </View>
                <ScalePressable
                  onPress={() => {
                    void handleRestoreSnapshot(snap);
                  }}
                  style={[
                    styles.snapshotRestoreBtn,
                    { backgroundColor: shade.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.snapshotRestoreText,
                      { color: shade.accentText },
                    ]}
                  >
                    Restore
                  </Text>
                </ScalePressable>
              </View>
            ))}
          </View>
        )}
      </FormModal>

      <FormModal
        visible={showRestoreBox}
        title="Restore Backup"
        subtitle="Load a .json backup file or paste exported JSON below"
        icon="upload"
        onClose={() => {
          setRestoreError(null);
          setPickedFileName(null);
          setShowRestoreBox(false);
        }}
      >
        {Platform.OS === 'web' && (
          <ScalePressable
            onPress={() => {
              void handlePickBackupFile();
            }}
            style={[
              styles.filePickBtn,
              { backgroundColor: shade.surface, borderColor: shade.accent },
            ]}
          >
            <AppIcon name="file-text" size={14} color={shade.accent} />
            <Text style={[styles.filePickText, { color: shade.accent }]}>
              {pickedFileName
                ? `Loaded: ${pickedFileName}`
                : 'Choose .json File'}
            </Text>
          </ScalePressable>
        )}

        <TextInput
          value={restoreText}
          onChangeText={(t) => {
            setRestoreText(t);
            setPickedFileName(null);
            if (restoreError) setRestoreError(null);
          }}
          multiline
          placeholder='{"version":6,"data":{...}}'
          placeholderTextColor={shade.muted}
          style={[
            styles.restoreInput,
            {
              backgroundColor: shade.surface,
              color: shade.text,
              borderColor:
                restoreError || (restorePreview && !restorePreview.ok)
                  ? shade.warning
                  : shade.border,
            },
          ]}
        />

        {restorePreview && restorePreview.ok && (
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: shade.positiveSoft,
                borderColor: shade.positive,
              },
            ]}
          >
            <Text style={[styles.previewCardTitle, { color: shade.positive }]}>
              Backup Ready to Restore
            </Text>
            <Text style={[styles.previewCardSub, { color: shade.text }]}>
              {restorePreview.summary.exportedAt
                ? `Exported ${new Date(
                    restorePreview.summary.exportedAt
                  ).toLocaleDateString()} • `
                : ''}
              Income {formatPeso(restorePreview.summary.monthlyIncome)} •{' '}
              {restorePreview.summary.entriesCount} logs •{' '}
              {restorePreview.summary.banksCount +
                restorePreview.summary.creditCardsCount}{' '}
              accounts • {restorePreview.summary.envelopesCount} allowances
            </Text>
          </View>
        )}

        {(restoreError || (restorePreview && !restorePreview.ok)) && (
          <Text style={[styles.restoreErrorText, { color: shade.warning }]}>
            {restoreError ||
              (restorePreview && !restorePreview.ok ? restorePreview.error : '')}
          </Text>
        )}

        <ScalePressable
          disabled={!restorePreview?.ok}
          onPress={handleRestoreJson}
          style={[
            styles.restoreConfirm,
            {
              backgroundColor: restorePreview?.ok
                ? shade.accent
                : shade.surface,
              opacity: restorePreview?.ok ? 1 : 0.65,
            },
          ]}
        >
          <Text
            style={[
              styles.restoreConfirmText,
              {
                color: restorePreview?.ok ? shade.accentText : shade.muted,
              },
            ]}
          >
            {restorePreview?.ok ? 'Confirm & Restore Backup' : 'Restore Data'}
          </Text>
        </ScalePressable>
      </FormModal>

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
  section: {
    gap: 14,
  },
  formulaCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  formulaKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  formulaSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  formulaResult: {
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
  appearanceCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 12,
  },
  themeSegRow: {
    flexDirection: 'row',
    borderRadius: 13,
    padding: 4,
    gap: 4,
  },
  themeSegBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  themeSegText: {
    fontSize: 12,
    fontWeight: '800',
  },
  groupedCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  autoHeaderRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  autoLeftCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  saveNowPill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  saveNowText: {
    fontSize: 12,
    fontWeight: '800',
  },
  groupedRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 1,
  },
  snapshotEmptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 14,
    lineHeight: 19,
  },
  snapshotRow: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  snapshotTime: {
    fontSize: 13,
    fontWeight: '800',
  },
  snapshotMeta: {
    fontSize: 11,
  },
  snapshotRestoreBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  snapshotRestoreText: {
    fontSize: 12,
    fontWeight: '800',
  },
  restoreInput: {
    minWidth: 0,
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  restoreConfirm: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreConfirmText: {
    fontSize: 13,
    fontWeight: '800',
  },
  filePickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
  },
  filePickText: {
    fontSize: 12,
    fontWeight: '800',
  },
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
    gap: 3,
  },
  previewCardTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  previewCardSub: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  backupStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  restoreErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
