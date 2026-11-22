import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { PersistedBudgetState } from './defaults';

export const AUTO_SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;
export const ASYNC_SNAPSHOTS_KEY = '@velvet_budget_auto_snapshots_v1';
export const MAX_ASYNC_SNAPSHOTS = 6;
export const MAX_IDB_SNAPSHOTS = 20;
export const IDB_NAME = 'velvet_budget_recovery_v1';
export const IDB_STORE = 'kv';

export type AutoSnapshotReason = 'auto_interval' | 'before_restore' | 'manual';

export interface AutoBackupSnapshot {
  id: string;
  savedAt: string;
  reason: AutoSnapshotReason;
  entriesCount: number;
  accountsCount: number;
  envelopesCount: number;
  monthlyIncome: number;
  json: string;
}

interface StructuralIdbRequest<T = unknown> {
  result: T;
  onsuccess: ((ev?: unknown) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
}

interface StructuralIdbObjectStore {
  get: (key: string) => StructuralIdbRequest<unknown>;
  put: (value: unknown, key: string) => StructuralIdbRequest<unknown>;
}

interface StructuralIdbTransaction {
  objectStore: (name: string) => StructuralIdbObjectStore;
  oncomplete: ((ev?: unknown) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
}

interface StructuralIdbDatabase {
  objectStoreNames: { contains: (name: string) => boolean };
  createObjectStore: (name: string) => void;
  transaction: (
    storeNames: string,
    mode: 'readonly' | 'readwrite'
  ) => StructuralIdbTransaction;
  close: () => void;
}

interface StructuralOpenDbRequest extends StructuralIdbRequest<StructuralIdbDatabase> {
  onupgradeneeded: ((ev?: unknown) => void) | null;
}

interface StructuralIdbFactory {
  open: (name: string, version?: number) => StructuralOpenDbRequest;
}

function getWebIndexedDb(): StructuralIdbFactory | null {
  if (Platform.OS !== 'web') return null;
  const g = globalThis as unknown as {
    indexedDB?: StructuralIdbFactory;
  };
  if (!g || !g.indexedDB || typeof g.indexedDB.open !== 'function') {
    return null;
  }
  return g.indexedDB;
}

function openRecoveryDb(): Promise<StructuralIdbDatabase | null> {
  const idb = getWebIndexedDb();
  if (!idb) return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const req = idb.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        try {
          const db = req.result;
          if (db && !db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        } catch {
          // Ignore upgrade errors safely
        }
      };
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openRecoveryDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as T | undefined) ?? null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      try {
        db.close();
      } catch {
        // Ignore close failure
      }
      resolve(null);
    }
  });
}

async function idbSet(key: string, value: unknown): Promise<boolean> {
  const db = await openRecoveryDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      try {
        db.close();
      } catch {
        // Ignore close failure
      }
      resolve(false);
    }
  });
}

/**
 * Requests durable browser storage so Safari/iOS is far less likely to evict
 * offline data during storage pressure. Resolves false safely if unsupported.
 */
export async function requestPersistentStorageIfSupported(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  try {
    const g = globalThis as unknown as {
      navigator?: {
        storage?: {
          persist?: () => Promise<boolean>;
          persisted?: () => Promise<boolean>;
        };
      };
    };
    const storageApi = g.navigator?.storage;
    if (!storageApi) return false;
    if (typeof storageApi.persisted === 'function') {
      const already = await storageApi.persisted();
      if (already) return true;
    }
    if (typeof storageApi.persist === 'function') {
      return await storageApi.persist();
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Pure check determining whether a rolling auto-snapshot should be captured now.
 */
export function shouldCaptureAutoSnapshot(
  lastCapturedAtMs: number,
  nowMs: number,
  intervalMs: number = AUTO_SNAPSHOT_INTERVAL_MS
): boolean {
  if (!Number.isFinite(lastCapturedAtMs) || lastCapturedAtMs <= 0) {
    return true;
  }
  return nowMs - lastCapturedAtMs >= intervalMs;
}

/**
 * Formats an ISO timestamp into a concise human-readable relative age label.
 */
export function formatSnapshotAgeLabel(
  isoString?: string,
  nowMs: number = Date.now()
): string {
  if (!isoString) return 'Not yet';
  const parsed = Date.parse(isoString);
  if (Number.isNaN(parsed)) return 'Not yet';
  const diffMs = Math.max(0, nowMs - parsed);
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

/**
 * Mirrors the latest persisted state string into IndexedDB on Web for recovery
 * if localStorage is cleared or corrupted.
 */
export async function mirrorLatestStateToIdb(rawJson: string): Promise<boolean> {
  return idbSet('latest_state', rawJson);
}

/**
 * Reads the IndexedDB backup copy of the latest persisted state on Web.
 */
export async function readLatestStateFromIdb(): Promise<string | null> {
  const val = await idbGet<unknown>('latest_state');
  return typeof val === 'string' && val.length > 0 ? val : null;
}

function normalizeSnapshotArray(raw: unknown): AutoBackupSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is AutoBackupSnapshot =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof (item as AutoBackupSnapshot).id === 'string' &&
            typeof (item as AutoBackupSnapshot).savedAt === 'string' &&
            typeof (item as AutoBackupSnapshot).json === 'string'
        )
    )
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

async function readAsyncSnapshots(): Promise<AutoBackupSnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(ASYNC_SNAPSHOTS_KEY);
    if (!raw) return [];
    return normalizeSnapshotArray(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * Captures a full v6 JSON recovery snapshot into both IndexedDB (up to 20)
 * and AsyncStorage (up to 6).
 */
export async function captureAutoSnapshot(
  state: PersistedBudgetState,
  reason: AutoSnapshotReason = 'auto_interval',
  now: Date = new Date()
): Promise<AutoBackupSnapshot | null> {
  try {
    const savedAt = now.toISOString();
    const json = JSON.stringify(
      {
        version: 6,
        exportedAt: savedAt,
        data: state,
      },
      null,
      2
    );

    const snapshot: AutoBackupSnapshot = {
      id: `snap-${now.getTime()}-${Math.floor(Math.random() * 10000)}`,
      savedAt,
      reason,
      entriesCount: Array.isArray(state.entries) ? state.entries.length : 0,
      accountsCount:
        (Array.isArray(state.banks) ? state.banks.length : 0) +
        (Array.isArray(state.creditCards) ? state.creditCards.length : 0),
      envelopesCount: Array.isArray(state.envelopes) ? state.envelopes.length : 0,
      monthlyIncome:
        typeof state.settings?.monthlyIncome === 'number'
          ? state.settings.monthlyIncome
          : 0,
      json,
    };

    const existingAsync = await readAsyncSnapshots();
    const nextAsync = [snapshot, ...existingAsync].slice(0, MAX_ASYNC_SNAPSHOTS);
    try {
      await AsyncStorage.setItem(ASYNC_SNAPSHOTS_KEY, JSON.stringify(nextAsync));
    } catch {
      // Ignore AsyncStorage cap failure if primary Web IDB still succeeds
    }

    if (getWebIndexedDb()) {
      const existingIdb = normalizeSnapshotArray(await idbGet('snapshots'));
      const nextIdb = [snapshot, ...existingIdb].slice(0, MAX_IDB_SNAPSHOTS);
      await idbSet('snapshots', nextIdb);
    }

    return snapshot;
  } catch {
    return null;
  }
}

/**
 * Lists saved automatic recovery snapshots ordered newest first.
 */
export async function listAutoSnapshots(): Promise<AutoBackupSnapshot[]> {
  if (getWebIndexedDb()) {
    const fromIdb = normalizeSnapshotArray(await idbGet('snapshots'));
    if (fromIdb.length > 0) return fromIdb;
  }
  return readAsyncSnapshots();
}

/**
 * Returns the newest recovery snapshot timestamp and total snapshot count.
 */
export async function getLatestAutoSnapshotMeta(): Promise<{
  savedAt: string;
  count: number;
} | null> {
  const list = await listAutoSnapshots();
  if (list.length === 0) return null;
  return {
    savedAt: list[0].savedAt,
    count: list.length,
  };
}
