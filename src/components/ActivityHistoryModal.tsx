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
  useWallet,
} from '../context/BudgetContext';
import { canEditEntry, getUndoEligibility } from '../state/budgetReducer';
import { TransactionEntry } from '../types/budget';
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
import { ActivityHistoryRow } from './history/ActivityHistoryRow';
import {
  HISTORY_FILTERS,
  HistoryFilterKey,
  filterHistoryEntries,
} from './history/historyFilters';

const HistoryRowSeparator: React.FC = () => <View style={{ height: 6 }} />;

interface ActivityHistoryModalProps {
  visible: boolean;
  initialMonthKey?: string | null;
  onClose: () => void;
}

const ActivityHistoryModalContent: React.FC<
  Omit<ActivityHistoryModalProps, 'visible'>
> = ({ initialMonthKey = null, onClose }) => {
  const { shade, privacyMode } = useThemePrefs();
  const { entries } = useDailyBudget();
  const { treats } = useGoals();
  const { debts } = useWallet();
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
    setMonthFilter(initialMonthKey || null);
  }, [initialMonthKey]);

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

  const filteredEntries = useMemo(
    () => filterHistoryEntries(entries, filterKey, monthFilter, query),
    [entries, filterKey, monthFilter, query]
  );

  const renderHistoryItem = useCallback(
    ({ item: entry }: ListRenderItemInfo<TransactionEntry>) => (
      <ActivityHistoryRow
        entry={entry}
        editable={canEditEntry(entry, treats)}
        undoable={getUndoEligibility(entry, treats, debts).ok}
        shade={shade}
        privacyMode={privacyMode}
        onEdit={setEditingEntry}
        onRequestUndo={setPendingUndoEntry}
      />
    ),
    [shade, privacyMode, treats, debts]
  );

  return (
    <>
      <BaseModal
        visible={editingEntry === null && pendingUndoEntry === null}
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
            <View style={{ flex: 1, minWidth: 0 }}>
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
            accessibilityRole="button"
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
            accessibilityLabel="Search transaction history"
            style={[styles.searchInput, { color: shade.text }]}
          />
          {query.length > 0 && (
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setQuery('');
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
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
                accessibilityRole="tab"
                accessibilityLabel={`Filter by ${f.label}`}
                accessibilityState={{ selected: active }}
                hitSlop={4}
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
              accessibilityRole="tab"
              accessibilityLabel="Show all months"
              accessibilityState={{ selected: monthFilter === null }}
              hitSlop={4}
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
                    color: monthFilter === null ? shade.dopamine : shade.muted,
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
                  accessibilityRole="tab"
                  accessibilityLabel={`Filter to ${formatMonthKeyLabel(mk)}`}
                  accessibilityState={{ selected: active }}
                  hitSlop={4}
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
 * Searchable & filterable transaction history modal with virtualized rendering and gated Undo.
 */
export const ActivityHistoryModal: React.FC<ActivityHistoryModalProps> = ({
  visible,
  initialMonthKey = null,
  onClose,
}) => {
  if (!visible) return null;
  return (
    <ActivityHistoryModalContent
      initialMonthKey={initialMonthKey}
      onClose={onClose}
    />
  );
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
    minWidth: 0,
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
});
