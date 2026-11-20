import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getTodayKey, useBudget } from '../context/BudgetContext';
import { FadeSlideIn, ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';

const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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

interface WeekDayItem {
  dateKey: string;
  shortDay: string;
  dayNum: number;
  fullLabel: string;
  isToday: boolean;
  isFuture: boolean;
}

function buildCurrentWeekDays(anchorDateKey: string): WeekDayItem[] {
  const parts = anchorDateKey.split('-').map(Number);
  const now = new Date();
  const todayMidnight =
    parts.length === 3 && parts.every((n) => Number.isFinite(n))
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = getTodayKey(todayMidnight);
  const dayOfWeek = todayMidnight.getDay(); // 0=Sun, 1=Mon
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(todayMidnight);
  monday.setDate(todayMidnight.getDate() + diffToMonday);

  return SHORT_DAYS.map((shortDay, index) => {
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
}

/**
 * Top Mon-Sun weekly belt showing today's day and letting the user click
 * any day to inspect performance and log forgotten expenses onto that day.
 */
export const WeeklyBelt: React.FC = () => {
  const {
    shade,
    todayKey,
    selectedDateKey,
    setSelectedDateKey,
    getDaySummary,
    formatVisiblePeso,
  } = useBudget();

  const weekDays = useMemo(() => buildCurrentWeekDays(todayKey), [todayKey]);
  const selectedDayMeta = weekDays.find((d) => d.dateKey === selectedDateKey);
  const selectedSummary = getDaySummary(selectedDateKey);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.beltCard,
          { backgroundColor: shade.card, borderColor: shade.border },
        ]}
      >
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

      {selectedDateKey !== todayKey && selectedDayMeta && (
        <FadeSlideIn triggerKey={selectedDateKey} distance={8}>
          <View
            style={[
              styles.pastBanner,
              { backgroundColor: shade.surface, borderColor: shade.accent },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.pastTitleRow}>
                <AppIcon name="calendar" size={12} color={shade.accent} />
                <Text style={[styles.pastTitle, { color: shade.text }]}>
                  Viewing {selectedDayMeta.fullLabel}
                </Text>
              </View>
              <Text style={[styles.pastStats, { color: shade.muted }]}>
                Spent {formatVisiblePeso(selectedSummary.spent)} • Safe left{' '}
                {formatVisiblePeso(Math.max(0, selectedSummary.safeRemaining))}
              </Text>
            </View>
            <ScalePressable
              onPress={() => setSelectedDateKey(todayKey)}
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
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  beltCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 6,
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
