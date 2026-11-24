import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  FadeSlideIn,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../../components/AppIcon';
import { SegmentedTabBar } from '../../components/form/SegmentedTabBar';
import {
  useBudgetActions,
  useDailyBudget,
  useSystemStatus,
  useThemePrefs,
} from '../../context/BudgetContext';
import { formatSnapshotAgeLabel } from '../../state/autoSnapshots';
import { ThemeMode } from '../../types/budget';
import {
  buildTransactionsCsv,
  shareOrDownloadText,
} from '../../utils/backupExport';
import { triggerLightHaptic } from '../../utils/haptics';

const THEME_OPTIONS: Array<{ key: ThemeMode; label: string; icon: string }> = [
  { key: 'system', label: 'System', icon: 'monitor' },
  { key: 'light', label: 'Light', icon: 'sun' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
];

export interface SetupConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  icon?: string;
  onConfirm: () => void;
}

interface SettingsAndBackupSectionProps {
  onOpenFaq?: () => void;
  onOpenSnapshots: () => void;
  onOpenRestore: () => void;
  backupStatus: { ok: boolean; text: string } | null;
  onSetBackupStatus: (status: { ok: boolean; text: string } | null) => void;
  onRequestConfirm: (req: SetupConfirmRequest) => void;
}

export const SettingsAndBackupSection: React.FC<SettingsAndBackupSectionProps> =
  React.memo(
    ({
      onOpenFaq,
      onOpenSnapshots,
      onOpenRestore,
      backupStatus,
      onSetBackupStatus,
      onRequestConfirm,
    }) => {
      const { shade, themeMode, setThemeMode } = useThemePrefs();
      const {
        lastBackupAt,
        lastAutoSnapshotAt,
        autoSnapshotCount,
        storagePersisted,
      } = useSystemStatus();
      const { entries } = useDailyBudget();
      const {
        markBackupExported,
        captureAutoSnapshotNow,
        simulateMidnightSplit,
        reopenOnboarding,
        openTutorial,
        resetToNewUser,
        resetDemoState,
        exportBackupJsonString,
      } = useBudgetActions();

      const daysSinceBackup = useMemo(() => {
        if (!lastBackupAt) return null;
        const ms = Date.parse(lastBackupAt);
        if (Number.isNaN(ms)) return null;
        return Math.max(
          0,
          Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24))
        );
      }, [lastBackupAt]);

      const showBackupNudge =
        (daysSinceBackup === null && entries.length >= 5) ||
        (daysSinceBackup !== null &&
          daysSinceBackup >= 14 &&
          entries.length > 0);

      const handleExportCsv = async () => {
        triggerLightHaptic();
        const csv = buildTransactionsCsv(entries);
        const ok = await shareOrDownloadText(
          'velvet-budget-logs.csv',
          csv,
          'text/csv;charset=utf-8;',
          'Velvet Budget Logs (CSV)'
        );
        onSetBackupStatus({
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
        onSetBackupStatus({
          ok,
          text: ok
            ? 'Full backup ready to save or share!'
            : 'Could not share backup.',
        });
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
        <FadeSlideIn delay={0} style={styles.section}>
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
            <SegmentedTabBar<ThemeMode>
              value={themeMode}
              onChange={setThemeMode}
              shade={shade}
              variant="accent"
              withBorder={false}
              options={THEME_OPTIONS}
            />
          </View>

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
                    Last snapshot: {formatSnapshotAgeLabel(lastAutoSnapshotAt)}{' '}
                    • {autoSnapshotCount}{' '}
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
                accessibilityRole="button"
                accessibilityLabel="Save recovery snapshot now"
                hitSlop={8}
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
                triggerLightHaptic();
                onOpenSnapshots();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Auto-Snapshots, ${autoSnapshotCount} saved`}
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
              accessibilityRole="button"
              accessibilityLabel="Export full backup as JSON"
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
                onSetBackupStatus(null);
                onOpenRestore();
              }}
              accessibilityRole="button"
              accessibilityLabel="Restore backup from JSON"
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
                    {Platform.OS === 'web'
                      ? 'Pick a .json file or paste exported data'
                      : 'Paste exported JSON backup data'}
                  </Text>
                </View>
              </View>
              <AppIcon name="chevron-right" size={17} color={shade.muted} />
            </ScalePressable>

            <ScalePressable
              onPress={() => {
                void handleExportCsv();
              }}
              accessibilityRole="button"
              accessibilityLabel="Export activity logs as CSV"
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

          <View
            style={[
              styles.groupedCard,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <ScalePressable
              onPress={() => (onOpenFaq ? onOpenFaq() : openTutorial())}
              accessibilityRole="button"
              accessibilityLabel="Open App Guide and FAQ"
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
              accessibilityRole="button"
              accessibilityLabel="Re-do setup questions"
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
              onPress={() => {
                triggerLightHaptic();
                onRequestConfirm({
                  title: 'Run 50/50 Midnight Split?',
                  message:
                    "This runs today's real 50/50 split on your remaining Safe-to-Spend allowance (you can undo the created entry anytime in Activity History).",
                  confirmLabel: 'Run Split',
                  destructive: false,
                  icon: 'moon',
                  onConfirm: simulateMidnightSplit,
                });
              }}
              accessibilityRole="button"
              accessibilityLabel="Test 50/50 Midnight Split"
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
                onRequestConfirm({
                  title: 'Load Demo Data?',
                  message:
                    'This will replace your current budget, accounts, and logs with sample demo data. An automatic recovery snapshot is saved beforehand.',
                  confirmLabel: 'Load Demo',
                  destructive: true,
                  icon: 'star',
                  onConfirm: resetDemoState,
                });
              }}
              accessibilityRole="button"
              accessibilityLabel="Load sample demo data"
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
                onRequestConfirm({
                  title: 'Start Fresh?',
                  message:
                    'This will erase all logged transactions, treats, installments, and reset savings to ₱0. An automatic recovery snapshot will be captured first.',
                  confirmLabel: 'Reset Everything',
                  destructive: true,
                  icon: 'rotate-ccw',
                  onConfirm: resetToNewUser,
                });
              }}
              accessibilityRole="button"
              accessibilityLabel="Start fresh and reset all data"
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
      );
    }
  );

const styles = StyleSheet.create({
  section: {
    gap: 14,
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
  backupStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
