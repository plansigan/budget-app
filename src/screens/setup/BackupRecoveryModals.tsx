import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScalePressable } from '../../components/AnimatedPrimitives';
import { AppIcon } from '../../components/AppIcon';
import { FormModal } from '../../components/FormModal';
import { useBudgetActions, useThemePrefs } from '../../context/BudgetContext';
import {
  AutoBackupSnapshot,
  formatSnapshotAgeLabel,
} from '../../state/autoSnapshots';
import {
  pickJsonFileTextOnWeb,
  summarizeBackupJson,
} from '../../utils/backupExport';
import { triggerLightHaptic } from '../../utils/haptics';
import { formatPeso } from '../../utils/numberFormat';

const SNAPSHOT_REASON_LABEL: Record<AutoBackupSnapshot['reason'], string> = {
  auto_interval: '10-min auto',
  before_restore: 'Before restore/reset',
  manual: 'Manual save',
};

interface AutoSnapshotsModalProps {
  visible: boolean;
  onClose: () => void;
  onRestored: (result: { ok: boolean; text: string }) => void;
}

const AutoSnapshotsModalContent: React.FC<
  Omit<AutoSnapshotsModalProps, 'visible'>
> = ({ onClose, onRestored }) => {
  const { shade } = useThemePrefs();
  const { listAutoSnapshots, restoreAutoSnapshot } = useBudgetActions();

  const [snapshots, setSnapshots] = useState<AutoBackupSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingSnapshots(true);
    void listAutoSnapshots()
      .then((list) => {
        if (active) setSnapshots(list);
      })
      .finally(() => {
        if (active) setLoadingSnapshots(false);
      });
    return () => {
      active = false;
    };
  }, [listAutoSnapshots]);

  const handleRestoreSnapshot = async (snap: AutoBackupSnapshot) => {
    triggerLightHaptic();
    const res = await restoreAutoSnapshot(snap.id);
    onRestored({ ok: res.ok, text: res.message });
    if (res.ok) {
      onClose();
    }
  };

  return (
    <FormModal
      visible
      title="Auto-Recovery Snapshots"
      subtitle="Captured automatically every 10 mins & before resets"
      icon="rotate-ccw"
      accentColor={shade.dopamine}
      onClose={onClose}
    >
      {loadingSnapshots ? (
        <Text style={[styles.snapshotEmptyText, { color: shade.muted }]}>
          Loading saved recovery points...
        </Text>
      ) : snapshots.length === 0 ? (
        <Text style={[styles.snapshotEmptyText, { color: shade.muted }]}>
          No snapshots yet. Tap Save Now or log activity to create your first
          recovery point.
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
  );
};

export const AutoSnapshotsModal: React.FC<AutoSnapshotsModalProps> = (
  props
) => {
  if (!props.visible) return null;
  return (
    <AutoSnapshotsModalContent
      onClose={props.onClose}
      onRestored={props.onRestored}
    />
  );
};

interface RestoreBackupModalProps {
  visible: boolean;
  onClose: () => void;
  onRestored: (result: { ok: boolean; text: string }) => void;
}

const RestoreBackupModalContent: React.FC<
  Omit<RestoreBackupModalProps, 'visible'>
> = ({ onClose, onRestored }) => {
  const { shade } = useThemePrefs();
  const { importBackupJsonString } = useBudgetActions();

  const [restoreText, setRestoreText] = useState('');
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const restorePreview = useMemo(
    () => (restoreText.trim() ? summarizeBackupJson(restoreText) : null),
    [restoreText]
  );

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
    onRestored({ ok: res.ok, text: res.message });
    if (res.ok) {
      onClose();
    } else {
      setRestoreError(res.message);
    }
  };

  return (
    <FormModal
      visible
      title="Restore Backup"
      subtitle="Load a .json backup file or paste exported JSON below"
      icon="upload"
      onClose={onClose}
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
            {pickedFileName ? `Loaded: ${pickedFileName}` : 'Choose .json File'}
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
            backgroundColor: restorePreview?.ok ? shade.accent : shade.surface,
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
  );
};

export const RestoreBackupModal: React.FC<RestoreBackupModalProps> = (
  props
) => {
  if (!props.visible) return null;
  return (
    <RestoreBackupModalContent
      onClose={props.onClose}
      onRestored={props.onRestored}
    />
  );
};

const styles = StyleSheet.create({
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
  restoreErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
