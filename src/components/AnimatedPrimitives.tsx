import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AccessibilityRole,
  AccessibilityState,
  Animated,
  Easing,
  Insets,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Tracks OS / browser reduced-motion preference so animations can gracefully simplify.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduced(mq.matches);
      const onChange = (e: MediaQueryListEvent) => {
        if (mounted) setReduced(e.matches);
      };
      mq.addEventListener?.('change', onChange);
      return () => {
        mounted = false;
        mq.removeEventListener?.('change', onChange);
      };
    }

    AccessibilityInfo?.isReduceMotionEnabled?.()
      .then((val) => {
        if (mounted) setReduced(Boolean(val));
      })
      .catch(() => {});

    const sub = AccessibilityInfo?.addEventListener?.(
      'reduceMotionChanged',
      (val) => {
        if (mounted) setReduced(Boolean(val));
      }
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}

interface ScalePressableProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hoverScale?: number;
  disabled?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  hitSlop?: Insets | number;
  children: React.ReactNode;
}

/**
 * Refined spring-animated pressable with subtle web hover lift and tactile press feedback.
 */
export const ScalePressable: React.FC<ScalePressableProps> = ({
  onPress,
  style,
  scaleTo = 0.96,
  hoverScale = 1.01,
  disabled = false,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  hitSlop,
  children,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();
  const isHoveredRef = useRef(false);

  const animateTo = (target: number, tension = 280, friction = 22) => {
    if (reducedMotion) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue: target,
      tension,
      friction,
      useNativeDriver: true,
    }).start();
  };

  const handlePressIn = () => {
    animateTo(scaleTo, 320, 22);
  };

  const handlePressOut = () => {
    animateTo(isHoveredRef.current && !disabled ? hoverScale : 1, 260, 20);
  };

  const handleHoverIn = () => {
    if (disabled || Platform.OS !== 'web') return;
    isHoveredRef.current = true;
    animateTo(hoverScale, 240, 24);
  };

  const handleHoverOut = () => {
    if (Platform.OS !== 'web') return;
    isHoveredRef.current = false;
    animateTo(1, 240, 24);
  };

  const webCursor =
    Platform.OS === 'web' && !disabled
      ? ({ cursor: 'pointer' } as ViewStyle)
      : undefined;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, ...accessibilityState }}
      hitSlop={hitSlop}
      style={[webCursor, style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
};

interface FadeSlideInProps {
  delay?: number;
  distance?: number;
  direction?: 'up' | 'right' | 'left';
  triggerKey?: string | number;
  withScale?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Silky fade + spring slide entrance wrapper, re-triggered whenever triggerKey changes.
 */
export const FadeSlideIn: React.FC<FadeSlideInProps> = ({
  delay = 0,
  distance = 12,
  direction = 'up',
  triggerKey = 'static',
  withScale = false,
  style,
  children,
}) => {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const translate = useRef(
    new Animated.Value(reducedMotion ? 0 : distance)
  ).current;
  const scale = useRef(
    new Animated.Value(reducedMotion || !withScale ? 1 : 0.985)
  ).current;

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      translate.setValue(0);
      scale.setValue(1);
      return;
    }

    const startOffset = direction === 'left' ? -distance : distance;
    opacity.setValue(0);
    translate.setValue(startOffset);
    if (withScale) {
      scale.setValue(0.985);
    }

    const animations: Animated.CompositeAnimation[] = [
      Animated.timing(opacity, {
        toValue: 1,
        duration: 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translate, {
        toValue: 0,
        tension: 210,
        friction: 24,
        useNativeDriver: true,
      }),
    ];

    if (withScale) {
      animations.push(
        Animated.spring(scale, {
          toValue: 1,
          tension: 210,
          friction: 24,
          useNativeDriver: true,
        })
      );
    }

    const parallelAnim = Animated.parallel(animations);
    const anim =
      delay > 0
        ? Animated.sequence([Animated.delay(delay), parallelAnim])
        : parallelAnim;

    anim.start();
    return () => anim.stop();
  }, [triggerKey, delay, distance, direction, withScale, reducedMotion, opacity, translate, scale]);

  const transforms =
    direction === 'up'
      ? [{ translateY: translate }, ...(withScale ? [{ scale }] : [])]
      : [{ translateX: translate }, ...(withScale ? [{ scale }] : [])];

  return (
    <Animated.View style={[style, { opacity, transform: transforms }]}>
      {children}
    </Animated.View>
  );
};

export interface PillLayout {
  x: number;
  width: number;
}

interface SlidingIndicatorProps {
  activeLayout: PillLayout | undefined;
  style?: StyleProp<ViewStyle>;
}

/**
 * Spring-animated sliding pill indicator used by floating docks, segmented bars, and day belts.
 */
export const SlidingIndicator: React.FC<SlidingIndicatorProps> = ({
  activeLayout,
  style,
}) => {
  const reducedMotion = useReducedMotion();
  const translateX = useRef(new Animated.Value(0)).current;
  const widthAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!activeLayout || activeLayout.width <= 0) return;

    if (!hasInitializedRef.current || reducedMotion) {
      hasInitializedRef.current = true;
      translateX.setValue(activeLayout.x);
      widthAnim.setValue(activeLayout.width);
      opacityAnim.setValue(1);
      return;
    }

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: activeLayout.x,
        tension: 260,
        friction: 25,
        useNativeDriver: false,
      }),
      Animated.spring(widthAnim, {
        toValue: activeLayout.width,
        tension: 260,
        friction: 25,
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeLayout, reducedMotion, translateX, widthAnim, opacityAnim]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position: 'absolute',
          left: 0,
          opacity: opacityAnim,
          width: widthAnim,
          transform: [{ translateX }],
        },
      ]}
    />
  );
};

interface PopValueTextProps {
  valueTrigger: number | string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Pulses its scale gently whenever valueTrigger updates so numbers feel alive.
 */
export const PopValueText: React.FC<PopValueTextProps> = ({
  valueTrigger,
  style,
  children,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const isInitial = useRef(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    if (reducedMotion) return;
    scale.setValue(1);
    const anim = Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.06,
        tension: 320,
        friction: 18,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 240,
        friction: 20,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [valueTrigger, reducedMotion, scale]);

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
};

interface AnimatedProgressBarProps {
  percentage: number;
  trackColor: string;
  fillColor: string;
  height?: number;
}

/**
 * Smooth spring-animated horizontal progress bar.
 */
export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  percentage,
  trackColor,
  fillColor,
  height = 8,
}) => {
  const safePct = Number.isFinite(percentage) ? percentage : 0;
  const clamped = Math.max(0, Math.min(100, safePct));
  const widthAnim = useRef(new Animated.Value(clamped)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      widthAnim.setValue(clamped);
      return;
    }
    const anim = Animated.spring(widthAnim, {
      toValue: clamped,
      tension: 95,
      friction: 14,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [clamped, reducedMotion, widthAnim]);

  const fillWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={[
        styles.progressTrack,
        { backgroundColor: trackColor, height },
      ]}
    >
      <Animated.View
        style={[
          styles.progressFill,
          { width: fillWidth, backgroundColor: fillColor },
        ]}
      />
    </View>
  );
};

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  masked?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * Smoothly rolls peso numbers up or down using tabular digits so text never jitters horizontally.
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix = '₱',
  suffix = '',
  decimals = 2,
  masked = false,
  style,
}) => {
  const safeTarget = Number.isFinite(value) ? value : 0;
  const animVal = useRef(new Animated.Value(safeTarget)).current;
  const [displayValue, setDisplayValue] = useState(safeTarget);
  const reducedMotion = useReducedMotion();

  const formatVal = React.useCallback(
    (v: number) => {
      const factor = 10 ** decimals;
      const safe = Number.isFinite(v) ? Math.round(v * factor) / factor : 0;
      const normalized = Math.abs(safe) === 0 ? 0 : safe;
      return Math.abs(normalized).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    },
    [decimals]
  );
  const lastFormattedRef = useRef<string>(formatVal(safeTarget));
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (masked || reducedMotion) return;
    const listenerId = animVal.addListener(({ value: v }) => {
      const now = Date.now();
      const formatted = formatVal(v);
      if (
        formatted !== lastFormattedRef.current &&
        now - lastTickRef.current >= 36
      ) {
        lastFormattedRef.current = formatted;
        lastTickRef.current = now;
        setDisplayValue(v);
      }
    });
    return () => {
      animVal.removeListener(listenerId);
    };
  }, [animVal, formatVal, masked, reducedMotion]);

  useEffect(() => {
    animVal.stopAnimation();
    if (masked || reducedMotion) {
      animVal.setValue(safeTarget);
      lastFormattedRef.current = formatVal(safeTarget);
      setDisplayValue(safeTarget);
      return;
    }
    const anim = Animated.timing(animVal, {
      toValue: safeTarget,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) {
        lastFormattedRef.current = formatVal(safeTarget);
        setDisplayValue(safeTarget);
      }
    });
    return () => anim.stop();
  }, [safeTarget, animVal, formatVal, masked, reducedMotion]);

  const factor = 10 ** decimals;

  if (masked) {
    const roundedTarget = Number.isFinite(safeTarget)
      ? Math.round(safeTarget * factor) / factor
      : 0;
    const maskedSign =
      roundedTarget < 0 && Math.abs(roundedTarget) > 0 ? '-' : '';
    return (
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={[{ fontVariant: ['tabular-nums'] }, style]}
      >
        {maskedSign}
        {prefix}••••{suffix}
      </Text>
    );
  }

  const safeDisplay = Number.isFinite(displayValue)
    ? Math.round(displayValue * factor) / factor
    : 0;
  const sign = safeDisplay < 0 && Math.abs(safeDisplay) > 0 ? '-' : '';
  const rounded = formatVal(displayValue);

  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      style={[{ fontVariant: ['tabular-nums'] }, style]}
    >
      {sign}
      {prefix}
      {rounded}
      {suffix}
    </Text>
  );
};

const styles = StyleSheet.create({
  progressTrack: {
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
});
