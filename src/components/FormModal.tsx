import React, { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useBudget } from '../context/BudgetContext';
import { triggerLightHaptic } from '../utils/haptics';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon, IconBadge } from './AppIcon';

interface FormModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  icon?: string;
  accentColor?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Clean centered minimalist modal container used by every Add / Action flow in the app.
 */
export const FormModal: React.FC<FormModalProps> = ({
  visible,
  title,
  subtitle,
  icon = 'plus',
  accentColor,
  onClose,
  children,
}) => {
  const { shade } = useBudget();
  const cardScale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (!visible) return;
    cardScale.setValue(0.94);
    Animated.spring(cardScale, {
      toValue: 1,
      speed: 28,
      bounciness: 7,
      useNativeDriver: true,
    }).start();
  }, [visible, cardScale]);

  const effectiveAccent = accentColor || shade.accent;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss dialog"
        />
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: shade.card,
              borderColor: shade.border,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <IconBadge
                name={icon}
                size={16}
                color={effectiveAccent}
                bg={shade.surface}
                boxSize={36}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: shade.text }]}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text style={[styles.subtitle, { color: shade.muted }]}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>

            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              accessibilityLabel="Close modal"
              hitSlop={8}
              style={[styles.closeBtn, { backgroundColor: shade.surface }]}
            >
              <AppIcon name="x" size={16} color={shade.muted} />
            </ScalePressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollBody}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
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
    gap: 14,
    maxHeight: '86%',
    shadowColor: '#111318',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    gap: 12,
    paddingBottom: 4,
  },
});
