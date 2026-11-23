import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useBudgetActions,
  useGoals,
  useThemePrefs,
} from '../context/BudgetContext';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';
import { BaseModal } from './BaseModal';

interface AchievementModalProps {
  onNavigateTab: (tab: 'today' | 'wallet' | 'vault' | 'setup') => void;
}

/**
 * Celebration sheet shown when the user hits a saving, streak, or treat milestone,
 * giving concrete next-step saving advice and optional 1-tap follow-up actions.
 */
export const AchievementModal: React.FC<AchievementModalProps> = ({
  onNavigateTab,
}) => {
  const { shade } = useThemePrefs();
  const { pendingMilestone } = useGoals();
  const { dismissMilestone, boostSavingsGoal } = useBudgetActions();

  const iconBounce = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!pendingMilestone) return;
    iconBounce.setValue(0.6);

    Animated.sequence([
      Animated.spring(iconBounce, {
        toValue: 1.15,
        speed: 30,
        bounciness: 12,
        useNativeDriver: true,
      }),
      Animated.spring(iconBounce, {
        toValue: 1,
        speed: 26,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pendingMilestone, iconBounce]);

  if (!pendingMilestone) return null;

  const handleAction = () => {
    const type = pendingMilestone.actionType || 'none';
    dismissMilestone();
    if (type === 'boost_goal_500') {
      boostSavingsGoal(500);
    } else if (type === 'open_wallet') {
      onNavigateTab('wallet');
    } else if (type === 'open_treats') {
      onNavigateTab('vault');
    }
  };

  const hasAction =
    Boolean(pendingMilestone.actionLabel) &&
    pendingMilestone.actionType &&
    pendingMilestone.actionType !== 'none';

  return (
    <BaseModal
      visible
      onClose={dismissMilestone}
      avoidKeyboard={false}
      initialScale={0.88}
      springSpeed={24}
      springBounciness={10}
      backdropStyle={styles.backdrop}
      cardStyle={[
        styles.card,
        { backgroundColor: shade.card, borderColor: shade.border },
      ]}
    >
      <View style={styles.topCenter}>
            <Animated.View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: shade.positiveSoft,
                  transform: [{ scale: iconBounce }],
                },
              ]}
            >
              <AppIcon
                name={pendingMilestone.icon}
                size={28}
                color={shade.positive}
              />
            </Animated.View>

            <View
              style={[styles.kickerPill, { backgroundColor: shade.positiveSoft }]}
            >
              <Text style={[styles.kickerText, { color: shade.positive }]}>
                {pendingMilestone.badge}
              </Text>
            </View>

            <Text style={[styles.title, { color: shade.text }]}>
              {pendingMilestone.title}
            </Text>
            <Text style={[styles.subtitle, { color: shade.muted }]}>
              {pendingMilestone.subtitle}
            </Text>
          </View>

          <View style={[styles.tipsBox, { backgroundColor: shade.surface }]}>
            <View style={styles.tipsHeaderRow}>
              <AppIcon name="sun" size={14} color={shade.positive} />
              <Text style={[styles.tipsHeader, { color: shade.text }]}>
                What to do next
              </Text>
            </View>
            {pendingMilestone.suggestions.map((line, i) => (
              <View key={i} style={styles.bulletRow}>
                <View
                  style={[styles.bulletDot, { backgroundColor: shade.positive }]}
                />
                <Text style={[styles.tipLine, { color: shade.muted }]}>
                  {line}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.btnRow}>
            {hasAction && (
              <ScalePressable
                onPress={handleAction}
                style={[styles.actionBtn, { backgroundColor: shade.positive }]}
              >
                <Text style={[styles.actionText, { color: '#FFFFFF' }]}>
                  {pendingMilestone.actionLabel}
                </Text>
              </ScalePressable>
            )}

            <ScalePressable
              onPress={dismissMilestone}
              style={[
                styles.doneBtn,
                {
                  backgroundColor: hasAction ? shade.surface : shade.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.doneText,
                  { color: hasAction ? shade.text : shade.accentText },
                ]}
              >
                {hasAction ? 'Later' : 'Keep Going'}
              </Text>
            </ScalePressable>
          </View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 26,
    padding: 22,
    gap: 16,
  },
  topCenter: {
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kickerPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  kickerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  tipsBox: {
    borderRadius: 16,
    padding: 14,
    gap: 9,
  },
  tipsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipsHeader: {
    fontSize: 12,
    fontWeight: '800',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  tipLine: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1.3,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  doneBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
