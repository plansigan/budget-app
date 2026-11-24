import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useGoals, useThemePrefs } from '../../context/BudgetContext';
import { triggerLightHaptic } from '../../utils/haptics';
import { ScalePressable } from '../AnimatedPrimitives';
import { AppIcon } from '../AppIcon';

interface AppHeaderProps {
  paddingTop: number;
  onOpenFaq: () => void;
}

/**
 * Top header reading streak and theme/privacy state directly so AppShell avoids re-renders on goal updates.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  paddingTop,
  onOpenFaq,
}) => {
  const { privacyMode, togglePrivacyMode, setThemeMode, shade } =
    useThemePrefs();
  const { streakDays } = useGoals();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: shade.card,
          borderBottomColor: shade.border,
          paddingTop,
        },
      ]}
    >
      <View style={styles.brandRow}>
        <Text style={[styles.brandTitle, { color: shade.text }]}>velvet</Text>
        <View
          style={[
            styles.currencyPill,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <Text style={[styles.currencyText, { color: shade.muted }]}>₱</Text>
        </View>
      </View>

      <View style={styles.headerPills}>
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            onOpenFaq();
          }}
          accessibilityRole="button"
          accessibilityLabel="Open App Guide and FAQ"
          hitSlop={8}
          style={[
            styles.statusPill,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <AppIcon name="help-circle" size={15} color={shade.text} />
        </ScalePressable>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setThemeMode(shade.dark ? 'light' : 'dark');
          }}
          accessibilityRole="button"
          accessibilityLabel={
            shade.dark ? 'Switch to Light mode' : 'Switch to Dark mode'
          }
          accessibilityState={{ selected: shade.dark }}
          hitSlop={8}
          style={[
            styles.statusPill,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <AppIcon
            name={shade.dark ? 'sun' : 'moon'}
            size={15}
            color={shade.text}
          />
        </ScalePressable>

        <ScalePressable
          onPress={togglePrivacyMode}
          accessibilityRole="button"
          accessibilityLabel={privacyMode ? 'Show amounts' : 'Hide amounts'}
          accessibilityState={{ selected: privacyMode }}
          hitSlop={8}
          style={[
            styles.statusPill,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <AppIcon
            name={privacyMode ? 'eye-off' : 'eye'}
            size={15}
            color={shade.text}
          />
        </ScalePressable>

        <View
          accessible
          accessibilityLabel={`Daily streak ${streakDays} ${
            streakDays === 1 ? 'day' : 'days'
          }`}
          style={[
            styles.statusPill,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <AppIcon name="zap" size={14} color={shade.positive} />
          <Text style={[styles.statusText, { color: shade.text }]}>
            {streakDays}d
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 13,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  currencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  currencyText: {
    fontSize: 11,
    fontWeight: '800',
  },
  headerPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
