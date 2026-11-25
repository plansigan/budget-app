import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemePrefs } from '../context/BudgetContext';
import { getWebGlassStyle } from '../theme/tokens';
import { useWebKeyboardInset } from '../utils/useWebKeyboardInset';
import { useReducedMotion } from './AnimatedPrimitives';

const openModalStack: symbol[] = [];

interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  dismissLabel?: string;
  cardStyle?: StyleProp<ViewStyle>;
  backdropStyle?: StyleProp<ViewStyle>;
  avoidKeyboard?: boolean;
  androidAvoidHeight?: boolean;
  initialScale?: number;
  springSpeed?: number;
  springBounciness?: number;
  minKeyboardCardHeight?: number;
  children: React.ReactNode;
}

/**
 * Shared cross-platform centered modal shell handling frosted backdrop,
 * spring entry & graceful exit, iOS/Android/Web keyboard lifting, safe areas,
 * and stacked Web Escape key close.
 */
export const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  onClose,
  dismissLabel = 'Dismiss dialog',
  cardStyle,
  backdropStyle,
  avoidKeyboard = true,
  androidAvoidHeight = true,
  initialScale = 0.95,
  minKeyboardCardHeight = 240,
  children,
}) => {
  const { shade } = useThemePrefs();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const [rendered, setRendered] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const cardOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const cardScale = useRef(
    new Animated.Value(visible ? 1 : initialScale)
  ).current;
  const cardTranslateY = useRef(new Animated.Value(visible ? 0 : 18)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const { keyboardInset, viewportHeight, offsetTop } = useWebKeyboardInset(
    avoidKeyboard && visible
  );

  useEffect(() => {
    if (visible) {
      setRendered(true);
      if (reducedMotion) {
        backdropOpacity.setValue(1);
        cardOpacity.setValue(1);
        cardScale.setValue(1);
        cardTranslateY.setValue(0);
        return;
      }
      backdropOpacity.setValue(0);
      cardOpacity.setValue(0);
      cardScale.setValue(initialScale);
      cardTranslateY.setValue(18);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 190,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 240,
          friction: 22,
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          tension: 240,
          friction: 22,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!rendered) return;
    if (reducedMotion) {
      setRendered(false);
      return;
    }

    const exitAnim = Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 130,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: initialScale,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 10,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    exitAnim.start(({ finished }) => {
      if (finished) {
        setRendered(false);
      }
    });
    return () => exitAnim.stop();
  }, [
    visible,
    rendered,
    reducedMotion,
    initialScale,
    backdropOpacity,
    cardOpacity,
    cardScale,
    cardTranslateY,
  ]);

  useEffect(() => {
    if (!visible) return;
    const modalToken = Symbol('base-modal');
    openModalStack.push(modalToken);

    const canListenWeb =
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const topModal = openModalStack[openModalStack.length - 1];
        if (topModal !== modalToken) return;
        event.preventDefault();
        onCloseRef.current();
      }
    };

    if (canListenWeb) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      const idx = openModalStack.lastIndexOf(modalToken);
      if (idx !== -1) {
        openModalStack.splice(idx, 1);
      }
      if (canListenWeb) {
        window.removeEventListener('keydown', handleKeyDown, true);
      }
    };
  }, [visible]);

  if (!rendered) {
    return null;
  }

  const backdropScrim = {
    backgroundColor: shade.dark
      ? 'rgba(5, 6, 10, 0.72)'
      : 'rgba(22, 24, 29, 0.36)',
    paddingTop: Math.max(12, insets.top + 8),
    paddingBottom: Math.max(12, insets.bottom + 8),
    paddingLeft: Math.max(18, insets.left + 12),
    paddingRight: Math.max(18, insets.right + 12),
  };

  const webKeyboardBackdrop =
    avoidKeyboard && Platform.OS === 'web' && keyboardInset > 0
      ? {
        paddingBottom: keyboardInset + 8,
        paddingTop: Math.max(12, offsetTop + 8),
      }
      : undefined;
  const webKeyboardCard =
    avoidKeyboard &&
      Platform.OS === 'web' &&
      keyboardInset > 0 &&
      viewportHeight > 0
      ? { maxHeight: Math.max(minKeyboardCardHeight, viewportHeight - 24) }
      : undefined;

  const content = (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          backdropScrim,
          getWebGlassStyle(10),
          { opacity: backdropOpacity },
        ]}
      />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={dismissLabel}
      />
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.card,
          {
            shadowColor: shade.shadowColor,
            shadowOpacity: shade.dark ? 0.48 : 0.16,
          },
          cardStyle,
          {
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
          },
          webKeyboardCard,
        ]}
      >
        {children}
      </Animated.View>
    </>
  );

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : androidAvoidHeight && Platform.OS === 'android'
                ? 'height'
                : undefined
          }
          style={[
            styles.backdrop,
            {
              paddingTop: backdropScrim.paddingTop,
              paddingBottom: backdropScrim.paddingBottom,
              paddingLeft: backdropScrim.paddingLeft,
              paddingRight: backdropScrim.paddingRight,
            },
            backdropStyle,
            webKeyboardBackdrop,
          ]}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View
          style={[
            styles.backdrop,
            {
              paddingTop: backdropScrim.paddingTop,
              paddingBottom: backdropScrim.paddingBottom,
              paddingLeft: backdropScrim.paddingLeft,
              paddingRight: backdropScrim.paddingRight,
            },
            backdropStyle,
          ]}
        >
          {content}
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: 26,
    borderWidth: 1,
    padding: 20,
    maxHeight: '86%',
    shadowColor: '#16181D',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
});
