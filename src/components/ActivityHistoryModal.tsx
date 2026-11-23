import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useBudgetActions,
  useDailyBudget,
  useGoals,
  useThemePrefs,
} from '../context/BudgetContext';
import { isEditableEntryType } from '../state/budgetReducer';
import { TransactionEntry, TransactionType } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { formatMonthKeyLabel } from '../utils/insightsEngine';
import {
  formatEntryDateLocal,
  getTransactionPresentation,
} from '../utils/transactionDisplay';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon, IconBadge } from './AppIcon';
import { BaseModal } from './BaseModal';
import { ConfirmModal } from './ConfirmModal';
import { EditTransactionModal } from './EditTransactionModal';

type HistoryFilterKey =
  | 'all'
  | 'spend'
  | 'envelopes'
  | 'bills'
  | 'debts'
  | 'savings'
  | 'wallet';

const HISTORY_FILTERS: Array<{ key: HistoryFilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'spend', label: 'Spends' },
  { key: 'envelopes', label: 'Allowances' },
  { key: 'bills', label: 'Bills' },
  { key: 'debts', label: 'Debts' },
  { key: 'savings', label: 'Savings' },
  { key: 'wallet', label: 'Wallet' },
];

const HistoryRowSeparator: React.FC = () => <View style={{ height: 6 }} />;

function matchesHistoryFilter(
  type: TransactionType,
  filter: HistoryFilterKey
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'spend':
      return type === 'spend';
    case 'envelopes':
      return type === 'envelope_spend' || type === 'envelope_refill';
    case 'bills':
      return type === 'bill_paid' || type === 'installment_paid';
    case 'debts':
      return type === 'debt_outflow' || type === 'debt_inflow';
    case 'savings':
      return (
        type === 'save_direct' ||
        type === 'treat_direct' ||
        type === 'impulse_skipped' ||
        type === 'midnight_split' ||
        type === 'sinking_fund'
      );
    case 'wallet':
      return (
        type === 'wallet_deposit' ||
        type === 'wallet_adjust' ||
        type === 'wallet_transfer'
      );
  }
}

interface ActivityHistoryModalProps {
  visible: boolean;
  initialMonthKey?: string | null;
  onClose: () => void;
}

const ActivityHistoryModalContent: React.FC<ActivityHistoryModalProps> = ({
  visible,
  initialMonthKey = null,
  onClose,
}) => {
  const { shade, privacyMode } = useThemePrefs();
  const { entries } = useDailyBudget();
  const { treats } = useGoals();
  const { undoEntry } = useBudgetActions();

  const [query, setQuery] = useState('');
  const [filterKey, setFilterKey] = useState<HistoryFilterKey>('all');
  const [monthFilter, setMonthFilter] = useState<string | null>(initialMonthKey);
  const [editingEntry, setEditingEntry] = useState<TransactionEntry | null>(
    null
  );
  const [pendingUndoEntry, setPendingUndoEntry] =
    useState<TransactionEntry | null>(null);

  useEffect(() => {
    if (!visible) {
      setEditingEntry(null);
      setPendingUndoEntry(null);
      return;
    }
    setMonthFilter(initialMonthKey || null);
  }, [visible, initialMonthKey]);

  const monthOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const entry of entries) {
      const mk = formatEntryDateLocal(entry).slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(mk)) {
        keys.add(mk);
      }
    }
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!matchesHistoryFilter(entry.type, filterKey)) return false;
      const entryDate = formatEntryDateLocal(entry);
      if (monthFilter && !entryDate.startsWith(monthFilter)) return false;
      if (needle) {
        const haystack = [
          entry.label,
          entry.paymentSourceLabel || '',
          entry.toPaymentSourceLabel || '',
          entryDate,
          entry.category || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [entries, filterKey, monthFilter, query]);

  const renderHistoryItem = useCallback(
    ({ item: entry }: ListRenderItemInfo<TransactionEntry>) => {
      const { deltaText, deltaColor, isTreatHighlight } =
        getTransactionPresentation(entry, shade, privacyMode);
      const dateStr = formatEntryDateLocal(entry);
      const editable =
        isEditableEntryType(entry) &&
        (entry.type !== 'treat_direct' ||
          !entry.treatId ||
          !treats.some((t) => t.id === entry.treatId && t.claimed));
      const sourceMeta =
        entry.type === 'wallet_transfer' &&
        entry.paymentSourceLabel &&
        entry.toPaymentSourceLabel
          ? `${entry.paymentSourceLabel} → ${entry.toPaymentSourceLabel}`
          : entry.paymentSourceLabel || '';
      return (
        <View
          style={[
            styles.rowCard,
            {
              backgroundColor: shade.surface,
              borderColor: isTreatHighlight ? shade.dopamine : shade.border,
            },
          ]}
        >
          <View style={styles.rowContent}>
            <View style={styles.rowTop}>
              <ScalePressable
                disabled={!editable}
                onPress={() => {
                  if (!editable) return;
                  triggerLightHaptic();
                  setEditingEntry(entry);
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <IconBadge
                  name={entry.icon}
                  size={13}
                  color={deltaColor}
                  bg={shade.card}
                  boxSize={30}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.rowLabel, { color: shade.text }]}
                >
                  {entry.label}
                </Text>
              </ScalePressable>
              <ScalePressable
                onPress={() => {
                  const linkedClaimed =
                    (entry.type === 'treat_direct' ||
                      entry.type === 'impulse_skipped' ||
                      entry.type === 'midnight_split') &&
                    Boolean(entry.treatId) &&
                    treats.some((t) => t.id === entry.treatId && t.claimed);
                  if (linkedClaimed) {
                    undoEntry(entry.id);
                    return;
                  }
                  triggerLightHaptic();
                  setPendingUndoEntry(entry);
                }}
                accessibilityLabel={`Undo ${entry.label}`}
                hitSlop={6}
                style={[styles.undoBtn, { backgroundColor: shade.card }]}
              >
                <Text style={[styles.undoText, { color: shade.muted }]}>
                  Undo
                </Text>
              </ScalePressable>
            </View>
            <ScalePressable
              disabled={!editable}
              onPress={() => {
                if (!editable) return;
                triggerLightHaptic();
                setEditingEntry(entry);
              }}
              style={styles.rowBottom}
            >
              <Text
                numberOfLines={1}
                style={[styles.rowSub, { color: shade.muted }]}
              >
                {dateStr}
                {sourceMeta ? ` • ${sourceMeta}` : ''}
              </Text>
              <Text style={[styles.rowDelta, { color: deltaColor }]}>
                {deltaText}
              </Text>
            </ScalePressable>
          </View>
        </View>
      );
    },
    [shade, privacyMode, treats, undoEntry]
  );

  return (
    <>
      <BaseModal
        visible={visible && editingEntry === null && pendingUndoEntry === null}
        onClose={onClose}
        dismissLabel="Dismiss activity history"
        cardStyle={[
          styles.card,
          { backgroundColor: shade.card, borderColor: shade.border },
        ]}
      >
        <View style={styles.headerRow}>
              <View style={styles.titleRow}>
                <IconBadge
                  name="list"
                  size={16}
                  color={shade.accent}
                  bg={shade.surface}
                  boxSize={36}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: shade.text }]}>
                    Activity History
                  </Text>
                  <Text style={[styles.subtitle, { color: shade.muted }]}>
                    {entries.length} total logged{' '}
                    {entries.length === 1 ? 'entry' : 'entries'}
                    {entries.length > 0 ? ' • Tap a log to edit' : ''}
                  </Text>
                </View>
              </View>

            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              accessibilityLabel="Close activity history"
              hitSlop={8}
              style={[styles.closeBtn, { backgroundColor: shade.surface }]}
            >
              <AppIcon name="x" size={16} color={shade.muted} />
            </ScalePressable>
          </View>

          <View
            style={[
              styles.searchBox,
              { backgroundColor: shade.surface, borderColor: shade.border },
            ]}
          >
            <AppIcon name="search" size={14} color={shade.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search note, category, or account..."
              placeholderTextColor={shade.muted}
              style={[styles.searchInput, { color: shade.text }]}
            />
            {query.length > 0 && (
              <ScalePressable
                onPress={() => {
                  setQuery('');
                }}
                accessibilityLabel="Clear search"
                hitSlop={6}
              >
                <AppIcon name="x" size={14} color={shade.muted} />
              </ScalePressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}
          >
            {HISTORY_FILTERS.map((f) => {
              const active = filterKey === f.key;
              return (
                <ScalePressable
                  key={f.key}
                  onPress={() => {
                    triggerLightHaptic();
                    setFilterKey(f.key);
                  }}
                  style={[
                    styles.chipPill,
                    {
                      backgroundColor: active ? shade.accent : shade.surface,
                      borderColor: active ? shade.accent : shade.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? shade.accentText : shade.text },
                    ]}
                  >
                    {f.label}
                  </Text>
                </ScalePressable>
              );
            })}
          </ScrollView>

          {monthOptions.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              style={styles.chipsScroll}
            >
              <ScalePressable
                onPress={() => {
                  triggerLightHaptic();
                  setMonthFilter(null);
                }}
                style={[
                  styles.monthPill,
                  {
                    backgroundColor:
                      monthFilter === null ? shade.dopamineSoft : shade.surface,
                    borderColor:
                      monthFilter === null ? shade.dopamine : shade.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.monthText,
                    {
                      color:
                        monthFilter === null ? shade.dopamine : shade.muted,
                    },
                  ]}
                >
                  All Months
                </Text>
              </ScalePressable>

              {monthOptions.map((mk) => {
                const active = monthFilter === mk;
                return (
                  <ScalePressable
                    key={mk}
                    onPress={() => {
                      triggerLightHaptic();
                      setMonthFilter(mk);
                    }}
                    style={[
                      styles.monthPill,
                      {
                        backgroundColor: active
                          ? shade.dopamineSoft
                          : shade.surface,
                        borderColor: active ? shade.dopamine : shade.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthText,
                        { color: active ? shade.dopamine : shade.muted },
                      ]}
                    >
                      {formatMonthKeyLabel(mk)}
                    </Text>
                  </ScalePressable>
                );
              })}
            </ScrollView>
          )}

          <Text style={[styles.countMeta, { color: shade.muted }]}>
            Showing {filteredEntries.length} matching{' '}
            {filteredEntries.length === 1 ? 'log' : 'logs'}
          </Text>

          <FlatList<TransactionEntry>
            data={filteredEntries}
            keyExtractor={(item) => item.id}
            renderItem={renderHistoryItem}
            ItemSeparatorComponent={HistoryRowSeparator}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listBody}
            style={styles.listScroll}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={7}
            ListEmptyComponent={
              <View
                style={[
                  styles.emptyBox,
                  { backgroundColor: shade.surface, borderColor: shade.border },
                ]}
              >
                <Text style={[styles.emptyText, { color: shade.muted }]}>
                  No logs match your current search or filters.
                </Text>
              </View>
            }
          />
      </BaseModal>

      <EditTransactionModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
      />

      <ConfirmModal
        visible={pendingUndoEntry !== null}
        title="Delete & Undo Entry?"
        message={
          pendingUndoEntry
            ? `Remove "${pendingUndoEntry.label}" (${
                getTransactionPresentation(pendingUndoEntry, shade, privacyMode)
                  .deltaText
              }) and reverse its balance changes?`
            : ''
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Keep"
        destructive
        icon="rotate-ccw"
        onCancel={() => setPendingUndoEntry(null)}
        onConfirm={() => {
          if (pendingUndoEntry) {
            undoEntry(pendingUndoEntry.id);
          }
          setPendingUndoEntry(null);
        }}
      />
    </>
  );
};

/**
 * Full searchable & filterable transaction history modal with virtualized
 * rendering and 1-tap Undo for every entry.
 */
export const ActivityHistoryModal: React.FC<ActivityHistoryModalProps> = (
  props
) => {
  if (!props.visible) return null;
  return <ActivityHistoryModalContent {...props} />;
};

const styles = StyleSheet.create({
  card: {
    gap: 10,
    maxHeight: '88%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    paddingVertical: 0,
  },
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 34,
  },
  chipsRow: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  chipPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  monthPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
  },
  monthText: {
    fontSize: 10,
    fontWeight: '800',
  },
  countMeta: {
    fontSize: 11,
    fontWeight: '700',
  },
  listScroll: {
    flexShrink: 1,
    minHeight: 160,
  },
  listBody: {
    paddingBottom: 6,
  },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  rowCard: {
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
  },
  rowSub: {
    fontSize: 10,
    flexShrink: 1,
  },
  rowDelta: {
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 0,
  },
  undoBtn: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  undoText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
