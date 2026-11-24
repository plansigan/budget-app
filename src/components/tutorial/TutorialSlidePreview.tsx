import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeShade } from '../../theme/palette';
import { AnimatedProgressBar } from '../AnimatedPrimitives';
import { AppIcon } from '../AppIcon';

export type TutorialSlideKey = 'daily' | 'spend' | 'treat' | 'coach';

interface TutorialSlidePreviewProps {
  slideKey: TutorialSlideKey;
  treatDemoPct: number;
  shade: ThemeShade;
}

/**
 * Animated visual mini-preview rendered inside InteractiveTutorialModal.
 */
export const TutorialSlidePreview: React.FC<TutorialSlidePreviewProps> = ({
  slideKey,
  treatDemoPct,
  shade,
}) => {
  if (slideKey === 'daily') {
    return (
      <View style={[styles.mockHero, { backgroundColor: shade.heroBg }]}>
        <Text style={[styles.mockHeroLabel, { color: shade.heroMuted }]}>
          Safe to Spend Today
        </Text>
        <Text style={[styles.mockHeroVal, { color: shade.heroText }]}>
          ₱500.00
        </Text>
        <View style={styles.mockWeekRow}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
            const active = i === 3;
            return (
              <View
                key={i}
                style={[
                  styles.mockDayDot,
                  {
                    backgroundColor: active
                      ? shade.heroText
                      : shade.heroSurface,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    color: active ? shade.heroBg : shade.heroMuted,
                  }}
                >
                  {d}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  if (slideKey === 'spend') {
    return (
      <View
        style={[
          styles.mockCard,
          { backgroundColor: shade.surface, borderColor: shade.border },
        ]}
      >
        <View style={[styles.mockSpendPill, { backgroundColor: shade.heroBg }]}>
          <Text style={[styles.mockSpendText, { color: shade.heroText }]}>
            Spend!
          </Text>
        </View>
        <View
          style={[
            styles.mockEntryRow,
            { backgroundColor: shade.card, borderColor: shade.border },
          ]}
        >
          <View style={[styles.mockIconRow, { flex: 1, minWidth: 0 }]}>
            <AppIcon name="coffee" size={13} color={shade.text} />
            <Text
              numberOfLines={1}
              style={[styles.mockEntryLeft, { color: shade.text }]}
            >
              Lunch • via Cash
            </Text>
          </View>
          <Text style={[styles.mockEntryVal, { color: shade.text }]}>
            -₱120
          </Text>
        </View>
      </View>
    );
  }

  if (slideKey === 'treat') {
    return (
      <View
        style={[
          styles.mockCard,
          { backgroundColor: shade.surface, borderColor: shade.border },
        ]}
      >
        <View style={styles.mockBetween}>
          <View style={styles.mockIconRow}>
            <AppIcon name="headphones" size={13} color={shade.dopamine} />
            <Text style={[styles.mockKicker, { color: shade.dopamine }]}>
              NEW HEADPHONES
            </Text>
          </View>
          <Text style={[styles.mockKicker, { color: shade.dopamine }]}>
            +₱150 Funded!
          </Text>
        </View>
        <AnimatedProgressBar
          percentage={treatDemoPct}
          trackColor={shade.card}
          fillColor={shade.dopamine}
          height={10}
        />
        <Text style={[styles.mockHint, { color: shade.muted }]}>
          Locked goals keep your treat spending guilt-free
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.mockCard,
        { backgroundColor: shade.surface, borderColor: shade.border },
      ]}
    >
      <View style={styles.mockBetween}>
        <View style={styles.mockIconRow}>
          <AppIcon name="briefcase" size={13} color={shade.positive} />
          <Text style={[styles.mockKicker, { color: shade.positive }]}>
            SAVINGS JAR
          </Text>
        </View>
        <View
          style={[styles.mockTipBadge, { backgroundColor: shade.positiveSoft }]}
        >
          <Text style={[styles.mockTipBadgeText, { color: shade.positive }]}>
            +20% Habit
          </Text>
        </View>
      </View>
      <View style={styles.mockTipRow}>
        <AppIcon name="sun" size={14} color={shade.positive} />
        <Text style={[styles.mockTipCopy, { color: shade.text }]}>
          Saving ₱150/day adds up to ₱4,500 a month.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mockHero: {
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  mockHeroLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  mockHeroVal: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  mockWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  mockDayDot: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    gap: 10,
  },
  mockSpendPill: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  mockSpendText: {
    fontSize: 13,
    fontWeight: '800',
  },
  mockEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mockEntryLeft: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  mockEntryVal: {
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 0,
  },
  mockBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  mockIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mockKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  mockHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  mockTipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  mockTipBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  mockTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  mockTipCopy: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
});
