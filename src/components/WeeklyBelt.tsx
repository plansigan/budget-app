import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  getTodayKey,
  useBudgetActions,
  useDailyBudget,
  useThemePrefs,
} from '../context/BudgetContext';
import { parseDateKeyLocal } from '../state/budgetMath';
import { triggerLightHaptic } from '../utils/haptics';
import { FadeSlideIn, ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';

const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const JS_DAY_TO_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MIN_WEEK_OFFSET = -8;

interface WeekDayItem {
  dateKey: string;
  shortDay: string;
  dayNum: number;
  fullLabel: string;
  isToday: boolean;
  isFuture: boolean;
}

function formatDateKeyLabel(dateKey: string): string {
  const dt = parseDateKeyLocal(dateKey);
  const shortDay = JS_DAY_TO_SHORT[dt.getDay()] || 'Day';
  return `${shortDay}, ${MONTH_NAMES[dt.getMonth()]} ${dt.getDate()}`;
}

function buildWeekWindow(
  anchorDateKey: string,
  weekOffset: number
): { days: WeekDayItem[]; rangeLabel: string } {
  const todayMidnight = parseDateKeyLocal(anchorDateKey);
  const todayKey = getTodayKey(todayMidnight);
  const dayOfWeek = todayMidnight.getDay(); // 0=Sun, 1=Mon
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(todayMidnight);
  monday.setDate(todayMidnight.getDate() + diffToMonday + weekOffset * 7);

  const days = SHORT_DAYS.map((shortDay, index) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + index);
    const dateKey = getTodayKey(dt);
    const isToday = dateKey === todayKey;
    const isFuture = dt.getTime() > todayMidnight.getTime();
    const fullLabel = `${shortDay}, ${MONTH_NAMES[dt.getMonth()]} ${dt.getDate()}`;
    return {
      dateKey,
      shortDay,
      dayNum: dt.getDate(),
      fullLabel,
      isToday,
      isFuture,
    };
  });

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const startMonth = MONTH_NAMES[monday.getMonth()];
  const endMonth = MONTH_NAMES[sunday.getMonth()];
  const rangeLabel =
    startMonth === endMonth
      ? `${startMonth} ${monday.getDate()} – ${sunday.getDate()}`
      : `${startMonth} ${monday.getDate()} – ${endMonth} ${sunday.getDate()}`;

  return { days, rangeLabel };
}

/**
 * Top Mon-Sun weekly belt showing today's day and letting the user step backward
 * across recent weeks to inspect past performance or log forgotten expenses.
 */
export const WeeklyBelt: React.FC = React.memo(() => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { todayKey, selectedDateKey, getDaySummary } = useDailyBudget();
  const { setSelectedDateKey } = useBudgetActions();

  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    setWeekOffset(0);
  }, [todayKey]);

  const { days: weekDays, rangeLabel } = useMemo(
    () => buildWeekWindow(todayKey, weekOffset),
    [todayKey, weekOffset]
  );
  const selectedDayLabel = useMemo(
    () => formatDateKeyLabel(selectedDateKey),
    [selectedDateKey]
  );
  const selectedSummary = useMemo(
    () => getDaySummary(selectedDateKey),
    [getDaySummary, selectedDateKey]
  );

  const weekHeaderLabel =
    weekOffset === 0
      ? `This Week • ${rangeLabel}`
      : weekOffset === -1
      ? `Last Week • ${rangeLabel}`
      : rangeLabel;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.beltCard,
          { backgroundColor: shade.card, borderColor: shade.border },
        ]}
      >
        <View style={styles.weekNavRow}>
          <ScalePressable
            disabled={weekOffset <= MIN_WEEK_OFFSET}
            onPress={() => {
              triggerLightHaptic();
              setWeekOffset((prev) => Math.max(MIN_WEEK_OFFSET, prev - 1));
            }}
            accessibilityLabel="Previous week"
            hitSlop={6}
            style={[
              styles.weekArrowBtn,
              {
                backgroundColor: shade.surface,
                opacity: weekOffset <= MIN_WEEK_OFFSET ? 0.35 : 1,
              },
            ]}
          >
            <AppIcon name="chevron-left" size={14} color={shade.text} />
          </ScalePressable>

          <Text style={[styles.weekHeaderTitle, { color: shade.muted }]}>
            {weekHeaderLabel}
          </Text>

          <ScalePressable
            disabled={weekOffset >= 0}
            onPress={() => {
              triggerLightHaptic();
              setWeekOffset((prev) => Math.min(0, prev + 1));
            }}
            accessibilityLabel="Next week"
            hitSlop={6}
            style={[
              styles.weekArrowBtn,
              {
                backgroundColor: shade.surface,
                opacity: weekOffset >= 0 ? 0.35 : 1,
              },
            ]}
          >
            <AppIcon name="chevron-right" size={14} color={shade.text} />
          </ScalePressable>
        </View>

        <View style={styles.daysRow}>
          {weekDays.map((item) => {
            const isSelected = item.dateKey === selectedDateKey;
            const summary = getDaySummary(item.dateKey);

            let dotColor = shade.border;
            if (summary.safeRemaining < 0) {
              dotColor = shade.warning;
            } else if (summary.savedOrSkipped > 0) {
              dotColor = shade.dopamine;
            } else if (summary.entriesCount > 0) {
              dotColor = shade.positive;
            }

            return (
              <ScalePressable
                key={item.dateKey}
                disabled={item.isFuture}
                onPress={() => setSelectedDateKey(item.dateKey)}
                accessibilityRole="button"
                accessibilityLabel={item.fullLabel}
                accessibilityState={{
                  selected: isSelected,
                  disabled: item.isFuture,
                }}
                scaleTo={0.92}
                style={[
                  styles.dayPill,
                  {
                    backgroundColor: isSelected
                      ? shade.accent
                      : item.isToday
                      ? shade.surface
                      : 'transparent',
                    borderColor:
                      item.isToday && !isSelected
                        ? shade.accent
                        : 'transparent',
                    borderWidth: item.isToday && !isSelected ? 1 : 0,
                    opacity: item.isFuture ? 0.4 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayShort,
                    { color: isSelected ? shade.accentText : shade.muted },
                  ]}
                >
                  {item.shortDay}
                </Text>
                <Text
                  style={[
                    styles.dayNum,
                    { color: isSelected ? shade.accentText : shade.text },
                  ]}
                >
                  {item.dayNum}
                </Text>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isSelected ? shade.accentText : dotColor,
                    },
                  ]}
                />
              </ScalePressable>
            );
          })}
        </View>
      </View>

      {selectedDateKey !== todayKey && (
        <FadeSlideIn triggerKey={selectedDateKey} distance={8}>
          <View
            style={[
              styles.pastBanner,
              { backgroundColor: shade.surface, borderColor: shade.accent },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.pastTitleRow}>
                <AppIcon name="calendar" size={12} color={shade.accent} />
                <Text style={[styles.pastTitle, { color: shade.text }]}>
                  Viewing {selectedDayLabel}
                </Text>
              </View>
              <Text style={[styles.pastStats, { color: shade.muted }]}>
                Spent {formatVisiblePeso(selectedSummary.spent)} • Safe left{' '}
                {formatVisiblePeso(Math.max(0, selectedSummary.safeRemaining))}
              </Text>
            </View>
            <ScalePressable
              onPress={() => {
                setSelectedDateKey(todayKey);
                setWeekOffset(0);
              }}
              style={[styles.backTodayPill, { backgroundColor: shade.accent }]}
            >
              <Text
                style={[styles.backTodayText, { color: shade.accentText }]}
              >
                Today ›
              </Text>
            </ScalePressable>
          </View>
        </FadeSlideIn>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  beltCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  weekArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 12,
    alignItems: 'center',
    gap: 2,
  },
  dayShort: {
    fontSize: 10,
    fontWeight: '700',
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 1,
  },
  pastBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pastTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pastTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  pastStats: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
  backTodayPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  backTodayText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
