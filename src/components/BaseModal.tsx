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
import { useWebKeyboardInset } from '../utils/useWebKeyboardInset';

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
 * backdrop press dismissal, iOS/Android/Web keyboard lifting, and Web Escape key close.
 */
export const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  onClose,
  dismissLabel = 'Dismiss dialog',
  cardStyle,
  backdropStyle,
  avoidKeyboard = true,
  androidAvoidHeight = false,
  initialScale = 0.94,
  springSpeed = 28,
  springBounciness = 7,
  minKeyboardCardHeight = 240,
  children,
}) => {
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
    if (
      Platform.OS !== 'web' ||
      !visible ||
      typeof window === 'undefined' ||
      typeof window.addEventListener !== 'function'
    ) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

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
        accessibilityLabel={dismissLabel}
      />
      <Animated.View
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
          style={[styles.backdrop, backdropStyle, webKeyboardBackdrop]}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.backdrop, backdropStyle]}>{content}</View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
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
