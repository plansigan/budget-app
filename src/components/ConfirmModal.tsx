import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemePrefs } from '../context/BudgetContext';
import { triggerLightHaptic } from '../utils/haptics';
import { ScalePressable } from './AnimatedPrimitives';
import { FormModal } from './FormModal';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Cross-platform (iOS, Android, Web) confirmation dialog built on FormModal.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  icon,
  onConfirm,
  onCancel,
}) => {
  const { shade } = useThemePrefs();
  const accent = destructive ? shade.warning : shade.accent;

  return (
    <FormModal
      visible={visible}
      title={title}
      icon={icon || (destructive ? 'trash-2' : 'help-circle')}
      accentColor={accent}
      onClose={onCancel}
    >
      <Text style={[styles.message, { color: shade.muted }]}>{message}</Text>

      <View style={styles.btnRow}>
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            onCancel();
          }}
          accessibilityLabel={cancelLabel}
          style={[
            styles.btn,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <Text style={[styles.btnText, { color: shade.text }]}>
            {cancelLabel}
          </Text>
        </ScalePressable>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            onConfirm();
          }}
          accessibilityLabel={confirmLabel}
          style={[styles.btn, styles.confirmBtn, { backgroundColor: accent }]}
        >
          <Text
            style={[
              styles.btnText,
              { color: destructive ? '#FFFFFF' : shade.accentText },
            ]}
          >
            {confirmLabel}
          </Text>
        </ScalePressable>
      </View>
    </FormModal>
  );
};

const styles = StyleSheet.create({
  message: {
    fontSize: 13,
    lineHeight: 19,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    borderWidth: 0,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
