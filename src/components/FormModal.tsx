import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemePrefs } from '../context/BudgetContext';
import { triggerLightHaptic } from '../utils/haptics';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon, IconBadge } from './AppIcon';
import { BaseModal } from './BaseModal';

interface FormModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  icon?: string;
  accentColor?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const FormModalContent: React.FC<FormModalProps> = ({
  visible,
  title,
  subtitle,
  icon = 'plus',
  accentColor,
  onClose,
  children,
}) => {
  const { shade } = useThemePrefs();
  const effectiveAccent = accentColor || shade.accent;

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      cardStyle={[
        styles.card,
        { backgroundColor: shade.card, borderColor: shade.border },
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
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.title, { color: shade.text }]}>{title}</Text>
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
    </BaseModal>
  );
};

/**
 * Clean centered minimalist modal container used by every Add / Action flow in the app.
 */
export const FormModal: React.FC<FormModalProps> = (props) => {
  if (!props.visible) return null;
  return <FormModalContent {...props} />;
};

const styles = StyleSheet.create({
  card: {
    gap: 14,
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
