import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemePrefs } from '../../context/BudgetContext';
import { useToast } from '../../context/ToastContext';
import { FadeSlideIn, ScalePressable } from '../AnimatedPrimitives';

/**
 * Floating non-layout-shifting toast banner anchored above the bottom tab bar.
 */
export const ToastOverlay: React.FC = () => {
  const { shade } = useThemePrefs();
  const { toast, dismissToast } = useToast();

  if (!toast) return null;

  return (
    <View
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      style={styles.wrap}
    >
      <FadeSlideIn triggerKey={toast.id} direction="up" distance={14}>
        <ScalePressable
          onPress={dismissToast}
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel={toast.text}
          style={[
            styles.banner,
            {
              backgroundColor: toast.isDopamine ? shade.heroBg : shade.card,
              borderColor: toast.isDopamine ? shade.heroBorder : shade.border,
            },
          ]}
        >
          <Text
            style={[
              styles.text,
              { color: toast.isDopamine ? shade.heroText : shade.text },
            ]}
          >
            {toast.text}
          </Text>
        </ScalePressable>
      </FadeSlideIn>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    zIndex: 40,
  },
  banner: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#111318',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
