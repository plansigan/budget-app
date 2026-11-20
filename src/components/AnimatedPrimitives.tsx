import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityRole,
  AccessibilityState,
  Animated,
  Easing,
  Insets,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ScalePressableProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  disabled?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  hitSlop?: Insets | number;
  children: React.ReactNode;
}

/**
 * Snappy spring-animated pressable button for tactile mobile feedback.
 */
export const ScalePressable: React.FC<ScalePressableProps> = ({
  onPress,
  style,
  scaleTo = 0.94,
  disabled = false,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  hitSlop,
  children,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      speed: 36,
      bounciness: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      speed: 28,
      bounciness: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      hitSlop={hitSlop}
      style={[style, { transform: [{ scale }] }]}
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
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Fast fade + spring slide entrance wrapper, re-triggered whenever triggerKey changes.
 */
export const FadeSlideIn: React.FC<FadeSlideInProps> = ({
  delay = 0,
  distance = 14,
  direction = 'up',
  triggerKey = 'static',
  style,
  children,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    const startOffset = direction === 'left' ? -distance : distance;
    opacity.setValue(0);
    translate.setValue(startOffset);

    const parallelAnim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(translate, {
        toValue: 0,
        speed: 24,
        bounciness: 7,
        useNativeDriver: true,
      }),
    ]);

    const anim =
      delay > 0
        ? Animated.sequence([Animated.delay(delay), parallelAnim])
        : parallelAnim;

    anim.start();
    return () => anim.stop();
  }, [triggerKey, delay, distance, direction, opacity, translate]);

  const transformStyle =
    direction === 'up'
      ? { transform: [{ translateY: translate }] }
      : { transform: [{ translateX: translate }] };

  return (
    <Animated.View style={[style, { opacity }, transformStyle]}>
      {children}
    </Animated.View>
  );
};

interface PopValueTextProps {
  valueTrigger: number | string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Pulses its scale briefly whenever valueTrigger updates so numbers feel alive.
 */
export const PopValueText: React.FC<PopValueTextProps> = ({
  valueTrigger,
  style,
  children,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const isInitial = useRef(true);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    scale.setValue(1);
    const anim = Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.09,
        speed: 45,
        bounciness: 12,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 30,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [valueTrigger, scale]);

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
  const clamped = Math.max(0, Math.min(100, percentage));
  const widthAnim = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    const anim = Animated.spring(widthAnim, {
      toValue: clamped,
      tension: 80,
      friction: 10,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [clamped, widthAnim]);

  const fillWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
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
  decimals = 0,
  masked = false,
  style,
}) => {
  const safeTarget = Number.isFinite(value) ? value : 0;
  const animVal = useRef(new Animated.Value(safeTarget)).current;
  const [displayValue, setDisplayValue] = useState(safeTarget);
  const formatVal = React.useCallback(
    (v: number) =>
      decimals > 0
        ? v.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        : Math.round(v).toLocaleString(),
    [decimals]
  );
  const lastFormattedRef = useRef<string>(formatVal(safeTarget));
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    const listenerId = animVal.addListener(({ value: v }) => {
      const now = Date.now();
      const formatted = formatVal(v);
      if (
        formatted !== lastFormattedRef.current &&
        now - lastTickRef.current >= 40
      ) {
        lastFormattedRef.current = formatted;
        lastTickRef.current = now;
        setDisplayValue(v);
      }
    });
    return () => {
      animVal.removeListener(listenerId);
    };
  }, [animVal, formatVal]);

  useEffect(() => {
    animVal.stopAnimation();
    const anim = Animated.timing(animVal, {
      toValue: safeTarget,
      duration: 360,
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
  }, [safeTarget, animVal, formatVal]);

  if (masked) {
    return (
      <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>
        {prefix}••••{suffix}
      </Text>
    );
  }

  const rounded = formatVal(displayValue);

  return (
    <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>
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
