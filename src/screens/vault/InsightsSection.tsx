import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityHistoryModal } from '../../components/ActivityHistoryModal';
import {
  AnimatedProgressBar,
  FadeSlideIn,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../../components/AppIcon';
import { SpendingBreakdownCard } from '../../components/SpendingBreakdownCard';
import { useBudget } from '../../context/BudgetContext';
import { MonthlyArchiveSnapshot } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { formatMonthKeyLabel } from '../../utils/insightsEngine';
import { ALL_MILESTONES, computeBudgetHealth } from '../../utils/savingsCoach';
import {
  formatEntryDateLocal,
  getTransactionPresentation,
} from '../../utils/transactionDisplay';

interface InsightsSectionProps {
  onOpenWrap: (archive?: MonthlyArchiveSnapshot | null) => void;
}

export const InsightsSection: React.FC<InsightsSectionProps> = ({
  onOpenWrap,
}) => {
  const {
    shade,
    privacyMode,
    formatVisiblePeso,
    settings,
    cashOnHand,
    banks,
    monthlySaved,
    monthlyArchives,
    entries,
    unlockedMilestones,
    undoEntry,
  } = useBudget();

  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [showAllActivity, setShowAllActivity] = useState(false);

  const sortedArchives = useMemo(
    () =>
      [...monthlyArchives].sort((a, b) =>
        b.monthKey.localeCompare(a.monthKey)
      ),
    [monthlyArchives]
  );

  const selectedArchive = useMemo(
    () => sortedArchives.find((a) => a.monthKey === selectedMonthKey) || null,
    [sortedArchives, selectedMonthKey]
  );

  const lastArchive = sortedArchives[0] || null;

  const displayedEntries = useMemo(() => {
    if (selectedArchive) {
      return entries.filter((e) =>
        formatEntryDateLocal(e).startsWith(selectedArchive.monthKey)
      );
    }
    return entries.slice(0, 20);
  }, [entries, selectedArchive]);

  const health = computeBudgetHealth(settings);
  const liquidTotal =
    Math.max(0, cashOnHand) +
    banks.reduce((sum, b) => sum + Math.max(0, b.balance), 0);
  const emergencyPct =
    health.emergencyTarget3Mo > 0
      ? Math.min(
          100,
          Math.round(
            (liquidTotal / Math.max(1, health.emergencyTarget3Mo)) * 100
          )
        )
      : 0;

  const milestoneRows = useMemo(() => {
    const rows: (typeof ALL_MILESTONES)[] = [];
    for (let i = 0; i < ALL_MILESTONES.length; i += 2) {
      rows.push(ALL_MILESTONES.slice(i, i + 2));
    }
    return rows;
  }, []);

  return (
    <FadeSlideIn triggerKey="insights-tab" distance={10} style={{ gap: 10 }}>
      {sortedArchives.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthStrip}
        >
          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              setSelectedMonthKey(null);
            }}
            style={[
              styles.monthChip,
              {
                backgroundColor:
                  selectedArchive === null ? shade.accent : shade.card,
                borderColor:
                  selectedArchive === null ? shade.accent : shade.border,
              },
            ]}
          >
            <Text
              style={[
                styles.monthChipText,
                {
                  color:
                    selectedArchive === null ? shade.accentText : shade.text,
                },
              ]}
            >
              This Month
            </Text>
          </ScalePressable>

          {sortedArchives.map((arch) => {
            const active = selectedArchive?.monthKey === arch.monthKey;
            return (
              <ScalePressable
                key={arch.monthKey}
                onPress={() => {
                  triggerLightHaptic();
                  setSelectedMonthKey(arch.monthKey);
                }}
                style={[
                  styles.monthChip,
                  {
                    backgroundColor: active ? shade.accent : shade.card,
                    borderColor: active ? shade.accent : shade.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    { color: active ? shade.accentText : shade.text },
                  ]}
                >
                  {formatMonthKeyLabel(arch.monthKey)}
                </Text>
                <View
                  style={[
                    styles.monthGradeBadge,
                    {
                      backgroundColor: active
                        ? shade.positive
                        : shade.positiveSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.monthGradeText,
                      { color: active ? '#FFFFFF' : shade.positive },
                    ]}
                  >
                    {arch.grade}
                  </Text>
                </View>
              </ScalePressable>
            );
          })}
        </ScrollView>
      )}

      <ScalePressable
        onPress={() => {
          triggerLightHaptic();
          onOpenWrap(selectedArchive);
        }}
        style={[
          styles.wrapTriggerCard,
          {
            backgroundColor: shade.heroBg,
            borderColor: shade.heroBorder,
          },
        ]}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.kicker, { color: '#4ADE80' }]}>
            {selectedArchive
              ? selectedArchive.monthTitle
              : 'MONTHLY REPORT CARD'}
          </Text>
          <Text style={[styles.wrapTriggerTitle, { color: shade.heroText }]}>
            {selectedArchive
              ? `Grade ${selectedArchive.grade} • ${selectedArchive.savingsRatePct}% Saved`
              : 'View Your Monthly Wrap-Up'}
          </Text>
          {selectedArchive ? (
            <View style={styles.archivePillsRow}>
              <View
                style={[
                  styles.archiveStatPill,
                  { backgroundColor: shade.heroSurface },
                ]}
              >
                <Text style={[styles.archiveStatText, { color: '#4ADE80' }]}>
                  Saved {formatVisiblePeso(selectedArchive.totalSaved)}
                </Text>
              </View>
              <View
                style={[
                  styles.archiveStatPill,
                  { backgroundColor: shade.heroSurface },
                ]}
              >
                <Text style={[styles.archiveStatText, { color: shade.heroText }]}>
                  Spent {formatVisiblePeso(selectedArchive.totalSpent)}
                </Text>
              </View>
            </View>
          ) : lastArchive ? (
            <Text style={[styles.microSub, { color: shade.heroMuted }]}>
              vs {formatMonthKeyLabel(lastArchive.monthKey)} ({lastArchive.grade}):{' '}
              {formatVisiblePeso(monthlySaved)} vs{' '}
              {formatVisiblePeso(lastArchive.totalSaved)} saved ›
            </Text>
          ) : (
            <Text style={[styles.microSub, { color: shade.heroMuted }]}>
              Completed months archive automatically at month-end ›
            </Text>
          )}
        </View>
        <IconBadge
          name="award"
          size={22}
          color="#4ADE80"
          bg={shade.heroSurface}
          boxSize={46}
        />
      </ScalePressable>

      <SpendingBreakdownCard
        monthKey={selectedArchive?.monthKey}
        monthLabel={
          selectedArchive
            ? formatMonthKeyLabel(selectedArchive.monthKey)
            : undefined
        }
      />

      <Text
        style={[
          styles.sectionTitle,
          { color: shade.muted, marginTop: 6, marginBottom: 2 },
        ]}
      >
        SAVING HEALTH & MILESTONES ({unlockedMilestones.length}/
        {ALL_MILESTONES.length})
      </Text>

      <View
        style={[
          styles.healthCard,
          { backgroundColor: shade.card, borderColor: shade.border },
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={[styles.healthTitle, { color: shade.text }]}>
            Your Monthly Split
          </Text>
          <Text style={[styles.microSub, { color: shade.muted }]}>
            Goal: 50% bills / 20% save
          </Text>
        </View>

        <View style={[styles.splitBar, { backgroundColor: shade.surface }]}>
          <View
            style={[
              styles.splitSeg,
              {
                width: `${health.billsPct}%`,
                backgroundColor: shade.muted,
              },
            ]}
          />
          <View
            style={[
              styles.splitSeg,
              {
                width: `${health.savingsPct}%`,
                backgroundColor: shade.positive,
              },
            ]}
          />
          <View
            style={[
              styles.splitSeg,
              {
                width: `${health.dailyPct}%`,
                backgroundColor: shade.dopamine,
              },
            ]}
          />
        </View>

        <View style={styles.splitLegendRow}>
          <Text style={[styles.legendItem, { color: shade.muted }]}>
            Bills {health.billsPct}%
          </Text>
          <Text style={[styles.legendItem, { color: shade.positive }]}>
            Save {health.savingsPct}%
          </Text>
          <Text style={[styles.legendItem, { color: shade.dopamine }]}>
            Daily {health.dailyPct}%
          </Text>
        </View>

        <View style={[styles.efDivider, { backgroundColor: shade.border }]} />

        <View style={styles.rowBetween}>
          <View style={styles.inlineRow}>
            <AppIcon name="shield" size={14} color={shade.positive} />
            <Text style={[styles.healthTitle, { color: shade.text }]}>
              3-Month Safety Fund
            </Text>
          </View>
          <Text style={[styles.treatRowMeta, { color: shade.positive }]}>
            {emergencyPct}%
          </Text>
        </View>
        <Text style={[styles.microSub, { color: shade.muted }]}>
          {formatVisiblePeso(liquidTotal)} Cash & Banks /{' '}
          {formatVisiblePeso(health.emergencyTarget3Mo)} target
        </Text>
        <AnimatedProgressBar
          percentage={emergencyPct}
          trackColor={shade.surface}
          fillColor={shade.positive}
          height={7}
        />
      </View>

      <View style={styles.milestoneGrid}>
        {milestoneRows.map((row, rowIdx) => (
          <View key={`ms-row-${rowIdx}`} style={styles.milestoneRow}>
            {row.map((m) => {
              const earned = unlockedMilestones.includes(m.id);
              return (
                <View
                  key={m.id}
                  style={[
                    styles.milestoneCard,
                    {
                      backgroundColor: earned ? shade.card : shade.surface,
                      borderColor: earned ? shade.positive : shade.border,
                      opacity: earned ? 1 : 0.72,
                    },
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <IconBadge
                      name={m.icon}
                      size={15}
                      color={earned ? shade.positive : shade.muted}
                      bg={earned ? shade.positiveSoft : shade.card}
                      boxSize={30}
                    />
                    <Text
                      style={[
                        styles.milestoneState,
                        { color: earned ? shade.positive : shade.muted },
                      ]}
                    >
                      {earned ? 'Earned' : 'Locked'}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.milestoneBadge, { color: shade.text }]}
                  >
                    {m.badge}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[styles.milestoneHint, { color: shade.muted }]}
                  >
                    {earned ? m.title : m.unlockHint}
                  </Text>
                </View>
              );
            })}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}
      </View>

      <View
        style={[
          styles.rowBetween,
          { marginTop: 8, marginBottom: 2 },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: shade.muted }]}>
          {selectedArchive
            ? `${formatMonthKeyLabel(selectedArchive.monthKey).toUpperCase()} ACTIVITY`
            : 'RECENT ACTIVITY'}
        </Text>
        <View style={styles.inlineRow}>
          {entries.length > 0 && (
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setShowAllActivity(true);
              }}
              style={[
                styles.backToNowChip,
                { backgroundColor: shade.card, borderWidth: 1, borderColor: shade.border },
              ]}
            >
              <Text style={[styles.backToNowText, { color: shade.text }]}>
                Search / All ({entries.length})
              </Text>
            </ScalePressable>
          )}
          {selectedArchive && (
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setSelectedMonthKey(null);
              }}
              style={[styles.backToNowChip, { backgroundColor: shade.surface }]}
            >
              <Text style={[styles.backToNowText, { color: shade.accent }]}>
                Back to This Month ›
              </Text>
            </ScalePressable>
          )}
        </View>
      </View>

      <View style={styles.listGap}>
        {displayedEntries.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <Text style={{ color: shade.muted, fontSize: 12 }}>
              {selectedArchive
                ? 'No individual activity logs saved for this archived month.'
                : 'No entries yet. Tap Spend! or + Save to Jar on Today.'}
            </Text>
          </View>
        ) : (
          displayedEntries.map((entry) => {
            const { deltaText, deltaColor, isTreatHighlight } =
              getTransactionPresentation(entry, shade, privacyMode);
            return (
              <View
                key={entry.id}
                style={[
                  styles.feedRow,
                  {
                    backgroundColor: shade.card,
                    borderColor: isTreatHighlight
                      ? shade.dopamine
                      : shade.border,
                  },
                ]}
              >
                <View style={styles.feedLeft}>
                  <IconBadge
                    name={entry.icon}
                    size={14}
                    color={deltaColor}
                    bg={shade.surface}
                    boxSize={32}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={[styles.feedTitle, { color: shade.text }]}
                    >
                      {entry.label}
                    </Text>
                    <Text style={[styles.microSub, { color: shade.muted }]}>
                      {entry.dateKey || ''}
                      {entry.paymentSourceLabel
                        ? ` • ${entry.paymentSourceLabel}`
                        : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.feedRight}>
                  <Text style={[styles.feedDelta, { color: deltaColor }]}>
                    {deltaText}
                  </Text>
                  <ScalePressable
                    onPress={() => undoEntry(entry.id)}
                    accessibilityLabel={`Undo ${entry.label}`}
                    hitSlop={6}
                    style={[styles.undoBtn, { backgroundColor: shade.surface }]}
                  >
                    <Text style={[styles.undoText, { color: shade.muted }]}>
                      Undo
                    </Text>
                  </ScalePressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      <ActivityHistoryModal
        visible={showAllActivity}
        initialMonthKey={selectedArchive?.monthKey ?? null}
        onClose={() => setShowAllActivity(false)}
      />
    </FadeSlideIn>
  );
};

const styles = StyleSheet.create({
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  wrapTriggerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wrapTriggerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  microSub: {
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  healthCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    gap: 9,
    shadowColor: '#111318',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  healthTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  splitBar: {
    height: 9,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  splitSeg: {
    height: '100%',
  },
  splitLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    fontSize: 11,
    fontWeight: '700',
  },
  efDivider: {
    height: 1,
    marginVertical: 2,
  },
  treatRowMeta: {
    fontSize: 11,
    fontWeight: '700',
  },
  milestoneGrid: {
    gap: 8,
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  milestoneCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  milestoneState: {
    fontSize: 10,
    fontWeight: '800',
  },
  milestoneBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  milestoneHint: {
    fontSize: 11,
    lineHeight: 15,
  },
  listGap: {
    gap: 8,
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  feedRow: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  feedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  feedTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  feedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedDelta: {
    fontSize: 13,
    fontWeight: '800',
  },
  undoBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  undoText: {
    fontSize: 10,
    fontWeight: '700',
  },
  monthStrip: {
    flexDirection: 'row',
    gap: 7,
    paddingBottom: 2,
  },
  monthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  monthChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  monthGradeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  monthGradeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  archivePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  archiveStatPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  archiveStatText: {
    fontSize: 11,
    fontWeight: '800',
  },
  backToNowChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  backToNowText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
