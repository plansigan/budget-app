import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AUTO_SNAPSHOT_INTERVAL_MS,
  captureAutoSnapshot,
  formatSnapshotAgeLabel,
  getLatestAutoSnapshotMeta,
  listAutoSnapshots,
  MAX_ASYNC_SNAPSHOTS,
  shouldCaptureAutoSnapshot,
} from '../state/autoSnapshots';
import { createDemoState, PersistedBudgetState } from '../state/defaults';
import { normalizePersistedState } from '../state/persistence';
import { parseBackupJson } from '../utils/backupExport';

describe('autoSnapshots & dual recovery', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('enforces the 10-minute rolling interval check cleanly', () => {
    const t0 = 1_700_000_000_000;
    expect(shouldCaptureAutoSnapshot(0, t0)).toBe(true);
    expect(shouldCaptureAutoSnapshot(t0, t0 + AUTO_SNAPSHOT_INTERVAL_MS - 1)).toBe(
      false
    );
    expect(shouldCaptureAutoSnapshot(t0, t0 + AUTO_SNAPSHOT_INTERVAL_MS)).toBe(
      true
    );
  });

  it('captures, orders newest-first, caps AsyncStorage history, and reports metadata', async () => {
    const demo = createDemoState('2026-11-22');

    for (let i = 0; i < MAX_ASYNC_SNAPSHOTS + 2; i += 1) {
      const ts = new Date(1_700_000_000_000 + i * 600_000);
      await captureAutoSnapshot(
        {
          ...demo,
          settings: { ...demo.settings, monthlyIncome: 30000 + i * 1000 },
        },
        i === 0 ? 'manual' : 'auto_interval',
        ts
      );
    }

    const list = await listAutoSnapshots();
    expect(list).toHaveLength(MAX_ASYNC_SNAPSHOTS);
    // Newest first
    expect(list[0].monthlyIncome).toBe(30000 + (MAX_ASYNC_SNAPSHOTS + 1) * 1000);
    expect(list[0].entriesCount).toBe(demo.entries.length);
    expect(list[0].accountsCount).toBe(
      demo.banks.length + demo.creditCards.length
    );
    expect(list[0].envelopesCount).toBe(demo.envelopes.length);

    const meta = await getLatestAutoSnapshotMeta();
    expect(meta).toEqual({
      savedAt: list[0].savedAt,
      count: MAX_ASYNC_SNAPSHOTS,
    });
  });

  it('formats human-readable snapshot relative ages cleanly', () => {
    const baseMs = Date.parse('2026-11-22T12:00:00.000Z');
    expect(formatSnapshotAgeLabel(undefined, baseMs)).toBe('Not yet');
    expect(formatSnapshotAgeLabel('invalid', baseMs)).toBe('Not yet');
    expect(
      formatSnapshotAgeLabel(new Date(baseMs - 20_000).toISOString(), baseMs)
    ).toBe('Just now');
    expect(
      formatSnapshotAgeLabel(
        new Date(baseMs - 5 * 60_000).toISOString(),
        baseMs
      )
    ).toBe('5m ago');
    expect(
      formatSnapshotAgeLabel(
        new Date(baseMs - 2 * 3600_000).toISOString(),
        baseMs
      )
    ).toBe('2h ago');
    expect(
      formatSnapshotAgeLabel(
        new Date(baseMs - 26 * 3600_000).toISOString(),
        baseMs
      )
    ).toBe('Yesterday');
    expect(
      formatSnapshotAgeLabel(
        new Date(baseMs - 3 * 86400_000).toISOString(),
        baseMs
      )
    ).toBe('3d ago');
  });

  it('restores a captured snapshot JSON faithfully through parseBackupJson and normalizePersistedState', async () => {
    const demo = createDemoState('2026-11-22');
    const snap = await captureAutoSnapshot(demo, 'before_restore');
    expect(snap).not.toBeNull();
    if (!snap) return;

    const parsed = parseBackupJson(snap.json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const restored = normalizePersistedState(
      parsed.data as Partial<PersistedBudgetState>
    );
    expect(restored.settings.monthlyIncome).toBe(demo.settings.monthlyIncome);
    expect(restored.entries).toHaveLength(demo.entries.length);
    expect(restored.envelopes).toHaveLength(demo.envelopes.length);
    expect(restored.treats).toHaveLength(demo.treats.length);
  });
});
