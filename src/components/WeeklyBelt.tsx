import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import {
  getTodayKey,
  useBudgetActions,
  useDailyBudget,
  useThemePrefs,
} from '../context/BudgetContext';
import { parseDateKeyLocal } from '../state/budgetMath';
import { getCardShadow } from '../theme/tokens';
import { triggerLightHaptic } from '../utils/haptics';
import {
  FadeSlideIn,
  PillLayout,
  ScalePressable,
  SlidingIndicator,
} from './AnimatedPrimitives';
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
  const dayOfWeek = todayMidnight.getDay();
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
 * Airy Mon-Sun weekly belt with a spring-sliding active day pill and week paging.
 */
export const WeeklyBelt: React.FC = React.memo(() => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { todayKey, selectedDateKey, getDaySummary } = useDailyBudget();
  const { setSelectedDateKey } = useBudgetActions();

  const [weekOffset, setWeekOffset] = useState(0);
  const [weekDirection, setWeekDirection] = useState<'left' | 'right'>('right');
  const [dayLayouts, setDayLayouts] = useState<Record<string, PillLayout>>({});

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

  const handleDayLayout = useCallback(
    (dateKey: string) => (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      setDayLayouts((prev) => {
        const existing = prev[dateKey];
        if (
          existing &&
          Math.abs(existing.x - x) < 0.5 &&
          Math.abs(existing.width - width) < 0.5
        ) {
          return prev;
        }
        return { ...prev, [dateKey]: { x, width } };
      });
    },
    []
  );

  const selectedInCurrentWeek = weekDays.some(
    (d) => d.dateKey === selectedDateKey
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.beltCard,
          getCardShadow(shade),
          { backgroundColor: shade.card, borderColor: shade.border },
        ]}
      >
        <View style={styles.weekNavRow}>
          <ScalePressable
            disabled={weekOffset <= MIN_WEEK_OFFSET}
            onPress={() => {
              triggerLightHaptic();
              setWeekDirection('left');
              setWeekOffset((prev) => Math.max(MIN_WEEK_OFFSET, prev - 1));
            }}
            accessibilityLabel="Previous week"
            hitSlop={8}
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
              setWeekDirection('right');
              setWeekOffset((prev) => Math.min(0, prev + 1));
            }}
            accessibilityLabel="Next week"
            hitSlop={8}
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

        <FadeSlideIn
          triggerKey={weekOffset}
          direction={weekDirection}
          distance={14}
        >
          <View style={styles.daysRow}>
            {selectedInCurrentWeek && (
              <SlidingIndicator
                activeLayout={dayLayouts[selectedDateKey]}
                style={[
                  styles.activeDayPill,
                  { backgroundColor: shade.accent },
                ]}
              />
            )}
            {weekDays.map((item) => {
              const isSelected = item.dateKey === selectedDateKey;
              const summary = getDaySummary(item.dateKey);

              let dotColor = shade.border;
              let selectedDotColor = shade.accentText;
              if (summary.safeRemaining < 0) {
                dotColor = shade.warning;
                selectedDotColor = shade.dark
                  ? shade.warning
                  : shade.heroWarning;
              } else if (summary.savedOrSkipped > 0) {
                dotColor = shade.dopamine;
                selectedDotColor = shade.dark
                  ? shade.dopamine
                  : shade.heroDopamine;
              } else if (summary.entriesCount > 0) {
                dotColor = shade.positive;
                selectedDotColor = shade.dark
                  ? shade.positive
                  : shade.heroPositive;
              }

              return (
                <View
                  key={item.dateKey}
                  onLayout={handleDayLayout(item.dateKey)}
                  style={styles.daySlot}
                >
                  <ScalePressable
                    disabled={item.isFuture}
                    onPress={() => setSelectedDateKey(item.dateKey)}
                    accessibilityRole="button"
                    accessibilityLabel={item.fullLabel}
                    accessibilityState={{
                      selected: isSelected,
                      disabled: item.isFuture,
                    }}
                    hitSlop={{ top: 8, bottom: 8 }}
                    scaleTo={0.92}
                    style={[
                      styles.dayPill,
                      {
                        backgroundColor:
                          item.isToday && !isSelected
                            ? shade.surface
                            : 'transparent',
                        opacity: item.isFuture ? 0.38 : 1,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.dayShort,
                        { color: isSelected ? shade.accentText : shade.muted },
                      ]}
                    >
                      {item.shortDay}
                    </Text>
                    <Text
                      numberOfLines={1}
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
                          backgroundColor: isSelected
                            ? selectedDotColor
                            : dotColor,
                        },
                      ]}
                    />
                  </ScalePressable>
                </View>
              );
            })}
          </View>
        </FadeSlideIn>
      </View>

      {selectedDateKey !== todayKey && (
        <FadeSlideIn triggerKey={selectedDateKey} distance={8} withScale>
          <View
            style={[
              styles.pastBanner,
              { backgroundColor: shade.surface, borderColor: shade.border },
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
                {formatVisiblePeso(selectedSummary.safeRemaining)}
              </Text>
            </View>
            <ScalePressable
              onPress={() => {
                setSelectedDateKey(todayKey);
                setWeekOffset(0);
              }}
              accessibilityRole="button"
              accessibilityLabel="Jump back to Today"
              hitSlop={8}
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
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
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
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 4,
    position: 'relative',
  },
  activeDayPill: {
    top: 0,
    bottom: 0,
    borderRadius: 14,
  },
  daySlot: {
    flex: 1,
  },
  dayPill: {
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    gap: 2,
  },
  dayShort: {
    fontSize: 10,
    fontWeight: '600',
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 1,
  },
  pastBanner: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pastTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pastTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  pastStats: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
  backTodayPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  backTodayText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
