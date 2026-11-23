import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDailyBudget, useThemePrefs } from '../context/BudgetContext';
import { triggerLightHaptic } from '../utils/haptics';
import {
  SpendingBreakdownScope,
  computeSpendingBreakdown,
} from '../utils/insightsEngine';
import { formatPesoDisplay } from '../utils/numberFormat';
import {
  AnimatedProgressBar,
  FadeSlideIn,
  ScalePressable,
} from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';

const SCOPE_OPTIONS: Array<{ key: SpendingBreakdownScope; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'daily', label: 'Daily' },
  { key: 'envelopes', label: 'Allowances' },
];

interface SpendingBreakdownCardProps {
  monthKey?: string;
  monthLabel?: string;
}

/**
 * Clean minimalist category spending breakdown card with This Week / This Month
 * and All / Daily / Allowances toggles (or locked historical month view when `monthKey` is provided).
 */
export const SpendingBreakdownCard: React.FC<SpendingBreakdownCardProps> = React.memo(({
  monthKey,
  monthLabel,
}) => {
  const { shade, privacyMode } = useThemePrefs();
  const { entries } = useDailyBudget();
  const [range, setRange] = useState<'week' | 'month'>('month');
  const [scope, setScope] = useState<SpendingBreakdownScope>('all');

  const isHistorical = Boolean(monthKey);

  const breakdown = useMemo(
    () =>
      computeSpendingBreakdown(
        entries,
        isHistorical ? 'month' : range,
        undefined,
        monthKey,
        scope
      ),
    [entries, isHistorical, range, monthKey, scope]
  );

  const mask = (amt: number) => formatPesoDisplay(amt, privacyMode);

  const emptyLabel = isHistorical
    ? scope === 'daily'
      ? 'No daily budget spends logged for this archived month.'
      : scope === 'envelopes'
      ? 'No allowance spends logged for this archived month.'
      : 'No itemized spend logs stored for this archived month—see full totals in the Monthly Report Card above.'
    : scope === 'daily'
    ? `No daily budget spends logged this ${range === 'week' ? 'week' : 'month'} yet.`
    : scope === 'envelopes'
    ? `No allowance spends logged this ${range === 'week' ? 'week' : 'month'} yet.`
    : `No spends logged this ${range === 'week' ? 'week' : 'month'} yet.`;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: shade.card, borderColor: shade.border },
      ]}
    >
      <View style={styles.topRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.kicker, { color: shade.muted }]}>
            SPENDING BREAKDOWN
          </Text>
          <Text style={[styles.totalVal, { color: shade.text }]}>
            {mask(breakdown.totalSpent)}{' '}
            <Text style={[styles.totalUnit, { color: shade.muted }]}>
              across {breakdown.count}{' '}
              {breakdown.count === 1 ? 'spend' : 'spends'}
            </Text>
          </Text>
        </View>

        {isHistorical ? (
          <View style={[styles.historyPill, { backgroundColor: shade.surface }]}>
            <Text style={[styles.segText, { color: shade.text }]}>
              {monthLabel || monthKey}
            </Text>
          </View>
        ) : (
          <View style={[styles.segWrap, { backgroundColor: shade.surface }]}>
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setRange('week');
              }}
              style={[
                styles.segBtn,
                range === 'week' && { backgroundColor: shade.card },
              ]}
            >
              <Text
                style={[
                  styles.segText,
                  { color: range === 'week' ? shade.text : shade.muted },
                ]}
              >
                Week
              </Text>
            </ScalePressable>

            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                setRange('month');
              }}
              style={[
                styles.segBtn,
                range === 'month' && { backgroundColor: shade.card },
              ]}
            >
              <Text
                style={[
                  styles.segText,
                  { color: range === 'month' ? shade.text : shade.muted },
                ]}
              >
                Month
              </Text>
            </ScalePressable>
          </View>
        )}
      </View>

      <View style={[styles.scopeWrap, { backgroundColor: shade.surface }]}>
        {SCOPE_OPTIONS.map((opt) => {
          const active = scope === opt.key;
          return (
            <ScalePressable
              key={opt.key}
              onPress={() => {
                triggerLightHaptic();
                setScope(opt.key);
              }}
              style={[
                styles.scopeBtn,
                active && { backgroundColor: shade.card },
              ]}
            >
              <Text
                style={[
                  styles.scopeText,
                  { color: active ? shade.text : shade.muted },
                ]}
              >
                {opt.label}
              </Text>
            </ScalePressable>
          );
        })}
      </View>

      <FadeSlideIn triggerKey={`${monthKey || range}-${scope}`} distance={8}>
        {breakdown.slices.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: shade.surface }]}>
            <Text style={[styles.emptyText, { color: shade.muted }]}>
              {emptyLabel}
            </Text>
          </View>
        ) : (
          <View style={styles.barsList}>
            {breakdown.slices.map((slice, idx) => {
              const barColor =
                idx === 0
                  ? shade.accent
                  : idx === 1
                  ? shade.dopamine
                  : shade.positive;
              return (
                <View key={slice.key} style={styles.sliceRow}>
                  <View style={styles.sliceHeader}>
                    <View style={styles.sliceLeft}>
                      <AppIcon name={slice.icon} size={13} color={barColor} />
                      <Text
                        numberOfLines={1}
                        style={[styles.sliceLabel, { color: shade.text }]}
                      >
                        {slice.label}
                      </Text>
                    </View>
                    <Text style={[styles.sliceAmt, { color: shade.text }]}>
                      {mask(slice.amount)}{' '}
                      <Text style={{ color: shade.muted, fontWeight: '600' }}>
                        ({slice.pct}%)
                      </Text>
                    </Text>
                  </View>
                  <AnimatedProgressBar
                    percentage={slice.pct}
                    trackColor={shade.surface}
                    fillColor={barColor}
                    height={7}
                  />
                </View>
              );
            })}

            {breakdown.topSlice && (
              <View
                style={[styles.insightBar, { backgroundColor: shade.surface }]}
              >
                <AppIcon name="trending-up" size={13} color={shade.muted} />
                <Text style={[styles.insightText, { color: shade.muted }]}>
                  Top category: {breakdown.topSlice.label} (
                  {breakdown.topSlice.pct}% of spending)
                </Text>
              </View>
            )}
          </View>
        )}
      </FadeSlideIn>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: '#111318',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  topRow: {
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
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  totalUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  segWrap: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  segText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scopeWrap: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: 'center',
  },
  scopeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  historyPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  emptyBox: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  barsList: {
    gap: 10,
  },
  sliceRow: {
    gap: 5,
  },
  sliceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sliceLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sliceLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  sliceAmt: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  insightBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 11,
    padding: 10,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
});
