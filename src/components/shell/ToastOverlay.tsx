import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemePrefs } from '../../context/BudgetContext';
import { useToast } from '../../context/ToastContext';
import { getDockShadow, getWebGlassStyle } from '../../theme/tokens';
import { FadeSlideIn, ScalePressable } from '../AnimatedPrimitives';

interface ToastOverlayProps {
  bottomOffset?: number;
}

/**
 * Floating non-layout-shifting toast capsule anchored cleanly above the floating dock.
 */
export const ToastOverlay: React.FC<ToastOverlayProps> = ({
  bottomOffset = 88,
}) => {
  const { shade } = useThemePrefs();
  const { toast, dismissToast } = useToast();

  if (!toast) return null;

  return (
    <View
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { bottom: bottomOffset }]}
    >
      <FadeSlideIn triggerKey={toast.id} direction="up" distance={12} withScale>
        <ScalePressable
          onPress={dismissToast}
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel={toast.text}
          style={[
            styles.banner,
            getDockShadow(shade),
            getWebGlassStyle(18),
            {
              backgroundColor: toast.isDopamine ? shade.heroBg : shade.glassBg,
              borderColor: toast.isDopamine
                ? shade.heroBorder
                : shade.glassBorder,
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
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 40,
  },
  banner: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
