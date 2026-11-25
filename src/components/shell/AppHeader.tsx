import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useGoals, useThemePrefs } from '../../context/BudgetContext';
import { FONT_FAMILY, getWebGlassStyle } from '../../theme/tokens';
import { triggerLightHaptic } from '../../utils/haptics';
import { ScalePressable, useReducedMotion } from '../AnimatedPrimitives';
import { AppIcon } from '../AppIcon';

interface AppHeaderProps {
  paddingTop: number;
  onOpenFaq: () => void;
}

/**
 * Translucent borderless top header with quiet ghost actions and streak indicator.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  paddingTop,
  onOpenFaq,
}) => {
  const { privacyMode, togglePrivacyMode, setThemeMode, shade } =
    useThemePrefs();
  const { streakDays } = useGoals();
  const reducedMotion = useReducedMotion();

  const themeSpin = useRef(new Animated.Value(0)).current;
  const isFirstThemeRender = useRef(true);

  useEffect(() => {
    if (isFirstThemeRender.current) {
      isFirstThemeRender.current = false;
      return;
    }
    if (reducedMotion) return;
    themeSpin.setValue(0);
    Animated.spring(themeSpin, {
      toValue: 1,
      tension: 220,
      friction: 18,
      useNativeDriver: true,
    }).start();
  }, [shade.dark, reducedMotion, themeSpin]);

  const themeRotation = themeSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '0deg'],
  });

  return (
    <View
      style={[
        styles.header,
        getWebGlassStyle(16),
        {
          backgroundColor: shade.bg,
          paddingTop,
        },
      ]}
    >
      <View style={styles.brandRow}>
        <Text style={[styles.brandTitle, { color: shade.text }]}>velvet</Text>
        <View
          style={[
            styles.currencyPill,
            { backgroundColor: shade.surface },
          ]}
        >
          <Text style={[styles.currencyText, { color: shade.muted }]}>₱</Text>
        </View>
      </View>

      <View style={styles.headerActions}>
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            onOpenFaq();
          }}
          accessibilityRole="button"
          accessibilityLabel="Open App Guide and FAQ"
          hitSlop={8}
          style={styles.ghostIconBtn}
        >
          <AppIcon name="help-circle" size={17} color={shade.muted} />
        </ScalePressable>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setThemeMode(shade.dark ? 'light' : 'dark');
          }}
          accessibilityRole="button"
          accessibilityLabel={
            shade.dark ? 'Switch to Light mode' : 'Switch to Dark mode'
          }
          accessibilityState={{ selected: shade.dark }}
          hitSlop={8}
          style={styles.ghostIconBtn}
        >
          <Animated.View style={{ transform: [{ rotate: themeRotation }] }}>
            <AppIcon
              name={shade.dark ? 'sun' : 'moon'}
              size={17}
              color={shade.muted}
            />
          </Animated.View>
        </ScalePressable>

        <ScalePressable
          onPress={togglePrivacyMode}
          accessibilityRole="button"
          accessibilityLabel={privacyMode ? 'Show amounts' : 'Hide amounts'}
          accessibilityState={{ selected: privacyMode }}
          hitSlop={8}
          style={[
            styles.ghostIconBtn,
            privacyMode && { backgroundColor: shade.surface },
          ]}
        >
          <AppIcon
            name={privacyMode ? 'eye-off' : 'eye'}
            size={17}
            color={privacyMode ? shade.text : shade.muted}
          />
        </ScalePressable>

        <View
          accessible
          accessibilityLabel={`Daily streak ${streakDays} ${streakDays === 1 ? 'day' : 'days'
            }`}
          style={[
            styles.streakPill,
            { backgroundColor: shade.positiveSoft },
          ]}
        >
          <AppIcon name="zap" size={13} color={shade.positive} />
          <Text style={[styles.streakText, { color: shade.positive }]}>
            {streakDays}d
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
    fontFamily: FONT_FAMILY,
  },
  currencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  currencyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ghostIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginLeft: 4,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
