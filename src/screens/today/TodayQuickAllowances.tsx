import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionModalMode } from '../../components/ActionAmountModal';
import {
  AnimatedProgressBar,
  FadeSlideIn,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { IconBadge } from '../../components/AppIcon';
import { useThemePrefs } from '../../context/BudgetContext';
import { SpendingEnvelopeItem, TreatVaultItem } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';

interface TodayQuickAllowancesProps {
  envelopes: SpendingEnvelopeItem[];
  monthlySaved: number;
  monthlySavingsGoal: number;
  savPct: number;
  treats: TreatVaultItem[];
  activeTreat: TreatVaultItem | null;
  treatPct: number;
  treatReady: boolean;
  onOpenModal: (mode: ActionModalMode, envelopeId?: string | null) => void;
  onOpenAllowances: () => void;
  onOpenVault: () => void;
  onClaimTreat: (treatId: string) => void;
}

export const TodayQuickAllowances: React.FC<TodayQuickAllowancesProps> =
  React.memo(
    ({
      envelopes,
      monthlySaved,
      monthlySavingsGoal,
      savPct,
      treats,
      activeTreat,
      treatPct,
      treatReady,
      onOpenModal,
      onOpenAllowances,
      onOpenVault,
      onClaimTreat,
    }) => {
      const { shade, formatVisiblePeso } = useThemePrefs();

      return (
        <>
          {envelopes.length > 0 && (
            <FadeSlideIn delay={75} distance={12}>
              <View style={styles.sectionBlock}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.sectionKicker, { color: shade.muted }]}>
                    ALLOWANCES
                  </Text>
                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      onOpenAllowances();
                    }}
                    hitSlop={6}
                  >
                    <Text
                      style={[
                        styles.sectionSubHint,
                        { color: shade.dopamine, fontWeight: '800' },
                      ]}
                    >
                      Manage ›
                    </Text>
                  </ScalePressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.envStripScroll}
                >
                  {envelopes.map((env) => {
                    const pct =
                      env.amountPerCycle > 0
                        ? Math.min(
                            100,
                            Math.max(
                              0,
                              Math.round((env.balance / env.amountPerCycle) * 100)
                            )
                          )
                        : 0;
                    return (
                      <ScalePressable
                        key={env.id}
                        onPress={() => onOpenModal('spend', env.id)}
                        style={[
                          styles.envPillCard,
                          {
                            backgroundColor: shade.card,
                            borderColor: shade.border,
                          },
                        ]}
                      >
                        <View style={styles.envCardTop}>
                          <IconBadge
                            name={env.icon}
                            size={15}
                            color={shade.dopamine}
                            bg={shade.dopamineSoft}
                            boxSize={32}
                          />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              numberOfLines={1}
                              style={[styles.envCardName, { color: shade.text }]}
                            >
                              {env.name}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.envCardBal,
                                { color: shade.dopamine },
                              ]}
                            >
                              {formatVisiblePeso(env.balance)} left
                            </Text>
                          </View>
                        </View>
                        <AnimatedProgressBar
                          percentage={pct}
                          trackColor={shade.surface}
                          fillColor={shade.dopamine}
                          height={4}
                        />
                      </ScalePressable>
                    );
                  })}
                </ScrollView>
              </View>
            </FadeSlideIn>
          )}

          <FadeSlideIn delay={90} distance={14}>
            <View style={styles.dualRow}>
              <ScalePressable
                onPress={() => onOpenModal('save')}
                style={[
                  styles.bucketCard,
                  { backgroundColor: shade.card, borderColor: shade.border },
                ]}
              >
                <View style={styles.rowBetween}>
                  <Text
                    style={[styles.bucketKicker, { color: shade.positive }]}
                  >
                    SAVINGS JAR
                  </Text>
                  <Text style={[styles.bucketPct, { color: shade.positive }]}>
                    {savPct}%
                  </Text>
                </View>
                <View style={{ gap: 2 }}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    style={[
                      styles.bucketValue,
                      { color: shade.text, fontVariant: ['tabular-nums'] },
                    ]}
                  >
                    {formatVisiblePeso(monthlySaved)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 11,
                      color: shade.muted,
                      fontWeight: '600',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    of {formatVisiblePeso(monthlySavingsGoal)}
                  </Text>
                </View>
                <AnimatedProgressBar
                  percentage={savPct}
                  trackColor={shade.surface}
                  fillColor={shade.positive}
                  height={7}
                />
                <Text
                  style={[styles.bucketTapHint, { color: shade.positive }]}
                >
                  + Save to Jar
                </Text>
              </ScalePressable>

              <ScalePressable
                onPress={() =>
                  treatReady && activeTreat
                    ? onClaimTreat(activeTreat.id)
                    : activeTreat
                    ? onOpenModal('treat')
                    : onOpenVault()
                }
                style={[
                  styles.bucketCard,
                  { backgroundColor: shade.card, borderColor: shade.border },
                ]}
              >
                <View style={styles.rowBetween}>
                  <Text
                    style={[styles.bucketKicker, { color: shade.dopamine }]}
                  >
                    TREAT ({treats.length}/3)
                  </Text>
                  <ScalePressable onPress={onOpenVault} hitSlop={8}>
                    <Text style={[styles.bucketPct, { color: shade.dopamine }]}>
                      {activeTreat ? `${treatPct}% ›` : 'Open ›'}
                    </Text>
                  </ScalePressable>
                </View>

                {activeTreat ? (
                  <>
                    <View style={{ gap: 2 }}>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                        style={[
                          styles.bucketValue,
                          { color: shade.text, fontVariant: ['tabular-nums'] },
                        ]}
                      >
                        {formatVisiblePeso(activeTreat.funded)}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 11,
                          color: shade.muted,
                          fontWeight: '600',
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        of {formatVisiblePeso(activeTreat.target)}
                      </Text>
                    </View>
                    <AnimatedProgressBar
                      percentage={treatPct}
                      trackColor={shade.surface}
                      fillColor={shade.dopamine}
                      height={7}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.bucketTapHint, { color: shade.dopamine }]}
                    >
                      {treatReady
                        ? `Claim ${activeTreat.name}`
                        : `+ Fund ${activeTreat.name}`}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.emptyTreatVal, { color: shade.muted }]}>
                      No treats yet
                    </Text>
                    <Text
                      style={[styles.bucketTapHint, { color: shade.dopamine }]}
                    >
                      + Add Treat Goal
                    </Text>
                  </>
                )}
              </ScalePressable>
            </View>
          </FadeSlideIn>
        </>
      );
    }
  );

const styles = StyleSheet.create({
  sectionBlock: {
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionSubHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  envStripScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  envPillCard: {
    minWidth: 174,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  envCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  envCardName: {
    fontSize: 13,
    fontWeight: '800',
  },
  envCardBal: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  dualRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bucketCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    justifyContent: 'space-between',
    shadowColor: '#111318',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  bucketKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bucketPct: {
    fontSize: 12,
    fontWeight: '800',
  },
  bucketValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  bucketTapHint: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyTreatVal: {
    fontSize: 13,
    fontWeight: '600',
  },
});
