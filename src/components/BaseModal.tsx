import React, { useEffect, useRef } from 'react';
import {
  Animated,
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
import { useWebKeyboardInset } from '../utils/useWebKeyboardInset';

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
 * Shared cross-platform centered modal shell handling fade/spring entry,
 * backdrop press dismissal, iOS/Android/Web keyboard lifting, safe areas, and stacked Web Escape key close.
 */
export const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  onClose,
  dismissLabel = 'Dismiss dialog',
  cardStyle,
  backdropStyle,
  avoidKeyboard = true,
  androidAvoidHeight = true,
  initialScale = 0.94,
  springSpeed = 28,
  springBounciness = 7,
  minKeyboardCardHeight = 240,
  children,
}) => {
  const { shade } = useThemePrefs();
  const insets = useSafeAreaInsets();
  const cardScale = useRef(new Animated.Value(initialScale)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const { keyboardInset, viewportHeight, offsetTop } = useWebKeyboardInset(
    avoidKeyboard && visible
  );

  useEffect(() => {
    if (!visible) return;
    cardScale.setValue(initialScale);
    Animated.spring(cardScale, {
      toValue: 1,
      speed: springSpeed,
      bounciness: springBounciness,
      useNativeDriver: true,
    }).start();
  }, [visible, cardScale, initialScale, springSpeed, springBounciness]);

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

  if (!visible) {
    return null;
  }

  const backdropScrim = {
    backgroundColor: shade.dark
      ? 'rgba(4, 6, 12, 0.72)'
      : 'rgba(17, 24, 39, 0.45)',
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
          cardStyle,
          { transform: [{ scale: cardScale }] },
          webKeyboardCard,
        ]}
      >
        {children}
      </Animated.View>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
            backdropScrim,
            backdropStyle,
            webKeyboardBackdrop,
          ]}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.backdrop, backdropScrim, backdropStyle]}>
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
    maxWidth: 390,
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    maxHeight: '86%',
    shadowColor: '#111318',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
