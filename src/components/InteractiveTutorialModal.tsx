import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useBudget } from '../context/BudgetContext';
import {
  triggerCelebrationHaptic,
  triggerLightHaptic,
} from '../utils/haptics';
import {
  AnimatedProgressBar,
  FadeSlideIn,
  ScalePressable,
} from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';

interface GuideSlide {
  key: 'daily' | 'spend' | 'treat' | 'coach';
  title: string;
  body: string;
}

const GUIDE_SLIDES: GuideSlide[] = [
  {
    key: 'daily',
    title: 'Your daily safe number',
    body: 'Bills and savings are set aside first. What stays on this card is safe to spend today.',
  },
  {
    key: 'spend',
    title: 'Log spends in 2 seconds',
    body: 'Tap Spend!, enter the exact peso amount, and pick Cash, Bank, or Card to keep balances in sync.',
  },
  {
    key: 'treat',
    title: 'Save toward up to 3 Treats',
    body: 'Add treats you really want, then fund them from your daily budget or end-of-day savings.',
  },
  {
    key: 'coach',
    title: 'End Day & Save smarter',
    body: 'Tap End Day & Save at night to lock in unused pesos and get personalized PH money tips.',
  },
];

/**
 * Clean, visual Quick Guide with 1 clear primary button per slide and animated mini previews.
 */
export const InteractiveTutorialModal: React.FC = () => {
  const { shade, completeTutorial } = useBudget();
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const [treatDemoPct, setTreatDemoPct] = useState(38);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.92)).current;
  const modalY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(modalScale, {
        toValue: 1,
        speed: 26,
        bounciness: 7,
        useNativeDriver: true,
      }),
      Animated.spring(modalY, {
        toValue: 0,
        speed: 26,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, modalScale, modalY]);

  useEffect(() => {
    if (stepIdx !== 2) {
      setTreatDemoPct(38);
      return;
    }
    const timer = setTimeout(() => setTreatDemoPct(82), 260);
    return () => clearTimeout(timer);
  }, [stepIdx]);

  const slide = GUIDE_SLIDES[stepIdx];
  const isLast = stepIdx === GUIDE_SLIDES.length - 1;

  const goStep = (next: number, dir: 'right' | 'left') => {
    triggerLightHaptic();
    setDirection(dir);
    setStepIdx(next);
  };

  const renderVisualPreview = () => {
    if (slide.key === 'daily') {
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

    if (slide.key === 'spend') {
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
            <View style={styles.mockIconRow}>
              <AppIcon name="coffee" size={13} color={shade.text} />
              <Text style={[styles.mockEntryLeft, { color: shade.text }]}>
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

    if (slide.key === 'treat') {
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
        <View style={styles.mockIconRow}>
          <AppIcon name="sun" size={14} color={shade.positive} />
          <Text style={[styles.mockTipCopy, { color: shade.text }]}>
            Saving ₱150/day adds up to ₱4,500 a month.
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: shade.card,
            borderColor: shade.border,
            transform: [{ scale: modalScale }, { translateY: modalY }],
          },
        ]}
      >
        <View style={styles.topRow}>
          <Text style={[styles.kicker, { color: shade.muted }]}>
            QUICK GUIDE • {stepIdx + 1} OF {GUIDE_SLIDES.length}
          </Text>
          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              completeTutorial();
            }}
            style={[styles.skipBtn, { backgroundColor: shade.surface }]}
          >
            <Text style={[styles.skipText, { color: shade.muted }]}>Skip</Text>
          </ScalePressable>
        </View>

        <FadeSlideIn
          triggerKey={stepIdx}
          direction={direction}
          distance={18}
          style={styles.slideBody}
        >
          {renderVisualPreview()}

          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: shade.text }]}>
              {slide.title}
            </Text>
            <Text style={[styles.body, { color: shade.muted }]}>
              {slide.body}
            </Text>
          </View>
        </FadeSlideIn>

        {/* Clean Expanding Dots */}
        <View style={styles.dotsRow}>
          {GUIDE_SLIDES.map((s, i) => {
            const active = i === stepIdx;
            return (
              <View
                key={s.key}
                style={[
                  styles.dot,
                  {
                    width: active ? 22 : 7,
                    backgroundColor: active ? shade.accent : shade.border,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Single Clear Action Row */}
        <View style={styles.footerRow}>
          {stepIdx > 0 && (
            <ScalePressable
              onPress={() => goStep(stepIdx - 1, 'left')}
              style={[
                styles.backBtn,
                { backgroundColor: shade.surface, borderColor: shade.border },
              ]}
            >
              <Text style={[styles.backText, { color: shade.text }]}>
                Back
              </Text>
            </ScalePressable>
          )}

          <ScalePressable
            onPress={() => {
              if (isLast) {
                triggerCelebrationHaptic();
                completeTutorial();
              } else {
                goStep(stepIdx + 1, 'right');
              }
            }}
            style={[styles.nextBtn, { backgroundColor: shade.accent }]}
          >
            <Text style={[styles.nextText, { color: shade.accentText }]}>
              {isLast ? 'Get Started' : 'Next'}
            </Text>
          </ScalePressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 50,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: '#111318',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  skipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  slideBody: {
    gap: 16,
  },
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
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mockEntryLeft: {
    fontSize: 12,
    fontWeight: '600',
  },
  mockEntryVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  mockBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  mockTipCopy: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  textBlock: {
    gap: 5,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 7,
    borderRadius: 999,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backBtn: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
