import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useBudgetActions, useThemePrefs } from '../context/BudgetContext';
import {
  triggerCelebrationHaptic,
  triggerLightHaptic,
} from '../utils/haptics';
import { FadeSlideIn, ScalePressable } from './AnimatedPrimitives';
import { BaseModal } from './BaseModal';
import {
  TutorialSlideKey,
  TutorialSlidePreview,
} from './tutorial/TutorialSlidePreview';

interface GuideSlide {
  key: TutorialSlideKey;
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
 * Accessible visual Quick Guide built on BaseModal with animated slide previews.
 */
export const InteractiveTutorialModal: React.FC = () => {
  const { shade } = useThemePrefs();
  const { completeTutorial } = useBudgetActions();
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const [treatDemoPct, setTreatDemoPct] = useState(38);

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

  return (
    <BaseModal
      visible
      avoidKeyboard={false}
      onClose={() => {
        triggerLightHaptic();
        completeTutorial();
      }}
      dismissLabel="Close quick guide"
      cardStyle={[
        styles.card,
        { backgroundColor: shade.card, borderColor: shade.border },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
            accessibilityRole="button"
            accessibilityLabel="Skip quick guide"
            hitSlop={8}
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
          <TutorialSlidePreview
            slideKey={slide.key}
            treatDemoPct={treatDemoPct}
            shade={shade}
          />

          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: shade.text }]}>
              {slide.title}
            </Text>
            <Text style={[styles.body, { color: shade.muted }]}>
              {slide.body}
            </Text>
          </View>
        </FadeSlideIn>

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

        <View style={styles.footerRow}>
          {stepIdx > 0 && (
            <ScalePressable
              onPress={() => goStep(stepIdx - 1, 'left')}
              accessibilityRole="button"
              accessibilityLabel="Previous guide slide"
              style={[
                styles.backBtn,
                { backgroundColor: shade.surface, borderColor: shade.border },
              ]}
            >
              <Text style={[styles.backText, { color: shade.text }]}>Back</Text>
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
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Finish quick guide' : 'Next guide slide'}
            style={[
              styles.nextBtn,
              {
                backgroundColor: isLast ? shade.dopamineBtnBg : shade.accent,
              },
            ]}
          >
            <Text
              style={[
                styles.nextText,
                { color: isLast ? '#FFFFFF' : shade.accentText },
              ]}
            >
              {isLast ? 'Get Started' : 'Next'}
            </Text>
          </ScalePressable>
        </View>
      </ScrollView>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 20,
    maxHeight: '88%',
  },
  scrollContent: {
    gap: 16,
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
    letterSpacing: 1,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  skipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  slideBody: {
    gap: 16,
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
